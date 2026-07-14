import type { PartId } from './data'
import type { LocalText } from './engineeringData'

export type WorkedExample = {
  scenario: LocalText
  steps: [LocalText, LocalText, ...LocalText[]]
  result: LocalText
}

const l = (zh: string, en: string): LocalText => ({ zh, en })
const ex = (scenarioZh: string, scenarioEn: string, steps: [string, string][], resultZh: string, resultEn: string): WorkedExample => {
  if (steps.length < 2) throw new Error('A worked example needs at least two calculation steps')
  return {
    scenario: l(scenarioZh, scenarioEn),
    steps: steps.map(([zh, en]) => l(zh, en)) as [LocalText, LocalText, ...LocalText[]],
    result: l(resultZh, resultEn),
  }
}

export const FORMULA_EXAMPLES: Record<PartId, [WorkedExample, WorkedExample, WorkedExample]> = {
  'front-wing': [
    ex(
      '排位赛前，气象站测得空气密度为 1.18 kg/m³。前翼装车参考面积为 0.42 m²，风洞关联后的正值下压力系数为 1.65；赛车在高速弯入口达到 120 km/h。估算这一时刻前翼产生的下压力。',
      'Before qualifying, the weather station reports an air density of 1.18 kg/m³. The installed front-wing reference area is 0.42 m² and its correlated positive downforce coefficient is 1.65; speed at a fast-corner entry is 120 km/h. Estimate the front-wing downforce.',
      [
        ['先把车速换成 SI 单位：V = 120 ÷ 3.6 = 33.33 m/s。', 'Convert speed to SI units: V = 120 ÷ 3.6 = 33.33 m/s.'],
        ['代入 Fz = ½ρV²SC_L↓ = 0.5 × 1.18 × 33.33² × 0.42 × 1.65。', 'Substitute into Fz = ½ρV²SC_L↓ = 0.5 × 1.18 × 33.33² × 0.42 × 1.65.'],
        ['逐项计算得到动压 ½ρV² = 655.4 Pa，再乘面积与系数。', 'The dynamic pressure is ½ρV² = 655.4 Pa; multiply it by area and coefficient.'],
      ],
      '前翼下压力约为 454 N，相当于约 46.3 kg 的静态重量。这个结果只能用于该车高、偏航角和翼片设定附近。',
      'Front-wing downforce is about 454 N, equivalent to roughly 46.3 kg of static weight. It is valid only near the correlated ride height, yaw and flap setting.',
    ),
    ex(
      '同一次高速弯分析中，前翼参考面积仍为 0.42 m²，装车阻力系数为 0.18，空气密度 1.18 kg/m³，车速 120 km/h。工程师要估算前翼为这部分下压力付出的直线阻力。',
      'For the same fast-corner analysis, the front-wing area remains 0.42 m², installed drag coefficient is 0.18, air density is 1.18 kg/m³ and speed is 120 km/h. Estimate the straight-line drag cost of the front wing.',
      [
        ['车速换算为 33.33 m/s，动压仍为 q = 0.5 × 1.18 × 33.33² = 655.4 Pa。', 'Convert speed to 33.33 m/s; dynamic pressure is q = 0.5 × 1.18 × 33.33² = 655.4 Pa.'],
        ['代入 D = qSC_D = 655.4 × 0.42 × 0.18。', 'Substitute into D = qSC_D = 655.4 × 0.42 × 0.18.'],
      ],
      '前翼阻力约为 49.5 N；此时下压力/阻力约为 9.2。这个比值不等于整车效率，也不能脱离赛道速度分布判断圈速。',
      'Front-wing drag is about 49.5 N and its load-to-drag ratio is about 9.2. This is not whole-car efficiency and cannot predict lap time without the track speed distribution.',
    ),
    ex(
      '赛道直道末端的悬架载荷反算显示，前轴气动载荷为 454 N，后轴气动载荷为 520 N。工程师要确认当前高速气动平衡是否接近设定目标。',
      'Suspension-load reconstruction at the end of a straight gives 454 N front-axle aero load and 520 N rear-axle aero load. The engineer wants to check the current high-speed aero balance.',
      [
        ['先求总气动载荷：Fz,total = 454 + 520 = 974 N。', 'Find total aero load: Fz,total = 454 + 520 = 974 N.'],
        ['前轴气动平衡 βa = 454 ÷ 974 = 0.466。', 'Front aero balance is βa = 454 ÷ 974 = 0.466.'],
      ],
      '前轴气动平衡约为 46.6%。下一步应比较不同车高、俯仰和偏航条件，而不是把单一速度点当成完整气动图谱。',
      'Front aero balance is about 46.6%. The next step is to compare ride height, pitch and yaw rather than treating one speed point as the complete aero map.',
    ),
  ],
  'rear-wing': [
    ex(
      '耐久赛前的高速设定中，空气密度为 1.20 kg/m³，尾翼装车面积为 0.55 m²，包含车身尾流影响后的正值下压力系数为 1.45，预测直道末端车速为 160 km/h。',
      'For the pre-endurance high-speed setup, air density is 1.20 kg/m³, installed rear-wing area is 0.55 m², the positive downforce coefficient including body-wake effects is 1.45, and predicted end-of-straight speed is 160 km/h.',
      [
        ['车速换算：V = 160 ÷ 3.6 = 44.44 m/s。', 'Convert speed: V = 160 ÷ 3.6 = 44.44 m/s.'],
        ['代入 Fz,r = 0.5 × 1.20 × 44.44² × 0.55 × 1.45。', 'Substitute Fz,r = 0.5 × 1.20 × 44.44² × 0.55 × 1.45.'],
      ],
      '尾翼下压力约为 945 N。支架载荷工况还要叠加振动、路肩冲击和左右不对称气流，不能只采用这个稳态值。',
      'Rear-wing downforce is about 945 N. Mount load cases must also include vibration, kerb impact and asymmetric flow rather than this steady value alone.',
    ),
    ex(
      '两个尾翼方案在目标姿态下分别得到整车升力系数幅值 2.80 和阻力系数 0.82。工程师先计算无量纲气动效率，再结合赛道决定是否采用。',
      'A candidate rear-wing setup gives a whole-car lift-coefficient magnitude of 2.80 and a drag coefficient of 0.82 at the target attitude. Calculate its nondimensional aero efficiency before using the track model.',
      [
        ['采用系数幅值，ηa = |C_L| ÷ C_D。', 'Use the coefficient magnitude: ηa = |C_L| ÷ C_D.'],
        ['代入 ηa = 2.80 ÷ 0.82 = 3.4146。', 'Substitute ηa = 2.80 ÷ 0.82 = 3.4146.'],
      ],
      '气动效率约为 3.41。它只是载荷与阻力的比值；低速弯收益、高速直道损失和能耗仍需通过圈速仿真权衡。',
      'Aero efficiency is about 3.41. It is only a load-to-drag ratio; low-speed corner benefit, straight-line loss and energy use still require lap simulation.',
    ),
    ex(
      '一次气动图谱试验在重心处采用“前轴下压力产生正俯仰矩”的符号约定。测得前轴载荷 720 N、作用点距重心 1.25 m，后轴载荷 860 N、作用点距重心 1.15 m。',
      'An aero-map test defines front downforce as a positive pitching moment about the centre of gravity. Front load is 720 N at a 1.25 m arm and rear load is 860 N at a 1.15 m arm.',
      [
        ['前轴项为 720 × 1.25 = 900 N·m。', 'The front contribution is 720 × 1.25 = 900 N·m.'],
        ['后轴项为 860 × 1.15 = 989 N·m。', 'The rear contribution is 860 × 1.15 = 989 N·m.'],
        ['按既定符号代入 My = 900 − 989。', 'Apply the declared sign convention: My = 900 − 989.'],
      ],
      '俯仰矩为 −89 N·m，说明该工况相对偏向后轴。若改变坐标或力矩正方向，数值符号会反转，因此报告必须同时写明约定。',
      'Pitching moment is −89 N·m, indicating a rear-biased condition under this convention. A different axis convention reverses the sign, so the report must state it.',
    ),
  ],
  floor: [
    ex(
      '底板台架的一个截面处，空气密度为 1.18 kg/m³，等效流道面积为 0.065 m²，截面平均速度由压力耙估算为 52 m/s。估算通过该截面的质量流量。',
      'At one floor-rig section, air density is 1.18 kg/m³, equivalent passage area is 0.065 m² and pressure-rake data gives a section-average speed of 52 m/s. Estimate mass flow.',
      [
        ['先求体积流量 A·V = 0.065 × 52 = 3.38 m³/s。', 'Find volume flow first: A·V = 0.065 × 52 = 3.38 m³/s.'],
        ['代入 ṁ = ρAV = 1.18 × 3.38。', 'Substitute ṁ = ρAV = 1.18 × 3.38.'],
      ],
      '质量流量约为 3.99 kg/s。真实三维底板存在边界层、泄漏和回流，“平均面积×平均速度”必须由完整流场检查。',
      'Mass flow is about 3.99 kg/s. A real 3D floor has boundary layers, leakage and recirculation, so average area times average speed needs full-field validation.',
    ),
    ex(
      '教学性流线估算中，底板入口平均速度为 32 m/s，喉部平均速度为 48 m/s，空气密度 1.18 kg/m³，并暂时忽略高度势能、粘性损失和风扇功输入。求喉部相对入口的静压变化。',
      'In an educational streamline estimate, floor-entry speed is 32 m/s, throat speed is 48 m/s and air density is 1.18 kg/m³. Elevation, viscous loss and fan work are temporarily neglected. Find the throat static-pressure change.',
      [
        ['由 p1 + ½ρV1² ≈ p2 + ½ρV2²，得到 p2 − p1 ≈ ½ρ(V1² − V2²)。', 'From p1 + ½ρV1² ≈ p2 + ½ρV2², obtain p2 − p1 ≈ ½ρ(V1² − V2²).'],
        ['代入 0.5 × 1.18 × (32² − 48²) = 0.59 × (1024 − 2304)。', 'Substitute 0.5 × 1.18 × (32² − 48²) = 0.59 × (1024 − 2304).'],
      ],
      '喉部静压相对入口约降低 755 Pa。该结果不是底板下压力预测；真实压力恢复和分离必须使用粘性 CFD 或试验。',
      'Throat static pressure is about 755 Pa below the entry value. This is not a floor-downforce prediction; viscous CFD or testing is required for recovery and separation.',
    ),
    ex(
      '移动地面风洞中，自由来流静压为 101325 Pa、速度为 160 km/h，底板局部压力测得 98400 Pa，空气密度为 1.18 kg/m³。计算局部压力系数。',
      'In a moving-ground tunnel, freestream static pressure is 101325 Pa at 160 km/h, local floor pressure is 98400 Pa and air density is 1.18 kg/m³. Calculate local pressure coefficient.',
      [
        ['速度换算为 44.44 m/s，动压 q∞ = 0.5 × 1.18 × 44.44² = 1165.4 Pa。', 'Convert speed to 44.44 m/s; q∞ = 0.5 × 1.18 × 44.44² = 1165.4 Pa.'],
        ['压差 p − p∞ = 98400 − 101325 = −2925 Pa。', 'Pressure difference p − p∞ = 98400 − 101325 = −2925 Pa.'],
        ['Cp = −2925 ÷ 1165.4。', 'Cp = −2925 ÷ 1165.4.'],
      ],
      '局部 Cp 约为 −2.51，表示强吸力区。仍需积分整个表面压力并检查测点、管路动态响应和分离，才能得到载荷。',
      'Local Cp is about −2.51, indicating strong suction. Surface integration plus tap, tubing-response and separation checks are still needed to obtain load.',
    ),
  ],
  nose: [
    ex(
      '冲击吸能器台架采用含驾驶员等效质量 300 kg，并按 7.0 m/s 的入射速度进行初步能量核算。求试验开始时需要管理的平动动能。',
      'An impact-attenuator rig uses a 300 kg driver-inclusive equivalent mass and a 7.0 m/s impact speed. Find the translational kinetic energy that must be managed.',
      [
        ['速度已经是 SI 单位，V² = 7.0² = 49 m²/s²。', 'Speed is already in SI units: V² = 7.0² = 49 m²/s².'],
        ['Ek = 0.5 × 300 × 49。', 'Ek = 0.5 × 300 × 49.'],
      ],
      '初始动能为 7350 J。吸能器、反撞结构和残余车辆结构必须共同管理能量与峰值载荷，不能把全部任务归给一个部件。',
      'Initial kinetic energy is 7350 J. The attenuator, anti-intrusion structure and remaining vehicle structure jointly manage energy and peak load.',
    ),
    ex(
      '一次准静态压溃试验记录四个力—位移点：(0 mm, 0 kN)、(80 mm, 45 kN)、(220 mm, 38 kN)、(350 mm, 30 kN)。用梯形积分估算吸收能量。',
      'A quasi-static crush test records four force-displacement points: (0 mm, 0 kN), (80 mm, 45 kN), (220 mm, 38 kN) and (350 mm, 30 kN). Estimate absorbed energy by trapezoidal integration.',
      [
        ['0–80 mm：E1 = (0 + 45)/2 × 0.08 = 1.80 kJ。', '0–80 mm: E1 = (0 + 45)/2 × 0.08 = 1.80 kJ.'],
        ['80–220 mm：E2 = (45 + 38)/2 × 0.14 = 5.81 kJ。', '80–220 mm: E2 = (45 + 38)/2 × 0.14 = 5.81 kJ.'],
        ['220–350 mm：E3 = (38 + 30)/2 × 0.13 = 4.42 kJ；总能量为三段之和。', '220–350 mm: E3 = (38 + 30)/2 × 0.13 = 4.42 kJ; sum all three segments.'],
      ],
      '梯形积分得到约 12.03 kJ。正式结论还需使用高采样率原始曲线、扣除夹具顺从，并核对动态试验中的应变率效应。',
      'Trapezoidal integration gives about 12.03 kJ. Formal results require high-rate raw data, fixture-compliance correction and strain-rate comparison with dynamic testing.',
    ),
    ex(
      '设计评审用 300 kg 等效质量、7350 J 需要吸收的能量和 0.42 m 有效受控压溃行程，估算全行程平均减速度。',
      'A design review uses a 300 kg equivalent mass, 7350 J to absorb and 0.42 m of effective controlled crush stroke to estimate full-stroke mean deceleration.',
      [
        ['平均阻力 Favg = Eabs ÷ s = 7350 ÷ 0.42 = 17500 N。', 'Mean resisting force Favg = Eabs ÷ s = 7350 ÷ 0.42 = 17500 N.'],
        ['平均减速度 ā = Favg ÷ m = 17500 ÷ 300 = 58.33 m/s²。', 'Mean deceleration ā = Favg ÷ m = 17500 ÷ 300 = 58.33 m/s².'],
        ['换算为重力加速度倍数：58.33 ÷ 9.81 = 5.95 g。', 'Convert to g: 58.33 ÷ 9.81 = 5.95 g.'],
      ],
      '平均减速度约为 58.3 m/s²，即 5.95 g。平均值不能揭示危险的初始峰值，仍需检查完整加速度—时间曲线。',
      'Mean deceleration is about 58.3 m/s² or 5.95 g. The mean hides potentially dangerous initial peaks, so the complete acceleration-time trace remains essential.',
    ),
  ],
  monocoque: [
    ex(
      '车架扭转台架向前后轴之间施加 1200 N·m 扭矩，测得两个参考截面的相对扭转角为 0.38°。计算单体壳的等效扭转刚度。',
      'A chassis torsion rig applies 1200 N·m between axles and measures 0.38° relative twist between reference sections. Calculate effective torsional stiffness.',
      [
        ['角度换算：θ = 0.38 × π/180 = 0.006632 rad。', 'Convert angle: θ = 0.38 × π/180 = 0.006632 rad.'],
        ['Kt = 1200 ÷ 0.006632 = 180940 N·m/rad。', 'Kt = 1200 ÷ 0.006632 = 180940 N·m/rad.'],
        ['按常见台架表达，也可直接计算 1200 ÷ 0.38 = 3158 N·m/deg。', 'For common rig reporting, 1200 ÷ 0.38 = 3158 N·m/deg.'],
      ],
      '等效扭转刚度约为 181 kN·m/rad，即 3.16 kN·m/deg。报告必须写明夹具、支承和测角基线，否则不同测试不可直接比较。',
      'Effective torsional stiffness is about 181 kN·m/rad or 3.16 kN·m/deg. Fixture, support and angle baseline must be documented for comparisons.',
    ),
    ex(
      '单体壳局部梁段在一个规则载荷工况下承受 2.8 kN·m 弯矩，中性轴到检查点距离 0.16 m，等效截面二次矩为 6.4×10⁻⁵ m⁴。先做线弹性名义应力初算。',
      'A local monocoque beam section carries 2.8 kN·m in a rule load case. Distance from neutral axis to the check point is 0.16 m and equivalent second moment is 6.4×10⁻⁵ m⁴. Make a linear-elastic nominal-stress estimate.',
      [
        ['弯矩换算：M = 2.8 kN·m = 2800 N·m。', 'Convert moment: M = 2.8 kN·m = 2800 N·m.'],
        ['σ = My/I = 2800 × 0.16 ÷ 6.4×10⁻⁵。', 'σ = My/I = 2800 × 0.16 ÷ 6.4×10⁻⁵.'],
      ],
      '名义弯曲应力约为 7.0 MPa。复合材料单体壳还要逐层检查纤维方向、芯材剪切、脱粘、孔边和连接载荷，不能用这一数值定案。',
      'Nominal bending stress is about 7.0 MPa. A composite monocoque still needs ply, core shear, debond, hole-edge and joint checks; this scalar cannot close the design.',
    ),
    ex(
      '代表性材料试样和环境折减后，某局部失效模式的设计许用值为 120 MPa；有限元在同一失效指标下给出 68 MPa 等效应用值。计算该模式的初步安全系数。',
      'After representative coupon testing and environmental knock-downs, the design allowable for one local failure mode is 120 MPa; FEA gives 68 MPa applied value using the same failure measure. Calculate preliminary factor of safety.',
      [
        ['确认许用值与应用值使用相同单位、材料方向和失效定义。', 'Confirm allowable and applied values use the same units, material direction and failure definition.'],
        ['n = 120 ÷ 68 = 1.7647。', 'n = 120 ÷ 68 = 1.7647.'],
      ],
      '该失效模式的安全系数约为 1.76。它不覆盖其他铺层方向、屈曲、连接或损伤容限，不能写成“整个单体壳安全系数”。',
      'Factor of safety for this failure mode is about 1.76. It does not cover other ply directions, buckling, joints or damage tolerance and is not a whole-monocoque factor.',
    ),
  ],
  halo: [
    ex(
      '防滚结构的一根支撑在规则载荷路径初算中承受 75 kN 轴向压缩，有效承载截面积为 420 mm²。求忽略弯曲和应力集中的名义压应力。',
      'A roll-structure brace carries 75 kN axial compression in a preliminary rule-load path, with 420 mm² effective load area. Find nominal compressive stress before bending and concentration effects.',
      [
        ['单位换算：F = 75000 N，A = 420×10⁻⁶ m²。', 'Convert units: F = 75000 N and A = 420×10⁻⁶ m².'],
        ['σ = F/A = 75000 ÷ 420×10⁻⁶。', 'σ = F/A = 75000 ÷ 420×10⁻⁶.'],
      ],
      '名义压应力约为 178.6 MPa。焊趾、管端、偏心、弯曲和局部屈曲会产生更高局部需求，必须另行验证。',
      'Nominal compressive stress is about 178.6 MPa. Weld toes, tube ends, eccentricity, bending and local buckling create higher local demands and need separate validation.',
    ),
    ex(
      '一根理想化直支撑采用 E = 210 GPa、截面二次矩 I = 1.8×10⁻⁸ m⁴、实际长度 L = 0.62 m；两端约束对应初算有效长度系数 K = 0.70。估算欧拉临界载荷。',
      'An idealised straight brace has E = 210 GPa, I = 1.8×10⁻⁸ m⁴, actual length L = 0.62 m and preliminary effective-length factor K = 0.70. Estimate Euler critical load.',
      [
        ['有效长度 KL = 0.70 × 0.62 = 0.434 m。', 'Effective length KL = 0.70 × 0.62 = 0.434 m.'],
        ['Pcr = π² × 210×10⁹ × 1.8×10⁻⁸ ÷ 0.434²。', 'Pcr = π² × 210×10⁹ × 1.8×10⁻⁸ ÷ 0.434².'],
      ],
      '理想欧拉载荷约为 198 kN。真实结构需考虑初始弯曲、焊接残余应力、连接柔度、非弹性屈曲和规范折减。',
      'Ideal Euler load is about 198 kN. Real validation must include initial crookedness, weld residual stress, joint flexibility, inelastic buckling and rule knock-downs.',
    ),
    ex(
      '规则载荷组合下，包含材料与连接折减后的许用载荷为 140 kN，分析得到最大应用载荷 96 kN。计算安全裕量。',
      'Under a rule load combination, allowable load after material and joint knock-downs is 140 kN and maximum applied load is 96 kN. Calculate margin of safety.',
      [
        ['载荷比 allowable/applied = 140 ÷ 96 = 1.4583。', 'Allowable-to-applied ratio = 140 ÷ 96 = 1.4583.'],
        ['MoS = 1.4583 − 1 = 0.4583。', 'MoS = 1.4583 − 1 = 0.4583.'],
      ],
      '安全裕量约为 +0.46，即该单一校核中许用值比需求高约 46%。仍需同时满足变形、生存空间和所有规定载荷方向。',
      'Margin of safety is about +0.46, meaning roughly 46% capacity above demand for this check only. Deformation, survival space and every prescribed load direction still apply.',
    ),
  ],
  tires: [
    ex(
      '出弯加速数据中，轮胎有效滚动半径为 0.230 m，车轮角速度为 118 rad/s，轮心纵向速度为 25.0 m/s。按“驱动为正”的约定计算纵向滑移率。',
      'Corner-exit data gives an effective rolling radius of 0.230 m, wheel angular speed of 118 rad/s and wheel-centre longitudinal speed of 25.0 m/s. Calculate longitudinal slip using drive-positive convention.',
      [
        ['轮胎圆周速度 Rω = 0.230 × 118 = 27.14 m/s。', 'Tyre circumferential speed Rω = 0.230 × 118 = 27.14 m/s.'],
        ['分母取 max(|27.14|, |25.0|) = 27.14 m/s。', 'Denominator is max(|27.14|, |25.0|) = 27.14 m/s.'],
        ['κ = (27.14 − 25.0) ÷ 27.14 = 0.0789。', 'κ = (27.14 − 25.0) ÷ 27.14 = 0.0789.'],
      ],
      '纵向滑移率约为 +7.9%。是否接近最佳牵引点必须查该轮胎在当前载荷、温度、压力和路面下的试验数据。',
      'Longitudinal slip is about +7.9%. Whether it is near peak traction depends on tyre data at the current load, temperature, pressure and surface.',
    ),
    ex(
      '高速稳态弯中，车体坐标系下轮心速度分量为 Vx = 28.0 m/s、Vy = 1.70 m/s，车轮相对车体转角 δ = 2.00°。采用 α = atan2(Vy,|Vx|) − δ 的符号约定计算侧偏角。',
      'In a high-speed steady corner, wheel-centre velocity components in vehicle axes are Vx = 28.0 m/s and Vy = 1.70 m/s, with road-wheel heading δ = 2.00° relative to the body. Use α = atan2(Vy,|Vx|) − δ.',
      [
        ['速度方向角 atan2(1.70, 28.0) = 0.06064 rad = 3.475°。', 'Velocity direction atan2(1.70, 28.0) = 0.06064 rad = 3.475°.'],
        ['α = 3.475° − 2.000° = 1.475°。', 'α = 3.475° − 2.000° = 1.475°.'],
      ],
      '按本页约定，侧偏角约为 +1.48°。不同轮胎模型常采用相反符号，导入数据前必须统一坐标轴、转角和侧向速度定义。',
      'Slip angle is about +1.48° under this page convention. Tyre models often use the opposite sign, so axes, steer and lateral-velocity definitions must be aligned before import.',
    ),
    ex(
      '制动入弯的某个外侧轮胎承受 Fx = 1200 N、Fy = 1500 N；该载荷与工况下的纯纵向峰值为 1800 N、纯横向峰值为 2100 N。用教学摩擦椭圆检查组合利用率。',
      'During trail braking, an outside tyre carries Fx = 1200 N and Fy = 1500 N. Pure longitudinal and lateral peaks at this condition are 1800 N and 2100 N. Check combined utilisation with the teaching friction ellipse.',
      [
        ['纵向归一项平方：(1200/1800)² = 0.4444。', 'Squared longitudinal term: (1200/1800)² = 0.4444.'],
        ['横向归一项平方：(1500/2100)² = 0.5102。', 'Squared lateral term: (1500/2100)² = 0.5102.'],
        ['两项之和为 0.9546，径向利用率为 √0.9546 = 0.977。', 'The sum is 0.9546 and radial utilisation is √0.9546 = 0.977.'],
      ],
      '该简化椭圆下利用率约为 97.7%，只剩约 2.3% 径向裕量。真实联合滑移边界通常不对称，必须使用轮胎台数据。',
      'Utilisation is about 97.7%, leaving roughly 2.3% radial margin in this simplified ellipse. Real combined-slip limits are usually asymmetric and require rig data.',
    ),
  ],
  brakes: [
    ex(
      '制动踏板力传感器记录 420 N，踏板机械比为 5.2:1，前回路主缸有效面积为 285 mm²。忽略摩擦和柔度，估算前回路液压压力。',
      'The brake-pedal load cell records 420 N, pedal mechanical ratio is 5.2:1 and the front master-cylinder effective area is 285 mm². Neglect friction and compliance to estimate line pressure.',
      [
        ['主缸推杆力 = 420 × 5.2 = 2184 N。', 'Master-cylinder pushrod force = 420 × 5.2 = 2184 N.'],
        ['面积换算：Am = 285×10⁻⁶ m²。', 'Convert area: Am = 285×10⁻⁶ m².'],
        ['p = 2184 ÷ 285×10⁻⁶ = 7.66×10⁶ Pa。', 'p = 2184 ÷ 285×10⁻⁶ = 7.66×10⁶ Pa.'],
      ],
      '理想液压压力约为 7.66 MPa，即 76.6 bar。实际踏板力—压力关系还包含平衡杆、密封摩擦、软管膨胀和踏板结构柔度。',
      'Ideal line pressure is about 7.66 MPa or 76.6 bar. Real pedal-force response also includes balance bar, seal friction, hose expansion and pedal-box compliance.',
    ),
    ex(
      '前制动器在一次台架点使用摩擦系数 0.44、液压压力 7.66 MPa、单侧受压活塞总面积 2400 mm²、有效摩擦半径 0.105 m；固定卡钳两侧摩擦面取 N = 2。',
      'At one front-brake dyno point, pad friction coefficient is 0.44, pressure 7.66 MPa, loaded piston area on one side 2400 mm² and effective radius 0.105 m; use N = 2 for both faces of the fixed caliper.',
      [
        ['面积换算 Ap = 2400×10⁻⁶ = 0.0024 m²。', 'Convert area: Ap = 2400×10⁻⁶ = 0.0024 m².'],
        ['单侧液压力 pAp = 7.66×10⁶ × 0.0024 = 18384 N。', 'One-side hydraulic force pAp = 7.66×10⁶ × 0.0024 = 18384 N.'],
        ['Tb = 0.44 × 18384 × 0.105 × 2。', 'Tb = 0.44 × 18384 × 0.105 × 2.'],
      ],
      '理论制动矩约为 1699 N·m。Ap 和 N 的定义必须与卡钳结构一致；摩擦系数还会随温度、压力、速度和磨合状态改变。',
      'Theoretical brake torque is about 1699 N·m. Definitions of Ap and N must match the caliper architecture, while friction varies with temperature, pressure, speed and bedding.',
    ),
    ex(
      '质量 300 kg 的赛车在一个制动区由 32 m/s 降到 12 m/s。暂不计空气阻力、滚阻和再生制动，估算摩擦制动系统需要处理的动能差。',
      'A 300 kg race car slows from 32 m/s to 12 m/s in one braking zone. Neglect aero drag, rolling resistance and regeneration to estimate kinetic energy handled by friction brakes.',
      [
        ['速度平方差 V1² − V2² = 32² − 12² = 1024 − 144 = 880 m²/s²。', 'Squared-speed difference is 32² − 12² = 1024 − 144 = 880 m²/s².'],
        ['E = 0.5 × 300 × 880。', 'E = 0.5 × 300 × 880.'],
      ],
      '动能差为 132 kJ。各制动盘分到的热量取决于动态轴荷、制动平衡、轮胎极限、空气阻力和再生制动，不能简单四等分。',
      'Kinetic-energy difference is 132 kJ. Heat per disc depends on dynamic axle load, brake balance, tyre limit, aero drag and regeneration, so it is not simply divided by four.',
    ),
  ],
  'front-suspension': [
    ex(
      '前悬架弹簧刚度为 80 N/mm。在设计车高附近，测得“弹簧位移/轮端位移”运动比 MR = 0.72。估算该位置的线性轮端刚度。',
      'Front spring rate is 80 N/mm. Near design ride height, the spring-travel to wheel-travel motion ratio is MR = 0.72. Estimate local linear wheel rate.',
      [
        ['运动比平方 MR² = 0.72² = 0.5184。', 'Square the motion ratio: MR² = 0.72² = 0.5184.'],
        ['kw = 80 × 0.5184 = 41.472 N/mm。', 'kw = 80 × 0.5184 = 41.472 N/mm.'],
      ],
      '局部轮端刚度约为 41.5 N/mm。实际轮端刚度还应加入轮胎、连杆/车架柔度，并沿完整行程重新计算变化的运动比。',
      'Local wheel rate is about 41.5 N/mm. Real wheel-centre stiffness also includes tyre and link/chassis compliance and the changing motion ratio through travel.',
    ),
    ex(
      '沿用 41.472 N/mm 的轮端刚度，某前轮支承的簧载质量为 68 kg。忽略轮胎刚度、空气动力刚度、耦合和阻尼，估算单自由度固有频率。',
      'Using a wheel rate of 41.472 N/mm and 68 kg supported sprung mass at one front corner, estimate single-degree-of-freedom natural frequency while neglecting tyre, aero stiffness, coupling and damping.',
      [
        ['单位换算 kw = 41.472 N/mm = 41472 N/m。', 'Convert kw = 41.472 N/mm = 41472 N/m.'],
        ['√(kw/ms) = √(41472/68) = 24.696 rad/s。', '√(kw/ms) = √(41472/68) = 24.696 rad/s.'],
        ['fn = 24.696 ÷ 2π = 3.93 Hz。', 'fn = 24.696 ÷ 2π = 3.93 Hz.'],
      ],
      '该局部单自由度频率约为 3.93 Hz。整车的升沉、俯仰和滚转模态需要质量矩阵、四角刚度和气动耦合模型。',
      'Local SDOF frequency is about 3.93 Hz. Whole-car heave, pitch and roll modes require mass matrix, four-corner stiffness and aero coupling.',
    ),
    ex(
      '减振器台架和运动比换算得到设计车高附近的等效轮端阻尼 c = 2400 N·s/m；轮端刚度 41472 N/m，支承簧载质量 68 kg。估算局部线性阻尼比。',
      'Damper-rig data transformed through motion ratio gives local equivalent wheel damping c = 2400 N·s/m, with wheel rate 41472 N/m and supported sprung mass 68 kg. Estimate local linear damping ratio.',
      [
        ['临界阻尼 ccrit = 2√(kw·ms) = 2√(41472 × 68) = 3358.6 N·s/m。', 'Critical damping ccrit = 2√(kw·ms) = 2√(41472 × 68) = 3358.6 N·s/m.'],
        ['ζ = 2400 ÷ 3358.6 = 0.7145。', 'ζ = 2400 ÷ 3358.6 = 0.7145.'],
      ],
      '该速度点附近的线性阻尼比约为 0.71。真实减振器压缩/回弹不对称并随速度、温度和行程变化，不能用一个 ζ 覆盖全图。',
      'Local linear damping ratio is about 0.71. A real damper is asymmetric and varies with speed, temperature and travel, so one ζ cannot describe its full map.',
    ),
  ],
  'rear-suspension': [
    ex(
      '后悬架采用 95 N/mm 弹簧，设计车高处的“弹簧位移/轮端位移”运动比为 0.68。计算这一位置的轮端刚度。',
      'Rear suspension uses a 95 N/mm spring and a spring-travel to wheel-travel motion ratio of 0.68 at design ride height. Calculate local wheel rate.',
      [
        ['MR² = 0.68² = 0.4624。', 'MR² = 0.68² = 0.4624.'],
        ['kw = 95 × 0.4624 = 43.928 N/mm。', 'kw = 95 × 0.4624 = 43.928 N/mm.'],
      ],
      '后轮局部轮端刚度约为 43.9 N/mm。推杆、摇臂和弹簧安装几何会让 MR 随轮跳变化，因此应绘制完整 wheel-rate 曲线。',
      'Local rear wheel rate is about 43.9 N/mm. Pushrod, rocker and spring geometry vary MR with wheel travel, so the full wheel-rate curve is required.',
    ),
    ex(
      '等效簧载质量 300 kg 的赛车以 1.80 g 横向加速度转弯，簧载重心到滚转轴的等效力臂为 0.28 m，后轮距为 1.20 m；后轴占总弹性滚转刚度 46%。估算后轴弹性横向载荷转移。',
      'A car with 300 kg effective sprung mass corners at 1.80 g; the effective sprung-CG-to-roll-axis arm is 0.28 m, rear track is 1.20 m, and the rear axle carries 46% of total elastic roll stiffness. Estimate rear elastic lateral load transfer.',
      [
        ['ay = 1.80 × 9.81 = 17.658 m/s²。', 'ay = 1.80 × 9.81 = 17.658 m/s².'],
        ['简化总弹性项 ms·ay·hr/tr = 300 × 17.658 × 0.28 ÷ 1.20 = 1236.1 N。', 'Simplified total elastic term ms·ay·hr/tr = 300 × 17.658 × 0.28 ÷ 1.20 = 1236.1 N.'],
        ['后轴份额 = 0.46 × 1236.1 = 568.6 N。', 'Rear share = 0.46 × 1236.1 = 568.6 N.'],
      ],
      '后轴弹性载荷转移约为 569 N。真实总载荷转移还含前后不同轮距、几何滚心、簧下质量和轮胎柔度，不能遗漏。',
      'Rear elastic load transfer is about 569 N. Real total transfer also includes different tracks, geometric roll-centre terms, unsprung mass and tyre compliance.',
    ),
    ex(
      '耐久赛数据中，一根半轴传递 410 N·m 扭矩并以 5200 rpm 旋转。求该时刻通过半轴的机械功率。',
      'During endurance, one half-shaft transmits 410 N·m at 5200 rpm. Find instantaneous mechanical power through the shaft.',
      [
        ['角速度 ω = 5200 × 2π/60 = 544.54 rad/s。', 'Angular speed ω = 5200 × 2π/60 = 544.54 rad/s.'],
        ['P = 410 × 544.54 = 223261 W。', 'P = 410 × 544.54 = 223261 W.'],
      ],
      '半轴机械功率约为 223 kW。高瞬时功率不代表持续热负荷；花键、等速节和轴承设计还需扭矩循环、角度和冲击谱。',
      'Half-shaft mechanical power is about 223 kW. High instantaneous power is not continuous thermal load; splines, CV joints and bearings require torque cycles, angle and shock spectra.',
    ),
  ],
  steering: [
    ex(
      '赛车轴距 L = 1.60 m、前轮距 t = 1.20 m。低速几何检查时内轮转角 δi = 24.0°，用理想阿克曼关系求外轮目标转角。',
      'The car has wheelbase L = 1.60 m and front track t = 1.20 m. In a low-speed geometry check the inner wheel angle δi is 24.0°. Use ideal Ackermann relation to find outer angle.',
      [
        ['t/L = 1.20/1.60 = 0.75。', 't/L = 1.20/1.60 = 0.75.'],
        ['cot(δo) = cot(24°) + 0.75 = 2.246 + 0.75 = 2.996。', 'cot(δo) = cot(24°) + 0.75 = 2.246 + 0.75 = 2.996.'],
        ['δo = arctan(1/2.996) = 18.46°。', 'δo = arctan(1/2.996) = 18.46°.'],
      ],
      '理想无侧偏外轮角约为 18.5°。高速赛车最优转角差还取决于轮胎载荷敏感性、顺从转向和目标侧偏角。',
      'Ideal zero-slip outer angle is about 18.5°. High-speed optimum also depends on tyre load sensitivity, compliance steer and target slip angles.',
    ),
    ex(
      '方向盘从中位转过 220°时，左右前轮平均转角变化为 18.0°。计算这一工作区间的平均转向比。',
      'When the steering wheel turns 220° from centre, the average front road-wheel angle changes by 18.0°. Calculate average steering ratio over this range.',
      [
        ['保持角度单位一致，is = Δθwheel/Δδroadwheel。', 'Keep angular units consistent: is = Δθwheel/Δδroadwheel.'],
        ['is = 220 ÷ 18.0 = 12.22。', 'is = 220 ÷ 18.0 = 12.22.'],
      ],
      '平均转向比约为 12.2:1。非线性齿条或转向臂会使瞬时转向比随行程改变，因此还应绘制角度—齿条—轮角曲线。',
      'Average steering ratio is about 12.2:1. Nonlinear rack or steering arms vary instantaneous ratio, so wheel-angle versus rack-travel mapping is still needed.',
    ),
    ex(
      '转向台架在一个工况测得齿条轴向力 3200 N，小齿轮节圆半径 12 mm。忽略啮合损失，估算小齿轮轴所需扭矩。',
      'A steering rig measures 3200 N axial rack force at one condition; pinion pitch radius is 12 mm. Neglect mesh loss and estimate required pinion-shaft torque.',
      [
        ['半径换算 rp = 12 mm = 0.012 m。', 'Convert radius: rp = 12 mm = 0.012 m.'],
        ['Tpinion ≈ 3200 × 0.012 = 38.4 N·m。', 'Tpinion ≈ 3200 × 0.012 = 38.4 N·m.'],
      ],
      '小齿轮扭矩约为 38.4 N·m。驾驶员方向盘力矩还要经过转向柱传动比与效率，并叠加密封、轴承和齿条摩擦。',
      'Pinion torque is about 38.4 N·m. Driver steering-wheel torque also depends on column ratio and efficiency plus seal, bearing and rack friction.',
    ),
  ],
  battery: [
    ex(
      '耐久赛前的能量预算试跑中，高压母线在一个 240 s 加速与高速混合区段内平均电压为 352 V、平均放电电流为 85 A。用母线积分法估算该区段从电池取出的电能。',
      'During a pre-endurance energy-budget run, the high-voltage bus averages 352 V and 85 A discharge over a 240 s mixed acceleration/high-speed segment. Estimate the energy drawn from the battery by bus integration.',
      [
        ['该区段平均电功率 P = VI = 352 × 85 = 29,920 W。', 'Mean electrical power is P = VI = 352 × 85 = 29,920 W.'],
        ['能量 E = PΔt = 29,920 × 240 = 7,180,800 J。', 'Energy is E = PΔt = 29,920 × 240 = 7,180,800 J.'],
        ['换算为千瓦时：E = 7,180,800 ÷ 3,600,000 = 1.995 kWh。', 'Convert to kilowatt-hours: E = 7,180,800 ÷ 3,600,000 = 1.995 kWh.'],
      ],
      '该区段约消耗 2.00 kWh 的母线电能。正负号必须与“放电为正或充电为正”的约定一致；母线能量也不等于电芯化学能变化，还需考虑接触器、母排和电池内损耗。',
      'The segment draws about 2.00 kWh at the DC bus. The sign must follow the chosen charge/discharge convention; bus energy is not identical to cell chemical-energy change because contactor, busbar and internal losses remain.',
    ),
    ex(
      '赛车出站时估算荷电状态为 82%，电池可用额定容量为 40 Ah。随后以等效平均放电电流 60 A 行驶 12 min，忽略该短区段内的容量温度修正，计算新的荷电状态。',
      'The car leaves the garage at an estimated 82% state of charge with 40 Ah usable rated capacity. It then runs for 12 min at an equivalent mean discharge current of 60 A; neglect the short-segment temperature correction and calculate the new SOC.',
      [
        ['时间必须与 Ah 的小时单位一致：12 min = 0.20 h。', 'Time must match the hour in Ah: 12 min = 0.20 h.'],
        ['放出电量 ΔQ = IΔt = 60 × 0.20 = 12 Ah。', 'Discharged capacity is ΔQ = IΔt = 60 × 0.20 = 12 Ah.'],
        ['SOC 下降量 = 12 ÷ 40 = 0.30，因此 SOC = 0.82 − 0.30 = 0.52。', 'SOC decrease is 12 ÷ 40 = 0.30, hence SOC = 0.82 − 0.30 = 0.52.'],
      ],
      '库仑计数得到约 52% SOC。若电流以安培、时间以秒积分，必须再除以 3600 才能与 Ah 相容；实际 BMS 还要校正电流偏置、库仑效率、温度和可用容量漂移。',
      'Coulomb counting gives about 52% SOC. If current is integrated in amperes over seconds, divide by 3600 for Ah consistency; a real BMS also corrects current offset, coulombic efficiency, temperature and usable-capacity drift.',
    ),
    ex(
      '排位赛一次 180 A 的持续加速段中，电池包在当时温度和 SOC 下辨识出的等效直流内阻为 35 mΩ。先估算电池包的不可逆欧姆发热率。',
      'During a 180 A sustained qualifying acceleration, the pack equivalent DC resistance identified at the current temperature and SOC is 35 mΩ. First estimate the pack irreversible ohmic heat rate.',
      [
        ['内阻换算 Rint = 35 mΩ = 0.035 Ω。', 'Convert resistance: Rint = 35 mΩ = 0.035 Ω.'],
        ['欧姆热率 Q̇ohmic = I²Rint = 180² × 0.035 = 1134 W。', 'Ohmic heat rate is Q̇ohmic = I²Rint = 180² × 0.035 = 1134 W.'],
      ],
      '该工况的欧姆发热约为 1.13 kW，但这不是电池总发热。完整热模型还应包含可逆熵热、反应极化、母排与连接件损耗，并使用随温度、SOC 和频率变化的参数。',
      'Ohmic heating is about 1.13 kW, but it is not total battery heat. A complete thermal model also includes reversible entropic heat, reaction polarization, busbar and interconnect losses, with temperature-, SOC- and frequency-dependent parameters.',
    ),
  ],
  inverter: [
    ex(
      '测功机标定点上，逆变器直流侧从电池吸收 96.0 kW，三相交流侧向电机输出的基波有功功率为 91.2 kW。计算该点逆变效率与总损耗。',
      'At a dynamometer calibration point, the inverter draws 96.0 kW on the DC side and delivers 91.2 kW of fundamental three-phase active power to the motor. Calculate point efficiency and total loss.',
      [
        ['效率 ηinv = Pac/Pdc = 91.2 ÷ 96.0 = 0.950。', 'Efficiency is ηinv = Pac/Pdc = 91.2 ÷ 96.0 = 0.950.'],
        ['总损耗 Ploss = Pdc − Pac = 96.0 − 91.2 = 4.8 kW。', 'Total loss is Ploss = Pdc − Pac = 96.0 − 91.2 = 4.8 kW.'],
      ],
      '该标定点逆变效率为 95.0%，总损耗为 4.8 kW。效率图必须在一致的电压、电流、功率定义和稳态温度下测量，不能用一个峰值数字代表整个转速—扭矩平面。',
      'Point efficiency is 95.0% and total loss is 4.8 kW. An efficiency map requires consistent voltage, current and power definitions at stabilized temperature; one peak number cannot represent the full speed-torque plane.',
    ),
    ex(
      '器件数据在目标母线电压、电流、结温和栅极电阻条件下给出每次开通与关断能量之和 4.2 mJ。六个开关器件均按 12 kHz 开关，估算逆变器器件开关损耗。',
      'Device data at the target DC-link voltage, current, junction temperature and gate resistance gives 4.2 mJ combined turn-on plus turn-off energy per switching device and cycle. All six switches operate at 12 kHz; estimate device switching loss.',
      [
        ['单器件开关损耗 Psw,1 = fsw(Eon + Eoff) = 12,000 × 0.0042 = 50.4 W。', 'Per-device switching loss is Psw,1 = fsw(Eon + Eoff) = 12,000 × 0.0042 = 50.4 W.'],
        ['六器件合计 Psw = 6 × 50.4 = 302.4 W。', 'For six devices, Psw = 6 × 50.4 = 302.4 W.'],
      ],
      '粗估器件开关损耗约为 302 W。数据表能量必须按实际母线电压、电流、结温和栅极条件修正；若给的是半桥或模块每周期能量，则不能再次乘六。',
      'The rough device switching loss is about 302 W. Datasheet energy must be corrected for actual DC voltage, current, junction temperature and gate conditions; do not multiply by six again if the supplied energy already represents a bridge leg or module.',
    ),
    ex(
      '一台四对极永磁同步电机在直线末端达到 15,000 rpm。计算逆变器需要合成的定子基波电频率，并判断 12 kHz PWM 的频率比。',
      'A four-pole-pair permanent-magnet synchronous motor reaches 15,000 rpm at the end of a straight. Calculate the stator fundamental electrical frequency and the frequency ratio for 12 kHz PWM.',
      [
        ['机械转频 fm = nm/60 = 15,000/60 = 250 Hz。', 'Mechanical rotational frequency is fm = nm/60 = 15,000/60 = 250 Hz.'],
        ['电频率 fe = p·fm = 4 × 250 = 1000 Hz。', 'Electrical frequency is fe = p·fm = 4 × 250 = 1000 Hz.'],
        ['PWM 与基波频率比 = 12,000/1000 = 12。', 'PWM-to-fundamental frequency ratio is 12,000/1000 = 12.'],
      ],
      '该点基波电频率为 1.00 kHz，12 kHz PWM 仅为其 12 倍。电流采样、控制带宽、死区与调制裕度都必须在最高电频率处重新检查。',
      'The fundamental electrical frequency is 1.00 kHz and 12 kHz PWM is only 12 times higher. Current sampling, control bandwidth, dead time and modulation margin must all be checked at maximum electrical frequency.',
    ),
  ],
  motor: [
    ex(
      '电机台架在 6500 rpm 稳态点测得轴端扭矩 220 N·m。忽略这一计算中的瞬态储能，求轴端机械功率。',
      'A motor dynamometer records 220 N·m shaft torque at a steady 6500 rpm point. Neglect transient stored energy in this calculation and find shaft mechanical power.',
      [
        ['角速度 ω = 6500 × 2π/60 = 680.68 rad/s。', 'Angular speed is ω = 6500 × 2π/60 = 680.68 rad/s.'],
        ['轴功率 Pmech = Tω = 220 × 680.68 = 149,750 W。', 'Shaft power is Pmech = Tω = 220 × 680.68 = 149,750 W.'],
      ],
      '轴端机械功率约为 149.8 kW。它不等于电池功率；逆变器损耗、电机铜耗铁耗、机械损耗以及辅助负载都要单独计入。',
      'Shaft mechanical power is about 149.8 kW. It is not battery power; inverter loss, motor copper and iron loss, mechanical loss and auxiliary loads must be added separately.',
    ),
    ex(
      '低速出弯时电机输出 220 N·m，单级减速比为 3.70，传动机械效率取 0.96，等效驱动轮动态半径为 0.240 m。估算轮胎接地点总纵向驱动力。',
      'At low-speed corner exit the motor produces 220 N·m through a 3.70:1 reduction with 0.96 mechanical efficiency and 0.240 m effective driven-tyre rolling radius. Estimate total longitudinal force at the contact patches.',
      [
        ['驱动轮总扭矩 Tw = Tm·ig·η = 220 × 3.70 × 0.96 = 781.44 N·m。', 'Total driven-wheel torque is Tw = Tm·ig·η = 220 × 3.70 × 0.96 = 781.44 N·m.'],
        ['接地点力 Fx = Tw/R = 781.44 ÷ 0.240 = 3256 N。', 'Contact-patch force is Fx = Tw/R = 781.44 ÷ 0.240 = 3256 N.'],
      ],
      '理想传动得到约 3.26 kN 纵向驱动力；实际输出还受轮胎摩擦椭圆、法向载荷、差速器分配、滑移率和扭矩控制限制。',
      'Ideal driveline force is about 3.26 kN; actual force is limited by tyre friction ellipse, normal load, differential distribution, slip ratio and torque control.',
    ),
    ex(
      '热平衡试验中，三相电机每相 RMS 电流为 190 A，按当时绕组温度修正后的每相电阻为 18 mΩ。计算三相定子铜耗。',
      'During a thermal-balance test, each motor phase carries 190 A RMS and each phase resistance corrected to the current winding temperature is 18 mΩ. Calculate three-phase stator copper loss.',
      [
        ['每相铜耗 Pcu,phase = Irms²Rphase = 190² × 0.018 = 649.8 W。', 'Per-phase copper loss is Pcu,phase = Irms²Rphase = 190² × 0.018 = 649.8 W.'],
        ['三相总铜耗 Pcu = 3 × 649.8 = 1949.4 W。', 'Total three-phase copper loss is Pcu = 3 × 649.8 = 1949.4 W.'],
      ],
      '该点定子铜耗约为 1.95 kW。这里必须使用相电流 RMS 与相电阻，并把电阻修正到绕组温度；铁耗、磁体涡流、风阻和轴承损耗不在此式内。',
      'Stator copper loss is about 1.95 kW. Use phase RMS current and phase resistance corrected to winding temperature; iron loss, magnet eddy loss, windage and bearing loss are outside this equation.',
    ),
  ],
  differential: [
    ex(
      '举升检查中，差速器壳体以稳定速度旋转，测得左、右半轴角速度分别为 92 rad/s 和 116 rad/s。按开放式锥齿轮差速器运动学求壳体角速度。',
      'During a lifted-wheel check, the differential case rotates steadily while left and right half-shaft speeds are 92 rad/s and 116 rad/s. Use open bevel-differential kinematics to find case speed.',
      [
        ['理想对称差速器满足 ωc = (ωL + ωR)/2。', 'An ideal symmetric differential satisfies ωc = (ωL + ωR)/2.'],
        ['ωc = (92 + 116)/2 = 104 rad/s。', 'ωc = (92 + 116)/2 = 104 rad/s.'],
      ],
      '差速器壳体角速度为 104 rad/s。该关系是运动学约束，不说明左右扭矩；限滑机构、摩擦、预载和轮胎抓地决定扭矩分配。',
      'Differential case speed is 104 rad/s. This is a kinematic constraint, not a torque statement; limited-slip action, friction, preload and tyre grip determine torque distribution.',
    ),
    ex(
      '差速器台架逐步提高输入扭矩，在一个准稳态点测得高扭矩侧 540 N·m、低扭矩侧 300 N·m。计算该点的扭矩偏置比。',
      'A differential rig raises input torque gradually and records 540 N·m on the high-torque side and 300 N·m on the low-torque side at one quasi-steady point. Calculate point torque-bias ratio.',
      [
        ['按定义 TBR = Thigh/Tlow。', 'By definition, TBR = Thigh/Tlow.'],
        ['TBR = 540/300 = 1.80。', 'TBR = 540/300 = 1.80.'],
      ],
      '该点扭矩偏置比为 1.80。TBR 表示机构在给定工况下的传递能力，而不是所有弯道都固定保持的左右扭矩比；预载、速度差、油温和方向都会改变结果。',
      'Point torque-bias ratio is 1.80. TBR describes transfer capability under the test condition, not a fixed left-right ratio in every corner; preload, speed difference, oil temperature and direction change it.',
    ),
    ex(
      '扭矩矢量控制试验中，右后轮纵向力为 1900 N、左后轮为 1500 N，后轮距为 1.18 m。按“右侧驱动力更大产生正偏航矩”的约定计算附加偏航矩。',
      'In a torque-vectoring test, right-rear longitudinal force is 1900 N and left-rear force is 1500 N with 1.18 m rear track. With the convention that greater right-side drive produces positive yaw moment, calculate added yaw moment.',
      [
        ['左右纵向力差 ΔFx = Fx,R − Fx,L = 1900 − 1500 = 400 N。', 'Longitudinal force difference is ΔFx = Fx,R − Fx,L = 1900 − 1500 = 400 N.'],
        ['力臂为半轮距 t/2 = 1.18/2 = 0.59 m。', 'Moment arm is half-track t/2 = 1.18/2 = 0.59 m.'],
        ['Mz = ΔFx·t/2 = 400 × 0.59 = 236 N·m。', 'Mz = ΔFx·t/2 = 400 × 0.59 = 236 N·m.'],
      ],
      '附加偏航矩为 +236 N·m。符号取决于车体坐标约定；控制器还必须考虑轮胎合力极限、车速估计、横摆率反馈和故障降级。',
      'Added yaw moment is +236 N·m. The sign depends on the vehicle-coordinate convention; control must also account for tyre combined-force limits, speed estimation, yaw-rate feedback and fault degradation.',
    ),
  ],
  cooling: [
    ex(
      '连续高负荷试验中，冷却液质量流量稳定在 0.180 kg/s，测试温区内比热取 3600 J/(kg·K)，散热器入口与出口温差为 8.0 K。估算冷却液带走的热功率。',
      'During a continuous high-load test, coolant mass flow stabilizes at 0.180 kg/s, specific heat in the test range is 3600 J/(kg·K), and radiator inlet-to-outlet temperature drop is 8.0 K. Estimate heat carried by the coolant.',
      [
        ['Q̇ = ṁcpΔT = 0.180 × 3600 × 8.0。', 'Q̇ = ṁcpΔT = 0.180 × 3600 × 8.0.'],
        ['Q̇ = 5184 W = 5.184 kW。', 'Q̇ = 5184 W = 5.184 kW.'],
      ],
      '冷却液带走约 5.18 kW 热量。该稳态焓差法要求质量流量和温度传感器时间同步；瞬态时还要考虑冷却液、管路和部件自身储热。',
      'Coolant transports about 5.18 kW. This steady enthalpy-balance method requires synchronized mass-flow and temperature measurements; transients also include energy stored in coolant, plumbing and components.',
    ),
    ex(
      '热稳态台架上，功率模块结温估算值比冷却液参考温度高 34 K，同时模块向冷却回路传递 5.20 kW 热量。计算这两个明确测温节点之间的等效热阻。',
      'On a thermal steady-state rig, estimated power-module junction temperature is 34 K above a defined coolant reference temperature while 5.20 kW flows into the coolant loop. Calculate equivalent thermal resistance between those nodes.',
      [
        ['节点温差 ΔT = 34 K，热流 Q̇ = 5200 W。', 'Node temperature difference is ΔT = 34 K and heat flow is Q̇ = 5200 W.'],
        ['Rth = ΔT/Q̇ = 34/5200 = 0.00654 K/W。', 'Rth = ΔT/Q̇ = 34/5200 = 0.00654 K/W.'],
      ],
      '等效结至冷却液热阻约为 6.54 mK/W。热阻只有在起止温度节点、接触界面、流量和稳态条件明确时才可比较，不能跨不同参考点直接引用。',
      'Equivalent junction-to-coolant thermal resistance is about 6.54 mK/W. Thermal resistance is comparable only with defined temperature nodes, interfaces, flow and steady conditions; values with different references cannot be substituted directly.',
    ),
    ex(
      '冷却回路工作点的总压降为 42 kPa，体积流量为 14 L/min，泵在该点的液压效率取 0.55。估算泵轴端所需输入功率。',
      'At the cooling-loop operating point, total pressure drop is 42 kPa, volumetric flow is 14 L/min, and pump hydraulic efficiency is 0.55. Estimate required pump-shaft input power.',
      [
        ['流量换算 qv = 14 L/min = 14×10⁻³/60 = 2.333×10⁻⁴ m³/s。', 'Convert flow: qv = 14 L/min = 14×10⁻³/60 = 2.333×10⁻⁴ m³/s.'],
        ['液压功率 Ph = Δp·qv = 42,000 × 2.333×10⁻⁴ = 9.80 W。', 'Hydraulic power is Ph = Δp·qv = 42,000 × 2.333×10⁻⁴ = 9.80 W.'],
        ['泵轴输入 Ppump = Ph/ηpump = 9.80/0.55 = 17.8 W。', 'Pump-shaft input is Ppump = Ph/ηpump = 9.80/0.55 = 17.8 W.'],
      ],
      '所需泵轴输入功率约为 17.8 W。若要计算电池侧辅助功率，还需再除以电机和驱动器效率；同时必须用泵曲线与系统曲线的交点确定真实工作点。',
      'Required pump-shaft input is about 17.8 W. Battery-side auxiliary power also includes motor and drive efficiency, and the real operating point must come from the pump/system-curve intersection.',
    ),
  ],
  ecu: [
    ex(
      '轮速信号因齿圈和振动含有高频波动，上一采样滤波值为 52.0 km/h，本次原始值为 68.0 km/h，标定的一阶离散滤波系数 α = 0.18。计算新输出。',
      'A wheel-speed channel contains tooth-ring and vibration ripple. Previous filtered value is 52.0 km/h, the new raw sample is 68.0 km/h, and calibrated first-order discrete coefficient α is 0.18. Calculate the new output.',
      [
        ['新样本权重 αx = 0.18 × 68.0 = 12.24 km/h。', 'New-sample contribution is αx = 0.18 × 68.0 = 12.24 km/h.'],
        ['历史权重 (1−α)yₖ₋₁ = 0.82 × 52.0 = 42.64 km/h。', 'History contribution is (1−α)yₖ₋₁ = 0.82 × 52.0 = 42.64 km/h.'],
        ['yₖ = 12.24 + 42.64 = 54.88 km/h。', 'yₖ = 12.24 + 42.64 = 54.88 km/h.'],
      ],
      '滤波输出为 54.88 km/h。α 必须结合采样周期换算为物理截止频率；滤波带来的相位滞后会影响牵引力控制，不能只追求曲线平滑。',
      'Filtered output is 54.88 km/h. Alpha must be related to sample period and physical cutoff frequency; filter phase lag affects traction control, so visual smoothness alone is not the objective.',
    ),
    ex(
      '扭矩协调器当前输出 180 N·m，上层请求在 10 ms 周期内跳变到 230 N·m，正常增扭斜率上限为 400 N·m/s。计算本周期允许的输出。',
      'The torque coordinator currently outputs 180 N·m. The supervisory request jumps to 230 N·m over a 10 ms task period, with a normal positive slew limit of 400 N·m/s. Calculate this-cycle output.',
      [
        ['周期换算 Δt = 10 ms = 0.010 s。', 'Convert period: Δt = 10 ms = 0.010 s.'],
        ['单周期最大增量 rΔt = 400 × 0.010 = 4 N·m。', 'Maximum one-cycle increase is rΔt = 400 × 0.010 = 4 N·m.'],
        ['限幅后 Tcmd = min(230, 180 + 4) = 184 N·m。', 'After slew limiting, Tcmd = min(230, 180 + 4) = 184 N·m.'],
      ],
      '本周期输出应为 184 N·m。正常舒适性或抓地斜率限制不能阻止安全扭矩切断；急停、绝缘故障和踏板合理性故障应走更高优先级的降扭路径。',
      'This-cycle output is 184 N·m. A normal drivability/traction slew limit must not delay safety torque removal; shutdown, isolation and pedal-plausibility faults need a higher-priority reduction path.',
    ),
    ex(
      'ECU 周期任务测得最坏执行时间与周期分别为：轮速任务 0.8/5 ms、扭矩协调 1.4/10 ms、热管理 2.2/20 ms。计算处理器需求利用率。',
      'ECU periodic tasks have measured worst-case execution time/period pairs: wheel speed 0.8/5 ms, torque coordination 1.4/10 ms and thermal management 2.2/20 ms. Calculate processor demand utilization.',
      [
        ['轮速任务 C/T = 0.8/5 = 0.16。', 'Wheel-speed task C/T = 0.8/5 = 0.16.'],
        ['扭矩任务 C/T = 1.4/10 = 0.14；热管理任务 C/T = 2.2/20 = 0.11。', 'Torque task C/T = 1.4/10 = 0.14; thermal task C/T = 2.2/20 = 0.11.'],
        ['总需求 U = 0.16 + 0.14 + 0.11 = 0.41，即 41%。', 'Total demand U = 0.16 + 0.14 + 0.11 = 0.41, or 41%.'],
      ],
      '这三项周期任务占 41% 处理器需求，但 U < 1 不是可调度性的充分证明。仍需按调度策略检查截止期、优先级阻塞、中断、抖动、共享资源和最坏路径测量覆盖。',
      'These periodic tasks demand 41% processor utilization, but U < 1 is not sufficient proof of schedulability. Deadlines, priority blocking, interrupts, jitter, shared resources and worst-path measurement coverage must still be checked for the chosen scheduler.',
    ),
  ],
  sensors: [
    ex(
      '制动压力传感器台架两点标定为：0 bar 输出 0.18 V，100 bar 输出 4.68 V。一次赛道采样读数为 3.06 V，按线性模型 V = ax + b 求压力。',
      'A brake-pressure sensor rig gives two calibration points: 0 bar at 0.18 V and 100 bar at 4.68 V. A track sample reads 3.06 V; use linear model V = ax + b to find pressure.',
      [
        ['斜率 a = (4.68−0.18)/(100−0) = 0.045 V/bar，截距 b = 0.18 V。', 'Slope is a = (4.68−0.18)/(100−0) = 0.045 V/bar and intercept b = 0.18 V.'],
        ['x = (V−b)/a = (3.06−0.18)/0.045 = 64.0 bar。', 'x = (V−b)/a = (3.06−0.18)/0.045 = 64.0 bar.'],
      ],
      '该采样对应 64.0 bar。两点直线只校正增益和零点；正式标定还应检查迟滞、非线性、温漂、供电比率、超量程与传感器安装后的整链路误差。',
      'The sample corresponds to 64.0 bar. A two-point line corrects only gain and offset; production calibration also checks hysteresis, nonlinearity, thermal drift, ratiometric supply, over-range and installed-chain error.',
    ),
    ex(
      '悬架位移信号的有效机械频谱预计延伸到 180 Hz，数据采集器计划以 500 samples/s 采样。检查奈奎斯特必要条件并给出频率裕度。',
      'Suspension-displacement content is expected to extend to 180 Hz and the logger is configured for 500 samples/s. Check the Nyquist necessary condition and calculate frequency margin.',
      [
        ['奈奎斯特下限为 2fmax = 2 × 180 = 360 samples/s。', 'Nyquist lower bound is 2fmax = 2 × 180 = 360 samples/s.'],
        ['采样率裕度 fs − 2fmax = 500 − 360 = 140 samples/s。', 'Sampling-rate margin is fs − 2fmax = 500 − 360 = 140 samples/s.'],
        ['频率比 fs/fmax = 500/180 = 2.78。', 'Frequency ratio is fs/fmax = 500/180 = 2.78.'],
      ],
      '500 samples/s 满足理想奈奎斯特必要条件，裕度为 140 samples/s，但这并不自动防止混叠。模拟抗混叠滤波器需要现实的过渡带，采样时钟、传感器带宽和目标相位精度也要共同设计。',
      '500 samples/s satisfies the ideal Nyquist necessary condition with 140 samples/s margin, but this does not automatically prevent aliasing. The analog anti-alias filter needs a realizable transition band, and sensor bandwidth, sampling clock and phase-accuracy targets must be co-designed.',
    ),
    ex(
      '制动压力测量的不确定度预算中，已换算为相同单位的独立标准不确定度分别为：传感器标定 0.35 bar、采集量化与噪声 0.20 bar、温度修正 0.15 bar。计算合成标准不确定度。',
      'A brake-pressure uncertainty budget has independent standard uncertainties in common units: sensor calibration 0.35 bar, acquisition quantization/noise 0.20 bar and temperature correction 0.15 bar. Calculate combined standard uncertainty.',
      [
        ['平方和 = 0.35² + 0.20² + 0.15² = 0.1225 + 0.0400 + 0.0225 = 0.1850 bar²。', 'Sum of squares is 0.35² + 0.20² + 0.15² = 0.1225 + 0.0400 + 0.0225 = 0.1850 bar².'],
        ['uc = √0.1850 = 0.430 bar。', 'uc = √0.1850 = 0.430 bar.'],
      ],
      '合成标准不确定度约为 0.43 bar。只有独立或已正确去相关的分量才能直接平方和；若来源相关，必须加入协方差，扩展不确定度还需另选覆盖因子。',
      'Combined standard uncertainty is about 0.43 bar. Root-sum-square applies only to independent or properly decorrelated terms; correlated sources require covariance, and expanded uncertainty additionally requires a coverage factor.',
    ),
  ],
}
