import type { LocalText } from './engineeringData'
import type { VehicleId } from './vehicles'

const l = (zh: string, en: string): LocalText => ({ zh, en })
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

export type CoolingExperimentId = 'energy-balance' | 'pump-system' | 'radiator-airside' | 'branch-balance' | 'lap-transient'
export type CoolingDiagramMode = 'loop' | 'pump-map' | 'radiator' | 'branches' | 'timeline'

export type CoolingParameter = {
  key: string
  label: LocalText
  min: number
  max: number
  step: number
  initial: number
  unit: string
}

export type CoolingMetric = {
  id: string
  label: LocalText
  value: number
  unit: string
  tone?: 'good' | 'warn' | 'danger'
}

export type CoolingVisualState = {
  heat: number
  coolant: number
  airflow: number
  pressure: number
  hot: number
  cold: number
  alert: boolean
  blockage?: number
  branches?: [number, number, number]
  timeline?: { x: number; y: number }[]
  pumpCurve?: { x: number; y: number }[]
  systemCurve?: { x: number; y: number }[]
  workingPoint?: { x: number; y: number }
}

export type CoolingExperimentResult = {
  metrics: CoolingMetric[]
  visual: CoolingVisualState
  observation: LocalText
}

export type CoolingExperiment = {
  id: CoolingExperimentId
  title: LocalText
  question: LocalText
  mode: CoolingDiagramMode
  parameters: CoolingParameter[]
}

export type CoolingReferenceCard = {
  id: string
  title: LocalText
  image: string
  imageAlt: LocalText
  summary: LocalText
  purpose: LocalText
  details: LocalText[]
  sourceTitle: LocalText
  url: string
}

export type CoolingFaultCard = {
  id: string
  title: LocalText
  image: string
  imageAlt: LocalText
  scenario: LocalText
  strategy: LocalText
  principle: LocalText
  evidence: LocalText
}

const parameter = (key: string, zh: string, en: string, min: number, max: number, step: number, initial: number, unit: string): CoolingParameter => ({
  key, label: l(zh, en), min, max, step, initial, unit,
})

const toneForTemperature = (temperature: number, vehicleId: VehicleId): CoolingMetric['tone'] => {
  // Display thresholds for the two equivalent teaching loops, not homologation or component limits.
  const warn = vehicleId === 'grand-prix-2026' ? 105 : 75
  const danger = vehicleId === 'grand-prix-2026' ? 125 : 90
  return temperature >= danger ? 'danger' : temperature >= warn ? 'warn' : 'good'
}

export const coolingExperimentsFor = (vehicleId: VehicleId): CoolingExperiment[] => {
  const gp = vehicleId === 'grand-prix-2026'
  return [
    {
      id: 'energy-balance',
      title: l('热平衡', 'Heat balance'),
      question: l('热量怎样随冷却液流动？', 'How does coolant carry heat?'),
      mode: 'loop',
      parameters: [
        parameter('heat', '热负荷', 'Heat load', gp ? 30 : 2, gp ? 220 : 25, gp ? 5 : 0.5, gp ? 125 : 12, 'kW'),
        parameter('flow', '冷却液流量', 'Coolant flow', gp ? 20 : 2, gp ? 140 : 20, gp ? 2 : 0.5, gp ? 85 : 9, 'L/min'),
        parameter('ambient', '环境温度', 'Ambient temperature', 10, 45, 1, 30, '°C'),
      ],
    },
    {
      id: 'pump-system',
      title: l('泵与系统曲线', 'Pump and system curves'),
      question: l('泵指令为什么不等于真实流量？', 'Why is pump command not actual flow?'),
      mode: 'pump-map',
      parameters: [
        parameter('pumpDuty', '泵指令', 'Pump command', 30, 100, 1, 68, '%'),
        parameter('resistance', '回路阻力', 'Loop resistance', 40, 180, 2, 100, '%'),
        parameter('coolantTemp', '冷却液温度', 'Coolant temperature', 20, 110, 1, 60, '°C'),
      ],
    },
    {
      id: 'radiator-airside',
      title: l('散热器空气侧', 'Radiator air side'),
      question: l('空气为什么会绕开散热器？', 'Why can air bypass the radiator?'),
      mode: 'radiator',
      parameters: gp ? [
        parameter('vehicleSpeed', '车速', 'Vehicle speed', 30, 340, 5, 170, 'km/h'),
        parameter('coolingOpening', '冷却开口', 'Cooling opening', 30, 100, 2, 72, '%'),
        parameter('blockage', '芯体堵塞', 'Core blockage', 0, 55, 1, 8, '%'),
        parameter('ambient', '环境温度', 'Ambient temperature', 10, 45, 1, 30, '°C'),
      ] : [
        parameter('fanDuty', '风扇指令', 'Fan command', 20, 100, 2, 65, '%'),
        parameter('ductSeal', '风道密封', 'Duct sealing', 40, 100, 2, 88, '%'),
        parameter('blockage', '芯体堵塞', 'Core blockage', 0, 55, 1, 8, '%'),
        parameter('ambient', '环境温度', 'Ambient temperature', 10, 45, 1, 30, '°C'),
      ],
    },
    {
      id: 'branch-balance',
      title: l('多支路分流', 'Parallel branches'),
      question: l('总流量正常，局部为何仍会过热？', 'Why can one component overheat at normal total flow?'),
      mode: 'branches',
      parameters: [
        parameter('batteryValve', gp ? '储能支路阀门' : '电池支路阀门', gp ? 'Energy-store branch valve' : 'Battery branch valve', 15, 100, 1, 78, '%'),
        parameter('inverterValve', '功率电子支路阀门', 'Power-electronics branch valve', 15, 100, 1, 62, '%'),
        parameter('motorValve', gp ? 'MGU-K 支路阀门' : '电机支路阀门', gp ? 'MGU-K branch valve' : 'Motor branch valve', 15, 100, 1, 84, '%'),
      ],
    },
    {
      id: 'lap-transient',
      title: l('单圈热浸', 'Lap transient'),
      question: l('温度为什么在功率下降后仍会上升？', 'Why can temperature rise after power drops?'),
      mode: 'timeline',
      parameters: [
        parameter('peakHeat', '峰值热负荷', 'Peak heat load', gp ? 60 : 6, gp ? 240 : 28, gp ? 5 : 0.5, gp ? 175 : 20, 'kW'),
        parameter('highDuration', '高负荷持续', 'High-load duration', 20, 120, 2, 72, 's'),
        parameter('recovery', '恢复段散热', 'Recovery cooling', 30, 100, 2, 68, '%'),
        parameter('ambient', '环境温度', 'Ambient temperature', 10, 45, 1, 30, '°C'),
      ],
    },
  ]
}

export const initialCoolingValues = (experiment: CoolingExperiment): Record<string, number> => Object.fromEntries(experiment.parameters.map(item => [item.key, item.initial]))

const metric = (id: string, zh: string, en: string, value: number, unit: string, tone?: CoolingMetric['tone']): CoolingMetric => ({
  id, label: l(zh, en), value, unit, tone,
})

export const evaluateCoolingExperiment = (experiment: CoolingExperiment, values: Record<string, number>, vehicleId: VehicleId): CoolingExperimentResult => {
  const gp = vehicleId === 'grand-prix-2026'
  const get = (key: string) => values[key] ?? experiment.parameters.find(item => item.key === key)?.initial ?? 0
  const cp = 3900
  const density = gp ? 1.02 : 1.03

  if (experiment.id === 'energy-balance') {
    const heat = get('heat')
    const flow = get('flow')
    const ambient = get('ambient')
    const massFlow = flow / 60 * density
    const rise = heat * 1000 / Math.max(1, massFlow * cp)
    const airResistance = gp ? 0.35 / 0.72 : 2.0 / 0.65
    const cold = ambient + heat * airResistance
    const hot = cold + rise
    return {
      metrics: [
        metric('coolant-rise', '单程温升', 'Single-pass rise', rise, '°C', rise > (gp ? 28 : 30) ? 'warn' : 'good'),
        metric('hot-outlet', '热源出口', 'Heat-source outlet', hot, '°C', toneForTemperature(hot, vehicleId)),
        metric('mass-flow', '质量流量', 'Mass flow', massFlow, 'kg/s'),
        metric('heat-carried', '冷却液带走热量', 'Heat carried', heat, 'kW', 'good'),
      ],
      visual: { heat: clamp(heat / (gp ? 220 : 25), 0, 1), coolant: clamp(flow / (gp ? 140 : 20), 0, 1), airflow: gp ? 0.72 : 0.65, pressure: clamp(flow / (gp ? 140 : 20), 0, 1) ** 2, hot, cold, alert: toneForTemperature(hot, vehicleId) === 'danger' },
      observation: l('流量降低会显著增大单程温升；流量很高后，瓶颈会转移到冷板界面或散热器空气侧。', 'Lower flow sharply raises the single-pass temperature rise; at high flow the bottleneck moves to the cold plate or radiator air side.'),
    }
  }

  if (experiment.id === 'pump-system') {
    const duty = get('pumpDuty') / 100
    const resistance = get('resistance') / 100
    const coolantTemp = get('coolantTemp')
    const baseMaxFlow = gp ? 160 : 24
    const baseShutoff = gp ? 220 : 90
    const maxFlow = baseMaxFlow * duty
    const shutoff = baseShutoff * duty ** 2
    const viscosityFactor = clamp(1 + (60 - coolantTemp) * 0.004, 0.82, 1.2)
    const systemK = (gp ? 0.012 : 0.32) * resistance * viscosityFactor
    const pumpK = shutoff / Math.max(1, maxFlow ** 2)
    const flow = Math.sqrt(shutoff / Math.max(1e-6, systemK + pumpK))
    const pressure = systemK * flow ** 2
    const hydraulicPower = pressure * flow / 60000
    const efficiency = clamp(0.46 + 0.18 * (1 - Math.abs(flow / Math.max(1, maxFlow) - 0.58)), 0.38, 0.64)
    const shaftPower = hydraulicPower / efficiency
    const coolantRise = (gp ? 125 : 12) * 1000 / Math.max(1, flow / 60 * density * cp)
    const samples = Array.from({ length: 21 }, (_, index) => index / 20 * maxFlow)
    const pumpCurve = samples.map(x => ({ x, y: Math.max(0, shutoff * (1 - (x / Math.max(1, maxFlow)) ** 2)) }))
    const systemCurve = samples.map(x => ({ x, y: systemK * x ** 2 }))
    return {
      metrics: [
        metric('flow', '实际流量', 'Actual flow', flow, 'L/min', flow < (gp ? 45 : 5) ? 'warn' : 'good'),
        metric('pressure', '工作点压差', 'Operating-point pressure rise', pressure, 'kPa'),
        metric('hydraulic-power', '液压功率', 'Hydraulic power', hydraulicPower, 'kW'),
        metric('shaft-power', '泵轴输入功率', 'Pump shaft input', shaftPower, 'kW', shaftPower > (gp ? 0.8 : 0.08) ? 'warn' : undefined),
      ],
      visual: { heat: gp ? 0.6 : 0.48, coolant: clamp(flow / baseMaxFlow, 0, 1), airflow: 0.6, pressure: clamp(pressure / baseShutoff, 0, 1), hot: coolantTemp + coolantRise, cold: coolantTemp, alert: flow < (gp ? 45 : 5), pumpCurve, systemCurve, workingPoint: { x: flow, y: pressure } },
      observation: l('两条曲线的交点才是实际工作点。提高泵指令会抬高泵曲线；堵塞、阀门或低温黏度会抬高系统曲线。', 'The curve intersection is the real working point. More pump command raises the pump curve; restrictions, valves and cold-fluid viscosity raise the system curve.'),
    }
  }

  if (experiment.id === 'radiator-airside') {
    const ambient = get('ambient')
    const blockage = get('blockage') / 100
    const heat = gp ? 125 : 12
    let effectiveAir: number
    let penalty: number
    if (gp) {
      const speed = get('vehicleSpeed')
      const opening = get('coolingOpening') / 100
      effectiveAir = clamp((speed / 240) ** 0.72 * opening ** 0.82 * (1 - blockage), 0.08, 1.35)
      penalty = opening * (speed / 200) ** 2 * 100
    } else {
      const fan = get('fanDuty') / 100
      const seal = get('ductSeal') / 100
      effectiveAir = clamp((0.12 + 0.88 * fan ** 0.78) * seal * (1 - blockage), 0.05, 1)
      penalty = 0.45 * fan ** 3
    }
    const baseUa = gp ? 2.2 : 0.46
    const ua = baseUa * effectiveAir ** 0.68
    const cold = ambient + heat / Math.max(0.05, ua)
    const coolantFlow = gp ? 85 : 9
    const coolantDrop = heat * 1000 / Math.max(1, coolantFlow / 60 * density * cp)
    const hot = cold + coolantDrop
    return {
      metrics: [
        metric('effective-air', '归一化穿芯风量', 'Normalized core airflow', effectiveAir * 100, '%', effectiveAir < 0.35 ? 'danger' : effectiveAir < 0.6 ? 'warn' : 'good'),
        metric('ua', '等效 UA', 'Equivalent UA', ua, 'kW/K'),
        metric('coolant-out', '估算冷却液温度', 'Estimated coolant', cold, '°C', toneForTemperature(cold, vehicleId)),
        metric('penalty', gp ? '冷却气动代价指数' : '风扇电功率估算', gp ? 'Cooling-drag index' : 'Estimated fan electrical power', penalty, gp ? 'idx' : 'kW', penalty > (gp ? 90 : 0.32) ? 'warn' : undefined),
      ],
      visual: { heat: heat / (gp ? 220 : 25), coolant: 0.65, airflow: clamp(effectiveAir, 0, 1), pressure: clamp(effectiveAir ** 2, 0, 1), hot, cold, alert: toneForTemperature(cold, vehicleId) === 'danger', blockage },
      observation: l('堵塞与风道泄漏会同时削弱有效面积和空气侧换热。穿芯风量和气动代价均为相对教学指标；气动代价以 200 km/h、开口全开为 100，真实设计必须再用风洞或台架数据标定。', 'Blockage and duct leakage reduce effective area and air-side transfer. Core airflow and cooling-drag cost are relative teaching indices; drag cost is 100 at 200 km/h with a fully open inlet and requires wind-tunnel or rig correlation for real design.'),
    }
  }

  if (experiment.id === 'branch-balance') {
    const valves = [get('batteryValve'), get('inverterValve'), get('motorValve')]
    const conductance = valves.map(value => Math.max(0.02, (value / 100) ** 2))
    const totalFlow = gp ? 85 : 9
    const sum = conductance.reduce((total, value) => total + value, 0)
    const flows = conductance.map(value => totalFlow * value / sum) as [number, number, number]
    const heatLoads = gp ? [14, 24, 18] : [4, 6, 2]
    const inlet = gp ? 60 : 42
    const outletTemps = flows.map((flow, index) => inlet + heatLoads[index]! * 1000 / Math.max(1, flow / 60 * density * cp))
    const hottest = Math.max(...outletTemps)
    const minFlow = Math.min(...flows)
    return {
      metrics: [
        metric('branch-one', gp ? '储能支路流量' : '电池支路流量', gp ? 'Energy-store branch flow' : 'Battery branch flow', flows[0], 'L/min'),
        metric('branch-two', '功率电子支路流量', 'Power-electronics flow', flows[1], 'L/min', flows[1] < totalFlow * 0.22 ? 'danger' : undefined),
        metric('branch-three', gp ? 'MGU-K 支路流量' : '电机支路流量', gp ? 'MGU-K branch flow' : 'Motor branch flow', flows[2], 'L/min'),
        metric('hottest', '最高支路出口温度', 'Hottest branch outlet', hottest, '°C', toneForTemperature(hottest, vehicleId)),
      ],
      visual: { heat: 0.7, coolant: 0.65, airflow: 0.65, pressure: clamp(1 - minFlow / Math.max(...flows), 0, 1), hot: hottest, cold: inlet, alert: toneForTemperature(hottest, vehicleId) === 'danger', branches: flows.map(flow => flow / Math.max(...flows)) as [number, number, number] },
      observation: l('本实验假设主泵以定流控制维持总流量；并联支路仍会按液压阻力重新分流，因此主回路数值正常并不能证明每一个部件都得到了足够冷却。', 'This experiment assumes constant-flow pump control. Parallel branches still redistribute flow by hydraulic resistance, so a normal main-loop value does not prove every component receives enough coolant.'),
    }
  }

  const peakHeat = get('peakHeat')
  const highDuration = get('highDuration')
  const recovery = get('recovery') / 100
  const ambient = get('ambient')
  const coreCapacity = gp ? 360 : 75
  const coolantCapacity = gp ? 540 : 105
  const internalConductance = gp ? 3.0 : 0.6
  const rejectionBase = gp ? 2.0 : 0.36
  const lowHeat = peakHeat * 0.08
  const initialCore = gp ? 92 : 58
  const initialCoolant = gp ? 78 : 48
  let coreTemperature = initialCore
  let coolantTemperature = initialCoolant
  let peak = coolantTemperature
  let coolantAtPowerDrop = coolantTemperature
  let peakStoredEnergy = 0
  const limit = gp ? 125 : 90
  const timeline: { x: number; y: number }[] = [{ x: 0, y: coolantTemperature }]
  for (let time = 2; time <= 180; time += 2) {
    const generated = time <= highDuration ? peakHeat : lowHeat
    const transferred = internalConductance * (coreTemperature - coolantTemperature)
    const rejectionFactor = time <= highDuration ? 0.45 : recovery
    const rejected = Math.max(0, rejectionBase * rejectionFactor * (coolantTemperature - ambient))
    coreTemperature += (generated - transferred) * 2 / coreCapacity
    coolantTemperature += (transferred - rejected) * 2 / coolantCapacity
    if (time === highDuration) coolantAtPowerDrop = coolantTemperature
    if (coolantTemperature > peak) {
      peak = coolantTemperature
    }
    peakStoredEnergy = Math.max(peakStoredEnergy, (
      coreCapacity * (coreTemperature - initialCore)
      + coolantCapacity * (coolantTemperature - initialCoolant)
    ) / 1000)
    timeline.push({ x: time, y: coolantTemperature })
  }
  const postLoadRise = Math.max(0, peak - coolantAtPowerDrop)
  const reached = peak >= limit
  return {
    metrics: [
      metric('peak-temperature', '传感器峰值温度', 'Sensor peak temperature', peak, '°C', toneForTemperature(peak, vehicleId)),
      metric('post-load-rise', '功率下降后温升', 'Rise after power drop', postLoadRise, '°C', postLoadRise > 0.5 ? 'warn' : 'good'),
      metric('stored-energy', '峰值净储热', 'Peak stored heat', Math.max(0, peakStoredEnergy), 'MJ', peakStoredEnergy > (gp ? 15 : 3) ? 'warn' : undefined),
      metric('recovery-temperature', '恢复段结束温度', 'End-of-recovery temperature', coolantTemperature, '°C', toneForTemperature(coolantTemperature, vehicleId)),
    ],
    visual: { heat: clamp(peakHeat / (gp ? 240 : 28), 0, 1), coolant: recovery, airflow: recovery, pressure: recovery ** 2, hot: peak, cold: coolantTemperature, alert: reached, timeline },
    observation: l('双节点模型把热源结构与冷却液测点分开：功率下降时，结构仍比冷却液更热，因此余热会继续流向传感器，随后才被散热器带走。', 'The two-node model separates the hot structure from the coolant sensor. When power drops, the structure remains hotter, so stored heat keeps flowing to the sensor before the radiator removes it.'),
  }
}

export const coolingReferenceCards: CoolingReferenceCard[] = [
  {
    id: 'heat-budget',
    title: l('热平衡与换热器报告', 'Heat-balance and heat-exchanger report'),
    image: '/images/cooling/reference-heat-budget.webp',
    imageAlt: l('工程师在赛车冷却台架上布置温度、流量和压力测点', 'Engineer placing temperature, flow and pressure instrumentation on a race-car cooling rig'),
    summary: l('把每一个热源、测点和环境边界放进同一份可闭合的能量账本。', 'Put every heat source, measurement point and boundary into one closing energy ledger.'),
    purpose: l('它用来选散热器芯体、风道和冷却液流量，并检查测得的产热与排热是否真正守恒。', 'It sizes the core, duct and coolant flow, then checks whether measured generation and rejection truly balance.'),
    details: [
      l('任务循环中的部件损耗与最高环境温度', 'Component losses over the duty cycle and maximum ambient'),
      l('质量流量、进出口温度、LMTD、UA 与两侧压降', 'Mass flow, inlet/outlet temperature, LMTD, UA and both-side pressure drop'),
      l('污染、制造偏差、老化与测量不确定度裕量', 'Margins for fouling, build variation, ageing and measurement uncertainty'),
    ],
    sourceTitle: l('Alfa Laval 换热器计算方法', 'Alfa Laval heat-exchanger calculation method'),
    url: 'https://www.alfalaval.com/microsites/gphe/tools/calculation-method/',
  },
  {
    id: 'pump-network',
    title: l('泵曲线与液压网络报告', 'Pump-map and hydraulic-network report'),
    image: '/images/cooling/reference-pump-map.webp',
    imageAlt: l('工程师调节冷却台架阀门并观察泵曲线与系统曲线交点', 'Engineer adjusting a cooling-rig valve while observing pump and system curve intersection'),
    summary: l('把泵指令、流量、扬程、效率和每条支路的阻力联系到同一个工作点。', 'Connect pump command, flow, head, efficiency and every branch resistance at one working point.'),
    purpose: l('它帮助工程师判断应该换泵、改管径、调阀门，还是先处理气泡、堵塞与吸入问题。', 'It shows whether to change the pump, pipe size or valve—or first fix air, blockage or suction trouble.'),
    details: [
      l('不同 PWM、温度下的流量—扬程—效率图谱', 'Flow-head-efficiency maps across PWM and temperature'),
      l('系统曲线、并联支路阻力与实际交点', 'System curve, parallel-branch resistance and actual intersection'),
      l('液压功率、泵轴输入、电功率与汽蚀检查', 'Hydraulic power, shaft input, electrical power and cavitation checks'),
    ],
    sourceTitle: l('Xylem 泵与系统曲线技术手册', 'Xylem pump and system curve manual'),
    url: 'https://www.xylem.com/siteassets/brand/bell-amp-gossett/resources/manual/teh-375a-pump--system-curve-data-for-centrifugal-pump-selection-and-application.pdf',
  },
  {
    id: 'track-correlation',
    title: l('遥测、验证与签核包', 'Telemetry, validation and sign-off pack'),
    image: '/images/cooling/reference-track-correlation.webp',
    imageAlt: l('赛道车库中的工程师用红外图和同步遥测检查赛车冷却系统', 'Engineers correlating an infrared image and synchronized cooling telemetry in a track garage'),
    summary: l('让台架模型、赛道事件、传感器标定和车辆版本在同一条时间线上可追溯。', 'Make rig models, track events, sensor calibration and vehicle version traceable on one timeline.'),
    purpose: l('它用来复现某一次过热、验证降额策略，并证明管路和换热器布置满足安全要求。', 'It reproduces an overheat event, validates derating and demonstrates that plumbing and exchangers meet safety requirements.'),
    details: [
      l('测点、量程、采样率、时间同步与标定编号', 'Sensor location, range, sample rate, synchronization and calibration ID'),
      l('圈段事件、流量、压差、温度与泵电流', 'Lap events, flow, pressure drop, temperature and pump current'),
      l('车辆配置、软件版本、验收边界与法规证据', 'Vehicle configuration, software version, acceptance limits and compliance evidence'),
    ],
    sourceTitle: l('FIA 2026 F1 技术规则 C 节', 'FIA 2026 F1 Technical Regulations, Section C'),
    url: 'https://www.fia.com/system/files/documents/fia_2026_f1_regulations_-_section_c_technical_-_iss_19_-_2026-06-25.pdf',
  },
]

export const coolingFaultCardsFor = (vehicleId: VehicleId): CoolingFaultCard[] => {
  const gp = vehicleId === 'grand-prix-2026'
  return [
    {
      id: 'airlock-cavitation',
      title: l('泵指令很高，流量却忽高忽低', 'High pump command, unstable low flow'),
      image: '/images/cooling/fault-airlock.webp',
      imageAlt: l('透明冷却软管内聚集气泡，工程师检查泵入口和压力传感器', 'Air bubbles collecting in a transparent coolant hose while an engineer inspects the pump inlet and pressure sensors'),
      scenario: gp ? l('等效教学回路热负荷 125 kW、基线流量约 85 L/min。泵指令升至 90% 后，流量却在 28–41 L/min 之间摆动，压差同步波动，热端温度快速超过 115°C。泵附近出现像吸管吸到空气的断续“咕噜”声；这不是可以继续加速观察的小问题。', 'In an equivalent teaching loop at 125 kW, baseline flow is about 85 L/min. At 90% pump command, flow oscillates between 28 and 41 L/min, pressure fluctuates and hot-side temperature quickly exceeds 115°C. The pump makes an intermittent straw-sucking sound; this is not a fault to keep loading.') : l('教学台架热负荷 12 kW、基线流量约 9 L/min。泵指令升至 90% 后，流量却在 2.8–4.1 L/min 之间摆动，压差同步波动，热源出口由 62°C 快速升向 90°C。泵附近出现像吸管吸到空气的断续“咕噜”声；禁止触摸或打开热态加压回路。', 'On a 12 kW teaching rig, baseline flow is about 9 L/min. At 90% pump command, flow oscillates between 2.8 and 4.1 L/min, pressure fluctuates and the heat-source outlet climbs from 62°C toward 90°C. The pump makes an intermittent straw-sucking sound; never touch or open the hot pressurized loop.'),
      strategy: l('立即停止高负荷，检查液位、吸入侧泄漏、膨胀罐回路与泵入口布置，并按设计程序排气。排气后仍不稳定，再检查入口限制、滤网和叶轮损伤；不要用更高转速长期“压住”问题。', 'Stop high load, check level, suction leaks, expansion-tank routing and pump-inlet layout, then deaerate by the approved procedure. If instability remains, inspect inlet restriction, filter and impeller damage; do not mask it with sustained higher speed.'),
      principle: l('离心泵吸入气体或发生汽蚀时不能稳定建立扬程；气泡塌陷还会侵蚀叶轮。提高转速会进一步降低入口压力，因此可能让流量波动更严重。', 'A centrifugal pump ingesting gas or cavitating cannot establish stable head, and collapsing bubbles can erode the impeller. More speed can reduce inlet pressure further and worsen the oscillation.'),
      evidence: l('修复成立的证据是流量、压差和噪声同时恢复稳定，而不是只看到温度暂时下降。', 'A valid repair restores flow, pressure and noise stability together—not merely a temporary temperature drop.'),
    },
    {
      id: 'radiator-blockage',
      title: gp ? l('车速很高，散热器仍带不走热', 'High speed, weak heat rejection') : l('风量很高，散热器仍带不走热', 'High airflow, weak heat rejection'),
      image: '/images/cooling/fault-radiator-blockage.webp',
      imageAlt: l('工程师检查被橡胶碎屑和灰尘堵塞的赛车散热器芯体', 'Engineer inspecting a race-car radiator core clogged by rubber debris and dust'),
      scenario: gp ? l('等效教学回路热负荷 125 kW、冷却液流量 85 L/min，赛车在 250 km/h 且冷却开口接近全开时，散热器入口仍有 122°C、出口 116°C。6°C 温降只对应约 33.8 kW 排热，远低于当前热负荷；芯体表面被橡胶碎屑和倒伏翅片覆盖，出口流场也明显不均匀。', 'In the equivalent 125 kW teaching loop at 85 L/min, with the car at 250 km/h and the cooling opening nearly full, radiator inlet remains 122°C and outlet 116°C. A 6°C drop rejects only about 33.8 kW—far below the heat load—while rubber debris and flattened fins cover the core and the exit flow is visibly non-uniform.') : l('热负荷 12 kW、冷却液流量 9 L/min 时，散热器入口 84°C、出口 80°C，只下降 4°C；按当前冷却液参数，它只带走约 2.4 kW。风扇高速运行，芯体却被橡胶碎屑、灰尘和倒伏翅片覆盖，就像给散热器盖了一层厚毯子。', 'At 12 kW heat load and 9 L/min coolant flow, radiator inlet is 84°C and outlet 80°C—a 4°C drop that rejects only about 2.4 kW with the current coolant. The fan runs fast, but rubber debris, dust and flattened fins cover the core like a thick blanket.'),
      strategy: gp ? l('立即降低等效热负荷，比较芯体前后压差与出口流场，检查进气口、芯体正反面、翅片倒伏、风道密封和出口阻塞。按制造商程序清洁或更换芯体；不要用继续放大冷却开口来掩盖堵塞。', 'Reduce the equivalent heat load, compare core pressure drop and exit-flow distribution, and inspect the inlet, both core faces, flattened fins, duct seals and outlet restriction. Clean or replace the core by the approved procedure; do not mask blockage by opening the cooling inlet further.') : l('检查芯体正反面污染、翅片倒伏、风道密封、流向与出口背压。按制造商要求从足够距离使用低压气流或水流清洁；避免把翅片进一步压倒，内部堵塞或严重损伤时更换芯体。', 'Inspect both core faces, flattened fins, duct sealing, flow direction and outlet backpressure. Clean with low-pressure air or water at safe distance per the maker; avoid folding fins further and replace an internally blocked or badly damaged core.'),
      principle: l('污染同时减少有效换热面积并降低空气侧换热系数，使 UA 下降。风扇再快也可能只增加压差和耗电，而没有建立真正穿过芯体的空气流量。', 'Fouling cuts effective area and air-side heat transfer, reducing UA. A faster fan may add pressure and power draw without establishing useful through-core airflow.'),
      evidence: l('在相同热负荷、液流和环境下，清洁后进出口温差、降温斜率与有效穿芯风量应同时恢复。', 'At the same heat load, coolant flow and ambient, cleaning should restore temperature drop, cooldown slope and effective through-core airflow together.'),
    },
    {
      id: 'branch-restriction',
      title: l('总流量正常，单个部件却过热', 'Normal total flow, one hot component'),
      image: '/images/cooling/fault-branch-restriction.webp',
      imageAlt: l('赛车三支路冷却歧管中一条支路流量很低，红外图显示局部热点', 'One branch of a race-car coolant manifold has low flow while an infrared image shows a localized hotspot'),
      scenario: gp ? l('定流控制下的等效主回路仍显示 85 L/min，但功率电子支路只有 4 L/min，基线约 19 L/min。该支路入口 60°C、出口 102°C，只能带走约 11.1 kW，而部件损耗约 24 kW；储能与 MGU-K 支路接管了更多流量。主干道畅通，并不代表每一条支路都没有堵车。', 'Under constant-flow control, the equivalent main loop still reads 85 L/min, but the power-electronics branch carries only 4 L/min versus a 19 L/min baseline. Its 60°C inlet and 102°C outlet carry about 11.1 kW against roughly 24 kW loss, while the energy-store and MGU-K branches take more flow. An open highway does not mean every side street is clear.') : l('定流控制下的主回路仍显示 9 L/min，但功率电子支路只有 0.8 L/min，基线约 2.0 L/min。该支路入口 45°C、出口 72°C，只能带走约 1.45 kW，而部件损耗约 6 kW，壳体热点估算达到 118°C；电池与电机支路接管了更多流量。', 'Under constant-flow control, the main loop still reads 9 L/min, but the power-electronics branch carries only 0.8 L/min versus a 2.0 L/min baseline. Its 45°C inlet and 72°C outlet carry about 1.45 kW against roughly 6 kW loss; the estimated case hotspot reaches 118°C while the battery and motor branches take more flow.'),
      strategy: l('比较每条支路的流量与压差，检查软管折弯、阀门位置、过滤器、冷板流道和异物。隔离故障支路后按程序冲洗、维修或更换，再重新做支路平衡与泄漏检查。', 'Compare branch flow and pressure drop; inspect hose kinks, valve position, filter, cold-plate channels and debris. Isolate, flush, repair or replace the branch, then rebalance and leak-check it.'),
      principle: l('并联支路按液压阻力分配流量。局部阻力升高会把冷却液推向其他支路；当泵采用定流控制或其他支路接管流量时，主回路总流量可能变化很小，却会让一个部件失去冷却。', 'Parallel branches divide flow by hydraulic resistance. A local restriction diverts coolant elsewhere; with constant-flow pump control or compensating branches, total flow may change little while one component is starved.'),
      evidence: l('修复后要同时看到支路流量恢复、进出口温差合理、红外热点消失；不能仅凭主回路流量宣告修复。', 'After repair, branch flow, inlet/outlet temperature difference and the infrared hotspot must all recover; total-loop flow alone is not proof.'),
    },
  ]
}
