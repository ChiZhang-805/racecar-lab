import type { VehicleId } from './vehicles'
import {
  interactionClamp as clamp,
  interactionCurve as curve,
  interactionMetric as metric,
  interactionParameter as parameter,
  localText as l,
  type InteractionExperiment,
  type InteractionFaultCard,
  type InteractionParameter,
  type InteractionReferenceCard,
  type InteractionResult,
  type PartInteractionPack,
} from './interactionTypes'

const EPSILON = 1e-9
const G = 9.80665
const AIR_PRESSURE_KPA = 101.325

const finite = (value: number, fallback = 0) => Number.isFinite(value) ? value : fallback
const normalise = (value: number, min: number, max: number) => clamp((finite(value) - min) / Math.max(EPSILON, max - min))
const signed = (value: number) => value === 0 ? 0 : value > 0 ? 1 : -1
const radians = (degrees: number) => degrees * Math.PI / 180

const read = (values: Record<string, number>, parameters: InteractionParameter[], key: string) => {
  const definition = parameters.find(item => item.key === key)
  if (!definition) return 0
  return clamp(finite(values[key] ?? definition.initial, definition.initial), definition.min, definition.max)
}

const result = (
  metrics: InteractionResult['metrics'],
  points: InteractionResult['points'],
  insight: InteractionResult['insight'],
  labels: InteractionResult['visual']['labels'],
  values: number[],
  extras: Partial<Omit<InteractionResult, 'metrics' | 'points' | 'insight' | 'visual'>> & Partial<InteractionResult['visual']> = {},
): InteractionResult => {
  const { secondaryPoints, marker, risk, direction } = extras
  return {
    metrics: metrics.map(item => ({ ...item, value: finite(item.value) })),
    points: points.map(point => ({ x: finite(point.x), y: finite(point.y) })),
    secondaryPoints: secondaryPoints?.map(point => ({ x: finite(point.x), y: finite(point.y) })),
    insight,
    visual: {
      labels,
      values: values.map(value => clamp(finite(value))),
      marker: marker === undefined ? undefined : clamp(finite(marker)),
      risk: risk === undefined ? undefined : clamp(finite(risk)),
      direction: direction === undefined ? undefined : clamp(finite(direction), -1, 1),
    },
  }
}

const tyreTemperatureFactor = (temperature: number, optimum: number, width: number) =>
  clamp(Math.exp(-(((temperature - optimum) / Math.max(1, width)) ** 2)), 0.45, 1)

const tyreForceShape = (slip: number, peakSlip: number) => {
  const ratio = Math.abs(slip) / Math.max(EPSILON, peakSlip)
  return signed(slip) * 2 * ratio / (1 + ratio * ratio)
}

const tyreExperimentsFor = (vehicleId: VehicleId): InteractionExperiment[] => {
  const gp = vehicleId === 'grand-prix-2026'
  const loadMin = gp ? 1500 : 300
  const loadMax = gp ? 8000 : 1800
  const loadInitial = gp ? 4200 : 900
  const optimumTemperature = gp ? 95 : 65

  const lateralParameters = [
    parameter('slipAngle', '侧偏角', 'Slip angle', gp ? -8 : -12, gp ? 8 : 12, .25, gp ? 3 : 4, '°'),
    parameter('normalLoad', '法向载荷', 'Normal load', loadMin, loadMax, gp ? 100 : 25, loadInitial, 'N'),
    parameter('temperature', '胎体温度', 'Carcass temperature', gp ? 40 : 20, gp ? 140 : 100, 1, gp ? 90 : 60, '°C'),
    parameter('camber', '外倾角', 'Camber', -4, gp ? 1 : 2, .1, gp ? -2.5 : -1.5, '°'),
  ]

  const longitudinalParameters = [
    parameter('slipRatio', '滑移率', 'Slip ratio', -25, 20, .5, gp ? 6 : 8, '%'),
    parameter('normalLoad', '法向载荷', 'Normal load', loadMin, loadMax, gp ? 100 : 25, loadInitial, 'N'),
    parameter('temperature', '胎体温度', 'Carcass temperature', gp ? 40 : 20, gp ? 140 : 100, 1, gp ? 90 : 60, '°C'),
    parameter('pressure', '胎压（表压）', 'Tyre pressure (gauge)', gp ? 140 : 55, gp ? 220 : 110, 1, gp ? 180 : 75, 'kPa'),
  ]

  const combinedParameters = [
    parameter('longitudinalDemand', '纵向需求', 'Longitudinal demand', -140, 100, 2, -35, '%'),
    parameter('lateralDemand', '横向需求', 'Lateral demand', -140, 140, 2, 65, '%'),
    parameter('gripScale', '路面抓地', 'Surface grip', 40, 120, 2, 100, '%'),
    parameter('normalLoad', '法向载荷', 'Normal load', loadMin, loadMax, gp ? 100 : 25, loadInitial, 'N'),
  ]

  const loadParameters = [
    parameter('axleLoad', '车轴总载荷', 'Total axle load', gp ? 6000 : 1000, gp ? 18000 : 4000, gp ? 200 : 50, gp ? 11000 : 2200, 'N'),
    parameter('loadTransfer', '左右载荷转移', 'Lateral load transfer', 0, 90, 1, gp ? 50 : 45, '%'),
    parameter('loadSensitivity', '负载敏感系数', 'Load sensitivity', 3, 20, .5, gp ? 8 : 10, '%'),
    parameter('slipDemand', '侧偏需求', 'Slip-angle demand', 0, gp ? 7 : 10, .25, gp ? 3.5 : 5, '°'),
  ]

  const thermalParameters = [
    parameter('coldPressure', '冷态表压', 'Cold gauge pressure', gp ? 140 : 55, gp ? 220 : 110, 1, gp ? 180 : 75, 'kPa'),
    parameter('initialTemperature', '初始温度', 'Initial temperature', gp ? 40 : 15, gp ? 100 : 60, 1, gp ? 70 : 25, '°C'),
    parameter('heatInput', '轮胎发热功率', 'Tyre heat input', gp ? 4 : .2, gp ? 24 : 2, gp ? .5 : .05, gp ? 18 : 1.8, 'kW'),
    parameter('cooling', '冷却强度', 'Cooling coefficient', gp ? 80 : 10, gp ? 400 : 80, gp ? 5 : 2, gp ? 220 : 35, 'W/K'),
  ]

  return [
    {
      id: 'slip-angle-sweep',
      title: l('侧偏角扫描', 'Slip-angle sweep'),
      question: l('侧向力何时达到峰值？', 'When does lateral force reach its peak?'),
      mode: 'curve',
      parameters: lateralParameters,
      evaluate: values => {
        const alpha = read(values, lateralParameters, 'slipAngle')
        const load = read(values, lateralParameters, 'normalLoad')
        const temperature = read(values, lateralParameters, 'temperature')
        const camber = read(values, lateralParameters, 'camber')
        const loadReference = gp ? 4000 : 850
        const mu = (gp ? 1.78 : 1.42) * tyreTemperatureFactor(temperature, optimumTemperature, gp ? 32 : 25) * clamp(1 - .08 * (load / loadReference - 1), .68, 1.14)
        const peakAngle = gp ? 3.6 : 5.2
        const forceAt = (angle: number) => clamp(mu * load * tyreForceShape(angle, peakAngle) + camber * (gp ? 115 : 26), -mu * load, mu * load)
        const fy = forceAt(alpha)
        const slipShare = clamp(Math.abs(alpha) / (peakAngle * 1.55))
        const trail = (gp ? .045 : .032) * Math.exp(-.72 * (Math.abs(alpha) / peakAngle) ** 2)
        const aligningMoment = -fy * trail
        const points = curve(angle => forceAt(angle), lateralParameters[0]!.min, lateralParameters[0]!.max, 41)
        const moments = curve(angle => {
          const localForce = forceAt(angle)
          const localTrail = (gp ? .045 : .032) * Math.exp(-.72 * (Math.abs(angle) / peakAngle) ** 2)
          return -localForce * localTrail
        }, lateralParameters[0]!.min, lateralParameters[0]!.max, 41)
        return result([
          metric('lateral-force', '侧向力', 'Lateral force', fy, 'N'),
          metric('effective-mu', '有效摩擦系数', 'Effective friction coefficient', Math.abs(fy) / Math.max(1, load), 'μ'),
          metric('aligning-moment', '回正力矩', 'Aligning moment', aligningMoment, 'N·m'),
          metric('sliding-share', '滑移区比例', 'Sliding-patch share', slipShare * 100, '%', slipShare > .82 ? 'warn' : 'good'),
        ], points, l('峰值之后继续增加转角，更多接地印迹进入滑移，侧向力不会无限增加。', 'Beyond the peak, more steering puts more of the contact patch into sliding; lateral force cannot rise indefinitely.'),
        [l('黏着区', 'Adhesion'), l('过渡区', 'Transition'), l('滑移区', 'Sliding'), l('回正力矩', 'Aligning torque')],
        [1 - slipShare, clamp(1 - Math.abs(Math.abs(alpha) / peakAngle - 1)), slipShare, normalise(Math.abs(aligningMoment), 0, gp ? 260 : 55)],
        { secondaryPoints: moments, marker: normalise(alpha, lateralParameters[0]!.min, lateralParameters[0]!.max), risk: slipShare })
      },
    },
    {
      id: 'slip-ratio-sweep',
      title: l('牵引与制动滑移', 'Traction and braking slip'),
      question: l('轮速差何时只会继续发热？', 'When does wheel-speed difference only add heat?'),
      mode: 'flow',
      parameters: longitudinalParameters,
      evaluate: values => {
        const slip = read(values, longitudinalParameters, 'slipRatio') / 100
        const load = read(values, longitudinalParameters, 'normalLoad')
        const temperature = read(values, longitudinalParameters, 'temperature')
        const pressure = read(values, longitudinalParameters, 'pressure')
        const optimumPressure = gp ? 180 : 75
        const pressureFactor = clamp(1 - .000075 * (pressure - optimumPressure) ** 2, .6, 1)
        const mu = (gp ? 1.82 : 1.48) * tyreTemperatureFactor(temperature, optimumTemperature, gp ? 34 : 26) * pressureFactor
        const peakSlip = gp ? .085 : .105
        const fx = mu * load * tyreForceShape(slip, peakSlip)
        const utilisation = Math.abs(fx) / Math.max(1, mu * load)
        const referenceSpeed = gp ? 70 : 25
        const heat = Math.abs(fx * slip * referenceSpeed) / 1000
        const margin = clamp(1 - Math.abs(slip) / (peakSlip * 1.8))
        return result([
          metric('longitudinal-force', '纵向力', 'Longitudinal force', fx, 'N'),
          metric('longitudinal-utilisation', '纵向利用率', 'Longitudinal utilisation', utilisation * 100, '%', utilisation > .97 ? 'warn' : 'good'),
          metric('slip-power', '滑移耗散功率', 'Slip dissipation', heat, 'kW', heat > (gp ? 160 : 18) ? 'warn' : undefined),
          metric('lock-spin-margin', '锁止/空转余量', 'Lock/spin margin', margin * 100, '%', margin < .25 ? 'danger' : margin < .5 ? 'warn' : 'good'),
        ], curve(localSlip => mu * load * tyreForceShape(localSlip / 100, peakSlip), -25, 20, 46),
        l('峰值滑移之后，纵向力开始饱和，而滑移耗散与磨耗仍继续增加。', 'After peak slip, longitudinal force saturates while slip dissipation and wear keep rising.'),
        [l('路面速度', 'Road speed'), l('轮周速度', 'Wheel speed'), l('纵向力', 'Longitudinal force'), l('滑移热', 'Slip heat')],
        [.55, clamp(.55 + slip * 1.8), utilisation, normalise(heat, 0, gp ? 260 : 30)],
        { marker: normalise(slip * 100, -25, 20), risk: 1 - margin, direction: signed(slip) })
      },
    },
    {
      id: 'combined-slip',
      title: l('组合滑移', 'Combined slip'),
      question: l('制动和转向如何共享同一份抓地？', 'How do braking and cornering share the same grip?'),
      mode: 'field',
      parameters: combinedParameters,
      evaluate: values => {
        const requestedX = read(values, combinedParameters, 'longitudinalDemand') / 100
        const requestedY = read(values, combinedParameters, 'lateralDemand') / 100
        const grip = read(values, combinedParameters, 'gripScale') / 100
        const load = read(values, combinedParameters, 'normalLoad')
        const requestedMagnitude = Math.hypot(requestedX, requestedY)
        const requestedUtilisation = requestedMagnitude / Math.max(.05, grip)
        const scale = requestedMagnitude > grip ? grip / Math.max(requestedMagnitude, 1e-6) : 1
        const actualX = requestedX * scale
        const actualY = requestedY * scale
        const baseMu = gp ? 1.75 : 1.4
        const fx = actualX * baseMu * load
        const fy = actualY * baseMu * load
        const lateralReserve = clamp((Math.sqrt(Math.max(0, grip ** 2 - actualX ** 2)) - Math.abs(actualY)) / Math.max(.05, grip))
        return result([
          metric('actual-fx', '实际纵向力', 'Actual longitudinal force', fx, 'N'),
          metric('actual-fy', '实际侧向力', 'Actual lateral force', fy, 'N'),
          metric('friction-utilisation', '摩擦利用率', 'Friction utilisation', Math.min(1, requestedUtilisation) * 100, '%', requestedUtilisation > 1 ? 'danger' : requestedUtilisation > .9 ? 'warn' : 'good'),
          metric('lateral-reserve', '剩余转向储备', 'Remaining lateral reserve', lateralReserve * 100, '%', lateralReserve < .1 ? 'danger' : lateralReserve < .3 ? 'warn' : 'good'),
        ], curve(x => Math.sqrt(Math.max(0, grip ** 2 - x * x)), -grip, grip, 41),
        l('需求点越过摩擦边界时，轮胎只能沿需求方向裁剪合力，继续加转角不会获得额外横向力。', 'When demand exceeds the friction boundary, the tyre clips the resultant along the demand direction; more steering cannot add lateral force.'),
        [l('制动', 'Braking'), l('驱动', 'Drive'), l('左向力', 'Left force'), l('右向力', 'Right force'), l('储备', 'Reserve')],
        [clamp(-actualX / Math.max(.05, grip)), clamp(actualX / Math.max(.05, grip)), clamp(-actualY / Math.max(.05, grip)), clamp(actualY / Math.max(.05, grip)), lateralReserve],
        { marker: clamp(Math.min(1, requestedUtilisation)), risk: clamp(requestedUtilisation - .8, 0, .4) / .4, direction: clamp(actualY / Math.max(.05, grip), -1, 1) })
      },
    },
    {
      id: 'load-sensitivity',
      title: l('负载敏感性', 'Load sensitivity'),
      question: l('外轮更重时，车轴总抓地为何会损失？', 'Why can total axle grip fall as the outside tyre gets heavier?'),
      mode: 'distribution',
      parameters: loadParameters,
      evaluate: values => {
        const axleLoad = read(values, loadParameters, 'axleLoad')
        const transfer = read(values, loadParameters, 'loadTransfer') / 100
        const sensitivity = read(values, loadParameters, 'loadSensitivity') / 100
        const slipDemand = read(values, loadParameters, 'slipDemand')
        const outsideLoad = axleLoad * (1 + transfer) / 2
        const insideLoad = Math.max(0, axleLoad - outsideLoad)
        const reference = axleLoad / 2
        const muReference = gp ? 1.75 : 1.4
        const forceFor = (wheelLoad: number) => {
          const mu = muReference * clamp(1 - sensitivity * (wheelLoad / Math.max(1, reference) - 1), .55, 1.25)
          return mu * wheelLoad * Math.abs(tyreForceShape(slipDemand, gp ? 3.6 : 5.2))
        }
        const outsideForce = forceFor(outsideLoad)
        const insideForce = forceFor(insideLoad)
        const totalForce = outsideForce + insideForce
        const evenForce = 2 * forceFor(reference)
        const loss = clamp(1 - totalForce / Math.max(1, evenForce))
        return result([
          metric('outside-force', '外侧轮侧向力', 'Outside lateral force', outsideForce, 'N'),
          metric('inside-force', '内侧轮侧向力', 'Inside lateral force', insideForce, 'N'),
          metric('axle-force', '车轴总侧向力', 'Total axle force', totalForce, 'N'),
          metric('equal-load-loss', '相对均载损失', 'Loss versus equal load', loss * 100, '%', loss > .1 ? 'warn' : 'good'),
        ], curve(localTransfer => {
          const outside = axleLoad * (1 + localTransfer) / 2
          return forceFor(outside) + forceFor(axleLoad - outside)
        }, 0, .9, 31),
        l('载荷转移会让外轮更强、内轮更弱；由于摩擦系数具有负载敏感性，两轮总和通常低于均匀载荷。', 'Load transfer strengthens the outside tyre and weakens the inside one; load sensitivity usually makes their total lower than the equal-load case.'),
        [l('外轮载荷', 'Outside load'), l('内轮载荷', 'Inside load'), l('实际总力', 'Actual total'), l('均载基准', 'Equal-load reference')],
        [outsideLoad / axleLoad, insideLoad / axleLoad, totalForce / Math.max(1, evenForce), 1],
        { marker: transfer, risk: loss })
      },
    },
    {
      id: 'thermal-pressure-transient',
      title: l('胎温与胎压瞬态', 'Temperature and pressure transient'),
      question: l('冷态设定如何变成赛道热态？', 'How does a cold setting become an on-track hot state?'),
      mode: 'timeline',
      parameters: thermalParameters,
      evaluate: values => {
        const coldGauge = read(values, thermalParameters, 'coldPressure')
        const initialTemperature = read(values, thermalParameters, 'initialTemperature')
        const heatInput = read(values, thermalParameters, 'heatInput') * 1000
        const cooling = read(values, thermalParameters, 'cooling')
        const ambient = 25
        const thermalCapacity = gp ? 42000 : 15000
        const duration = gp ? 720 : 900
        const points: { x: number; y: number }[] = []
        const pressurePoints: { x: number; y: number }[] = []
        let temperature = initialTemperature
        let gaugePressure = coldGauge
        for (let index = 0; index <= 60; index += 1) {
          const time = duration * index / 60
          const lapPulse = .62 + .38 * Math.sin(index / 60 * Math.PI * 8) ** 2
          if (index > 0) {
            const dt = duration / 60
            temperature += (heatInput * lapPulse - cooling * (temperature - ambient)) / thermalCapacity * dt
          }
          const absolute = (coldGauge + AIR_PRESSURE_KPA) * (temperature + 273.15) / (initialTemperature + 273.15)
          const compliance = 1 + .035 * Math.max(0, absolute - (coldGauge + AIR_PRESSURE_KPA)) / Math.max(1, coldGauge + AIR_PRESSURE_KPA)
          gaugePressure = absolute / compliance - AIR_PRESSURE_KPA
          points.push({ x: time, y: temperature })
          pressurePoints.push({ x: time, y: gaugePressure })
        }
        const grip = tyreTemperatureFactor(temperature, optimumTemperature, gp ? 32 : 25) * clamp(1 - Math.abs(gaugePressure - (gp ? 190 : 82)) / (gp ? 160 : 80), .45, 1)
        const steadyLaps = clamp(thermalCapacity / Math.max(1, cooling) / (gp ? 90 : 75), .5, 12)
        return result([
          metric('hot-pressure', '热态表压', 'Hot gauge pressure', gaugePressure, 'kPa', gaugePressure > (gp ? 225 : 105) ? 'warn' : 'good'),
          metric('carcass-temperature', '胎体温度', 'Carcass temperature', temperature, '°C', Math.abs(temperature - optimumTemperature) > (gp ? 35 : 28) ? 'warn' : 'good'),
          metric('grip-window', '抓地窗口指数', 'Grip-window index', grip * 100, '%', grip < .65 ? 'danger' : grip < .82 ? 'warn' : 'good'),
          metric('steady-laps', '进入稳定所需圈数', 'Laps to steady state', steadyLaps, 'lap'),
        ], points, l('气体压力取决于绝对温度与胎体体积；热胎放气会改变下一次冷却后的起点。', 'Gas pressure depends on absolute temperature and carcass volume; bleeding a hot tyre changes the next cold starting point.'),
        [l('胎体温度', 'Carcass temperature'), l('绝对压力', 'Absolute pressure'), l('抓地窗口', 'Grip window'), l('冷却', 'Cooling')],
        [normalise(temperature, gp ? 40 : 20, gp ? 140 : 110), normalise(gaugePressure, gp ? 140 : 55, gp ? 240 : 120), grip, normalise(cooling, thermalParameters[3]!.min, thermalParameters[3]!.max)],
        { secondaryPoints: pressurePoints, marker: 1, risk: 1 - grip })
      },
    },
  ]
}

const tyreReferenceCards: InteractionReferenceCard[] = [
  {
    id: 'tyres-fsae-ttc', title: l('FSAE 轮胎试验数据库', 'FSAE tyre test data'),
    image: '/images/interactions/tires/reference-1.webp', imageAlt: l('平带轮胎力与力矩试验机', 'Flat-belt tyre force-and-moment test rig'),
    summary: l('把侧偏、滑移、载荷、外倾与胎压转化为可拟合数据。', 'Turns slip, load, camber and pressure into fit-ready data.'),
    purpose: l('用于标定 Student 轮胎响应面，并验证课程降阶模型的方向。', 'Calibrates Student tyre response surfaces and validates reduced-model trends.'),
    details: [l('受控平带可扫描载荷、转向与外倾。', 'A controlled flat belt sweeps load, steer and camber.'), l('数据库覆盖数百次试验与多种轮胎结构。', 'The database spans hundreds of tests and many constructions.'), l('拟合系数属于具体轮胎，不能跨型号复制。', 'Fitted coefficients are tyre-specific and cannot be copied across models.')],
    sourceTitle: l('FSAE TTC 官方网站', 'Official FSAE TTC site'), url: 'https://www.fsaettc.org/index.php',
  },
  {
    id: 'tyres-fia-2026', title: l('FIA 2026 轮胎与轮辋规则', 'FIA 2026 tyre and rim rules'),
    image: '/images/interactions/tires/reference-2.webp', imageAlt: l('轮辋量规、TPMS 与氮气设备', 'Rim gauge, TPMS and nitrogen equipment'),
    summary: l('明确尺寸、充气气体、加热方式与监测边界。', 'Defines dimensions, inflation gas, heating and monitoring boundaries.'),
    purpose: l('防止在 GP 模型中加入非法主动胎温或错误轮辋。', 'Prevents illegal active tyre conditioning or incorrect GP rims.'),
    details: [l('前后轮辋宽度不同，名义直径属于 18 英寸级。', 'Front and rear rim widths differ within the 18-inch class.'), l('充气介质只允许空气或氮气。', 'Only air or nitrogen may be used for inflation.'), l('压力与温度由规定 TPMS 监测。', 'Pressure and temperature are monitored by the prescribed TPMS.')],
    sourceTitle: l('FIA 2026 技术规则 Section C', 'FIA 2026 Technical Regulations Section C'), url: 'https://www.fia.com/system/files/documents/fia_2026_f1_regulations_-_section_c_technical_-_iss_19_-_2026-06-25.pdf',
  },
  {
    id: 'tyres-contact-patch', title: l('动态接地印迹', 'Dynamic contact patch'),
    image: '/images/interactions/tires/reference-3.webp', imageAlt: l('透明平带下的动态压力热图', 'Dynamic pressure map beneath a transparent belt'),
    summary: l('接地面积相似，不代表压力分布和剪切状态相同。', 'Similar patch area does not imply the same pressure or shear state.'),
    purpose: l('把静态墨印升级为动态压力形状、中心迁移和剪切区分析。', 'Moves from static prints to dynamic pressure shape, centre migration and shear zones.'),
    details: [l('印迹随载荷、压力和外倾变化。', 'The patch changes with load, pressure and camber.'), l('压力分布并不均匀。', 'Contact pressure is not uniform.'), l('影像应与六分力数据时间同步。', 'Images should be time-aligned with force-and-moment data.')],
    sourceTitle: l('Calspan 接地印迹研究', 'Calspan contact-patch research'), url: 'https://calspan.com/company/news/new-tire-research-method-measuring-contact-patch-shapes',
  },
]

const tyreFaultCardsFor = (vehicleId: VehicleId): InteractionFaultCard[] => {
  const gp = vehicleId === 'grand-prix-2026'
  return [
    {
      id: 'tyres-hot-bleed', title: l('热态放气后的低冷压', 'Low cold pressure after hot bleeding'), image: '/images/interactions/tires/fault-1.webp',
      imageAlt: l('压力表、热像与冷却曲线', 'Pressure gauge, thermal image and cooling trace'),
      scenario: gp ? l('右前轮热态表压从 180 升到 213 kPa，放到 190 kPa 后冷却只剩 151 kPa；胎肩比中心高 16°C。', 'The RF rises from 180 to 213 kPa hot, is bled to 190 kPa, then cools to 151 kPa; shoulders run 16°C hotter.') : l('右前轮热态表压从 76 升到 96 kPa，放到 80 kPa 后冷却只剩 61 kPa；胎肩比中心高 18°C。', 'The RF rises from 76 to 96 kPa hot, is bled to 80 kPa, then cools to 61 kPa; shoulders run 18°C hotter.'),
      strategy: l('保留冷态基准，记录绝压与温度，检查气门/胎圈泄漏，再由目标热态反求冷态设定。', 'Preserve the cold baseline, log absolute pressure and temperature, leak-check the valve and bead, then back-calculate the cold setting.'),
      principle: l('冷却会降低绝对压力；低压增加胎体挠曲与胎肩发热。', 'Cooling lowers absolute pressure; low pressure increases carcass flex and shoulder heating.'),
      evidence: l('冷态值可重复、热态进入标定窗、肩—中—肩温差收敛。', 'Cold values repeat, hot pressure enters the calibrated window and shoulder-centre spread converges.'),
    },
    {
      id: 'tyres-alignment-wear', title: l('定位异常与单侧磨耗', 'Alignment error and one-sided wear'), image: '/images/interactions/tires/fault-2.webp',
      imageAlt: l('定位平台与羽状磨耗微距', 'Alignment platform and feathered-wear macro'),
      scenario: gp ? l('12 圈后左前内肩高 24°C，动态外倾达到 −3.7°，前束比基线多 0.28°，内肩出现羽状磨耗。', 'After 12 laps the LF inner shoulder is 24°C hotter, dynamic camber reaches −3.7° and toe is 0.28° beyond baseline with feathering.') : l('12 圈后左前内肩高 24°C，静态外倾 −3.2°，前束比基线多 0.35°，内肩摸起来像热砂纸。', 'After 12 laps the LF inner shoulder is 24°C hotter, static camber is −3.2° and toe is 0.35° beyond baseline; the inner edge feels like hot sandpaper.'),
      strategy: l('先复核胎压和温度计，再在加载车高测外倾、前束、轮毂间隙与拉杆锁紧。', 'Verify pressure and pyrometer first, then measure loaded camber, toe, hub play and tie-rod locking.'),
      principle: l('外倾把载荷偏向胎肩，前束误差产生持续横向擦洗；两者同时抬升温度和滚阻。', 'Camber biases shoulder load while toe error creates continuous scrub; both raise temperature and rolling loss.'),
      evidence: l('定位值回到公差、三点温度更均衡、直线方向盘居中且磨耗不再恶化。', 'Alignment returns to tolerance, three-point temperatures flatten, steering centres and wear stops worsening.'),
    },
    {
      id: 'tyres-combined-slip', title: l('组合滑移饱和', 'Combined-slip saturation'), image: '/images/interactions/tires/fault-3.webp',
      imageAlt: l('入弯轨迹与四轮摩擦圆遥测', 'Turn-in trace with four tyre friction circles'),
      scenario: gp ? l('入弯前轮纵向利用率 0.88、横向需求 0.72，合成利用率 1.14；方向盘再加 12°，横向加速度没有增加。', 'At turn-in front longitudinal utilisation is 0.88 and lateral demand 0.72, combined utilisation 1.14; another 12° steering adds no lateral acceleration.') : l('入弯前轮纵向利用率 0.91、横向需求 0.68，合成利用率 1.14；方向盘再加 18°，车头仍推直。', 'At turn-in front longitudinal utilisation is 0.91 and lateral demand 0.68, combined utilisation 1.14; another 18° steering still pushes wide.'),
      strategy: l('同步车速、轮速、制动压力与转角，画四轮利用率；用平滑松刹与正确制动平衡恢复横向储备。', 'Synchronise speed, wheel speed, pressure and steer, plot four utilisations, and restore lateral reserve with smooth brake release and correct balance.'),
      principle: l('轮胎已在摩擦边界，额外需求只能重新分配有限合力并增加热。', 'The tyre is already at the friction boundary; more demand only reallocates finite resultant force and adds heat.'),
      evidence: l('利用率不再持续越界，松刹时横向力平滑上升，所需方向盘角下降。', 'Utilisation no longer remains outside the boundary, lateral force rises smoothly on release and steering demand falls.'),
    },
  ]
}

export const tiresInteractionPack: PartInteractionPack = {
  partId: 'tires', theme: '#ffb34d', experimentsFor: tyreExperimentsFor, referenceCards: tyreReferenceCards, faultCardsFor: tyreFaultCardsFor,
}

const brakeExperimentsFor = (vehicleId: VehicleId): InteractionExperiment[] => {
  const gp = vehicleId === 'grand-prix-2026'
  const hydraulicParameters = [
    parameter('pedalForce', '踏板力', 'Pedal force', 0, gp ? 1600 : 800, gp ? 20 : 10, gp ? 800 : 450, 'N'),
    parameter('pedalRatio', '踏板杠杆比', 'Pedal ratio', gp ? 3 : 3.5, gp ? 5.5 : 6.5, .1, gp ? 4.2 : 5, ':1'),
    parameter('masterBore', '主缸直径', 'Master-cylinder bore', gp ? 16 : 14, gp ? 25 : 22, .2, gp ? 19 : 17.8, 'mm'),
    parameter('caliperArea', '卡钳单侧活塞面积', 'One-side caliper area', gp ? 20 : 8, gp ? 60 : 24, .5, gp ? 36 : 14, 'cm²'),
  ]
  const balanceParameters = [
    parameter('deceleration', '目标减速度', 'Target deceleration', 0, gp ? 5.5 : 1.6, .05, gp ? 3.5 : 1, 'g'),
    parameter('frontShare', '前轴制动占比', 'Front brake share', 40, gp ? 75 : 80, 1, gp ? 55 : 58, '%'),
    parameter('cgHeight', '重心高度', 'CG height', 180, gp ? 350 : 420, 5, gp ? 250 : 280, 'mm'),
    parameter('grip', '抓地系数', 'Grip coefficient', gp ? .8 : .6, gp ? 2.2 : 1.8, .05, gp ? 1.7 : 1.3, 'μ'),
  ]
  const energyParameters = [
    parameter('initialSpeed', '初速度', 'Initial speed', gp ? 120 : 40, gp ? 350 : 140, 5, gp ? 300 : 100, 'km/h'),
    parameter('finalSpeed', '末速度', 'Final speed', 0, gp ? 250 : 100, 5, gp ? 90 : 30, 'km/h'),
    parameter('mass', '整车质量', 'Vehicle mass', gp ? 700 : 180, gp ? 850 : 350, gp ? 5 : 2, gp ? 770 : 260, 'kg'),
    parameter('rotorCapacity', '单盘热容', 'Thermal capacity per rotor', gp ? 1 : .5, gp ? 4 : 2.5, .1, gp ? 2.1 : 1.2, 'kJ/K'),
  ]
  const thermalParameters = [
    parameter('energyPerStop', '单盘每次吸收能量', 'Energy per rotor per stop', gp ? 200 : 10, gp ? 1500 : 120, gp ? 20 : 2, gp ? 700 : 45, 'kJ'),
    parameter('stopInterval', '制动间隔', 'Stop interval', gp ? 4 : 5, gp ? 20 : 45, 1, gp ? 9 : 18, 's'),
    parameter('airflow', '风道质量流量', 'Duct mass flow', gp ? .05 : 0, gp ? .6 : .2, .01, gp ? .28 : .06, 'kg/s'),
    parameter('initialRotorTemp', '初始盘温', 'Initial rotor temperature', gp ? 200 : 20, gp ? 700 : 300, 5, gp ? 350 : 80, '°C'),
  ]
  const blendParameters = [
    parameter('brakePower', '目标制动功率', 'Requested braking power', 0, gp ? 1200 : 100, gp ? 20 : 2, gp ? 500 : 35, 'kW'),
    parameter('regenLimit', '再生功率上限', 'Regeneration limit', 0, gp ? 350 : 80, gp ? 10 : 2, gp ? 120 : 30, 'kW'),
    parameter('soc', '电池 SOC', 'Battery SOC', 10, 100, 1, gp ? 55 : 60, '%'),
    parameter('handover', '液压接管时间', 'Hydraulic handover time', 0, gp ? 200 : 300, 5, gp ? 50 : 80, 'ms'),
  ]

  return [
    {
      id: 'hydraulic-chain', title: l('液压传力链', 'Hydraulic force chain'), question: l('脚力如何变成盘上制动力矩？', 'How does pedal effort become rotor torque?'), mode: 'flow', parameters: hydraulicParameters,
      evaluate: values => {
        const pedalForce = read(values, hydraulicParameters, 'pedalForce')
        const pedalRatio = read(values, hydraulicParameters, 'pedalRatio')
        const bore = read(values, hydraulicParameters, 'masterBore') / 1000
        const caliperArea = read(values, hydraulicParameters, 'caliperArea') * 1e-4
        const masterArea = Math.PI * bore * bore / 4
        const linePressurePa = pedalForce * pedalRatio * .94 / Math.max(EPSILON, masterArea)
        const linePressureBar = linePressurePa / 1e5
        const clampForce = 2 * linePressurePa * caliperArea * .96
        const padMu = gp ? .48 : .42
        const effectiveRadius = gp ? .15 : .095
        const torque = padMu * clampForce * effectiveRadius
        const compliance = gp ? 3.2e-13 : 5.5e-13
        // Hydraulic compliance first creates master-cylinder stroke; the pedal
        // travels farther than the piston by the pedal ratio.
        const pedalTravel = linePressurePa * compliance / Math.max(EPSILON, masterArea) * pedalRatio * 1000
        const pressureLimit = gp ? 150 : 120
        return result([
          metric('line-pressure', '管路压力', 'Line pressure', linePressureBar, 'bar', linePressureBar > pressureLimit ? 'danger' : linePressureBar > pressureLimit * .85 ? 'warn' : 'good'),
          metric('clamp-force', '卡钳夹紧力', 'Caliper clamp force', clampForce, 'N'),
          metric('wheel-torque', '单轮制动力矩', 'Wheel brake torque', torque, 'N·m'),
          metric('pedal-travel', '估算踏板行程', 'Estimated pedal travel', pedalTravel, 'mm', pedalTravel > (gp ? 80 : 65) ? 'warn' : 'good'),
        ], curve(force => {
          const pressure = force * pedalRatio * .94 / Math.max(EPSILON, masterArea)
          return padMu * (2 * pressure * caliperArea * .96) * effectiveRadius
        }, 0, hydraulicParameters[0]!.max, 31),
        l('小主缸用更长行程换更高压力；踏板比只交换力与位移，并不会创造能量。', 'A smaller master cylinder trades more travel for more pressure; pedal ratio exchanges force and displacement rather than creating energy.'),
        [l('踏板', 'Pedal'), l('主缸', 'Master cylinder'), l('卡钳', 'Caliper'), l('制动盘', 'Rotor')],
        [normalise(pedalForce, 0, hydraulicParameters[0]!.max), normalise(linePressureBar, 0, pressureLimit), normalise(clampForce, 0, gp ? 70000 : 22000), normalise(torque, 0, gp ? 5200 : 900)],
        { marker: normalise(pedalForce, 0, hydraulicParameters[0]!.max), risk: normalise(linePressureBar, pressureLimit * .7, pressureLimit * 1.1) })
      },
    },
    {
      id: 'dynamic-balance', title: l('动态制动平衡', 'Dynamic brake balance'), question: l('哪一轴会先达到锁止边界？', 'Which axle reaches the lock boundary first?'), mode: 'geometry', parameters: balanceParameters,
      evaluate: values => {
        const decelerationG = read(values, balanceParameters, 'deceleration')
        const frontShare = read(values, balanceParameters, 'frontShare') / 100
        const cgHeight = read(values, balanceParameters, 'cgHeight') / 1000
        const grip = read(values, balanceParameters, 'grip')
        const mass = gp ? 770 : 260
        const wheelbase = gp ? 3.55 : 1.6
        const staticFront = gp ? .46 : .48
        const speed = gp ? 70 : 28
        const totalAero = gp ? 1.05 * 1.18 * speed * speed * 1.55 : .5 * 1.18 * speed * speed * .45
        const aeroFront = totalAero * (gp ? .47 : .5)
        const transfer = mass * decelerationG * G * cgHeight / wheelbase
        const frontLoad = Math.max(1, mass * G * staticFront + transfer + aeroFront)
        const rearLoad = Math.max(1, mass * G * (1 - staticFront) - transfer + totalAero - aeroFront)
        const requiredForce = mass * decelerationG * G
        const frontUtilisation = frontShare * requiredForce / Math.max(1, grip * frontLoad)
        const rearUtilisation = (1 - frontShare) * requiredForce / Math.max(1, grip * rearLoad)
        const firstLock = frontUtilisation >= rearUtilisation ? -1 : 1
        return result([
          metric('front-load', '动态前轴载荷', 'Dynamic front-axle load', frontLoad, 'N'),
          metric('rear-load', '动态后轴载荷', 'Dynamic rear-axle load', rearLoad, 'N'),
          metric('front-utilisation', '前轴利用率', 'Front utilisation', frontUtilisation * 100, '%', frontUtilisation > 1 ? 'danger' : frontUtilisation > .9 ? 'warn' : 'good'),
          metric('rear-utilisation', '后轴利用率', 'Rear utilisation', rearUtilisation * 100, '%', rearUtilisation > 1 ? 'danger' : rearUtilisation > .9 ? 'warn' : 'good'),
        ], curve(share => Math.max(
          share * requiredForce / Math.max(1, grip * frontLoad),
          (1 - share) * requiredForce / Math.max(1, grip * rearLoad),
        ), .4, .8, 41),
        l('强制动把机械载荷转到前轴；平衡过前会先前锁，过后则会损失后轴方向稳定。', 'Hard braking transfers mechanical load forward; too much front share locks the front first, while too much rear share removes rear directional stability.'),
        [l('左前', 'Front left'), l('左后', 'Rear left'), l('右前', 'Front right'), l('右后', 'Rear right')],
        [clamp(frontLoad / (mass * G)), clamp(rearLoad / (mass * G)), clamp(frontUtilisation), clamp(rearUtilisation)],
        { marker: normalise(frontShare, .4, .8), risk: clamp(Math.max(frontUtilisation, rearUtilisation)), direction: firstLock })
      },
    },
    {
      id: 'stop-energy', title: l('制动能量', 'Braking energy'), question: l('高速制动中有多少能量进入每个制动盘？', 'How much high-speed energy reaches each rotor?'), mode: 'distribution', parameters: energyParameters,
      evaluate: values => {
        const initialSpeed = read(values, energyParameters, 'initialSpeed') / 3.6
        const requestedFinalSpeed = read(values, energyParameters, 'finalSpeed') / 3.6
        const finalSpeed = Math.min(initialSpeed, requestedFinalSpeed)
        const mass = read(values, energyParameters, 'mass')
        const rotorCapacity = read(values, energyParameters, 'rotorCapacity')
        const kineticEnergy = .5 * mass * Math.max(0, initialSpeed * initialSpeed - finalSpeed * finalSpeed) / 1000
        const aeroShare = clamp((initialSpeed / (gp ? 100 : 45)) ** 2 * (gp ? .11 : .025), 0, gp ? .28 : .08)
        const regenShare = gp ? .12 : .22
        const frictionEnergy = kineticEnergy * (1 - aeroShare - regenShare)
        const frontShare = gp ? .55 : .58
        const frontRotorEnergy = frictionEnergy * frontShare / 2
        const rearRotorEnergy = frictionEnergy * (1 - frontShare) / 2
        const temperatureRise = frontRotorEnergy / Math.max(.1, rotorCapacity)
        const stopTime = Math.max(.5, (initialSpeed - finalSpeed) / (gp ? 35 : 10))
        return result([
          metric('kinetic-energy', '待耗散动能', 'Kinetic energy removed', kineticEnergy, 'kJ'),
          metric('front-rotor-energy', '单个前盘能量', 'Energy per front rotor', frontRotorEnergy, 'kJ'),
          metric('front-rotor-rise', '理想前盘温升', 'Ideal front-rotor rise', temperatureRise, '°C', temperatureRise > (gp ? 550 : 300) ? 'warn' : 'good'),
          metric('average-power', '平均单盘功率', 'Average power per rotor', frontRotorEnergy / stopTime, 'kW'),
        ], curve(speed => .5 * mass * Math.max(0, speed * speed - finalSpeed * finalSpeed) / 1000, finalSpeed, Math.max(finalSpeed + .1, initialSpeed), 31),
        l('动能随速度平方增长；初速度的小幅提高，会显著增加制动盘必须吸收的能量。', 'Kinetic energy grows with speed squared; a modest increase in entry speed greatly increases rotor energy.'),
        [l('左前盘', 'Front-left rotor'), l('右前盘', 'Front-right rotor'), l('左后盘', 'Rear-left rotor'), l('右后盘', 'Rear-right rotor'), l('空气/再生', 'Aero/regen')],
        [frontRotorEnergy / Math.max(1, kineticEnergy), frontRotorEnergy / Math.max(1, kineticEnergy), rearRotorEnergy / Math.max(1, kineticEnergy), rearRotorEnergy / Math.max(1, kineticEnergy), aeroShare + regenShare],
        { marker: normalise(initialSpeed * 3.6, energyParameters[0]!.min, energyParameters[0]!.max), risk: normalise(temperatureRise, gp ? 250 : 120, gp ? 700 : 400) })
      },
    },
    {
      id: 'thermal-fade', title: l('重复制动热衰退', 'Repeated-stop thermal fade'), question: l('风道何时能守住摩擦与液体温度？', 'When can the duct protect friction and fluid temperature?'), mode: 'timeline', parameters: thermalParameters,
      evaluate: values => {
        const energy = read(values, thermalParameters, 'energyPerStop') * 1000
        const interval = read(values, thermalParameters, 'stopInterval')
        const airflow = read(values, thermalParameters, 'airflow')
        const initialTemperature = read(values, thermalParameters, 'initialRotorTemp')
        const capacity = gp ? 2100 : 1200
        const ambient = 30
        const baseCooling = gp ? 32 : 13
        const cooling = baseCooling + airflow * (gp ? 820 : 420)
        const points: { x: number; y: number }[] = []
        const frictionPoints: { x: number; y: number }[] = []
        let rotorTemperature = initialTemperature
        let peak = initialTemperature
        for (let stop = 0; stop < 12; stop += 1) {
          rotorTemperature += energy / capacity
          peak = Math.max(peak, rotorTemperature)
          const friction = gp
            ? clamp(1 - Math.abs(rotorTemperature - 525) / 950, .48, 1)
            : clamp(1 - Math.max(0, rotorTemperature - 500) / 600 - Math.max(0, 80 - rotorTemperature) / 300, .45, 1)
          points.push({ x: stop * interval, y: rotorTemperature })
          frictionPoints.push({ x: stop * interval, y: friction * 100 })
          const decay = Math.exp(-cooling * interval / capacity)
          rotorTemperature = ambient + (rotorTemperature - ambient) * decay
        }
        const caliperTemperature = ambient + (peak - ambient) * (gp ? .24 : .32)
        const fluidTemperature = ambient + (caliperTemperature - ambient) * .72
        const effectiveMu = gp ? .5 * clamp(1 - Math.abs(peak - 525) / 950, .48, 1) : .42 * clamp(1 - Math.max(0, peak - 500) / 600, .45, 1)
        const margin = gp ? 1000 - peak : Math.min(310 - fluidTemperature, 650 - peak)
        return result([
          metric('peak-rotor-temp', '峰值盘温', 'Peak rotor temperature', peak, '°C', margin < 0 ? 'danger' : margin < (gp ? 120 : 50) ? 'warn' : 'good'),
          metric('fluid-temp', '制动液估算温度', 'Estimated fluid temperature', fluidTemperature, '°C', fluidTemperature > 260 ? 'danger' : fluidTemperature > 210 ? 'warn' : 'good'),
          metric('effective-pad-mu', '有效片摩擦', 'Effective pad friction', effectiveMu, 'μ', effectiveMu < (gp ? .34 : .3) ? 'warn' : 'good'),
          metric('fade-margin', '热衰退余量', 'Fade margin', margin, '°C', margin < 0 ? 'danger' : margin < (gp ? 120 : 50) ? 'warn' : 'good'),
        ], points, l('风量提高可减小热累积，但碳盘过冷也会损失摩擦；真正目标是守住材料工作窗。', 'More airflow reduces heat accumulation, but an under-temperature carbon rotor also loses friction; the target is the material window.'),
        [l('制动盘', 'Rotor'), l('摩擦片', 'Pad'), l('卡钳', 'Caliper'), l('制动液', 'Fluid')],
        [normalise(peak, 20, gp ? 1100 : 700), normalise(effectiveMu, .2, .55), normalise(caliperTemperature, 30, gp ? 250 : 220), normalise(fluidTemperature, 30, 300)],
        { secondaryPoints: frictionPoints, marker: 1, risk: clamp(1 - Math.max(0, margin) / (gp ? 500 : 200)) })
      },
    },
    {
      id: 'regen-blend', title: l('再生与液压混合', 'Regenerative-hydraulic blending'), question: l('再生消失时，液压能否无缝接管？', 'Can hydraulics take over smoothly when regeneration disappears?'), mode: 'field', parameters: blendParameters,
      evaluate: values => {
        const requestedPower = read(values, blendParameters, 'brakePower')
        const regenLimit = read(values, blendParameters, 'regenLimit')
        const soc = read(values, blendParameters, 'soc')
        const handover = read(values, blendParameters, 'handover')
        const socFactor = clamp((95 - soc) / 35, 0, 1)
        const speedFactor = .88
        const regenPower = Math.min(requestedPower, regenLimit * socFactor * speedFactor)
        const hydraulicPower = Math.max(0, requestedPower - regenPower)
        const frontHydraulic = hydraulicPower * (gp ? .58 : .62)
        const rearHydraulic = hydraulicPower - frontHydraulic
        const eventDuration = gp ? 2.4 : 4.2
        const recoveredEnergy = regenPower * eventDuration / 3600 * .88
        const gap = clamp(handover / (gp ? 200 : 300) * (regenPower / Math.max(1, requestedPower)))
        return result([
          metric('regen-power', '再生功率', 'Regenerative power', regenPower, 'kW'),
          metric('front-hydraulic', '前液压功率', 'Front hydraulic power', frontHydraulic, 'kW'),
          metric('rear-hydraulic', '后液压功率', 'Rear hydraulic power', rearHydraulic, 'kW'),
          metric('recovered-energy', '本次回收能量', 'Recovered energy', recoveredEnergy, 'kWh'),
        ], curve(time => {
          const ramp = 1 - Math.exp(-time * 1000 / Math.max(1, handover + 20))
          return regenPower + hydraulicPower * ramp
        }, 0, eventDuration, 41),
        l('高 SOC 或低转速会收窄再生能力；液压回路必须填补差额，且不能依赖再生完成安全制动。', 'High SOC or low speed narrows regenerative capability; hydraulics must fill the gap and safety braking cannot depend on regeneration.'),
        [l('制动需求', 'Brake request'), l('再生', 'Regeneration'), l('前液压', 'Front hydraulic'), l('后液压', 'Rear hydraulic'), l('接管缺口', 'Handover gap')],
        [1, regenPower / Math.max(1, requestedPower), frontHydraulic / Math.max(1, requestedPower), rearHydraulic / Math.max(1, requestedPower), gap],
        { marker: normalise(soc, 10, 100), risk: gap })
      },
    },
  ]
}

const brakeReferenceCards: InteractionReferenceCard[] = [
  {
    id: 'brakes-fia-c11', title: l('FIA 双回路与后制动控制', 'FIA dual circuits and rear-brake control'), image: '/images/interactions/brakes/reference-1.webp',
    imageAlt: l('透明踏板盒与双液压回路', 'Transparent pedal box and dual hydraulic circuits'), summary: l('电子控制参与后制动，仍必须保留独立液压回退。', 'Powered rear-brake control still requires independent hydraulic fallback.'),
    purpose: l('建立合法 GP 制动架构、失效路径与左右对称约束。', 'Build a legal GP brake architecture, failure path and left-right symmetry.'),
    details: [l('一个踏板驱动两个主缸和两个回路。', 'One pedal operates two master cylinders and two circuits.'), l('后液压回路必须满足规定的独立扭矩能力。', 'The rear hydraulic circuit must retain the prescribed independent torque capability.'), l('禁止 ABS 与同轴左右非对称制动力矩。', 'ABS and within-axle asymmetric brake torque are prohibited.')],
    sourceTitle: l('FIA 2026 技术规则 Section C', 'FIA 2026 Technical Regulations Section C'), url: 'https://www.fia.com/system/files/documents/fia_2026_f1_regulations_-_section_c_technical_-_iss_19_-_2026-06-25.pdf',
  },
  {
    id: 'brakes-brembo-carbon', title: l('Brembo 碳盘温度与传感', 'Brembo carbon-rotor temperature and sensing'), image: '/images/interactions/brakes/reference-2.webp',
    imageAlt: l('发光碳盘、红外相机与风道 CFD', 'Glowing carbon rotor, IR camera and duct CFD'), summary: l('碳盘需要工作温区，而不是越冷越好。', 'Carbon rotors need an operating window rather than maximum cooling.'),
    purpose: l('标定碳盘温度曲线、风道权衡与传感器读数。', 'Calibrate carbon-rotor temperature curves, duct trade-offs and sensor readings.'),
    details: [l('碳盘可经历超过 1000°C 的峰值。', 'Carbon rotors can experience peaks above 1000°C.'), l('通风孔与 CFD 用于控制温度均匀性。', 'Ventilation holes and CFD manage temperature uniformity.'), l('盘片温度、压力和主缸行程均可监测。', 'Rotor/pad temperature, pressure and master travel can be monitored.')],
    sourceTitle: l('Brembo Formula 1 制动', 'Brembo Formula 1 braking'), url: 'https://www.brembo.com/en/motorsport/formula1',
  },
  {
    id: 'brakes-tilton-balance', title: l('Tilton 平衡杆校准', 'Tilton balance-bar calibration'), image: '/images/interactions/brakes/reference-3.webp',
    imageAlt: l('剖切踏板盒、游标卡尺与双压力表', 'Cutaway pedal box, caliper and twin pressure gauges'), summary: l('旋钮改变两主缸的推力比例，不是凭空增加总制动力。', 'The adjuster redistributes master-cylinder force; it does not create braking effort.'),
    purpose: l('解释平衡杆几何、居中、锁紧与实测压力验证。', 'Explain balance-bar geometry, centring, locking and pressure verification.'),
    details: [l('球面支点在两个主缸之间分配推力。', 'A spherical pivot distributes force between two master cylinders.'), l('错误推杆间距会造成侧载与卡滞。', 'Incorrect pushrod spacing causes side load and binding.'), l('调节后应实测两回路压力。', 'Both circuit pressures should be measured after adjustment.')],
    sourceTitle: l('Tilton 900 Series Balance Bar 手册', 'Tilton 900 Series Balance Bar manual'), url: 'https://tiltonracing.com/wp-content/uploads/2013/07/98-1251-900-Series-Balance-Bar.pdf',
  },
]

const brakeFaultCardsFor = (vehicleId: VehicleId): InteractionFaultCard[] => {
  const gp = vehicleId === 'grand-prix-2026'
  return [
    {
      id: 'brakes-long-pedal', title: l('热态长踏板', 'Long hot pedal'), image: '/images/interactions/brakes/fault-1.webp', imageAlt: l('卡钳热像、排气气泡与踏板位移', 'Caliper thermography, bleed bubbles and pedal travel'),
      scenario: gp ? l('连续重刹后前盘 960°C、卡钳 205°C，踏板行程从 31 mm 增至 58 mm，第二脚暂时变硬。', 'After repeated stops the front rotor reaches 960°C and caliper 205°C; pedal travel grows 31→58 mm and briefly firms after pumping.') : l('连续 8 次重刹后前盘 610°C、卡钳 188°C，踏板行程从 42 mm 增至 78 mm，第一脚像海绵。', 'After eight hard stops the front rotor reaches 610°C and caliper 188°C; pedal travel grows 42→78 mm and the first stroke feels spongy.'),
      strategy: l('停驶冷却；检查含水率/沸点、排气、隔热、活塞回缩和软管膨胀，换液后做保压与重复制动试验。', 'Stop and cool; check moisture/boiling point, bleeding, insulation, piston knock-back and hose expansion, then pressure-hold and repeat-stop test.'),
      principle: l('蒸汽可压缩使行程增长；第二脚变硬是线索，但也要排除泄漏、旁通和回缩。', 'Compressible vapour lengthens travel; pumping is a clue, but leakage, bypass and knock-back must also be excluded.'),
      evidence: l('保压稳定、无气泡、热态行程可重复，盘与液体温度低于标定边界。', 'Pressure holds, no bubbles remain, hot travel repeats and rotor/fluid temperatures stay within calibrated limits.'),
    },
    {
      id: 'brakes-rear-lock', title: l('后轴先锁', 'Rear-first lock'), image: '/images/interactions/brakes/fault-2.webp', imageAlt: l('制动轮速与横摆叠加图', 'Brake wheel-speed and yaw overlay'),
      scenario: gp ? l('270 km/h 重刹后段后轴利用率升至 1.05，右后轮速在 140 ms 内降到车速 18%，横摆率突增 34°/s。', 'Late in a stop from 270 km/h rear utilisation reaches 1.05, RR wheel speed falls to 18% in 140 ms and yaw rate spikes 34°/s.') : l('95 km/h 制动时后轴利用率 1.07、前轴 0.82，右后轮速在 180 ms 内掉到车速 22%，车尾突然旋转。', 'At 95 km/h rear utilisation is 1.07 versus front 0.82; RR wheel speed falls to 22% in 180 ms and the rear suddenly rotates.'),
      strategy: l('排除轮速/轮胎与单边卡滞，检查平衡杆、后压力、载荷转移和再生叠加，降低后占比后做递增直线制动。', 'Exclude sensor/tyre and one-sided drag, inspect balance, rear pressure, load transfer and regen stacking, then ramp-test with reduced rear share.'),
      principle: l('后轴动态载荷下降而制动力未同步下降，饱和后失去横向稳定；左右差异还会产生横摆矩。', 'Rear load falls while brake demand remains; saturation removes lateral stability and left-right split adds yaw moment.'),
      evidence: l('同轴轮速匹配、前后利用率均有余量、制动横摆接近零。', 'Axle wheel speeds match, both axle utilisations retain margin and brake yaw approaches zero.'),
    },
    {
      id: 'brakes-torque-variation', title: l('周期制动力矩波动', 'Cyclic brake-torque variation'), image: '/images/interactions/brakes/fault-3.webp', imageAlt: l('盘裂纹、千分表和锥形磨耗片', 'Rotor crack, dial indicator and tapered pad'),
      scenario: gp ? l('恒定压力下左前轮端扭矩每转波动 ±8%，盘孔边有 6 mm 裂纹，内外片厚差 0.9 mm。', 'At constant pressure LF wheel torque varies ±8% once per revolution; a 6 mm crack leaves a disc hole and pad taper is 0.9 mm.') : l('恒定压力下左前轮端扭矩每转波动 ±11%，盘孔边有 9 mm 裂纹，内外片厚差 1.4 mm。', 'At constant pressure LF wheel torque varies ±11% once per revolution; a 9 mm crack leaves a rotor hole and pad taper is 1.4 mm.'),
      strategy: l('隔离零件，测盘厚变化/跳动、卡钳刚度与导向，按制造商报废标准更换并重新床合。', 'Quarantine the part, measure thickness variation/runout and caliper guidance, replace to manufacturer limits and re-bed.'),
      principle: l('局部刚度、摩擦或厚度变化把恒定夹紧力转为周期扭矩；孔边热应力可推进裂纹。', 'Local stiffness, friction or thickness variation converts steady clamp force into cyclic torque; hole-edge thermal stress can propagate cracks.'),
      evidence: l('新件无裂纹、跳动/厚差合格、恒压扭矩纹波显著下降且左右盘温对称。', 'The replacement is crack-free, runout/thickness are in tolerance, torque ripple falls and temperatures are symmetric.'),
    },
  ]
}

export const brakesInteractionPack: PartInteractionPack = {
  partId: 'brakes', theme: '#ff6c63', experimentsFor: brakeExperimentsFor, referenceCards: brakeReferenceCards, faultCardsFor: brakeFaultCardsFor,
}

const frontSuspensionExperimentsFor = (vehicleId: VehicleId): InteractionExperiment[] => {
  const gp = vehicleId === 'grand-prix-2026'
  const springParameters = [
    parameter('springRate', '弹簧刚度', 'Spring rate', gp ? 100 : 20, gp ? 500 : 100, gp ? 10 : 2, gp ? 260 : 55, 'N/mm'),
    parameter('motionRatio', '运动比', 'Motion ratio', .45, gp ? 1.2 : 1.1, .01, gp ? .8 : .75, 'xs/xw'),
    parameter('tyreRate', '轮胎垂向刚度', 'Tyre vertical rate', gp ? 180 : 80, gp ? 600 : 250, gp ? 10 : 5, gp ? 360 : 150, 'N/mm'),
    parameter('sprungMass', '簧上角质量', 'Sprung corner mass', gp ? 120 : 35, gp ? 230 : 90, gp ? 5 : 1, gp ? 175 : 55, 'kg'),
  ]
  const camberParameters = [
    parameter('staticCamber', '静态外倾', 'Static camber', -4, 0, .1, gp ? -2.5 : -1.5, '°'),
    parameter('camberGain', '外倾增益', 'Camber gain', gp ? -2 : -1.5, 0, .05, gp ? -.8 : -.55, '°/25 mm'),
    parameter('bodyRoll', '车身侧倾', 'Body roll', gp ? -2 : -4, gp ? 2 : 4, .1, gp ? .6 : 1.5, '°'),
    parameter('wheelTravel', '轮端行程', 'Wheel travel', gp ? -30 : -40, gp ? 30 : 40, 1, gp ? 12 : 20, 'mm'),
  ]
  const rollCentreParameters = [
    parameter('rollCentreHeight', '前滚心高度', 'Front roll-centre height', -20, gp ? 100 : 120, 2, gp ? 25 : 35, 'mm'),
    parameter('track', '前轮距', 'Front track', gp ? 1500 : 1100, gp ? 1700 : 1500, 10, gp ? 1600 : 1250, 'mm'),
    parameter('lateralForce', '前轴侧向力', 'Front-axle lateral force', 0, gp ? 25000 : 5000, gp ? 500 : 100, gp ? 12000 : 2200, 'N'),
    parameter('rollStiffness', '前轴滚转刚度', 'Front roll stiffness', gp ? 3000 : 300, gp ? 15000 : 1800, gp ? 250 : 50, gp ? 8000 : 800, 'N·m/deg'),
  ]
  const antiDiveParameters = [
    parameter('antiDive', 'Anti-dive 比例', 'Anti-dive', 0, 100, 2, gp ? 45 : 25, '%'),
    parameter('deceleration', '制动减速度', 'Braking deceleration', 0, gp ? 5.5 : 1.6, .05, gp ? 3.5 : 1, 'g'),
    parameter('cgHeight', '重心高度', 'CG height', 180, gp ? 350 : 420, 5, gp ? 250 : 280, 'mm'),
    parameter('frontRideRate', '前轴乘坐刚度', 'Front ride rate', gp ? 120 : 20, gp ? 600 : 120, gp ? 10 : 2, gp ? 300 : 60, 'N/mm'),
  ]
  const damperParameters = [
    parameter('shaftSpeed', '活塞速度', 'Shaft speed', gp ? -1.5 : -1, gp ? 1.5 : 1, .02, gp ? .25 : .2, 'm/s'),
    parameter('lowSpeedDamping', '低速阻尼系数', 'Low-speed damping', gp ? 3000 : 500, gp ? 20000 : 5000, gp ? 250 : 100, gp ? 9000 : 2200, 'N·s/m'),
    parameter('highSpeedDamping', '高速阻尼系数', 'High-speed damping', gp ? 2000 : 300, gp ? 14000 : 3500, gp ? 250 : 100, gp ? 6000 : 1200, 'N·s/m'),
    parameter('kneeSpeed', 'Blow-off 拐点', 'Blow-off knee', .05, gp ? .6 : .5, .01, gp ? .25 : .2, 'm/s'),
  ]

  return [
    {
      id: 'wheel-rate', title: l('车轮刚度与运动比', 'Wheel rate and motion ratio'), question: l('同一根弹簧为什么会有不同轮端刚度？', 'Why can the same spring create a different wheel rate?'), mode: 'geometry', parameters: springParameters,
      evaluate: values => {
        const springRate = read(values, springParameters, 'springRate')
        const motionRatio = read(values, springParameters, 'motionRatio')
        const tyreRate = read(values, springParameters, 'tyreRate')
        const sprungMass = read(values, springParameters, 'sprungMass')
        const wheelRate = springRate * motionRatio * motionRatio * .96
        const rideRate = wheelRate * tyreRate / Math.max(EPSILON, wheelRate + tyreRate)
        const naturalFrequency = Math.sqrt(rideRate * 1000 / sprungMass) / (2 * Math.PI)
        const staticDeflection = sprungMass * G / Math.max(EPSILON, wheelRate)
        return result([
          metric('wheel-rate', '车轮刚度', 'Wheel rate', wheelRate, 'N/mm'),
          metric('ride-rate', '乘坐刚度', 'Ride rate', rideRate, 'N/mm'),
          metric('natural-frequency', '固有频率', 'Natural frequency', naturalFrequency, 'Hz', naturalFrequency > (gp ? 7 : 3.5) ? 'warn' : 'good'),
          metric('static-deflection', '静态压缩', 'Static deflection', staticDeflection, 'mm'),
        ], curve(ratio => springRate * ratio * ratio * .96, springParameters[1]!.min, springParameters[1]!.max, 31),
        l('运动比对车轮刚度是平方效应；轮胎与悬架串联后，乘坐刚度总小于单独的车轮刚度。', 'Motion ratio affects wheel rate by its square; the series tyre-suspension ride rate is always below the suspension wheel rate.'),
        [l('车轮', 'Wheel'), l('推杆', 'Pushrod'), l('摇臂', 'Rocker'), l('弹簧', 'Spring')],
        [normalise(staticDeflection, 0, gp ? 30 : 45), motionRatio / 1.2, normalise(wheelRate, 0, gp ? 700 : 140), normalise(springRate, 0, gp ? 500 : 100)],
        { marker: normalise(motionRatio, springParameters[1]!.min, springParameters[1]!.max), risk: normalise(naturalFrequency, gp ? 5.5 : 2.7, gp ? 8 : 4.2) })
      },
    },
    {
      id: 'camber-gain', title: l('动态外倾', 'Dynamic camber'), question: l('外倾增益能否抵消车身侧倾？', 'Can camber gain offset body roll?'), mode: 'distribution', parameters: camberParameters,
      evaluate: values => {
        const staticCamber = read(values, camberParameters, 'staticCamber')
        const camberGain = read(values, camberParameters, 'camberGain')
        const bodyRoll = read(values, camberParameters, 'bodyRoll')
        const wheelTravel = read(values, camberParameters, 'wheelTravel')
        const geometricCamber = camberGain * wheelTravel / 25
        const outsideCamber = staticCamber + geometricCamber + bodyRoll
        const insideCamber = staticCamber - geometricCamber - bodyRoll
        const target = gp ? -2.2 : -1.2
        const contactIndex = clamp(Math.exp(-(((outsideCamber - target) / (gp ? 1.7 : 2.1)) ** 2)))
        const camberThrust = Math.abs(outsideCamber) * (gp ? 520 : 85)
        return result([
          metric('outside-camber', '外侧轮动态外倾', 'Outside dynamic camber', outsideCamber, '°', Math.abs(outsideCamber - target) > 2.2 ? 'warn' : 'good'),
          metric('inside-camber', '内侧轮动态外倾', 'Inside dynamic camber', insideCamber, '°'),
          metric('contact-index', '接地利用指数', 'Contact-patch index', contactIndex * 100, '%', contactIndex < .55 ? 'danger' : contactIndex < .75 ? 'warn' : 'good'),
          metric('camber-thrust', '外倾推力代理', 'Camber-thrust proxy', camberThrust, 'N'),
        ], curve(travel => staticCamber + camberGain * travel / 25 + bodyRoll, camberParameters[3]!.min, camberParameters[3]!.max, 31),
        l('外倾增益可以在外轮压缩时补偿车身侧倾，但过强会牺牲直线制动接地并改变其他几何。', 'Camber gain can offset body roll as the outside wheel compresses, but too much harms straight-line contact and changes other geometry.'),
        [l('外侧内肩', 'Outside inner shoulder'), l('外侧中心', 'Outside centre'), l('外侧外肩', 'Outside outer shoulder'), l('内侧轮', 'Inside tyre')],
        [clamp(.5 - (outsideCamber - target) * .12), contactIndex, clamp(.5 + (outsideCamber - target) * .12), clamp(1 - Math.abs(insideCamber - target) / 5)],
        { marker: normalise(wheelTravel, camberParameters[3]!.min, camberParameters[3]!.max), risk: 1 - contactIndex, direction: clamp(bodyRoll / (gp ? 2 : 4), -1, 1) })
      },
    },
    {
      id: 'roll-centre', title: l('滚心与顶升', 'Roll centre and jacking'), question: l('提高滚心会把载荷转移送到哪条路径？', 'Where does a higher roll centre route load transfer?'), mode: 'field', parameters: rollCentreParameters,
      evaluate: values => {
        const rollCentreHeight = read(values, rollCentreParameters, 'rollCentreHeight') / 1000
        const track = read(values, rollCentreParameters, 'track') / 1000
        const lateralForce = read(values, rollCentreParameters, 'lateralForce')
        const rollStiffness = read(values, rollCentreParameters, 'rollStiffness')
        const cgHeight = gp ? .25 : .28
        const geometricTransfer = lateralForce * rollCentreHeight / Math.max(.5, track)
        const rollMoment = lateralForce * (cgHeight - rollCentreHeight)
        const rollAngle = rollMoment / Math.max(1, rollStiffness)
        const elasticTransfer = rollMoment / Math.max(.5, track)
        const jackingForce = lateralForce * rollCentreHeight / Math.max(.1, track * .5)
        const migrationRisk = clamp(Math.abs(rollCentreHeight) / (gp ? .1 : .12))
        return result([
          metric('geometric-transfer', '几何载荷转移', 'Geometric load transfer', geometricTransfer, 'N'),
          metric('elastic-transfer', '弹性载荷转移', 'Elastic load transfer', elasticTransfer, 'N'),
          metric('roll-angle', '车身侧倾', 'Body roll', rollAngle, '°'),
          metric('jacking-force', '顶升力代理', 'Jacking-force proxy', jackingForce, 'N', Math.abs(jackingForce) > (gp ? 1400 : 350) ? 'warn' : 'good'),
        ], curve(heightMm => lateralForce * (cgHeight - heightMm / 1000) / Math.max(1, rollStiffness), rollCentreParameters[0]!.min, rollCentreParameters[0]!.max, 31),
        l('提高滚心会把更多载荷转移走几何路径并减少弹簧侧倾，但不会消除整车总载荷转移。', 'Raising the roll centre routes more transfer through geometry and reduces spring roll, but it cannot remove total vehicle load transfer.'),
        [l('接地点', 'Contact patch'), l('瞬心', 'Instant centre'), l('滚心', 'Roll centre'), l('重心', 'Centre of gravity'), l('顶升', 'Jacking')],
        [normalise(lateralForce, 0, rollCentreParameters[2]!.max), clamp(Math.abs(rollCentreHeight) / .12), clamp(Math.abs(rollCentreHeight) / .12), cgHeight / .42, normalise(Math.abs(jackingForce), 0, gp ? 2500 : 600)],
        { marker: normalise(rollCentreHeight * 1000, rollCentreParameters[0]!.min, rollCentreParameters[0]!.max), risk: migrationRisk, direction: signed(rollCentreHeight) })
      },
    },
    {
      id: 'anti-dive', title: l('制动 Anti-dive', 'Braking anti-dive'), question: l('减少前端下沉是否等于减少载荷转移？', 'Does reducing nose dive reduce load transfer?'), mode: 'flow', parameters: antiDiveParameters,
      evaluate: values => {
        const antiDive = read(values, antiDiveParameters, 'antiDive') / 100
        const deceleration = read(values, antiDiveParameters, 'deceleration')
        const cgHeight = read(values, antiDiveParameters, 'cgHeight') / 1000
        const rideRate = read(values, antiDiveParameters, 'frontRideRate')
        const mass = gp ? 770 : 260
        const wheelbase = gp ? 3.55 : 1.6
        const transfer = mass * deceleration * G * cgHeight / wheelbase
        const elasticLoad = transfer * (1 - antiDive)
        const compression = elasticLoad / Math.max(1, rideRate * 2)
        const linkReaction = transfer * antiDive
        const pitch = compression / (gp ? 15 : 10)
        return result([
          metric('front-load-transfer', '前轴载荷转移', 'Front load transfer', transfer, 'N'),
          metric('spring-compression', '弹簧额外压缩', 'Additional spring compression', compression, 'mm'),
          metric('pitch-angle', '俯仰角代理', 'Pitch-angle proxy', pitch, '°'),
          metric('link-reaction', '连杆几何反力', 'Geometric link reaction', linkReaction, 'N', antiDive > .85 ? 'warn' : 'good'),
        ], curve(percent => transfer * (1 - percent / 100) / Math.max(1, rideRate * 2), 0, 100, 31),
        l('Anti-dive 只把载荷从弹簧路径转到连杆几何路径；前轴总载荷转移仍由质量、减速度、重心和轴距决定。', 'Anti-dive reroutes load from the spring path to link geometry; total front transfer still follows mass, deceleration, CG and wheelbase.'),
        [l('轮胎制动力', 'Tyre braking force'), l('几何路径', 'Geometric path'), l('弹簧路径', 'Spring path'), l('车身俯仰', 'Body pitch')],
        [normalise(transfer, 0, gp ? 30000 : 2200), antiDive, 1 - antiDive, normalise(pitch, 0, gp ? 2 : 4)],
        { marker: antiDive, risk: clamp((antiDive - .7) / .3), direction: -1 })
      },
    },
    {
      id: 'damper-velocity', title: l('阻尼器力—速度', 'Damper force–velocity'), question: l('低速与高速阻尼的分界在哪里？', 'Where is the low/high-speed damping boundary?'), mode: 'curve', parameters: damperParameters,
      evaluate: values => {
        const shaftSpeed = read(values, damperParameters, 'shaftSpeed')
        const lowSpeed = read(values, damperParameters, 'lowSpeedDamping')
        const highSpeed = read(values, damperParameters, 'highSpeedDamping')
        const knee = read(values, damperParameters, 'kneeSpeed')
        const forceAt = (speed: number) => signed(speed) * (Math.abs(speed) <= knee ? lowSpeed * Math.abs(speed) : lowSpeed * knee + highSpeed * (Math.abs(speed) - knee))
        const force = forceAt(shaftSpeed)
        const power = Math.abs(force * shaftSpeed) / 1000
        const acceleration = Math.abs(force) / (gp ? 28 : 14)
        const settling = clamp((gp ? 1.5 : 2.1) * (lowSpeed / (gp ? 9000 : 2200)) ** -.42, .35, 5)
        return result([
          metric('damper-force', '阻尼力', 'Damper force', force, 'N'),
          metric('dissipated-power', '瞬时耗散功率', 'Instantaneous dissipation', power, 'kW'),
          metric('wheel-acceleration', '轮端加速度代理', 'Wheel-acceleration proxy', acceleration, 'm/s²', acceleration > (gp ? 500 : 180) ? 'warn' : 'good'),
          metric('settling-time', '95% 恢复时间', '95% settling time', settling, 's'),
        ], curve(forceAt, damperParameters[0]!.min, damperParameters[0]!.max, 51),
        l('低速/高速指活塞速度；越过 blow-off 后斜率降低，避免尖锐路面输入产生过大力。', 'Low/high speed refers to shaft velocity; after blow-off the slope reduces to avoid excessive force from sharp road inputs.'),
        [l('回弹高速', 'Rebound high speed'), l('回弹低速', 'Rebound low speed'), l('压缩低速', 'Compression low speed'), l('压缩高速', 'Compression high speed')],
        [normalise(Math.abs(forceAt(damperParameters[0]!.min)), 0, gp ? 20000 : 5000), normalise(lowSpeed, damperParameters[1]!.min, damperParameters[1]!.max), normalise(lowSpeed, damperParameters[1]!.min, damperParameters[1]!.max), normalise(Math.abs(forceAt(damperParameters[0]!.max)), 0, gp ? 20000 : 5000)],
        { marker: normalise(shaftSpeed, damperParameters[0]!.min, damperParameters[0]!.max), risk: normalise(acceleration, gp ? 300 : 100, gp ? 650 : 240), direction: signed(shaftSpeed) })
      },
    },
  ]
}

const frontSuspensionReferenceCards: InteractionReferenceCard[] = [
  {
    id: 'front-suspension-fia', title: l('FIA 被动悬架边界', 'FIA passive-suspension boundary'), image: '/images/interactions/front-suspension/reference-1.webp', imageAlt: l('车检台上的被动弹簧与禁止执行器', 'Passive spring and prohibited actuator at scrutineering'),
    summary: l('固定 anti-dive 可以存在，主动自调平和系统耦合不可以。', 'Fixed anti-dive may exist; powered levelling and system coupling may not.'), purpose: l('约束 GP 前悬架的能量方向、几何与调整方式。', 'Constrains GP front-suspension energy direction, geometry and adjustment.'),
    details: [l('行驶中不得调整悬架。', 'Suspension may not be adjusted while moving.'), l('固定 anti-dive/anti-lift 不能与制动或转向耦合。', 'Fixed anti geometry may not couple to braking or steering.'), l('弹簧载荷—挠度单调，阻尼力反抗节点速度。', 'Spring load-deflection is monotonic and damping opposes node velocity.')], sourceTitle: l('FIA 2026 技术规则 Section C', 'FIA 2026 Technical Regulations Section C'), url: 'https://www.fia.com/system/files/documents/fia_2026_f1_regulations_-_section_c_technical_-_iss_19_-_2026-06-25.pdf',
  },
  {
    id: 'front-suspension-penske', title: l('Penske 阻尼器测功机', 'Penske damper dynamometer'), image: '/images/interactions/front-suspension/reference-2.webp', imageAlt: l('阻尼器测功机与四象限曲线', 'Damper dynamometer and quadrant plot'), summary: l('“软/硬”只有放到力—速度曲线上才可测。', 'Soft/hard becomes measurable only on a force-velocity curve.'),
    purpose: l('把阻尼旋钮设置转成可复现的 PVP/CVP 数据。', 'Turns damper clicks into repeatable PVP/CVP data.'), details: [l('阻尼力随轴速变化。', 'Damper force changes with shaft speed.'), l('PVP 与 CVP 是不同曲线表达。', 'PVP and CVP are different plot formats.'), l('冷热曲线应在稳定温度下比较。', 'Hot and cold curves should be compared at stable temperature.')], sourceTitle: l('Penske SLink 手册', 'Penske SLink manual'), url: 'https://www.penskeshocks.com/hubfs/Resources/Manuals/SLink%20Manual.pdf?hsLang=en',
  },
  {
    id: 'front-suspension-kc', title: l('SAE K&C 目标级联', 'SAE K&C target cascading'), image: '/images/interactions/front-suspension/reference-3.webp', imageAlt: l('K&C 台架与外倾前束响应面', 'K&C rig with camber and toe response surfaces'), summary: l('滚心、外倾、前束与包装必须一起优化。', 'Roll centre, camber, toe and packaging must be optimised together.'),
    purpose: l('把单变量实验收束到完整的运动学与柔度验证。', 'Combines single-variable labs into full kinematics-and-compliance validation.'), details: [l('目标包括滚心迁移、scrub radius 与拉杆倾角。', 'Targets include roll-centre migration, scrub radius and tie-rod inclination.'), l('要扫描完整行程与转向矩阵。', 'The full travel-and-steer matrix must be swept.'), l('结构柔度会改变硬点几何的实车响应。', 'Compliance changes the physical response from nominal hardpoints.')], sourceTitle: l('SAE K&C target cascading', 'SAE K&C target cascading'), url: 'https://saemobilus.sae.org/papers/target-cascading-kinematics-compliance-tables-suspension-design-2026-01-0584',
  },
]

const frontSuspensionFaultCardsFor = (vehicleId: VehicleId): InteractionFaultCard[] => {
  const gp = vehicleId === 'grand-prix-2026'
  return [
    {
      id: 'front-suspension-bent-pushrod', title: l('推杆弯曲', 'Bent pushrod'), image: '/images/interactions/front-suspension/fault-1.webp', imageAlt: l('推杆激光直线度与轮端加载', 'Pushrod laser straightness and wheel loading'),
      scenario: gp ? l('路肩后右前车高降低 4.2 mm，同样 1500 N 加载下 RF 比 LF 多位移 3.1 mm，推杆直线度偏差 0.8 mm。', 'After a kerb strike RF ride height is 4.2 mm low; at 1500 N RF moves 3.1 mm more than LF and pushrod runout is 0.8 mm.') : l('路肩后右前车高降低 6.5 mm，同样 500 N 加载下 RF 位移 10.8 mm、LF 7.9 mm，推杆弯曲 1.2 mm。', 'After a kerb strike RF ride height is 6.5 mm low; at 500 N RF moves 10.8 mm versus LF 7.9 mm and pushrod runout is 1.2 mm.'),
      strategy: l('停驶，检查推杆、球头、摇臂轴承和角重；按相同轮端载荷比较两侧刚度，更换后重设车高。', 'Stop, inspect pushrod, joints, rocker bearings and corner weight; compare wheel rates at equal load, replace and reset ride height.'), principle: l('弯曲引入预载、摩擦或屈曲柔度，改变有效运动比和左右动态载荷。', 'Bending adds preload, friction or buckling compliance, changing effective motion ratio and left-right load response.'), evidence: l('两侧载荷—位移曲线匹配，车高/角重在公差内且路肩后无永久位移。', 'Left/right load-deflection curves match, ride height/corner weight are in tolerance and no permanent set remains.'),
    },
    {
      id: 'front-suspension-bump-steer', title: l('拉杆松动与 bump steer', 'Loose tie rod and bump steer'), image: '/images/interactions/front-suspension/fault-2.webp', imageAlt: l('K&C 轮跳测试与错位见证漆', 'K&C bump test and shifted witness paint'),
      scenario: gp ? l('20 mm 压缩时左前 toe-out 从 0.04° 增至 0.31°，调整套松动 1/4 圈；过路肩横摆率出现 9°/s 尖峰。', 'At 20 mm bump LF toe-out rises from 0.04° to 0.31°, the adjuster is a quarter-turn loose and kerb yaw spikes 9°/s.') : l('30 mm 压缩时左前 toe-out 从 0.08° 增至 0.62°，调整套松动 1/3 圈；方向盘过凸起自行跳动。', 'At 30 mm bump LF toe-out rises from 0.08° to 0.62°, the adjuster is one-third turn loose and the wheel kicks over bumps.'),
      strategy: l('检查螺纹啮合、锁紧扭矩、球头和转向臂，在完整 bump/rebound 与转角矩阵重测 toe。', 'Inspect thread engagement, lock torque, joints and steering arm; remap toe over full bump/rebound and steer.'), principle: l('拉杆有效长度改变后，转向与悬架圆弧不再匹配，轮跳被转换成非指令转向。', 'A changed tie-rod length mismatches steering and suspension arcs, converting bump into unintended steer.'), evidence: l('全行程 toe 曲线回到包络、见证漆稳定，路肩后无转角/横摆尖峰。', 'The full-travel toe curve returns to its envelope, witness marks stay fixed and kerb spikes disappear.'),
    },
    {
      id: 'front-suspension-damper-fade', title: l('阻尼器热衰减/气蚀', 'Damper fade or cavitation'), image: '/images/interactions/front-suspension/fault-3.webp', imageAlt: l('透明阻尼器气泡与冷热测功曲线', 'Damper bubbles and hot/cold dyno curves'),
      scenario: gp ? l('耐久后 RF 壳温 106°C，0.30 m/s 回弹力从 6120 N 降至 4380 N并出现锯齿。', 'After a run RF body temperature is 106°C; rebound force at 0.30 m/s falls 6120→4380 N with serration.') : l('20 分钟后 RF 壳温 92°C，0.25 m/s 回弹力从 1480 N 降至 970 N并出现锯齿。', 'After 20 minutes RF reaches 92°C; rebound force at 0.25 m/s falls 1480→970 N with serration.'),
      strategy: l('比对冷热 dyno，检查气压、油量、泄漏、活塞带和 shim；重建后验证抗气蚀并排除摇臂摩擦。', 'Compare hot/cold dyno, inspect gas charge, oil, leaks, piston band and shims; rebuild, verify anti-cavitation and exclude rocker friction.'), principle: l('黏度下降会改变阻尼，低压区汽化产生可压缩空穴和力中断。', 'Viscosity loss changes damping while low-pressure cavitation creates compressible voids and force dropout.'), evidence: l('热稳态曲线重复、无锯齿或异常滞回、左右温度和阻尼力匹配。', 'The hot curve repeats without serration or abnormal hysteresis and left/right temperature and force match.'),
    },
  ]
}

export const frontSuspensionInteractionPack: PartInteractionPack = {
  partId: 'front-suspension', theme: '#f0c76a', experimentsFor: frontSuspensionExperimentsFor, referenceCards: frontSuspensionReferenceCards, faultCardsFor: frontSuspensionFaultCardsFor,
}

const rearSuspensionExperimentsFor = (vehicleId: VehicleId): InteractionExperiment[] => {
  const gp = vehicleId === 'grand-prix-2026'
  const antiSquatParameters = [
    parameter('antiSquat', '抗后蹲比例', 'Anti-squat', 0, 120, 2, gp ? 55 : 35, '%'),
    parameter('acceleration', '纵向加速度', 'Longitudinal acceleration', 0, gp ? 2.5 : 1.5, .05, gp ? 1 : .8, 'g'),
    parameter('cgHeight', '重心高度', 'CG height', 180, gp ? 350 : 420, 5, gp ? 250 : 280, 'mm'),
    parameter('rearRideRate', '后轴乘坐刚度', 'Rear ride rate', gp ? 120 : 20, gp ? 650 : 130, gp ? 10 : 2, gp ? 330 : 65, 'N/mm'),
  ]
  const rollParameters = [
    parameter('rearRollShare', '后轴滚转刚度份额', 'Rear roll-stiffness share', 25, 75, 1, gp ? 50 : 48, '%'),
    parameter('lateralAcceleration', '横向加速度', 'Lateral acceleration', 0, gp ? 6 : 2, .05, gp ? 3.5 : 1.1, 'g'),
    parameter('rearTrack', '后轮距', 'Rear track', gp ? 1500 : 1100, gp ? 1700 : 1500, 10, gp ? 1600 : 1230, 'mm'),
    parameter('rearAxleLoad', '后轴总法向载荷', 'Rear axle normal load', gp ? 6000 : 1000, gp ? 22000 : 5000, gp ? 250 : 50, gp ? 13000 : 2600, 'N'),
  ]
  const toeParameters = [
    parameter('staticToe', '静态单轮 toe-in', 'Static toe-in per wheel', -.2, .5, .01, gp ? .08 : .1, '°'),
    parameter('bumpToeGradient', 'Bump toe 梯度', 'Bump-toe gradient', -.4, .4, .01, gp ? .03 : .05, '°/25 mm'),
    parameter('wheelForce', '轮端合力', 'Wheel resultant force', 0, gp ? 25000 : 7000, gp ? 500 : 100, gp ? 7000 : 1500, 'N'),
    parameter('toeStiffness', 'Toe 顺从刚度', 'Toe compliance stiffness', gp ? 10 : 2, gp ? 80 : 20, gp ? 2 : .5, gp ? 35 : 8, 'kN/deg'),
  ]
  const heaveParameters = [
    parameter('rearAeroLoad', '后轴下压力', 'Rear aero load', 0, gp ? 18000 : 3000, gp ? 250 : 50, gp ? 9000 : 900, 'N'),
    parameter('heaveRate', '升沉弹簧刚度', 'Heave spring rate', 0, gp ? 1500 : 300, gp ? 25 : 5, gp ? 700 : 80, 'N/mm'),
    parameter('heaveMotionRatio', '升沉运动比', 'Heave motion ratio', .4, 1.2, .02, gp ? .8 : .75, 'xs/xw'),
    parameter('bumpStopGap', 'Bump-stop 余隙', 'Bump-stop gap', 0, gp ? 20 : 30, .5, gp ? 7 : 12, 'mm'),
  ]
  const tractionParameters = [
    parameter('kerbHeight', '路肩高度', 'Kerb height', 0, gp ? 40 : 50, 1, gp ? 15 : 20, 'mm'),
    parameter('inputFrequency', '输入频率', 'Input frequency', gp ? 1 : .5, gp ? 20 : 12, .25, gp ? 7 : 4, 'Hz'),
    parameter('compressionDamping', '压缩阻尼', 'Compression damping', gp ? 3000 : 500, gp ? 18000 : 5000, gp ? 250 : 100, gp ? 7500 : 1800, 'N·s/m'),
    parameter('reboundRatio', '回弹/压缩比', 'Rebound/compression ratio', .5, 3, .05, gp ? 1.6 : 1.5, ':1'),
  ]

  return [
    {
      id: 'anti-squat', title: l('加速抗后蹲', 'Acceleration anti-squat'), question: l('减少车尾下沉是否等于增加抓地？', 'Does less squat mean more grip?'), mode: 'flow', parameters: antiSquatParameters,
      evaluate: values => {
        const antiSquat = read(values, antiSquatParameters, 'antiSquat') / 100
        const acceleration = read(values, antiSquatParameters, 'acceleration')
        const cgHeight = read(values, antiSquatParameters, 'cgHeight') / 1000
        const rideRate = read(values, antiSquatParameters, 'rearRideRate')
        const mass = gp ? 770 : 260
        const wheelbase = gp ? 3.55 : 1.6
        const transfer = mass * acceleration * G * cgHeight / wheelbase
        const elastic = transfer * (1 - antiSquat)
        const compression = elastic / Math.max(1, rideRate * 2)
        const linkReaction = transfer * antiSquat
        const rearStatic = mass * G * (gp ? .54 : .52)
        const tractionUtilisation = mass * acceleration * G / Math.max(1, (gp ? 1.8 : 1.4) * (rearStatic + transfer))
        return result([
          metric('rear-load-transfer', '后轴载荷转移', 'Rear load transfer', transfer, 'N'),
          metric('rear-compression', '后悬架压缩', 'Rear suspension compression', compression, 'mm', compression < -2 ? 'warn' : 'good'),
          metric('link-reaction', '连杆几何反力', 'Geometric link reaction', linkReaction, 'N', antiSquat > 1 ? 'warn' : 'good'),
          metric('traction-utilisation', '牵引利用率', 'Traction utilisation', tractionUtilisation * 100, '%', tractionUtilisation > 1 ? 'danger' : tractionUtilisation > .9 ? 'warn' : 'good'),
        ], curve(percent => transfer * (1 - percent / 100) / Math.max(1, rideRate * 2), 0, 120, 31),
        l('Anti-squat 把载荷从弹簧路径转到连杆路径；超过 100% 甚至会抬起车尾，但不会创造轮胎抓地。', 'Anti-squat reroutes load from the spring path to links; above 100% it can lift the rear, but it cannot create tyre grip.'),
        [l('轮胎驱动力', 'Tyre drive force'), l('连杆路径', 'Link path'), l('弹簧路径', 'Spring path'), l('车身姿态', 'Body attitude')],
        [normalise(acceleration, 0, antiSquatParameters[1]!.max), clamp(antiSquat), clamp(1 - antiSquat, 0, 1), normalise(Math.abs(compression), 0, gp ? 15 : 35)],
        { marker: clamp(antiSquat / 1.2), risk: clamp((antiSquat - .85) / .35), direction: compression >= 0 ? -1 : 1 })
      },
    },
    {
      id: 'rear-roll-share', title: l('后滚转刚度分配', 'Rear roll-stiffness distribution'), question: l('内后轮何时开始卸载？', 'When does the inside rear begin to unload?'), mode: 'distribution', parameters: rollParameters,
      evaluate: values => {
        const rearShare = read(values, rollParameters, 'rearRollShare') / 100
        const lateralAcceleration = read(values, rollParameters, 'lateralAcceleration')
        const track = read(values, rollParameters, 'rearTrack') / 1000
        const rearLoad = read(values, rollParameters, 'rearAxleLoad')
        const mass = gp ? 770 : 260
        const cgHeight = gp ? .25 : .28
        const totalTransfer = mass * lateralAcceleration * G * cgHeight / Math.max(.5, track)
        // `totalTransfer` is the load moved from the inside tyre to the outside
        // tyre.  Apply it about the equal-load state rather than halving it a
        // second time when reconstructing the two wheel loads.
        const rearTransfer = Math.min(rearLoad / 2, totalTransfer * rearShare)
        const insideLoad = Math.max(0, rearLoad / 2 - rearTransfer)
        const outsideLoad = rearLoad - insideLoad
        const mu = gp ? 1.75 : 1.4
        const capacity = mu * (outsideLoad * clamp(1 - .07 * (outsideLoad / (rearLoad / 2) - 1), .62, 1.1) + insideLoad * clamp(1 - .07 * (insideLoad / (rearLoad / 2) - 1), .62, 1.1))
        const balanceShift = (rearShare - .5) * 100
        return result([
          metric('rear-transfer', '后轴载荷转移', 'Rear axle load transfer', rearTransfer, 'N'),
          metric('inside-load', '内后轮载荷', 'Inside-rear load', insideLoad, 'N', insideLoad < rearLoad * .05 ? 'danger' : insideLoad < rearLoad * .15 ? 'warn' : 'good'),
          metric('rear-capacity', '后轴总侧向能力', 'Rear axle capacity', capacity, 'N'),
          metric('balance-shift', '平衡迁移', 'Balance shift', balanceShift, '% rear', Math.abs(balanceShift) > 15 ? 'warn' : 'good'),
        ], curve(share => {
          const transfer = Math.min(rearLoad / 2, totalTransfer * share)
          const inside = Math.max(0, rearLoad / 2 - transfer)
          const out = rearLoad - inside
          return mu * (out * clamp(1 - .07 * (out / (rearLoad / 2) - 1), .62, 1.1) + inside * clamp(1 - .07 * (inside / (rearLoad / 2) - 1), .62, 1.1))
        }, .25, .75, 31),
        l('增加后轴滚转刚度份额会卸载内后轮并降低后轴总抓地；它改变前后分配，不会消除整车载荷转移。', 'Increasing rear roll-stiffness share unloads the inside rear and reduces rear-axle grip; it changes distribution, not total vehicle transfer.'),
        [l('外后轮', 'Outside rear'), l('内后轮', 'Inside rear'), l('后轴总能力', 'Rear total'), l('均载基准', 'Equal-load reference')],
        [outsideLoad / rearLoad, insideLoad / rearLoad, clamp(capacity / Math.max(1, mu * rearLoad)), 1],
        { marker: rearShare, risk: clamp(1 - insideLoad / Math.max(1, rearLoad * .25)), direction: signed(balanceShift) })
      },
    },
    {
      id: 'compliance-steer', title: l('后轮顺从转向', 'Rear compliance steer'), question: l('受力与轮跳会让后轮产生多少非指令 toe？', 'How much unintended rear toe comes from load and bump?'), mode: 'geometry', parameters: toeParameters,
      evaluate: values => {
        const staticToe = read(values, toeParameters, 'staticToe')
        const bumpGradient = read(values, toeParameters, 'bumpToeGradient')
        const wheelForce = read(values, toeParameters, 'wheelForce')
        const toeStiffness = read(values, toeParameters, 'toeStiffness') * 1000
        const representativeTravel = gp ? 12 : 20
        const complianceToe = wheelForce / Math.max(1, toeStiffness)
        const dynamicToe = staticToe + bumpGradient * representativeTravel / 25 + complianceToe
        const oppositeToe = staticToe - bumpGradient * representativeTravel / 25 - complianceToe * .82
        const toeSplit = dynamicToe - oppositeToe
        const tyreCorneringStiffness = gp ? 180000 : 26000
        const inducedForce = tyreCorneringStiffness * radians(toeSplit)
        const yawMoment = inducedForce * (gp ? .8 : .62)
        const speed = gp ? 70 : 25
        // Toe scrub dissipates through the lateral component of road speed,
        // not the full forward speed.
        const scrubPower = Math.abs(inducedForce * speed * Math.sin(radians(toeSplit))) / 1000
        return result([
          metric('dynamic-toe', '动态后轮 toe-in', 'Dynamic rear toe-in', dynamicToe, '°', dynamicToe < -.1 ? 'danger' : Math.abs(dynamicToe) > .45 ? 'warn' : 'good'),
          metric('toe-split', '左右 toe 差', 'Left-right toe split', toeSplit, '°', Math.abs(toeSplit) > (gp ? .25 : .4) ? 'warn' : 'good'),
          metric('yaw-moment', '附加横摆矩代理', 'Additional yaw-moment proxy', yawMoment, 'N·m'),
          metric('scrub-power', '擦洗功率代理', 'Scrub-power proxy', scrubPower, 'kW'),
        ], curve(force => staticToe + bumpGradient * representativeTravel / 25 + force / Math.max(1, toeStiffness), 0, toeParameters[2]!.max, 31),
        l('静态 toe 正常并不保证受力后仍正常；左右顺从斜率不同会直接形成附加横摆矩。', 'Correct static toe does not guarantee correct loaded toe; unequal left-right compliance slopes create an additional yaw moment.'),
        [l('左后轮', 'Left rear'), l('左 toe-link', 'Left toe link'), l('右 toe-link', 'Right toe link'), l('右后轮', 'Right rear')],
        [normalise(Math.abs(dynamicToe), 0, .7), normalise(wheelForce, 0, toeParameters[2]!.max), normalise(wheelForce, 0, toeParameters[2]!.max), normalise(Math.abs(oppositeToe), 0, .7)],
        { marker: normalise(wheelForce, 0, toeParameters[2]!.max), risk: normalise(Math.abs(toeSplit), gp ? .08 : .12, gp ? .35 : .55), direction: clamp(toeSplit / .5, -1, 1) })
      },
    },
    {
      id: 'heave-platform', title: l('升沉气动平台', 'Heave aero platform'), question: l('中央升沉元件何时触发限位块？', 'When does the central heave element reach the bump stop?'), mode: 'field', parameters: heaveParameters,
      evaluate: values => {
        const aeroLoad = read(values, heaveParameters, 'rearAeroLoad')
        const heaveRate = read(values, heaveParameters, 'heaveRate')
        const motionRatio = read(values, heaveParameters, 'heaveMotionRatio')
        const gap = read(values, heaveParameters, 'bumpStopGap')
        const effectiveRate = Math.max(5, heaveRate * motionRatio * motionRatio + (gp ? 180 : 35))
        const bumpLinearRate = gp ? 180 : 35
        const bumpCubicRate = gp ? 3.2 : .8
        const compressionForLoad = (load: number) => {
          const loadPerSide = Math.max(0, load) / 2
          const freeCompression = loadPerSide / Math.max(1, effectiveRate)
          if (freeCompression <= gap) return freeCompression
          // Solve F = kx + F_bump(x-gap) by bisection.  This preserves a
          // monotonic load-compression relation after progressive engagement.
          let low = 0
          let high = Math.max(0, freeCompression - gap)
          for (let iteration = 0; iteration < 28; iteration += 1) {
            const excess = (low + high) / 2
            const compression = gap + excess
            const supported = effectiveRate * compression + bumpLinearRate * excess + bumpCubicRate * excess ** 3
            if (supported < loadPerSide) low = excess
            else high = excess
          }
          return gap + (low + high) / 2
        }
        const compression = compressionForLoad(aeroLoad)
        const excess = Math.max(0, compression - gap)
        const baseRideHeight = gp ? 42 : 65
        const rideHeight = Math.max(5, baseRideHeight - compression)
        const target = gp ? 28 : 48
        const floorIndex = clamp(Math.exp(-(((rideHeight - target) / (gp ? 12 : 22)) ** 2)))
        const engagement = gap <= 0 ? 1 : clamp(excess / Math.max(1, gap * .7))
        return result([
          metric('rear-ride-height', '后车高', 'Rear ride height', rideHeight, 'mm', floorIndex < .5 ? 'danger' : floorIndex < .75 ? 'warn' : 'good'),
          metric('heave-compression', '升沉压缩', 'Heave compression', compression, 'mm'),
          metric('floor-window', '底板窗口指数', 'Floor-window index', floorIndex * 100, '%', floorIndex < .5 ? 'danger' : floorIndex < .75 ? 'warn' : 'good'),
          metric('bump-stop-engagement', 'Bump-stop 介入', 'Bump-stop engagement', engagement * 100, '%', engagement > .7 ? 'warn' : 'good'),
        ], curve(compressionForLoad, 0, heaveParameters[0]!.max, 31),
        l('Heave 元件抵抗左右同相压缩；余隙耗尽后刚度快速上升，可能把平台从可用窗口突然推离。', 'The heave element resists in-phase compression; once gap is consumed, rapidly rising rate can push the platform out of its window.'),
        [l('左主弹簧', 'Left spring'), l('中央升沉元件', 'Central heave'), l('右主弹簧', 'Right spring'), l('限位块', 'Bump stop'), l('底板窗口', 'Floor window')],
        [normalise(aeroLoad / 2, 0, heaveParameters[0]!.max), normalise(compression, 0, gp ? 25 : 45), normalise(aeroLoad / 2, 0, heaveParameters[0]!.max), engagement, floorIndex],
        { marker: normalise(aeroLoad, 0, heaveParameters[0]!.max), risk: 1 - floorIndex })
      },
    },
    {
      id: 'kerb-traction', title: l('路肩牵引恢复', 'Kerb traction recovery'), question: l('回弹阻尼过大为何会让车轮越来越轻？', 'Why can excessive rebound damping make the tyre progressively lighter?'), mode: 'timeline', parameters: tractionParameters,
      evaluate: values => {
        const kerbHeight = read(values, tractionParameters, 'kerbHeight')
        const frequency = read(values, tractionParameters, 'inputFrequency')
        const compressionDamping = read(values, tractionParameters, 'compressionDamping')
        const reboundRatio = read(values, tractionParameters, 'reboundRatio')
        const critical = gp ? 11500 : 2800
        const dampingRatio = compressionDamping / critical
        const jackDown = clamp((reboundRatio - 1) * frequency / (gp ? 25 : 15) * kerbHeight / Math.max(1, gp ? 20 : 25))
        const loadVariation = clamp(kerbHeight / (gp ? 35 : 45) * frequency / (gp ? 14 : 9) * (.45 + Math.abs(dampingRatio - .7)), 0, 1.6)
        const staticLoad = gp ? 6500 : 1300
        const minimumLoad = Math.max(0, staticLoad * (1 - loadVariation - jackDown * .35))
        const settling = clamp((1.8 + reboundRatio * .55) / Math.max(.25, frequency * .24), .2, 6)
        const damperEnergy = compressionDamping * (kerbHeight / 1000 * 2 * Math.PI * frequency) ** 2 / Math.max(1, frequency) / 1000
        const points = curve(time => {
          const decay = Math.exp(-time / Math.max(.2, settling / 3))
          return Math.max(0, staticLoad * (1 + loadVariation * decay * Math.sin(2 * Math.PI * frequency * time) - jackDown * (1 - decay)))
        }, 0, Math.min(4, 5 / Math.max(.5, frequency) * 4), 61)
        return result([
          metric('contact-load-variation', '接地载荷变异', 'Contact-load variation', loadVariation * 100, '%', loadVariation > .8 ? 'danger' : loadVariation > .5 ? 'warn' : 'good'),
          metric('minimum-load', '最小接地载荷', 'Minimum tyre load', minimumLoad, 'N', minimumLoad < staticLoad * .15 ? 'danger' : minimumLoad < staticLoad * .4 ? 'warn' : 'good'),
          metric('recovery-time', '恢复时间', 'Recovery time', settling, 's'),
          metric('damper-energy', '阻尼器耗散能代理', 'Damper-energy proxy', damperEnergy, 'kJ'),
        ], points, l('阻尼不足会持续振荡；回弹过大则阻止车轮伸展，在连续输入中形成 jack-down 和失载。', 'Too little damping permits oscillation; excessive rebound prevents extension and creates jack-down and unloading over repeated inputs.'),
        [l('路肩输入', 'Kerb input'), l('轮端位移', 'Wheel travel'), l('车身位移', 'Body travel'), l('接地载荷', 'Contact load')],
        [normalise(kerbHeight, 0, tractionParameters[0]!.max), clamp(loadVariation), clamp(loadVariation * .55), clamp(minimumLoad / staticLoad)],
        { marker: normalise(reboundRatio, .5, 3), risk: clamp(1 - minimumLoad / staticLoad), direction: -1 })
      },
    },
  ]
}

const rearSuspensionReferenceCards: InteractionReferenceCard[] = [
  {
    id: 'rear-suspension-anti-squat', title: l('SAE Anti-squat 与传动路径', 'SAE anti-squat and driveline path'), image: '/images/interactions/rear-suspension/reference-1.webp', imageAlt: l('三种驱动布局的侧视自由体图', 'Side-view free-body diagrams for three driveline layouts'), summary: l('Anti-squat 百分比随传动布局与力作用线变化。', 'Anti-squat percentage changes with driveline layout and force line.'),
    purpose: l('为加速实验选择正确的驱动力与扭矩反力路径。', 'Selects the correct drive-force and torque-reaction path for the acceleration lab.'), details: [l('传动扭矩反力会作用于车身。', 'Driveline torque reaction acts on the body.'), l('轮心、接地点与瞬心共同决定响应。', 'Wheel centre, contact patch and instant centre jointly set the response.'), l('载荷转移必须与可见 squat 分开。', 'Load transfer must be separated from visible squat.')], sourceTitle: l('SAE anti-squat 研究', 'SAE anti-squat study'), url: 'https://saemobilus.sae.org/papers/a-study-influence-suspension-driveline-torque-evaluation-vehicle-anti-squat-dive-characteristics-using-a-planar-vehicle-dynamics-model-2021-01-0693',
  },
  {
    id: 'rear-suspension-ohlins', title: l('Öhlins 压缩与回弹', 'Öhlins compression and rebound'), image: '/images/interactions/rear-suspension/reference-2.webp', imageAlt: l('TTX 阻尼器压缩与回弹油路', 'TTX damper compression and rebound oil paths'), summary: l('两个调节方向控制不同运动阶段，必须从基准逐步记录。', 'The two adjustments control different motion phases and must be logged from a baseline.'),
    purpose: l('解释路肩实验中的力方向、恢复速度与调节顺序。', 'Explains force direction, recovery speed and adjustment sequence in the kerb lab.'), details: [l('压缩控制阻尼器缩短时的能量。', 'Compression controls energy while the damper shortens.'), l('回弹控制车轮与车身复位速度。', 'Rebound controls wheel/body return speed.'), l('左右应成对比较并记录 clicks。', 'Left and right should be compared in pairs with clicks recorded.')], sourceTitle: l('Öhlins Automotive TTX 用户手册', 'Öhlins Automotive TTX owner manual'), url: 'https://ohlins.com/storage/75BCF25BEBEB0E0888B403FA1682CB3A8A90202F0E1554F5AFFE7E400EA8002C/dd6b0930ac584bb981d9daaff413d637/pdf/media/b7cc030f623d48b0b4604c6ed4299470/OM_07446-01_TTX46CS_TTX36.pdf',
  },
  {
    id: 'rear-suspension-fia', title: l('FIA 后轮转向边界', 'FIA rear-steer boundary'), image: '/images/interactions/rear-suspension/reference-3.webp', imageAlt: l('合法被动 toe 曲线与禁止执行器', 'Legal passive toe curve and prohibited actuator'), summary: l('后轮可有被动顺从，却不能成为主动转向轴。', 'Rear wheels may exhibit passive compliance, but may not become an actively steered axle.'),
    purpose: l('防止后 toe 与 heave 模型越界为主动后轮转向或主动平台。', 'Prevents rear-toe and heave models becoming active rear steer or platform control.'), details: [l('方向盘只重新对正两个前轮。', 'The steering wheel realigns only the two front wheels.'), l('悬架不得在行驶中调整。', 'Suspension may not be adjusted while moving.'), l('固定几何与被动柔度可以建模。', 'Fixed geometry and passive compliance may be modelled.')], sourceTitle: l('FIA 2026 技术规则 Section C', 'FIA 2026 Technical Regulations Section C'), url: 'https://www.fia.com/system/files/documents/fia_2026_f1_regulations_-_section_c_technical_-_iss_19_-_2026-06-25.pdf',
  },
]

const rearSuspensionFaultCardsFor = (vehicleId: VehicleId): InteractionFaultCard[] => {
  const gp = vehicleId === 'grand-prix-2026'
  return [
    {
      id: 'rear-suspension-inside-spin', title: l('内后轮卸载空转', 'Inside-rear unload and spin'), image: '/images/interactions/rear-suspension/fault-1.webp', imageAlt: l('出弯内后轮与轮速载荷叠图', 'Inside-rear exit image with speed and load overlay'),
      scenario: gp ? l('出弯 115 km/h，内后轮载荷只剩 920 N、轮速比外轮高 24%，后滚刚度份额 68%。', 'Exiting at 115 km/h, inside-rear load is only 920 N, wheel speed is 24% higher and rear roll share is 68%.') : l('出弯 42 km/h，内后轮载荷只剩 180 N、轮速比外轮高 38%，后滚刚度份额 66%。', 'Exiting at 42 km/h, inside-rear load is only 180 N, wheel speed is 38% higher and rear roll share is 66%.'),
      strategy: l('核对轮速/胎径与差速器；检查角重、防倾杆、滚心和回弹阻尼，减少卸载并匹配差速器/扭矩分配。', 'Verify wheel speed/tyre radius and differential; inspect corner weight, ARB, roll centre and rebound, then reduce unloading and match differential/torque control.'), principle: l('轻载内轮的纵向能力受 μFz 限制；过多后轴转移或 jack-down 使它先饱和。', 'The light inside tyre is limited by μFz; excessive rear transfer or jack-down makes it saturate first.'), evidence: l('内轮最小载荷提高、轮速差收敛、同油门加速度提高且温度正常。', 'Minimum inside load rises, wheel-speed split converges, acceleration improves and temperature normalises.'),
    },
    {
      id: 'rear-suspension-toe-link', title: l('后 toe-link 弯曲', 'Bent rear toe link'), image: '/images/interactions/rear-suspension/fault-2.webp', imageAlt: l('Toe-link 激光扫描与受力前束曲线', 'Toe-link laser scan and loaded-toe curve'),
      scenario: gp ? l('220 km/h 时右后 toe 从 +0.08° 变成 −0.19°，左右差 0.31°，toe-link 永久弯曲 0.6 mm。', 'At 220 km/h RR toe changes +0.08° to −0.19°, split is 0.31° and toe-link permanent bend is 0.6 mm.') : l('180 km/h 时右后 toe 从 +0.10° 变成 −0.28°，左右差 0.44°，toe-link 永久弯曲 0.9 mm。', 'At 180 km/h RR toe changes +0.10° to −0.28°, split is 0.44° and toe-link permanent bend is 0.9 mm.'),
      strategy: l('立即停驶；测杆件、球头、安装耳和轴承，做受力 toe/compliance sweep，更换后重新定位。', 'Stop immediately; inspect link, joints, mounts and bearing, run a loaded toe/compliance sweep, replace and realign.'), principle: l('轮端力通过弯曲杆件形成 toe-out 和左右横向力差，横摆矩随载荷放大。', 'Wheel force bends the link into toe-out and lateral-force asymmetry, amplifying yaw moment with load.'), evidence: l('静态与加载 toe 均在包络、左右顺从斜率匹配、直线横摆恢复。', 'Static and loaded toe remain in the envelope, compliance slopes match and straight-line yaw recovers.'),
    },
    {
      id: 'rear-suspension-bump-stop', title: l('Heave bump-stop 提前接触', 'Premature heave bump-stop contact'), image: '/images/interactions/rear-suspension/fault-3.webp', imageAlt: l('Heave 台架与左右 bump-stop 接触印迹', 'Heave rig and left-right bump-stop witness marks'),
      scenario: gp ? l('220 km/h 后车高从 42 降到 25 mm，右侧 bump stop 早 4 mm 接触，后轴刚度在 12 mm 内增至 2.7 倍。', 'At 220 km/h rear height falls 42→25 mm; the right bump stop engages 4 mm early and rear rate rises 2.7× within 12 mm.') : l('110 km/h 后车高从 65 降到 39 mm，右侧 bump stop 早 6 mm 接触，后轴刚度在 18 mm 内增至 2.3 倍。', 'At 110 km/h rear height falls 65→39 mm; the right bump stop engages 6 mm early and rear rate rises 2.3× within 18 mm.'),
      strategy: l('核对车高传感器、余隙/硬度、heave 运动比、角重和气动载荷，配对零件后做准静态 heave sweep。', 'Verify ride-height sensors, gaps/rates, heave motion ratio, corner weights and aero load, then pair parts and run a quasi-static heave sweep.'), principle: l('非对称提前接触引入强非线性刚度与左右载荷差，同时改变底板高度和后轮抓地。', 'Asymmetric early engagement adds nonlinear stiffness and load split while changing floor height and rear grip.'), evidence: l('左右接触点一致、heave 曲线连续、车高处于窗口且载荷尖峰消失。', 'Left/right contact points match, the heave curve is continuous, ride height stays in its window and load spikes disappear.'),
    },
  ]
}

export const rearSuspensionInteractionPack: PartInteractionPack = {
  partId: 'rear-suspension', theme: '#e5a349', experimentsFor: rearSuspensionExperimentsFor, referenceCards: rearSuspensionReferenceCards, faultCardsFor: rearSuspensionFaultCardsFor,
}

const steeringExperimentsFor = (vehicleId: VehicleId): InteractionExperiment[] => {
  const gp = vehicleId === 'grand-prix-2026'
  const ratioParameters = [
    parameter('steeringWheelAngle', '方向盘角', 'Steering-wheel angle', gp ? -220 : -270, gp ? 220 : 270, 2, gp ? 80 : 90, '°'),
    parameter('steeringRatio', '总转向比', 'Overall steering ratio', gp ? 6 : 3, gp ? 14 : 10, .2, gp ? 10 : 5.5, ':1'),
    parameter('steeringArmLength', '转向臂长度', 'Steering-arm length', gp ? 40 : 45, gp ? 90 : 100, 1, gp ? 60 : 70, 'mm'),
    parameter('rackTravelLimit', '单侧齿条行程', 'One-side rack travel', gp ? 15 : 20, gp ? 45 : 55, 1, gp ? 30 : 38, 'mm'),
  ]
  const ackermannParameters = [
    parameter('wheelbase', '轴距', 'Wheelbase', gp ? 3200 : 1500, gp ? 3700 : 1900, 10, gp ? 3550 : 1600, 'mm'),
    parameter('frontTrack', '前轮距', 'Front track', gp ? 1500 : 1100, gp ? 1700 : 1500, 10, gp ? 1600 : 1250, 'mm'),
    parameter('meanSteer', '平均前轮转角', 'Mean road-wheel angle', 0, gp ? 18 : 35, .25, gp ? 8 : 15, '°'),
    parameter('ackermannPercent', 'Ackermann 比例', 'Ackermann percentage', -50, 120, 2, gp ? 35 : 70, '%'),
  ]
  const bumpSteerParameters = [
    parameter('wheelTravel', '轮端行程', 'Wheel travel', gp ? -30 : -45, gp ? 30 : 45, 1, gp ? 12 : 20, 'mm'),
    parameter('innerHeightError', '拉杆内点高度偏差', 'Inner-joint height error', gp ? -20 : -30, gp ? 20 : 30, 1, gp ? 4 : 5, 'mm'),
    parameter('innerForeAftError', '拉杆内点前后偏差', 'Inner-joint fore-aft error', gp ? -20 : -30, gp ? 20 : 30, 1, gp ? -3 : -4, 'mm'),
    parameter('steeringArmLength', '转向臂长度', 'Steering-arm length', gp ? 40 : 45, gp ? 90 : 100, 1, gp ? 60 : 70, 'mm'),
  ]
  const effortParameters = [
    parameter('wheelLoad', '单轮前轴载荷', 'Front wheel load', gp ? 1500 : 200, gp ? 9000 : 2000, gp ? 100 : 25, gp ? 4200 : 800, 'N'),
    parameter('mechanicalTrail', '机械拖距', 'Mechanical trail', 0, gp ? 60 : 80, 1, gp ? 20 : 25, 'mm'),
    parameter('scrubRadius', '主销偏置距', 'Scrub radius', -30, gp ? 40 : 50, 1, gp ? 3 : 8, 'mm'),
    parameter('steeringRatio', '总转向比', 'Overall steering ratio', gp ? 6 : 3, gp ? 14 : 10, .2, gp ? 10 : 5.5, ':1'),
  ]
  const jointParameters = [
    parameter('jointAngle', '单节夹角', 'Joint angle', 0, gp ? 30 : 35, 1, gp ? 12 : 15, '°'),
    parameter('phaseError', '两节相位误差', 'Two-joint phase error', 0, 90, 2, gp ? 8 : 12, '°'),
    parameter('rackBacklash', '齿条等效齿隙', 'Equivalent rack backlash', 0, gp ? .8 : 1.5, .05, gp ? .1 : .2, 'mm'),
    parameter('columnStiffness', '转向柱扭转刚度', 'Column torsional stiffness', gp ? 20 : 5, gp ? 150 : 60, gp ? 2 : 1, gp ? 80 : 25, 'N·m/deg'),
  ]

  return [
    {
      id: 'rack-ratio', title: l('方向盘到齿条', 'Steering wheel to rack'), question: l('手转多少，车轮才转多少？', 'How much hand angle creates how much road-wheel angle?'), mode: 'flow', parameters: ratioParameters,
      evaluate: values => {
        const steeringWheelAngle = read(values, ratioParameters, 'steeringWheelAngle')
        const steeringRatio = read(values, ratioParameters, 'steeringRatio')
        const armLength = read(values, ratioParameters, 'steeringArmLength')
        const travelLimit = read(values, ratioParameters, 'rackTravelLimit')
        const pinionTravelPerDegree = armLength * Math.PI / 180 / Math.max(1, steeringRatio)
        const requestedRackTravel = steeringWheelAngle * pinionTravelPerDegree
        const rackTravel = clamp(requestedRackTravel, -travelLimit, travelLimit)
        const wheelAngle = Math.asin(clamp(rackTravel / Math.max(1, armLength), -.98, .98)) * 180 / Math.PI
        const stopMargin = clamp(1 - Math.abs(rackTravel) / Math.max(1, travelLimit))
        const turnsLockToLock = 2 * travelLimit / Math.max(EPSILON, Math.abs(pinionTravelPerDegree)) / 360
        return result([
          metric('road-wheel-angle', '平均前轮转角', 'Mean road-wheel angle', wheelAngle, '°'),
          metric('rack-displacement', '齿条位移', 'Rack displacement', rackTravel, 'mm'),
          metric('lock-to-lock', '锁到锁圈数', 'Turns lock-to-lock', turnsLockToLock, 'turn'),
          metric('stop-margin', '机械止挡余量', 'Mechanical stop margin', stopMargin * 100, '%', stopMargin < .05 ? 'danger' : stopMargin < .2 ? 'warn' : 'good'),
        ], curve(angle => clamp(angle * pinionTravelPerDegree, -travelLimit, travelLimit), ratioParameters[0]!.min, ratioParameters[0]!.max, 41),
        l('更快转向比减少手部行程，却提高敏感度与手力；机械止挡必须先于轮胎、轮辋或拉杆干涉。', 'A quicker ratio reduces hand travel but raises sensitivity and effort; mechanical stops must precede tyre, rim or link interference.'),
        [l('方向盘', 'Steering wheel'), l('万向节', 'Universal joints'), l('齿条', 'Rack'), l('车轮', 'Road wheel')],
        [normalise(Math.abs(steeringWheelAngle), 0, ratioParameters[0]!.max), normalise(Math.abs(steeringWheelAngle), 0, ratioParameters[0]!.max), normalise(Math.abs(rackTravel), 0, travelLimit), normalise(Math.abs(wheelAngle), 0, gp ? 20 : 40)],
        { marker: normalise(steeringWheelAngle, ratioParameters[0]!.min, ratioParameters[0]!.max), risk: 1 - stopMargin, direction: signed(steeringWheelAngle) })
      },
    },
    {
      id: 'ackermann', title: l('阿克曼几何', 'Ackermann geometry'), question: l('内外轮怎样指向同一个转弯中心？', 'How do inner and outer wheels point toward one turn centre?'), mode: 'geometry', parameters: ackermannParameters,
      evaluate: values => {
        const wheelbase = read(values, ackermannParameters, 'wheelbase') / 1000
        const track = read(values, ackermannParameters, 'frontTrack') / 1000
        const meanSteer = read(values, ackermannParameters, 'meanSteer')
        const percentage = read(values, ackermannParameters, 'ackermannPercent') / 100
        const radius = wheelbase / Math.max(.01, Math.tan(radians(Math.max(.1, meanSteer))))
        const idealInner = Math.atan(wheelbase / Math.max(.05, radius - track / 2)) * 180 / Math.PI
        const idealOuter = Math.atan(wheelbase / Math.max(.05, radius + track / 2)) * 180 / Math.PI
        const inner = meanSteer + percentage * (idealInner - meanSteer)
        const outer = meanSteer + percentage * (idealOuter - meanSteer)
        const innerError = inner - idealInner
        const outerError = outer - idealOuter
        return result([
          metric('inner-angle', '内轮转角', 'Inner-wheel angle', inner, '°'),
          metric('outer-angle', '外轮转角', 'Outer-wheel angle', outer, '°'),
          metric('turn-radius', '几何转弯半径', 'Geometric turn radius', radius, 'm'),
          metric('rolling-error', '纯滚动误差', 'Pure-rolling error', Math.hypot(innerError, outerError), '°', Math.hypot(innerError, outerError) > 2 ? 'warn' : 'good'),
        ], curve(percent => {
          const p = percent / 100
          const i = meanSteer + p * (idealInner - meanSteer)
          const o = meanSteer + p * (idealOuter - meanSteer)
          return i - o
        }, -50, 120, 35),
        l('100% Ackermann 只满足低速纯滚动几何；高速轮胎的负载与最佳侧偏角不同，未必以 100% 为最佳。', '100% Ackermann only satisfies low-speed pure rolling; at speed the tyres carry different loads and optimum slip angles, so 100% need not be best.'),
        [l('内前轮', 'Inner front'), l('内轮轨迹', 'Inner path'), l('外轮轨迹', 'Outer path'), l('外前轮', 'Outer front')],
        [normalise(inner, 0, gp ? 22 : 40), normalise(radius - track / 2, 0, 30), normalise(radius + track / 2, 0, 30), normalise(outer, 0, gp ? 22 : 40)],
        { marker: normalise(percentage, -.5, 1.2), risk: normalise(Math.hypot(innerError, outerError), .5, 4), direction: 1 })
      },
    },
    {
      id: 'bump-steer', title: l('悬架跳动转向', 'Bump steer'), question: l('方向盘不动，轮跳为何仍会改变前束？', 'Why can bump change toe with the steering wheel fixed?'), mode: 'curve', parameters: bumpSteerParameters,
      evaluate: values => {
        const wheelTravel = read(values, bumpSteerParameters, 'wheelTravel')
        const heightError = read(values, bumpSteerParameters, 'innerHeightError')
        const foreAftError = read(values, bumpSteerParameters, 'innerForeAftError')
        const armLength = read(values, bumpSteerParameters, 'steeringArmLength')
        const toeAt = (travel: number) => {
          const linear = heightError / Math.max(30, armLength) * travel * .015
          const quadratic = foreAftError / Math.max(30, armLength) * (travel * Math.abs(travel)) * .0003
          return linear + quadratic
        }
        const toe = toeAt(wheelTravel)
        const range = gp ? 30 : 45
        const samples = curve(toeAt, -range, range, 41)
        let maxGradient = 0
        for (let index = 1; index < samples.length; index += 1) {
          const previous = samples[index - 1]!
          const current = samples[index]!
          maxGradient = Math.max(maxGradient, Math.abs((current.y - previous.y) / Math.max(EPSILON, current.x - previous.x)) * 25)
        }
        const yawProxy = toe * (gp ? 38 : 12)
        const scrubIndex = clamp(Math.abs(toe) / (gp ? .35 : .6))
        return result([
          metric('toe-change', '当前 toe change', 'Current toe change', toe, '°', Math.abs(toe) > (gp ? .3 : .5) ? 'danger' : Math.abs(toe) > (gp ? .15 : .25) ? 'warn' : 'good'),
          metric('toe-gradient', '最大梯度', 'Maximum toe gradient', maxGradient, '°/25 mm'),
          metric('yaw-proxy', '横摆扰动代理', 'Yaw-disturbance proxy', yawProxy, '°/s'),
          metric('scrub-index', '轮胎擦洗指数', 'Tyre-scrub index', scrubIndex * 100, '%', scrubIndex > .75 ? 'warn' : 'good'),
        ], samples, l('静态 toe 为零并不代表全行程 bump steer 为零；拉杆与悬架轨迹必须在完整行程中匹配。', 'Zero static toe does not mean zero bump steer across travel; tie-rod and suspension trajectories must match throughout the range.'),
        [l('左车轮', 'Left wheel'), l('左拉杆', 'Left tie rod'), l('右拉杆', 'Right tie rod'), l('右车轮', 'Right wheel')],
        [normalise(Math.abs(toe), 0, gp ? .5 : .8), normalise(Math.hypot(heightError, foreAftError), 0, gp ? 28 : 42), normalise(Math.hypot(heightError, foreAftError), 0, gp ? 28 : 42), normalise(Math.abs(toe), 0, gp ? .5 : .8)],
        { marker: normalise(wheelTravel, -range, range), risk: scrubIndex, direction: clamp(toe / (gp ? .35 : .6), -1, 1) })
      },
    },
    {
      id: 'steering-effort', title: l('回正与驾驶员手力', 'Self-aligning and hand effort'), question: l('轮胎力如何沿主销和齿条传到双手？', 'How do tyre forces reach the driver through kingpin and rack?'), mode: 'field', parameters: effortParameters,
      evaluate: values => {
        const wheelLoad = read(values, effortParameters, 'wheelLoad')
        const mechanicalTrail = read(values, effortParameters, 'mechanicalTrail') / 1000
        const scrubRadius = read(values, effortParameters, 'scrubRadius') / 1000
        const steeringRatio = read(values, effortParameters, 'steeringRatio')
        const lateralForce = wheelLoad * (gp ? 1.5 : 1.15)
        const brakingForce = wheelLoad * .65
        const pneumaticTrail = gp ? .035 : .025
        const singleWheelAligningTorque = lateralForce * (mechanicalTrail + pneumaticTrail)
        // Equal left/right braking forces create opposing scrub moments and
        // cancel at the rack.  Retain only a representative force split for
        // the kickback contribution.
        const brakeForceDifference = brakingForce * (gp ? .08 : .12)
        const scrubKickTorque = brakeForceDifference * scrubRadius
        const steeringSystemTorque = 2 * singleWheelAligningTorque + scrubKickTorque
        const armLength = gp ? .06 : .07
        const rackForce = steeringSystemTorque / armLength
        // GP steering is power assisted. Keep rack force mechanical, while a
        // representative assist factor maps it to the driver's hand torque.
        const assistFactor = gp ? .25 : 1
        const handTorque = steeringSystemTorque / Math.max(1, steeringRatio) / .88 * assistFactor
        const reserve = clamp((mechanicalTrail + pneumaticTrail) / (gp ? .095 : .105))
        return result([
          metric('kingpin-torque', '双轮转向轴合力矩', 'Combined steering-axis torque', steeringSystemTorque, 'N·m'),
          metric('rack-force', '齿条力', 'Rack force', rackForce, 'N'),
          metric('hand-torque', '驾驶员手力矩', 'Driver hand torque', handTorque, 'N·m', Math.abs(handTorque) > (gp ? 28 : 18) ? 'warn' : 'good'),
          metric('self-centring', '回正储备', 'Self-centring reserve', reserve * 100, '%'),
        ], curve(load => {
          const fy = load * (gp ? 1.5 : 1.15)
          const fxDifference = load * .65 * (gp ? .08 : .12)
          const systemTorque = 2 * fy * (mechanicalTrail + pneumaticTrail) + fxDifference * scrubRadius
          return systemTorque / Math.max(1, steeringRatio) / .88 * assistFactor
        }, effortParameters[0]!.min, effortParameters[0]!.max, 31),
        l(gp ? '拖距提高回正力矩；GP 分支用代表性助力系数映射驾驶员手力，最终数值仍需所选助力系统的台架图校准。' : '拖距提高回正也提高手力；主销偏置距会把左右制动力差变成方向盘反扭矩。', gp ? 'Trail raises self-centring torque; the GP branch uses a representative assist factor for hand effort and still needs calibration to the selected steering system.' : 'Trail increases both self-centring and effort; scrub radius converts left-right brake-force split into steering kickback.'),
        [l('轮胎侧向力', 'Tyre lateral force'), l('气动拖距', 'Pneumatic trail'), l('机械拖距', 'Mechanical trail'), l('Scrub 力矩', 'Scrub moment'), l('方向盘', 'Steering wheel')],
        [normalise(lateralForce, 0, gp ? 14000 : 2500), normalise(pneumaticTrail, 0, .05), normalise(mechanicalTrail, 0, .08), normalise(Math.abs(scrubKickTorque), 0, gp ? 30 : 12), normalise(Math.abs(handTorque), 0, gp ? 35 : 24)],
        { marker: normalise(wheelLoad, effortParameters[0]!.min, effortParameters[0]!.max), risk: normalise(Math.abs(handTorque), gp ? 18 : 12, gp ? 36 : 24), direction: signed(steeringSystemTorque) })
      },
    },
    {
      id: 'column-precision', title: l('万向节与中心精度', 'U-joints and on-centre precision'), question: l('相位、齿隙和柱扭转如何形成中心死区？', 'How do phasing, backlash and column twist create on-centre deadband?'), mode: 'timeline', parameters: jointParameters,
      evaluate: values => {
        const jointAngle = read(values, jointParameters, 'jointAngle')
        const phaseError = read(values, jointParameters, 'phaseError')
        const backlash = read(values, jointParameters, 'rackBacklash')
        const stiffness = read(values, jointParameters, 'columnStiffness')
        const beta = radians(jointAngle)
        const phase = radians(phaseError)
        const ripple = clamp((1 / Math.max(.2, Math.cos(beta)) - 1) * Math.abs(Math.sin(phase / 2)) * 2, 0, .6)
        const pinionTravelPerDegree = gp ? .18 : .22
        const deadband = backlash / Math.max(.02, pinionTravelPerDegree)
        const representativeTorque = gp ? 24 : 12
        const twist = representativeTorque / Math.max(1, stiffness)
        const precision = clamp(1 - ripple * 1.5 - deadband / (gp ? 8 : 12) - twist / (gp ? 1.2 : 2.2))
        const points = curve(inputAngle => {
          const wave = inputAngle + ripple * 12 * Math.sin(radians(inputAngle * 2))
          const afterBacklash = Math.abs(wave) <= deadband ? 0 : wave - signed(wave) * deadband
          const transmitted = Math.max(0, Math.abs(afterBacklash) - twist)
          return signed(afterBacklash) * transmitted
        }, -180, 180, 73)
        return result([
          metric('speed-ripple', '输出角速度波动', 'Output speed ripple', ripple * 100, '%', ripple > .12 ? 'warn' : 'good'),
          metric('steering-deadband', '方向盘死区', 'Steering deadband', deadband, '°', deadband > (gp ? 4 : 6) ? 'warn' : 'good'),
          metric('column-twist', '转向柱扭转', 'Column twist', twist, '°'),
          metric('centre-precision', '中心精度指数', 'On-centre precision', precision * 100, '%', precision < .55 ? 'danger' : precision < .75 ? 'warn' : 'good'),
        ], points, l('两节万向节只有在节角和相位匹配时才能抵消速度不均；齿隙与柔度会先吸收方向盘输入。', 'Two U-joints cancel speed nonuniformity only when angles and phasing match; backlash and compliance absorb initial hand input.'),
        [l('输入速度', 'Input speed'), l('节角波动', 'Joint ripple'), l('齿隙', 'Backlash'), l('柱扭转', 'Column twist')],
        [1, ripple, normalise(deadband, 0, gp ? 8 : 12), normalise(twist, 0, gp ? 1.2 : 2.2)],
        { marker: normalise(phaseError, 0, 90), risk: 1 - precision, direction: 1 })
      },
    },
  ]
}

const steeringReferenceCards: InteractionReferenceCard[] = [
  {
    id: 'steering-fia', title: l('FIA 转向自由度与助力', 'FIA steering freedom and assistance'), image: '/images/interactions/steering/reference-1.webp', imageAlt: l('方向盘到前轮的合法转向链', 'Legal steering chain from wheel to front road wheels'), summary: l('方向盘只重新对正两个前轮，并保持单调输入关系。', 'The steering wheel realigns only the front two wheels through a monotonic relationship.'),
    purpose: l('约束 GP 转向架构、助力来源和冲击安全。', 'Constrains GP steering architecture, assistance source and impact safety.'), details: [l('只有两个前轮可被方向盘重新对正。', 'Only the two front wheels may be realigned by the steering wheel.'), l('输入与前轮方向保持单调关系。', 'Input and road-wheel direction retain a monotonic relationship.'), l('助力不得电子控制或由电力驱动。', 'Assistance may not be electronically controlled or electrically powered.')], sourceTitle: l('FIA 2026 技术规则 Section C', 'FIA 2026 Technical Regulations Section C'), url: 'https://www.fia.com/system/files/documents/fia_2026_f1_regulations_-_section_c_technical_-_iss_19_-_2026-06-25.pdf',
  },
  {
    id: 'steering-ackermann', title: l('SAE Ackermann 几何分析', 'SAE Ackermann geometry analysis'), image: '/images/interactions/steering/reference-2.webp', imageAlt: l('同心轮迹与激光转角测量', 'Concentric tyre paths and laser steering-angle measurement'), summary: l('100% Ackermann 是低速几何参考，不是全赛道固定答案。', '100% Ackermann is a low-speed geometric reference, not a fixed all-track answer.'),
    purpose: l('分离纯滚动几何与真实轮胎侧偏、载荷敏感性。', 'Separates pure-rolling geometry from real tyre slip and load sensitivity.'), details: [l('理想内外角由轴距、轮距与半径决定。', 'Ideal inner/outer angles follow wheelbase, track and radius.'), l('最佳侧偏随轮胎载荷变化。', 'Optimum slip angle changes with tyre load.'), l('实际 Ackermann 随转角非线性变化。', 'Actual Ackermann varies nonlinearly with steering angle.')], sourceTitle: l('SAE Ackermann steering geometry', 'SAE Ackermann steering geometry'), url: 'https://saemobilus.sae.org/papers/analysis-ackermann-steering-geometry-2006-01-3638',
  },
  {
    id: 'steering-bump-steer', title: l('SAE Bump-steer 建模验证', 'SAE bump-steer model validation'), image: '/images/interactions/steering/reference-3.webp', imageAlt: l('方向盘锁定的 K&C toe 测试', 'K&C toe test with the steering wheel locked'), summary: l('CAD 零 bump-steer 必须由完整行程的实车量测确认。', 'CAD zero bump steer must be confirmed by physical full-travel measurement.'),
    purpose: l('把拉杆轨迹模型连接到硬点、公差、柔度和台架。', 'Connects tie-rod trajectory models to hardpoints, tolerance, compliance and the rig.'), details: [l('Bump steer 是无方向盘输入的轮跳转角。', 'Bump steer is wheel-travel-induced steer without steering input.'), l('核心是拉杆与悬架轨迹匹配。', 'The core problem is tie-rod/suspension trajectory matching.'), l('模型需要实车硬点和量测验证。', 'The model requires physical hardpoints and measurement validation.')], sourceTitle: l('SAE bump-steer validation', 'SAE bump-steer validation'), url: 'https://saemobilus.sae.org/papers/validation-2d-mathematical-model-applied-reach-zero-bump-steer-2014-36-0360',
  },
]

const steeringFaultCardsFor = (vehicleId: VehicleId): InteractionFaultCard[] => {
  const gp = vehicleId === 'grand-prix-2026'
  return [
    {
      id: 'steering-u-joint-phase', title: l('万向节相位错误', 'Mis-phased U-joints'), image: '/images/interactions/steering/fault-1.webp', imageAlt: l('万向节相位激光线与速度波形', 'U-joint phase laser lines and speed traces'),
      scenario: gp ? l('方向盘恒定 110°/s 输入，齿条等效速率在 91–132°/s 周期波动，两个叉相位差 22°。', 'At a constant 110°/s hand input, rack-equivalent rate cycles 91–132°/s and yoke phase error is 22°.') : l('方向盘恒定 90°/s 输入，齿条等效速率在 72–111°/s 周期波动，两个叉相位差 28°。', 'At a constant 90°/s hand input, rack-equivalent rate cycles 72–111°/s and yoke phase error is 28°.'),
      strategy: l('检查节角、叉相位和花键标记；恢复两节抵消几何后扫方向盘输入与齿条位移。', 'Check joint angles, yoke phasing and spline marks; restore cancelling geometry and sweep steering input versus rack travel.'), principle: l('Hooke joint 的非等速误差在错误相位下不能由第二节抵消，留下二次谐波。', 'Hooke-joint speed nonuniformity is not cancelled by the second joint when phasing is wrong, leaving a second harmonic.'), evidence: l('恒速输入时齿条速率波动回到公差，左右转一致且无局部扭矩峰。', 'Rack-rate ripple returns to tolerance under constant input, with symmetric turns and no local torque peak.'),
    },
    {
      id: 'steering-brake-pull', title: l('制动力差引发方向盘猛拉', 'Brake-force split causes steering pull'), image: '/images/interactions/steering/fault-2.webp', imageAlt: l('主销几何、制动力箭头与方向盘测力环', 'Kingpin geometry, brake-force arrows and steering torque ring'),
      scenario: gp ? l('左前夹紧力比右前高 9%，scrub radius +7 mm，方向盘瞬时反扭矩 6.1 N·m。', 'LF clamp force is 9% above RF with +7 mm scrub radius, causing a 6.1 N·m steering kick.') : l('左前夹紧力比右前高 14%，scrub radius +18 mm，方向盘瞬时反扭矩 7.2 N·m。', 'LF clamp force is 14% above RF with +18 mm scrub radius, causing a 7.2 N·m steering kick.'),
      strategy: l('先查左右制动压力、温度、摩擦片与轮胎，再测轮毂、主销轴和轮辋偏距。', 'Check left-right pressure, temperature, pads and tyres first, then hub, kingpin axis and wheel offset.'), principle: l('纵向力差通过 scrub radius 绕主销产生力矩，经齿条传到驾驶员。', 'Longitudinal force split acts through scrub radius about the kingpin and reaches the driver through the rack.'), evidence: l('左右制动力矩匹配、方向盘反扭矩下降、直线制动横摆接近零。', 'Left-right brake torque matches, steering kick falls and straight-line brake yaw approaches zero.'),
    },
    {
      id: 'steering-deadband', title: l('中心死区', 'On-centre deadband'), image: '/images/interactions/steering/fault-3.webp', imageAlt: l('齿条座位移表与输入输出滞回环', 'Rack-mount dial gauge and input-output hysteresis loop'),
      scenario: gp ? l('方向盘从 −2.0° 到 +2.3° 摆动时齿条几乎不动，过零后跳变 0.45 mm，齿条座见证漆错位。', 'The rack barely moves while the wheel sweeps −2.0° to +2.3°, then jumps 0.45 mm; rack-mount witness paint has shifted.') : l('方向盘从 −3.0° 到 +3.4° 摆动时齿条几乎不动，过零后跳变 0.8 mm，左齿条座见证漆错位。', 'The rack barely moves while the wheel sweeps −3.0° to +3.4°, then jumps 0.8 mm; the left rack-mount witness mark has shifted.'),
      strategy: l('加载转向系统，依次隔离花键、万向节、柱轴承、小齿轮预载、齿条衬套、安装座与球头。', 'Load the steering system and isolate spline, U-joints, column bearings, pinion preload, rack bush, mounts and joints in sequence.'), principle: l('间隙和安装运动先吸收反向输入；低刚度产生较平滑扭转，需用回线形状区分。', 'Backlash and mount motion absorb reversal first; low stiffness produces smoother twist and is distinguished by loop shape.'), evidence: l('输入—输出回线收窄、安装座无相对位移、中心回正对称且路试修正频率下降。', 'The input-output loop narrows, mount motion disappears, centring is symmetric and road corrections decrease.'),
    },
  ]
}

export const steeringInteractionPack: PartInteractionPack = {
  partId: 'steering', theme: '#f0d07c', experimentsFor: steeringExperimentsFor, referenceCards: steeringReferenceCards, faultCardsFor: steeringFaultCardsFor,
}

export const dynamicsInteractionPacks: PartInteractionPack[] = [
  tiresInteractionPack,
  brakesInteractionPack,
  frontSuspensionInteractionPack,
  rearSuspensionInteractionPack,
  steeringInteractionPack,
]

export const dynamicsInteractionPackByPart = Object.fromEntries(
  dynamicsInteractionPacks.map(pack => [pack.partId, pack]),
) as Record<'tires' | 'brakes' | 'front-suspension' | 'rear-suspension' | 'steering', PartInteractionPack>

export const getDynamicsInteractionPack = (partId: keyof typeof dynamicsInteractionPackByPart) => dynamicsInteractionPackByPart[partId]
