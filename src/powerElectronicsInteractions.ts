import type { PartId } from './data'
import type { LocalText } from './engineeringData'
import {
  FIA_ERS_K_MECHANICAL_TORQUE_NM,
  FIA_ES_STATE_OF_CHARGE_SWING_MJ,
  FIA_LAP_RECHARGE_MAX_MJ,
  fiaDcToMechanicalPowerKw,
  fiaNormalDeploymentDcLimitKw,
  orderedLapEnergyTrace,
} from './ersRules'
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
export type PowerElectronicsPartId = Extract<PartId, 'battery' | 'inverter' | 'motor' | 'differential' | 'ecu' | 'sensors'>

const finite = (value: number, fallback = 0) => Number.isFinite(value) ? value : fallback
const read = (values: Record<string, number>, key: string, fallback: number, min: number, max: number) =>
  clamp(finite(values[key] ?? fallback, fallback), min, max)
const round = (value: number, digits = 3) => finite(Number(finite(value).toFixed(digits)))
const toneHigh = (value: number, warn: number, danger: number) => value >= danger ? 'danger' as const : value >= warn ? 'warn' as const : 'good' as const
const toneLow = (value: number, warn: number, danger: number) => value <= danger ? 'danger' as const : value <= warn ? 'warn' as const : 'good' as const
const labels = (...pairs: [string, string][]): LocalText[] => pairs.map(([zh, en]) => l(zh, en))
const normal = (value: number, min: number, max: number) => clamp((value - min) / Math.max(1e-9, max - min), 0, 1)
const insight = (zh: string, en: string) => l(zh, en)

const result = (
  metrics: InteractionResult['metrics'],
  points: InteractionResult['points'],
  visualLabels: LocalText[],
  visualValues: number[],
  text: LocalText,
  options: Pick<InteractionResult['visual'], 'marker' | 'risk' | 'direction'> & { secondaryPoints?: InteractionResult['secondaryPoints'] } = {},
): InteractionResult => ({
  metrics,
  points,
  secondaryPoints: options.secondaryPoints,
  insight: text,
  visual: {
    labels: visualLabels,
    values: visualValues.map(value => clamp(finite(value), 0, 1)),
    marker: options.marker === undefined ? undefined : clamp(finite(options.marker), 0, 1),
    risk: options.risk === undefined ? undefined : clamp(finite(options.risk), 0, 1),
    direction: options.direction === undefined ? undefined : clamp(finite(options.direction), -1, 1),
  },
})

const batteryExperiments = (gp: boolean): InteractionExperiment[] => {
  const powerMax = gp ? 350 : 80
  const voltageMin = gp ? 600 : 250
  const voltageMax = gp ? 1000 : 600
  const voltageDefault = gp ? 800 : 400
  return [
    {
      id: 'battery-voltage-sag', title: l('负载下陷', 'Load sag'),
      question: l('为什么有电量仍会触发限功？', 'Why can a charged pack still hit a power limit?'), mode: 'curve',
      parameters: [
        parameter('soc', '荷电状态', 'State of charge', 10, 100, 1, 55, '%'),
        parameter('power', '直流功率', 'DC power', 0, powerMax, gp ? 5 : 1, gp ? 220 : 55, 'kW'),
        parameter('resistance', '等效内阻', 'Equivalent resistance', gp ? 20 : 20, gp ? 90 : 120, 1, gp ? 48 : 65, 'mΩ'),
        parameter('temperature', '电芯温度', 'Cell temperature', 10, gp ? 70 : 60, 1, gp ? 40 : 35, '°C'),
      ],
      evaluate: values => {
        const soc = read(values, 'soc', 55, 10, 100)
        const power = read(values, 'power', gp ? 220 : 55, 0, powerMax)
        const baseR = read(values, 'resistance', gp ? 48 : 65, 20, gp ? 90 : 120) / 1000
        const temperature = read(values, 'temperature', gp ? 40 : 35, 10, gp ? 70 : 60)
        const ocv = voltageDefault * (0.88 + 0.15 * soc / 100)
        const r = baseR * (1 + Math.max(0, 25 - temperature) * 0.018 + Math.max(0, 30 - soc) * 0.008)
        const requestedW = power * 1000
        const discriminant = ocv * ocv - 4 * r * requestedW
        const powerFeasible = discriminant >= 0
        // Above the maximum-power point the quadratic has no real operating
        // solution. Show the collapse boundary instead of silently clamping a
        // negative discriminant into a plausible-looking answer.
        const current = requestedW <= 0 ? 0 : powerFeasible
          ? (ocv - Math.sqrt(discriminant)) / Math.max(2 * r, 1e-6)
          : ocv / Math.max(2 * r, 1e-6)
        const terminal = Math.max(0, ocv - current * r)
        const loss = current * current * r / 1000
        const cellMin = (gp ? 3.65 : 3.55) * terminal / Math.max(ocv, 1) - (gp ? 0.08 : 0.12) * (1 - soc / 100)
        const limit = gp ? 2.8 : 2.7
        return result([
          metric('pack-voltage', '包端电压', 'Pack voltage', round(terminal, 1), 'V', toneLow(terminal, voltageDefault * .78, voltageDefault * .68)),
          metric('dc-current', '母线电流', 'DC current', round(current, 1), 'A', toneHigh(current, gp ? 430 : 180, gp ? 560 : 240)),
          metric('joule-loss', '焦耳热', 'Joule heat', round(loss, 2), 'kW', toneHigh(loss, gp ? 20 : 8, gp ? 35 : 14)),
          metric('weakest-cell', '最低单体', 'Weakest cell', round(cellMin, 3), 'V', toneLow(cellMin, limit + .15, limit)),
        ], curve(x => {
          const curvePower = x * powerMax * 1000
          const curveDiscriminant = ocv * ocv - 4 * r * curvePower
          return curveDiscriminant >= 0 ? (ocv + Math.sqrt(curveDiscriminant)) / 2 : ocv / 2
        }, 0, 1), labels(['开路', 'Open circuit'], ['负载', 'Loaded'], ['弱电芯', 'Weak cell']), [1, terminal / Math.max(ocv, 1), clamp((cellMin - limit) / .9, 0, 1)], insight(powerFeasible ? '低 SOC、低温与内阻会共同放大电压下陷；BMS 应由最低单体先降功率。' : '当前功率请求超过电池等效电路的最大功率点；显示的是电压塌陷边界，控制器必须先降功率。', powerFeasible ? 'Low SOC, low temperature and resistance compound voltage sag; the weakest cell must trigger derating first.' : 'The request exceeds the equivalent-circuit maximum-power point; the display is the voltage-collapse boundary and the controller must derate first.'), { marker: power / powerMax, risk: powerFeasible ? clamp((limit + .25 - cellMin) / .4, 0, 1) : 1 })
      },
    },
    {
      id: 'battery-soc-ledger', title: l('SOC 账本', 'SOC ledger'),
      question: l('电流零偏怎样积成 SOC 漂移？', 'How does current offset accumulate into SOC drift?'), mode: 'timeline',
      parameters: [
        parameter('initialSoc', '初始 SOC', 'Initial SOC', 40, 100, 1, gp ? 80 : 90, '%'),
        parameter('discharge', '平均放电功率', 'Mean discharge power', gp ? 20 : 5, gp ? 260 : 60, gp ? 5 : 1, gp ? 55 : 12, 'kW'),
        parameter('regen', '回收比例', 'Regeneration fraction', 0, 45, 1, gp ? 25 : 16, '%'),
        parameter('offset', '电流零偏', 'Current offset', gp ? -2 : -1, gp ? 2 : 1, .05, 0, 'A'),
      ],
      evaluate: values => {
        const initialSoc = read(values, 'initialSoc', gp ? 80 : 90, 40, 100)
        const discharge = read(values, 'discharge', gp ? 55 : 12, gp ? 20 : 5, gp ? 260 : 60)
        const regen = read(values, 'regen', gp ? 25 : 16, 0, 45) / 100
        const offset = read(values, 'offset', 0, gp ? -2 : -1, gp ? 2 : 1)
        const duration = gp ? 90 : 1320
        const capacityKWh = gp ? 2.2 : 6.5
        const netKWh = discharge * duration / 3600 * (1 - regen * .82)
        const trueSoc = clamp(initialSoc - netKWh / capacityKWh * 100, 0, 100)
        const offsetAh = offset * duration / 3600
        const nominalAh = capacityKWh * 1000 / voltageDefault
        const estimatedSoc = clamp(trueSoc - offsetAh / Math.max(nominalAh, 1) * 100, 0, 100)
        const error = estimatedSoc - trueSoc
        const truePoints = curve(x => initialSoc - (initialSoc - trueSoc) * x, 0, 1)
        const estimatePoints = curve(x => initialSoc - (initialSoc - estimatedSoc) * x, 0, 1)
        return result([
          metric('true-soc', '真实 SOC', 'True SOC', round(trueSoc, 1), '%', toneLow(trueSoc, 25, 12)),
          metric('estimated-soc', '估算 SOC', 'Estimated SOC', round(estimatedSoc, 1), '%', Math.abs(error) > 3 ? 'warn' : 'good'),
          metric('net-energy', '净能量', 'Net energy', round(netKWh, 2), 'kWh'),
          metric('soc-error', '累计误差', 'Accumulated error', round(error, 2), '%pt', toneHigh(Math.abs(error), 2, 5)),
        ], truePoints, labels(['驱动', 'Drive'], ['回收', 'Regeneration'], ['损耗', 'Loss'], ['估算', 'Estimate']), [1 - regen, regen, .1, 1 - Math.abs(error) / 8], insight('零偏很小也会被时间积分；校正必须结合安全静置条件、能量账本和传感器零点。', 'Even a small offset integrates over time; correction needs a safe rest condition, energy ledger and sensor-zero check.'), { risk: clamp(Math.abs(error) / 6, 0, 1), secondaryPoints: estimatePoints })
      },
    },
    {
      id: 'battery-cell-balance', title: l('最弱电芯', 'Weakest cell'),
      question: l('一个电芯为什么能限制整串？', 'Why can one cell limit the whole string?'), mode: 'distribution',
      parameters: [
        parameter('capacitySpread', '容量离散', 'Capacity spread', 0, 8, .1, 2, '%'),
        parameter('resistanceSpread', '内阻离散', 'Resistance spread', 0, 15, .1, 4, '%'),
        parameter('balanceCurrent', '均衡电流', 'Balance current', 0, gp ? 1 : .3, .01, gp ? .3 : .1, 'A'),
        parameter('cRate', '放电倍率', 'Discharge C-rate', .5, gp ? 12 : 8, .1, gp ? 6 : 4, 'C'),
      ],
      evaluate: values => {
        const cSpread = read(values, 'capacitySpread', 2, 0, 8)
        const rSpread = read(values, 'resistanceSpread', 4, 0, 15)
        const balance = read(values, 'balanceCurrent', gp ? .3 : .1, 0, gp ? 1 : .3)
        const cRate = read(values, 'cRate', gp ? 6 : 4, .5, gp ? 12 : 8)
        const deltaV = .018 + cSpread * .015 + rSpread * .006 * cRate
        const usable = clamp(100 - cSpread * 2.8 - rSpread * .65 * cRate, 45, 100)
        const balanceTime = balance <= .001 ? 999 : cSpread / 100 * (gp ? 6 : 4.5) / balance
        const weakest = 3.55 - deltaV * .55
        const cellValues = [1, .96 - cSpread / 40, .93 - deltaV / 2, .98 - rSpread / 80, usable / 100]
        return result([
          metric('cell-min', '最低单体', 'Minimum cell', round(weakest, 3), 'V', toneLow(weakest, 3.25, 2.9)),
          metric('cell-spread', '电压离散', 'Voltage spread', round(deltaV, 3), 'V', toneHigh(deltaV, .18, .32)),
          metric('usable-energy', '可用能量', 'Usable energy', round(usable, 1), '%', toneLow(usable, 78, 62)),
          metric('balance-time', '均衡时间', 'Balance time', round(balanceTime, 1), 'h', balanceTime > 24 ? 'warn' : 'good'),
        ], cellValues.map((y, x) => ({ x, y })), labels(['强电芯', 'Strong'], ['容量弱', 'Low capacity'], ['最弱', 'Weakest'], ['高内阻', 'High R'], ['可用', 'Usable']), cellValues, insight('串联支路电流相同，最低端电压电芯先到保护边界；均衡不能修复衰减。', 'Series current is shared, so the lowest-terminal-voltage cell reaches protection first; balancing cannot repair degradation.'), { risk: clamp(deltaV / .35, 0, 1) })
      },
    },
    {
      id: 'battery-precharge', title: l('预充电', 'Pre-charge'),
      question: l('为什么主接触器不能直接闭合？', 'Why must the main contactor not close directly?'), mode: 'flow',
      parameters: [
        parameter('packVoltage', '电池电压', 'Pack voltage', voltageMin, voltageMax, gp ? 10 : 5, voltageDefault, 'V'),
        parameter('capacitance', '母线电容', 'DC-link capacitance', .5, gp ? 8 : 5, .1, gp ? 3 : 2, 'mF'),
        parameter('prechargeResistance', '预充电阻', 'Pre-charge resistance', 20, gp ? 400 : 300, 5, gp ? 150 : 100, 'Ω'),
        parameter('timeout', '允许等待', 'Timeout', .2, 5, .1, gp ? 1 : 1.5, 's'),
      ],
      evaluate: values => {
        const voltage = read(values, 'packVoltage', voltageDefault, voltageMin, voltageMax)
        const capacitance = read(values, 'capacitance', gp ? 3 : 2, .5, gp ? 8 : 5) / 1000
        const resistance = read(values, 'prechargeResistance', gp ? 150 : 100, 20, gp ? 400 : 300)
        const timeout = read(values, 'timeout', gp ? 1 : 1.5, .2, 5)
        const tau = resistance * capacitance
        const percent = (1 - Math.exp(-timeout / Math.max(tau, 1e-6))) * 100
        const t95 = -Math.log(.05) * tau
        const inrush = voltage / resistance
        const energy = .5 * capacitance * voltage * voltage
        const status = percent >= 95 ? 1 : percent / 95
        return result([
          metric('inrush-current', '初始浪涌', 'Initial inrush', round(inrush, 2), 'A', toneHigh(inrush, gp ? 12 : 7, gp ? 20 : 12)),
          metric('bus-percent', '母线电压', 'DC-link voltage', round(percent, 1), '%', toneLow(percent, 95, 85)),
          metric('time-to-95', '达到 95%', 'Time to 95%', round(t95, 2), 's', t95 > timeout ? 'warn' : 'good'),
          metric('pulse-energy', '电阻脉冲能量', 'Resistor pulse energy', round(energy, 1), 'J', toneHigh(energy, gp ? 1000 : 280, gp ? 1800 : 500)),
        ], curve(x => voltage * (1 - Math.exp(-(x * timeout) / Math.max(tau, 1e-6))), 0, 1), labels(['电池', 'Pack'], ['电阻', 'Resistor'], ['母线', 'DC link'], ['接触器', 'Contactor']), [1, clamp(1 - inrush / (gp ? 25 : 15), 0, 1), status, percent >= 95 ? 1 : 0], insight('电阻过小会浪涌，过大会超时；必须按实际电压比例确认预充，而非只等待固定时间。', 'Too little resistance causes inrush and too much causes timeout; pre-charge must be confirmed by measured voltage ratio, not delay alone.'), { risk: percent >= 95 ? clamp(inrush / (gp ? 25 : 15), 0, 1) : 1 - status })
      },
    },
    {
      id: 'battery-lap-energy', title: l('单圈能量', 'Lap energy'),
      question: l('部署与回收怎样保持能量窗口？', 'How do deployment and harvest stay inside the energy window?'), mode: 'timeline',
      parameters: [
        parameter('deploy', '部署占空比', 'Deployment duty', 10, 100, 1, gp ? 15 : 55, '%'),
        parameter('harvest', '回收强度', 'Harvest intensity', 0, 100, 1, gp ? 65 : 55, '%'),
        parameter('brakingFraction', '制动区比例', 'Braking fraction', 10, gp ? 45 : 35, 1, gp ? 22 : 20, '%'),
        parameter('initialSoc', gp ? '4 MJ 窗口起点' : '初始 SOC', gp ? '4 MJ window start' : 'Initial SOC', gp ? 20 : 40, 100, 1, gp ? 100 : 90, '%'),
      ],
      evaluate: values => {
        const deploy = read(values, 'deploy', gp ? 15 : 55, 10, 100) / 100
        const harvest = read(values, 'harvest', gp ? 65 : 55, 0, 100) / 100
        const braking = read(values, 'brakingFraction', gp ? 22 : 20, 10, gp ? 45 : 35) / 100
        const initialSoc = read(values, 'initialSoc', gp ? 100 : 90, gp ? 20 : 40, 100)
        // This is a single-lap strategy model. The GP branch visualises the
        // regulated 4 MJ max-to-min energy window, not total battery capacity.
        const duration = gp ? 90 : 65
        const deployEnergy = powerMax * deploy * duration * (1 - braking) / 3600
        const harvestCap = gp ? FIA_LAP_RECHARGE_MAX_MJ / 3.6 : Number.POSITIVE_INFINITY
        const potentialHarvestEnergy = powerMax * harvest * duration * braking * .72 / 3600
        const harvestEnergy = Math.min(harvestCap, potentialHarvestEnergy)
        const capacityKWh = 6.5
        const limitMJ = gp ? FIA_ES_STATE_OF_CHARGE_SWING_MJ : capacityKWh * 3.6
        const initialEnergyMj = initialSoc / 100 * limitMJ
        const ledger = orderedLapEnergyTrace(initialEnergyMj, deployEnergy * 3.6, harvestEnergy * 3.6, 1 - braking)
        const finalStateRaw = ledger.finishMj / limitMJ * 100
        const finalState = clamp(finalStateRaw, 0, 100)
        const swingMJ = ledger.swingMj
        const windowBreach = ledger.minimumMj < 0 || ledger.maximumMj > limitMJ
        const timeline = ledger.points.map(point => ({ x: point.x, y: point.y / limitMJ * 100 }))
        return result([
          metric('deploy-energy', '部署能量', 'Deployment energy', round(deployEnergy, 2), 'kWh'),
          metric('harvest-energy', '回收能量', 'Harvest energy', round(harvestEnergy, 2), 'kWh', gp && potentialHarvestEnergy > harvestCap ? 'warn' : 'good'),
          metric('finish-soc', gp ? '窗口终点' : '终点 SOC', gp ? 'Window finish' : 'Finish SOC', round(finalStateRaw, 1), '%', windowBreach ? 'danger' : toneLow(finalState, 25, 12)),
          metric('energy-swing', '能量摆幅', 'Energy swing', round(swingMJ, 2), 'MJ', gp ? toneHigh(swingMJ, 3.6, 4) : 'good'),
        ], timeline, labels(['部署', 'Deploy'], ['回收', 'Harvest'], gp ? ['4 MJ 窗口', '4 MJ window'] : ['SOC', 'SOC'], ['法规余量', 'Rule margin']), [deploy, harvest, finalState / 100, clamp(1 - swingMJ / limitMJ, 0, 1)], insight(gp ? '曲线按先部署、后制动回收的时序计算最大—最小能量摆幅，而不是用圈末净变化代替。8.5 MJ 是 C5.2.10 的基础单圈回收上限；FIA 可按赛事降至 7 MJ，排位节次还可降至不低于 5 MJ，并可按 B7.2 另加最多 0.5 MJ。' : '80 kW 是 TSAC 出口功率上限；曲线按时序追踪能量，单圈目标还受效率、附着和终点 SOC 约束。', gp ? 'The curve follows deployment then braking recharge to measure the true maximum-to-minimum swing, not merely the lap-end net change. C5.2.10 sets an 8.5 MJ baseline recharge cap; the FIA may reduce it to 7 MJ, or no lower than 5 MJ in qualifying sessions, with up to 0.5 MJ additional recharge under B7.2.' : 'The 80 kW limit is measured at the TSAC outlet; the ordered energy trace also depends on efficiency, grip and finish SOC.'), { risk: gp ? Math.max(clamp(swingMJ / FIA_ES_STATE_OF_CHARGE_SWING_MJ, 0, 1), windowBreach ? 1 : 0) : Math.max(clamp((20 - finalState) / 20, 0, 1), windowBreach ? 1 : 0) })
      },
    },
  ]
}

const inverterExperiments = (gp: boolean): InteractionExperiment[] => {
  const voltageDefault = gp ? 800 : 400
  const voltageMin = gp ? 600 : 250
  const voltageMax = gp ? 1000 : 600
  const currentMax = gp ? 600 : 250
  return [
    {
      id: 'inverter-loss-trade', title: l('开关损耗', 'Switching loss'), question: l('频率越高为什么越热？', 'Why does higher switching frequency add heat?'), mode: 'distribution',
      parameters: [
        parameter('frequency', '开关频率', 'Switching frequency', gp ? 8 : 6, gp ? 30 : 20, 1, gp ? 18 : 12, 'kHz'),
        parameter('phaseCurrent', '相电流 RMS', 'Phase current RMS', 20, currentMax, 5, gp ? 320 : 140, 'A'),
        parameter('dcVoltage', '母线电压', 'DC-link voltage', voltageMin, voltageMax, gp ? 10 : 5, voltageDefault, 'V'),
        parameter('junctionTemp', '结温', 'Junction temperature', 40, gp ? 175 : 150, 1, gp ? 95 : 85, '°C'),
      ],
      evaluate: values => {
        const f = read(values, 'frequency', gp ? 18 : 12, gp ? 8 : 6, gp ? 30 : 20)
        const current = read(values, 'phaseCurrent', gp ? 320 : 140, 20, currentMax)
        const voltage = read(values, 'dcVoltage', voltageDefault, voltageMin, voltageMax)
        const temp = read(values, 'junctionTemp', gp ? 95 : 85, 40, gp ? 175 : 150)
        const rOn = (gp ? .0015 : .0022) * (1 + .005 * (temp - 25))
        const conduction = 3 * current * current * rOn / 1000
        const switching = 6 * f * 1000 * (gp ? .0042 : .0016) * (voltage / voltageDefault) * (current / (gp ? 320 : 140)) / 1000
        const output = Math.sqrt(3) * voltage * current * .74 / 1000
        const efficiency = clamp(output / Math.max(output + conduction + switching, 1e-6) * 100, 0, 100)
        const tjEstimate = temp + (conduction + switching) * (gp ? 1.8 : 3.2)
        const valuesNorm = [normal(conduction, 0, gp ? 18 : 5), normal(switching, 0, gp ? 12 : 4), normal(output, 0, gp ? 500 : 100), efficiency / 100]
        return result([
          metric('conduction-loss', '导通损耗', 'Conduction loss', round(conduction, 2), 'kW', toneHigh(conduction, gp ? 10 : 3, gp ? 16 : 5)),
          metric('switching-loss', '开关损耗', 'Switching loss', round(switching, 2), 'kW', toneHigh(switching, gp ? 7 : 2, gp ? 11 : 3.5)),
          metric('junction-estimate', '估算结温', 'Estimated junction', round(tjEstimate, 1), '°C', toneHigh(tjEstimate, gp ? 150 : 125, gp ? 170 : 145)),
          metric('efficiency', '逆变器效率', 'Inverter efficiency', round(efficiency, 2), '%', toneLow(efficiency, 96, 93)),
        ], valuesNorm.map((y, x) => ({ x, y })), labels(['导通', 'Conduction'], ['开关', 'Switching'], ['输出', 'Output'], ['效率', 'Efficiency']), valuesNorm, insight('提高开关频率通常减小纹波，却近似线性增加开关损耗；真实数值必须由器件能量曲线校准。', 'Higher switching frequency usually reduces ripple but approximately raises switching loss linearly; real values require device energy-curve calibration.'), { risk: clamp((tjEstimate - (gp ? 120 : 100)) / 50, 0, 1) })
      },
    },
    {
      id: 'inverter-voltage-utilisation', title: l('电压利用率', 'Voltage utilisation'), question: l('母线下陷为何提前弱磁？', 'Why does DC sag bring field weakening forward?'), mode: 'field',
      parameters: [
        parameter('dcVoltage', '母线电压', 'DC-link voltage', voltageMin, voltageMax, gp ? 10 : 5, voltageDefault, 'V'),
        parameter('speed', '电机转速', 'Motor speed', 0, gp ? 25000 : 20000, 250, gp ? 9000 : 8000, 'rpm'),
        parameter('torque', '转矩请求', 'Torque request', 0, gp ? 500 : 90, gp ? 5 : 1, gp ? 200 : 40, 'N·m'),
      parameter('modulation', '调制指数', 'Modulation index', .65, 1.05, .01, .92, '—'),
      ],
      evaluate: values => {
        const dc = read(values, 'dcVoltage', voltageDefault, voltageMin, voltageMax)
        const speed = read(values, 'speed', gp ? 9000 : 8000, 0, gp ? 25000 : 20000)
        const torque = read(values, 'torque', gp ? 200 : 40, 0, gp ? 500 : 90)
        const modulation = read(values, 'modulation', .92, .65, 1.05)
        const required = (gp ? .036 : .019) * speed + (gp ? .22 : .55) * torque
        const available = dc / Math.sqrt(3) * Math.min(modulation, 1)
        const margin = available - required
        const fieldWeakening = Math.max(0, -margin) / Math.max(gp ? .7 : 1.2, .1)
        const torqueAvailable = torque * clamp(1 + margin / Math.max(required, 1), .25, 1)
        const valuesNorm = [normal(required, 0, available * 1.4), normal(available, 0, voltageMax / Math.sqrt(3)), clamp(1 - fieldWeakening / (gp ? 350 : 150), 0, 1), torqueAvailable / Math.max(gp ? 500 : 90, 1)]
        return result([
          metric('phase-voltage', '所需相电压', 'Required phase voltage', round(required, 1), 'V', margin < 0 ? 'warn' : 'good'),
          metric('voltage-margin', '电压裕度', 'Voltage margin', round(margin, 1), 'V', toneLow(margin, 30, 0)),
          metric('field-current', '弱磁电流', 'Field-weakening current', round(fieldWeakening, 1), 'A', toneHigh(fieldWeakening, gp ? 180 : 80, gp ? 300 : 130)),
          metric('torque-available', '可用转矩', 'Available torque', round(torqueAvailable, 1), 'N·m', torqueAvailable < torque * .9 ? 'warn' : 'good'),
        ], curve(x => Math.min(gp ? 500 : 90, torqueAvailable / Math.max(x, .12)), .12, 1), labels(['电压圆', 'Voltage'], ['反电势', 'Back EMF'], ['弱磁', 'Field weakening'], ['转矩', 'Torque']), valuesNorm, insight('转速和磁链推高所需电压；降低有效磁链可扩展速度，但会增加电流与损耗。', 'Speed and flux raise voltage demand; weakening effective flux extends speed at the cost of current and loss.'), { risk: clamp(-margin / Math.max(required * .25, 1), 0, 1), marker: speed / (gp ? 25000 : 20000) })
      },
    },
    {
      id: 'inverter-dead-time', title: l('死区与直通', 'Dead time'), question: l('死区为何不能越短越好？', 'Why can dead time not simply be minimised?'), mode: 'timeline',
      parameters: [
        parameter('deadTime', '死区', 'Dead time', gp ? .05 : .1, gp ? 2.5 : 4, .05, gp ? .7 : 1.2, 'µs'),
        parameter('turnOffSpread', '关断离散', 'Turn-off spread', 0, gp ? 1 : 1.5, .05, gp ? .2 : .3, 'µs'),
        parameter('phaseCurrent', '相电流', 'Phase current', -currentMax, currentMax, 5, gp ? 120 : 40, 'A'),
        parameter('dcVoltage', '母线电压', 'DC-link voltage', voltageMin, voltageMax, gp ? 10 : 5, voltageDefault, 'V'),
      ],
      evaluate: values => {
        const dead = read(values, 'deadTime', gp ? .7 : 1.2, gp ? .05 : .1, gp ? 2.5 : 4)
        const spread = read(values, 'turnOffSpread', gp ? .2 : .3, 0, gp ? 1 : 1.5)
        const current = read(values, 'phaseCurrent', gp ? 120 : 40, -currentMax, currentMax)
        const dc = read(values, 'dcVoltage', voltageDefault, voltageMin, voltageMax)
        const safeMargin = dead - (spread + (gp ? .25 : .4))
        const distortion = dc * dead * (gp ? 18 : 12) * 1000 * 1e-6 * Math.sign(current || 1)
        const ripple = Math.abs(current) < 5 ? 0 : Math.abs(distortion) / Math.max(dc, 1) * 100
        const shootRisk = clamp(-safeMargin / Math.max(spread + .2, .2), 0, 1)
        const base = curve(x => Math.sin(x * Math.PI * 4), 0, 1)
        const distorted = curve(x => Math.sin(x * Math.PI * 4) + Math.sign(Math.sin(x * Math.PI * 4)) * clamp(distortion / dc, -.2, .2), 0, 1)
        return result([
          metric('dead-margin', '直通裕度', 'Shoot-through margin', round(safeMargin, 2), 'µs', toneLow(safeMargin, .2, 0)),
          metric('voltage-error', '基波电压误差', 'Voltage error', round(distortion, 2), 'V', toneHigh(Math.abs(distortion), dc * .02, dc * .04)),
          metric('torque-ripple', '转矩纹波指数', 'Torque-ripple index', round(ripple, 2), '%', toneHigh(ripple, 2, 5)),
          metric('shoot-risk', '直通风险', 'Shoot-through risk', round(shootRisk * 100, 1), '%', shootRisk > .5 ? 'danger' : shootRisk > .1 ? 'warn' : 'good'),
        ], base, labels(['上桥臂', 'High side'], ['死区', 'Dead time'], ['下桥臂', 'Low side'], ['相电流', 'Phase current']), [1, clamp(safeMargin / 1.5, 0, 1), 1, clamp(1 - ripple / 8, 0, 1)], insight('死区必须覆盖最坏关断延迟；过长会在电流过零附近造成明显电压和转矩失真。', 'Dead time must cover worst-case turn-off delay; excess dead time distorts voltage and torque near current zero crossing.'), { risk: shootRisk, secondaryPoints: distorted })
      },
    },
    {
      id: 'inverter-regen-overvoltage', title: l('回收过压', 'Regen overvoltage'), question: l('限充时能量去哪里？', 'Where does energy go when charging is limited?'), mode: 'flow',
      parameters: [
        parameter('regenPower', gp ? '回收直流功率' : '回收功率（教学）', gp ? 'Recharge DC power' : 'Teaching regen power', 0, gp ? 350 : 120, gp ? 5 : 2, gp ? 180 : 35, 'kW'),
        parameter('chargeLimit', gp ? '电池限充' : '电池限充（教学）', gp ? 'Battery charge limit' : 'Teaching battery charge limit', 0, gp ? 350 : 120, gp ? 5 : 2, gp ? 160 : 30, 'kW'),
        parameter('capacitance', '母线电容', 'DC-link capacitance', .5, gp ? 8 : 5, .1, gp ? 3 : 2, 'mF'),
        parameter('soc', '荷电状态', 'State of charge', 20, 100, 1, 70, '%'),
      ],
      evaluate: values => {
        const regenScale = gp ? 350 : 120
        const regen = read(values, 'regenPower', gp ? 180 : 35, 0, regenScale)
        const chargeLimit = read(values, 'chargeLimit', gp ? 160 : 30, 0, regenScale)
        const capacitance = read(values, 'capacitance', gp ? 3 : 2, .5, gp ? 8 : 5) / 1000
        const soc = read(values, 'soc', 70, 20, 100)
        const socFactor = clamp((100 - soc) / 25, .05, 1)
        const accepted = Math.min(regen, chargeLimit * socFactor)
        const mismatch = Math.max(0, regen - accepted)
        const dt = .02
        const peakVoltage = Math.sqrt(voltageDefault ** 2 + 2 * mismatch * 1000 * dt / Math.max(capacitance, 1e-6))
        const cut = mismatch
        const margin = voltageMax - peakVoltage
        return result([
          metric('dc-peak', '母线峰值', 'DC-link peak', round(peakVoltage, 1), 'V', toneHigh(peakVoltage, voltageMax * .94, voltageMax)),
          metric('accepted-power', '电池接收', 'Battery accepted', round(accepted, 1), 'kW', 'good'),
          metric('curtailed-power', '削减回收', 'Curtailed regen', round(cut, 1), 'kW', cut > 0 ? 'warn' : 'good'),
          metric('overvoltage-margin', '过压裕度', 'Overvoltage margin', round(margin, 1), 'V', toneLow(margin, voltageMax * .06, 0)),
        ], curve(x => Math.sqrt(voltageDefault ** 2 + 2 * mismatch * 1000 * dt * x / Math.max(capacitance, 1e-6)), 0, 1), labels(['车轮', 'Wheels'], ['电机', 'Motor'], ['母线', 'DC link'], ['电池', 'Battery']), [regen / regenScale, regen / regenScale, clamp(1 - peakVoltage / (voltageMax * 1.1), 0, 1), accepted / Math.max(regen, 1)], insight(gp ? '电池不能接收的回收功率会先抬高有限母线电容的能量；控制器必须削减负扭矩并协调机械制动。' : 'FS EV2.2.1 的 80 kW 只限制 TSAC 出口的正向驱动功率；EV2.2.3 不限制回收功率。此处上限是电池、电机与控制策略的教学假设，并非赛事法规上限。', gp ? 'Regen power the battery cannot accept first raises energy in the finite DC-link capacitor; negative torque must be curtailed and blended with mechanical braking.' : 'The FS EV2.2.1 80 kW cap applies only to positive drive power at the TSAC outlet; EV2.2.3 does not cap regeneration. The limits shown here are teaching assumptions for the pack, motor and controls, not a competition rule.'), { risk: clamp((peakVoltage - voltageMax * .9) / (voltageMax * .1), 0, 1) })
      },
    },
    {
      id: 'inverter-phase-thermal', title: l('三相热降额', 'Phase thermal derating'), question: l('一个热点为何限制整机？', 'Why can one hot spot limit the inverter?'), mode: 'field',
      parameters: [
        parameter('sensorError', '电流增益误差', 'Current gain error', -5, 5, .1, 0, '%'),
        parameter('resistanceMismatch', '相电阻离散', 'Phase-resistance spread', 0, 10, .1, 2, '%'),
        parameter('coolantTemp', '冷却液温度', 'Coolant temperature', 20, gp ? 80 : 70, 1, gp ? 45 : 40, '°C'),
        parameter('flow', '流量可用度', 'Flow availability', 20, 100, 1, gp ? 90 : 85, '%'),
      ],
      evaluate: values => {
        const sensorError = read(values, 'sensorError', 0, -5, 5)
        const mismatch = read(values, 'resistanceMismatch', 2, 0, 10)
        const coolant = read(values, 'coolantTemp', gp ? 45 : 40, 20, gp ? 80 : 70)
        const flow = read(values, 'flow', gp ? 90 : 85, 20, 100)
        const residual = Math.abs(sensorError) * (gp ? 4.2 : 2.3)
        const hottest = coolant + (gp ? 65 : 50) * (1 + mismatch / 20 + Math.abs(sensorError) / 18) * Math.sqrt(100 / flow)
        const ripple = Math.abs(sensorError) * .8 + mismatch * .45
        const derating = clamp(100 - Math.max(0, hottest - (gp ? 125 : 105)) * (gp ? 1.8 : 2.2), 0, 100)
        const thermal = [1 - normal(hottest, coolant, gp ? 180 : 150), 1 - normal(hottest - mismatch * .8, coolant, gp ? 180 : 150), 1 - normal(hottest - mismatch * .4, coolant, gp ? 180 : 150), flow / 100]
        return result([
          metric('current-residual', '三相电流残差', 'Three-phase residual', round(residual, 1), 'A', toneHigh(residual, gp ? 12 : 6, gp ? 25 : 12)),
          metric('hot-junction', '最高结温', 'Hottest junction', round(hottest, 1), '°C', toneHigh(hottest, gp ? 150 : 125, gp ? 170 : 145)),
          metric('torque-ripple', '转矩纹波', 'Torque ripple', round(ripple, 1), '%', toneHigh(ripple, 4, 8)),
          metric('current-available', '允许电流', 'Current available', round(derating, 1), '%', toneLow(derating, 75, 45)),
        ], thermal.map((y, x) => ({ x, y })), labels(['A 桥臂', 'Phase A'], ['B 桥臂', 'Phase B'], ['C 桥臂', 'Phase C'], ['冷板', 'Cold plate']), thermal, insight('三相和残差、单桥臂热阻与冷却分布必须同时检查；平均壳温不能代表局部结温。', 'Check current-sum residual, local thermal resistance and coolant distribution together; average case temperature cannot represent a local junction.'), { risk: clamp((hottest - (gp ? 120 : 100)) / 50, 0, 1) })
      },
    },
  ]
}

const motorExperiments = (gp: boolean): InteractionExperiment[] => {
  const currentMax = gp ? 600 : 250
  const torqueMax = gp ? 500 : 90
  const speedMax = gp ? 25000 : 20000
  return [
    {
      id: 'motor-torque-current', title: l('转矩与饱和', 'Torque and saturation'), question: l('电流增加为何不再等比例增扭？', 'Why does torque stop scaling with current?'), mode: 'field',
    parameters: [parameter('iq', 'q 轴电流', 'q-axis current', 0, currentMax, 5, gp ? 320 : 140, 'A'), parameter('id', 'd 轴电流', 'd-axis current', gp ? -350 : -150, gp ? 50 : 30, 5, 0, 'A'), parameter('magnetTemp', '磁钢温度', 'Magnet temperature', 20, gp ? 180 : 160, 1, gp ? 90 : 75, '°C'), parameter('saturation', '饱和系数', 'Saturation factor', .75, 1, .01, gp ? .95 : .96, '—')],
      evaluate: values => {
        const iq = read(values, 'iq', gp ? 320 : 140, 0, currentMax)
        const id = read(values, 'id', 0, gp ? -350 : -150, gp ? 50 : 30)
        const temp = read(values, 'magnetTemp', gp ? 90 : 75, 20, gp ? 180 : 160)
        const saturation = read(values, 'saturation', gp ? .95 : .96, .75, 1)
        const thermalFlux = clamp(1 - (temp - 20) * (gp ? .0008 : .001), .78, 1)
        const currentRatio = Math.hypot(iq, id) / currentMax
        const sat = saturation * (1 - .24 * currentRatio ** 2)
        const torque = clamp(torqueMax * (iq / currentMax) * thermalFlux * sat * (1 - Math.max(0, id) / currentMax * .2), 0, torqueMax)
        const copper = 3 * Math.hypot(iq, id) ** 2 * (gp ? .0013 : .005) * (1 + .0039 * (temp - 20)) / 1000
        const torquePerAmp = torque / Math.max(Math.hypot(iq, id), 1)
        const margin = clamp(1 - currentRatio ** 2 * (1.05 - saturation), 0, 1)
        return result([metric('torque', '电磁转矩', 'Electromagnetic torque', round(torque, 1), 'N·m', 'good'), metric('torque-per-amp', '转矩/安培', 'Torque per ampere', round(torquePerAmp, 3), 'N·m/A', toneLow(torquePerAmp, gp ? .6 : .35, gp ? .4 : .2)), metric('copper-loss', '铜损', 'Copper loss', round(copper, 2), 'kW', toneHigh(copper, gp ? 2 : .6, gp ? 4 : 1.2)), metric('saturation-margin', '饱和裕度', 'Saturation margin', round(margin * 100, 1), '%', toneLow(margin, .3, .12))], curve(x => torqueMax * x * thermalFlux * saturation * (1 - .24 * x * x), 0, 1), labels(['d 轴', 'd-axis'], ['q 轴', 'q-axis'], ['磁链', 'Flux'], ['转矩', 'Torque']), [clamp((id + currentMax) / (currentMax * 1.2), 0, 1), iq / currentMax, thermalFlux, torque / torqueMax], insight('进入磁饱和后转矩/安培下降；固定电感和磁链不能外推到最大电流。', 'Torque per ampere falls in magnetic saturation; fixed inductance and flux cannot be extrapolated to maximum current.'), { risk: 1 - margin, marker: currentRatio })
      },
    },
    {
      id: 'motor-torque-speed', title: l('转矩—转速', 'Torque-speed'), question: l('基速后为何进入恒功率区？', 'Why does the motor enter a constant-power region?'), mode: 'curve',
      parameters: [parameter('speed', '转速', 'Speed', 0, speedMax, 250, gp ? 12000 : 10000, 'rpm'), parameter('dcVoltage', '母线电压', 'DC voltage', gp ? 600 : 250, gp ? 1000 : 600, gp ? 10 : 5, gp ? 800 : 400, 'V'), parameter('currentLimit', '电流上限', 'Current limit', 50, currentMax, 5, gp ? 450 : 200, 'A'), parameter('coolantTemp', '冷却液温度', 'Coolant temperature', 20, gp ? 80 : 70, 1, gp ? 45 : 40, '°C'), ...(gp ? [parameter('vehicleSpeed', '非超车模式车速', 'Non-overtake vehicle speed', 50, 345, 5, 250, 'km/h')] : [])],
      evaluate: values => {
        const speed = read(values, 'speed', gp ? 12000 : 10000, 0, speedMax)
        const voltage = read(values, 'dcVoltage', gp ? 800 : 400, gp ? 600 : 250, gp ? 1000 : 600)
        const current = read(values, 'currentLimit', gp ? 450 : 200, 50, currentMax)
        const coolant = read(values, 'coolantTemp', gp ? 45 : 40, 20, gp ? 80 : 70)
        const vehicleSpeed = read(values, 'vehicleSpeed', 250, 50, 345)
        const baseSpeed = (gp ? 10500 : 9000) * voltage / (gp ? 800 : 400)
        const thermal = clamp(1 - Math.max(0, coolant - 45) / 90, .55, 1)
        const peakTorque = torqueMax * current / currentMax * thermal
        const dcPowerLimitKw = gp ? fiaNormalDeploymentDcLimitKw(vehicleSpeed) : 80
        const mechanicalPowerLimitKw = gp ? fiaDcToMechanicalPowerKw(dcPowerLimitKw) : dcPowerLimitKw * .94
        const torqueAtSpeed = (rpm: number) => {
          const voltageEnvelope = rpm <= baseSpeed ? peakTorque : peakTorque * baseSpeed / Math.max(rpm, 1)
          const powerEnvelope = rpm <= 1 ? peakTorque : mechanicalPowerLimitKw * 1000 / (rpm * Math.PI / 30)
          return Math.min(voltageEnvelope, powerEnvelope)
        }
        const available = torqueAtSpeed(speed)
        const power = available * speed * Math.PI / 30 / 1000
        const id = speed <= baseSpeed ? 0 : -(speed / baseSpeed - 1) * (gp ? 180 : 70)
        const voltageMargin = clamp(1 - speed / Math.max(baseSpeed * 1.8, 1), 0, 1) * 100
        const envelope = curve(x => torqueAtSpeed(x * speedMax), 0.001, 1)
        return result([metric('available-torque', '可用转矩', 'Available torque', round(available, 1), 'N·m', 'good'), metric('mechanical-power', '机械轴功率', 'Mechanical shaft power', round(power, 1), 'kW', power > mechanicalPowerLimitKw + .1 ? 'warn' : 'good'), metric('dc-power-limit', '直流功率边界', 'DC power limit', round(dcPowerLimitKw, 1), 'kW', gp && dcPowerLimitKw < 250 ? 'warn' : 'good'), metric('field-current', '弱磁电流', 'Field current', round(id, 1), 'A', toneHigh(Math.abs(id), gp ? 160 : 60, gp ? 280 : 110))], envelope, labels(['恒转矩', 'Constant torque'], ['基速', 'Base speed'], ['弱磁', 'Field weakening'], ['恒功率', 'Constant power']), [1, baseSpeed / speedMax, voltageMargin / 100, clamp(power / Math.max(mechanicalPowerLimitKw, 1), 0, 1)], insight(gp ? '350 kW 是 ERS-K 直流侧绝对边界，不是机械轴功率。这里按 C5.2.21 的 0.97 固定换算，并应用非超车模式随车速下降的部署曲线；500 N·m 曲轴参考扭矩边界仍独立成立。' : '80 kW 是 TSAC 出口电功率边界；图中以 94% 教学效率换算机械功率，基速以上还受电压与弱磁热负荷限制。', gp ? 'The 350 kW value is the absolute ERS-K DC boundary, not shaft power. This model applies the fixed 0.97 conversion in C5.2.21 and the non-overtake speed-dependent deployment curve; the separate 500 N·m crank-referenced torque limit still applies.' : 'The 80 kW value is the electrical boundary at the TSAC outlet; the plot uses a stated 94% teaching efficiency for shaft power, with voltage and field-weakening heat also limiting operation above base speed.'), { marker: speed / speedMax, risk: Math.max(clamp(Math.abs(id) / (gp ? 320 : 130), 0, 1), gp && dcPowerLimitKw <= 0 ? 1 : 0) })
      },
    },
    {
      id: 'motor-efficiency-map', title: l('效率岛', 'Efficiency island'), question: l('同样功率为何温升不同？', 'Why can equal power produce different heat?'), mode: 'distribution',
      parameters: [parameter('speed', '转速', 'Speed', 1000, speedMax, 250, gp ? 14000 : 9000, 'rpm'), parameter('torque', '请求转矩', 'Requested torque', 5, torqueMax, gp ? 5 : 1, gp ? 220 : 45, 'N·m'), ...(gp ? [parameter('vehicleSpeed', '非超车模式车速', 'Non-overtake vehicle speed', 50, 345, 5, 250, 'km/h')] : []), parameter('windingTemp', '绕组温度', 'Winding temperature', 25, gp ? 200 : 180, 1, gp ? 105 : 90, '°C'), parameter('weakening', '弱磁比例', 'Field-weakening share', 0, 100, 1, gp ? 20 : 0, '%')],
      evaluate: values => {
        const speed = read(values, 'speed', gp ? 14000 : 9000, 1000, speedMax)
        const requestedTorque = read(values, 'torque', gp ? 220 : 45, 5, torqueMax)
        const vehicleSpeed = read(values, 'vehicleSpeed', 250, 50, 345)
        const temp = read(values, 'windingTemp', gp ? 105 : 90, 25, gp ? 200 : 180)
        const weakening = read(values, 'weakening', gp ? 20 : 0, 0, 100) / 100
        const requestedMechanical = requestedTorque * speed * Math.PI / 30 / 1000
        const dcPowerLimit = gp ? fiaNormalDeploymentDcLimitKw(vehicleSpeed) : 80
        const mechanicalPowerLimit = gp ? fiaDcToMechanicalPowerKw(dcPowerLimit) : dcPowerLimit * .94
        const mechanical = Math.min(requestedMechanical, mechanicalPowerLimit)
        const torque = mechanical * 1000 / Math.max(speed * Math.PI / 30, 1e-9)
        const envelopeClipped = requestedMechanical > mechanicalPowerLimit + .1
        const current = torque / torqueMax * currentMax * (1 + .35 * weakening)
        // Equivalent phase-RMS current and hot phase resistance. The reduced
        // model also retains speed-dependent iron/windage and stray-load loss;
        // omitting them made the nominal 300+ kW point unrealistically exceed 99%.
        const phaseResistance = gp ? .0035 : .0075
        const copper = 3 * current * current * phaseResistance * (1 + .0039 * (temp - 25)) / 1000
        const iron = (gp ? 1.6 : .45) * (speed / 10000) ** 2 * (1 + weakening * .5)
        const mechanicalLoss = (gp ? .75 : .15) * speed / 10000 + (gp ? .8 : .2) * (speed / 10000) ** 2 + mechanical * (gp ? .012 : .015)
        const efficiency = clamp(mechanical / Math.max(mechanical + copper + iron + mechanicalLoss, .001) * 100, 0, 100)
        const vals = [normal(copper, 0, gp ? 8 : 2), normal(iron, 0, gp ? 4 : 1.2), normal(mechanicalLoss, 0, gp ? 1.5 : .5), efficiency / 100]
        return result([metric('motor-efficiency', '电机效率', 'Motor efficiency', round(efficiency, 2), '%', toneLow(efficiency, 90, 82)), metric('copper-loss', '铜损', 'Copper loss', round(copper, 2), 'kW', toneHigh(copper, gp ? 4 : 1, gp ? 7 : 1.8)), metric('iron-loss', '铁/磁损', 'Iron and magnetic loss', round(iron, 2), 'kW', toneHigh(iron, gp ? 2.5 : .7, gp ? 4 : 1.1)), metric('mechanical-output', '规则包络内机械输出', 'Mechanical output within rule envelope', round(mechanical, 1), 'kW', envelopeClipped ? 'warn' : 'good')], vals.map((y, x) => ({ x, y })), labels(['铜损', 'Copper'], ['铁损', 'Iron'], ['机械损', 'Mechanical'], ['效率', 'Efficiency']), vals, insight(gp ? '请求点先受 500 N·m 曲轴参考扭矩、C5.2.7 直流绝对边界、C5.2.8 非超车部署曲线及 C5.2.21 的 0.97 换算共同裁剪，再估算铜损、铁损与机械损；图形仍是教学等效图，最终效率岛必须用合规台架图校准。' : '请求点先受 TSAC 出口 80 kW 驱动边界和 94% 可见教学效率裁剪，再估算铜损、铁损与机械损；最终效率岛必须用选定电机台架图校准。', gp ? 'The requested point is first clipped by the 500 N·m crank-referenced torque limit, the C5.2.7 DC boundary, the C5.2.8 non-overtake deployment curve and the 0.97 conversion in C5.2.21, then copper, iron and mechanical losses are estimated. This remains a teaching equivalent and requires a compliant dyno map for final calibration.' : 'The requested point is first clipped by the 80 kW TSAC-outlet drive boundary and the visible 94% teaching efficiency, then copper, iron and mechanical losses are estimated. A selected motor dyno map is required for final calibration.'), { risk: Math.max(clamp((90 - efficiency) / 18, 0, 1), envelopeClipped ? .65 : 0) })
      },
    },
    {
      id: 'motor-thermal-transient', title: l('热瞬态', 'Thermal transient'), question: l('壳体不热为何绕组已危险？', 'Why can windings be hot while the case is not?'), mode: 'timeline',
      parameters: [parameter('load', 'RMS 转矩负载', 'RMS torque load', 10, 100, 1, gp ? 70 : 65, '%'), parameter('duration', '负载持续', 'Load duration', 5, 300, 5, gp ? 75 : 90, 's'), parameter('coolantTemp', '冷却液温度', 'Coolant temperature', 20, gp ? 80 : 70, 1, gp ? 45 : 40, '°C'), parameter('cooling', '冷却导热', 'Cooling conductance', 20, 100, 1, gp ? 90 : 80, '%')],
      evaluate: values => {
        const load = read(values, 'load', gp ? 70 : 65, 10, 100) / 100
        const duration = read(values, 'duration', gp ? 75 : 90, 5, 300)
        const coolant = read(values, 'coolantTemp', gp ? 45 : 40, 20, gp ? 80 : 70)
        const cooling = read(values, 'cooling', gp ? 90 : 80, 20, 100) / 100
        const loss = (gp ? 9 : 2.2) * load * load
        const tauW = gp ? 38 : 52
        const tauCase = gp ? 115 : 145
        const winding = coolant + loss * (gp ? 13 : 35) / cooling * (1 - Math.exp(-duration / tauW))
        const casing = coolant + loss * (gp ? 5.5 : 13) / cooling * (1 - Math.exp(-duration / tauCase))
        const limit = gp ? 190 : 170
        const windingRiseInfinity = loss * (gp ? 13 : 35) / cooling
        const windingInfinity = coolant + windingRiseInfinity
        const courseHorizon = 600
        const timeToLimit = windingInfinity <= limit
          ? Number.POSITIVE_INFINITY
          : -tauW * Math.log(clamp(1 - (limit - coolant) / Math.max(windingRiseInfinity, 1e-6), 1e-6, 1))
        const remaining = winding >= limit ? 0 : Number.isFinite(timeToLimit) ? clamp(timeToLimit - duration, 0, courseHorizon) : courseHorizon
        const derating = clamp(100 - Math.max(0, winding - (limit - 35)) * 2.5, 0, 100)
        const windingCurve = curve(x => coolant + loss * (gp ? 13 : 35) / cooling * (1 - Math.exp(-(x * duration) / tauW)), 0, 1)
        const caseCurve = curve(x => coolant + loss * (gp ? 5.5 : 13) / cooling * (1 - Math.exp(-(x * duration) / tauCase)), 0, 1)
        return result([metric('winding-temp', '绕组温度', 'Winding temperature', round(winding, 1), '°C', toneHigh(winding, limit - 25, limit)), metric('case-temp', '壳体温度', 'Case temperature', round(casing, 1), '°C', toneHigh(casing, gp ? 120 : 95, gp ? 145 : 120)), metric('remaining-time', '剩余连续时间', 'Remaining continuous time', round(remaining, 0), 's', toneLow(remaining, 40, 10)), metric('thermal-derating', '热降额', 'Thermal derating', round(derating, 1), '%', toneLow(derating, 75, 40))], windingCurve, labels(['绕组', 'Winding'], ['定子', 'Stator'], ['壳体', 'Case'], ['冷却液', 'Coolant']), [clamp(1 - winding / limit, 0, 1), clamp(1 - (winding + casing) / (2 * limit), 0, 1), clamp(1 - casing / limit, 0, 1), cooling], insight(windingInfinity <= limit ? '该工况的一阶稳态绕组温度低于限值；600 s 表示课程观察窗内安全，并非无限寿命。' : '剩余时间由一阶热系统的稳态温度与时间常数取对数求得；停机后壳体仍可能继续热浸。', windingInfinity <= limit ? 'The first-order steady winding temperature stays below the limit; 600 s means safe within the course horizon, not infinite life.' : 'Remaining time is solved logarithmically from the first-order thermal steady state and time constant; case heat soak can continue after shutdown.'), { risk: clamp(winding / limit, 0, 1), secondaryPoints: caseCurve })
      },
    },
    {
      id: 'motor-wheel-force', title: l('轮端力与齿比', 'Wheel force and ratio'), question: l('短齿比为何兼有加速与极速代价？', 'Why does a short ratio trade top speed for acceleration?'), mode: 'curve',
    parameters: [parameter('ratio', '轮端总传动比', 'Overall wheel-path ratio', gp ? 8 : 7, 16, .25, 10.5, '—'), parameter('torque', '电机转矩', 'Motor torque', -torqueMax, torqueMax, gp ? 5 : 1, gp ? 200 : 35, 'N·m'), parameter('friction', '轮胎摩擦系数', 'Tyre friction', .6, gp ? 2 : 1.8, .05, gp ? 1.55 : 1.35, '—'), parameter('rearLoad', '后轴法向载荷', 'Rear normal load', gp ? 2000 : 600, gp ? 7000 : 1800, gp ? 100 : 25, gp ? 4200 : 1200, 'N')],
      evaluate: values => {
        const ratio = read(values, 'ratio', 10.5, gp ? 8 : 7, 16)
        const torque = read(values, 'torque', gp ? 200 : 35, -torqueMax, torqueMax)
        const friction = read(values, 'friction', gp ? 1.55 : 1.35, .6, gp ? 2 : 1.8)
        const rearLoad = read(values, 'rearLoad', gp ? 4200 : 1200, gp ? 2000 : 600, gp ? 7000 : 1800)
        const radius = gp ? .35 : .24
        const requestedForce = torque * ratio * .95 / radius
        const grip = friction * rearLoad
        const force = clamp(requestedForce, -grip, grip)
        const topSpeed = speedMax * 2 * Math.PI / 60 * radius / ratio * 3.6
        const gripMargin = clamp((grip - Math.abs(requestedForce)) / Math.max(grip, 1) * 100, -100, 100)
        const regenDecel = torque < 0 ? Math.abs(force) / (gp ? 800 : 260) : 0
        return result([metric('wheel-force', '轮端纵向力', 'Wheel force', round(force, 0), 'N', Math.abs(requestedForce) > grip ? 'warn' : 'good'), metric('top-speed', '理论最高车速', 'Theoretical top speed', round(topSpeed, 1), 'km/h'), metric('grip-margin', '附着裕度', 'Grip margin', round(gripMargin, 1), '%', toneLow(gripMargin, 15, 0)), metric('regen-decel', '回收减速度', 'Regenerative deceleration', round(regenDecel, 2), 'm/s²')], curve(x => Math.min(grip, Math.abs(torque) * ratio * .95 / radius * (x < .55 ? 1 : .55 / x)), .05, 1), labels(['电机', 'Motor'], ['减速器', 'Reduction'], ['差速器', 'Differential'], ['轮胎', 'Tyre']), [Math.abs(torque) / torqueMax, normal(ratio, gp ? 8 : 7, 16), .8, clamp(1 - Math.abs(requestedForce) / Math.max(grip, 1), 0, 1)], insight('更大轮端总传动比提高低速轮端力，却更早达到转速上限；附着与回收限值仍会截断力。', 'A shorter overall wheel-path ratio raises low-speed wheel force but reaches the speed limit sooner; grip and regen limits still cap force.'), { risk: clamp(Math.abs(requestedForce) / Math.max(grip, 1) - .8, 0, 1), direction: Math.sign(torque) })
      },
    },
  ]
}

const differentialExperiments = (gp: boolean): InteractionExperiment[] => {
  const torqueMax = gp ? 1200 : 350
  return [
    {
      id: 'differential-wheel-speed', title: l('轮速差', 'Wheel-speed difference'), question: l('转弯为何必须允许左右轮不同速？', 'Why must left and right wheels turn at different speeds?'), mode: 'geometry',
      parameters: [parameter('speed', '车速', 'Vehicle speed', gp ? 40 : 10, gp ? 320 : 120, 5, gp ? 140 : 55, 'km/h'), parameter('radius', '转弯半径', 'Turn radius', gp ? 15 : 8, gp ? 180 : 80, 1, gp ? 45 : 22, 'm'), parameter('track', '后轮距', 'Rear track', gp ? 1.4 : 1, gp ? 1.7 : 1.5, .01, gp ? 1.55 : 1.2, 'm'), parameter('tyreRadius', '轮胎半径', 'Tyre radius', gp ? .32 : .2, gp ? .37 : .3, .005, gp ? .35 : .24, 'm')],
      evaluate: values => {
        const speed = read(values, 'speed', gp ? 140 : 55, gp ? 40 : 10, gp ? 320 : 120) / 3.6
        const radius = read(values, 'radius', gp ? 45 : 22, gp ? 15 : 8, gp ? 180 : 80)
        const track = read(values, 'track', gp ? 1.55 : 1.2, gp ? 1.4 : 1, gp ? 1.7 : 1.5)
        const tyre = read(values, 'tyreRadius', gp ? .35 : .24, gp ? .32 : .2, gp ? .37 : .3)
        const inner = speed * (radius - track / 2) / radius / tyre * 60 / (2 * Math.PI)
        const outer = speed * (radius + track / 2) / radius / tyre * 60 / (2 * Math.PI)
        const delta = outer - inner
        const error = delta / Math.max((inner + outer) / 2, 1) * 100
        return result([metric('inner-speed', '内轮转速', 'Inner-wheel speed', round(inner, 0), 'rpm'), metric('outer-speed', '外轮转速', 'Outer-wheel speed', round(outer, 0), 'rpm'), metric('delta-speed', '差速转速', 'Differential speed', round(delta, 0), 'rpm'), metric('locked-slip', '锁死路径误差', 'Locked path error', round(error, 2), '%', toneHigh(error, 3, 6))], curve(x => inner + (outer - inner) * x, 0, 1), labels(['左后轮', 'Left rear'], ['内轮', 'Inner'], ['外轮', 'Outer'], ['右后轮', 'Right rear']), [inner / Math.max(outer, 1), inner / Math.max(outer, 1), 1, 1], insight('转弯几何决定必要轮速差；锁死会迫使轮胎以纵向擦滑补偿路径差。', 'Corner geometry sets the required wheel-speed difference; locking forces the tyres to absorb it as longitudinal scrub.'), { direction: 1, risk: clamp(error / 8, 0, 1) })
      },
    },
    {
      id: 'differential-locking', title: l('限滑锁止', 'Limited slip'), question: l('更强锁止是否总能改善出弯？', 'Does more locking always improve corner exit?'), mode: 'distribution',
      parameters: [parameter('inputTorque', '输入转矩', 'Input torque', 0, torqueMax, gp ? 10 : 5, gp ? 650 : 180, 'N·m'), parameter('insideLoad', '内轮载荷', 'Inside-wheel load', gp ? 500 : 100, gp ? 2500 : 700, gp ? 25 : 10, gp ? 1300 : 350, 'N'), parameter('rearLoad', '后轴总载荷', 'Total rear-axle load', gp ? 2000 : 600, gp ? 7000 : 1800, gp ? 100 : 25, gp ? 4200 : 1200, 'N'), parameter('preload', '预紧转矩', 'Preload torque', 0, gp ? 300 : 100, 5, gp ? 80 : 30, 'N·m'), parameter('locking', '锁止增益', 'Locking gain', 0, 80, 1, gp ? 40 : 35, '%')],
      evaluate: values => {
        const input = read(values, 'inputTorque', gp ? 650 : 180, 0, torqueMax)
        const insideLoad = read(values, 'insideLoad', gp ? 1300 : 350, gp ? 500 : 100, gp ? 2500 : 700)
        const rearLoad = Math.max(insideLoad, read(values, 'rearLoad', gp ? 4200 : 1200, gp ? 2000 : 600, gp ? 7000 : 1800))
        const preload = read(values, 'preload', gp ? 80 : 30, 0, gp ? 300 : 100)
        const locking = read(values, 'locking', gp ? 40 : 35, 0, 80) / 100
        const mu = gp ? 1.55 : 1.35
        const radius = gp ? .35 : .24
        const insideCap = insideLoad * mu * radius
        const outsideLoad = Math.max(0, rearLoad - insideLoad)
        const outsideCap = outsideLoad * mu * radius
        const deltaCap = preload + input * locking
        // Maximise delivered axle torque subject to the individual tyre caps
        // and the clutch pack's finite torque-difference capacity. This keeps
        // the zero-preload/zero-locking case physically open: both half-shafts
        // carry equal torque and the low-grip side caps the whole axle.
        const insideIsHighSide = insideCap > outsideCap
        const lowCap = Math.min(insideCap, outsideCap)
        const highCap = Math.max(insideCap, outsideCap)
        const used = Math.min(input, lowCap + highCap, 2 * lowCap + deltaCap)
        const highTorque = Math.min(highCap, used, (used + deltaCap) / 2)
        const lowTorque = used - highTorque
        const insideTorque = insideIsHighSide ? highTorque : lowTorque
        const outsideTorque = insideIsHighSide ? lowTorque : highTorque
        const halfRequest = input / 2
        const slip = clamp((input - used) / Math.max(input, 1) * 100 + Math.max(0, halfRequest - insideCap) / Math.max(halfRequest, 1) * 35, 0, 100) * (1 - locking * .65)
        // Preload helps establish locking, but too much also creates low-speed
        // binding. Retain that trade so the preload control is observable.
        const preloadPenalty = preload / (gp ? 300 : 100) * 18
        const yawPenalty = clamp(Math.max(0, locking - .55) * 180 + preloadPenalty, 0, 100)
        const vals = [insideTorque / torqueMax, outsideTorque / torqueMax, used / torqueMax, 1 - yawPenalty / 100]
        return result([metric('inside-torque', '内轮转矩', 'Inside-wheel torque', round(insideTorque, 1), 'N·m'), metric('outside-torque', '外轮转矩', 'Outside-wheel torque', round(outsideTorque, 1), 'N·m'), metric('inside-slip', '内轮滑移', 'Inside-wheel slip', round(slip, 1), '%', toneHigh(slip, 8, 18)), metric('yaw-penalty', '横摆代价指数', 'Yaw penalty index', round(yawPenalty, 1), 'idx', toneHigh(yawPenalty, 25, 60))], vals.map((y, x) => ({ x, y })), labels(['内轮', 'Inside'], ['外轮', 'Outside'], ['可用', 'Usable'], ['横摆', 'Yaw']), vals, insight('锁止只在内、外轮各自附着上限内重分配转矩；外轮载荷不足时不能凭空接收转矩，过强锁止仍会增加擦滑和推头。', 'Locking redistributes torque only within each tyre grip cap; an unloaded outside tyre cannot accept invented torque, and excess locking still adds scrub and understeer.'), { risk: Math.max(slip / 25, yawPenalty / 100) })
      },
    },
    {
      id: 'differential-power-coast', title: l('加速/减速锁止', 'Power/coast lock'), question: l('入弯与出弯为何需要不同锁止？', 'Why do corner entry and exit need different locking?'), mode: 'timeline',
      parameters: [parameter('powerLock', '加速锁止', 'Power locking', 0, 80, 1, gp ? 40 : 35, '%'), parameter('coastLock', '减速锁止', 'Coast locking', 0, 60, 1, gp ? 25 : 20, '%'), parameter('brakeTorque', '入弯负转矩', 'Entry negative torque', 0, gp ? 900 : 250, gp ? 10 : 5, gp ? 350 : 80, 'N·m'), parameter('lateralG', '横向加速度', 'Lateral acceleration', 0, gp ? 3.5 : 1.8, .1, gp ? 2.2 : 1.1, 'g')],
      evaluate: values => {
        const power = read(values, 'powerLock', gp ? 40 : 35, 0, 80)
        const coast = read(values, 'coastLock', gp ? 25 : 20, 0, 60)
        const brake = read(values, 'brakeTorque', gp ? 350 : 80, 0, gp ? 900 : 250)
        const lateral = read(values, 'lateralG', gp ? 2.2 : 1.1, 0, gp ? 3.5 : 1.8)
        const entryYaw = clamp(100 - coast * .9 - brake / (gp ? 18 : 5), 0, 100)
        const speedDiff = clamp(100 - coast * 1.2 - lateral * 10, 0, 100)
        const exitTraction = clamp(45 + power * .75 - Math.max(0, power - 55) * .7, 0, 100)
        const scrub = clamp((power + coast) * .45 + lateral * 8, 0, 100)
        const primary = curve(x => x < .5 ? entryYaw + x * 2 * (50 - entryYaw) : 50 + (x - .5) * 2 * (exitTraction - 50), 0, 1)
        return result([metric('entry-yaw', '入弯响应', 'Entry yaw response', round(entryYaw, 1), 'idx', toneLow(entryYaw, 45, 25)), metric('speed-difference', '轮速差保留', 'Speed-difference retained', round(speedDiff, 1), '%', toneLow(speedDiff, 35, 18)), metric('exit-traction', '出弯牵引', 'Exit traction', round(exitTraction, 1), 'idx', toneLow(exitTraction, 55, 35)), metric('scrub-energy', '擦滑能量指数', 'Scrub-energy index', round(scrub, 1), 'idx', toneHigh(scrub, 55, 75))], primary, labels(['入弯', 'Entry'], ['中弯', 'Apex'], ['出弯', 'Exit']), [entryYaw / 100, speedDiff / 100, exitTraction / 100], insight('减速锁止偏向稳定，过强会抑制入弯；加速锁止帮助牵引，过强会增加推头。', 'Coast lock favours stability but can suppress turn-in; power lock aids traction but can add understeer.'), { risk: Math.max((50 - entryYaw) / 50, scrub / 100), direction: (power - coast) / 80 })
      },
    },
    {
      id: 'differential-oil', title: l('油温与效率', 'Oil temperature and efficiency'), question: l('冷油与热油为何各有代价？', 'Why do both cold and hot oil carry penalties?'), mode: 'flow',
      parameters: [parameter('oilTemp', '齿轮油温', 'Oil temperature', gp ? 20 : 10, gp ? 160 : 140, 1, gp ? 95 : 75, '°C'), parameter('speed', '输入转速', 'Input speed', gp ? 1000 : 500, gp ? 18000 : 12000, 250, gp ? 8000 : 5000, 'rpm'), parameter('torque', '输入转矩', 'Input torque', gp ? 50 : 20, torqueMax, gp ? 10 : 5, gp ? 600 : 160, 'N·m'), parameter('fill', '加油量', 'Oil fill level', 60, 120, 1, 100, '%')],
      evaluate: values => {
        const temp = read(values, 'oilTemp', gp ? 95 : 75, gp ? 20 : 10, gp ? 160 : 140)
        const speed = read(values, 'speed', gp ? 8000 : 5000, gp ? 1000 : 500, gp ? 18000 : 12000)
        const torque = read(values, 'torque', gp ? 600 : 160, gp ? 50 : 20, torqueMax)
        const fill = read(values, 'fill', 100, 60, 120) / 100
        const viscosity = Math.exp(((gp ? 95 : 75) - temp) / 45)
        const churn = (gp ? 1.8 : .45) * viscosity * (speed / 10000) ** 2 * fill ** 1.7
        const film = clamp(viscosity ** .55 * (speed / 5000) ** .35 / (torque / torqueMax + .2) * fill, 0, 2)
        const inputPower = torque * speed * Math.PI / 30 / 1000
        const otherLoss = inputPower * ((gp ? .018 : .025) + Math.max(0, .55 - film) * .08)
        const heat = churn + otherLoss
        const efficiency = clamp((inputPower - heat) / Math.max(inputPower, .1) * 100, 0, 99.5)
        return result([metric('viscosity', '相对黏度', 'Relative viscosity', round(viscosity, 2), 'idx', toneHigh(viscosity, 2.2, 3.5)), metric('churn-loss', '搅油损失', 'Churning loss', round(churn, 2), 'kW', toneHigh(churn, gp ? 3 : .8, gp ? 6 : 1.5)), metric('film-margin', '油膜裕度', 'Film margin', round(film * 100, 1), '%', toneLow(film, .65, .4)), metric('efficiency', '差速器效率', 'Differential efficiency', round(efficiency, 2), '%', toneLow(efficiency, 94, 88))], curve(x => Math.exp(((gp ? 95 : 75) - (x * (gp ? 140 : 130) + (gp ? 20 : 10))) / 45), 0, 1), labels(['齿轮', 'Gears'], ['油膜', 'Oil film'], ['壳体', 'Housing'], ['热', 'Heat']), [efficiency / 100, clamp(film, 0, 1), clamp(1 - heat / (gp ? 20 : 5), 0, 1), normal(heat, 0, gp ? 20 : 5)], insight('低温高黏度增加搅油，过热或油量不足降低油膜；实际边界必须来自选定油品和总成。', 'Cold viscous oil increases churning, while excessive temperature or low fill reduces film; final limits require the selected oil and assembly.'), { risk: Math.max(clamp(churn / (gp ? 7 : 1.8), 0, 1), clamp((.7 - film) / .7, 0, 1)) })
      },
    },
    {
      id: 'differential-nvh', title: l('齿隙与振动', 'Backlash and vibration'), question: l('咔嗒与啸叫各说明什么？', 'What do clunk and whine reveal?'), mode: 'curve',
      parameters: [parameter('backlash', '齿隙', 'Backlash', .02, gp ? .3 : .4, .01, gp ? .1 : .15, 'mm'), parameter('preload', '轴承预载', 'Bearing preload', 20, 200, 5, 100, '%'), parameter('meshTorque', '啮合转矩', 'Mesh torque', gp ? 50 : 20, torqueMax, gp ? 10 : 5, gp ? 550 : 150, 'N·m'), parameter('speed', '转速', 'Speed', gp ? 1000 : 500, gp ? 18000 : 12000, 250, gp ? 8000 : 5000, 'rpm')],
      evaluate: values => {
        const backlash = read(values, 'backlash', gp ? .1 : .15, .02, gp ? .3 : .4)
        const preload = read(values, 'preload', 100, 20, 200)
        const torque = read(values, 'meshTorque', gp ? 550 : 150, gp ? 50 : 20, torqueMax)
        const speed = read(values, 'speed', gp ? 8000 : 5000, gp ? 1000 : 500, gp ? 18000 : 12000)
        const target = gp ? .1 : .15
        const impact = Math.abs(backlash - target) / target * torque / torqueMax * 100
        const orderAmplitude = torque / torqueMax * 12 + Math.abs(backlash - target) / target * 35 + Math.abs(preload - 100) * .25
        const bearingRise = Math.abs(preload - 90) * .22 * (speed / 8000) + 8
        const contact = clamp(100 - Math.abs(backlash - target) / target * 45 - Math.abs(preload - 100) * .35, 0, 100)
        const meshHz = 37 * speed / 60
        return result([metric('impact-index', '啮合冲击', 'Mesh-impact index', round(impact, 1), 'idx', toneHigh(impact, 25, 55)), metric('mesh-order', '啮合阶次幅值', 'Mesh-order amplitude', round(orderAmplitude, 1), 'idx', toneHigh(orderAmplitude, 25, 50)), metric('bearing-rise', '轴承温升', 'Bearing rise', round(bearingRise, 1), '°C', toneHigh(bearingRise, 35, 55)), metric('contact-quality', '接触斑点', 'Contact quality', round(contact, 1), '%', toneLow(contact, 70, 45))], curve(x => Math.sin(2 * Math.PI * x * 6) * orderAmplitude + Math.sin(2 * Math.PI * x) * impact, 0, 1), labels(['齿隙', 'Backlash'], ['啮合', 'Mesh'], ['轴承', 'Bearing'], ['阶次', 'Order']), [1 - normal(Math.abs(backlash - target), 0, target * 2), contact / 100, 1 - bearingRise / 80, clamp(meshHz / 12000, 0, 1)], insight(`啮合频率约 ${round(meshHz, 0)} Hz；需用转速阶次、接触斑点和油样区分齿隙与轴承问题。`, `Mesh frequency is about ${round(meshHz, 0)} Hz; speed order, contact pattern and oil debris distinguish backlash from bearing faults.`), { risk: Math.max(impact / 100, orderAmplitude / 100) })
      },
    },
  ]
}

const ecuExperiments = (gp: boolean): InteractionExperiment[] => [
  {
    id: 'ecu-scheduling', title: l('任务调度', 'Task scheduling'), question: l('平均负载正常为何仍会超时？', 'Why can deadlines fail at a normal average load?'), mode: 'timeline',
    parameters: [parameter('period', '快速环周期', 'Fast-loop period', gp ? .25 : .5, gp ? 2 : 5, .05, gp ? .5 : 1, 'ms'), parameter('execution', '快速环执行', 'Fast-loop execution', 50, gp ? 600 : 800, 10, gp ? 210 : 280, 'µs'), parameter('logging', '日志负载', 'Logging load', 0, 35, 1, gp ? 15 : 12, '%'), parameter('interrupts', '中断突发', 'Interrupt burst', 0, gp ? 30 : 20, 1, gp ? 6 : 4, '×')],
    evaluate: values => {
      const period = read(values, 'period', gp ? .5 : 1, gp ? .25 : .5, gp ? 2 : 5)
      const execution = read(values, 'execution', gp ? 210 : 280, 50, gp ? 600 : 800)
      const logging = read(values, 'logging', gp ? 15 : 12, 0, 35)
      const interrupts = read(values, 'interrupts', gp ? 6 : 4, 0, gp ? 30 : 20)
      const baseLoad = execution / (period * 1000) * 100
      const cpu = clamp(baseLoad + logging + interrupts * (gp ? .7 : 1), 0, 200)
      const worst = execution + interrupts * (gp ? 24 : 38) + logging * (gp ? 4 : 6)
      const deadline = period * 1000
      const misses = worst <= deadline ? 0 : Math.ceil((worst - deadline) / Math.max(deadline * .2, 1))
      const safetyDelay = execution * .2 + interrupts * (gp ? 10 : 16)
    return result([metric('cpu-load', 'CPU 负载', 'CPU load', round(cpu, 1), '%', toneHigh(cpu, 85, 100)), metric('worst-response', '最坏响应', 'Worst response', round(worst, 0), 'µs', toneHigh(worst, deadline * .8, deadline)), metric('deadline-miss', '超时次数', 'Deadline misses', misses, '×', misses > 0 ? 'danger' : 'good'), metric('safety-delay', '安全任务延迟', 'Safety-task delay', round(safetyDelay, 0), 'µs', toneHigh(safetyDelay, deadline * .35, deadline * .65))], curve(x => execution + x * (worst - execution), 0, 1), labels(['控制', 'Control'], ['安全', 'Safety'], ['CAN', 'CAN'], ['日志', 'Logging']), [clamp(baseLoad / 100, 0, 1), clamp(1 - safetyDelay / deadline, 0, 1), clamp(interrupts / (gp ? 30 : 20), 0, 1), logging / 35], insight('平均利用率只是必要检查；中断、不可抢占段和资源等待决定最坏响应时间。', 'Average utilisation is only a first check; interrupts, non-pre-emptible sections and resource waits set worst-case response.'), { risk: clamp(worst / deadline, 0, 1), marker: clamp(worst / deadline, 0, 1) })
    },
  },
  {
    id: 'ecu-can-age', title: l('CAN 新鲜度', 'CAN freshness'), question: l('报文最终到达为何仍可能过期？', 'Why can a frame arrive yet still be stale?'), mode: 'distribution',
    parameters: [parameter('bitrate', '总线位率', 'Bus bitrate', .5, 1, .1, 1, 'Mbit/s'), parameter('messages', '报文数量', 'Message count', gp ? 40 : 20, gp ? 300 : 180, 5, gp ? 90 : 45, '×'), parameter('rate', '平均发送频率', 'Mean message rate', 10, gp ? 1000 : 500, 10, gp ? 50 : 80, 'Hz'), parameter('errors', '错误帧比例', 'Error-frame rate', 0, 5, .1, .1, '%')],
    evaluate: values => {
      const bitrate = read(values, 'bitrate', 1, .5, 1) * 1e6
      const messages = read(values, 'messages', gp ? 90 : 45, gp ? 40 : 20, gp ? 300 : 180)
      const rate = read(values, 'rate', gp ? 50 : 80, 10, gp ? 1000 : 500)
      const errors = read(values, 'errors', .1, 0, 5) / 100
      const raw = messages * rate * 128 / bitrate
      const utilisation = clamp(raw * (1 + errors * 3) * 100, 0, 200)
      const queueDelay = utilisation < 70 ? 1 + utilisation * .04 : 3.8 + (utilisation - 70) ** 2 * .025
      const stale = Math.max(0, Math.round((queueDelay - (gp ? 10 : 20)) / 3))
      const retry = errors * utilisation
      const vals = [clamp(utilisation / 100, 0, 1), clamp(queueDelay / 80, 0, 1), clamp(stale / 20, 0, 1), clamp(retry / 10, 0, 1)]
    return result([metric('bus-load', '总线利用率', 'Bus utilisation', round(utilisation, 1), '%', toneHigh(utilisation, 70, 90)), metric('queue-delay', '最大排队延迟', 'Max queue delay', round(queueDelay, 1), 'ms', toneHigh(queueDelay, gp ? 10 : 20, gp ? 25 : 45)), metric('stale-signals', '过期信号', 'Stale signals', stale, '×', stale > 0 ? 'warn' : 'good'), metric('retry-share', '重发占比', 'Retry share', round(retry, 2), '%', toneHigh(retry, 2, 5))], vals.map((y, x) => ({ x, y })), labels(['总线', 'Bus'], ['延迟', 'Latency'], ['过期', 'Stale'], ['重发', 'Retry']), vals, insight('CAN 仲裁在高利用率下非线性放大低优先级等待；控制量必须同时检查 ID、age 和 timeout。', 'CAN arbitration amplifies low-priority delay nonlinearly at high load; control signals need ID, age and timeout checks.'), { risk: clamp(utilisation / 100, 0, 1) })
    },
  },
  {
    id: 'ecu-plausibility', title: l('合理性与安全态', 'Plausibility and safe state'), question: l('两个通道都在量程内为何仍故障？', 'Why can two in-range channels still be faulty?'), mode: 'field',
    parameters: [parameter('channelA', '踏板通道 A', 'Pedal channel A', 0, 100, 1, 35, '%'), parameter('channelB', '踏板通道 B', 'Pedal channel B', 0, 100, 1, 40, '%'), parameter('tolerance', '相关性容差', 'Correlation tolerance', 2, gp ? 12 : 15, .5, gp ? 6 : 8, '%'), parameter('debounce', '去抖时间', 'Debounce time', 0, gp ? 300 : 500, 10, gp ? 60 : 100, 'ms')],
    evaluate: values => {
      const a = read(values, 'channelA', 35, 0, 100)
      const b = read(values, 'channelB', 40, 0, 100)
      const tolerance = read(values, 'tolerance', gp ? 6 : 8, 2, gp ? 12 : 15)
      const debounce = read(values, 'debounce', gp ? 60 : 100, 0, gp ? 300 : 500)
      const error = Math.abs(a - b)
      const faultTime = error > tolerance ? debounce : 0
      const allowed = error <= tolerance ? Math.min(a, b) : error > tolerance * 1.8 ? 0 : 25
      const state = error <= tolerance ? 1 : allowed > 0 ? .5 : 0
      return result([metric('correlation-error', '相关性误差', 'Correlation error', round(error, 1), '%', toneHigh(error, tolerance, tolerance * 1.8)), metric('fault-time', '故障计时', 'Fault timer', round(faultTime, 0), 'ms', faultTime > 0 ? 'warn' : 'good'), metric('torque-allowed', '允许扭矩', 'Torque allowed', round(allowed, 1), '%', toneLow(allowed, 50, 5)), metric('safe-state', '安全状态', 'Safe-state confidence', round(state * 100, 0), '%', toneLow(state, .7, .2))], curve(x => a * x + b * (1 - x), 0, 1), labels(['通道 A', 'Channel A'], ['通道 B', 'Channel B'], ['相关性', 'Correlation'], ['安全态', 'Safe state']), [a / 100, b / 100, clamp(1 - error / tolerance / 2, 0, 1), state], insight(gp ? '范围、相关性、变化率和超时需分别判断；GP 安全逻辑受标准 ECU 与 FIA 规则管理。' : '范围、相关性、变化率和超时需分别判断；BSPD 必须保持独立非可编程安全路径。', gp ? 'Range, correlation, rate and timeout need separate diagnostics; GP safety logic remains governed by the standard ECU and FIA rules.' : 'Range, correlation, rate and timeout need separate diagnostics; the BSPD remains an independent non-programmable safety path.'), { risk: clamp(error / (tolerance * 2), 0, 1) })
    },
  },
  {
    id: 'ecu-torque-arbitration', title: l('扭矩仲裁', 'Torque arbitration'), question: l('驾驶员请求为何被多层限制？', 'Why is the driver request limited by several layers?'), mode: 'flow',
    parameters: [parameter('driver', '驾驶员请求', 'Driver request', -100, 100, 1, gp ? 50 : 60, '%'), parameter('dischargeLimit', '放电直流限值', 'Discharge DC limit', 0, gp ? 350 : 80, gp ? 5 : 1, gp ? 300 : 65, 'kW'), parameter('rechargeLimit', gp ? '回收直流限值' : '电池限充教学值', gp ? 'Recharge DC limit' : 'Teaching battery charge limit', 0, gp ? 350 : 120, gp ? 5 : 2, gp ? 250 : 55, 'kW'), ...(gp ? [parameter('vehicleSpeed', '非超车模式车速', 'Non-overtake vehicle speed', 50, 345, 5, 250, 'km/h')] : []), parameter('motorSpeed', '电机转速', 'Motor speed', 1000, gp ? 25000 : 20000, 250, gp ? 12000 : 7000, 'rpm'), parameter('thermalLimit', '电机热限值', 'Motor thermal limit', 0, 100, 1, 90, '%'), parameter('previousTorque', '上一周期转矩', 'Previous-cycle torque', gp ? -500 : -90, gp ? 500 : 90, gp ? 10 : 2, 0, 'N·m'), parameter('slew', '变化率限值', 'Slew-rate limit', gp ? 200 : 100, gp ? 6000 : 3000, gp ? 100 : 50, gp ? 6000 : 1600, 'N·m/s')],
    evaluate: values => {
      const driver = read(values, 'driver', gp ? 50 : 60, -100, 100)
      const discharge = read(values, 'dischargeLimit', gp ? 300 : 65, 0, gp ? 350 : 80)
      const vehicleSpeed = read(values, 'vehicleSpeed', 250, 50, 345)
      const rechargeScale = gp ? 350 : 120
      const recharge = read(values, 'rechargeLimit', gp ? 250 : 55, 0, rechargeScale)
      const motorSpeed = read(values, 'motorSpeed', gp ? 12000 : 7000, 1000, gp ? 25000 : 20000)
      const thermal = read(values, 'thermalLimit', 90, 0, 100)
      const previous = read(values, 'previousTorque', 0, gp ? -500 : -90, gp ? 500 : 90)
      const slew = read(values, 'slew', gp ? 6000 : 1600, gp ? 200 : 100, gp ? 6000 : 3000)
      const maxTorque = gp ? FIA_ERS_K_MECHANICAL_TORQUE_NM : 90
      const driverTorque = driver / 100 * maxTorque
      const omega = motorSpeed * Math.PI / 30
      const effectiveDischarge = gp ? Math.min(discharge, fiaNormalDeploymentDcLimitKw(vehicleSpeed)) : discharge
      const driveMechanicalKw = gp ? fiaDcToMechanicalPowerKw(effectiveDischarge) : effectiveDischarge * .94
      const rechargeMechanicalKw = gp ? Math.abs(fiaDcToMechanicalPowerKw(-recharge)) : recharge / .94
      const drivePowerTorque = Math.min(maxTorque, driveMechanicalKw * 1000 / Math.max(omega, 1))
      const rechargePowerTorque = Math.min(maxTorque, rechargeMechanicalKw * 1000 / Math.max(omega, 1))
      const thermalTorque = thermal / 100 * maxTorque
      const directionPowerTorque = driverTorque >= 0 ? drivePowerTorque : rechargePowerTorque
      const requestedAfterHardLimits = Math.sign(driverTorque) * Math.min(Math.abs(driverTorque), directionPowerTorque, thermalTorque)
      const timeStep = .05
      const ramped = previous + clamp(requestedAfterHardLimits - previous, -slew * timeStep, slew * timeStep)
      const command = clamp(ramped, -Math.min(rechargePowerTorque, thermalTorque), Math.min(drivePowerTorque, thermalTorque))
      const cutPower = Math.max(0, Math.abs(driverTorque) - Math.abs(command)) * omega / 1000
      const fulfilment = Math.abs(driverTorque) < 1 ? 1 : clamp(Math.abs(command) / Math.abs(driverTorque), 0, 1)
      return result([metric('final-torque', '最终转矩', 'Final torque', round(command, 1), 'N·m', 'good'), metric('request-fulfilment', '请求满足度', 'Request fulfilment', round(fulfilment * 100, 0), '%', toneLow(fulfilment, .6, .4)), metric('torque-slew', '50 ms 实际变化率', 'Actual 50 ms slew', round(Math.abs(command - previous) / timeStep, 0), 'N·m/s', 'good'), metric('cut-power', '削减功率', 'Curtailed power', round(cutPower, 1), 'kW', cutPower > 0 ? 'warn' : 'good')], curve(x => {
        const elapsed = timeStep * x
        const candidate = previous + clamp(requestedAfterHardLimits - previous, -slew * elapsed, slew * elapsed)
        return clamp(candidate, -Math.min(rechargePowerTorque, thermalTorque), Math.min(drivePowerTorque, thermalTorque))
      }, 0, 1), labels(['驾驶员', 'Driver'], ['直流边界', 'DC boundary'], ['热保护', 'Thermal'], ['最终命令', 'Final command']), [Math.abs(driver) / 100, (driverTorque >= 0 ? effectiveDischarge / (gp ? 350 : 80) : recharge / rechargeScale), thermal / 100, Math.abs(command) / maxTorque], insight(gp ? '本教学事件比较上一控制周期与 50 ms 后命令：正向部署先取用户直流限值与 C5.2.8 非超车车速曲线的较小值，回收使用独立直流限值，再按 C5.2.21 的 0.97 或其倒数换算机械边界；500 N·m 硬限值独立生效。' : '本教学事件明确比较上一控制周期与 50 ms 后命令：正向驱动遵守 TSAC 出口 80 kW 上限；负向回收使用独立的电池教学限值，因为 FS EV2.2.3 不把 80 kW 上限施加于再生功率。', gp ? 'This teaching event compares the previous control cycle with the command 50 ms later: deployment first takes the lower of the user DC limit and the C5.2.8 non-overtake speed curve, harvesting uses its separate DC limit, and C5.2.21 converts each direction with 0.97 or its inverse; the 500 N·m hard limit remains independent.' : 'This teaching event compares the previous cycle with the command 50 ms later: positive drive power follows the 80 kW TSAC-outlet cap, while negative regeneration uses an independent teaching battery limit because FS EV2.2.3 does not apply the 80 kW cap to regeneration.'), { risk: clamp(Math.abs(driverTorque - command) / maxTorque, 0, 1), direction: command / maxTorque })
    },
  },
  {
    id: 'ecu-logging', title: l('记录与遥测', 'Logging and telemetry'), question: l('记录越多为何未必更可诊断？', 'Why is more logging not always more diagnosable?'), mode: 'flow',
    parameters: [parameter('channels', '通道数量', 'Channel count', gp ? 100 : 20, gp ? 3000 : 800, 20, gp ? 900 : 180, '×'), parameter('sampleRate', '采样频率', 'Sample rate', 10, gp ? 10000 : 5000, 10, gp ? 500 : 200, 'Hz'), parameter('bytes', '每样本字节', 'Bytes per sample', 2, 8, 1, 4, 'B'), parameter('bandwidth', '链路/存储带宽', 'Link/storage bandwidth', gp ? 1 : .1, gp ? 100 : 20, .1, gp ? 20 : 2, 'MB/s')],
    evaluate: values => {
      const channels = read(values, 'channels', gp ? 900 : 180, gp ? 100 : 20, gp ? 3000 : 800)
      const sampleRate = read(values, 'sampleRate', gp ? 500 : 200, 10, gp ? 10000 : 5000)
      const bytes = read(values, 'bytes', 4, 2, 8)
      const bandwidth = read(values, 'bandwidth', gp ? 20 : 2, gp ? 1 : .1, gp ? 100 : 20)
      const raw = channels * sampleRate * bytes / 1e6
      const drop = clamp((raw - bandwidth) / Math.max(raw, .001) * 100, 0, 100)
      const buffer = gp ? 256 : 64
      const pretrigger = buffer / Math.max(raw, .001)
      const sync = .05 + sampleRate / (gp ? 200000 : 80000) + drop * .02
      return result([metric('data-rate', '原始数据率', 'Raw data rate', round(raw, 2), 'MB/s', toneHigh(raw, bandwidth * .8, bandwidth)), metric('drop-rate', '丢帧比例', 'Drop rate', round(drop, 1), '%', toneHigh(drop, 1, 5)), metric('pretrigger', '预触发时长', 'Pre-trigger length', round(pretrigger, 1), 's', toneLow(pretrigger, 2, .5)), metric('sync-error', '时间同步误差', 'Time-sync error', round(sync, 2), 'ms', toneHigh(sync, 1, 3))], curve(x => raw * x, 0, 1), labels(['采集', 'Acquire'], ['同步', 'Synchronise'], ['缓冲', 'Buffer'], ['记录/遥测', 'Log/telemetry']), [1, clamp(1 - sync / 5, 0, 1), clamp(pretrigger / 20, 0, 1), clamp(1 - drop / 100, 0, 1)], insight('同步、标定版本和触发上下文比无差别高采样更重要；遥测不能绕过控制规则。', 'Synchronisation, calibration version and trigger context matter more than indiscriminate high-rate logging; telemetry cannot bypass control rules.'), { risk: Math.max(drop / 100, clamp(sync / 5, 0, 1)) })
    },
  },
]

const sensorExperiments = (gp: boolean): InteractionExperiment[] => [
  {
    id: 'sensor-filtering', title: l('采样与滤波', 'Sampling and filtering'), question: l('更平滑为何也更迟钝？', 'Why is a smoother signal also slower?'), mode: 'curve',
    parameters: [parameter('sampleRate', '采样频率', 'Sample rate', gp ? 100 : 50, gp ? 10000 : 5000, 50, gp ? 1000 : 500, 'Hz'), parameter('signalFrequency', '信号频率', 'Signal frequency', 1, gp ? 1000 : 500, 1, gp ? 40 : 20, 'Hz'), parameter('cutoff', '低通截止', 'Low-pass cut-off', gp ? 5 : 2, gp ? 1000 : 500, 1, gp ? 100 : 50, 'Hz'), parameter('noise', '噪声 RMS', 'Noise RMS', 0, 10, .1, gp ? 1.5 : 2, '%FS')],
    evaluate: values => {
      const fs = read(values, 'sampleRate', gp ? 1000 : 500, gp ? 100 : 50, gp ? 10000 : 5000)
      const f = read(values, 'signalFrequency', gp ? 40 : 20, 1, gp ? 1000 : 500)
      const fc = read(values, 'cutoff', gp ? 100 : 50, gp ? 5 : 2, gp ? 1000 : 500)
      const noise = read(values, 'noise', gp ? 1.5 : 2, 0, 10)
      const attenuation = 1 / Math.sqrt(1 + (f / fc) ** 2)
      const phase = Math.atan(f / fc) * 180 / Math.PI
      const lagMs = phase / 360 / f * 1000
      const filteredNoise = noise * Math.sqrt(clamp(fc / (fs / 2), 0, 1))
      const alias = clamp((f * 2.5 - fs) / Math.max(fs, 1) * 100, 0, 100)
      const rawCurve = curve(x => Math.sin(2 * Math.PI * x * 3), 0, 1)
      const filtered = curve(x => attenuation * Math.sin(2 * Math.PI * x * 3 - phase * Math.PI / 180), 0, 1)
      return result([metric('noise-rms', '滤后噪声', 'Filtered noise', round(filteredNoise, 2), '%FS', toneHigh(filteredNoise, 3, 6)), metric('attenuation', '幅值保留', 'Amplitude retained', round(attenuation * 100, 1), '%', toneLow(attenuation, .8, .55)), metric('phase-lag', '相位延迟', 'Phase delay', round(lagMs, 2), 'ms', toneHigh(lagMs, 5, 15)), metric('alias-risk', '混叠风险', 'Aliasing risk', round(alias, 1), '%', toneHigh(alias, 1, 10))], rawCurve, labels(['原始', 'Raw'], ['低通', 'Low pass'], ['延迟', 'Delay'], ['采样', 'Sampling']), [1, attenuation, clamp(1 - lagMs / 30, 0, 1), clamp(fs / (f * 5), 0, 1)], insight('降低截止频率可抑制噪声，却增加幅值衰减和相位延迟；采样率还需给抗混叠滤波留裕度。', 'Lower cutoff suppresses noise but adds attenuation and phase lag; sample rate also needs margin for anti-alias filtering.'), { risk: Math.max(alias / 100, clamp(lagMs / 20, 0, 1)), secondaryPoints: filtered })
    },
  },
  {
    id: 'sensor-ratiometric', title: l('比例式 ADC', 'Ratiometric ADC'), question: l('参考电压怎样影响压力换算？', 'How does reference voltage affect pressure conversion?'), mode: 'curve',
    parameters: [parameter('pressure', '输入压力', 'Input pressure', 0, 2.5, .01, 1.5, 'bar'), parameter('reference', '5 V 参考', '5-V reference', 4.75, 5.25, .01, 5, 'V'), parameter('resolution', 'ADC 位数', 'ADC resolution', 10, gp ? 18 : 16, 1, gp ? 16 : 12, 'bit'), parameter('groundOffset', '地线偏移', 'Ground offset', gp ? -.05 : -.1, gp ? .05 : .1, .005, 0, 'V')],
    evaluate: values => {
      const pressure = read(values, 'pressure', 1.5, 0, 2.5)
      const reference = read(values, 'reference', 5, 4.75, 5.25)
      const bits = read(values, 'resolution', gp ? 16 : 12, 10, gp ? 18 : 16)
      const ground = read(values, 'groundOffset', 0, gp ? -.05 : -.1, gp ? .05 : .1)
      const ratio = .1 + .8 * pressure / 2.5
      const signal = reference * ratio + ground
      const levels = 2 ** bits - 1
      const code = Math.round(clamp(signal / reference, 0, 1) * levels)
      const converted = ((code / levels - .1) / .8) * 2.5
      const supplyOnlySignal = reference * ratio
      const absoluteConverted = ((supplyOnlySignal / 5 - .1) / .8) * 2.5
      const quantStep = 2.5 / (.8 * levels)
      const driftError = absoluteConverted - pressure
      const groundError = converted - pressure
      return result([metric('pressure', '换算压力', 'Converted pressure', round(converted, 3), 'bar', toneHigh(Math.abs(groundError), .03, .08)), metric('quant-step', '量化步长', 'Quantisation step', round(quantStep * 1000, 3), 'mbar'), metric('supply-error', '供电漂移误差', 'Supply-drift error', round(driftError, 3), 'bar', toneHigh(Math.abs(driftError), .03, .08)), metric('ground-error', '接地偏移误差', 'Ground-offset error', round(groundError, 3), 'bar', toneHigh(Math.abs(groundError), .03, .08))], curve(x => .1 * reference + .8 * reference * x, 0, 1), labels(['传感器', 'Sensor'], ['5 V 参考', '5-V ref'], ['ADC', 'ADC'], ['压力', 'Pressure']), [pressure / 2.5, clamp(1 - Math.abs(reference - 5) / .25, 0, 1), bits / (gp ? 18 : 16), clamp(1 - Math.abs(groundError) / .15, 0, 1)], insight('比例换算抵消共同参考漂移，但不能消除独立地线压降；分辨率也不等于精度。', 'Ratiometric conversion cancels common reference drift but not independent ground offset; resolution is not accuracy.'), { marker: pressure / 2.5, risk: clamp(Math.abs(groundError) / .1, 0, 1) })
    },
  },
  {
    id: 'sensor-wheel-speed', title: l('轮速齿圈', 'Wheel-speed target'), question: l('大气隙为何更易丢脉冲？', 'Why does a large air gap lose pulses?'), mode: 'timeline',
    parameters: [parameter('teeth', '齿数', 'Tooth count', 12, gp ? 180 : 120, 1, gp ? 60 : 48, '×'), parameter('airGap', '气隙', 'Air gap', .2, gp ? 1.2 : 1.5, .05, gp ? .7 : .8, 'mm'), parameter('wheelRpm', '轮速', 'Wheel speed', 0, gp ? 3000 : 2500, 25, gp ? 1200 : 800, 'rpm'), parameter('threshold', '比较阈值', 'Comparator threshold', 10, 90, 1, 35, '%')],
    evaluate: values => {
      const teeth = read(values, 'teeth', gp ? 60 : 48, 12, gp ? 180 : 120)
      const gap = read(values, 'airGap', gp ? .7 : .8, .2, gp ? 1.2 : 1.5)
      const rpm = read(values, 'wheelRpm', gp ? 1200 : 800, 0, gp ? 3000 : 2500)
      const threshold = read(values, 'threshold', 35, 10, 90) / 100
      const frequency = teeth * rpm / 60
      const amplitude = clamp((rpm / 400) ** .65 * Math.exp(-(gap - .4) * 1.8), 0, 3)
      const margin = amplitude - threshold
      const dropout = clamp((threshold - amplitude + .25) / .5 * 100, 0, 100)
      const estimated = rpm * (1 - dropout / 100)
      const jump = rpm - estimated
      return result([metric('pulse-frequency', '脉冲频率', 'Pulse frequency', round(frequency, 0), 'Hz', frequency > 15000 ? 'danger' : 'good'), metric('estimated-speed', '估算轮速', 'Estimated wheel speed', round(estimated, 0), 'rpm', dropout > 0 ? 'warn' : 'good'), metric('dropout', '丢脉冲风险', 'Dropout risk', round(dropout, 1), '%', toneHigh(dropout, 5, 20)), metric('speed-jump', '轮速跳变', 'Speed jump', round(jump, 0), 'rpm', toneHigh(jump, 30, 100))], curve(x => amplitude * Math.sin(2 * Math.PI * x * 8), 0, 1), labels(['齿圈', 'Target'], ['探头', 'Sensor'], ['阈值', 'Threshold'], ['轮速', 'Wheel speed']), [clamp(teeth / (gp ? 180 : 120), 0, 1), clamp(1 - gap / (gp ? 1.2 : 1.5), 0, 1), clamp(margin + .5, 0, 1), clamp(1 - dropout / 100, 0, 1)], insight('感应幅值在低速和大气隙下降；更多齿提高更新率，也提高最高脉冲频率。', 'Inductive amplitude falls at low speed and large gap; more teeth improve update rate but raise maximum pulse frequency.'), { risk: Math.max(dropout / 100, clamp((frequency - 13000) / 2000, 0, 1)) })
    },
  },
  {
    id: 'sensor-imu-frame', title: l('IMU 坐标', 'IMU frame'), question: l('小安装误差为何污染横向量？', 'Why does a small mounting error corrupt lateral data?'), mode: 'geometry',
    parameters: [parameter('tilt', '安装倾角', 'Mounting tilt', -5, 5, .1, gp ? .5 : .8, '°'), parameter('yawBias', '横摆零偏', 'Yaw bias', gp ? -2 : -3, gp ? 2 : 3, .1, 0, '°/s'), parameter('longitudinalG', '纵向加速度', 'Longitudinal acceleration', gp ? -5 : -2, gp ? 3 : 2, .1, gp ? -2.5 : -.8, 'g'), parameter('calibration', '安装与零偏校准质量', 'Mounting and bias calibration quality', 0, 100, 1, gp ? 90 : 82, '%')],
    evaluate: values => {
      const tilt = read(values, 'tilt', gp ? .5 : .8, -5, 5)
      const bias = read(values, 'yawBias', 0, gp ? -2 : -3, gp ? 2 : 3)
      const ax = read(values, 'longitudinalG', gp ? -2.5 : -.8, gp ? -5 : -2, gp ? 3 : 2)
      const calibration = read(values, 'calibration', gp ? 90 : 82, 0, 100) / 100
      const falseAy = ax * Math.sin(tilt * Math.PI / 180)
      const drift10s = bias * 10
      const residual = Math.hypot(falseAy * 100, bias * 2)
      const residualTilt = tilt * (1 - calibration)
      const residualBias = bias * (1 - calibration)
      const corrected = Math.hypot(ax * Math.sin(residualTilt * Math.PI / 180) * 100, residualBias * 2)
      return result([metric('false-lateral', '假横向加速度', 'False lateral acceleration', round(falseAy, 3), 'g', toneHigh(Math.abs(falseAy), .05, .12)), metric('yaw-drift', '10 秒横摆漂移', '10-s yaw drift', round(drift10s, 1), '°', toneHigh(Math.abs(drift10s), 8, 20)), metric('consistency', '一致性残差', 'Consistency residual', round(residual, 1), 'idx', toneHigh(residual, 8, 18)), metric('corrected', '校准后残差', 'Post-calibration residual', round(corrected, 1), 'idx', toneHigh(corrected, 5, 12))], curve(x => ax * Math.sin((tilt * x) * Math.PI / 180), 0, 1), labels(['车辆 X', 'Vehicle X'], ['车辆 Y', 'Vehicle Y'], ['IMU X', 'IMU X'], ['IMU Y', 'IMU Y']), [clamp(.5 + ax / (gp ? 10 : 4), 0, 1), clamp(1 - Math.abs(falseAy) / .2, 0, 1), clamp(.5 + tilt / 10, 0, 1), calibration], insight('强制动会放大小安装误差的轴间泄漏；低通滤波不能消除静态安装误差或零偏，必须用重力/转台、几何参考和动态校准显式修正坐标与偏置。', 'Hard braking magnifies cross-axis leakage from small mounting errors. A low-pass filter cannot remove static misalignment or bias; gravity/turntable, geometric references and dynamic calibration must explicitly correct the frame and offsets.'), { direction: tilt / 5, risk: clamp(corrected / 20, 0, 1) })
    },
  },
  {
    id: 'sensor-time-sync', title: l('时间同步', 'Time alignment'), question: l('电压电流准确为何功率仍错？', 'Why can accurate voltage and current yield wrong power?'), mode: 'timeline',
    parameters: [parameter('rippleFrequency', '纹波频率', 'Ripple frequency', gp ? 100 : 50, gp ? 5000 : 2000, 50, gp ? 1000 : 400, 'Hz'), parameter('ripple', '电流纹波', 'Current ripple', 0, 30, 1, gp ? 8 : 10, '%'), parameter('skew', '通道时差', 'Channel time skew', gp ? -2 : -5, gp ? 2 : 5, .1, gp ? .1 : .2, 'ms'), parameter('sampleRate', '采样频率', 'Sample rate', gp ? 500 : 100, gp ? 20000 : 10000, 100, gp ? 5000 : 1000, 'Hz')],
    evaluate: values => {
      const frequency = read(values, 'rippleFrequency', gp ? 1000 : 400, gp ? 100 : 50, gp ? 5000 : 2000)
      const ripple = read(values, 'ripple', gp ? 8 : 10, 0, 30) / 100
      const skew = read(values, 'skew', gp ? .1 : .2, gp ? -2 : -5, gp ? 2 : 5) / 1000
      const sampleRate = read(values, 'sampleRate', gp ? 5000 : 1000, gp ? 500 : 100, gp ? 20000 : 10000)
      const phase = 2 * Math.PI * frequency * skew
      const voltageRipple = .1
      const correlatedRipple = voltageRipple * ripple / 2
      const powerError = correlatedRipple * Math.abs(1 - Math.cos(phase)) / (1 + correlatedRipple) * 100
      const energyError = powerError
      const syncUs = Math.abs(skew) * 1e6
      // The anti-aliasing boundary is the Nyquist requirement fs >= 2 f.
      // The previous arbitrary 5x multiplier marked a valid nominal Student
      // sample rate as a total power-balance failure.
      const aliasingPenalty = Math.max(0, 2 * frequency - sampleRate) / sampleRate * 100
      const balance = clamp(100 - powerError * 2 - aliasingPenalty, 0, 100)
      const voltage = curve(x => 1 + .1 * Math.sin(2 * Math.PI * x * 5), 0, 1)
      const current = curve(x => 1 + ripple * Math.sin(2 * Math.PI * x * 5 + phase), 0, 1)
      return result([metric('power-error', '平均功率误差', 'Mean power error', round(powerError, 2), '%', toneHigh(powerError, 2, 5)), metric('energy-error', '能量积分误差', 'Energy integration error', round(energyError, 2), '%', toneHigh(energyError, 1.5, 4)), metric('time-skew', '同步误差', 'Time skew', round(syncUs, 0), 'µs', toneHigh(syncUs, gp ? 200 : 500, gp ? 800 : 2000)), metric('power-balance', '功率平衡闭合', 'Power-balance closure', round(balance, 1), '%', toneLow(balance, 95, 85))], voltage, labels(['电压', 'Voltage'], ['电流', 'Current'], ['转矩', 'Torque'], ['转速', 'Speed']), [1, clamp(1 - powerError / 10, 0, 1), balance / 100, sampleRate / (gp ? 20000 : 10000)], insight(gp ? 'FIA 在 ES 负端与 CU-K 正端规定两个 DC 测点；电压电流需同步后逐样本相乘积分。' : '电压电流需同步后逐样本相乘积分；分别求平均再相乘会漏掉相关纹波。', gp ? 'FIA specifies two DC measurement points at ES negative and CU-K positive; synchronized voltage and current must be multiplied sample by sample.' : 'Synchronized voltage and current must be multiplied sample by sample; multiplying separate averages misses correlated ripple.'), { risk: clamp(powerError / 8, 0, 1), secondaryPoints: current })
    },
  },
]

const reference = (
  part: PowerElectronicsPartId, id: string, title: LocalText, summary: LocalText, purpose: LocalText,
  details: [LocalText, LocalText, LocalText], sourceTitle: LocalText, url: string,
): InteractionReferenceCard => ({
  id, title, image: `/images/interactions/${part}/reference-${id}.webp`,
  imageAlt: l(`${title.zh}工程资料场景`, `Engineering reference scene for ${title.en}`),
  summary, purpose, details, sourceTitle, url,
})

const fault = (
  part: PowerElectronicsPartId, id: string, title: LocalText, scenario: LocalText,
  strategy: LocalText, principle: LocalText, evidence: LocalText,
): InteractionFaultCard => ({
  id, title, image: `/images/interactions/${part}/fault-${id}.webp`,
  imageAlt: l(`${title.zh}故障诊断场景`, `Fault-diagnosis scene for ${title.en}`),
  scenario, strategy, principle, evidence,
})

const batteryReferences: InteractionReferenceCard[] = [
  reference('battery', 'fs-rules', l('Formula Student 电气规则', 'Formula Student electrical rules'), l('从规则建立电池、电压与安全硬边界。', 'Build pack, voltage and safety boundaries from the rules.'), l('用于校核 600 V、80 kW、500 A、分段、AMS、AIR 与预充。', 'Use it to check the 600 V, 80 kW, 500 A, segmentation, AMS, AIR and pre-charge boundaries.'), [l('TS 任意两电气连接间通常不超过 600 VDC；规则列明的低功率内部信号例外需单独核对。', 'The TS is normally limited to 600 VDC between any two electrical connections; listed low-power internal-signal exceptions require separate review.'), l('Segment 不超过 120 VDC、6 MJ、12 kg。', 'A segment is limited to 120 VDC, 6 MJ and 12 kg.'), l('第二 AIR 闭合前母线须至少达到实际包电压 95%。', 'The DC link must reach at least 95% of actual pack voltage before the second AIR closes.')], l('FS Rules 2026 v1.1', 'FS Rules 2026 v1.1'), 'https://www.formulastudent.de/fileadmin/user_upload/all/2026/rules/FS-Rules_2026_v1.1.pdf'),
  reference('battery', 'p45b', l('Molicel P45B 产品资料', 'Molicel P45B product data'), l('用代表性电芯练习读取真实产品资料。', 'Practise reading real product data for a representative cell.'), l('提取电压、容量、电流、阻抗与温度条件；不代表车辆实装。', 'Extract voltage, capacity, current, impedance and temperature conditions; it is not an installed-car claim.'), [l('标称 3.6 V、典型 4.5 Ah。', '3.6 V nominal and 4.5 Ah typical.'), l('电流能力必须连同温度、截止条件与数据表版本读取。', 'Current capability must be read with temperature, cut-off conditions and datasheet revision.'), l('阻抗必须注明 SOC、温度与测量方法。', 'Impedance requires SOC, temperature and measurement-method context.')], l('Molicel official product page', 'Molicel official product page'), 'https://www.molicel.com/product/inr-21700-p45b/'),
  reference('battery', 'nrel-thermal', l('NREL 电池热管理', 'NREL battery thermal management'), l('把损耗、温度均匀性与寿命联系起来。', 'Connect loss, temperature uniformity and life.'), l('用于设计热点、温差和冷却验证，而不是只看平均温度。', 'Use it to design hot-spot, gradient and cooling validation rather than average temperature only.'), [l('温度影响功率、寿命与安全。', 'Temperature affects power, life and safety.'), l('模组热点不能由平均温度代替。', 'A module hot spot cannot be replaced by average temperature.'), l('热模型必须由电芯/模组试验校准。', 'Thermal models require cell/module test correlation.')], l('NREL research record', 'NREL research record'), 'https://research-hub.nrel.gov/en/publications/electric-vehicle-battery-thermal-issues-and-thermal-management-te'),
]

const inverterReferences: InteractionReferenceCard[] = [
    reference('inverter', 'amk-kit', l('AMK 学生赛车驱动套件', 'AMK student racing drive kit'), l('阅读真实四象限逆变器与电机资料。', 'Read real four-quadrant inverter and motor documentation.'), l('用于建立扭矩/速度控制、回收、CAN 与温度降额边界。', 'Use it to establish torque/speed control, regen, CAN and thermal derating boundaries.'), [l('PM 同步电机与配套逆变器。', 'PM synchronous motors with matching inverters.'), l('支持转矩/速度控制和回收。', 'Supports torque/speed control and regeneration.'), l('温度、过欠压与转速均需监控。', 'Temperature, over/undervoltage and speed need monitoring.')], l('AMK official documentation', 'AMK official documentation'), 'https://www.amk-motion.com/amk-dokucd/dokucd/en/content/projekt/doku-cd_html5/topics/amk_automotive.htm'),
  reference('inverter', 'infineon-traction', l('Infineon 牵引逆变器', 'Infineon traction inverter'), l('从功率级到反馈理解完整信号链。', 'Understand the full chain from power stage to feedback.'), l('用于拆解功率模块、栅驱、DC-link、电流/位置反馈与冷板。', 'Use it to decompose modules, gate drives, DC link, current/position feedback and cold plate.'), [l('导通与开关损耗分开计算。', 'Separate conduction and switching loss.'), l('相电流和转子位置是闭环核心。', 'Phase current and rotor position are central feedback.'), l('器件、母排、布局与冷却共同决定性能。', 'Devices, busbar, layout and cooling jointly set performance.')], l('Infineon application page', 'Infineon application page'), 'https://www.infineon.com/application/automotive-traction-inverter'),
  reference('inverter', 'aurix-safety', l('AURIX 电机控制安全', 'AURIX motor-control safety'), l('理解 PWM、ADC 与快速关断为何跨软硬件。', 'Understand why PWM, ADC and fast shutdown span hardware and software.'), l('用于设计同步采样、过流硬件路径和受控安全状态。', 'Use it to design synchronized sampling, hardware overcurrent paths and controlled safe states.'), [l('PWM 与 ADC 需同步。', 'PWM and ADC need synchronization.'), l('短路保护需要快速硬件路径。', 'Short-circuit protection needs a fast hardware path.'), l('反馈故障必须进入定义好的安全态。', 'Feedback faults must enter a defined safe state.')], l('Infineon functional-safety documentation', 'Infineon functional-safety documentation'), 'https://documentation.infineon.com/aurixtc3xx/docs/nnc1745576047829'),
]

const motorReferences: InteractionReferenceCard[] = [
  reference('motor', 'amk-motor', l('AMK PM 同步电机', 'AMK PM synchronous motor'), l('观察额定/峰值、弱磁、转速与冷却的真实关联。', 'Observe real rating, field-weakening, speed and cooling relationships.'), l('用于定义学生车代表性电机的包络，而不是把额定值当规则值。', 'Use it to define a representative student-motor envelope, not a rules limit.'), [l('永磁同步电机。', 'Permanent-magnet synchronous motor.'), l('支持弱磁和四象限运行。', 'Supports field weakening and four-quadrant operation.'), l('最高 20,000 rpm 是该套件边界。', '20,000 rpm is a limit of this kit.')], l('AMK product documentation', 'AMK product documentation'), 'https://doku.amk-motion.com/en/Subsystems/PDK_205481_KW26-S5-FSE-4Q_en/Content/Projekt/Automotive/FSE/PDK_205481_KW26-S5-FSE-4Q/Produkuebersicht/Produktbeschreibung.htm'),
  reference('motor', 'fia-ers-k', l('FIA 2026 ERS-K 边界', 'FIA 2026 ERS-K limits'), l('约束 GP 电机实验的公开功率与扭矩。', 'Constrain GP motor experiments to public power and torque limits.'), l('用于区分直流功率、曲轴参考扭矩与站立起步状态。', 'Use it to separate DC power, crank-referenced torque and standing-start state.'), [l('绝对直流功率最大 350 kW。', 'Absolute DC power is limited to 350 kW.'), l('机械扭矩最大 500 N·m，折算到曲轴速度。', 'Mechanical torque is limited to 500 N·m referenced to crankshaft speed.'), l('站立起步正扭矩通常受 50 km/h 条件约束；FIA SECU 最小加速例外需单独处理。', 'Positive standing-start torque is normally constrained by the 50 km/h condition; the FIA-SECU minimum-acceleration carve-out must be handled separately.')], l('FIA 2026 Section C', 'FIA 2026 Section C'), 'https://www.fia.com/system/files/documents/fia_2026_f1_regulations_-_section_c_technical_-_iss_19_-_2026-06-25.pdf'),
  reference('motor', 'yasa-axial', l('YASA 轴向磁通概览', 'YASA axial-flux overview'), l('比较轴向与径向磁通封装。', 'Compare axial- and radial-flux packaging.'), l('用于讲解转矩密度、轴向长度与热路径，不推断 F1 实装供应商。', 'Use it to explain torque density, axial length and thermal path without inferring an F1 supplier.'), [l('盘式轴向磁通几何。', 'Disc-shaped axial-flux geometry.'), l('短轴向长度与高转矩密度。', 'Short axial length and high torque density.'), l('热与机械约束仍需验证。', 'Thermal and mechanical constraints still require validation.')], l('YASA technology overview', 'YASA technology overview'), 'https://yasa.com/'),
]

const differentialReferences: InteractionReferenceCard[] = [
  reference('differential', 'fia-diff', l('FIA 2026 差速器规则', 'FIA 2026 differential rules'), l('防止把后桥差速器画成违规主动增扭。', 'Prevent the rear differential from becoming prohibited active vectoring.'), l('用于约束轮间转矩方向和前桥传递。', 'Use it to constrain inter-wheel torque direction and front-axle transfer.'), [l('不得从慢轮向快轮转移/分流转矩。', 'Torque may not be transferred/diverted from the slower to the faster wheel.'), l('前轮轴之间不得传递转矩。', 'No torque may pass between front-wheel axes.'), l('差速器控制属于传动系统合规范围。', 'Differential control remains in the driveline compliance scope.')], l('FIA 2026 Section C', 'FIA 2026 Section C'), 'https://www.fia.com/system/files/documents/fia_2026_f1_regulations_-_section_c_technical_-_iss_19_-_2026-06-25.pdf'),
  reference('differential', 'fs-driveline', l('Formula Student 传动规则', 'Formula Student driveline rules'), l('把学生差速器放回整车传动与制动安全。', 'Place the student differential in full-vehicle driveline and braking safety.'), l('用于检查防护、制动失效与课程架构声明。', 'Use it to check guarding, braking failure and architecture claims.'), [l('旋转传动件需要防护。', 'Rotating driveline parts require guarding.'), l('机械液压制动路径必须保持。', 'The mechanical hydraulic brake path must remain.'), l('单电机机械差速器只是可选架构之一。', 'A single motor with mechanical differential is only one valid architecture.')], l('FS Rules 2026 v1.1', 'FS Rules 2026 v1.1'), 'https://www.formulastudent.de/fileadmin/user_upload/all/2026/rules/FS-Rules_2026_v1.1.pdf'),
  reference('differential', 'fia-e-glossary', l('FIA LSD 术语对照', 'FIA LSD terminology'), l('区分机械 LSD 与主动 LSD 概念。', 'Distinguish mechanical and active LSD concepts.'), l('仅作另一 FIA 类别的术语对照，不把其权限移植到 F1。', 'Use only as terminology from another FIA category; do not import permissions into F1.'), [l('机械与主动 LSD 定义不同。', 'Mechanical and active LSD definitions differ.'), l('控制权限取决于类别规则。', 'Control permission depends on category rules.'), l('相似名称不代表相同合法功能。', 'Similar names do not imply identical legal functions.')], l('FIA Formula E technical regulations', 'FIA Formula E technical regulations'), 'https://api.fia.com/system/files/documents/2026-2027_season_13_formula_e_techregs_wmsc_10.06.2025_eng_fr_v9.pdf'),
]

const ecuReferences: InteractionReferenceCard[] = [
  reference('ecu', 'fia-secu', l('FIA 标准 ECU 技术规范', 'FIA Standard ECU specification'), l('认识 GP 标准 ECU 的节点、应用与治理。', 'Understand GP standard-ECU nodes, applications and governance.'), l('用于建立 Master ECU、驾驶界面、节点、记录、遥测与版本链。', 'Use it to model the Master ECU, driver interface, nodes, logging, telemetry and version chain.'), [l('覆盖混动动力单元、变速箱、离合器与差速器。', 'Covers hybrid PU, gearbox, clutch and differential.'), l('传感节点通过 CAN 汇聚。', 'Sensor nodes aggregate over CAN.'), l('配置、白名单、哈希与日志受控。', 'Configurations, whitelists, hashes and logs are controlled.')], l('FIA Standard ECU tender appendix', 'FIA Standard ECU tender appendix'), 'https://legal.fia.com/web/appeloffre.nsf/2A59DE0C92F81BE5C12587E6004401A6/%24FILE/Appendix1_TechnicalSpecifications.pdf?openelement='),
  reference('ecu', 'bosch-ms78', l('Bosch MS 7.8 手册', 'Bosch MS 7.8 manual'), l('用现行赛车 ECU 手册学习资源预算。', 'Learn resource budgeting from a current motorsport ECU manual.'), l('用于检查 CPU 负载、项目配置、记录与复位风险。', 'Use it to inspect CPU load, project configuration, logging and reset risks.'), [l('建议平均 CPU 负载不高于约 85%。', 'Recommended average CPU load is about 85% maximum.'), l('过载会影响控制、记录或复位。', 'Overload can affect control, logging or reset.'), l('固件和数据版本必须受控。', 'Firmware and data versions must be controlled.')], l('Bosch Motorsport operation manual', 'Bosch Motorsport operation manual'), 'https://www.bosch-motorsport.com/content/downloads/Raceparts/Resources/pdf/Operation%20Manual_328258699_Engine_Control_Unit_MS_7.8.pdf'),
  reference('ecu', 'bosch-ms504', l('Bosch VCU MS 50.4', 'Bosch VCU MS 50.4'), l('对照真实 VCU 的 I/O 与高速记录能力。', 'Compare real VCU I/O and high-speed logging capability.'), l('用于规划 CAN、模拟/PWM I/O、XCP 与记录带宽。', 'Use it to plan CAN, analogue/PWM I/O, XCP and logging bandwidth.'), [l('4 路 CAN。', 'Four CAN buses.'), l('丰富模拟与 PWM I/O。', 'Rich analogue and PWM I/O.'), l('6 个模拟通道可达 200 kHz 记录。', 'Six analogue channels support logging up to 200 kHz.')], l('Bosch Motorsport product page', 'Bosch Motorsport product page'), 'https://www.bosch-motorsport.com/products/control/vehicle-control-units/vehicle-control-unit-ms-50-4/'),
]

const sensorReferences: InteractionReferenceCard[] = [
  reference('sensors', 'bosch-c80', l('Bosch C 80 数据记录器', 'Bosch C 80 data logger'), l('认识同步多通道采集与带宽。', 'Understand synchronized multichannel acquisition and bandwidth.'), l('用于规划 ADC、CAN/Ethernet、通道数、频率和存储。', 'Use it to plan ADC, CAN/Ethernet, channel count, rate and storage.'), [l('26 模拟 + 4 数字输入。', '26 analogue plus 4 digital inputs.'), l('10 kHz、12-bit ADC。', '10 kHz, 12-bit ADC.'), l('通道同步与记录配置同样重要。', 'Channel synchronization and logging configuration are equally important.')], l('Bosch Motorsport C 80', 'Bosch Motorsport C 80'), 'https://www.bosch-motorsport.com/products/electronics/data-loggers/data-logger-and-sensor-interface-c-80/'),
  reference('sensors', 'bosch-yrs3', l('Bosch YRS 3 IMU', 'Bosch YRS 3 IMU'), l('从数据表读取量程、滤波与安装方向。', 'Read range, filtering and mounting orientation from a datasheet.'), l('用于建立坐标变换、带宽和 CAN 量程的具体型号案例。', 'Use it as a concrete example for coordinate transform, bandwidth and CAN range.'), [l('横摆量程 ±160°/s。', 'Yaw range is ±160°/s.'), l('加速度量程 ±4.1 g。', 'Acceleration range is ±4.1 g.'), l('15 Hz 低通与 1 Mbaud CAN 仅适用于该型号。', 'The 15 Hz low pass and 1 Mbaud CAN apply only to this model.')], l('Bosch YRS 3 datasheet', 'Bosch YRS 3 datasheet'), 'https://www.bosch-motorsport.com/media/downloads/yaw_rate_sensor_yrs_3.pdf'),
  reference('sensors', 'bosch-speed-current', l('Bosch 速度与电流传感器', 'Bosch speed and current sensors'), l('比较频率式与模拟式测量链。', 'Compare frequency and analogue measurement chains.'), l('用于理解气隙、频率、量程、带宽与传递系数。', 'Use it to understand air gap, frequency, range, bandwidth and transfer coefficient.'), [l('IS-C 最大 15 kHz、气隙约 0.8±0.3 mm。', 'IS-C is rated to 15 kHz with about 0.8±0.3 mm air gap.'), l('CS 240 为 0–240 A。', 'CS 240 covers 0–240 A.'), l('不同信号链不能共用同一滤波标定。', 'Different signal chains cannot share one filter calibration.')], l('Bosch IS-C and CS 240 datasheets', 'Bosch IS-C and CS 240 datasheets'), 'https://www.bosch-motorsport.com/contact-and-service/our-services/downloads-and-archive/'),
]

const batteryFaults = (gp: boolean): InteractionFaultCard[] => [
  fault('battery', 'weak-cell', l('单体塌压', 'Weak-cell collapse'), gp ? l('部署 260 kW 时一只单体 0.8 s 内降至 2.76 V，而同串其余单体保持 3.38–3.44 V；驾驶员感到出弯突然降扭。', 'At 260 kW deployment one cell falls to 2.76 V in 0.8 s while peers remain at 3.38–3.44 V; the driver feels abrupt exit derating.') : l('55% SOC、230 A 加速时一只单体降至 2.67 V，其余保持 3.42–3.48 V；驾驶员感到有电却突然没力。', 'At 55% SOC and 230 A, one cell falls to 2.67 V while peers remain at 3.42–3.48 V; the car abruptly loses drive.'), l('立即降功率，比较静置电压、脉冲内阻、温升与采样线；必要时隔离模组。', 'Derate immediately; compare rest voltage, pulse resistance, temperature rise and sense wiring, then isolate the module if required.'), l('串联支路由最低端电压电芯限制，压降差近似随 I·ΔR 增长。', 'A series string is limited by its lowest terminal-voltage cell, with sag difference approximately scaling with I·ΔR.'), l('四线测量、容量测试和热像一致；维修后受控脉冲的单体离散恢复。', 'Four-wire measurement, capacity test and thermal image agree; controlled-pulse spread recovers after repair.')),
  fault('battery', 'soc-drift', l('SOC 漂移', 'SOC drift'), gp ? l('单圈后能量积分与 SOC 观测器相差 0.18 MJ，零电流仍读 +1.1 A；后几圈可用部署越来越少。', 'After a lap the energy integral and SOC observer differ by 0.18 MJ and zero current reads +1.1 A; usable deployment falls each lap.') : l('90 分钟后库仑计显示 28%，静置电压与充入能量反算约 35%；零电流仍读 +0.42 A。', 'After 90 minutes coulomb counting shows 28% while rested voltage and recharge energy indicate about 35%; zero current reads +0.42 A.'), l('核对零点、方向、量程与时间同步，重放电流日志并用独立能量基准校正。', 'Check zero, direction, range and time alignment; replay current logs and correlate with an independent energy reference.'), l('很小的电流偏置经时间积分会产生显著 SOC 误差。', 'A small current offset integrates into a significant SOC error.'), l('已知能量循环中估算误差满足阈值，重启/静置校正无跳变。', 'Estimated error meets the target in a known-energy cycle and restart/rest correction remains continuous throughout.')),
  fault('battery', 'precharge-timeout', l('预充超时', 'Pre-charge timeout'), gp ? l('800 V 教学母线在 1.0 s 后仅达 73%，预充电阻温升异常且接触器反复尝试。', 'The 800 V teaching DC link reaches only 73% after 1.0 s, with abnormal resistor heating and repeated contactor attempts.') : l('400 V、2.2 mF、100 Ω 回路在 1.5 s 后仅达 74%；驾驶员只听见反复“咔哒”，R2D 不亮。', 'A 400 V, 2.2 mF, 100 Ω circuit reaches only 74% after 1.5 s; repeated clicks occur and R2D stays off.'), l('禁止重复闭合；放电确认安全后检查电阻、泄漏、辅助触点和分压采样。', 'Stop repeated closing; discharge safely, then inspect the resistor, leakage, auxiliary contacts and divider sensing.'), l('预充服从 RC 指数曲线；只看时间而不看电压比例会漏检。', 'Pre-charge follows an RC exponential; checking time without voltage ratio misses faults.'), l('单次曲线符合 RC 包络，达到规定比例后才闭合主接触器，放电也合规。', 'A single curve follows the RC envelope, the main contactor closes only after the required ratio, and discharge is compliant.')),
]

const inverterFaults = (gp: boolean): InteractionFaultCard[] => [
  fault('inverter', 'shoot-through', l('桥臂直通险情', 'Shoot-through near miss'), gp ? l('800 V 教学母线、22 kHz 热态关断离散增至 0.72 µs，0.55 µs 死区令门极短暂重叠并触发 DESAT。', 'On the 800 V teaching bus at 22 kHz, hot turn-off spread reaches 0.72 µs and a 0.55 µs dead time produces overlap and DESAT.') : l('400 V、16 kHz 热态关断离散超过标定死区，门极短暂重叠；驾驶员听到尖锐声后驱动立刻消失。', 'At 400 V and 16 kHz, hot turn-off spread exceeds calibrated dead time, gates overlap briefly and drive disappears.'), l('锁止高压并保存门极/电流/故障记录；检查栅阻、传播延迟、米勒钳位和硬件关断。', 'Lock out HV and preserve gate/current/fault traces; inspect gate resistance, delay, Miller clamp and hardware shutdown.'), l('上下管同时导通近似短接 DC-link，保护速度必须快于软件周期。', 'Simultaneous high/low conduction nearly shorts the DC link, requiring protection faster than software loops.'), l('双脉冲测试覆盖温度与器件离散，最坏条件仍有死区裕度且关断在 SOA 内。', 'Double-pulse testing covers temperature and device spread, retaining margin and safe shutdown within SOA.')),
  fault('inverter', 'regen-overvoltage', l('回收过压', 'Regeneration overvoltage'), gp ? l('回收 190 kW 时 ES 限充降至 80 kW，母线从 780 V 升至 925 V，18 ms 后削减负扭矩。', 'At 190 kW regen the ES charge limit falls to 80 kW and the bus rises from 780 V to 925 V before negative torque is cut after 18 ms.') : l('电池接近满电时请求 55 kW 回收，只能接收 18 kW，母线快速升高并造成制动力突降。', 'Near full charge, 55 kW regen is requested but only 18 kW is accepted, raising bus voltage and abruptly reducing braking.'), l('核对限充消息、接触器、Vdc 采样和制动协调；液压制动平顺补足。', 'Check the charge-limit message, contactors, Vdc sensing and brake blending; smoothly fill with hydraulic braking.'), l('功率失配先充入有限 DC-link 电容，电压按能量平方关系上升。', 'Power mismatch first charges the finite DC-link capacitor, raising voltage through the squared-energy relation.'), l('HIL 注入限充/断联时 Vdc 不越界，总制动力连续且功率方向一致。', 'Under HIL charge-limit/disconnect injection Vdc stays bounded, total braking remains continuous and power signs agree.')),
  fault('inverter', 'local-hotspot', l('单桥臂热点', 'Local bridge hot spot'), gp ? l('三相约 420 A RMS，但 B 相上桥臂结温估算 164 °C，其他器件 124–132 °C；壳体看起来正常。', 'All phases are near 420 A RMS, yet phase-B high-side junction is estimated at 164 °C while others are 124–132 °C; the case looks normal.') : l('三相约 185 A RMS，但 B 相上桥臂 154 °C，其他器件 118–124 °C；半圈后反复降额。', 'All phases are near 185 A RMS, yet phase-B high side reaches 154 °C while others stay at 118–124 °C; derating repeats after half a lap.'), l('比较导通压降、电流校准与局部热阻，检查冷板、导热界面、焊层和夹紧。', 'Compare on-state drop, current calibration and local thermal resistance; inspect cold plate, interface, solder and clamping.'), l('局部热阻升高抬高结温，器件电阻再随温度升高形成正反馈。', 'Higher local thermal resistance raises junction temperature, and device resistance then adds positive feedback.'), l('热瞬态与模型吻合；维修后六开关温差和降额时间恢复基线。', 'Thermal transients match the model; switch spread and derating time return to baseline after repair.')),
]

const motorFaults = (gp: boolean): InteractionFaultCard[] => [
  fault('motor', 'position-offset', l('位置零位偏移', 'Position offset'), gp ? l('电角零位偏移 5.2°，260 N·m 命令在 238–274 N·m 摆动，相电流 RMS 增加 9%。', 'An electrical-angle offset of 5.2° makes a 260 N·m command oscillate from 238 to 274 N·m and raises RMS current by 9%.') : l('电角零位偏移 7°，60 N·m 命令在 54–64 N·m 摆动；匀速时像被轻推又拉回。', 'A 7° electrical offset makes a 60 N·m command oscillate between 54 and 64 N·m; cruise feels like repeated light pushes.'), l('降载核对键位、极对数、旋向与零位；用锁转/反电势法复核，不以滤波掩盖。', 'Reduce load, check keying, pole pairs, direction and zero; verify by locked-rotor/back-EMF methods rather than hiding it with filtering.'), l('位置误差混合 d/q 轴电流，降低转矩/安培并产生周期纹波。', 'Position error mixes d/q currents, reducing torque per ampere and creating periodic ripple.'), l('多转速双向台架中零位一致，纹波与无功电流恢复。', 'Zero remains consistent across bidirectional speed tests, with ripple and reactive current restored.')),
  fault('motor', 'weakening-margin', l('弱磁裕度不足', 'Insufficient field weakening'), gp ? l('高转速时教学母线降至 690 V，调制饱和 99%，请求 300 N·m 只能交付 224 N·m。', 'At high speed the teaching bus sags to 690 V, modulation reaches 99%, and a 300 N·m request delivers only 224 N·m.') : l('18,500 rpm 时母线降至 342 V，调制饱和 99%，38 N·m 请求只能交付 29 N·m。', 'At 18,500 rpm the bus sags to 342 V, modulation reaches 99%, and a 38 N·m request delivers only 29 N·m.'), l('检查 Vdc 下陷、磁链/电感地图、最大负 Id、调制与转速标定；禁止用超电流补偿电压不足。', 'Check Vdc sag, flux/inductance maps, negative-Id limit, modulation and speed calibration; do not overcurrent a voltage limit.'), l('反电势随速度与磁链增长，弱磁以更高电流换取电压裕度。', 'Back EMF rises with speed and flux; field weakening trades more current for voltage margin.'), l('低/高 Vdc、冷/热态转矩—转速包络连续，限幅切换无积分饱和。', 'Torque-speed envelopes remain continuous at low/high Vdc and cold/hot conditions without integrator windup.')),
  fault('motor', 'hidden-winding-heat', l('隐藏绕组热点', 'Hidden winding hot spot'), gp ? l('连续 75 s 后估算绕组 188 °C，壳体仅 96 °C，一相热态电阻明显偏高。', 'After 75 s the winding estimate reaches 188 °C while the case is only 96 °C, with one phase showing high hot resistance.') : l('连续 70 s 后绕组估算 176 °C，壳体仅 82 °C；外壳不算烫却频繁降扭。', 'After 70 s the winding estimate reaches 176 °C while the case is only 82 °C; the case feels moderate but derating repeats.'), l('结合相电阻温度法、内部传感器与热模型，检查流量、浸渍和局部短路。', 'Combine phase-resistance thermometry, internal sensing and thermal model; inspect flow, impregnation and local shorts.'), l('绕组与壳体由热阻/热容隔开，壳体响应显著滞后。', 'Thermal resistance and capacitance separate winding and case, causing substantial case lag.'), l('热台架模型误差合格，修复后相电阻对称且降额不提前。', 'Thermal-rig model error is acceptable; phase resistance is symmetric and derating no longer early.')),
]

const differentialFaults = (gp: boolean): InteractionFaultCard[] => [
  fault('differential', 'inside-spin', l('出弯内轮空转', 'Inside-wheel spin'), gp ? l('发卡出弯内后轮滑移 16%，外轮仍有附着余量；驾驶员听见内胎尖叫却缺少推进。', 'At hairpin exit the inner rear slips 16% while the outer retains grip; the driver hears tyre squeal without matching drive.') : l('内后轮载荷 310 N、轮速高出车速推算 18%，外轮仍有余量；尖叫但不前进。', 'The inner rear carries 310 N and spins 18% above vehicle speed while the outer has margin; it squeals without propulsion.'), l('先核对轮速/轮径与载荷转移，再逐级调整 power 锁止、预紧、悬架和转矩斜率。', 'Verify wheel speed/radius and load transfer, then adjust power lock, preload, suspension and torque ramp stepwise.'), l('低附着内轮限制可用转矩；LSD 只能在摩擦容量与规则内建立转矩差。', 'The low-grip inside wheel limits usable torque; an LSD builds torque difference only within friction capacity and rules.'), l('同弯同胎温下内轮滑移下降、外轮不过载、出口力提高且横摆可接受。', 'At matched corner/tyre temperature, inside slip falls, the outer stays below limit, exit force rises and yaw remains acceptable.')),
  fault('differential', 'coast-understeer', l('减速锁止过强', 'Excess coast lock'), gp ? l('入弯所需后轮轮速差 6.4%，实测仅 1.9%，方向盘额外增加 7° 才维持线路。', 'Entry requires 6.4% rear-wheel speed difference but only 1.9% is measured, requiring 7° more steering.') : l('入弯所需轮速差 7.2%，实测仅 2.1%，方向盘额外增加 9°；收油后整车向外推。', 'Entry requires 7.2% wheel-speed difference but only 2.1% is measured, requiring 9° more steering and pushing wide off-throttle.'), l('分离 coast 锁止、制动平衡、回收负扭矩与轮胎状态，逐级降低并重复测试。', 'Separate coast lock, brake balance, regen torque and tyre state; reduce stepwise and repeat the test.'), l('过度锁止抑制几何轮速差，后轮纵向擦滑改变横摆。', 'Excess locking suppresses geometric wheel-speed difference, and rear longitudinal scrub changes yaw.'), l('轮速差接近几何需求，转向/横摆改善且制动稳定仍合格。', 'Wheel-speed difference approaches geometric demand, steering/yaw improve and braking stability remains acceptable.')),
  fault('differential', 'mesh-damage', l('齿隙或轴承损伤', 'Backlash or bearing damage'), gp ? l('转矩反转产生 0.21 g 冲击并出现随 37 齿主齿轮锁定的阶次峰，油样铁颗粒增加。', 'Torque reversal produces a 0.21 g impact and a 37-tooth mesh-order peak, with rising ferrous debris.') : l('6,200 rpm 时出现约 3.82 kHz 啮合峰和 0.18 g 反转冲击；先咔嗒后持续啸叫。', 'At 6,200 rpm a roughly 3.82 kHz mesh peak and 0.18 g reversal impact appear; a clunk becomes a continuous whine.'), l('停止高负荷，按总成步骤检查油液、齿隙、接触斑点、预载与壳体。', 'Stop high load and inspect oil, backlash, contact pattern, preload and housing using the assembly procedure.'), l('啮合频率随转速阶次锁定，反转冲击与齿隙相关，轴承有独立特征频率。', 'Mesh frequency locks to speed order, reversal impact relates to backlash, and bearings have separate characteristic frequencies.'), l('修复后公差/接触斑点合格，阶次峰和冲击回基线，油样不再恶化。', 'After repair, tolerances/contact pattern pass, order peaks and impacts return to baseline, and oil debris stops worsening.')),
]

const ecuFaults = (gp: boolean): InteractionFaultCard[] => [
  fault('ecu', 'cpu-reset', l('CPU 峰值过载', 'CPU burst overload'), gp ? l('平均 CPU 74%，但日志压缩与错误中断叠加时 0.5 ms 任务连续超时并触发 watchdog。', 'Average CPU is 74%, but coincident log compression and error interrupts make a 0.5 ms task miss repeatedly and trigger the watchdog.') : l('平均 CPU 72%，但日志与 CAN 中断同相时 1 ms 扭矩任务三次在 1.7 ms 完成并复位。', 'Average CPU is 72%, but aligned logging and CAN interrupts make a 1 ms torque task finish at 1.7 ms three times and reset.'), l('冻结版本并抓取任务/中断轨迹，降低非关键日志优先级、拆分不可抢占段并检查复位安全输出。', 'Freeze the version and capture task/interrupt traces; lower non-critical logging priority, split non-pre-emptible work and verify reset-safe outputs.'), l('deadline 由最坏响应而非平均利用率决定。', 'Deadlines are determined by worst-case response, not average utilisation.'), l('中断风暴与满日志压力下无关键超时；复位时扭矩归零且原因可追溯。', 'No critical miss under interrupt/log stress; torque goes safe on reset and the cause is traceable.')),
  fault('ecu', 'stale-limit', l('陈旧限值', 'Stale limit'), gp ? l('总线 92% 利用率使 ES 限功报文年龄达 38 ms，CU-K 继续使用旧值。', 'At 92% utilisation the ES power-limit message reaches 38 ms age and the CU-K continues using an old value.') : l('总线从 58% 升至 91%，电池限功报文年龄 74 ms（要求 <20 ms）；故障只在全量记录时出现。', 'Bus load rises from 58% to 91%, ageing the battery limit to 74 ms against a <20 ms target; it appears only with full logging.'), l('检查 ID、周期、错误帧和事件流量；给安全限值设置 age/timeout 与保守默认值。', 'Check IDs, periods, error frames and event traffic; apply age/timeout and a conservative default to safety limits.'), l('报文最终到达不代表控制时刻仍有效。', 'Eventual frame arrival does not make the data valid at the control instant.'), l('总线压力与故障注入下 age 不越界，超时进入保守限值且时间戳一致。', 'Age stays bounded under bus stress/fault injection, timeout selects the conservative value and timestamps agree.')),
  fault('ecu', 'plausibility-conflict', l('踏板安全冲突', 'Pedal safety conflict'), gp ? l('双踏板通道相差 9%，主 ECU 与轮侧节点时间戳又相差 22 ms，扭矩请求被锁止为安全状态。', 'Pedal channels differ by 9% and Master ECU/node timestamps differ by 22 ms, locking the torque request safe.') : l('硬制动时电机仍输出 8.4 kW 持续 620 ms，APPS 两通道相差 13%；驾驶员感到刹车时车仍向前拱。', 'Under hard braking the motor still outputs 8.4 kW for 620 ms and APPS channels differ by 13%; the car pushes against braking.'), gp ? l('核对输入校准、节点同步、范围/相关性/超时和安全状态机，保留 FIA 标准系统边界。', 'Check input calibration, node synchronization, range/correlation/timeout and safe-state logic within the FIA standard system.') : l('BSPD 独立打开 SDC，VCU 命令 0 N·m 并锁存；分别测试 APPS、压力与功率检测。', 'The independent BSPD opens SDC, the VCU commands 0 N·m and latches; test APPS, pressure and power detection separately.'), gp ? l('合理性必须同时覆盖数值与时间一致性，不得通过增加被禁止的驾驶辅助处理。', 'Plausibility covers value and time consistency and must not be solved by adding prohibited driver aids.') : l('BSPD 对硬制动 + ≥5 kW 持续 >500 ms 独立判断，软件不是唯一防线。', 'The BSPD independently detects hard braking plus ≥5 kW for >500 ms; software is not the sole barrier.'), l('故障注入下独立安全路径仍动作，恢复需人工确认且机械制动保持。', 'The independent safety path still operates under fault injection, recovery needs deliberate confirmation and mechanical braking remains.')),
]

const sensorFaults = (gp: boolean): InteractionFaultCard[] => [
  fault('sensors', 'wheel-dropout', l('轮速丢脉冲', 'Wheel-speed dropout'), gp ? l('左后气隙增至 1.15 mm，低速每圈平均丢 2 个脉冲；数据曲线偶尔向下跳。', 'Left-rear air gap grows to 1.15 mm and loses two pulses per revolution at low speed; the trace steps downward intermittently.') : l('左后气隙从 0.8 增至 1.35 mm，180 rpm 时每圈丢 3 个脉冲；制动协调轻微抽动。', 'Left-rear air gap grows from 0.8 to 1.35 mm and loses three pulses per revolution at 180 rpm; brake coordination twitches.'), l('检查轴承、支架、齿圈偏心、气隙和屏蔽；先看原始幅值，不以插值掩盖。', 'Inspect bearing, bracket, target runout, air gap and shielding; inspect raw amplitude before interpolation.'), l('低速与大气隙降低感应幅值，越过阈值时丢脉冲。', 'Low speed and large air gap reduce inductive amplitude until pulses fall below threshold.'), l('全转速/热态/振动下脉冲裕度合格，直线左右轮速残差恢复。', 'Pulse margin passes across speed, thermal and vibration conditions, and straight-line wheel-speed residual recovers.')),
  fault('sensors', 'ground-offset', l('压力地线偏移', 'Pressure ground offset'), gp ? l('传感器地相对节点地抬高 42 mV，零压力仍显示 0.06 bar，随泵电流变化。', 'Sensor ground rises 42 mV above node ground, showing 0.06 bar at zero and varying with pump current.') : l('5 V 参考为 5.01 V，但传感器地抬高 78 mV，零点多出 0.11 bar；简单清零后仍漂移。', 'The 5-V reference is 5.01 V but sensor ground rises 78 mV, adding 0.11 bar at zero; a simple zero reset still drifts.'), l('同时测 Vref、signal、sensor ground 与 ECU ground，检查接地、屏蔽与连接器压降再标定。', 'Measure Vref, signal, sensor ground and ECU ground together; inspect grounding, shielding and connector drop before calibration.'), l('比例式测量抵消共同参考漂移，但不能消除独立地线压降。', 'Ratiometric measurement cancels common reference drift but not independent ground drop.'), l('不同电气负载下零点稳定，机械基准与全量程误差合格且开短路诊断有效。', 'Zero remains stable across electrical loads, full-scale error passes against a mechanical reference, and open/short diagnostics work.')),
  fault('sensors', 'imu-sync', l('IMU 轴向与同步', 'IMU axis and sync'), gp ? l('IMU 倾斜 1.4° 且 yaw 比轮速晚 11 ms，4.2 g 制动产生约 0.10 g 假横向量。', 'The IMU is tilted 1.4° and yaw lags wheel speed by 11 ms; 4.2 g braking produces about 0.10 g false lateral acceleration.') : l('IMU 俯仰误差 2.3°、yaw 比轮速晚 24 ms；2.6 g 制动产生约 0.10 g 假横向量。', 'The IMU has 2.3° pitch error and yaw lags wheel speed by 24 ms; 2.6 g braking creates about 0.10 g false lateral acceleration.'), l('用重力/转台校坐标，统一时钟与时间戳，检查网关延迟并重放直线制动。', 'Calibrate axes with gravity/turntable, unify clocks/timestamps, inspect gateway delay and replay straight braking.'), l('安装误差造成轴间投影，时间错位破坏快速瞬态的物理一致性。', 'Mounting error projects between axes, while time skew breaks physical consistency during fast transients.'), l('六姿态、转台和直线动态测试通过；对齐后 yaw/轮速/转向残差进入置信区间。', 'Six-position, turntable and straight dynamic tests pass; aligned yaw/wheel/steering residuals enter the confidence band.')),
]

const pack = (
  partId: PowerElectronicsPartId,
  theme: string,
  experiments: (gp: boolean) => InteractionExperiment[],
  referenceCards: InteractionReferenceCard[],
  faults: (gp: boolean) => InteractionFaultCard[],
): PartInteractionPack => ({
  partId,
  theme,
  experimentsFor: vehicleId => experiments(vehicleId === 'grand-prix-2026'),
  referenceCards,
  faultCardsFor: vehicleId => faults(vehicleId === 'grand-prix-2026'),
})

export const powerElectronicsInteractionPacks: Record<PowerElectronicsPartId, PartInteractionPack> = {
  battery: pack('battery', '#ff625b', batteryExperiments, batteryReferences, batteryFaults),
  inverter: pack('inverter', '#ff765f', inverterExperiments, inverterReferences, inverterFaults),
  motor: pack('motor', '#ff9a64', motorExperiments, motorReferences, motorFaults),
  differential: pack('differential', '#ffb45d', differentialExperiments, differentialReferences, differentialFaults),
  ecu: pack('ecu', '#a887ff', ecuExperiments, ecuReferences, ecuFaults),
  sensors: pack('sensors', '#8d9cff', sensorExperiments, sensorReferences, sensorFaults),
}

export const getPowerElectronicsInteractionPack = (partId: PartId): PartInteractionPack | undefined =>
  partId in powerElectronicsInteractionPacks ? powerElectronicsInteractionPacks[partId as PowerElectronicsPartId] : undefined
