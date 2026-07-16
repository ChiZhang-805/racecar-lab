import type { VehicleId } from './vehicles'
import {
  interactionClamp as clamp,
  interactionCurve as curve,
  interactionMetric as metric,
  interactionParameter as parameter,
  localText as l,
  type InteractionExperiment,
  type InteractionFaultCard,
  type InteractionReferenceCard,
  type InteractionResult,
  type PartInteractionPack,
} from './interactionTypes'

const isGp = (vehicleId: VehicleId) => vehicleId === 'grand-prix-2026'
const read = (values: Record<string, number>, key: string, fallback: number) => {
  const candidate = values[key]
  return Number.isFinite(candidate) ? candidate! : fallback
}
const div = (numerator: number, denominator: number) => numerator / Math.max(1e-9, Math.abs(denominator))
const bounded = (value: number, min = 0, max = 1) => Number.isFinite(value) ? clamp(value, min, max) : min
const warnTone = (value: number, warn: number, danger: number) => value >= danger ? 'danger' as const : value >= warn ? 'warn' as const : 'good' as const
const lowTone = (value: number, warn: number, danger: number) => value <= danger ? 'danger' as const : value <= warn ? 'warn' as const : 'good' as const
const qAt = (speedKph: number) => 0.5 * 1.18 * (speedKph / 3.6) ** 2
const safeResult = (result: InteractionResult): InteractionResult => ({
  ...result,
  metrics: result.metrics.map(item => ({ ...item, value: Number.isFinite(item.value) ? item.value : 0 })),
  points: result.points.map(point => ({ x: Number.isFinite(point.x) ? point.x : 0, y: Number.isFinite(point.y) ? point.y : 0 })),
  secondaryPoints: result.secondaryPoints?.map(point => ({ x: Number.isFinite(point.x) ? point.x : 0, y: Number.isFinite(point.y) ? point.y : 0 })),
  visual: {
    ...result.visual,
    values: result.visual.values.map(value => bounded(value)),
    marker: result.visual.marker === undefined ? undefined : bounded(result.visual.marker),
    risk: result.visual.risk === undefined ? undefined : bounded(result.visual.risk),
    direction: result.visual.direction === undefined ? undefined : bounded(result.visual.direction, -1, 1),
  },
})

const frontWingExperimentsFor = (vehicleId: VehicleId): InteractionExperiment[] => {
  const gp = isGp(vehicleId)
  const loadAt = (speed: number, incidence: number, area: number) => {
    const peak = gp ? 17 : 15
    const linear = 0.16 + (gp ? 0.105 : 0.095) * incidence
    const stall = incidence <= peak ? 1 : Math.exp(-(((incidence - peak) / (gp ? 6 : 5)) ** 2))
    return qAt(speed) * area * Math.max(0.05, linear * stall)
  }
  return [
    {
      id: 'speed-incidence-load', title: l('速度—迎角载荷图', 'Speed–incidence load map'),
      question: l('迎角越大，前翼下压力会一直增加吗？', 'Does front-wing load always rise with incidence?'), mode: 'curve',
      parameters: [
        parameter('speed', '车速', 'Speed', gp ? 80 : 20, gp ? 350 : 120, gp ? 5 : 2, gp ? 240 : 70, 'km/h'),
        parameter('incidence', '有效迎角', 'Effective incidence', 0, gp ? 25 : 22, 0.5, gp ? 12 : 10, '°'),
        parameter('area', '参考面积', 'Reference area', gp ? 0.45 : 0.20, gp ? 0.85 : 0.70, 0.01, gp ? 0.65 : 0.45, 'm²'),
        parameter('frontShare', '前轴气动分配', 'Front aero share', 35, 65, 1, gp ? 47 : 50, '%'),
      ],
      evaluate: values => {
        const speed = read(values, 'speed', gp ? 240 : 70)
        const incidence = read(values, 'incidence', gp ? 12 : 10)
        const area = read(values, 'area', gp ? 0.65 : 0.45)
        const frontShare = read(values, 'frontShare', gp ? 47 : 50)
        const load = loadAt(speed, incidence, area)
        const cd = 0.08 + 0.035 * incidence + 0.0018 * incidence ** 2
        const drag = qAt(speed) * area * cd
        const stalled = incidence > (gp ? 17 : 15)
        return safeResult({
      metrics: [metric('load', '前翼下压力', 'Front-wing load', load, 'N', stalled ? 'warn' : 'good'), metric('drag', '翼面阻力', 'Wing drag', drag, 'N'), metric('efficiency', '载阻比', 'Load-to-drag', div(load, drag), '—'), metric('front-share', '前轴气动分配', 'Front aero share', frontShare, '%')],
          points: curve(x => loadAt(speed, x, area), 0, gp ? 25 : 22),
          insight: stalled ? l('迎角已经越过教学失速区；流动分离使载荷下降，而阻力仍很高。', 'Incidence has passed the teaching stall region: separation reduces load while drag remains high.') : l('载荷通过动压随速度平方增长；迎角只在附着工作窗内近似有效。', 'Load scales with the square of speed through dynamic pressure; incidence helps only within the attached-flow window.'),
          visual: { labels: [l('压力', 'Pressure'), l('附着', 'Attachment'), l('载荷', 'Load'), l('阻力', 'Drag')], values: [bounded(qAt(speed) / qAt(gp ? 350 : 120)), stalled ? 0.28 : 0.85, bounded(load / (gp ? 5000 : 1200)), bounded(drag / (gp ? 2500 : 650))], marker: bounded(incidence / (gp ? 25 : 22)), risk: stalled ? 0.8 : 0.2 },
        })
      },
    },
    {
      id: 'ride-height-pitch-window', title: l('离地高度与俯仰工作窗', 'Ride-height and pitch window'),
      question: l('制动俯冲为什么可能先增载、随后掉载？', 'Why can brake dive first add load and then lose it?'), mode: 'curve',
      parameters: [
        parameter('height', '前翼最低间隙', 'Minimum wing clearance', gp ? 18 : 25, gp ? 75 : 100, 1, gp ? 36 : 52, 'mm'),
        parameter('pitch', '车身俯仰', 'Vehicle pitch', -2, 3, 0.1, 0.5, '°'),
        parameter('speed', '车速', 'Speed', gp ? 80 : 20, gp ? 330 : 120, 5, gp ? 250 : 75, 'km/h'),
      ],
      evaluate: values => {
        const height = read(values, 'height', gp ? 36 : 52)
        const pitch = read(values, 'pitch', 0.5)
        const speed = read(values, 'speed', gp ? 250 : 75)
        const optimum = (gp ? 34 : 50) - pitch * (gp ? 3 : 4)
        const window = (h: number) => bounded(Math.exp(-(((h - optimum) / (gp ? 18 : 27)) ** 2)) * (h < (gp ? 23 : 32) ? 0.55 + 0.45 * div(h, gp ? 23 : 32) : 1))
        const retention = window(height)
        const load = qAt(speed) * (gp ? 0.62 : 0.42) * (0.3 + 1.65 * retention)
        const strike = height - (gp ? 18 : 30)
        return safeResult({
          metrics: [metric('retention', '载荷保持率', 'Load retention', retention * 100, '%', lowTone(retention, 0.7, 0.45)), metric('load', '前翼下压力', 'Front-wing load', load, 'N'), metric('cop', '前轴压力中心', 'Front pressure centre', 44 + pitch * 2.2 - (1 - retention) * 5, '% chord'), metric('strike', '触地裕度', 'Strike margin', strike, 'mm', lowTone(strike, 10, 2))],
          points: curve(h => window(h) * 100, gp ? 18 : 25, gp ? 75 : 100),
          insight: height < optimum ? l('继续压低已经越过最佳间隙，节流、分离或触地风险开始主导。', 'Further lowering has crossed the best gap; choking, separation or strike risk now dominates.') : l('工作窗需要覆盖制动姿态，而不是只追求静态峰值。', 'The operating window must cover braking attitude rather than one static peak.'),
          visual: { labels: [l('间隙', 'Gap'), l('俯仰', 'Pitch'), l('附着', 'Attachment'), l('触地裕度', 'Strike margin')], values: [bounded(height / (gp ? 75 : 100)), bounded((pitch + 2) / 5), retention, bounded(strike / (gp ? 57 : 70))], marker: bounded((height - (gp ? 18 : 25)) / (gp ? 57 : 75)), risk: bounded(1 - Math.min(retention, bounded(strike / 12))) },
        })
      },
    },
    {
      id: 'multi-element-slot', title: l('多翼片缝隙呼吸', 'Multi-element slot breathing'),
      question: l('缝隙和搭接怎样保持后翼片附着？', 'How do gap and overlap keep a downstream flap attached?'), mode: 'flow',
      parameters: [
        parameter('gap', '缝隙', 'Gap', 3, 24, 0.5, gp ? 10 : 12, 'mm'),
        parameter('overlap', '搭接', 'Overlap', -8, 18, 0.5, gp ? 5 : 6, 'mm'),
        parameter('incidence', '后翼片迎角', 'Downstream-flap incidence', 4, 26, 0.5, gp ? 16 : 14, '°'),
        parameter('speed', '车速', 'Speed', gp ? 80 : 20, gp ? 330 : 120, 5, gp ? 230 : 70, 'km/h'),
      ],
      evaluate: values => {
        const gap = read(values, 'gap', gp ? 10 : 12)
        const overlap = read(values, 'overlap', gp ? 5 : 6)
        const incidence = read(values, 'incidence', gp ? 16 : 14)
        const speed = read(values, 'speed', gp ? 230 : 70)
        const slotQuality = bounded(Math.exp(-(((gap - (gp ? 10 : 12)) / 6) ** 2) - (((overlap - 5) / 10) ** 2)) * (1 - Math.max(0, incidence - 20) * 0.035))
        const slotSpeed = speed / 3.6 * (1.05 + 0.8 * slotQuality)
        const attachment = 30 + 70 * slotQuality
        const load = qAt(speed) * (gp ? 0.65 : 0.44) * (0.45 + 1.4 * slotQuality)
        const drag = qAt(speed) * (gp ? 0.65 : 0.44) * (0.11 + incidence ** 2 * 0.0014 + (1 - slotQuality) * 0.16)
        return safeResult({
          metrics: [metric('slot-speed', '缝隙射流速度', 'Slot-jet speed', slotSpeed, 'm/s'), metric('attachment', '附着质量', 'Attachment quality', attachment, '%', lowTone(attachment, 65, 42)), metric('load', '组合下压力', 'Combined load', load, 'N'), metric('drag', '组合阻力', 'Combined drag', drag, 'N')],
          points: curve(g => Math.exp(-(((g - (gp ? 10 : 12)) / 6) ** 2)) * 100, 3, 24),
          insight: l('合适的缝隙射流为后翼片边界层补充动量；过窄、过宽或被污染都会破坏协同。', 'A suitable slot jet energises the downstream boundary layer; too narrow, too wide or contaminated breaks the interaction.'),
          visual: { labels: [l('主翼片', 'Main element'), l('缝隙射流', 'Slot jet'), l('后翼片', 'Flap'), l('尾流', 'Wake')], values: [0.78, slotQuality, bounded(attachment / 100), bounded(1 - drag / (gp ? 2200 : 600))], risk: 1 - slotQuality },
        })
      },
    },
    {
      id: 'front-tyre-wake', title: l('前轮尾流管理', 'Front-tyre wake management'),
      question: l('转向和横摆怎样改变底板入口来流？', 'How do steering and yaw alter floor-inlet flow?'), mode: 'field',
      parameters: [
        parameter('steer', '前轮转角', 'Front-wheel steer', -18, 18, 0.5, 0, '°'),
        parameter('yaw', '横摆角', 'Yaw angle', -10, 10, 0.5, 0, '°'),
        parameter('control', '尾流控制设定', 'Wake-control setting', 0, 100, 1, gp ? 65 : 55, '%'),
        parameter('speed', '车速', 'Speed', gp ? 100 : 30, gp ? 330 : 110, 5, gp ? 250 : 70, 'km/h'),
      ],
      evaluate: values => {
        const steer = read(values, 'steer', 0)
        const yaw = read(values, 'yaw', 0)
        const control = read(values, 'control', gp ? 65 : 55) / 100
        const speed = read(values, 'speed', gp ? 250 : 70)
        const speedFactor = 0.75 + 0.25 * bounded(speed / (gp ? 330 : 110))
        const displacement = (gp ? 900 : 650) * Math.tan((yaw + 0.35 * steer) * Math.PI / 180) * (1 - 0.45 * control) * speedFactor
        const unsteadiness = bounded(((Math.abs(yaw) / 10 + Math.abs(steer) / 18) * 0.55 + (1 - control) * 0.25) * speedFactor)
        const inlet = bounded(1 - Math.abs(displacement) / (gp ? 650 : 500) - 0.45 * unsteadiness)
        const retention = bounded(0.55 + 0.45 * inlet)
        return safeResult({
          metrics: [metric('wake-shift', '尾流横移', 'Wake displacement', displacement, 'mm'), metric('inlet', '底板入口质量', 'Floor-inlet quality', inlet * 100, '%', lowTone(inlet, 0.68, 0.45)), metric('load-retention', '前翼载荷保持', 'Front-load retention', retention * 100, '%'), metric('unsteadiness', '非定常指数', 'Unsteadiness', unsteadiness * 100, '%', warnTone(unsteadiness, 0.55, 0.78))],
          points: curve(x => bounded(1 - Math.abs((gp ? 900 : 650) * Math.tan((x + 0.35 * steer) * Math.PI / 180) * (1 - 0.45 * control)) / (gp ? 650 : 500)) * 100, -10, 10),
          insight: gp ? l('2026 GP 应强调 in-wash 轮胎尾流管理与底板入口耦合，而不是旧世代外洗。', 'The 2026 GP view should teach in-wash wheel-wake control and floor-inlet coupling, not legacy outwash.') : l('学生车的端板和翼片必须在规则包络内管理轮胎扰动，并通过压力/油流验证。', 'Student-car devices manage tyre disturbance inside the rules envelope and need pressure/oil-flow validation.'),
          visual: { labels: [l('内侧尾流', 'Inboard wake'), l('轮胎', 'Tyre'), l('底板入口', 'Floor inlet'), l('外侧尾流', 'Outboard wake')], values: [inlet, 0.65, inlet, 1 - unsteadiness], risk: unsteadiness, direction: bounded(displacement / (gp ? 650 : 500), -1, 1) },
        })
      },
    },
    {
      id: 'stiffness-deflection', title: l('刚度、挠度与设定漂移', 'Stiffness, deflection and setup drift'),
      question: l('台架刚度怎样变成高速翼角误差？', 'How does bench stiffness become a high-speed incidence error?'), mode: 'curve',
      parameters: [
        parameter('force', '对称载荷', 'Symmetric load', gp ? 500 : 50, gp ? 4000 : 1200, gp ? 50 : 10, gp ? 2000 : 350, 'N'),
        parameter('ei', '等效弯曲刚度', 'Equivalent bending stiffness', gp ? 3000 : 500, gp ? 30000 : 6000, gp ? 250 : 50, gp ? 14000 : 2200, 'N·m²'),
        parameter('length', '半跨长', 'Half span', gp ? 0.55 : 0.40, gp ? 0.90 : 0.75, 0.01, gp ? 0.72 : 0.58, 'm'),
        parameter('asymmetry', '左右载荷不对称', 'Load asymmetry', 0, gp ? 20 : 30, 1, gp ? 3 : 5, '%'),
      ],
      evaluate: values => {
        const force = read(values, 'force', gp ? 2000 : 350)
        const ei = read(values, 'ei', gp ? 14000 : 2200)
        const length = read(values, 'length', gp ? 0.72 : 0.58)
        const asymmetry = read(values, 'asymmetry', gp ? 3 : 5)
        // The selected value is the symmetric whole-wing resultant.  Each
        // cantilevered half-span therefore carries one half of that force.
        const tipForce = force / 2
        const deflection = tipForce * length ** 3 / (3 * Math.max(1, ei)) * 1000
        const angleLoss = tipForce * length ** 2 / (2 * Math.max(1, ei)) * 180 / Math.PI
        const limit = gp ? 15 : 10
        const margin = bounded(1 - deflection / limit) * 100
        return safeResult({
          metrics: [metric('deflection', '翼尖挠度', 'Tip deflection', deflection, 'mm', warnTone(deflection, limit * 0.75, limit)), metric('angle-loss', '实际迎角损失', 'Effective incidence loss', angleLoss, '°'), metric('load-split', '左右载荷差', 'Left-right load split', asymmetry, '%'), metric('margin', '台架裕度', 'Bench-test margin', margin, '%', lowTone(margin, 25, 5))],
          points: curve(x => x / 2 * length ** 3 / (3 * Math.max(1, ei)) * 1000, 0, gp ? 4000 : 1200),
          insight: l('加载法规边界只能验证指定台架工况，不能从挠度上反推出真实赛道载荷。', 'Regulatory load limits validate a specified bench condition; they do not reveal real track load.'),
          visual: { labels: [l('左翼尖', 'Left tip'), l('左根部', 'Left root'), l('右根部', 'Right root'), l('右翼尖', 'Right tip')], values: [bounded(1 - deflection / (limit * 1.5)), 0.9, 0.9, bounded(1 - deflection * (1 + asymmetry / 100) / (limit * 1.5))], marker: bounded(force / (gp ? 4000 : 1200)), risk: bounded(deflection / limit) },
        })
      },
    },
  ]
}

const rearWingExperimentsFor = (vehicleId: VehicleId): InteractionExperiment[] => {
  const gp = isGp(vehicleId)
  return [
    {
      id: 'load-drag-trade', title: l('尾翼载阻权衡', 'Rear-wing load–drag trade'), question: l('最大下压力为什么不等于最快设定？', 'Why is maximum load not the fastest setup?'), mode: 'curve',
      parameters: [parameter('speed', '车速', 'Speed', gp ? 80 : 20, gp ? 350 : 120, 5, gp ? 270 : 75, 'km/h'), parameter('incidence', '襟翼迎角', 'Flap incidence', 2, 24, 0.5, gp ? 14 : 12, '°'), parameter('area', '参考面积', 'Reference area', gp ? 0.55 : 0.30, gp ? 0.85 : 0.80, 0.01, gp ? 0.72 : 0.55, 'm²'), parameter('flowQuality', '来流质量', 'Upstream-flow quality', 55, 100, 1, gp ? 82 : 85, '%')],
      evaluate: values => {
        const speed = read(values, 'speed', gp ? 270 : 75), incidence = read(values, 'incidence', gp ? 14 : 12), area = read(values, 'area', gp ? 0.72 : 0.55), quality = read(values, 'flowQuality', gp ? 82 : 85) / 100
        const stall = incidence <= 18 ? 1 : Math.exp(-(((incidence - 18) / 5) ** 2))
        const cl = (0.25 + 0.11 * incidence) * stall * quality
        const load = qAt(speed) * area * cl, drag = qAt(speed) * area * (0.10 + 0.018 * incidence + 0.055 * cl ** 2)
        const lapBenefit = bounded((load / (gp ? 5000 : 1500)) * 0.75 - (drag / (gp ? 2600 : 750)) * 0.35 + 0.45) * 100
    return safeResult({ metrics: [metric('load', '后翼下压力', 'Rear downforce', load, 'N', incidence > 18 ? 'warn' : 'good'), metric('drag', '阻力', 'Drag', drag, 'N'), metric('efficiency', '载阻比', 'Load-to-drag', div(load, drag), '—'), metric('lap-balance', '圈速权衡指数', 'Lap-time trade index', lapBenefit, '%')], points: curve(a => { const s = a <= 18 ? 1 : Math.exp(-(((a - 18) / 5) ** 2)); return qAt(speed) * area * (0.25 + 0.11 * a) * s * quality }, 2, 24), secondaryPoints: curve(a => qAt(speed) * area * (0.10 + 0.018 * a + 0.055 * (0.25 + 0.11 * a) ** 2), 2, 24), insight: l('最佳点要在高速弯收益、直线阻力和气动平衡之间取舍，而不是只追峰值。', 'The best point balances fast-corner gain, straight-line drag and aero balance rather than chasing a peak.'), visual: { labels: [l('下压力', 'Load'), l('阻力', 'Drag'), l('来流', 'Inflow'), l('效率', 'Efficiency')], values: [bounded(load / (gp ? 5000 : 1500)), bounded(drag / (gp ? 2600 : 750)), quality, bounded(div(load, Math.max(1, drag)) / 6)], marker: bounded((incidence - 2) / 22), risk: incidence > 18 ? 0.65 : 0.18 } })
      },
    },
    {
      id: 'active-state-transition', title: l('前后主动翼协同转换', 'Coordinated active-state transition'), question: l('前后翼不同步为什么会让平衡突跳？', 'Why does asynchronous aero transition cause a balance step?'), mode: 'timeline',
      parameters: [parameter('frontTime', '前翼转换时间', 'Front transition time', 120, 500, 10, gp ? 300 : 250, 'ms'), parameter('rearTime', '尾翼转换时间', 'Rear transition time', 120, 500, 10, gp ? 320 : 250, 'ms'), parameter('delay', '前后启动延迟', 'Front-rear start delay', -250, 250, 10, 0, 'ms'), parameter('speed', '转换车速', 'Transition speed', gp ? 120 : 30, gp ? 350 : 120, 5, gp ? 300 : 80, 'km/h')],
      evaluate: values => {
        const frontTime = read(values, 'frontTime', 300), rearTime = read(values, 'rearTime', 320), delay = read(values, 'delay', 0), speed = read(values, 'speed', gp ? 300 : 80)
        const rearCompletion = delay + rearTime
        const mismatch = Math.abs(frontTime - rearCompletion)
        const transitionStart = Math.min(0, delay)
        const transitionEnd = Math.max(frontTime, rearCompletion)
        const totalTransitionTime = transitionEnd - transitionStart
        const balanceStep = bounded(mismatch / 450) * (gp ? 12 : 8), yawRisk = bounded(mismatch / 300 + Math.max(0, speed - (gp ? 250 : 90)) / (gp ? 400 : 180))
        const timelinePadding = 40
        const timelineMin = transitionStart - timelinePadding
        const timelineMax = transitionEnd + timelinePadding
        const front = curve(t => bounded(t / frontTime), timelineMin, timelineMax)
        const rear = curve(t => bounded((t - delay) / rearTime), timelineMin, timelineMax)
        const transitionMargin = gp ? 400 - totalTransitionTime : 0
        return safeResult({ metrics: [metric('mismatch', '完成时刻差', 'Completion-time mismatch', mismatch, 'ms', warnTone(mismatch, 80, 180)), metric('balance-step', '气动平衡跳变', 'Aero-balance step', balanceStep, '%'), metric('transition-limit', '400 ms 总转换余量', '400 ms total-transition margin', transitionMargin, 'ms', gp ? lowTone(transitionMargin, 60, 0) : undefined), metric('yaw-risk', '姿态风险', 'Attitude risk', yawRisk * 100, '%', warnTone(yawRisk, 0.55, 0.8))], points: front, secondaryPoints: rear, insight: gp ? l('正延迟表示尾翼晚启动，因此尾翼完成时刻是“延迟＋尾翼行程时间”；总转换时间从最早一侧启动算到最晚一侧到位。2026 两翼固定状态必须由位置传感确认并在受控时间内协同完成，命令到达不等于机械实位。', 'A positive delay starts the rear wing later, so its completion is delay plus rear travel time; total transition runs from the first movement to the last confirmed position. The fixed 2026 states require sensed position and coordinated timing—a received command is not mechanical position.') : l('学生车没有赛道主动翼；此实验只演示若两个手动设定不一致会怎样破坏平衡。', 'The Student car has no on-track active aero; this only illustrates inconsistent manual setup.'), visual: { labels: [l('前翼命令', 'Front command'), l('前翼实位', 'Front position'), l('尾翼实位', 'Rear position'), l('平衡', 'Balance')], values: [1, bounded(1 - mismatch / 500), bounded(1 - mismatch / 500), 1 - yawRisk], marker: bounded(totalTransitionTime / 500), risk: yawRisk } })
      },
    },
    {
      id: 'wake-yaw-attachment', title: l('尾流、横摆与附着', 'Wake, yaw and attachment'), question: l('尾翼为何在弯中比直线更容易失效？', 'Why can the rear wing lose effectiveness in a corner?'), mode: 'field',
      parameters: [parameter('yaw', '横摆角', 'Yaw angle', -10, 10, 0.5, 0, '°'), parameter('flowQuality', '上游来流质量', 'Upstream-flow quality', 45, 100, 1, 82, '%'), parameter('incidence', '翼面迎角', 'Wing incidence', 3, 24, 0.5, 14, '°'), parameter('speed', '车速', 'Speed', gp ? 80 : 20, gp ? 330 : 120, 5, gp ? 240 : 75, 'km/h')],
      evaluate: values => {
        const yaw = read(values, 'yaw', 0), quality = read(values, 'flowQuality', 82) / 100, incidence = read(values, 'incidence', 14), speed = read(values, 'speed', gp ? 240 : 75)
        const attachment = bounded(quality * Math.exp(-((Math.abs(yaw) / (gp ? 7 : 9)) ** 2)) * Math.exp(-Math.max(0, incidence - 18) / 7))
        const asymmetry = bounded(Math.abs(yaw) / 10 * (1 - attachment)) * 100, load = qAt(speed) * (gp ? 0.72 : 0.55) * (0.35 + 1.7 * attachment)
        return safeResult({ metrics: [metric('attachment', '附着保持', 'Attachment retention', attachment * 100, '%', lowTone(attachment, 0.65, 0.4)), metric('load', '后翼下压力', 'Rear-wing load', load, 'N'), metric('asymmetry', '左右载荷差', 'Left-right load split', asymmetry, '%', warnTone(asymmetry, 10, 20)), metric('wake-risk', '尾流风险', 'Wake risk', (1 - attachment) * 100, '%')], points: curve(y => bounded(quality * Math.exp(-((Math.abs(y) / (gp ? 7 : 9)) ** 2)) * Math.exp(-Math.max(0, incidence - 18) / 7)) * 100, -10, 10), insight: l('横摆、驾驶舱/车轮尾流与高迎角会共同压缩附着工作窗，直线数据不能独立代表弯中表现。', 'Yaw, cockpit/wheel wake and high incidence jointly shrink the attached window; straight-line data alone do not represent cornering.'), visual: { labels: [l('驾驶舱尾流', 'Cockpit wake'), l('左翼面', 'Left plane'), l('右翼面', 'Right plane'), l('出口尾流', 'Exit wake')], values: [quality, attachment * (1 - Math.max(0, yaw) / 18), attachment * (1 - Math.max(0, -yaw) / 18), attachment], risk: 1 - attachment, direction: bounded(yaw / 10, -1, 1) } })
      },
    },
    {
      id: 'aspect-ratio-endplate', title: l('翼展、端板与诱导阻力', 'Span, endplate and induced drag'), question: l('展弦比和端板怎样改变翼尖涡代价？', 'How do aspect ratio and endplates change tip-vortex cost?'), mode: 'distribution',
    parameters: [parameter('aspectRatio', '有效展弦比', 'Effective aspect ratio', 1.5, 6.0, 0.1, gp ? 3.8 : 3.2, '—'), parameter('efficiency', '跨展效率', 'Span efficiency', 45, 95, 1, gp ? 78 : 72, '%'), parameter('cl', '载荷系数', 'Load coefficient', 0.5, 3.0, 0.05, gp ? 1.8 : 1.5, '—'), parameter('endplate', '端板密封质量', 'Endplate sealing quality', 0, 100, 1, gp ? 80 : 70, '%')],
      evaluate: values => {
        const ar = read(values, 'aspectRatio', gp ? 3.8 : 3.2), e = read(values, 'efficiency', gp ? 78 : 72) / 100, cl = read(values, 'cl', gp ? 1.8 : 1.5), endplate = read(values, 'endplate', gp ? 80 : 70) / 100
        const induced = cl ** 2 / (Math.PI * Math.max(0.2, e) * ar), vortex = bounded(induced / 0.75 * (1.15 - 0.3 * endplate)), efficiency = bounded(cl / (0.12 + induced + 0.08 * cl ** 2) / 8)
    return safeResult({ metrics: [metric('induced-drag', '诱导阻力系数', 'Induced-drag coefficient', induced, '—'), metric('tip-vortex', '翼尖涡强度', 'Tip-vortex intensity', vortex * 100, '%'), metric('efficiency', '载阻效率', 'Load-drag efficiency', efficiency * 100, '%'), metric('span-loading', '跨展均匀度', 'Span-load uniformity', e * 100, '%')], points: curve(x => cl ** 2 / (Math.PI * Math.max(0.2, e) * x), 1.5, 6), insight: l('增加有效展弦比和跨展效率通常降低诱导阻力，但几何包络、结构质量和尾流会限制收益。', 'Higher effective aspect ratio and span efficiency usually reduce induced drag, but envelope, mass and wake limit the gain.'), visual: { labels: [l('左翼尖', 'Left tip'), l('左中翼', 'Left midspan'), l('右中翼', 'Right midspan'), l('右翼尖', 'Right tip')], values: [bounded(e * endplate), bounded(e), bounded(e), bounded(e * endplate)], risk: vortex } })
      },
    },
    {
      id: 'pylon-flap-aeroelasticity', title: l('支柱、襟翼与气动弹性', 'Pylon, flap and aeroelasticity'), question: l('支柱变形为什么会让尾翼设定漂移？', 'Why does pylon compliance shift rear-wing setup?'), mode: 'geometry',
      parameters: [parameter('force', '尾翼合力', 'Rear-wing resultant', gp ? 500 : 50, gp ? 5000 : 1500, gp ? 50 : 10, gp ? 2600 : 500, 'N'), parameter('stiffness', '支柱等效刚度', 'Pylon equivalent stiffness', gp ? 0.5 : 0.1, gp ? 8 : 3, 0.1, gp ? 3.8 : 1.1, 'kN/mm'), parameter('flapStiffness', '襟翼扭转刚度', 'Flap torsional stiffness', gp ? 3 : 0.5, gp ? 40 : 15, gp ? 0.5 : 0.25, gp ? 22 : 5, 'kN·m/rad'), parameter('asymmetry', '左右载荷差', 'Left-right load split', 0, 25, 1, 4, '%')],
      evaluate: values => {
        const force = read(values, 'force', gp ? 2600 : 500), stiffness = read(values, 'stiffness', gp ? 3.8 : 1.1) * 1000, flapK = read(values, 'flapStiffness', gp ? 22 : 5) * 1000, asymmetry = read(values, 'asymmetry', 4)
        const deflection = force / stiffness, twist = force * 0.12 / flapK * 180 / Math.PI, loadError = bounded((deflection / (gp ? 6 : 10) + twist / 3 + asymmetry / 20) / 3)
        return safeResult({ metrics: [metric('pylon-deflection', '支柱位移', 'Pylon deflection', deflection, 'mm', warnTone(deflection, gp ? 4 : 7, gp ? 6 : 10)), metric('flap-twist', '襟翼扭转', 'Flap twist', twist, '°'), metric('load-error', '实际载荷误差', 'Actual-load error', loadError * 100, '%'), metric('asymmetry', '左右载荷差', 'Left-right split', asymmetry, '%')], points: curve(f => f / stiffness, 0, gp ? 5000 : 1500), insight: l('法规加载点验证的是指定静态边界；支柱、接头和襟翼的组合刚度决定高速实际几何。', 'Regulatory load points check a specified static boundary; combined pylon, joint and flap stiffness sets the high-speed geometry.'), visual: { labels: [l('左翼尖', 'Left tip'), l('左支柱', 'Left pylon'), l('右支柱', 'Right pylon'), l('右翼尖', 'Right tip')], values: [bounded(1 - loadError - asymmetry / 100), bounded(1 - deflection / 12), bounded(1 - deflection / 12), bounded(1 - loadError)], risk: loadError, direction: bounded(asymmetry / 25) } })
      },
    },
  ]
}

const floorExperimentsFor = (vehicleId: VehicleId): InteractionExperiment[] => {
  const gp = isGp(vehicleId)
  return [
    {
      id: 'venturi-throat', title: l('文丘里通道与喉口', 'Venturi channel and throat'), question: l('喉口越小，底板吸力会无限增加吗？', 'Does a smaller throat increase floor suction without limit?'), mode: 'flow',
      parameters: [parameter('speed', '车速', 'Speed', gp ? 60 : 15, gp ? 350 : 120, 5, gp ? 240 : 65, 'km/h'), parameter('throat', '喉口高度', 'Throat height', gp ? 18 : 25, gp ? 55 : 75, 1, gp ? 32 : 45, 'mm'), parameter('ratio', '入口/喉口面积比', 'Inlet/throat area ratio', 1.05, gp ? 1.9 : 1.75, 0.01, gp ? 1.5 : 1.35, '—'), parameter('inlet', '入口来流质量', 'Inlet-flow quality', 50, 100, 1, gp ? 82 : 85, '%')],
      evaluate: values => {
        const speed = read(values, 'speed', gp ? 240 : 65), throat = read(values, 'throat', gp ? 32 : 45), ratio = read(values, 'ratio', gp ? 1.5 : 1.35), inlet = read(values, 'inlet', gp ? 82 : 85) / 100
        const vin = speed / 3.6, optimum = gp ? 31 : 44, choke = bounded(Math.exp(-(((throat - optimum) / (gp ? 17 : 23)) ** 2)) * (throat < (gp ? 23 : 32) ? throat / (gp ? 23 : 32) : 1)), inletVelocityFactor = 0.72 + 0.28 * inlet, vt = vin * ratio * inletVelocityFactor
        const dp = Math.max(0, 0.5 * 1.18 * (vt ** 2 - vin ** 2) * choke), load = dp * (gp ? 1.4 : 0.9) * inlet
        return safeResult({ metrics: [metric('throat-speed', '喉口速度', 'Throat speed', vt, 'm/s'), metric('pressure-drop', '压力降', 'Pressure drop', dp, 'Pa'), metric('floor-load', '底板下压力', 'Floor downforce', load, 'N'), metric('margin', '节流/分离裕度', 'Choke/separation margin', choke * 100, '%', lowTone(choke, 0.65, 0.4))], points: curve(h => { const c = bounded(Math.exp(-(((h - optimum) / (gp ? 17 : 23)) ** 2)) * (h < (gp ? 23 : 32) ? h / (gp ? 23 : 32) : 1)); const throatVelocity = vin * ratio * inletVelocityFactor; return Math.max(0, 0.5 * 1.18 * (throatVelocity ** 2 - vin ** 2) * c) }, gp ? 18 : 25, gp ? 55 : 75), insight: l('收缩提高局部速度，但过小高度会进入节流、泄漏、分离或触地风险，载荷必须出现拐点；指标与高度扫描曲线使用同一个入口来流质量修正。', 'Contraction raises local speed, but too little height causes choking, leakage, separation or strike; load must have a knee. The metric and height-scan curve use the same inlet-flow-quality correction.'), visual: { labels: [l('入口', 'Inlet'), l('喉口', 'Throat'), l('扩散器', 'Diffuser'), l('出口', 'Outlet')], values: [inlet, choke, bounded(dp / (gp ? 6000 : 1600)), bounded(choke * inlet)], risk: 1 - choke } })
      },
    },
    {
      id: 'attitude-map', title: l('俯仰、升沉与横摆地图', 'Pitch, heave and yaw map'), question: l('底板峰值姿态为什么不是最稳姿态？', 'Why is peak floor attitude not the most robust attitude?'), mode: 'field',
      parameters: [parameter('frontHeight', '前离地高度', 'Front ride height', gp ? 18 : 25, gp ? 55 : 80, 1, gp ? 30 : 45, 'mm'), parameter('rearHeight', '后离地高度', 'Rear ride height', gp ? 25 : 30, gp ? 75 : 100, 1, gp ? 48 : 62, 'mm'), parameter('pitch', '俯仰', 'Pitch', -2, 3, 0.1, gp ? 0.5 : 0.7, '°'), parameter('yaw', '横摆', 'Yaw', gp ? -7 : -10, gp ? 7 : 10, 0.5, 0, '°')],
      evaluate: values => {
        const fh = read(values, 'frontHeight', gp ? 30 : 45), rh = read(values, 'rearHeight', gp ? 48 : 62), pitch = read(values, 'pitch', gp ? 0.5 : 0.7), yaw = read(values, 'yaw', 0)
        const hfOpt = (gp ? 30 : 44) - pitch * 2, hrOpt = (gp ? 48 : 61) + pitch * 3
        const retention = bounded(Math.exp(-1 * ((((fh - hfOpt) / (gp ? 15 : 22)) ** 2) + (((rh - hrOpt) / (gp ? 22 : 30)) ** 2) + ((yaw / (gp ? 6 : 9)) ** 2))))
        const cop = 48 + (rh - hrOpt) * 0.12 - (fh - hfOpt) * 0.15, split = bounded(Math.abs(yaw) / (gp ? 7 : 10) * (1 - retention)) * 100, strike = Math.min(fh - (gp ? 18 : 30), rh - (gp ? 25 : 30))
        return safeResult({ metrics: [metric('retention', '载荷保持率', 'Load retention', retention * 100, '%', lowTone(retention, 0.65, 0.4)), metric('cop', '气动压力中心', 'Aero pressure centre', cop, '% wheelbase'), metric('split', '左右载荷差', 'Left-right load split', split, '%'), metric('strike', '触地裕度', 'Strike margin', strike, 'mm', lowTone(strike, 8, 2))], points: curve(h => Math.exp(-(((h - hfOpt) / (gp ? 15 : 22)) ** 2)) * 100, gp ? 18 : 25, gp ? 55 : 80), insight: l('峰值附近梯度可能很陡；稳健设定要让制动、转向和路面扰动仍落在工作窗内。', 'The peak may have steep gradients; a robust setup keeps braking, steering and road disturbance inside the window.'), visual: { labels: [l('前左', 'Front left'), l('前右', 'Front right'), l('后右', 'Rear right'), l('后左', 'Rear left')], values: [retention * (1 - Math.max(0, yaw) / 20), retention * (1 - Math.max(0, -yaw) / 20), retention * (1 - Math.max(0, -yaw) / 24), retention * (1 - Math.max(0, yaw) / 24)], risk: bounded(1 - Math.min(retention, bounded(strike / 10))), direction: bounded(yaw / (gp ? 7 : 10), -1, 1) } })
      },
    },
    {
      id: 'diffuser-recovery', title: l('扩散器压力恢复', 'Diffuser pressure recovery'), question: l('更大的扩散角为何会突然变差？', 'Why can a larger diffuser angle suddenly perform worse?'), mode: 'curve',
      parameters: [parameter('angle', '有效扩散角', 'Effective diffuser angle', 3, gp ? 14 : 16, 0.5, gp ? 7 : 8, '°'), parameter('length', '扩散器长度', 'Diffuser length', gp ? 0.45 : 0.35, gp ? 1.05 : 0.9, 0.01, gp ? 0.78 : 0.62, 'm'), parameter('throatSpeed', '喉口速度', 'Throat speed', gp ? 45 : 15, gp ? 105 : 55, 1, gp ? 78 : 32, 'm/s'), parameter('blockage', '出口阻塞', 'Exit blockage', 0, 45, 1, gp ? 18 : 12, '%')],
      evaluate: values => {
        const angle = read(values, 'angle', gp ? 7 : 8), length = read(values, 'length', gp ? 0.78 : 0.62), vt = read(values, 'throatSpeed', gp ? 78 : 32), blockage = read(values, 'blockage', gp ? 18 : 12) / 100
        const critical = 11 + (length - 0.5) * 3 - blockage * 8, attachment = bounded(Math.exp(-(Math.max(0, angle - critical) ** 2) / 14) * (1 - 0.65 * blockage)), cp = bounded((1 - 1 / (1 + Math.tan(angle * Math.PI / 180) * length / 0.08) ** 2) * attachment)
        const load = 0.5 * 1.18 * vt ** 2 * (gp ? 0.9 : 0.55) * cp, baseDrag = (1 - cp) * (gp ? 180 : 55)
    return safeResult({ metrics: [metric('cp', '压力恢复系数', 'Pressure-recovery coefficient', cp, '—'), metric('separation', '分离风险', 'Separation risk', (1 - attachment) * 100, '%', warnTone(1 - attachment, 0.45, 0.7)), metric('load', '扩散器载荷', 'Diffuser load', load, 'N'), metric('base-drag', '基底阻力变化', 'Base-drag change', baseDrag, 'N')], points: curve(a => { const at = bounded(Math.exp(-(Math.max(0, a - critical) ** 2) / 14) * (1 - 0.65 * blockage)); return (1 - 1 / (1 + Math.tan(a * Math.PI / 180) * length / 0.08) ** 2) * at }, 3, gp ? 14 : 16), insight: l('扩散角增加先改善恢复，超过来流和长度允许的临界面后，分离使收益快速丢失。', 'Increasing angle first improves recovery; beyond the inflow/length limit, separation rapidly removes the benefit.'), visual: { labels: [l('喉口', 'Throat'), l('扩张段', 'Expansion'), l('分离区', 'Separation zone'), l('出口', 'Exit')], values: [1, cp, attachment, bounded(1 - blockage)], marker: bounded((angle - 3) / ((gp ? 14 : 16) - 3)), risk: 1 - attachment } })
      },
    },
    {
      id: 'edge-sealing', title: l('边缘密封与轮胎尾流', 'Edge sealing and tyre wake'), question: l('一个小缺口怎样变成高速单侧掉载？', 'How can a small notch become a high-speed one-sided load loss?'), mode: 'field',
      parameters: [parameter('yaw', '横摆角', 'Yaw angle', gp ? -7 : -10, gp ? 7 : 10, 0.5, 0, '°'), parameter('seal', '边缘密封强度', 'Edge-seal strength', 0, 100, 1, gp ? 78 : 68, '%'), parameter('damage', '边缘损伤长度', 'Edge damage length', 0, gp ? 220 : 180, 5, 0, 'mm'), parameter('wake', '轮胎尾流强度', 'Tyre-wake intensity', 0, 100, 1, gp ? 62 : 45, '%')],
      evaluate: values => {
        const yaw = read(values, 'yaw', 0), seal = read(values, 'seal', gp ? 78 : 68) / 100, damage = read(values, 'damage', 0), wake = read(values, 'wake', gp ? 62 : 45) / 100
        const retention = bounded(seal - damage / (gp ? 380 : 320) - Math.abs(yaw) / (gp ? 20 : 26) - wake * 0.18), leakage = 1 - retention, split = bounded(damage / (gp ? 220 : 180) * 0.45 + Math.abs(yaw) / (gp ? 14 : 20) * 0.35), unsteady = bounded(wake * 0.45 + leakage * 0.55)
        return safeResult({ metrics: [metric('leakage', '横向泄漏', 'Lateral leakage', leakage * 100, '%', warnTone(leakage, 0.45, 0.7)), metric('retention', '载荷保持率', 'Load retention', retention * 100, '%'), metric('split', '左右载荷差', 'Left-right load split', split * 100, '%'), metric('unsteady', '非定常指数', 'Unsteadiness', unsteady * 100, '%')], points: curve(d => bounded(seal - d / (gp ? 380 : 320) - Math.abs(yaw) / (gp ? 20 : 26) - wake * 0.18) * 100, 0, gp ? 220 : 180), insight: l('缺口、横摆和轮胎尾流共同让外界高压空气泄入；密封涡也会破裂，不能显示为永远有益。', 'Damage, yaw and tyre wake admit ambient high-pressure air; a sealing vortex can also burst and is not unconditionally beneficial.'), visual: { labels: [l('左边缘', 'Left edge'), l('左通道', 'Left channel'), l('右通道', 'Right channel'), l('右边缘', 'Right edge')], values: [retention * (1 - split), retention, retention, retention], risk: unsteady, direction: bounded(yaw / (gp ? 7 : 10), -1, 1) } })
      },
    },
    {
      id: 'aeroelastic-oscillation', title: l('刚度与气动弹性振荡', 'Stiffness and aeroelastic oscillation'), question: l('气动载荷、结构和时滞怎样形成反馈？', 'How do aero load, structure and lag form feedback?'), mode: 'timeline',
      parameters: [parameter('speed', '车速', 'Speed', gp ? 100 : 20, gp ? 350 : 120, 5, gp ? 270 : 80, 'km/h'), parameter('stiffness', '垂向刚度', 'Vertical stiffness', gp ? 2 : 0.5, gp ? 20 : 8, 0.1, gp ? 8 : 3, 'kN/mm'), parameter('damping', '阻尼比', 'Damping ratio', 5, 60, 1, gp ? 22 : 30, '%'), parameter('lag', '气动响应滞后', 'Aero lag', gp ? 5 : 10, gp ? 80 : 120, 1, gp ? 30 : 45, 'ms')],
      evaluate: values => {
        const speed = read(values, 'speed', gp ? 270 : 80), stiffness = read(values, 'stiffness', gp ? 8 : 3), damping = read(values, 'damping', gp ? 22 : 30) / 100, lag = read(values, 'lag', gp ? 30 : 45)
        const aeroGain = bounded(qAt(speed) / qAt(gp ? 350 : 120) * (gp ? 0.95 : 0.75)), stability = damping + stiffness / (gp ? 24 : 10) - aeroGain * (0.7 + lag / 140), risk = bounded(0.5 - stability)
        const deflection = qAt(speed) * (gp ? 1.2 : 0.75) / Math.max(500, stiffness * 1000), fn = 15.9 * Math.sqrt(stiffness / (gp ? 8 : 3)), strike = (gp ? 22 : 32) - deflection
        const points = curve(t => 50 + 25 * Math.sin(t * 0.42) * Math.exp((risk - 0.42) * t / 7), 0, 30)
        return safeResult({ metrics: [metric('deflection', '静态挠度', 'Static deflection', deflection, 'mm'), metric('frequency', '等效固有频率', 'Natural frequency', fn, 'Hz'), metric('risk', '振荡风险', 'Oscillation risk', risk * 100, '%', warnTone(risk, 0.5, 0.75)), metric('strike', '最小触地裕度', 'Minimum strike margin', strike, 'mm', lowTone(strike, 8, 2))], points, insight: l('这是有边界的降阶反馈模型，只解释趋势；它不是 CFD、耦合 FEA 或真实 porpoising 预测。', 'This bounded reduced-order feedback model explains trends only; it is not CFD, coupled FEA or a real porpoising prediction.'), visual: { labels: [l('载荷输入', 'Load input'), l('结构位移', 'Structure motion'), l('气动时滞', 'Aero lag'), l('触地裕度', 'Strike margin')], values: [aeroGain, bounded(deflection / 20), bounded(lag / (gp ? 80 : 120)), bounded(strike / (gp ? 22 : 32))], risk } })
      },
    },
  ]
}

const noseExperimentsFor = (vehicleId: VehicleId): InteractionExperiment[] => {
  const gp = isGp(vehicleId)
  return [
    {
      id: 'crash-energy', title: l('碰撞能量与行程', 'Crash energy and stroke'), question: l('吸能行程怎样控制平均减速度？', 'How does crush stroke control mean deceleration?'), mode: 'curve',
      parameters: [parameter('mass', '等效质量', 'Equivalent mass', gp ? 800 : 250, gp ? 950 : 350, 5, gp ? 900 : 300, 'kg'), parameter('speed', '碰撞速度', 'Impact speed', gp ? 10 : 4, gp ? 20 : 9, 0.1, gp ? 17.1 : 7, 'm/s'), parameter('stroke', '有效压溃行程', 'Effective crush stroke', gp ? 0.35 : 0.15, gp ? 0.85 : 0.35, 0.01, gp ? 0.65 : 0.25, 'm'), parameter('force', '平均压溃力', 'Mean crush force', gp ? 80 : 15, gp ? 260 : 45, 1, gp ? 200 : 29.4, 'kN')],
      evaluate: values => {
        const mass = read(values, 'mass', gp ? 900 : 300), speed = read(values, 'speed', gp ? 17.1 : 7), stroke = read(values, 'stroke', gp ? 0.65 : 0.25), force = read(values, 'force', gp ? 200 : 29.4)
        const energy = 0.5 * mass * speed ** 2 / 1000, absorbed = Math.min(energy, force * stroke), residual = Math.max(0, energy - absorbed), meanG = force * 1000 / (mass * 9.80665)
        const speedMargin = gp ? speed - 17 : Number.POSITIVE_INFINITY
        return safeResult({ metrics: [metric('energy', '初始动能', 'Initial kinetic energy', energy, 'kJ'), metric('absorbed', '已吸收能量', 'Absorbed energy', absorbed, 'kJ'), metric('mean-g', '平均减速度', 'Mean deceleration', meanG, 'g', warnTone(meanG, gp ? 25 : 16, gp ? 35 : 20)), metric('residual', '未吸收能量', 'Residual energy', residual, 'kJ', warnTone(residual, 0.5, gp ? 8 : 2)), metric('test-speed-margin', '试验速度余量', 'Test-speed margin', gp ? speedMargin : speed - 7, 'm/s', gp ? lowTone(speedMargin, 0.1, 0) : 'good')], points: curve(x => Math.min(energy, force * x), 0, stroke), secondaryPoints: curve(() => energy, 0, stroke), insight: gp ? l('C13.6.5 Test 1 要求试验速度严格大于 17 m/s；17.0 m/s 本身不合格。完整 FIA 力—时间脉冲也不能由平均值代替，本图只做能量账本。', 'C13.6.5 Test 1 requires a speed strictly greater than 17 m/s; exactly 17.0 m/s is not compliant. The full FIA force–time pulse also cannot be replaced by an average; this view is an energy ledger only.') : l('FSG 300 kg、7 m/s 基准需要至少吸收 7350 J，并同时检查平均与峰值减速度。', 'The FSG 300 kg, 7 m/s case requires at least 7350 J and both average and peak deceleration checks.'), visual: { labels: [l('初始能量', 'Initial energy'), l('触发段', 'Trigger'), l('平台段', 'Plateau'), l('剩余能量', 'Residual')], values: [bounded(energy / (gp ? 180 : 14)), bounded(force / (gp ? 260 : 45)), bounded(absorbed / Math.max(1, energy)), bounded(residual / Math.max(1, energy))], marker: bounded(stroke / (gp ? 0.85 : 0.35)), risk: Math.max(bounded(residual / Math.max(1, energy)), gp && speedMargin <= 0 ? 1 : 0) } })
      },
    },
    {
      id: 'force-stroke-shaping', title: l('触发、平台与压实', 'Trigger, plateau and densification'), question: l('怎样整形一条可信的力—行程曲线？', 'How is a credible force–stroke curve shaped?'), mode: 'curve',
      parameters: [parameter('trigger', '触发峰', 'Trigger peak', gp ? 80 : 15, gp ? 320 : 70, 1, gp ? 210 : 38, 'kN'), parameter('plateau', '平台力', 'Plateau force', gp ? 70 : 12, gp ? 250 : 45, 1, gp ? 180 : 28, 'kN'), parameter('densification', '压实起点', 'Densification start', 55, 92, 1, gp ? 80 : 78, '%'), parameter('stroke', '总行程', 'Total stroke', gp ? 0.35 : 0.15, gp ? 0.85 : 0.35, 0.01, gp ? 0.65 : 0.25, 'm')],
      evaluate: values => {
        const trigger = read(values, 'trigger', gp ? 210 : 38), plateau = read(values, 'plateau', gp ? 180 : 28), densification = read(values, 'densification', gp ? 80 : 78) / 100, stroke = read(values, 'stroke', gp ? 0.65 : 0.25), mass = gp ? 900 : 300
        // This reduced model stops at the calibrated crush pulse rather than
        // inventing an infinite-force solid-compaction wall at the final sample.
        // A bounded 65% terminal rise keeps the teaching pulse realistic while
        // still exposing early densification and an excessive trigger peak.
        const forceAt = (x: number) => { const u = bounded(x / stroke); if (u < 0.12) return plateau + (trigger - plateau) * Math.sin(Math.PI * u / 0.12); if (u < densification) return plateau * (0.97 + 0.03 * Math.sin(u * 24)); return plateau * (1 + 0.65 * ((u - densification) / Math.max(0.02, 1 - densification)) ** 2) }
        const samples = curve(forceAt, 0, stroke, 61)
        const energy = samples.slice(1).reduce((sum, point, index) => sum + (point.y + samples[index]!.y) / 2 * (point.x - samples[index]!.x), 0)
        const peakG = Math.max(trigger, forceAt(stroke)) * 1000 / (mass * 9.80665)
        const quality = bounded(1 - Math.max(0, trigger / Math.max(1, plateau) - 1.8) * 0.35 - Math.max(0, 0.72 - densification) * 1.8 - Math.max(0, peakG - (gp ? 32 : 30)) / (gp ? 24 : 18) * 0.5)
        return safeResult({ metrics: [metric('peak-g', '峰值减速度', 'Peak deceleration', peakG, 'g', warnTone(peakG, gp ? 32 : 30, 40)), metric('energy', '曲线吸能', 'Integrated energy', energy, 'kJ'), metric('remaining-stroke', '平台后剩余行程', 'Stroke after plateau', stroke * (1 - densification) * 1000, 'mm'), metric('quality', '脉冲平顺度', 'Pulse quality', quality * 100, '%', lowTone(quality, 0.65, 0.4))], points: samples, insight: l('过高触发峰把载荷过早传入舱体；压实太早会在行程末端形成尖峰，二者都不能靠总能量掩盖。', 'A high trigger peak transmits load early; early densification creates an end spike, and total energy cannot hide either.'), visual: { labels: [l('触发', 'Trigger'), l('平台', 'Plateau'), l('压实', 'Densification'), l('结束', 'End')], values: [bounded(trigger / (gp ? 320 : 70)), bounded(plateau / (gp ? 250 : 45)), densification, quality], marker: densification, risk: 1 - quality } })
      },
    },
    {
      id: 'offset-load-path', title: l('偏置撞击与载荷路径', 'Offset impact and load path'), question: l('偏心和角度怎样放大根部连接载荷？', 'How do offset and angle amplify root attachment loads?'), mode: 'geometry',
      parameters: [parameter('angle', '冲击角', 'Impact angle', 0, gp ? 20 : 25, 0.5, gp ? 4 : 5, '°'), parameter('offset', '横向偏心', 'Lateral eccentricity', 0, gp ? 260 : 180, 5, gp ? 45 : 30, 'mm'), parameter('capacity', '根部连接能力', 'Root attachment capacity', gp ? 50 : 15, gp ? 180 : 100, 1, gp ? 110 : 45, 'kN'), parameter('length', '鼻锥有效长度', 'Effective nose length', gp ? 0.6 : 0.3, gp ? 1.3 : 0.9, 0.01, gp ? 0.95 : 0.55, 'm')],
      evaluate: values => {
        const angle = read(values, 'angle', gp ? 4 : 5) * Math.PI / 180, offset = read(values, 'offset', gp ? 45 : 30) / 1000, capacity = read(values, 'capacity', gp ? 110 : 45), length = read(values, 'length', gp ? 0.95 : 0.55), total = gp ? 140 : 35
        const axial = total * Math.cos(angle), lateral = total * Math.sin(angle), moment = lateral * length + axial * offset, equivalent = axial / 4 + moment / Math.max(0.15, gp ? 0.62 : 0.36) / 2, margin = bounded(1 - equivalent / capacity) * 100
        return safeResult({ metrics: [metric('axial', '轴向力', 'Axial force', axial, 'kN'), metric('lateral', '横向力', 'Lateral force', lateral, 'kN'), metric('moment', '根部弯矩', 'Root moment', moment, 'kN·m'), metric('margin', '最弱连接裕度', 'Weakest-attachment margin', margin, '%', lowTone(margin, 25, 5))], points: curve(e => total * Math.sin(angle) * length + total * Math.cos(angle) * e / 1000, 0, gp ? 260 : 180), insight: l('偏置撞击同时产生横向力和根部弯矩；只检查总轴力会漏掉最弱连接。', 'An offset impact adds lateral force and root moment; checking only total axial load misses the weakest attachment.'), visual: { labels: [l('左上连接', 'Upper left'), l('左下连接', 'Lower left'), l('右下连接', 'Lower right'), l('右上连接', 'Upper right')], values: [bounded(1 - equivalent / capacity), bounded(1 - equivalent * 0.85 / capacity), bounded(1 - equivalent * 0.75 / capacity), bounded(1 - equivalent * 0.95 / capacity)], risk: 1 - margin / 100, direction: bounded(offset / (gp ? 0.26 : 0.18)) } })
      },
    },
    {
      id: 'wing-mount-repeatability', title: l('前翼安装与重复性', 'Front-wing mounting and repeatability'), question: l('一次快速换鼻会带来多大翼角误差？', 'How much incidence error can a rapid nose change create?'), mode: 'distribution',
      parameters: [parameter('load', '前翼气动载荷', 'Front-wing aero load', gp ? 500 : 50, gp ? 5000 : 1200, gp ? 50 : 10, gp ? 2400 : 350, 'N'), parameter('stiffness', '接口转动刚度', 'Joint rotational stiffness', gp ? 5 : 0.5, gp ? 60 : 12, 0.5, gp ? 40 : 8, 'kN·m/rad'), parameter('spacing', '安装点距', 'Mount spacing', gp ? 0.35 : 0.18, gp ? 0.85 : 0.55, 0.01, gp ? 0.62 : 0.36, 'm'), parameter('error', '装配定位误差', 'Assembly alignment error', 0, gp ? 2 : 3, 0.1, gp ? 0.3 : 0.5, 'mm')],
      evaluate: values => {
        const load = read(values, 'load', gp ? 2400 : 350), stiffness = read(values, 'stiffness', gp ? 40 : 8) * 1000, spacing = read(values, 'spacing', gp ? 0.62 : 0.36), error = read(values, 'error', gp ? 0.3 : 0.5) / 1000
        const aeroMoment = load * 0.18, incidence = aeroMoment / stiffness * 180 / Math.PI + Math.atan(error / spacing) * 180 / Math.PI, tipSplit = error * 1000 + spacing * Math.tan(incidence * Math.PI / 180) * 1000, fastener = load / 4 + aeroMoment / spacing / 2, repeatability = bounded(1 - incidence / 2.5) * 100
        return safeResult({ metrics: [metric('incidence', '翼角漂移', 'Incidence error', incidence, '°', warnTone(incidence, 1, 2)), metric('tip-split', '翼尖高度差', 'Tip-height split', tipSplit, 'mm'), metric('fastener', '单连接件载荷', 'Per-fastener load', fastener / 1000, 'kN'), metric('repeatability', '装配重复性', 'Installation repeatability', repeatability, '%')], points: curve(x => aeroMoment / stiffness * 180 / Math.PI + Math.atan(x / 1000 / spacing) * 180 / Math.PI, 0, gp ? 2 : 3), insight: l('定位误差和受载转角会叠加；正确做法是基准面、定位销与加载后几何共同验证，而不是加大扭矩。', 'Alignment error and load rotation add; verify datums, dowels and loaded geometry rather than adding torque.'), visual: { labels: [l('左定位', 'Left datum'), l('左紧固', 'Left fastener'), l('右紧固', 'Right fastener'), l('右定位', 'Right datum')], values: [bounded(1 - error / 0.003), bounded(1 - fastener / (gp ? 8000 : 2500)), bounded(1 - fastener / (gp ? 8000 : 2500)), bounded(1 - error / 0.003)], risk: 1 - repeatability / 100 } })
      },
    },
    {
      id: 'residual-protection', title: l('剩余保护与第二事件', 'Residual protection and second event'), question: l('第一次压溃后还剩多少保护能力？', 'How much protection remains after the first crush event?'), mode: 'timeline',
      parameters: [parameter('firstEnergy', '第一次冲击能量', 'First-event energy', 0, gp ? 130 : 10, gp ? 2 : 0.2, gp ? 75 : 2, 'kJ'), parameter('remainingLength', '剩余结构长度', 'Remaining structure', 0, 100, 1, 100, '%'), parameter('secondSpeed', '第二次速度', 'Second-event speed', gp ? 8 : 0, gp ? 18 : 8, 0.1, gp ? 14.1 : 0, 'm/s'), parameter('retention', '连接保持率', 'Attachment retention', 40, 100, 1, gp ? 95 : 100, '%')],
      evaluate: values => {
        const first = read(values, 'firstEnergy', gp ? 75 : 2), length = read(values, 'remainingLength', 100) / 100, speed = read(values, 'secondSpeed', gp ? 14.1 : 0), retention = read(values, 'retention', gp ? 95 : 100) / 100, mass = gp ? 900 : 300, nominal = gp ? 145 : 9
        const remaining = Math.max(0, nominal * length * retention - first * 0.18), secondEnergy = 0.5 * mass * speed ** 2 / 1000, residual = Math.max(0, secondEnergy - remaining), peakG = (gp ? 34 : 24) * (1 + residual / Math.max(1, secondEnergy)), risk = bounded(residual / Math.max(1, secondEnergy) + (1 - retention) * 0.5)
        const speedMargin = gp ? speed - 14 : Number.POSITIVE_INFINITY
        return safeResult({ metrics: [metric('remaining', '剩余吸能容量', 'Remaining capacity', remaining, 'kJ'), metric('residual', '第二事件残余能量', 'Second-event residual energy', residual, 'kJ', warnTone(residual, gp ? 5 : 1, gp ? 20 : 3)), metric('peak-g', '第二事件峰值', 'Second-event peak', peakG, 'g'), metric('cell-risk', '生存舱输入风险', 'Cell-input risk', risk * 100, '%', warnTone(risk, 0.45, 0.7)), metric('test-speed-margin', '第二试验速度余量', 'Second-test speed margin', gp ? speedMargin : speed, 'm/s', gp ? lowTone(speedMargin, 0.1, 0) : 'good')], points: curve(t => Math.max(0, nominal - first * bounded(t / 1.0)), 0, 1), secondaryPoints: curve(t => t < 0.55 ? secondEnergy : Math.max(0, secondEnergy - remaining * (t - 0.55) / 0.45), 0, 1), insight: gp ? l('C13.6.6 Test 2 要求第二次试验速度严格大于 14 m/s；滑块上限 18 m/s 只是教学范围，不是法规上限。该图不能认证真实连续事故。', 'C13.6.6 Test 2 requires a second-test speed strictly greater than 14 m/s; the 18 m/s slider maximum is only a teaching range, not a regulatory maximum. This view cannot certify a real sequential accident.') : l('学生车 IA 在任何撞击后都必须按程序检查或更换；界面绝不建议重复使用。', 'A Student IA must be inspected or replaced after any impact; this interface never recommends reuse.'), visual: { labels: [l('第一次事件', 'First event'), l('剩余结构', 'Remaining structure'), l('第二次事件', 'Second event'), l('舱体输入', 'Cell input')], values: [bounded(first / nominal), bounded(remaining / nominal), bounded(secondEnergy / nominal), risk], risk: Math.max(risk, gp && speedMargin <= 0 ? 1 : 0) } })
      },
    },
  ]
}

const monocoqueExperimentsFor = (vehicleId: VehicleId): InteractionExperiment[] => {
  const gp = isGp(vehicleId)
  return [
    {
      id: 'torsional-rig', title: l('扭转刚度台架', 'Torsional-stiffness rig'), question: l('壳体扭转怎样吞掉悬架输入？', 'How does cell twist consume suspension input?'), mode: 'geometry',
      parameters: [parameter('force', '单侧加载力', 'Applied force', gp ? 1 : 0.2, gp ? 10 : 3, 0.1, gp ? 4 : 1, 'kN'), parameter('arm', '力臂', 'Lever arm', gp ? 0.55 : 0.4, gp ? 0.95 : 0.8, 0.01, gp ? 0.75 : 0.6, 'm'), parameter('twist', '测得扭转角', 'Measured twist', 0.01, gp ? 0.8 : 1.5, 0.01, gp ? 0.1 : 0.2, '°'), parameter('mass', '壳体质量', 'Cell mass', gp ? 35 : 18, gp ? 85 : 55, 1, gp ? 55 : 32, 'kg')],
      evaluate: values => {
        const force = read(values, 'force', gp ? 4 : 1), arm = read(values, 'arm', gp ? 0.75 : 0.6), twist = read(values, 'twist', gp ? 0.1 : 0.2), mass = read(values, 'mass', gp ? 55 : 32), torque = 2 * force * arm, stiffness = div(torque, twist), specific = div(stiffness, mass), suspensionError = bounded(1 / (1 + stiffness / (gp ? 12 : 2))) * 100
        return safeResult({ metrics: [metric('torque', '加载扭矩', 'Applied torque', torque, 'kN·m'), metric('stiffness', '扭转刚度', 'Torsional stiffness', stiffness, 'kN·m/°'), metric('specific', '比刚度', 'Specific stiffness', specific, 'kN·m/°/kg'), metric('suspension-error', '悬架输入损失', 'Suspension input loss', suspensionError, '%', warnTone(suspensionError, 20, 35))], points: curve(a => 2 * force * arm / Math.max(0.01, a), 0.01, gp ? 0.8 : 1.5), insight: l('夹具顺应性必须先扣除；全局扭转刚度提高调校重复性，却不能代替局部接头强度检查。', 'Fixture compliance must be removed; global torsional stiffness improves repeatability but does not replace local-joint checks.'), visual: { labels: [l('前左', 'Front left'), l('后左', 'Rear left'), l('后右', 'Rear right'), l('前右', 'Front right')], values: [bounded(1 - twist / (gp ? 0.8 : 1.5)), 0.92, 0.92, bounded(1 - twist / (gp ? 0.8 : 1.5))], risk: bounded(suspensionError / 50), direction: bounded(twist / (gp ? 0.8 : 1.5)) } })
      },
    },
    {
      id: 'sandwich-panel', title: l('夹层板面—芯协同', 'Sandwich face–core interaction'), question: l('为什么增加芯厚能高效提高弯曲刚度？', 'Why does more core depth efficiently raise bending stiffness?'), mode: 'distribution',
      parameters: [parameter('face', '单侧蒙皮厚度', 'Face thickness', 0.3, gp ? 3 : 2.5, 0.1, gp ? 1.1 : 0.9, 'mm'), parameter('core', '芯材厚度', 'Core thickness', gp ? 8 : 5, gp ? 50 : 40, 1, gp ? 28 : 20, 'mm'), parameter('faceE', '蒙皮等效模量', 'Face modulus', gp ? 35 : 25, gp ? 140 : 120, 1, gp ? 85 : 65, 'GPa'), parameter('coreG', '芯材剪切模量', 'Core shear modulus', gp ? 20 : 15, gp ? 220 : 180, 1, gp ? 95 : 70, 'MPa')],
      evaluate: values => {
        const tf = read(values, 'face', gp ? 1.1 : 0.9) / 1000, tc = read(values, 'core', gp ? 28 : 20) / 1000, ef = read(values, 'faceE', gp ? 85 : 65) * 1e9, gc = read(values, 'coreG', gp ? 95 : 70) * 1e6, h = tc + tf, d = 2 * ef * tf * (h / 2) ** 2, areaMass = 2 * tf * 1550 + tc * 80, moment = gp ? 3000 : 900, shear = gp ? 65000 : 18000, faceStress = moment / Math.max(1e-9, tf * h) / 1e6, coreShear = shear / Math.max(1e-9, tc) / 1e6, margin = bounded(1 - coreShear / Math.max(1, gc / 1e6 * 0.45)) * 100
        return safeResult({ metrics: [metric('rigidity', '单位宽度弯曲刚度', 'Flexural rigidity per width', d / 1000, 'kN·m'), metric('mass', '面密度', 'Areal mass', areaMass, 'kg/m²'), metric('face-stress', '蒙皮应力', 'Face stress', faceStress, 'MPa'), metric('core-margin', '芯剪裕度', 'Core-shear margin', margin, '%', lowTone(margin, 25, 5))], points: curve(c => 2 * ef * tf * ((c / 1000 + tf) / 2) ** 2 / 1000, gp ? 8 : 5, gp ? 50 : 40), insight: l('这是对称薄夹层教学式；真实复材必须使用 ABD、芯材方向、胶层、曲率和开孔数据。', 'This is a symmetric thin-sandwich teaching proxy; real laminates require ABD, core direction, adhesive, curvature and cut-out data.'), visual: { labels: [l('上蒙皮', 'Upper face'), l('芯材剪切', 'Core shear'), l('胶层', 'Adhesive'), l('下蒙皮', 'Lower face')], values: [bounded(faceStress / 700), bounded(coreShear / 20), bounded(margin / 100), bounded(faceStress / 700)], risk: 1 - margin / 100 } })
      },
    },
    {
      id: 'hardpoint-insert', title: l('硬点嵌件与剥离', 'Hard-point insert and peel'), question: l('为什么偏心会比总合力更危险？', 'Why can eccentricity be more dangerous than total force?'), mode: 'field',
      parameters: [parameter('force', '接头合力', 'Joint force', gp ? 5 : 1, gp ? 100 : 35, 1, gp ? 40 : 12, 'kN'), parameter('eccentricity', '载荷偏心', 'Load eccentricity', 0, gp ? 80 : 60, 1, gp ? 18 : 12, 'mm'), parameter('diameter', '灌封直径', 'Potted diameter', gp ? 25 : 18, gp ? 110 : 90, 1, gp ? 60 : 45, 'mm'), parameter('core', '芯材厚度', 'Core thickness', gp ? 10 : 8, gp ? 50 : 40, 1, gp ? 28 : 20, 'mm')],
      evaluate: values => {
        const force = read(values, 'force', gp ? 40 : 12) * 1000, e = read(values, 'eccentricity', gp ? 18 : 12) / 1000, diameter = read(values, 'diameter', gp ? 60 : 45) / 1000, core = read(values, 'core', gp ? 28 : 20) / 1000
        const pullout = force / Math.max(1e-9, Math.PI * diameter * core) / 1e6, peel = force * e / Math.max(1e-9, diameter ** 2 * 0.001) / 1e6, bearing = force / Math.max(1e-9, diameter * 0.003) / 1e6, usage = bounded(pullout / (gp ? 18 : 12) * 0.45 + peel / (gp ? 180 : 130) * 0.55)
        return safeResult({ metrics: [metric('bearing', '承压应力', 'Bearing stress', bearing, 'MPa'), metric('pullout', '拉脱剪应力', 'Pull-out shear', pullout, 'MPa'), metric('peel', '剥离指数', 'Peel index', peel, 'MPa'), metric('margin', '接头裕度', 'Joint margin', (1 - usage) * 100, '%', lowTone(1 - usage, 0.25, 0.05))], points: curve(x => force * (x / 1000) / Math.max(1e-9, diameter ** 2 * 0.001) / 1e6, 0, gp ? 80 : 60), insight: l('增大灌封区降低平均剪应力，却增加质量和刚度突变；偏心引入的剥离必须单独检查。', 'Larger potting lowers average shear but adds mass and stiffness discontinuity; eccentric peel needs a separate check.'), visual: { labels: [l('嵌件', 'Insert'), l('灌封区', 'Potting'), l('蒙皮', 'Faces'), l('芯材', 'Core')], values: [bounded(1 - bearing / 400), bounded(1 - pullout / 25), bounded(1 - peel / 220), bounded(1 - usage)], risk: usage } })
      },
    },
    {
      id: 'side-floor-equivalence', title: l('侧侵与结构等效', 'Side intrusion and structural equivalence'), question: l('怎样把试样证据联系到整车加载？', 'How is coupon evidence linked to a full-cell load?'), mode: 'curve',
      parameters: [parameter('load', '台架载荷', 'Rig load', gp ? 20 : 2, gp ? 380 : 40, gp ? 5 : 1, gp ? 300 : 15, 'kN'), parameter('span', '加载跨度', 'Load span', gp ? 0.2 : 0.1, gp ? 1 : 0.6, 0.01, gp ? 0.55 : 0.3, 'm'), parameter('ei', '面板弯曲刚度', 'Panel flexural rigidity', gp ? 10 : 0.2, gp ? 160 : 8, gp ? 2 : 0.1, gp ? 80 : 2.2, 'kN·m²'), parameter('shearCapacity', '周边剪切能力', 'Perimeter shear capacity', gp ? 80 : 5, gp ? 600 : 60, gp ? 10 : 1, gp ? 450 : 20, 'kN')],
      evaluate: values => {
        const load = read(values, 'load', gp ? 300 : 15), span = read(values, 'span', gp ? 0.55 : 0.3), ei = read(values, 'ei', gp ? 80 : 2.2), shear = read(values, 'shearCapacity', gp ? 450 : 20), deflection = load * span ** 3 / (48 * Math.max(0.01, ei)) * 1000, energy = 0.5 * load * deflection, shearUsage = bounded(load / Math.max(1, shear)), limit = gp ? 30 : 25, margin = bounded(1 - Math.max(deflection / limit, shearUsage)) * 100
        return safeResult({ metrics: [metric('deflection', '加载点位移', 'Load-point deflection', deflection, 'mm', warnTone(deflection, limit * 0.75, limit)), metric('energy', '吸收能量', 'Absorbed energy', energy / 1000, 'kJ'), metric('shear', '周边剪切利用率', 'Perimeter-shear utilisation', shearUsage * 100, '%'), metric('margin', '规则/基线裕度', 'Rule/baseline margin', margin, '%', lowTone(margin, 25, 5))], points: curve(f => f * span ** 3 / (48 * Math.max(0.01, ei)) * 1000, 0, gp ? 380 : 40), insight: gp ? l('FIA 底、侧、前加载是不同工况；不能把 25、300、380 或 30 kN 混成一条通用强度。', 'FIA floor, side and forward loads are different cases; 25, 300, 380 and 30 kN are not one generic strength.') : l('FSG 单体壳必须用方向、批次和边界匹配的试样与附件证据建立等效。', 'An FSG monocoque needs direction-, batch- and boundary-matched coupon and attachment evidence.'), visual: { labels: [l('加载头', 'Load pad'), l('外蒙皮', 'Outer face'), l('芯材/结构', 'Core/structure'), l('内蒙皮', 'Inner face')], values: [bounded(load / (gp ? 380 : 40)), bounded(1 - deflection / (limit * 1.5)), bounded(1 - shearUsage), bounded(1 - deflection / (limit * 1.5))], marker: bounded(load / (gp ? 380 : 40)), risk: 1 - margin / 100 } })
      },
    },
    {
      id: 'fatigue-damage', title: l('疲劳、冲击与残余刚度', 'Fatigue, impact and residual stiffness'), question: l('看不见裂纹，为什么刚度仍会慢慢下降？', 'Why can stiffness fall with no visible crack?'), mode: 'field',
    parameters: [parameter('cyclesLog', '循环数量（10 的指数）', 'Cycles (power of ten)', 3, 7, 0.1, gp ? 5.7 : 5.3, 'log₁₀'), parameter('amplitude', '载荷幅值', 'Load amplitude', 10, 100, 1, gp ? 60 : 55, '%'), parameter('damage', '损伤直径', 'Damage diameter', 0, gp ? 200 : 180, 5, gp ? 50 : 40, 'mm'), parameter('repair', '修理恢复率', 'Repair recovery', 40, 100, 1, gp ? 92 : 90, '%')],
      evaluate: values => {
        const cycles = 10 ** read(values, 'cyclesLog', gp ? 5.7 : 5.3), amplitude = read(values, 'amplitude', gp ? 60 : 55) / 100, damage = read(values, 'damage', gp ? 50 : 40), repair = read(values, 'repair', gp ? 92 : 90) / 100, maxDamage = gp ? 200 : 180
        const miner = bounded(cycles / 1e7 * amplitude ** 4 * 3), residual = bounded((1 - 0.45 * (damage / maxDamage) ** 2 - 0.25 * miner) * (damage > 0 ? repair : 1)), strain = amplitude * (gp ? 1900 : 1500), priority = bounded((1 - residual) * 0.75 + miner * 0.25)
    return safeResult({ metrics: [metric('miner', 'Miner 损伤代理', 'Miner damage proxy', miner, '—'), metric('strain', '应变范围', 'Strain range', strain, 'µε'), metric('residual', '残余扭转刚度', 'Residual torsional stiffness', residual * 100, '%', lowTone(residual, 0.78, 0.6)), metric('priority', '检修优先级', 'Inspection priority', priority * 100, '%', warnTone(priority, 0.45, 0.7))], points: curve(d => bounded((1 - 0.45 * (d / maxDamage) ** 2 - 0.25 * miner) * (d > 0 ? repair : 1)) * 100, 0, maxDamage), insight: l('Miner 和面积惩罚只做筛查；复材寿命判断必须结合 NDT、试样、实际载荷谱和损伤位置。', 'Miner and area penalties are screening only; composite life needs NDT, coupons, measured spectra and damage location.'), visual: { labels: [l('前硬点', 'Front hard point'), l('座舱侧', 'Cockpit side'), l('后硬点', 'Rear hard point'), l('地板接口', 'Floor interface')], values: [residual, bounded(residual - damage / maxDamage * 0.2), residual, bounded(residual - miner * 0.2)], risk: priority } })
      },
    },
  ]
}

const haloExperimentsFor = (vehicleId: VehicleId): InteractionExperiment[] => {
  const gp = isGp(vehicleId)
  return [
    {
      id: 'head-envelope', title: gp ? l('Halo 头部包络', 'Halo head envelope') : l('防滚架与头部包络', 'Roll-hoop head envelope'), question: l('不同驾驶员和坐姿是否仍在保护包络内？', 'Do different drivers and postures remain inside the protection envelope?'), mode: 'geometry',
      parameters: [parameter('stature', '驾驶员坐高', 'Seated stature', 820, 1020, 5, gp ? 910 : 920, 'mm'), parameter('recline', '座椅后倾', 'Seat recline', gp ? 20 : 18, gp ? 40 : 45, 1, gp ? 28 : 30, '°'), parameter('helmet', '头盔等效半径', 'Helmet radius', 125, 155, 1, 140, 'mm'), parameter('offset', '头部横向偏移', 'Lateral head offset', gp ? -70 : -80, gp ? 70 : 80, 2, 0, 'mm')],
      evaluate: values => {
        const stature = read(values, 'stature', gp ? 910 : 920), recline = read(values, 'recline', gp ? 28 : 30), helmet = read(values, 'helmet', 140), offset = read(values, 'offset', 0), nominal = gp ? 1025 : 1035, headTop = stature - (recline - 20) * 3 + helmet * 0.35, clearance = nominal - headTop - Math.abs(offset) * 0.08, protection = clearance - (gp ? 25 : 50), restraint = 85 - Math.abs(offset) * 0.45, blind = 2 * Math.atan((gp ? 28 : 30) / (2 * (gp ? 550 : 580))) * 180 / Math.PI
        return safeResult({ metrics: [metric('clearance', '最小结构间隙', 'Minimum clearance', clearance, 'mm', lowTone(clearance, 35, 15)), metric('protection', '保护包络裕度', 'Protection-envelope margin', protection, 'mm', lowTone(protection, 20, 0)), metric('restraint', '头枕接触裕度', 'Head-restraint margin', restraint, 'mm'), metric('blind', '视野阻挡角', 'Visual obstruction', blind, '°')], points: curve(s => nominal - (s - (recline - 20) * 3 + helmet * 0.35), 820, 1020), insight: gp ? l('FIA AFP 几何是认证供应件；此实验只检查驾驶员包络与安装耦合，不允许自由重设计。', 'The FIA AFP is a certified supplied component; this checks occupant-envelope coupling and does not redesign it.') : l('学生车显示前/主防滚架切线和头部包络；它不是 Halo。', 'Student mode shows front/main roll-hoop tangency and the head envelope; it is not a Halo.'), visual: { labels: [l('前结构', 'Front structure'), l('头盔左侧', 'Helmet left'), l('头盔右侧', 'Helmet right'), l('后结构', 'Rear structure')], values: [bounded(clearance / 120), bounded(restraint / 100), bounded(restraint / 100), bounded(protection / 100)], risk: bounded(1 - Math.min(clearance / 60, protection / 40)), direction: bounded(offset / (gp ? 70 : 80), -1, 1) } })
      },
    },
    {
      id: 'load-vector', title: l('载荷向量与根部弯矩', 'Load vector and root moment'), question: l('同一合力为何会产生完全不同的安装负荷？', 'Why can the same resultant create very different mount loads?'), mode: 'geometry',
      parameters: [parameter('load', '合力', 'Resultant load', gp ? 40 : 5, gp ? 180 : 100, 1, gp ? 140 : 25, 'kN'), parameter('elevation', '加载方向角', 'Load elevation', -70, 70, 1, gp ? 30 : 20, '°'), parameter('memberAngle', '构件轴线角', 'Member-axis angle', 20, 80, 1, gp ? 50 : 55, '°'), parameter('mountK', '安装等效刚度', 'Mount stiffness', gp ? 20 : 5, gp ? 180 : 80, 1, gp ? 80 : 25, 'kN/mm')],
      evaluate: values => {
        const load = read(values, 'load', gp ? 140 : 25), elevation = read(values, 'elevation', gp ? 30 : 20) * Math.PI / 180, member = read(values, 'memberAngle', gp ? 50 : 55) * Math.PI / 180, mountK = read(values, 'mountK', gp ? 80 : 25), phi = elevation - member, axial = Math.abs(load * Math.cos(phi)), shear = Math.abs(load * Math.sin(phi)), moment = shear * (gp ? 0.42 : 0.55), displacement = load / mountK
        return safeResult({ metrics: [metric('axial', '构件轴力', 'Member axial force', axial, 'kN'), metric('moment', '根部弯矩', 'Root moment', moment, 'kN·m'), metric('mount', '安装点合力', 'Mount resultant', load, 'kN'), metric('displacement', '弹性位移', 'Elastic displacement', displacement, 'mm', warnTone(displacement, gp ? 2 : 3, gp ? 4 : 6))], points: curve(a => Math.abs(load * Math.sin((a - read(values, 'memberAngle', gp ? 50 : 55)) * Math.PI / 180)) * (gp ? 0.42 : 0.55), -70, 70), insight: gp ? l('FIA 向量必须按方向分量显示；130.1 kN 向下+51.6 kN 向后不能简写成一个无方向数字。', 'FIA vectors must retain direction components; 130.1 kN down plus 51.6 kN rearward is not a directionless headline.') : l('学生模式使用防滚架和支撑载荷路径，不套用 FIA AFP 数字。', 'Student mode uses roll-hoop and brace load paths, not FIA AFP numbers.'), visual: { labels: [l('前节点', 'Front node'), l('左后节点', 'Left rear node'), l('右后节点', 'Right rear node'), l('载荷点', 'Load point')], values: [bounded(1 - displacement / 8), bounded(1 - moment / (gp ? 100 : 55)), bounded(1 - moment / (gp ? 100 : 55)), bounded(load / (gp ? 180 : 100))], risk: bounded(Math.max(displacement / (gp ? 4 : 6), moment / (gp ? 100 : 55))), direction: bounded(elevation / (70 * Math.PI / 180), -1, 1) } })
      },
    },
    {
      id: 'member-buckling', title: gp ? l('认证构件应力解释', 'Certified-member stress explanation') : l('防滚架尺寸与屈曲', 'Roll-hoop sizing and buckling'), question: l('轴向应力和整体屈曲为什么要分开检查？', 'Why are axial stress and global buckling separate checks?'), mode: 'curve',
      parameters: gp ? [parameter('length', '教学有效长度', 'Teaching effective length', 0.3, 0.9, 0.01, 0.55, 'm'), parameter('load', '轴向压缩', 'Axial compression', 20, 180, 1, 110, 'kN')] : [parameter('outer', '钢管外径', 'Steel-tube outer diameter', 20, 50, 1, 30, 'mm'), parameter('wall', '壁厚', 'Wall thickness', 1.2, 4, 0.1, 2, 'mm'), parameter('length', '有效长度', 'Effective length', 0.35, 1.1, 0.01, 0.75, 'm'), parameter('load', '轴向压缩', 'Axial compression', 5, 100, 1, 25, 'kN')],
      evaluate: values => {
        const outer = gp ? 48 : read(values, 'outer', 30), wall = gp ? 4 : read(values, 'wall', 2), length = read(values, 'length', gp ? 0.55 : 0.75), load = read(values, 'load', gp ? 110 : 25), di = Math.max(1, outer - 2 * wall), area = Math.PI * (outer ** 2 - di ** 2) / 4, inertia = Math.PI * (outer ** 4 - di ** 4) / 64, modulus = gp ? 114000 : 205000, stress = load * 1000 / area, pcr = Math.PI ** 2 * modulus * inertia / (length * 1000) ** 2 / 1000, margin = bounded(1 - load / Math.max(1, pcr)) * 100, mass = area * length * (gp ? 0.00443 : 0.00785)
        return safeResult({ metrics: [metric('stress', '轴向应力', 'Axial stress', stress, 'MPa'), metric('buckling', 'Euler 屈曲载荷', 'Euler buckling load', pcr, 'kN'), metric('margin', '屈曲裕度', 'Buckling margin', margin, '%', lowTone(margin, 25, 5)), metric('mass', '构件质量估算', 'Estimated member mass', mass, 'kg')], points: curve(x => Math.PI ** 2 * modulus * inertia / (x * 1000) ** 2 / 1000, gp ? 0.3 : 0.35, gp ? 0.9 : 1.1), insight: gp ? l('GP 几何与 Grade 5 钛材料被锁定；该公式仅解释认证件为何需要受控制造、热处理和试验。', 'GP geometry and Grade 5 titanium are locked; the formula only explains why controlled manufacture, heat treatment and tests are required.') : l('Euler 式只适用于简化直管；焊接、弯管、局部屈曲和接头仍需试验/FEA。', 'Euler applies only to a simplified straight tube; welds, bends, local buckling and joints still need test/FEA.'), visual: { labels: [l('材料', 'Material'), l('截面', 'Section'), l('长度', 'Length'), l('安装', 'Mount')], values: [gp ? 0.9 : 0.82, bounded(area / 600), bounded(1 - length / 1.2), bounded(margin / 100)], marker: bounded(length / 1.1), risk: 1 - margin / 100 } })
      },
    },
    {
      id: 'mount-load-sharing', title: gp ? l('Halo 三点载荷分配', 'Halo three-point load sharing') : l('防滚架节点载荷分配', 'Roll-hoop node load sharing'), question: l('节点刚度不一致会把载荷推向哪里？', 'Where does load go when node stiffness differs?'), mode: 'distribution',
      parameters: [parameter('frontK', '前节点刚度', 'Front-node stiffness', gp ? 20 : 5, gp ? 180 : 80, 1, gp ? 75 : 25, 'kN/mm'), parameter('rearK', '后节点刚度', 'Rear-node stiffness', gp ? 30 : 5, gp ? 220 : 100, 1, gp ? 100 : 35, 'kN/mm'), parameter('offset', '载荷横向偏心', 'Lateral load eccentricity', gp ? -220 : -180, gp ? 220 : 180, 5, gp ? 80 : 60, 'mm'), parameter('direction', '载荷方向', 'Load direction', 0, 180, 2, 60, '°')],
      evaluate: values => {
        const fk = read(values, 'frontK', gp ? 75 : 25), rk = read(values, 'rearK', gp ? 100 : 35), offset = read(values, 'offset', gp ? 80 : 60), direction = read(values, 'direction', 60) * Math.PI / 180, total = gp ? 140 : 45, sumK = fk + 2 * rk
        const front = total * fk / sumK
        const rearBase = total * rk / sumK
        const requestedBias = total * offset / (gp ? 1200 : 900) * Math.sin(direction)
        // Halo and roll-hoop mounts are mechanically fixed load paths, not
        // contact-only feet. Preserve signed reactions so this reduced model
        // can represent either tension or compression while retaining force
        // equilibrium; certification still requires the prescribed load cases.
        const bias = requestedBias
        const left = rearBase - bias
        const right = rearBase + bias
        const imbalance = div(Math.abs(left - right), Math.max(1, left + right))
        const displacement = Math.max(Math.abs(front / fk), Math.abs(left / rk), Math.abs(right / rk))
        return safeResult({ metrics: [metric('front', '前节点反力', 'Front reaction', front, 'kN'), metric('rear-left', '左后反力', 'Left-rear reaction', left, 'kN'), metric('rear-right', '右后反力', 'Right-rear reaction', right, 'kN'), metric('displacement', '最大安装位移', 'Maximum mount displacement', displacement, 'mm')], points: curve(e => rearBase + total * e / (gp ? 1200 : 900) * Math.sin(direction), gp ? -220 : -180, gp ? 220 : 180), insight: gp ? l('GP 显示一个前、两个后安装点；三处均为可传拉压和多方向载荷的机械连接。本图只分配一个简化载荷分量，FIA 规定的前、后安装工况仍必须分别计算和试验。', 'GP shows one front and two rear mounts, all mechanically fixed to transfer tension, compression and multi-directional load. This view distributes only one simplified load component; prescribed FIA front and rear mounting cases still require separate analysis and tests.') : l('学生视图使用前/主防滚架及支撑节点；焊接或螺栓连接可传拉压，反力和保持守恒，且绝不显示三个 Halo 安装脚。', 'Student mode uses front/main roll-hoop and brace nodes; welded or bolted joints transfer tension and compression, reactions remain in equilibrium, and the view never shows three Halo feet.'), visual: { labels: [l('前节点', 'Front node'), l('左后节点', 'Left rear'), l('右后节点', 'Right rear'), l('舱体', 'Cell')], values: [bounded(Math.abs(front) / total * 2), bounded(Math.abs(left) / total * 2), bounded(Math.abs(right) / total * 2), bounded(1 - displacement / 5)], risk: bounded(imbalance + displacement / 10), direction: bounded(offset / (gp ? 220 : 180), -1, 1) } })
      },
    },
    {
      id: 'visibility-protection', title: l('视野阻挡与保护权衡', 'Visibility and protection trade'), question: l('柱体遮挡为何不能只看静止单眼？', 'Why cannot pillar obstruction be judged from one static eye?'), mode: 'field',
      parameters: [parameter('width', '视线处构件宽度', 'Apparent member width', gp ? 18 : 20, gp ? 50 : 60, 1, gp ? 28 : 30, 'mm'), parameter('distance', '眼—构件距离', 'Eye-to-member distance', gp ? 0.35 : 0.35, gp ? 0.85 : 0.9, 0.01, gp ? 0.55 : 0.58, 'm'), parameter('headMove', '头部横移', 'Head lateral movement', 0, gp ? 80 : 90, 2, gp ? 30 : 35, 'mm'), parameter('offset', '构件横向偏置', 'Member offset', gp ? -80 : -100, gp ? 80 : 100, 2, 0, 'mm')],
      evaluate: values => {
        const width = read(values, 'width', gp ? 28 : 30) / 1000, distance = read(values, 'distance', gp ? 0.55 : 0.58), headMove = read(values, 'headMove', gp ? 30 : 35) / 1000, offset = read(values, 'offset', 0) / 1000, blind = 2 * Math.atan(width / (2 * distance)) * 180 / Math.PI, residual = Math.max(0, blind - 2 * Math.atan((headMove + Math.abs(offset) * 0.3) / distance) * 180 / Math.PI), protectionCoverage = bounded(0.55 + width / 0.1 * 0.25 - Math.abs(offset) / 0.2 * 0.15), clearance = (gp ? 75 : 85) - Math.abs(offset) * 1000 * 0.35 - width * 1000 * 0.25
        return safeResult({ metrics: [metric('blind', '静态遮挡角', 'Static blind angle', blind, '°'), metric('residual', '头动后残余遮挡', 'Residual obstruction after head motion', residual, '°'), metric('protected', '保护扇区代理', 'Protected-sector proxy', protectionCoverage * 100, '%'), metric('clearance', '最小头部间隙', 'Minimum head clearance', clearance, 'mm', lowTone(clearance, 35, 15))], points: curve(w => 2 * Math.atan((w / 1000) / (2 * distance)) * 180 / Math.PI, gp ? 18 : 20, gp ? 50 : 60), insight: l('双目和自然头动会减小单柱盲区，但不会把风险变为零；保护覆盖图只是几何代理。', 'Binocular vision and natural head motion reduce a single-pillar blind zone but do not make risk zero; protection coverage is geometric only.'), visual: { labels: [l('左眼位', 'Left eye'), l('中央构件', 'Centre member'), l('右眼位', 'Right eye'), l('前方目标', 'Forward target')], values: [bounded(1 - residual / 8), bounded(width / 0.06), bounded(1 - residual / 8), protectionCoverage], risk: bounded(Math.max(residual / 8, 1 - clearance / 80)), direction: bounded(offset / (gp ? 0.08 : 0.1), -1, 1) } })
      },
    },
  ]
}

const FIA_2026 = 'https://www.fia.com/system/files/documents/fia_2026_f1_regulations_-_section_c_technical_-_iss_19_-_2026-06-25.pdf'
const FSG_2026 = 'https://www.formulastudent.de/fileadmin/user_upload/all/2026/rules/FS-Rules_2026_v1.1.pdf'

const frontWingReferences: InteractionReferenceCard[] = [
  {
    id: 'front-wing-regulation', title: l('FIA 2026 前翼与主动状态', 'FIA 2026 front wing and active states'), image: '/images/interactions/front-wing/reference-regulation.webp',
    imageAlt: l('检验台上的无涂装 2026 前翼，旋转轴与位置传感器以测量光标记', 'Unbranded 2026 front wing on a scrutineering rig with measured rotation axes and position sensors'),
    summary: l('规则定义翼型、端板、支撑、位置传感以及 Corner 与 Straight 两个固定状态。', 'The rules define profiles, endplates, supports, position sensing, and fixed Corner and Straight states.'),
    purpose: l('核对几何、机械止挡、传感和不超过 400 ms 的受控转换；几何合法不代表气动有效。', 'Verify geometry, physical stops, sensing and the controlled sub-400 ms transition; legal geometry is not aerodynamic proof.'),
    details: [l('主/副襟翼围绕规定轴运动', 'Primary and secondary flaps move about prescribed axes'), l('两状态由标准 ECU 位置感知确认', 'Standard-ECU position sensing confirms both states'), l('1000 N 与 60 N 挠度工况是指定台架边界', 'The 1000 N and 60 N flexibility cases are specified bench boundaries')],
    sourceTitle: l('FIA 2026 F1 技术规则 C 节 Issue 19', 'FIA 2026 F1 Technical Regulations Section C, Issue 19'), url: FIA_2026,
  },
  {
    id: 'front-wing-wind-tunnel', title: l('多翼片风洞与流动诊断', 'Multi-element tunnel and flow diagnostics'), image: '/images/interactions/front-wing/reference-wind-tunnel.webp',
    imageAlt: l('风洞中的倒置多翼片前翼，烟线、压力孔和翼尖涡清晰可见', 'Inverted multi-element front wing in a tunnel with smoke, pressure taps and a visible tip vortex'),
    summary: l('压力积分、边界层、分离与翼尖涡共同决定下压力和阻力。', 'Pressure integration, boundary layers, separation and tip vortices jointly set load and drag.'),
    purpose: l('帮助学生把压力孔、油流、毛线和力天平放在同一证据链中，而不是只看一张流线图。', 'Combine pressure taps, oil flow, tufts and force balance into one evidence chain rather than trusting one streamline image.'),
    details: [l('动压随速度平方增长', 'Dynamic pressure grows with speed squared'), l('缝隙射流为后翼片边界层补充动量', 'The slot jet energises the downstream boundary layer'), l('翼尖涡与跨展载荷决定诱导阻力趋势', 'Tip vortices and span loading govern induced-drag trends')],
    sourceTitle: l('NASA 气动阻力基础', 'NASA aerodynamic drag fundamentals'), url: 'https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/drag/',
  },
  {
    id: 'front-wing-correlation', title: l('参数—CFD—风洞相关性', 'Parameter–CFD–tunnel correlation'), image: '/images/interactions/front-wing/reference-correlation.webp',
    imageAlt: l('前翼 CFD 网格、缩比风洞和装车测点的三联工程图', 'Engineering triptych of front-wing CFD mesh, scale tunnel and installed measurements'),
    summary: l('面向 2026 规则的参数化开发必须用风洞与装车数据关闭相关性环。', 'Parametric development for the 2026 rules must close correlation with tunnel and installed data.'),
    purpose: l('建立参数、网格独立性、测量不确定度和装车姿态之间可追溯的验证流程。', 'Build a traceable validation flow across parameters, mesh independence, measurement uncertainty and installed attitude.'),
    details: [l('规则约束先于优化', 'Regulatory constraints precede optimisation'), l('主动状态分别建模与验证', 'Each active state is modelled and validated separately'), l('风洞验证趋势与误差而非所有工况', 'Tunnel work validates trends and error, not every condition')],
    sourceTitle: l('SAE 2026 前翼参数化与风洞验证', 'SAE 2026 parametric front-wing and tunnel validation'), url: 'https://saemobilus.sae.org/papers/parametric-aerodynamic-design-development-a-formula-1-2026-front-wing-wind-tunnel-validation-2026-01-0646',
  },
]

const rearWingReferences: InteractionReferenceCard[] = [
  {
    id: 'rear-wing-regulation', title: l('FIA 2026 尾翼与转换边界', 'FIA 2026 rear wing and transition boundaries'), image: '/images/interactions/rear-wing/reference-regulation.webp',
    imageAlt: l('尾翼加载台显示主翼、襟翼、支柱和位置传感器', 'Rear-wing load rig showing main plane, flap, pylons and position sensing'),
    summary: l('规则定义尾翼翼型间隙、主动状态、转换和多个结构挠度工况。', 'The rules define profile gaps, active states, transitions and multiple flexibility cases.'),
    purpose: l('核对 8–12 mm 相邻翼型间隙、机械实位和支柱/襟翼/后缘加载，不从台架值反推赛道载荷。', 'Check the 8–12 mm adjacent-profile gap, mechanical position and pylon/flap/trailing-edge loads without inferring track loads.'),
    details: [l('Corner 与 Straight 是协调的整车状态', 'Corner and Straight are coordinated vehicle states'), l('双位置传感识别机械卡滞', 'Position sensing identifies mechanical jams'), l('500 N、200 N、60 N 等工况各有独立适用位置', '500 N, 200 N and 60 N cases apply at distinct locations')],
    sourceTitle: l('FIA 2026 F1 技术规则 C 节 Issue 19', 'FIA 2026 F1 Technical Regulations Section C, Issue 19'), url: FIA_2026,
  },
  {
    id: 'rear-wing-vortex', title: l('翼尖涡、展弦比与端板', 'Tip vortex, aspect ratio and endplate'), image: '/images/interactions/rear-wing/reference-vortex.webp',
    imageAlt: l('风洞尾翼翼尖涡由烟线显现，跨展压力孔阵列同步记录', 'Tunnel rear-wing tip vortex shown by smoke with a spanwise pressure array'),
    summary: l('有限翼展使高低压空气绕过翼尖，形成下洗和诱导阻力。', 'Finite span lets high- and low-pressure flow wrap around the tip, creating downwash and induced drag.'),
    purpose: l('用于判断展弦比、跨展效率和端板设定的方向性，不把端板称为能消除涡的万能零件。', 'Judge the direction of aspect ratio, span efficiency and endplate settings without claiming endplates eliminate vortices.'),
    details: [l('诱导阻力随载荷系数平方增长', 'Induced drag rises with lift coefficient squared'), l('跨展载荷形状影响涡强度', 'Span loading affects vortex strength'), l('端板收益受结构、规则和来流限制', 'Endplate benefits are limited by structure, rules and inflow')],
    sourceTitle: l('NASA 翼尖涡与翼梢装置', 'NASA winglets and tip-vortex fundamentals'), url: 'https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/winglets/',
  },
  {
    id: 'rear-wing-correlation', title: l('全车气动套件相关性', 'Full-car aero-package correlation'), image: '/images/interactions/rear-wing/reference-correlation.webp',
    imageAlt: l('学生方程式赛车在风洞与赛道压力测量中对比前后翼和平衡', 'Formula Student car comparing front/rear aero balance in tunnel and track pressure measurement'),
    summary: l('尾翼必须和前翼、底板、车身尾流及圈速目标一起开发。', 'The rear wing must be developed with front wing, floor, body wake and lap-time objective.'),
    purpose: l('用全气动套件流程解释为什么孤立尾翼峰值不能直接变成最快整车设定。', 'Use a full-package process to explain why an isolated rear-wing peak is not automatically the fastest vehicle setup.'),
    details: [l('整车压力中心比单件载荷更重要', 'Whole-car pressure centre matters more than one component load'), l('来流畸变必须在装车状态验证', 'Inflow distortion must be validated installed'), l('结构刚度、制造和赛道数据共同签核', 'Structure, manufacture and track data close sign-off')],
    sourceTitle: l('SAE Chalmers Formula SAE 气动套件设计', 'SAE Chalmers Formula SAE aerodynamic-package design'), url: 'https://saemobilus.sae.org/papers/race-car-aerodynamics-design-process-aerodynamic-package-2012-chalmers-formula-sae-car-2013-01-0797',
  },
]

const floorReferences: InteractionReferenceCard[] = [
  {
    id: 'floor-regulation', title: l('FIA 2026 底板几何与挠度', 'FIA 2026 floor geometry and flexibility'), image: '/images/interactions/floor/reference-regulation.webp',
    imageAlt: l('底板加载台的多个加载头和激光位移计对应规则分区', 'Floor load rig with multiple heads and laser gauges aligned to regulatory zones'),
    summary: l('底板、边缘、板条和扩散器有分区几何及不同加载边界。', 'Floor, edge, plank and diffuser have zoned geometry and distinct load boundaries.'),
    purpose: l('核对前底板非线性加载曲线、外侧挠度、中央刚度和扩散器位移；台架通过不等于赛道姿态安全。', 'Check the nonlinear front-floor curve, outboard deflection, central stiffness and diffuser movement; bench passing is not safe track attitude.'),
    details: [l('前底板曲线含 6000 N 平台段', 'The front-floor curve includes a 6000 N plateau'), l('外侧每处 500 N 时挠度受限', 'Outboard deflection is limited at each 500 N point'), l('中央前/后孔有不同最低刚度', 'Front and rear central holes have different minimum stiffness')],
    sourceTitle: l('FIA 2026 F1 技术规则 C 节 Issue 19', 'FIA 2026 F1 Technical Regulations Section C, Issue 19'), url: FIA_2026,
  },
  {
    id: 'floor-flow-structures', title: l('底板流动结构', 'Floor-flow structures'), image: '/images/interactions/floor/reference-flow-structures.webp',
    imageAlt: l('底板 CFD 涡核、透明风洞流道和油流的三联图', 'Triptych of floor CFD vortex cores, transparent tunnel channel and oil flow'),
    summary: l('入口、喉口、边缘涡、扩散器和尾流构成一个耦合系统。', 'Inlet, throat, edge vortices, diffuser and wake form one coupled system.'),
    purpose: l('从“压力很低”进阶到识别涡、分离、泄漏和姿态敏感性，并合理布置测点。', 'Progress from “low pressure” to identifying vortices, separation, leakage and attitude sensitivity, then place measurements intelligently.'),
    details: [l('入口决定下游初始条件', 'The inlet sets downstream initial conditions'), l('边缘结构管理横向泄漏', 'Edge structures manage lateral leakage'), l('扩散器恢复受尾流和横摆约束', 'Diffuser recovery is constrained by wake and yaw')],
    sourceTitle: l('SAE 现代 F1 底板流动结构', 'SAE modern F1 floor-flow structures'), url: 'https://saemobilus.sae.org/papers/formula-1-race-car-aerodynamics-understanding-floor-flow-structures-a-key-component-modern-racing-2024-01-2078',
  },
  {
    id: 'floor-undertray-validation', title: l('学生底板制造与验证', 'Student undertray manufacture and validation'), image: '/images/interactions/floor/reference-undertray-validation.webp',
    imageAlt: l('学生车底板翻面布置压力软管、位移计和可拆扩散器', 'Student undertray inverted with pressure tubes, displacement gauges and removable diffuser'),
    summary: l('Formula SAE 项目把规则包络、CFD、结构、制造和赛道相关性连成可执行流程。', 'A Formula SAE project links rule envelope, CFD, structure, manufacture and track correlation.'),
    purpose: l('优先验证重复趋势、刚度和可维护性，而不是追求不可复现的峰值。', 'Prioritise repeatable trends, stiffness and serviceability over an unreproducible peak.'),
    details: [l('静态离地与禁止滑裙先于气动优化', 'Static clearance and no sliding skirts precede aero optimisation'), l('压力和高度使用同一时间轴', 'Pressure and ride height share one timeline'), l('制造台阶与结构挠度进入相关性报告', 'Manufacturing steps and structural deflection enter correlation')],
    sourceTitle: l('SAE Formula SAE 底板设计制造', 'SAE Formula SAE undertray design and fabrication'), url: 'https://saemobilus.sae.org/papers/design-fabrication-a-formula-sae-undertray-2019-01-2596',
  },
]

const noseReferences: InteractionReferenceCard[] = [
  {
    id: 'nose-regulation', title: l('FIA 2026 两阶段前部吸能结构', 'FIA 2026 two-stage front impact structure'), image: '/images/interactions/nose/reference-regulation.webp',
    imageAlt: l('两阶段前部吸能结构在 900 kg 碰撞台车前接受高速摄影', 'Two-stage front impact structure on a 900 kg sled under high-speed cameras'),
    summary: l('2026 FIS 将几何、连接、静载和两次动态碰撞组成认证证据。', 'The 2026 FIS combines geometry, attachments, static loads and two dynamic crashes into its evidence.'),
    purpose: l('核对 FIS 与生存舱分离、至少四个等强连接及 >17 m/s、>14 m/s 两工况；不是制造图。', 'Check separation from the cell, at least four equal-strength attachments and the >17 m/s and >14 m/s cases; this is not a manufacturing drawing.'),
    details: [l('900 kg 台车执行两次不同动态试验', 'A 900 kg trolley performs two distinct dynamic tests'), l('峰值减速度边界与结构完整性共同判断', 'Peak deceleration and structural integrity are judged together'), l('侧向 push-off 与翼安装区另有静载', 'Lateral push-off and wing-mount areas have separate static loads')],
    sourceTitle: l('FIA 2026 F1 技术规则 C 节 Issue 19', 'FIA 2026 F1 Technical Regulations Section C, Issue 19'), url: FIA_2026,
  },
  {
    id: 'nose-student-impact', title: l('Formula Student IA 与 AIP', 'Formula Student IA and AIP'), image: '/images/interactions/nose/reference-student-impact.webp',
    imageAlt: l('学生车蜂窝吸能器、抗侵入板与 IAD 力曲线置于同一试验桌', 'Student honeycomb attenuator, anti-intrusion plate and IAD force trace on one test table'),
    summary: l('学生车规则把 300 kg、7 m/s、7350 J、20/40 g 与 IA/AIP 文件连成一套证据。', 'Student rules connect 300 kg, 7 m/s, 7350 J, 20/40 g and IA/AIP documentation.'),
    purpose: l('规划标准或自研 IA 的几何、照片、曲线、胶接和单体壳等效；“用了蜂窝”不是合规结论。', 'Plan geometry, photographs, curves, bonding and monocoque equivalence; “uses honeycomb” is not compliance.'),
    details: [l('吸能器有最小包络要求', 'The attenuator has a minimum envelope'), l('AIP 材料与永久变形需证明', 'AIP material and permanent deformation need evidence'), l('标准蜂窝的芯向、预压溃和胶黏剂受控', 'Standard honeycomb core direction, pre-crush and adhesive are controlled')],
    sourceTitle: l('Formula Student Rules 2026 v1.1', 'Formula Student Rules 2026 v1.1'), url: FSG_2026,
  },
  {
    id: 'nose-crash-validation', title: l('力—行程曲线验证', 'Force–stroke curve validation'), image: '/images/interactions/nose/reference-crash-validation.webp',
    imageAlt: l('三批蜂窝试样高速摄影与重叠力位移曲线', 'High-speed views of three honeycomb batches with overlaid force-displacement curves'),
    summary: l('可信碰撞测试要同时解释触发峰、平台、压实、积分和重复性。', 'A credible crash test explains trigger peak, plateau, densification, integration and repeatability together.'),
    purpose: l('设计同步力、位移和加速度采集，识别滤波、夹具和批次误差。', 'Design synchronous force, displacement and acceleration acquisition and identify filtering, fixture and batch errors.'),
    details: [l('力与位移同步后才能积分吸能', 'Force and displacement must be synchronised before energy integration'), l('平均减速度不能隐藏峰值', 'Mean deceleration cannot hide a peak'), l('材料和制造批次需要见证件', 'Material and manufacturing batches need witness samples')],
    sourceTitle: l('SAE Formula SAE 吸能器性能评估', 'SAE Formula SAE impact-attenuator evaluation'), url: 'https://saemobilus.sae.org/articles/evaluating-impact-attenuator-performance-a-formula-sae-vehicle-2011-01-1106',
  },
]

const monocoqueReferences: InteractionReferenceCard[] = [
  {
    id: 'monocoque-student-rules', title: l('Formula Student 单体壳体等效', 'Formula Student monocoque equivalence'), image: '/images/interactions/monocoque/reference-student-rules.webp',
    imageAlt: l('结构等效表、三点弯曲试样、硬点拉脱夹具与学生单体壳', 'Structural-equivalency sheet, bend coupons, pull-out rig and student monocoque'),
    summary: l('单体壳必须用材料试样、截面等效、附件和前防火墙证据建立追溯。', 'A monocoque needs material coupons, section equivalence, attachments and front-bulkhead evidence.'),
    purpose: l('规划试样方向/批次、主结构附件、嵌件拉脱和 SES 文件，避免“FEA 通过所以整车通过”。', 'Plan coupon direction/batch, primary attachments, insert pull-out and SES evidence, avoiding “FEA passed, therefore the car passed.”'),
    details: [l('主结构附件有指定加载证据', 'Primary-structure attachments need specified load evidence'), l('嵌件拉脱与径向性能分别验证', 'Insert pull-out and radial performance are verified separately'), l('前防火墙支撑周边剪切有最低基准', 'Front-bulkhead-support perimeter shear has a minimum baseline')],
    sourceTitle: l('Formula Student Rules 2026 v1.1', 'Formula Student Rules 2026 v1.1'), url: FSG_2026,
  },
  {
    id: 'monocoque-design', title: l('碳纤维单体壳设计分析', 'Carbon-monocoque design and analysis'), image: '/images/interactions/monocoque/reference-monocoque-design.webp',
    imageAlt: l('单体壳 CAD 载荷路径、壳单元应变与扭转台架的三联图', 'Triptych of monocoque CAD load paths, shell strain and torsion rig'),
    summary: l('概念载荷路径、夹层选择、有限元、制造和台架必须形成闭环。', 'Conceptual load paths, sandwich selection, finite elements, manufacture and rig testing form one loop.'),
    purpose: l('决定全局壳模型和局部接头/开孔模型的分工，并用测量相关性修正边界条件。', 'Divide work between the global shell model and local joint/cut-out models, then correct boundary conditions with test correlation.'),
    details: [l('全局刚度不能替代局部强度', 'Global stiffness cannot replace local strength'), l('夹具和边界顺应性需从结果中扣除', 'Fixture and boundary compliance must be removed'), l('制造偏差与实测材料回填模型', 'Manufacturing variation and measured materials feed the model')],
    sourceTitle: l('SAE 碳纤维单体壳设计分析', 'SAE carbon-fibre monocoque design and analysis'), url: 'https://saemobilus.sae.org/articles/design-analysis-simulation-automotive-carbon-fiber-monocoque-chassis-2014-01-1052',
  },
  {
    id: 'monocoque-sandwich-design', title: l('蜂窝夹层设计技术', 'Honeycomb sandwich design technology'), image: '/images/interactions/monocoque/reference-sandwich-design.webp',
    imageAlt: l('蜂窝 L/W 方向、胶层剥离和面皱失效的材料显微组合', 'Materials montage of honeycomb L/W direction, adhesive peel and face wrinkling'),
    summary: l('蒙皮、方向性蜂窝芯、胶层和局部硬点共同决定夹层表现。', 'Faces, directional honeycomb, adhesive and local hard points jointly govern sandwich behavior.'),
    purpose: l('检查面皱、芯剪、剥离、局部压溃和边缘封闭，补足简单 EI 公式看不到的失效。', 'Check face wrinkling, core shear, peel, local crushing and edge closure beyond a simple EI formula.'),
    details: [l('蜂窝 L/W 方向性能不同', 'Honeycomb L/W directions have different properties'), l('胶层传递面—芯剪力', 'The adhesive transfers face-core shear'), l('硬点必须扩散局部压应力和剥离', 'Hard points must spread local compression and peel')],
    sourceTitle: l('Hexcel Honeycomb Sandwich Design Technology', 'Hexcel Honeycomb Sandwich Design Technology'), url: 'https://www.hexcel.com/wp-content/uploads/2026/01/Honeycomb_Sandwich_Design_Technology.pdf',
  },
]

const haloReferences: InteractionReferenceCard[] = [
  {
    id: 'halo-fia-standard', title: l('FIA 8869-2018 AFP 标准', 'FIA Standard 8869-2018 AFP'), image: '/images/interactions/halo/reference-fia-standard.webp',
    imageAlt: l('白色认证 AFP 在计量台上显示序列号和三个安装点', 'White certified AFP on a metrology bench with serial number and three mounts'),
    summary: l('F1 Halo/AFP 是标准化认证安全件，而不是车队自由改材料和管径的造型件。', 'The F1 Halo/AFP is a standardised certified safety component, not a styling piece with freely changed material or tube size.'),
    purpose: l('确认结构、制造商批准、测试和追溯要求；学生车则应回到防滚架规则。', 'Establish structural, approved-manufacturer, test and traceability requirements; Student mode returns to roll-hoop rules.'),
    details: [l('标准规定结构和测试程序', 'The standard prescribes structure and test procedures'), l('制造商与零件具有批准和追溯', 'Manufacturer and part are approved and traceable'), l('安装需要与生存舱共同验证', 'Installation is verified with the survival cell')],
    sourceTitle: l('FIA Standard 8869-2018 AFP v1.2', 'FIA Standard 8869-2018 AFP v1.2'), url: 'https://www.fia.com/sites/default/files/fia_standard_8869-2018_afp_v1.2.pdf',
  },
  {
    id: 'halo-installation-loads', title: l('AFP 三点安装与载荷向量', 'AFP three-point mounting and load vectors'), image: '/images/interactions/halo/reference-installation-loads.webp',
    imageAlt: l('生存舱 AFP 试验的三色载荷向量、加载头与位移计', 'Three-colour AFP load vectors, load head and displacement gauges on a survival-cell test'),
    summary: l('2026 技术规则用多个方向分量和前/后安装工况验证 AFP—生存舱接口。', 'The 2026 technical rules verify the AFP-cell interface with directional components and front/rear attachment cases.'),
    purpose: l('构建载荷向量和三点反力图，明确实体加载、计算补充与不同方向工况。', 'Build load-vector and three-point reaction diagrams while separating physical loading, calculation supplements and directions.'),
    details: [l('中央工况含向下与向后分量', 'The centre case includes downward and rearward components'), l('侧向工况含向内与向后分量', 'The lateral case includes inward and rearward components'), l('前、后安装点有分别规定的计算工况', 'Front and rear attachments have separate calculation cases')],
    sourceTitle: l('FIA 2026 F1 技术规则 C 节 Issue 19', 'FIA 2026 F1 Technical Regulations Section C, Issue 19'), url: FIA_2026,
  },
  {
    id: 'halo-manufacturing', title: l('Grade 5 钛 AFP 制造', 'Grade 5 titanium AFP manufacture'), image: '/images/interactions/halo/reference-manufacturing.webp',
    imageAlt: l('钛构件在保护气氛中焊接，旁边是 X 光片与序列号', 'Titanium member welded in a protected atmosphere beside radiographs and serial traceability'),
    summary: l('“一根管”背后是受控材料、五件焊接、热处理和无损检查。', 'Behind “one tube” are controlled material, five-piece welding, heat treatment and NDT.'),
    purpose: l('解释为什么认证 AFP 的材料、焊缝和热处理不能在网页中任意修改。', 'Explain why a certified AFP material, welds and heat treatment cannot be freely changed in a web configurator.'),
    details: [l('主体使用 Grade 5 钛合金', 'The main structure uses Grade 5 titanium'), l('五个零件在受控气氛中焊接', 'Five pieces are welded in a controlled atmosphere'), l('热处理后执行 X 光和裂纹检查', 'Radiographic and crack checks follow heat treatment')],
    sourceTitle: l('FIA：How to make an F1 Halo', 'FIA: How to make an F1 Halo'), url: 'https://www.fia.com/news/how-make-f1-halo',
  },
]

const frontWingFaultsFor = (vehicleId: VehicleId): InteractionFaultCard[] => {
  const gp = isGp(vehicleId)
  return [
    {
      id: 'front-wing-flap-mismatch', title: l('左右襟翼不同步', 'Left–right flap mismatch'), image: '/images/interactions/front-wing/fault-flap-mismatch.webp',
      imageAlt: l('左右前翼片角度不同，激光角度尺与双位置波形同时显示', 'Asymmetric front flaps shown with a laser angle gauge and twin position traces'),
      scenario: gp ? l('切回 Corner 状态后左传感器到 14.1°、右侧停在 11.8°；260 km/h 制动时出现持续横摆，像一只手只按住车头一侧。', 'After returning to Corner, the left sensor reaches 14.1° while the right stops at 11.8°; persistent yaw at 260 km/h feels like one hand pressing one side of the nose.') : l('压路肩后右侧手动调节片滑移 2.5°；方向盘居中时左右推杆载荷差 12%，车手觉得高速车头向一边钻。', 'After kerb contact the right manual adjuster slips 2.5°; with centred steering the pushrod load split is 12% and the nose pulls at speed.'),
      strategy: l('立即进入安全状态或停跑，比较双侧机械实位、压力/应变与视觉标记；检查执行器或调节件、连杆、止挡和传感标定，再做重复功能试验。', 'Command the safe state or stop, compare mechanical positions, pressure/strain and visual marks; inspect actuator or adjuster, linkage, stops and sensing, then repeat the functional test.'),
      principle: l('左右载荷系数不同会产生滚转和横摆力矩；只看到命令而不测机械实位会漏掉卡滞。', 'Unequal left-right load creates roll and yaw moments; command without measured mechanical position can miss a jam.'),
      evidence: l('双位置差回到内部阈值、左右载荷恢复、十次转换或拆装重复无滞后，接头目视/NDT 无损伤。', 'Position mismatch and load split return to limits, ten transitions or installations repeat without lag, and joint inspection/NDT is clean.'),
    },
    {
      id: 'front-wing-brake-dive', title: l('制动俯冲触发掉载', 'Brake dive triggers load collapse'), image: '/images/interactions/front-wing/fault-brake-dive.webp',
      imageAlt: l('前翼接近移动地面，压力点变色并显示底面擦痕', 'Front wing close to a moving ground plane with changing pressure taps and a strike mark'),
      scenario: gp ? l('制动峰值最低间隙从 48 mm 降到 23 mm，吸力先增加后回升，前轴气动载荷瞬间少 18%；车手说先咬地、随后像湿瓷砖。', 'At peak braking clearance drops from 48 to 23 mm, suction rises then collapses and front aero load falls 18%; the car first bites, then feels like wet tile.') : l('重制动时前翼间隙从 64 mm 降到 31 mm，压力和推杆载荷先升后掉 14%，底面出现新擦痕。', 'Under heavy braking, clearance drops from 64 to 31 mm; pressure and pushrod load rise then fall 14%, with a new lower-surface witness mark.'),
      strategy: l('回到高度—俯仰地图，核查弹簧/升沉元件/限位、静态高度和翼片角；用分级制动扫工作窗，不以单点最大载荷调车。', 'Return to the ride-height/pitch map; check springs/heave element/stops, static height and flap setting, then sweep staged braking rather than tuning to one peak.'),
      principle: l('过小间隙会节流、增强不利压力梯度或诱发分离；载荷—高度关系可以非单调。', 'Too little clearance can choke flow, strengthen an adverse gradient or separate; load versus height can be non-monotonic.'),
      evidence: l('高度、压力和推杆载荷在同一时间轴相关；修正后工作窗内变化平滑且无新增触地痕。', 'Ride height, pressure and pushrod load correlate on one timeline; after correction the window is smooth and no new strike marks appear.'),
    },
    {
      id: 'front-wing-slot-contamination', title: l('缝隙被台阶和橡胶屑破坏', 'Slot corrupted by a step and debris'), image: '/images/interactions/front-wing/fault-slot-contamination.webp',
      imageAlt: l('干净缝隙、胶带台阶与橡胶屑的同尺度微距对比', 'Same-scale macro comparison of a clean slot, tape step and rubber debris'),
      scenario: gp ? l('维修后缝隙入口出现 1.6 mm 胶带台阶并卡住橡胶屑；同速末段吸力峰低 22%，高速转向变轻。', 'A 1.6 mm tape step and rubber strip obstruct the repaired slot; downstream suction is 22% low at the same speed and high-speed steering is light.') : l('防水胶带边缘翘起 1.8 mm，缝隙还卡着一条轮胎胶；风洞毛线显示后翼片中段持续分离。', 'A waterproof tape edge lifts 1.8 mm and traps a strip of tyre rubber; tunnel tufts show persistent separation on the downstream flap.'),
      strategy: l('保留原状拍照，清洁后用间隙规/轮廓仪复测 gap、overlap 和台阶；按受控工艺修复，再做压力扫频。', 'Photograph as found, clean and remeasure gap, overlap and step with gauges/profilometry, restore the controlled process, then pressure-sweep.'),
      principle: l('缝隙射流为后翼片边界层补充动量；堵塞或台阶会触发局部分离并破坏多翼片协同。', 'The slot jet energises the downstream boundary layer; blockage or a step triggers local separation and removes multi-element benefit.'),
      evidence: l('几何回到公差、压力曲线与基线重合、油流/毛线恢复附着，同姿态前轴载荷恢复。', 'Geometry returns to tolerance, pressure matches baseline, oil flow/tufts reattach, and front load recovers at the same attitude.'),
    },
  ]
}

const rearWingFaultsFor = (vehicleId: VehicleId): InteractionFaultCard[] => {
  const gp = isGp(vehicleId)
  return [
    {
      id: 'rear-wing-transition-jam', title: l('状态转换卡滞', 'Active-state transition jam'), image: '/images/interactions/rear-wing/fault-transition-jam.webp',
      imageAlt: l('尾翼一侧襟翼停在中间角度，位置波形与气动平衡时间线重叠', 'One rear flap stopped mid-travel with position and aero-balance traces overlaid'),
      scenario: gp ? l('前翼已进入 Corner，右尾翼位置却在转换后 430 ms 仍停在中间；后轴负载突变 9%，高速制动初段出现偏航。', 'The front wing reaches Corner while the right rear flap remains mid-travel after 430 ms; rear load steps 9% and yaw appears at braking onset.') : l('学生车没有赛道主动翼；此情境是维修后左右固定孔位装错一档，静态量角相差 3.2°。', 'The Student car has no on-track active aero; here one side is installed in the wrong fixed hole after service, giving a 3.2° static mismatch.'),
      strategy: l('停止高速运行，比较命令、双侧实位与机械止挡；检查执行器/连杆或手动孔位、接头和传感器，再做低能量重复转换或装配检查。', 'Stop high-speed operation, compare command, both positions and stops; inspect actuator/linkage or manual holes, joints and sensors, then repeat at low energy.'),
      principle: l('前后或左右状态不一致会让整车压力中心和横摆力矩在短时间内突跳。', 'Front-rear or left-right state mismatch makes the whole-car pressure centre and yaw moment step abruptly.'),
      evidence: l('转换时间与位置差均回到边界，十次循环无卡滞，压力中心轨迹连续且机械检查无损伤。', 'Timing and position mismatch return to limits, ten cycles are jam-free, the pressure-centre trace is continuous and hardware is undamaged.'),
    },
    {
      id: 'rear-wing-pylon-crack', title: l('支柱裂纹造成高速扭转', 'Pylon crack causes high-speed twist'), image: '/images/interactions/rear-wing/fault-pylon-crack.webp',
      imageAlt: l('尾翼支柱根部荧光裂纹、应变片与高速变形激光测量', 'Fluorescent crack at a rear-wing pylon root with strain gauge and laser deflection measurement'),
      scenario: gp ? l('270 km/h 等效载荷下左支柱位移从 3.1 mm 增到 6.8 mm，襟翼角额外损失 1.4°；根部出现 24 mm 裂纹指示。', 'At a 270 km/h-equivalent load, left-pylon movement rises from 3.1 to 6.8 mm and flap incidence loses 1.4°; a 24 mm crack indication appears at the root.') : l('一次尾部接触后翼架根部应变比基线高 55%，肉眼只有细小涂层裂纹，加载时翼尖左右高差达 9 mm。', 'After rear contact, wing-mount strain is 55% above baseline; only a fine paint crack is visible, but loaded tip split reaches 9 mm.'),
      strategy: l('立即停跑、卸下尾翼并 NDT 支柱、接头和相邻壳体；不得用加固片临时掩盖裂纹，按批准修理/更换后重做加载。', 'Stop, remove the wing and NDT the pylon, joint and adjacent cell; do not hide the crack with a temporary doubler, and repeat loading after approved repair/replacement.'),
      principle: l('裂纹降低弯曲/扭转刚度并改变左右载荷，结构可在外观尚完整时快速失去几何控制。', 'A crack reduces bending/torsional stiffness and shifts left-right load while the structure can still look intact.'),
      evidence: l('NDT 无缺陷、加载—卸载无迟滞、位移和翼角回到基线，复跑后再次检查无增长。', 'Clean NDT, no load-unload hysteresis, baseline displacement/incidence and no growth on post-run reinspection.'),
    },
    {
      id: 'rear-wing-flow-separation', title: l('紊乱来流中的大面积分离', 'Large separation in distorted inflow'), image: '/images/interactions/rear-wing/fault-flow-separation.webp',
      imageAlt: l('横摆风洞中尾翼油流回卷，驾驶舱与后轮尾流粒子穿过翼面', 'Rear-wing oil flow recirculating in a yawed tunnel with cockpit and wheel-wake particles'),
      scenario: gp ? l('横摆 5.5°、Corner 高迎角时上游来流质量降到 63%，尾翼压力保持只有 54%，车手在高速弯中抱怨尾部突然变轻。', 'At 5.5° yaw and high-incidence Corner state, inflow quality falls to 63% and pressure retention to 54%; the driver reports a suddenly light rear in a fast corner.') : l('学生车在高迎角孔位直线良好，但带转向风洞中翼面中段 40% 区域毛线反向，弯中后载不足。', 'The Student wing works straight ahead at a high-incidence hole, but with steer/yaw 40% of the midspan tufts reverse and rear load falls.'),
      strategy: l('降低迎角并测横摆/姿态地图，检查上游部件、头部/防滚架和轮胎尾流；用压力、油流与力天平共同决定工作窗。', 'Reduce incidence and map yaw/attitude; inspect upstream body, head/roll-hoop and tyre wake, and set the window with pressure, oil flow and force balance.'),
      principle: l('高迎角本就接近不利压力梯度极限，畸变来流会提前分离；直线峰值不能代表弯中可用载荷。', 'High incidence is already near its adverse-gradient limit; distorted inflow separates earlier, so straight-line peak load is not cornering load.'),
      evidence: l('横摆全窗油流附着、压力保持和后轴载荷达到目标，且阻力/平衡代价在同一姿态下复测。', 'Attached oil flow, pressure retention and rear load meet target across yaw, with drag and balance remeasured at the same attitudes.'),
    },
  ]
}

const floorFaultsFor = (vehicleId: VehicleId): InteractionFaultCard[] => {
  const gp = isGp(vehicleId)
  return [
    {
      id: 'floor-edge-damage', title: l('边缘缺口造成单侧泄漏', 'Edge notch causes one-sided leakage'), image: '/images/interactions/floor/fault-edge-damage.webp',
      imageAlt: l('底板边缘裂口、超声 C 扫与左右压力热图的工程组合', 'Engineering composite of a floor-edge crack, C-scan and left-right pressure map'),
      scenario: gp ? l('压路肩后左边缘有 95 mm 裂口；180 km/h 时左后压力比右侧高 1.8 kPa，后轴气动载荷降 11%，只在高速右弯显得尾松。', 'After kerb contact a 95 mm left-edge crack gives 1.8 kPa higher left-rear pressure at 180 km/h and 11% less rear aero load, felt only as a loose tail in fast right-handers.') : l('学生底板侧翼被锥桶割出 72 mm 缺口；90 km/h 左右压力差 0.7 kPa，恒半径右弯后轮荷变化比左弯大 8%。', 'A cone cuts a 72 mm notch in the Student floor edge; at 90 km/h pressure differs 0.7 kPa and rear load transfer is 8% larger in right than left constant-radius turns.'),
      strategy: l('停跑保留压痕，检查蒙皮/芯材延伸损伤；批准修理或更换后复做左右压力、轮荷和刚度扫频，不能只贴表面胶带。', 'Stop and preserve witness marks; inspect skin/core extension, then repeat left-right pressure, wheel load and stiffness sweeps after approved repair or replacement.'),
      principle: l('缺口让外界高压空气泄入低压底板并打断边缘涡，产生单侧掉载和非定常。', 'The notch admits ambient high-pressure air into the low-pressure floor and breaks the edge vortex, causing one-sided and unsteady load loss.'),
      evidence: l('NDT 无扩展、左右压力回基线、等效左右弯响应对称，复跑后边缘无新损伤。', 'Clean NDT, baseline pressure symmetry, matched left/right corner response and no new post-run damage.'),
    },
    {
      id: 'floor-ride-height-oscillation', title: l('过低姿态触发振荡与触地', 'Too-low attitude triggers oscillation and strikes'), image: '/images/interactions/floor/fault-ride-height-oscillation.webp',
      imageAlt: l('高度激光、推杆载荷波形和板条周期擦痕并列显示', 'Ride-height laser, pushrod-load trace and periodic plank witness marks shown together'),
      scenario: gp ? l('直道末端前高度从 31 mm 压到 18 mm，载荷先多 9% 后在 ±17% 摆动，板条每约 1.4 m 出现擦痕。', 'At the straight end, front height compresses from 31 to 18 mm; load first rises 9%, then oscillates ±17%, with plank marks about every 1.4 m.') : l('起伏路面上最低高度降到 29 mm、低于 30 mm 静态基准附近，底板擦地后压力和轮荷连续两个周期反向。', 'On a bumpy surface, minimum height reaches 29 mm near/below the 30 mm static baseline; after striking, pressure and wheel load reverse for two cycles.'),
      strategy: l('退出高负载工况，联合检查高度传感器、升沉刚度/阻尼、轮胎、板条和压力时序，再通过高度—速度阶梯恢复裕度。', 'Back out of the condition; inspect ride-height sensors, heave stiffness/damping, tyres, plank and pressure timing, then restore margin with a height-speed staircase.'),
      principle: l('气动负刚度、结构/悬架弹性、时滞和触地非线性可能形成反馈；单纯加硬弹簧不是万能解。', 'Aerodynamic negative stiffness, structural/suspension compliance, lag and strike nonlinearity can form feedback; a stiffer spring is not a universal cure.'),
      evidence: l('高度/压力/轮荷相干峰消失、最低间隙满足批准边界、无新擦痕，三次阶梯测试不发散。', 'No coherent ride-height/pressure/load peak, approved clearance, no new witness marks and three stable staircase repeats.'),
    },
    {
      id: 'floor-diffuser-damage', title: l('扩散器阻塞或脱层', 'Diffuser blockage or delamination'), image: '/images/interactions/floor/fault-diffuser-damage.webp',
      imageAlt: l('草屑堵塞扩散器入口，剪切干涉图标出右侧脱层', 'Grass blocks the diffuser inlet while shearography marks a right-side delamination'),
      scenario: gp ? l('雨战后入口夹着草屑，右侧蒙皮另有 140×60 mm 脱层；同速出口压力恢复低 26%，高速后载不足。', 'After a wet run, grass blocks the inlet and a 140×60 mm right-skin delamination remains; outlet recovery is 26% low at the same speed.') : l('学生车扩散器沾满泥草并在固定点旁脱层 85×45 mm；风扇台架出口流场偏向左侧，压力恢复低 19%。', 'The Student diffuser is fouled with mud/grass and delaminated 85×45 mm near a mount; fan-rig exit flow shifts left and recovery is 19% low.'),
      strategy: l('分别处理流道堵塞与结构损伤：记录清洁前状态、测几何；对脱层做 NDT/加载和批准修理，再重复压力恢复。', 'Treat blockage and structural damage separately: document before cleaning, measure geometry, NDT/load-test and repair the delamination, then repeat recovery.'),
      principle: l('堵塞改变有效面积比，脱层在载荷下改变壁面形状；两者都提高不利压力梯度并促使分离。', 'Blockage changes area ratio and delamination changes the loaded wall shape; both strengthen adverse gradients and separation.'),
      evidence: l('出口压力和油流恢复，加载轮廓仍在公差内，左右后载一致且复跑后脱层无增长。', 'Outlet pressure/oil flow recover, loaded profile remains in tolerance, rear load is symmetric and NDT shows no growth.'),
    },
  ]
}

const noseFaultsFor = (vehicleId: VehicleId): InteractionFaultCard[] => {
  const gp = isGp(vehicleId)
  return [
    {
      id: 'nose-trigger-defect', title: l('触发区制造错误导致尖峰', 'Trigger-region defect causes a spike'), image: '/images/interactions/nose/fault-trigger-defect.webp',
      imageAlt: l('吸能蜂窝胶桥微距与高速摄影第一折皱帧', 'Macro of an attenuator adhesive bridge beside the first crush fold in high-speed footage'),
      scenario: gp ? l('见证件首段行程的触发峰比批准基线高 31%，随后平台正常；外观只见触发切口附近胶层不均。', 'A witness specimen trigger peak is 31% above the approved baseline while its plateau is normal; only uneven bond near the trigger cut is visible.') : l('新批次 IA 在前 18 mm 出现 52 kN 峰值，比基线高 37%；技师只看到“胶有一点厚”。', 'A new IA batch produces a 52 kN peak in the first 18 mm, 37% above baseline; the technician sees only “slightly thick adhesive.”'),
      strategy: l('隔离批次，检查芯向、预压溃、胶层厚度、触发几何和固化记录；用见证件复测，禁止用滤波隐藏真实峰值。', 'Quarantine the batch; inspect core direction, pre-crush, bond thickness, trigger geometry and cure records, then retest witness pieces without filtering away a physical peak.'),
      principle: l('触发区决定渐进压溃起始；硬胶桥、错误芯向或预压溃不足会延迟稳定折皱并提高初峰。', 'The trigger starts progressive crush; a hard bond bridge, wrong core direction or insufficient pre-crush delays stable folding and raises the initial peak.'),
      evidence: l('至少三件见证样的触发/平台离散满足批准边界，制造记录可追溯，力积分与加速度能量账本一致。', 'At least three witness specimens meet trigger/plateau dispersion limits, build records are traceable, and force integration agrees with acceleration energy.'),
    },
    {
      id: 'nose-hidden-delamination', title: l('接触后的隐蔽脱层', 'Hidden delamination after contact'), image: '/images/interactions/nose/fault-hidden-delamination.webp',
      imageAlt: l('鼻锥小划痕与内部大面积超声 C 扫图同尺度叠加', 'Same-scale overlay of a small nose scratch and a much larger ultrasonic C-scan indication'),
      scenario: gp ? l('低速接触后表面只有 19 mm 划痕，C 扫却显示 FIS 根部 145×80 mm 层间指示；加载下翼角多偏 0.7°。', 'After low-speed contact, only a 19 mm scratch is visible, but C-scan shows a 145×80 mm indication near the FIS root and wing incidence shifts 0.7° under load.') : l('冲上路肩后外表只有 28 mm 划痕，超声发现根部 160×90 mm 脱层，前翼静载角度多偏 0.9°。', 'After a kerb strike the skin shows only a 28 mm scratch, while ultrasound finds a 160×90 mm root delamination and front-wing incidence shifts 0.9° under static load.'),
      strategy: l('停止使用并标记损伤，拆下鼻锥做 NDT、连接和 AIP/舱体接口检查；按批准修理或更换，再重复刚度和定位。', 'Remove from service, map damage, inspect attachments and the AIP/cell interface, perform approved repair/replacement, then repeat stiffness and alignment.'),
      principle: l('复材层间损伤可远大于表面痕迹，降低弯扭刚度并改变撞击载荷路径。', 'Composite interlaminar damage can be far larger than the surface mark, reducing stiffness and altering the crash load path.'),
      evidence: l('C 扫无增长、加载—卸载无迟滞、翼角与连接反力回到基线，并在受控复跑后复检。', 'C-scan is stable, load-unload has no hysteresis, alignment/reactions return to baseline, and controlled rerun inspection is clean.'),
    },
    {
      id: 'nose-mount-misalignment', title: l('前翼接口偏斜形成硬旁路', 'Misaligned wing mount creates a hard bypass'), image: '/images/interactions/nose/fault-misalignment.webp',
      imageAlt: l('鼻锥接口红色高点压力膜与激光基准平面', 'Nose interface with a red pressure-film hotspot and laser datum plane'),
      scenario: gp ? l('换鼻后右定位销高 1.1 mm，连接预紧不均；加载时右应变高 39%，仿真显示硬件会提前接触生存舱接口。', 'After a nose change the right dowel is 1.1 mm high and preload is uneven; right strain is 39% high and analysis shows hardware contacting the cell interface early.') : l('快速换鼻后右定位销高 1.4 mm；等效气动载荷下右应变高 46%，硬件可能在 IA 压溃前顶到 AIP。', 'After a rapid nose change the right dowel sits 1.4 mm high; right strain is 46% high and hardware may contact the AIP before IA crush.'),
      strategy: l('禁止用更大扭矩“拉平”；清洁测量基准、销孔和连接高度，替换受损硬件并审查压溃净空与载荷路径。', 'Do not pull it flat with more torque; measure datums, dowels and connection height, replace damaged hardware and review crush clearance/load path.'),
      principle: l('偏斜会把应由吸能结构处理的能量旁路到刚性连接，同时造成翼载不对称。', 'Misalignment bypasses the attenuator through a rigid local path while creating asymmetric wing load.'),
      evidence: l('激光/压力膜接触均匀、所有净空满足图纸、静载应变对称，五次装配循环重复一致。', 'Uniform metrology/contact film, approved clearances, symmetric static strain and five consistent installation cycles.'),
    },
  ]
}

const monocoqueFaultsFor = (vehicleId: VehicleId): InteractionFaultCard[] => {
  const gp = isGp(vehicleId)
  return [
    {
      id: 'monocoque-insert-debond', title: l('悬架硬点嵌件脱粘', 'Suspension hard-point insert debond'), image: '/images/interactions/monocoque/fault-insert-debond.webp',
      imageAlt: l('硬点环形超声缺陷、应变片和灌封嵌件剖面', 'Annular hard-point ultrasonic defect, strain gauge and potted-insert section'),
      scenario: gp ? l('前悬架硬点峰值载荷下局部应变比历史高 48%，扭矩正常但超声发现 42 mm 环形脱粘；初始转向响应变软。', 'At peak front-suspension load, local strain is 48% above history; torque is normal but ultrasound finds a 42 mm annular debond and initial steering response softens.') : l('前推杆峰值 14.8 kN 时局部应变比历史高 62%，扭矩正常但敲击圈有 55 mm 闷音区；方向响应晚半拍。', 'At a 14.8 kN front-pushrod peak, local strain is 62% above history and torque is normal, but a 55 mm dull tap-test region accompanies delayed response.'),
      strategy: l('停跑卸载，禁止加扭矩补偿；用超声/热像检查嵌件、灌封、芯材压溃和蒙皮，按批准范围修理或更换。', 'Stop and unload; do not compensate with torque. Inspect insert, potting, crushed core and faces by ultrasound/thermography, then repair or replace within approval.'),
      principle: l('扭矩只证明螺纹夹紧，不证明嵌件仍向夹层传力；脱粘会集中剪切和剥离。', 'Torque proves clamping, not load transfer into the sandwich; debonding concentrates shear and peel.'),
      evidence: l('静载应变回基线、NDT 无扩展、加载—卸载无迟滞，硬点几何和轮荷相关性恢复。', 'Static strain returns to baseline, NDT is stable, load-unload is hysteresis-free, and geometry/wheel-load correlation recover.'),
    },
    {
      id: 'monocoque-hidden-impact', title: l('工具撞击造成隐蔽脱层', 'Tool impact creates hidden delamination'), image: '/images/interactions/monocoque/fault-hidden-impact.webp',
      imageAlt: l('座舱侧小白印与大面积 C 扫损伤图同尺度显示', 'Same-scale view of a tiny cockpit-side white mark and large C-scan damage'),
      scenario: gp ? l('维护工具落到座舱边，表面仅 5 mm 印记，超声却显示 78×61 mm 多层指示；局部面板刚度下降 18%。', 'A maintenance tool lands on the cockpit edge, leaving a 5 mm mark while ultrasound shows a 78×61 mm multilayer indication and 18% local stiffness loss.') : l('扳手从 0.8 m 落到座舱侧，只有 6 mm 白印；C 扫显示 92×68 mm 脱层，局部刚度降约 24%。', 'A wrench falls 0.8 m onto the cockpit side, leaving a 6 mm white mark; C-scan shows a 92×68 mm delamination and about 24% local stiffness loss.'),
      strategy: l('记录冲击、标出双面边界，使用对照试样和局部模型定义批准修理，修理后重复 NDT 与等效面板加载。', 'Log the impact, map both sides, use coupons and a local model to define an approved repair, then repeat NDT and equivalent panel loading.'),
      principle: l('横向冲击可形成远大于表面痕迹的层间损伤，并在后续压缩中诱发局部屈曲或扩展。', 'Transverse impact can create interlaminar damage far larger than the mark and promote buckling or propagation under compression.'),
      evidence: l('修补轮廓、超声和热循环后 NDT 合格，面板刚度与应变分布达到批准目标。', 'Repair contour and NDT after thermal cycling are accepted, and panel stiffness/strain distribution reach the approved target.'),
    },
    {
      id: 'monocoque-core-moisture', title: l('芯材进水或压溃', 'Core moisture or crushing'), image: '/images/interactions/monocoque/fault-core-moisture.webp',
      imageAlt: l('排液孔水珠、相位热像冷斑与蜂窝芯压溃截面', 'Drain moisture, phase-thermography anomaly and crushed honeycomb section'),
      scenario: gp ? l('两场湿地运行后壳体质量增加 0.42 kg，地板接口热像异常，扭转刚度比赛季基线低 5%；外观无裂纹。', 'After two wet runs the cell gains 0.42 kg, thermography is abnormal near a floor interface and torsional stiffness is 5% below season baseline, with no visible crack.') : l('三场雨赛后单体壳重 0.74 kg，地板接口热像异常，扭转刚度比季初低 8%；一个排液孔总是潮。', 'After three wet events the monocoque is 0.74 kg heavier, thermography is abnormal near the floor interface and torsional stiffness is 8% below season start; one drain stays damp.'),
      strategy: l('追踪称重、湿度和排液路径，NDT 定位芯材；按批准方案干燥/更换，并审查所有孔、切口和边缘封闭。', 'Track mass, moisture and drainage, locate the core with NDT, dry/replace under an approved scheme and audit all holes, cut-outs and edge seals.'),
      principle: l('水分和芯材压溃会降低芯剪模量、增加质量并破坏胶接；全局刚度损失可能缓慢且隐蔽。', 'Moisture and core crushing reduce core shear modulus, add mass and degrade bonding; global stiffness loss may be slow and hidden.'),
      evidence: l('质量稳定、介电/热像/超声无异常、全局和局部刚度恢复，受控湿跑后无回潮。', 'Mass stabilises, dielectric/thermal/ultrasonic checks are clean, stiffness recovers and no moisture returns after a controlled wet run.'),
    },
  ]
}

const haloFaultsFor = (vehicleId: VehicleId): InteractionFaultCard[] => {
  const gp = isGp(vehicleId)
  return [
    {
      id: 'halo-mount-fretting', title: gp ? l('Halo 安装界面微动磨损', 'Halo mount-interface fretting') : l('防滚架支撑节点松动', 'Roll-hoop brace-joint looseness'), image: '/images/interactions/halo/fault-mount-fretting.webp',
      imageAlt: gp ? l('Halo 安装脚黑灰磨屑与微位移计', 'Dark fretting debris and micromotion gauge at a Halo mount') : l('学生车防滚架支撑螺栓孔椭圆化与位移计', 'Ovalised Student roll-hoop brace hole with a displacement gauge'),
      scenario: gp ? l('右后安装周围出现 22 mm 黑灰磨屑，微位移 0.18 mm、约为基线三倍；车手没有明显感觉。', 'A 22 mm patch of dark debris surrounds the right-rear mount and micromotion is 0.18 mm, about three times baseline; the driver feels nothing.') : l('主防滚架支撑节点螺栓扭矩看似正常，但孔壁椭圆化 0.6 mm、加载时出现可见滑移。', 'Main-roll-hoop brace torque appears normal, but the hole is ovalised 0.6 mm and visibly slips under load.'),
      strategy: gp ? l('立即停用并按授权程序检查 AFP 安装、生存舱嵌件/表面和紧固件追溯，不以重新上紧代替根因处理。', 'Remove from service and follow the authorised AFP mount, cell insert/surface and hardware traceability procedure; retightening is not a root-cause repair.') : l('停跑，拆检管件、支撑、螺栓、孔壁和焊缝；按规则和工程批准更换/修复节点，不能仅换大垫片。', 'Stop, inspect tube, brace, bolt, hole and weld, and repair/replace under rules and engineering approval rather than adding a large washer.'),
      principle: l('微动破坏接触面、改变预紧并把载荷推向其余节点；安全结构不能靠重新上紧掩盖。', 'Micromotion damages contact, changes preload and shifts load to other nodes; a safety structure cannot be masked by retightening.'),
      evidence: l('尺寸与 NDT 合格、接触面/紧固件恢复、静载微位移回基线，复检无新磨屑或孔壁增长。', 'Dimensions and NDT are accepted, interfaces/hardware restored, static micromotion returns to baseline and reinspection shows no new debris or hole growth.'),
    },
    {
      id: 'halo-post-impact-crack', title: gp ? l('Halo 撞击后的接头裂纹', 'Halo post-impact attachment crack') : l('防滚架撞击后的隐蔽裂纹', 'Hidden roll-hoop crack after impact'), image: '/images/interactions/halo/fault-post-impact-crack.webp',
      imageAlt: l('小漆痕、荧光渗透裂纹与安装区超声图的夜间组合', 'Night inspection composite of a small paint mark, fluorescent crack and mount ultrasound'),
      scenario: gp ? l('碎片撞到中央构件后只有 9 mm 漆痕，三点几何正常，但前安装过渡区发现 31 mm 裂纹指示。', 'After debris strikes the centre member, only a 9 mm paint mark is visible and geometry is nominal, but a 31 mm crack indication appears near the front-mount transition.') : l('翻车训练架轻触主防滚架后外观只有漆痕，渗透检查却在支撑焊趾发现 18 mm 线性指示。', 'After light contact in a rollover rig, only paint damage is visible, but penetrant inspection finds an 18 mm linear indication at a brace weld toe.'),
      strategy: l('不要以几何正常判定继续使用；隔离结构与舱体，按车型批准范围检查构件、焊接/母材、所有节点和邻近层合板。', 'Do not clear it on geometry alone; quarantine the structure/cell and inspect member, weld/base material, all nodes and adjacent laminate under the vehicle-specific approved process.'),
      principle: l('高刚度安全结构在裂纹初期仍可能保持外形，却已降低疲劳和极限载荷能力；冲击波也传到安装点。', 'A stiff safety structure may retain shape while already losing fatigue and ultimate capacity, and the impact wave reaches its mounts.'),
      evidence: l('授权 NDT 与追溯结论完整，必要更换件有证书，安装几何和受影响舱体区域的分析/加载闭环。', 'Authorised NDT and traceability are complete, replacement certificates exist where needed, and mount geometry plus affected-cell analysis/testing are closed.'),
    },
    {
      id: 'halo-envelope-intrusion', title: l('附件侵占保护与视野包络', 'Accessory intrudes into protection and vision envelope'), image: '/images/interactions/halo/fault-envelope-intrusion.webp',
      imageAlt: l('第一视角附件遮挡与头盔包络干涉热区', 'Driver-eye accessory obstruction and helmet-envelope interference heatmap'),
      scenario: gp ? l('中央构件后增加 34 mm 摄像支架；静态视野尚可，但最大头动时头盔间隙仅 12 mm，支架还形成碰撞硬点。', 'A 34 mm camera bracket is added behind the centre member; static vision seems acceptable, but maximum head motion leaves only 12 mm clearance and creates an impact hard point.') : l('线束和仪表支架侵入前/主防滚架保护线 18 mm；正常坐姿不碰，但规则模板和紧急逃生动作发生干涉。', 'A harness/instrument bracket intrudes 18 mm into the front/main roll-hoop protection line; neutral posture clears, but the rule template and emergency egress interfere.'),
      strategy: l('移除未批准附件，按完整头动、双眼视野、拆装和逃生包络复检；附件只能使用批准位置、材料和失效方式。', 'Remove the unapproved accessory and repeat full head-motion, binocular-vision, service and egress checks; only approved location, material and failure mode are acceptable.'),
      principle: l('小附件也会改变头部接触几何、遮挡和局部碰撞载荷路径；“正常坐姿不碰”不是安全判据。', 'A small accessory changes head-contact geometry, obstruction and local impact load path; clearing a neutral posture is not a safety criterion.'),
      evidence: l('完整头盔包络有批准间隙、逃生测试通过、视野图和安装审查合格，且无未经授权硬件。', 'The full helmet envelope has approved clearance, egress passes, visibility and installation reviews are accepted, and no unauthorised hardware remains.'),
    },
  ]
}

export const frontWingInteractionPack: PartInteractionPack = {
  partId: 'front-wing', theme: '#55dff8', experimentsFor: frontWingExperimentsFor,
  referenceCards: frontWingReferences, faultCardsFor: frontWingFaultsFor,
}

export const rearWingInteractionPack: PartInteractionPack = {
  partId: 'rear-wing', theme: '#49d8f4', experimentsFor: rearWingExperimentsFor,
  referenceCards: rearWingReferences, faultCardsFor: rearWingFaultsFor,
}

export const floorInteractionPack: PartInteractionPack = {
  partId: 'floor', theme: '#45e1c1', experimentsFor: floorExperimentsFor,
  referenceCards: floorReferences, faultCardsFor: floorFaultsFor,
}

export const noseInteractionPack: PartInteractionPack = {
  partId: 'nose', theme: '#ffae52', experimentsFor: noseExperimentsFor,
  referenceCards: noseReferences, faultCardsFor: noseFaultsFor,
}

export const monocoqueInteractionPack: PartInteractionPack = {
  partId: 'monocoque', theme: '#eef6fb', experimentsFor: monocoqueExperimentsFor,
  referenceCards: monocoqueReferences, faultCardsFor: monocoqueFaultsFor,
}

export const haloInteractionPack: PartInteractionPack = {
  partId: 'halo', theme: '#c7a1ff', experimentsFor: haloExperimentsFor,
  referenceCards: haloReferences, faultCardsFor: haloFaultsFor,
}

export const aeroStructureInteractionPacks = {
  'front-wing': frontWingInteractionPack,
  'rear-wing': rearWingInteractionPack,
  floor: floorInteractionPack,
  nose: noseInteractionPack,
  monocoque: monocoqueInteractionPack,
  halo: haloInteractionPack,
} as const
