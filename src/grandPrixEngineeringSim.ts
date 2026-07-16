import type { LabKind, LocalText } from './engineeringData'
import { FIA_ERS_ELECTRICAL_MECHANICAL_CORRECTION, FIA_ERS_K_MECHANICAL_TORQUE_NM, fiaDcToMechanicalPowerKw, fiaNormalDeploymentDcLimitKw } from './ersRules'
import { secondOrderFreeResponse, settlingTimeTwoPercent } from './simulationMath'
import type { LabMetric, LabModel, LabOutput, LabParameter, LabPoint } from './engineeringSim'

const l = (zh: string, en: string): LocalText => ({ zh, en })
const p = (key: string, zh: string, en: string, min: number, max: number, step: number, initial: number, unit: string): LabParameter => ({ key, label: l(zh, en), min, max, step, initial, unit })
const m = (zh: string, en: string, value: number, unit: string, tone?: LabMetric['tone']): LabMetric => ({ label: l(zh, en), value, unit, tone })
const get = (values: Record<string, number>, key: string) => values[key] ?? 0
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
const curve = (fn: (x: number) => number, min: number, max: number, count = 31): LabPoint[] => Array.from({ length: count }, (_, index) => {
  const x = min + (max - min) * index / (count - 1)
  return { x, y: fn(x) }
})

const output = (metrics: LabMetric[], points: LabPoint[], xZh: string, xEn: string, yZh: string, yEn: string, insightZh: string, insightEn: string): LabOutput => ({
  metrics,
  points,
  xLabel: l(xZh, xEn),
  yLabel: l(yZh, yEn),
  insight: l(insightZh, insightEn),
})

/**
 * Teaching models for the full-size hybrid single-seater. They expose first-order
 * relationships and realistic operating orders, not confidential team maps or a
 * homologation calculation. Every result therefore remains a trend model that
 * must be replaced by measured maps for real design work.
 */
export const GRAND_PRIX_LAB_MODELS: Record<LabKind, LabModel> = {
  wing: {
    title: l('主动翼气动载荷与阻力权衡', 'Active-wing load and drag trade-off'),
    parameters: [p('speed', '车速', 'Speed', 80, 350, 5, 250, 'km/h'), p('angle', '翼片攻角', 'Flap angle', 0, 28, 1, 18, '°'), p('area', '参考面积', 'Reference area', .55, 1.4, .05, .95, 'm²'), p('frontShare', '前轴气动份额', 'Front aero share', 35, 55, 1, 45, '%')],
    evaluate: v => { const speed = get(v, 'speed'); const angle = get(v, 'angle'); const q = .5 * 1.225 * (speed / 3.6) ** 2; const cl = .42 + .095 * angle - .0021 * angle ** 2; const load = q * get(v, 'area') * cl; const cd = .12 + .00115 * angle ** 2; const drag = q * get(v, 'area') * cd; return output([m('气动下压力', 'Aerodynamic downforce', load, 'N'), m('翼面阻力', 'Wing drag', drag, 'N'), m('载荷效率', 'Load efficiency', load / Math.max(drag, 1), ''), m('前轴气动载荷', 'Front aero load', load * get(v, 'frontShare') / 100, 'N')], curve(x => .5 * 1.225 * (x / 3.6) ** 2 * get(v, 'area') * cl, 80, 350), '车速 (km/h)', 'Speed (km/h)', '气动下压力 (N)', 'Downforce (N)', '载荷随速度平方增长；主动翼低阻位置能降低直线阻力，但前后翼必须协同切换，避免气动平衡突变。', 'Load grows with speed squared; a low-drag active-wing position reduces straight-line drag, but both axles must transition together to avoid an aero-balance step.') },
  },
  floor: {
    title: l('文丘里底板与平台高度窗口', 'Venturi floor and platform-height window'),
    parameters: [p('speed', '车速', 'Speed', 80, 350, 5, 240, 'km/h'), p('frontHeight', '前部离地高度', 'Front ride height', 18, 65, 1, 32, 'mm'), p('rearHeight', '后部离地高度', 'Rear ride height', 25, 85, 1, 46, 'mm'), p('seal', '边缘流动完整度', 'Edge-flow integrity', 45, 100, 1, 88, '%')],
    evaluate: v => { const speed = get(v, 'speed'); const front = get(v, 'frontHeight'); const rear = get(v, 'rearHeight'); const rake = (rear - front) / 20; const window = Math.exp(-(((front - 31) / 13) ** 2)); const choke = front < 23 ? Math.max(.15, (front - 16) / 7) : 1; const load = .5 * 1.225 * (speed / 3.6) ** 2 * 2.25 * (1 + .18 * rake) * get(v, 'seal') / 100 * window * choke; return output([m('底板下压力', 'Floor downforce', load, 'N', front < 23 ? 'danger' : 'good'), m('前后高度差', 'Rake', rear - front, 'mm'), m('工作窗口匹配', 'Window match', window * 100, '%'), m('触底/堵塞裕量', 'Bottoming/choke margin', front - 20, 'mm', front < 24 ? 'warn' : undefined)], curve(h => { const rakeAtH = (rear - h) / 20; return .5 * 1.225 * (speed / 3.6) ** 2 * 2.25 * (1 + .18 * rakeAtH) * get(v, 'seal') / 100 * Math.exp(-(((h - 31) / 13) ** 2)) * (h < 23 ? Math.max(.15, (h - 16) / 7) : 1) }, 18, 65), '前部离地高度 (mm)', 'Front ride height (mm)', '底板下压力 (N)', 'Floor downforce (N)', '底板存在狭窄的平台窗口；车身过高会泄漏，过低则可能触底或使流道堵塞，因此悬架控制和气动设计不可分开。', 'The floor has a narrow platform window: too high leaks, too low may bottom or choke the tunnels, so suspension control and aerodynamics cannot be separated.') },
  },
  impact: {
    title: l('全尺寸赛车碰撞吸能包络', 'Full-size race-car crash-energy envelope'),
    parameters: [p('mass', '参与碰撞的等效质量', 'Effective impact mass', 350, 850, 10, 620, 'kg'), p('speed', '碰撞速度', 'Impact speed', 6, 18, .5, 12, 'm/s'), p('stroke', '可用压溃行程', 'Usable crush stroke', 250, 900, 10, 620, 'mm'), p('progressive', '渐进压溃程度', 'Crush progressivity', 20, 100, 2, 82, '%')],
    evaluate: v => { const energy = .5 * get(v, 'mass') * get(v, 'speed') ** 2; const stroke = get(v, 'stroke') / 1000; const mean = energy / stroke; const peakRatio = 1.68 - .48 * get(v, 'progressive') / 100; const startRatio = 2 - peakRatio; const peak = mean * peakRatio; const decel = peak / (get(v, 'mass') * 9.81); return output([m('待吸收动能', 'Kinetic energy to absorb', energy / 1000, 'kJ'), m('平均压溃力', 'Mean crush force', mean / 1000, 'kN'), m('估算峰值力', 'Estimated peak force', peak / 1000, 'kN'), m('估算峰值减速度', 'Estimated peak deceleration', decel, 'g', decel > 25 ? 'danger' : undefined)], curve(x => mean * (startRatio + (peakRatio - startRatio) * x / stroke) / 1000, 0, stroke), '压溃位移 (m)', 'Crush displacement (m)', '压溃力 (kN)', 'Crush force (kN)', '碰撞能量由质量和速度平方决定；教学曲线已按面积归一化，使压溃力—位移积分等于待吸收动能。它仍不是 FIA 碰撞认证脉冲，真实设计必须同时验证峰值、侵入量和生存舱完整性。', 'Impact energy follows mass and speed squared; the teaching curve is area-normalised so the force-displacement integral equals the kinetic energy to absorb. It is not an FIA homologation pulse, and a real design must also verify peak load, intrusion and survival-cell integrity.') },
  },
  structure: {
    title: l('碳纤维生存舱扭转响应', 'Carbon survival-cell torsional response'),
    parameters: [p('torque', '施加扭矩', 'Applied torque', 2000, 10000, 250, 6000, 'N·m'), p('stiffness', '车体扭转刚度', 'Body torsional stiffness', 18000, 60000, 1000, 40000, 'N·m/°'), p('suspension', '悬架等效滚转刚度', 'Equivalent suspension roll stiffness', 8000, 35000, 500, 18000, 'N·m/°'), p('damage', '局部连接退化', 'Local joint degradation', 0, 20, 1, 0, '%')],
    evaluate: v => { const k = get(v, 'stiffness') * (1 - get(v, 'damage') / 100); const twist = get(v, 'torque') / k; const authority = k / (k + get(v, 'suspension')) * 100; const strainEnergy = .5 * get(v, 'torque') * twist * Math.PI / 180; return output([m('车体扭角', 'Body twist', twist, '°', twist > .25 ? 'warn' : undefined), m('有效扭转刚度', 'Effective torsional stiffness', k, 'N·m/°'), m('悬架调校保真度', 'Suspension authority', authority, '%'), m('弹性应变能', 'Elastic strain energy', strainEnergy, 'J')], curve(x => k * x, 0, .35), '扭角 (°)', 'Twist (°)', '扭矩 (N·m)', 'Torque (N·m)', '生存舱要让悬架而不是车体变形主导轮载变化；高刚度不是无限追求，质量、铺层、开口和局部载荷路径同样重要。', 'The survival cell should let suspension, not body twist, dominate wheel-load change; stiffness is not unlimited because mass, laminate, apertures and local load paths also matter.') },
  },
  protection: {
    title: l('头部保护结构载荷路径', 'Head-protection structure load path'),
    parameters: [p('load', '外部载荷', 'External load', 20, 160, 5, 100, 'kN'), p('length', '等效受压长度', 'Effective compression length', 300, 900, 10, 520, 'mm'), p('diameter', '等效构件直径', 'Equivalent member diameter', 35, 80, 1, 55, 'mm'), p('thickness', '等效壁厚', 'Equivalent wall thickness', 2, 7, .1, 4, 'mm')],
    evaluate: v => { const D = get(v, 'diameter') / 1000; const t = get(v, 'thickness') / 1000; const d = Math.max(.001, D - 2 * t); const area = Math.PI * (D ** 2 - d ** 2) / 4; const inertia = Math.PI * (D ** 4 - d ** 4) / 64; const buckling = Math.PI ** 2 * 110e9 * inertia / (get(v, 'length') / 1000) ** 2; const stress = get(v, 'load') * 1000 / area; const margin = Math.min(850e6 / stress, buckling / (get(v, 'load') * 1000)) - 1; return output([m('名义轴向应力', 'Nominal axial stress', stress / 1e6, 'MPa'), m('欧拉屈曲载荷', 'Euler buckling load', buckling / 1000, 'kN'), m('教学安全裕量', 'Teaching safety margin', margin, '', margin < 0 ? 'danger' : margin < .3 ? 'warn' : 'good'), m('等效截面积', 'Equivalent section area', area * 1e6, 'mm²')], curve(x => buckling * (x - .13 * x ** 3) / 1000, 0, 1.2), '归一化变形', 'Normalised deformation', '承载力 (kN)', 'Load capacity (kN)', '构件、三处安装点和单体壳局部强化必须作为一个载荷系统检查；该简化梁模型只用于理解直径、长度和屈曲的趋势。', 'The member, three mounts and local monocoque reinforcement form one load system; this simplified beam model only illustrates diameter, length and buckling trends.') },
  },
  tire: {
    title: l('18 英寸赛车胎载荷、温度与滑移窗口', '18-inch race-tyre load, temperature and slip window'),
    parameters: [p('load', '法向载荷', 'Normal load', 1000, 6500, 100, 3800, 'N'), p('slip', '纵向滑移率', 'Longitudinal slip', 0, 24, 1, 9, '%'), p('vehicleSpeed', '车速', 'Vehicle speed', 60, 350, 5, 250, 'km/h'), p('temp', '胎面温度', 'Tread temperature', 55, 135, 2, 95, '°C'), p('pressure', '热态胎压', 'Hot pressure', 120, 190, 2, 155, 'kPa')],
    evaluate: v => { const load = get(v, 'load'); const slip = get(v, 'slip') / 100; const thermal = Math.exp(-(((get(v, 'temp') - 98) / 27) ** 2)); const pressure = Math.exp(-(((get(v, 'pressure') - 155) / 28) ** 2)); const mu = 1.95 * (load / 3500) ** (-.11) * thermal * pressure; const force = mu * load * Math.sin(1.55 * Math.atan(15 * slip)); const slipSpeed = slip * get(v, 'vehicleSpeed') / 3.6; return output([m('纵向轮胎力', 'Longitudinal tyre force', force, 'N'), m('有效摩擦系数', 'Effective friction coefficient', force / load, ''), m('滑移耗散功率', 'Slip dissipation', force * slipSpeed / 1000, 'kW'), m('热窗口匹配', 'Thermal-window match', thermal * 100, '%', thermal < .55 ? 'warn' : 'good')], curve(x => mu * load * Math.sin(1.55 * Math.atan(15 * x)), 0, .3), '滑移率', 'Slip ratio', '纵向轮胎力 (N)', 'Longitudinal force (N)', '最大轮胎力出现在有限滑移处；滑移耗散功率还随车速增长。载荷敏感性、胎温、胎压和表面状态会一起移动峰值，气动载荷不会等比例增加抓地力。', 'Peak tyre force occurs at finite slip, while slip dissipation also rises with vehicle speed. Load sensitivity, temperature, pressure and surface condition move the peak, and aero load does not add grip proportionally.') },
  },
  brake: {
    title: l('碳制动、能量回收与线控制动协调', 'Carbon braking, regeneration and brake-by-wire coordination'),
    parameters: [p('mass', '教学完整运行质量', 'Teaching complete running mass', 700, 850, 5, 760, 'kg'), p('speed', '制动初速度', 'Initial speed', 100, 350, 5, 300, 'km/h'), p('regen', '总动能回收比例', 'Recovered share of total kinetic energy', 0, 35, 1, 19, '%'), p('discMass', '单盘等效热质量', 'Equivalent mass per disc', 1, 3.5, .1, 2.2, 'kg')],
    evaluate: v => { const mass = get(v, 'mass'); const energy = .5 * mass * (get(v, 'speed') / 3.6) ** 2; const regenEnergy = energy * get(v, 'regen') / 100; const residualEnergy = energy - regenEnergy; const discEnergy = residualEnergy * .78; const rise = discEnergy / (4 * get(v, 'discMass') * 710); return output([m('车辆动能', 'Vehicle kinetic energy', energy / 1e6, 'MJ'), m('回收能量', 'Recovered energy', regenEnergy / 1000, 'kJ'), m('进入四只碳盘的教学能量', 'Teaching energy entering four carbon discs', discEnergy / 1000, 'kJ'), m('估算碳盘温升', 'Estimated carbon-disc rise', rise, '°C', rise > 650 ? 'warn' : 'good')], curve(speed => .5 * mass * (speed / 3.6) ** 2 / 1e6, 100, 350), '制动初速度 (km/h)', 'Initial speed (km/h)', '车辆动能 (MJ)', 'Vehicle kinetic energy (MJ)', '这里的质量和78%碳盘吸能比例都是可见的教学假设，而不是规则值。真实高速制动还需积分空气阻力、轮胎耗散、前后轴摩擦制动、MGU-K回收及其功率/能量限制。', 'Mass and the 78% carbon-disc energy share are explicit teaching assumptions, not regulatory values. Real high-speed braking integrates aero drag, tire dissipation, axle friction braking, MGU-K recovery and its power/energy limits.') },
  },
  suspension: {
    title: l('推杆悬架与气动平台响应', 'Pushrod suspension and aerodynamic-platform response'),
    parameters: [p('spring', '弹簧刚度', 'Spring rate', 100, 450, 5, 260, 'N/mm'), p('motionRatio', '运动比', 'Motion ratio', .5, 1.25, .01, .84, ''), p('cornerMass', '单角簧载质量', 'Corner sprung mass', 120, 240, 5, 185, 'kg'), p('damping', '等效阻尼', 'Equivalent damping', 2500, 12000, 100, 7200, 'N·s/m')],
    evaluate: v => { const wheelRate = get(v, 'spring') * get(v, 'motionRatio') ** 2 * 1000; const mass = get(v, 'cornerMass'); const omega = Math.sqrt(wheelRate / mass); const frequency = omega / (2 * Math.PI); const ratio = get(v, 'damping') / (2 * Math.sqrt(wheelRate * mass)); const settle = settlingTimeTwoPercent(omega, ratio); return output([m('轮端刚度', 'Wheel rate', wheelRate / 1000, 'N/mm'), m('固有频率', 'Natural frequency', frequency, 'Hz'), m('阻尼比', 'Damping ratio', ratio, '', ratio > 1 ? 'warn' : 'good'), m('2% 稳定时间', '2% settling time', settle, 's')], curve(x => secondOrderFreeResponse(x, omega, ratio), 0, 1.2), '时间 (s)', 'Time (s)', '归一化轮跳', 'Normalised wheel motion', '运动比以平方关系改变轮端刚度；悬架既要维持轮胎接地，也要控制底板高度和俯仰，因此机械抓地与气动平台必须共同优化。', 'Motion ratio changes wheel rate by its square; suspension must keep tyre contact and control floor height and pitch, so mechanical grip and aero platform are optimised together.') },
  },
  steering: {
    title: l('全尺寸单座赛车转向几何', 'Full-size single-seater steering geometry'),
    parameters: [p('wheelbase', '轴距', 'Wheelbase', 3.2, 3.8, .02, 3.6, 'm'), p('track', '前轮距', 'Front track', 1.5, 1.75, .01, 1.65, 'm'), p('radius', '转弯半径', 'Turn radius', 5, 80, 1, 20, 'm'), p('ratio', '转向比', 'Steering ratio', 8, 16, .25, 11, ':1')],
    evaluate: v => { const L = get(v, 'wheelbase'); const t = get(v, 'track'); const R = get(v, 'radius'); const inner = Math.atan(L / Math.max(.5, R - t / 2)) * 180 / Math.PI; const outer = Math.atan(L / (R + t / 2)) * 180 / Math.PI; const hand = (inner + outer) * .5 * get(v, 'ratio'); return output([m('内轮转角', 'Inner-wheel angle', inner, '°'), m('外轮转角', 'Outer-wheel angle', outer, '°'), m('几何转角差', 'Geometric angle split', inner - outer, '°'), m('方向盘转角', 'Steering-wheel angle', hand, '°')], curve(radius => Math.atan(L / Math.max(.5, radius - t / 2)) * 180 / Math.PI, 5, 80), '转弯半径 (m)', 'Turn radius (m)', '内轮转角 (°)', 'Inner-wheel angle (°)', '低速几何只给出起点；高速下轮胎侧偏、空气动力载荷、柔顺转向和方向盘控制映射共同决定实际所需转角。', 'Low-speed geometry is only a starting point; at speed, tyre slip, aero load, compliance steer and steering control maps determine the required angle.') },
  },
  battery: {
    title: l('高压储能系统功率、能量与温度边界', 'High-voltage energy-store power, energy and thermal boundaries'),
    parameters: [p('soc', '荷电状态', 'State of charge', 10, 100, 1, 72, '%'), p('current', '放电电流', 'Discharge current', 50, 800, 10, 520, 'A'), p('temp', '最高电芯温度', 'Maximum cell temperature', 20, 70, 1, 42, '°C'), p('resistance', '等效内阻', 'Equivalent resistance', 8, 45, 1, 22, 'mΩ')],
    evaluate: v => { const ocv = 650 + 2.2 * get(v, 'soc'); const R = get(v, 'resistance') / 1000; const terminal = ocv - get(v, 'current') * R; const power = terminal * get(v, 'current') / 1000; const heat = get(v, 'current') ** 2 * R / 1000; const thermal = get(v, 'temp') > 52 ? Math.max(10, 100 - (get(v, 'temp') - 52) * 5) : 100; return output([m('端电压', 'Terminal voltage', terminal, 'V'), m('直流输出功率', 'DC output power', power, 'kW'), m('电阻发热', 'Resistive heat', heat, 'kW', heat > 12 ? 'warn' : undefined), m('温度功率可用度', 'Thermal availability', thermal, '%', thermal < 50 ? 'danger' : 'good')], curve(current => (ocv - current * R) * current / 1000, 50, 800), '电流 (A)', 'Current (A)', '直流功率 (kW)', 'DC power (kW)', '更高电流会提高瞬时功率，也会增加压降和平方级发热；控制器必须同时管理每圈能量、荷电状态、电芯温差和绝缘边界。', 'Higher current raises instantaneous power but also voltage sag and square-law heating; control must manage lap energy, state of charge, cell spread and insulation limits together.') },
  },
  inverter: {
    title: l('高压功率电子损耗与结温', 'High-voltage power-electronics loss and junction temperature'),
    parameters: [p('power', '机械功率请求', 'Mechanical power request', 20, 400, 10, 260, 'kW'), p('vehicleSpeed', '非超车模式车速', 'Non-overtake vehicle speed', 50, 345, 5, 250, 'km/h'), p('switching', '开关频率', 'Switching frequency', 4, 24, 1, 12, 'kHz'), p('current', '相电流', 'Phase current', 100, 900, 10, 580, 'A'), p('coolant', '冷却液温度', 'Coolant temperature', 25, 70, 1, 46, '°C')],
    evaluate: v => { const conduction = .000045 * get(v, 'current') ** 2; const switching = .00072 * get(v, 'switching') * get(v, 'current'); const loss = conduction + switching; const dcLimit = fiaNormalDeploymentDcLimitKw(get(v, 'vehicleSpeed')); const mechanicalLimit = fiaDcToMechanicalPowerKw(dcLimit); const mechanical = Math.min(get(v, 'power'), mechanicalLimit); const efficiency = mechanical / (mechanical + loss) * 100; const junction = get(v, 'coolant') + loss * 3.2; return output([m('总损耗', 'Total loss', loss, 'kW'), m('变换效率', 'Conversion efficiency', efficiency, '%'), m('估算结温', 'Estimated junction temperature', junction, '°C', junction > 150 ? 'danger' : junction > 125 ? 'warn' : 'good'), m('规则包络内机械输出', 'Mechanical output within rule envelope', mechanical, 'kW', get(v, 'power') > mechanicalLimit ? 'warn' : 'good')], curve(fs => conduction + .00072 * fs * get(v, 'current'), 4, 24), '开关频率 (kHz)', 'Switching frequency (kHz)', '功率电子损耗 (kW)', 'Power-electronics loss (kW)', '机械请求先受 C5.2.8 非超车部署曲线与 C5.2.21 的 0.97 换算裁剪；提高开关频率可改善电流波形，却增加开关损耗，器件、母排、电机电感、电磁兼容与冷却共同决定可用频率。', 'Mechanical demand is first clipped by the C5.2.8 non-overtake deployment curve and the 0.97 conversion in C5.2.21. Higher switching frequency improves current waveform but increases switching loss; devices, busbars, motor inductance, EMC and cooling set the usable frequency.') },
  },
  motor: {
    title: l('V6 涡轮发动机与 ERS-K 混合功率', 'V6 turbo engine and ERS-K hybrid power'),
    parameters: [p('icePower', '发动机轴功率', 'Engine shaft power', 250, 500, 5, 400, 'kW'), p('mguPower', 'ERS-K 直流功率请求', 'Requested ERS-K DC power', -350, 350, 10, 250, 'kW'), p('vehicleSpeed', '非超车模式车速', 'Non-overtake vehicle speed', 50, 345, 5, 250, 'km/h'), p('mguSpeed', 'MGU-K 曲轴参考转速', 'MGU-K crank-referenced speed', 1000, 15000, 250, 9000, 'rpm'), p('efficiency', '发动机制动热效率', 'Engine brake thermal efficiency', 38, 52, .5, 47, '%'), p('soc', '储能系统荷电状态', 'Energy-store state of charge', 15, 100, 1, 68, '%')],
    evaluate: v => { const requestedDc = get(v, 'mguPower'); const torquePowerLimit = FIA_ERS_K_MECHANICAL_TORQUE_NM * get(v, 'mguSpeed') * 2 * Math.PI / 60 / 1000; const powerAtSoc = (soc: number) => { const deploySoc = Math.min(1, Math.max(0, (soc - 15) / 35)); const harvestSoc = Math.min(1, Math.max(0, (100 - soc) / 35)); const dcEnvelope = requestedDc >= 0 ? fiaNormalDeploymentDcLimitKw(get(v, 'vehicleSpeed')) : 350; const dcCandidate = Math.sign(requestedDc) * Math.min(Math.abs(requestedDc), dcEnvelope) * (requestedDc >= 0 ? deploySoc : harvestSoc); const mechanicalCandidate = fiaDcToMechanicalPowerKw(dcCandidate); const mechanical = Math.sign(mechanicalCandidate) * Math.min(Math.abs(mechanicalCandidate), torquePowerLimit); const availableDc = mechanical >= 0 ? mechanical / FIA_ERS_ELECTRICAL_MECHANICAL_CORRECTION : mechanical * FIA_ERS_ELECTRICAL_MECHANICAL_CORRECTION; return { availableDc, mechanical } }; const available = powerAtSoc(get(v, 'soc')); const combined = get(v, 'icePower') + available.mechanical; const fuelPower = get(v, 'icePower') / (get(v, 'efficiency') / 100); const fuelRate = fuelPower * 1000 / 43e6 * 3600; return output([m('可用混合轴功率', 'Available combined shaft power', combined, 'kW'), m('ERS-K 直流功率', 'ERS-K DC power', available.availableDc, 'kW'), m('ERS-K 机械贡献', 'ERS-K mechanical contribution', available.mechanical, 'kW'), m('估算燃料流量', 'Estimated fuel rate', fuelRate, 'kg/h')], curve(soc => get(v, 'icePower') + powerAtSoc(soc).mechanical, 15, 100), '储能系统荷电状态 (%)', 'Energy-store state of charge (%)', '混合轴功率 (kW)', 'Combined shaft power (kW)', '输入量是 FIA 在高压直流母线核算的 ERS-K 电功率请求；模型同时应用 C5.2.7 绝对直流边界、C5.2.8 非超车部署曲线、C5.2.11 的 500 N·m 曲轴参考扭矩与 C5.2.21 的双向 0.97 换算。', 'The input is an ERS-K electrical-power request on the high-voltage DC bus. The model applies the absolute DC boundary in C5.2.7, the C5.2.8 non-overtake deployment curve, the 500 N·m crank-referenced torque limit in C5.2.11 and the bidirectional 0.97 conversion in C5.2.21.') },
  },
  differential: {
    title: l('多片式差速器锁止与驱动偏航', 'Multi-plate differential locking and drive yaw'),
    parameters: [p('insideLoad', '内侧驱动轮载荷', 'Inside driven-wheel load', 500, 4500, 100, 1900, 'N'), p('outsideLoad', '外侧驱动轮载荷', 'Outside driven-wheel load', 1500, 7000, 100, 4800, 'N'), p('locking', '差速锁止程度', 'Differential locking', 0, 100, 2, 42, '%'), p('torque', '后轴扭矩请求', 'Rear-axle torque request', 200, 1800, 25, 1100, 'N·m')],
    evaluate: v => {
      const radius = .36
      const mu = 1.8
      const insideCap = get(v, 'insideLoad') * mu * radius
      const outsideCap = get(v, 'outsideLoad') * mu * radius
      const request = get(v, 'torque')
      const splitAt = (locking: number) => {
        // An ideal open symmetric differential delivers equal axle-shaft
        // torque, so both sides are limited by the lower-grip tyre. The clutch
        // capacity represented by `locking` is what permits additional torque
        // to reach the higher-capacity side; it cannot invent tyre capacity.
        const openSideTorque = Math.min(request / 2, insideCap, outsideCap)
        let inside = openSideTorque
        let outside = openSideTorque
        const transferCapacity = request * .5 * clamp(locking, 0, 1)
        const remaining = Math.max(0, request - inside - outside)
        if (outsideCap >= insideCap) {
          outside += Math.min(remaining, transferCapacity, Math.max(0, outsideCap - outside))
        } else {
          inside += Math.min(remaining, transferCapacity, Math.max(0, insideCap - inside))
        }
        return { inside, outside }
      }
      const split = splitAt(get(v, 'locking') / 100)
      const yaw = (split.outside - split.inside) / radius * .82
      return output([m('内轮驱动扭矩', 'Inside drive torque', split.inside, 'N·m'), m('外轮驱动扭矩', 'Outside drive torque', split.outside, 'N·m'), m('实际后轴扭矩', 'Delivered rear-axle torque', split.inside + split.outside, 'N·m'), m('驱动偏航力矩', 'Drive-induced yaw moment', yaw, 'N·m', Math.abs(yaw) > 1800 ? 'warn' : undefined)], curve(x => { const point = splitAt(x); return point.inside + point.outside }, 0, 1), '锁止比例', 'Locking level', '可传后轴扭矩 (N·m)', 'Delivered rear-axle torque (N·m)', '开放式对称差速器两侧轴扭矩近似相等并受低附着侧限制；只有离合器锁止容量才能向高附着侧建立额外扭矩偏置，且仍受轮胎上限约束。', 'An open symmetric differential delivers approximately equal axle torque and is capped by the lower-grip side; only clutch locking capacity creates extra bias toward the higher-grip tyre, still within tyre capacity.')
    },
  },
  cooling: {
    title: l('动力单元多回路热平衡', 'Power-unit multi-loop thermal balance'),
    parameters: [p('heat', '系统热负荷', 'System heat load', 30, 220, 5, 125, 'kW'), p('flow', '等效冷却液流量', 'Equivalent coolant flow', 20, 140, 2, 85, 'L/min'), p('airflow', '散热器空气流量', 'Radiator airflow', 20, 100, 2, 72, '%'), p('ambient', '环境温度', 'Ambient temperature', 10, 45, 1, 30, '°C')],
    evaluate: v => { const mdot = get(v, 'flow') / 60 * 1.02; const rise = get(v, 'heat') * 1000 / Math.max(1, mdot * 3900); const coolant = get(v, 'ambient') + get(v, 'heat') * 0.44 / Math.max(.22, get(v, 'airflow') / 100); const pressure = .018 * get(v, 'flow') ** 2; const pump = pressure * 1000 * get(v, 'flow') / 60000 / .62 / 1000; return output([m('单程冷却液温升', 'Single-pass coolant rise', rise, '°C'), m('估算稳态温度', 'Estimated steady temperature', coolant, '°C', coolant > 125 ? 'danger' : coolant > 105 ? 'warn' : 'good'), m('等效回路压降', 'Equivalent loop pressure drop', pressure, 'kPa'), m('泵轴功率', 'Pump shaft power', pump, 'kW')], curve(air => get(v, 'ambient') + get(v, 'heat') * .44 / Math.max(.22, air / 100), 20, 100), '散热器空气流量 (%)', 'Radiator airflow (%)', '估算冷却液温度 (°C)', 'Estimated coolant temperature (°C)', '发动机、电荷空气、润滑、电机、电池和功率电子需要不同温度等级；侧箱气流、泵功和气动阻力构成整车权衡。', 'Engine, charge air, lubrication, motor, battery and power electronics need different temperature levels; sidepod flow, pump power and aerodynamic drag form a vehicle-level trade-off.') },
  },
  control: {
    title: l('驾驶员请求、动力部署与轮胎极限仲裁', 'Driver request, energy deployment and tyre-limit arbitration'),
    parameters: [p('driver', '驾驶员扭矩请求', 'Driver torque request', 0, 100, 2, 92, '%'), p('energy', '能量部署限值', 'Energy-deployment limit', 0, 100, 2, 78, '%'), p('thermal', '动力单元热限值', 'Power-unit thermal limit', 0, 100, 2, 86, '%'), p('traction', '后轮附着限值', 'Rear-tyre traction limit', 0, 100, 2, 69, '%')],
    evaluate: v => { const candidates = [get(v, 'driver'), get(v, 'energy'), get(v, 'thermal'), get(v, 'traction')]; const command = Math.min(...candidates); const sorted = [...candidates].sort((a, b) => a - b); const limiter = candidates.indexOf(command) + 1; return output([m('最终扭矩指令', 'Final torque command', command, '%'), m('限制源编号', 'Limiting-source index', limiter, ''), m('次级限值裕量', 'Next-limit margin', sorted[1]! - sorted[0]!, '%'), m('建议恢复斜率', 'Suggested recovery rate', Math.max(4, (sorted[1]! - sorted[0]!) * 1.8), '%/s')], curve(grip => Math.min(get(v, 'driver'), get(v, 'energy'), get(v, 'thermal'), 100 * grip), 0, 1), '轮胎可用比例', 'Tyre availability', '最终扭矩指令 (%)', 'Final torque command (%)', '最终扭矩由最严格边界决定；控制系统还要显示限制来源、管理迟滞与恢复斜率，并保证传感器故障时可预测地降级。', 'The tightest boundary sets torque; control must expose the limiter, manage hysteresis and recovery rate, and degrade predictably after sensor faults.') },
  },
  telemetry: {
    title: l('高速遥测采样、同步与证据质量', 'High-rate telemetry sampling, synchronisation and evidence quality'),
    parameters: [p('signal', '目标信号频率', 'Target signal frequency', 5, 500, 5, 120, 'Hz'), p('sample', '采样频率', 'Sample rate', 100, 5000, 50, 1000, 'Hz'), p('offset', '通道时间偏移', 'Channel time offset', 0, 20, .5, 2, 'ms'), p('noise', '噪声幅值', 'Noise amplitude', 0, 20, 1, 3, '%')],
    evaluate: v => { const ratio = get(v, 'sample') / (2 * get(v, 'signal')); const observed = get(v, 'sample') > 2 * get(v, 'signal') ? get(v, 'signal') : Math.abs(get(v, 'signal') - Math.round(get(v, 'signal') / get(v, 'sample')) * get(v, 'sample')); const phase = 360 * get(v, 'signal') * get(v, 'offset') / 1000; const confidence = Math.max(0, Math.min(100, ratio * 32 - get(v, 'noise') * 1.4 - phase * .25)); return output([m('奈奎斯特裕量', 'Nyquist margin', ratio, '×', ratio < 1 ? 'danger' : ratio < 2 ? 'warn' : 'good'), m('观测频率', 'Observed frequency', observed, 'Hz'), m('同步相位误差', 'Timing phase error', phase, '°', phase > 35 ? 'warn' : undefined), m('证据可信度', 'Evidence confidence', confidence, '%')], curve(x => Math.sin(2 * Math.PI * get(v, 'signal') * x) + get(v, 'noise') / 100 * Math.sin(2 * Math.PI * 733 * x), 0, .05), '时间 (s)', 'Time (s)', '归一化测量值', 'Normalised measured value', '采样率不足会产生不可逆混叠，跨控制器时间偏移会制造虚假的相位与因果关系；标定、时钟和数据质量标志与传感器本体同样重要。', 'Insufficient sampling creates irreversible aliasing, while controller time offset creates false phase and causality; calibration, clocks and quality flags matter as much as sensors.') },
  },
}

export const grandPrixInitialValues = (kind: LabKind): Record<string, number> => Object.fromEntries(GRAND_PRIX_LAB_MODELS[kind].parameters.map(parameter => [parameter.key, parameter.initial]))
