import type { LabKind, LocalText } from './engineeringData'
import { secondOrderFreeResponse, settlingTimeTwoPercent } from './simulationMath'

const l = (zh: string, en: string): LocalText => ({ zh, en })

export type LabParameter = {
  key: string
  label: LocalText
  min: number
  max: number
  step: number
  initial: number
  unit: string
}

export type LabMetric = { label: LocalText; value: number; unit: string; tone?: 'good' | 'warn' | 'danger' }
export type LabPoint = { x: number; y: number }
export type LabOutput = { metrics: LabMetric[]; points: LabPoint[]; xLabel: LocalText; yLabel: LocalText; insight: LocalText }
export type LabModel = { title: LocalText; parameters: LabParameter[]; evaluate: (v: Record<string, number>) => LabOutput }

const p = (key: string, zh: string, en: string, min: number, max: number, step: number, initial: number, unit: string): LabParameter => ({ key, label: l(zh, en), min, max, step, initial, unit })
const m = (zh: string, en: string, value: number, unit: string, tone?: LabMetric['tone']): LabMetric => ({ label: l(zh, en), value, unit, tone })
const curve = (fn: (x: number) => number, min = 0, max = 1, count = 31): LabPoint[] => Array.from({ length: count }, (_, i) => { const x = min + (max - min) * i / (count - 1); return { x, y: fn(x) } })
const get = (v: Record<string, number>, key: string) => v[key] ?? 0
const FORMULA_STUDENT_MAX_DRIVE_DC_KW = 80
const FORMULA_STUDENT_ASSUMED_DRIVETRAIN_EFFICIENCY = .94

export const LAB_MODELS: Record<LabKind, LabModel> = {
  wing: {
    title: l('翼型下压力实验台', 'Wing downforce bench'),
    parameters: [p('speed', '车速', 'Speed', 30, 160, 5, 90, 'km/h'), p('angle', '攻角', 'Angle of attack', 0, 18, 1, 9, '°'), p('area', '有效面积', 'Effective area', 0.3, 1.2, 0.05, 0.7, 'm²'), p('balance', '前轴作用比例', 'Front-axle share', 20, 80, 2, 55, '%')],
    evaluate: v => { const speed = get(v, 'speed'); const angle = get(v, 'angle'); const area = get(v, 'area'); const q = .5 * 1.225 * (speed / 3.6) ** 2; const cl = Math.max(.15, .18 + .115 * angle - .0038 * angle ** 2); const down = q * area * cl; const drag = down / Math.max(2.2, 7 - .22 * angle); return { metrics: [m('下压力', 'Downforce', down, 'N', down > 900 ? 'good' : undefined), m('诱导阻力', 'Induced drag', drag, 'N'), m('升阻比', 'Lift-to-drag', down / drag, ''), m('前轴贡献', 'Front contribution', down * get(v, 'balance') / 100, 'N')], points: curve(x => .5 * 1.225 * (x / 3.6) ** 2 * area * cl, 30, 160), xLabel: l('车速 (km/h)', 'Speed (km/h)'), yLabel: l('下压力 (N)', 'Downforce (N)'), insight: l('下压力随速度平方增长；攻角增大先增加载荷，接近失速后收益迅速减小，同时阻力上升。', 'Downforce grows with speed squared; angle initially adds load, but return collapses near stall while drag rises.') } },
  },
  floor: {
    title: l('地面效应与车高平台', 'Ground-effect ride-height platform'),
    parameters: [p('speed', '车速', 'Speed', 40, 180, 5, 110, 'km/h'), p('frontHeight', '前车高', 'Front ride height', 15, 60, 1, 30, 'mm'), p('rearHeight', '后车高', 'Rear ride height', 20, 80, 1, 48, 'mm'), p('seal', '边缘密封效率', 'Edge-seal efficiency', 40, 100, 2, 82, '%')],
    evaluate: v => {
      const speed = get(v, 'speed')
      const frontHeight = get(v, 'frontHeight')
      const rearHeight = get(v, 'rearHeight')
      const seal = get(v, 'seal') / 100
      const loadAtHeight = (height: number) => {
        const rakeAtHeight = (rearHeight - height) / 20
        const heightFactor = Math.exp(-(((height - 27) / 16) ** 2))
        const stallFactor = height < 19 ? Math.max(.2, height / 19) : 1
        return .5 * 1.225 * (speed / 3.6) ** 2 * 1.35 * (1.1 + .35 * rakeAtHeight) * seal * heightFactor * stallFactor
      }
      const load = loadAtHeight(frontHeight)
      return {
        metrics: [m('底板下压力', 'Floor downforce', load, 'N', frontHeight < 19 ? 'danger' : 'good'), m('前后车高差', 'Rake', rearHeight - frontHeight, 'mm'), m('车高敏感度', 'Height sensitivity', Math.abs(frontHeight - 27) * 2.8, '%'), m('失速裕量', 'Stall margin', frontHeight - 18, 'mm', frontHeight < 22 ? 'warn' : undefined)],
        points: curve(loadAtHeight, 15, 60),
        xLabel: l('前车高 (mm)', 'Front ride height (mm)'),
        yLabel: l('底板下压力 (N)', 'Floor downforce (N)'),
        insight: l('底板存在最佳车高窗口；扫描前车高时，模型同时更新与固定后车高形成的俯仰差。太高会削弱地面效应，太低会堵塞流道并失速，因此平台控制比单个静态峰值更重要。', 'The floor has an optimum height window. As front height is scanned, the model also updates the rake created against the fixed rear height. Too high weakens ground effect and too low chokes the passage, so platform control matters more than a single static peak.'),
      }
    },
  },
  impact: {
    title: l('碰撞吸能实验', 'Crash-energy experiment'),
    parameters: [p('mass', '等效质量', 'Equivalent mass', 180, 420, 10, 300, 'kg'), p('speed', '碰撞速度', 'Impact speed', 5, 12, .5, 7, 'm/s'), p('stroke', '压溃行程', 'Crush stroke', 120, 400, 10, 260, 'mm'), p('progressive', '渐进压溃程度', 'Progressivity', 20, 100, 5, 75, '%')],
    evaluate: v => { const E = .5 * get(v, 'mass') * get(v, 'speed') ** 2; const stroke = get(v, 'stroke') / 1000; const mean = E / stroke; const prog = get(v, 'progressive') / 100; const peakRatio = 1.75 - .55 * prog; const startRatio = 2 - peakRatio; const peak = mean * peakRatio; const g = peak / (get(v, 'mass') * 9.81); return { metrics: [m('吸收能量', 'Energy absorbed', E, 'J'), m('平均压溃力', 'Mean crush force', mean / 1000, 'kN'), m('峰值压溃力', 'Peak crush force', peak / 1000, 'kN', g > 20 ? 'danger' : undefined), m('峰值减速度', 'Peak deceleration', g, 'g')], points: curve(x => mean * (startRatio + (peakRatio - startRatio) * x / stroke) / 1000, 0, stroke), xLabel: l('压溃位移', 'Crush displacement'), yLabel: l('压溃力', 'Crush force'), insight: l('同样能量下，增加有效行程并改善渐进触发可以降低初始峰值；曲线面积严格等于待吸收动能，但真实设计仍需用试验校准触发与折叠模式。', 'For the same energy, more usable stroke and progressive triggering reduce the initial peak; the curve area exactly matches the kinetic energy to absorb, while real trigger and folding modes still require test calibration.') } },
  },
  structure: {
    title: l('车架扭转刚度台架', 'Chassis torsion rig'),
    parameters: [p('torque', '施加扭矩', 'Applied torque', 400, 1800, 50, 1000, 'N·m'), p('stiffness', '车架刚度', 'Chassis stiffness', 800, 6000, 100, 3000, 'N·m/°'), p('wheelRate', '等效滚转刚度', 'Equivalent roll stiffness', 600, 5000, 100, 2400, 'N·m/°'), p('damage', '连接退化', 'Joint degradation', 0, 30, 1, 0, '%')],
    evaluate: v => { const keff = get(v, 'stiffness') * (1 - get(v, 'damage') / 100); const twist = get(v, 'torque') / keff; const share = keff / (keff + get(v, 'wheelRate')) * 100; return { metrics: [m('车架扭角', 'Chassis twist', twist, '°', twist > .6 ? 'warn' : undefined), m('有效刚度', 'Effective stiffness', keff, 'N·m/°'), m('悬架控制比例', 'Suspension authority', share, '%'), m('应变能指标', 'Strain-energy index', .5 * get(v, 'torque') * twist * Math.PI / 180, 'J')], points: curve(x => x * keff, 0, 1), xLabel: l('扭角', 'Twist'), yLabel: l('扭矩', 'Torque'), insight: l('车架刚度足够高时，调校变化主要由弹簧与防倾杆决定；连接退化会让响应变软并产生滞回。', 'With sufficient chassis stiffness, springs and bars control setup response; degraded joints soften the response and create hysteresis.') } },
  },
  protection: {
    title: l('驾驶舱保护载荷', 'Cockpit protection load case'),
    parameters: [p('load', '外部载荷', 'External load', 10, 120, 5, 60, 'kN'), p('length', '有效长度', 'Effective length', 250, 900, 10, 520, 'mm'), p('diameter', '管径', 'Tube diameter', 22, 55, 1, 38, 'mm'), p('thickness', '壁厚', 'Wall thickness', 1.2, 4, .1, 2.2, 'mm')],
    evaluate: v => { const D = get(v, 'diameter') / 1000; const t = get(v, 'thickness') / 1000; const d = Math.max(.001, D - 2 * t); const I = Math.PI / 64 * (D ** 4 - d ** 4); const area = Math.PI / 4 * (D ** 2 - d ** 2); const pcr = Math.PI ** 2 * 200e9 * I / (get(v, 'length') / 1000) ** 2; const stress = get(v, 'load') * 1000 / area; const mos = Math.min(350e6 / stress, pcr / (get(v, 'load') * 1000)) - 1; return { metrics: [m('名义应力', 'Nominal stress', stress / 1e6, 'MPa'), m('屈曲载荷', 'Buckling load', pcr / 1000, 'kN'), m('安全裕量', 'Margin of safety', mos, '', mos < 0 ? 'danger' : mos < .3 ? 'warn' : 'good'), m('截面面积', 'Section area', area * 1e6, 'mm²')], points: curve(x => pcr * (x - .12 * x ** 3) / 1000, 0, 1.2), xLabel: l('归一化变形', 'Normalised deformation'), yLabel: l('承载力', 'Load capacity'), insight: l('细长构件可能先屈曲而不是先达到材料强度；直径对截面惯性矩的影响远强于简单增加壁厚。', 'Slender members may buckle before material failure; diameter has a much stronger effect on section inertia than simply adding wall thickness.') } },
  },
  tire: {
    title: l('轮胎滑移与载荷实验', 'Tyre slip and load experiment'),
    parameters: [p('load', '法向载荷', 'Normal load', 400, 2200, 50, 1100, 'N'), p('slip', '滑移率', 'Slip ratio', 0, 25, 1, 10, '%'), p('speed', '车辆纵向速度', 'Vehicle longitudinal speed', 5, 35, 1, 18, 'm/s'), p('temp', '胎面温度', 'Tread temperature', 20, 110, 2, 70, '°C'), p('pressure', '热态胎压', 'Hot pressure', 60, 110, 2, 85, 'kPa')],
    evaluate: v => { const fz = get(v, 'load'); const slip = get(v, 'slip') / 100; const speed = get(v, 'speed'); const tempFactor = Math.exp(-(((get(v, 'temp') - 72) / 30) ** 2)); const pressureFactor = Math.exp(-(((get(v, 'pressure') - 84) / 28) ** 2)); const mu = 1.65 * (fz / 1000) ** (-.12) * tempFactor * pressureFactor; const fx = mu * fz * Math.sin(1.5 * Math.atan(14 * slip)); const slipSpeed = speed * slip / Math.max(1 - slip, .01); const loss = fx * slipSpeed; return { metrics: [m('纵向力', 'Longitudinal force', fx, 'N', slip > .18 ? 'warn' : 'good'), m('有效摩擦系数', 'Effective friction', fx / fz, ''), m('滑移耗散功率', 'Slip-dissipation power', loss / 1000, 'kW'), m('热窗口匹配', 'Thermal-window match', tempFactor * 100, '%')], points: curve(x => mu * fz * Math.sin(1.5 * Math.atan(14 * x)), 0, .3), xLabel: l('驱动滑移率', 'Drive slip ratio'), yLabel: l('纵向力', 'Longitudinal force'), insight: l('力在有限滑移处达到峰值。这里采用驱动定义 κ=(Rω−V)/(Rω)，所以相对滑移速度为 Vκ/(1−κ)，耗散功率为纵向力乘以该相对速度；载荷敏感性、温度和胎压共同重塑力曲线。', 'Force peaks at finite slip. With the drive definition κ=(Rω−V)/(Rω), relative slip speed is Vκ/(1−κ), so dissipation is longitudinal force times that relative speed; load sensitivity, temperature and pressure reshape the force curve.') } },
  },
  brake: {
    title: l('制动平衡与热负荷', 'Brake balance and thermal load'),
    parameters: [p('pedal', '踏板力', 'Pedal force', 100, 700, 20, 420, 'N'), p('bias', '前制动比例', 'Front brake share', 45, 75, 1, 61, '%'), p('speed', '制动初速', 'Initial speed', 40, 180, 5, 120, 'km/h'), p('discMass', '单盘质量', 'Disc mass', .5, 2.5, .1, 1.3, 'kg')],
    evaluate: v => { const decel = Math.min(1.7, get(v, 'pedal') / 360); const dynamicFront = 52 + decel * 10; const error = get(v, 'bias') - dynamicFront; const energy = .5 * 310 * (get(v, 'speed') / 3.6) ** 2; const tempRise = energy * .72 / (4 * get(v, 'discMass') * 500); return { metrics: [m('目标减速度', 'Target deceleration', decel, 'g'), m('动态前轴比例', 'Dynamic front load', dynamicFront, '%'), m('平衡误差', 'Bias error', error, '%', Math.abs(error) > 6 ? 'danger' : Math.abs(error) > 3 ? 'warn' : 'good'), m('单次盘温升', 'Disc temperature rise', tempRise, '°C')], points: curve(x => 52 + x * 17, 0, 1.7), xLabel: l('减速度', 'Deceleration'), yLabel: l('理想前制动比例', 'Ideal front share'), insight: l('理想平衡随减速度和空气动力载荷移动；高速能量按速度平方增长，平衡正确也不等于热容量足够。', 'Ideal bias moves with deceleration and aero load; high-speed energy grows with speed squared, and correct balance does not guarantee thermal capacity.') } },
  },
  suspension: {
    title: l('悬架运动比与平台响应', 'Suspension motion and platform response'),
    parameters: [p('spring', '弹簧刚度', 'Spring rate', 20, 120, 2, 65, 'N/mm'), p('motionRatio', '运动比', 'Motion ratio', .5, 1.2, .02, .78, ''), p('cornerMass', '单角簧载质量', 'Corner sprung mass', 45, 110, 2, 72, 'kg'), p('damping', '等效阻尼', 'Equivalent damping', 500, 3500, 100, 1800, 'N·s/m')],
    evaluate: v => { const kw = get(v, 'spring') * get(v, 'motionRatio') ** 2 * 1000; const mass = get(v, 'cornerMass'); const omega = Math.sqrt(kw / mass); const fn = omega / (2 * Math.PI); const zeta = get(v, 'damping') / (2 * Math.sqrt(kw * mass)); const settle = settlingTimeTwoPercent(omega, zeta); return { metrics: [m('轮端刚度', 'Wheel rate', kw / 1000, 'N/mm'), m('固有频率', 'Natural frequency', fn, 'Hz'), m('阻尼比', 'Damping ratio', zeta, '', zeta > .9 ? 'warn' : 'good'), m('2%稳定时间', '2% settling time', settle, 's')], points: curve(x => secondOrderFreeResponse(x, omega, zeta), 0, 2), xLabel: l('时间', 'Time'), yLabel: l('归一化轮跳', 'Normalised heave'), insight: l('运动比以平方关系改变轮端刚度；阻尼过低会振荡，过高会让轮胎难以跟随连续路面输入。', 'Motion ratio changes wheel rate by its square; too little damping oscillates while too much prevents the tyre following repeated road input.') } },
  },
  steering: {
    title: l('阿克曼与转向响应', 'Ackermann and steering response'),
    parameters: [p('wheelbase', '轴距', 'Wheelbase', 1.5, 3.2, .05, 1.65, 'm'), p('track', '前轮距', 'Front track', 1.1, 1.8, .02, 1.25, 'm'), p('radius', '转弯半径', 'Turn radius', 3, 30, .5, 8, 'm'), p('ratio', '转向比', 'Steering ratio', 3, 12, .25, 6.5, ':1')],
    evaluate: v => { const L = get(v, 'wheelbase'); const t = get(v, 'track'); const R = get(v, 'radius'); const inner = Math.atan(L / Math.max(.5, R - t / 2)) * 180 / Math.PI; const outer = Math.atan(L / (R + t / 2)) * 180 / Math.PI; const hand = (inner + outer) / 2 * get(v, 'ratio'); return { metrics: [m('内轮转角', 'Inner-wheel angle', inner, '°'), m('外轮转角', 'Outer-wheel angle', outer, '°'), m('阿克曼差', 'Ackermann split', inner - outer, '°'), m('方向盘转角', 'Steering-wheel angle', hand, '°')], points: curve(radius => Math.atan(L / Math.max(.5, radius - t / 2)) * 180 / Math.PI, 3, 30), xLabel: l('转弯半径 (m)', 'Turn radius (m)'), yLabel: l('内轮转角 (°)', 'Inner-wheel angle (°)'), insight: l('小半径需要明显的内外轮转角差；高速时轮胎侧偏和载荷分配会让最佳值偏离纯几何阿克曼。', 'Tight radii need a clear inner/outer split; at speed, tyre slip and load distribution move the optimum away from pure geometric Ackermann.') } },
  },
  battery: {
    title: l('电池功率与热边界', 'Battery power and thermal boundary'),
    parameters: [p('soc', '荷电状态', 'State of charge', 5, 100, 1, 70, '%'), p('current', '放电电流', 'Discharge current', 20, 500, 10, 260, 'A'), p('temp', '最高电芯温度', 'Maximum cell temperature', 15, 65, 1, 35, '°C'), p('resistance', '等效内阻', 'Equivalent resistance', 15, 90, 2, 42, 'mΩ')],
    evaluate: v => { const ocv = 320 + 1.15 * get(v, 'soc'); const R = get(v, 'resistance') / 1000; const voltage = ocv - get(v, 'current') * R; const capability = voltage * get(v, 'current') / 1000; const drivePower = Math.min(capability, FORMULA_STUDENT_MAX_DRIVE_DC_KW); const heat = get(v, 'current') ** 2 * R / 1000; const tempLimit = get(v, 'temp') > 50 ? Math.max(0, 100 - (get(v, 'temp') - 50) * 6) : 100; return { metrics: [m('端电压', 'Terminal voltage', voltage, 'V'), m('EV2.2.1 驱动包络', 'EV2.2.1 drive envelope', drivePower, 'kW', capability > FORMULA_STUDENT_MAX_DRIVE_DC_KW ? 'warn' : 'good'), m('焦耳热', 'Joule heat', heat, 'kW', heat > 8 ? 'warn' : undefined), m('温度功率可用度', 'Thermal power availability', tempLimit, '%', tempLimit < 60 ? 'danger' : 'good')], points: curve(current => Math.min((ocv - current * R) * current / 1000, FORMULA_STUDENT_MAX_DRIVE_DC_KW), 20, 500), xLabel: l('放电电流 (A)', 'Discharge current (A)'), yLabel: l('规则包络内驱动功率 (kW)', 'Drive power within rule envelope (kW)'), insight: l('电池端能力曲线受压降和 I²R 热影响；装车驱动输出另受 Formula Student 2026 EV2.2.1 的 TSAC 输出端 80 kW 上限约束。指标变为警示色时表示未裁剪的电池能力已超过该装车边界。EV2.2.3 明确该 80 kW 条款不用于再生回收，因此这里的裁剪仅表示正向驱动。', 'Battery-terminal capability is shaped by sag and I²R heat. Installed positive drive output is separately capped at 80 kW at the TSAC output by Formula Student 2026 EV2.2.1; the warning tone indicates that unclipped battery capability is above that installed boundary. EV2.2.3 states that this 80 kW clause does not apply to regenerative energy, so this clipping represents positive drive only.') } },
  },
  inverter: {
    title: l('逆变器 PWM 与损耗', 'Inverter PWM and losses'),
    parameters: [p('power', '机械功率请求', 'Mechanical power request', 10, 100, 2, 60, 'kW'), p('switching', '开关频率', 'Switching frequency', 4, 24, 1, 12, 'kHz'), p('current', '相电流', 'Phase current', 50, 450, 10, 260, 'A'), p('coolant', '冷却液温度', 'Coolant temperature', 20, 65, 1, 38, '°C')],
    evaluate: v => { const cond = .000075 * get(v, 'current') ** 2; const sw = .075 * get(v, 'switching') * get(v, 'current') / 100; const loss = cond + sw; const mechanical = Math.min(get(v, 'power'), Math.max(0, FORMULA_STUDENT_MAX_DRIVE_DC_KW - loss)); const dcInput = mechanical + loss; const efficiency = dcInput > 0 ? mechanical / dcInput * 100 : 0; const junction = get(v, 'coolant') + loss * 7.5; return { metrics: [m('总损耗', 'Total loss', loss, 'kW'), m('规则包络内机械输出', 'Mechanical output within rule envelope', mechanical, 'kW', get(v, 'power') > mechanical ? 'warn' : 'good'), m('效率', 'Efficiency', efficiency, '%'), m('估算结温', 'Estimated junction', junction, '°C', junction > 145 ? 'danger' : junction > 120 ? 'warn' : 'good')], points: curve(fs => cond + .075 * fs * get(v, 'current') / 100, 4, 24), xLabel: l('开关频率 (kHz)', 'Switching frequency (kHz)'), yLabel: l('逆变器损耗 (kW)', 'Inverter loss (kW)'), insight: l('提高 PWM 频率能降低纹波，却按开关次数增加损耗。机械输出按“损耗加机械输出不超过 80 kW TSAC 正向驱动包络”裁剪；这是装车规则边界，部件台架能力可更高，但不代表赛道可用驱动功率。', 'Raising PWM frequency reduces ripple but adds switching loss. Mechanical output is clipped so losses plus shaft output remain inside the 80 kW positive-drive envelope at the TSAC output. Component bench capability may be higher, but that is not installed track-available drive power.') } },
  },
  motor: {
    title: l('电机转矩—转速包络', 'Motor torque-speed envelope'),
    parameters: [p('speed', '电机转速', 'Motor speed', 0, 18000, 500, 8000, 'rpm'), p('current', 'q 轴电流', 'q-axis current', 0, 450, 10, 300, 'A'), p('ratio', '总减速比', 'Final ratio', 5, 14, .25, 9.5, ':1'), p('temp', '绕组温度', 'Winding temperature', 30, 170, 5, 90, '°C')],
    evaluate: v => { const speed = get(v, 'speed'); const tempDerate = get(v, 'temp') > 130 ? Math.max(.25, 1 - (get(v, 'temp') - 130) / 60) : 1; const baseTorque = get(v, 'current') * .58 * tempDerate; const capabilityTorque = speed <= 9000 ? baseTorque : baseTorque * 9000 / Math.max(speed, 1); const angularSpeed = speed * 2 * Math.PI / 60; const ruleMechanicalPower = FORMULA_STUDENT_MAX_DRIVE_DC_KW * FORMULA_STUDENT_ASSUMED_DRIVETRAIN_EFFICIENCY; const ruleTorque = angularSpeed > 0 ? ruleMechanicalPower * 1000 / angularSpeed : capabilityTorque; const torque = Math.min(capabilityTorque, ruleTorque); const power = torque * angularSpeed / 1000; const wheelForce = torque * get(v, 'ratio') * .94 / .23; const torqueAtSpeed = (rpm: number) => { const capability = rpm <= 9000 ? baseTorque : baseTorque * 9000 / Math.max(rpm, 1); const omega = rpm * 2 * Math.PI / 60; const envelope = omega > 0 ? ruleMechanicalPower * 1000 / omega : capability; return Math.min(capability, envelope) }; return { metrics: [m('规则包络内轴端转矩', 'Shaft torque within rule envelope', torque, 'N·m'), m('规则包络内机械功率', 'Mechanical power within rule envelope', power, 'kW'), m('轮上牵引力', 'Wheel force', wheelForce, 'N'), m('热降额', 'Thermal availability', tempDerate * 100, '%', tempDerate < .6 ? 'danger' : 'good')], points: curve(torqueAtSpeed, 0, 18000), xLabel: l('转速 (rpm)', 'Speed (rpm)'), yLabel: l('装车可用转矩 (N·m)', 'Installed available torque (N·m)'), insight: l('电机部件本体在基速以下近似恒转矩、弱磁区近似恒功率；装车曲线还按 80 kW TSAC 正向驱动上限和 94% 教学用总效率假设裁剪。94% 不是规则值，实际效率必须由电机与逆变器测功数据替换。', 'The component itself is approximately constant-torque below base speed and near constant-power in field weakening. The installed curve is additionally clipped by the 80 kW TSAC positive-drive limit and an explicit 94% teaching drivetrain-efficiency assumption. The 94% is not a rule value and must be replaced with dynamometer data for real design.') } },
  },
  differential: {
    title: l('差速锁止与偏航', 'Differential locking and yaw'),
    parameters: [p('insideLoad', '内轮载荷', 'Inside-wheel load', 100, 1000, 25, 420, 'N'), p('outsideLoad', '外轮载荷', 'Outside-wheel load', 500, 1800, 25, 1250, 'N'), p('locking', '锁止程度', 'Locking level', 0, 100, 2, 45, '%'), p('torque', '轴端请求', 'Axle torque request', 100, 1200, 25, 650, 'N·m')],
    evaluate: v => {
      const mu = 1.55
      const insideCap = get(v, 'insideLoad') * mu * .23
      const outsideCap = get(v, 'outsideLoad') * mu * .23
      const request = get(v, 'torque')
      const splitAt = (locking: number) => {
        const openSideTorque = Math.min(request / 2, insideCap, outsideCap)
        let inside = openSideTorque
        let outside = openSideTorque
        const transferCapacity = request * .5 * Math.max(0, Math.min(1, locking))
        const remaining = Math.max(0, request - inside - outside)
        if (outsideCap >= insideCap) outside += Math.min(remaining, transferCapacity, Math.max(0, outsideCap - outside))
        else inside += Math.min(remaining, transferCapacity, Math.max(0, insideCap - inside))
        return { inside, outside }
      }
      const split = splitAt(get(v, 'locking') / 100)
      const delivered = split.inside + split.outside
      const yaw = (split.outside - split.inside) / .23 * .62
      return { metrics: [m('内轮扭矩', 'Inside torque', split.inside, 'N·m'), m('外轮扭矩', 'Outside torque', split.outside, 'N·m'), m('实际轴扭矩', 'Delivered axle torque', delivered, 'N·m'), m('驱动偏航力矩', 'Drive yaw moment', yaw, 'N·m', Math.abs(yaw) > 800 ? 'warn' : undefined)], points: curve(x => { const point = splitAt(x); return point.inside + point.outside }, 0, 1), xLabel: l('锁止比例', 'Locking level'), yLabel: l('可传轴扭矩', 'Delivered axle torque'), insight: l('开放式对称差速器两侧近似等扭矩并受低附着轮限制；离合锁止建立有限扭矩偏置后，才可利用高载外轮的额外能力。', 'An open symmetric differential delivers approximately equal torque and is limited by the lower-grip tyre; only finite clutch locking creates bias that can use extra capacity at the loaded outer tyre.') }
    },
  },
  cooling: {
    title: l('冷却回路能量平衡', 'Cooling-loop energy balance'),
    parameters: [p('heat', '系统热负荷', 'System heat load', 2, 25, .5, 12, 'kW'), p('flow', '冷却液流量', 'Coolant flow', 2, 20, .5, 9, 'L/min'), p('airflow', '散热器风量', 'Radiator airflow', 20, 100, 2, 65, '%'), p('ambient', '环境温度', 'Ambient temperature', 15, 45, 1, 30, '°C')],
    evaluate: v => { const mdot = get(v, 'flow') / 60 * 1.03; const rise = get(v, 'heat') * 1000 / Math.max(1, mdot * 3900); const airR = 2.6 / Math.max(.2, get(v, 'airflow') / 100); const coolant = get(v, 'ambient') + get(v, 'heat') * airR; const pressure = .65 * get(v, 'flow') ** 2; const pump = pressure * get(v, 'flow') / 60000 / .55; return { metrics: [m('冷却液温升', 'Coolant rise', rise, '°C'), m('稳态冷却液温度', 'Steady coolant', coolant, '°C', coolant > 80 ? 'danger' : coolant > 65 ? 'warn' : 'good'), m('回路压降', 'Loop pressure drop', pressure, 'kPa'), m('泵轴输入功率', 'Pump shaft input power', pump, 'kW')], points: curve(airflow => get(v, 'ambient') + get(v, 'heat') * 2.6 / Math.max(.2, airflow / 100), 20, 100), xLabel: l('散热器风量 (%)', 'Radiator airflow (%)'), yLabel: l('冷却液温度 (°C)', 'Coolant temperature (°C)'), insight: l('流量降低液体温升，但散热器空气侧或界面热阻成为瓶颈后，再加泵速收益会快速递减。', 'Flow reduces coolant rise, but once radiator air side or interface resistance dominates, added pump speed gives rapidly diminishing return.') } },
  },
  control: {
    title: l('扭矩仲裁与故障降级', 'Torque arbitration and fault degradation'),
    parameters: [p('driver', '驾驶员请求', 'Driver request', 0, 100, 2, 85, '%'), p('battery', '电池限值', 'Battery limit', 0, 100, 2, 72, '%'), p('motor', '电机限值', 'Motor limit', 0, 100, 2, 90, '%'), p('traction', '轮胎限值', 'Tyre limit', 0, 100, 2, 64, '%')],
    evaluate: v => { const limits = [['driver', get(v, 'driver')], ['battery', get(v, 'battery')], ['motor', get(v, 'motor')], ['traction', get(v, 'traction')]] as const; const winner = limits.reduce((a, b) => b[1] < a[1] ? b : a); const sorted = [...limits].sort((a, b) => a[1] - b[1]); const margin = sorted[1]![1] - sorted[0]![1]; return { metrics: [m('最终扭矩指令', 'Final torque command', winner[1], '%', winner[1] < 30 ? 'warn' : 'good'), m('限制源编号', 'Limiting-source index', limits.findIndex(x => x[0] === winner[0]) + 1, ''), m('次级限值裕量', 'Next-limit margin', margin, '%'), m('允许恢复斜率', 'Allowed recovery rate', Math.max(5, margin * 2), '%/s')], points: curve(x => Math.min(get(v, 'driver'), get(v, 'battery'), get(v, 'motor'), 100 * x), 0, 1), xLabel: l('轮胎可用比例', 'Tyre availability'), yLabel: l('最终指令', 'Final command'), insight: l('最终指令由最严格边界决定；显示限制来源、加入滞回和受控恢复，才能既安全又避免边界抖动。', 'The tightest boundary sets the command; exposing its source and adding hysteresis plus controlled recovery keeps the result safe without chatter.') } },
  },
  telemetry: {
    title: l('采样、标定与时间同步', 'Sampling, calibration and synchronisation'),
    parameters: [p('signal', '信号频率', 'Signal frequency', 1, 120, 1, 35, 'Hz'), p('sample', '采样频率', 'Sample rate', 20, 500, 10, 200, 'Hz'), p('offset', '时间偏移', 'Time offset', 0, 30, 1, 5, 'ms'), p('noise', '噪声幅值', 'Noise amplitude', 0, 20, 1, 4, '%')],
    evaluate: v => { const ratio = get(v, 'sample') / (2 * get(v, 'signal')); const alias = get(v, 'sample') > 2 * get(v, 'signal') ? get(v, 'signal') : Math.abs(get(v, 'signal') - Math.round(get(v, 'signal') / get(v, 'sample')) * get(v, 'sample')); const phase = 360 * get(v, 'signal') * get(v, 'offset') / 1000; const confidence = Math.max(0, Math.min(100, ratio * 45 - get(v, 'noise') * 1.5 - phase * .2)); return { metrics: [m('奈奎斯特裕量', 'Nyquist margin', ratio, '×', ratio < 1 ? 'danger' : ratio < 2 ? 'warn' : 'good'), m('观测频率', 'Observed frequency', alias, 'Hz'), m('同步相位误差', 'Timing phase error', phase, '°', phase > 30 ? 'warn' : undefined), m('证据可信度', 'Evidence confidence', confidence, '%')], points: curve(x => Math.sin(2 * Math.PI * get(v, 'signal') * x) + get(v, 'noise') / 100 * Math.sin(2 * Math.PI * 137 * x), 0, .2), xLabel: l('时间', 'Time'), yLabel: l('测量值', 'Measured value'), insight: l('采样低于奈奎斯特条件会产生无法事后修复的混叠；时间偏移则会制造虚假的因果延迟。', 'Sampling below Nyquist creates aliasing that cannot be repaired later; timing offset creates false causal delay.') } },
  },
};

export const initialValues = (kind: LabKind): Record<string, number> => Object.fromEntries(LAB_MODELS[kind].parameters.map(parameter => [parameter.key, parameter.initial]))
