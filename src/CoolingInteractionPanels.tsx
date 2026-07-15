import { useEffect, useMemo, useState } from 'react'
import { ArrowLeftRight, Droplets, ExternalLink, Fan, FileChartColumn, Gauge, RotateCcw, SlidersHorizontal, ThermometerSun } from 'lucide-react'
import { localise } from './engineeringData'
import type { Locale } from './i18n'
import type { VehicleId } from './vehicles'
import {
  coolingExperimentsFor,
  coolingFaultCardsFor,
  coolingReferenceCards,
  evaluateCoolingExperiment,
  initialCoolingValues,
  type CoolingDiagramMode,
  type CoolingExperimentResult,
  type CoolingMetric,
} from './coolingInteractions'

const text = {
  zh: {
    experiments: '冷却实验', parameters: '实验参数', results: '实时测量', reset: '复位当前实验',
    flip: '翻转卡片', back: '返回正面', source: '打开资料', purpose: '工程用途', details: '技术细节',
    strategy: '解决策略', principle: '背后原理', evidence: '确认修复',
    diagram: '冷却系统交互图', heatSource: '热源', pump: '泵', radiator: '散热器', reservoir: '除气罐', ambient: '环境',
    battery: '储能', electronics: '功率电子', motor: '电机 / MGU-K', pumpCurve: '泵曲线', systemCurve: '系统曲线',
    highLoad: '高负荷', recovery: '恢复段', engineerCards: '工程资料卡', faultCards: '故障情境卡',
  },
  en: {
    experiments: 'Cooling experiments', parameters: 'Experiment inputs', results: 'Live measurements', reset: 'Reset this experiment',
    flip: 'Flip card', back: 'Return to front', source: 'Open source', purpose: 'Engineering use', details: 'Technical details',
    strategy: 'Resolution strategy', principle: 'Underlying principle', evidence: 'Repair evidence',
    diagram: 'Interactive cooling-system diagram', heatSource: 'Heat source', pump: 'Pump', radiator: 'Radiator', reservoir: 'Deaeration tank', ambient: 'Ambient',
    battery: 'Energy store', electronics: 'Power electronics', motor: 'Motor / MGU-K', pumpCurve: 'Pump curve', systemCurve: 'System curve',
    highLoad: 'High load', recovery: 'Recovery', engineerCards: 'Engineering reference cards', faultCards: 'Fault scenario cards',
  },
} as const

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
const chartPoints = (points: { x: number; y: number }[], width = 580, height = 220, pad = 30) => {
  if (!points.length) return ''
  const minX = Math.min(...points.map(point => point.x))
  const maxX = Math.max(...points.map(point => point.x))
  const minY = Math.min(...points.map(point => point.y))
  const maxY = Math.max(...points.map(point => point.y))
  return points.map(point => {
    const x = pad + (point.x - minX) / Math.max(1e-9, maxX - minX) * (width - pad * 2)
    const y = height - pad - (point.y - minY) / Math.max(1e-9, maxY - minY) * (height - pad * 2)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
}

function LoopDiagram({ locale, result }: { locale: Locale; result: CoolingExperimentResult }) {
  const u = text[locale]
  const flow = 4 + result.visual.coolant * 8
  const hot = clamp((result.visual.hot - 25) / 110, 0, 1)
  return (
    <svg viewBox="0 0 640 260" role="img" aria-label={u.diagram}>
      <defs>
        <linearGradient id="cooling-hot-line" x1="0" x2="1"><stop offset="0" stopColor="#ff8b64" /><stop offset="1" stopColor="#ffcf6a" /></linearGradient>
        <linearGradient id="cooling-cold-line" x1="0" x2="1"><stop offset="0" stopColor="#50dcf7" /><stop offset="1" stopColor="#75e7c5" /></linearGradient>
      </defs>
      <path className="cooling-diagram__pipe" d="M120 72 H482 Q536 72 536 124 V164 Q536 202 492 202 H146 Q92 202 92 156 V116 Q92 72 120 72" />
      <path className="cooling-diagram__flow is-hot" style={{ strokeWidth: flow, opacity: .42 + hot * .58 }} d="M130 72 H482 Q536 72 536 124" />
      <path className="cooling-diagram__flow is-cold" style={{ strokeWidth: flow }} d="M536 156 Q536 202 492 202 H146 Q92 202 92 156" />
      <g transform="translate(55 84)"><rect width="92" height="72" rx="8" /><ThermometerSun x="32" y="11" size={28} /><text x="46" y="59" textAnchor="middle">{u.heatSource}</text></g>
      <g transform="translate(270 42)"><circle cx="46" cy="46" r="40" /><Gauge x="32" y="31" size={28} /><text x="46" y="101" textAnchor="middle">{u.pump}</text></g>
      <g transform="translate(478 86)"><rect width="104" height="76" rx="6" /><path d="M10 16 H94 M10 28 H94 M10 40 H94 M10 52 H94" /><text x="52" y="95" textAnchor="middle">{u.radiator}</text></g>
      <g transform="translate(268 172)"><path d="M22 0 H70 L80 40 H12 Z" /><Droplets x="34" y="8" size={24} /><text x="46" y="60" textAnchor="middle">{u.reservoir}</text></g>
      <g className="cooling-diagram__air" style={{ opacity: .25 + result.visual.airflow * .75 }}><path d="M590 92 H625 M590 116 H625 M590 140 H625" /><Fan x="602" y="157" size={25} /><text x="612" y="205" textAnchor="middle">{u.ambient}</text></g>
    </svg>
  )
}

function PumpMap({ locale, result }: { locale: Locale; result: CoolingExperimentResult }) {
  const u = text[locale]
  const pump = result.visual.pumpCurve ?? []
  const system = result.visual.systemCurve ?? []
  const maxX = Math.max(...pump.map(point => point.x), 1)
  const maxY = Math.max(...pump.map(point => point.y), ...system.map(point => point.y), 1)
  const wp = result.visual.workingPoint
  const wpX = wp ? 30 + wp.x / maxX * 520 : 30
  const wpY = wp ? 190 - wp.y / maxY * 160 : 190
  return (
    <svg viewBox="0 0 580 220" role="img" aria-label={u.diagram}>
      <g className="cooling-chart-grid">{[0, 1, 2, 3, 4].map(index => <line key={index} x1="30" x2="550" y1={30 + index * 40} y2={30 + index * 40} />)}</g>
      <polyline className="cooling-chart-line is-pump" points={chartPoints(pump, 580, 220)} />
      <polyline className="cooling-chart-line is-system" points={chartPoints(system, 580, 220)} />
      {wp && <g className="cooling-working-point"><circle cx={wpX} cy={wpY} r="9" /><circle cx={wpX} cy={wpY} r="3" /></g>}
      <g className="cooling-chart-legend"><text x="36" y="18">{u.pumpCurve}</text><text x="176" y="18">{u.systemCurve}</text></g>
    </svg>
  )
}

function RadiatorDiagram({ locale, result }: { locale: Locale; result: CoolingExperimentResult }) {
  const u = text[locale]
  const blockage = result.visual.blockage ?? 0
  const airOpacity = .2 + result.visual.airflow * .8
  return (
    <svg viewBox="0 0 640 260" role="img" aria-label={u.diagram}>
      <g className="cooling-radiator-air" style={{ opacity: airOpacity }}>
        {[0, 1, 2, 3, 4].map(index => <path key={index} d={`M26 ${56 + index * 34} C120 ${48 + index * 34}, 170 ${64 + index * 34}, 258 ${56 + index * 34}`} />)}
      </g>
      <g className="cooling-radiator-core" transform="translate(260 30)">
        <rect width="176" height="198" rx="6" />
        {Array.from({ length: 11 }, (_, index) => <line key={index} x1={10 + index * 15.5} x2={10 + index * 15.5} y1="10" y2="188" />)}
        {Array.from({ length: 8 }, (_, index) => <line key={index} x1="8" x2="168" y1={18 + index * 23} y2={18 + index * 23} />)}
        <rect className="cooling-radiator-core__blocked" width={176 * blockage} height="198" rx="6" />
      </g>
      <g className="cooling-radiator-out" style={{ opacity: airOpacity * (1 - blockage * .55) }}>
        {[0, 1, 2, 3, 4].map(index => <path key={index} d={`M442 ${56 + index * 34} C500 ${48 + index * 34}, 548 ${64 + index * 34}, 614 ${56 + index * 34}`} />)}
      </g>
      <text x="348" y="250" textAnchor="middle">{u.radiator}</text>
    </svg>
  )
}

function BranchDiagram({ locale, result }: { locale: Locale; result: CoolingExperimentResult }) {
  const u = text[locale]
  const branches = result.visual.branches ?? [1, 1, 1]
  const labels = [u.battery, u.electronics, u.motor]
  return (
    <svg viewBox="0 0 640 260" role="img" aria-label={u.diagram}>
      <path className="cooling-diagram__pipe" d="M56 130 H154 M486 130 H590" />
      <g transform="translate(28 94)"><circle cx="36" cy="36" r="32" /><Gauge x="23" y="23" size={26} /><text x="36" y="82" textAnchor="middle">{u.pump}</text></g>
      {branches.map((flow, index) => {
        const y = 52 + index * 78
        const danger = flow < .42
        return <g key={labels[index]} className={danger ? 'is-danger' : ''}>
          <path className="cooling-diagram__pipe" d={`M154 130 C190 130 186 ${y} 226 ${y} H414 C454 ${y} 450 130 486 130`} />
          <path className="cooling-diagram__flow is-cold" style={{ strokeWidth: 4 + flow * 9, opacity: .35 + flow * .65 }} d={`M154 130 C190 130 186 ${y} 226 ${y} H414 C454 ${y} 450 130 486 130`} />
          <rect x="270" y={y - 23} width="100" height="46" rx="6" />
          <text x="320" y={y + 5} textAnchor="middle">{labels[index]}</text>
        </g>
      })}
      <g transform="translate(548 94)"><rect width="72" height="72" rx="5" /><text x="36" y="88" textAnchor="middle">{u.radiator}</text></g>
    </svg>
  )
}

function TimelineDiagram({ locale, result }: { locale: Locale; result: CoolingExperimentResult }) {
  const u = text[locale]
  const points = result.visual.timeline ?? []
  const polyline = chartPoints(points, 620, 240, 34)
  const split = points.length ? Math.round(points.length * .46) : 0
  return (
    <svg viewBox="0 0 620 240" role="img" aria-label={u.diagram}>
      <rect className="cooling-timeline-zone is-load" x="34" y="28" width="250" height="176" />
      <rect className="cooling-timeline-zone" x="284" y="28" width="302" height="176" />
      <g className="cooling-chart-grid">{[0, 1, 2, 3, 4].map(index => <line key={index} x1="34" x2="586" y1={36 + index * 39} y2={36 + index * 39} />)}</g>
      <polyline className="cooling-chart-line is-temperature" points={polyline} />
      {points[split] && <circle className="cooling-timeline-marker" cx={34 + (points[split]!.x / 180) * 552} cy={204 - (points[split]!.y - Math.min(...points.map(point => point.y))) / Math.max(1, Math.max(...points.map(point => point.y)) - Math.min(...points.map(point => point.y))) * 168} r="6" />}
      <text x="152" y="224" textAnchor="middle">{u.highLoad}</text><text x="438" y="224" textAnchor="middle">{u.recovery}</text>
    </svg>
  )
}

function CoolingDiagram({ mode, locale, result }: { mode: CoolingDiagramMode; locale: Locale; result: CoolingExperimentResult }) {
  if (mode === 'pump-map') return <PumpMap locale={locale} result={result} />
  if (mode === 'radiator') return <RadiatorDiagram locale={locale} result={result} />
  if (mode === 'branches') return <BranchDiagram locale={locale} result={result} />
  if (mode === 'timeline') return <TimelineDiagram locale={locale} result={result} />
  return <LoopDiagram locale={locale} result={result} />
}

function CoolingMetricTile({ locale, metric }: { locale: Locale; metric: CoolingMetric }) {
  return (
    <article className={`cooling-metric is-${metric.tone ?? 'normal'}`} data-metric-id={metric.id}>
      <span>{localise(metric.label, locale)}</span>
      <strong>{Number.isFinite(metric.value) ? metric.value.toLocaleString(undefined, { maximumFractionDigits: metric.value < 1 ? 3 : 1 }) : '—'}<small>{metric.unit}</small></strong>
    </article>
  )
}

export function CoolingObserveLab({ locale, vehicleId }: { locale: Locale; vehicleId: VehicleId }) {
  const u = text[locale]
  const experiments = useMemo(() => coolingExperimentsFor(vehicleId), [vehicleId])
  const [selected, setSelected] = useState(0)
  const experiment = experiments[selected] ?? experiments[0]!
  const [values, setValues] = useState<Record<string, number>>(() => initialCoolingValues(experiment))
  useEffect(() => { setSelected(0); setValues(initialCoolingValues(experiments[0]!)) }, [experiments])
  useEffect(() => setValues(initialCoolingValues(experiment)), [experiment])
  const result = useMemo(() => evaluateCoolingExperiment(experiment, values, vehicleId), [experiment, values, vehicleId])
  return (
    <div className="cooling-observe" data-testid="cooling-observe">
      <aside className="cooling-experiment-list">
        <span><ThermometerSun size={17} />{u.experiments}</span>
        {experiments.map((item, index) => <button key={item.id} data-experiment-id={item.id} className={selected === index ? 'is-active' : ''} onClick={() => setSelected(index)}><i>{String(index + 1).padStart(2, '0')}</i><strong>{localise(item.title, locale)}</strong></button>)}
      </aside>
      <section className="cooling-lab-console">
        <header><span>{localise(experiment.question, locale)}</span></header>
        <div className="cooling-lab-stage" data-diagram-mode={experiment.mode}>
          <CoolingDiagram mode={experiment.mode} locale={locale} result={result} />
        </div>
        <aside className="cooling-lab-inputs">
          <div><span><SlidersHorizontal size={16} />{u.parameters}</span><button onClick={() => setValues(initialCoolingValues(experiment))} aria-label={u.reset} title={u.reset}><RotateCcw size={16} /></button></div>
          {experiment.parameters.map(item => {
            const value = values[item.key] ?? item.initial
            return <label key={item.key}><span>{localise(item.label, locale)}<output>{value.toLocaleString()} <small>{item.unit}</small></output></span><input aria-label={localise(item.label, locale)} type="range" min={item.min} max={item.max} step={item.step} value={value} onChange={event => setValues(current => ({ ...current, [item.key]: Number(event.target.value) }))} /></label>
          })}
        </aside>
        <section className="cooling-lab-results" aria-live="polite"><span><FileChartColumn size={16} />{u.results}</span><div>{result.metrics.map(item => <CoolingMetricTile key={item.id} locale={locale} metric={item} />)}</div></section>
      </section>
    </div>
  )
}

function ReferenceCard({ locale, index }: { locale: Locale; index: number }) {
  const card = coolingReferenceCards[index]!
  const u = text[locale]
  const [flipped, setFlipped] = useState(false)
  return (
    <article className={`cooling-flip-card ${flipped ? 'is-flipped' : ''}`} data-resource-card-id={card.id} data-flipped={flipped}>
      <div className="cooling-flip-card__inner">
        <button className="cooling-flip-card__face cooling-flip-card__front" onClick={() => setFlipped(true)} aria-expanded={flipped} aria-hidden={flipped} tabIndex={flipped ? -1 : 0}>
          <img src={card.image} alt={localise(card.imageAlt, locale)} />
          <div><i>{String(index + 1).padStart(2, '0')}</i><h3>{localise(card.title, locale)}</h3><p>{localise(card.summary, locale)}</p><span><ArrowLeftRight size={16} />{u.flip}</span></div>
        </button>
        <section className="cooling-flip-card__face cooling-flip-card__back" aria-hidden={!flipped}>
          <button className="cooling-flip-card__return" onClick={() => setFlipped(false)} aria-label={u.back} title={u.back} tabIndex={flipped ? 0 : -1}><ArrowLeftRight size={18} /></button>
          <h3>{localise(card.title, locale)}</h3>
          <strong>{u.purpose}</strong><p>{localise(card.purpose, locale)}</p>
          <strong>{u.details}</strong><ul>{card.details.map((item, detailIndex) => <li key={detailIndex}>{localise(item, locale)}</li>)}</ul>
          <a href={card.url} target="_blank" rel="noopener noreferrer" tabIndex={flipped ? 0 : -1}>{localise(card.sourceTitle, locale)}<ExternalLink size={15} /></a>
        </section>
      </div>
    </article>
  )
}

export function CoolingReferenceCards({ locale }: { locale: Locale }) {
  const u = text[locale]
  return <section className="cooling-card-page" aria-label={u.engineerCards}><div className="cooling-card-grid">{coolingReferenceCards.map((card, index) => <ReferenceCard key={card.id} locale={locale} index={index} />)}</div></section>
}

function FaultCard({ locale, vehicleId, index }: { locale: Locale; vehicleId: VehicleId; index: number }) {
  const cards = coolingFaultCardsFor(vehicleId)
  const card = cards[index]!
  const u = text[locale]
  const [flipped, setFlipped] = useState(false)
  return (
    <article className={`cooling-flip-card cooling-fault-card ${flipped ? 'is-flipped' : ''}`} data-fault-card-id={card.id} data-flipped={flipped}>
      <div className="cooling-flip-card__inner">
        <button className="cooling-flip-card__face cooling-flip-card__front" onClick={() => setFlipped(true)} aria-expanded={flipped} aria-hidden={flipped} tabIndex={flipped ? -1 : 0}>
          <img src={card.image} alt={localise(card.imageAlt, locale)} />
          <div><i>{String(index + 1).padStart(2, '0')}</i><h3>{localise(card.title, locale)}</h3><p>{localise(card.scenario, locale)}</p><span><ArrowLeftRight size={16} />{u.flip}</span></div>
        </button>
        <section className="cooling-flip-card__face cooling-flip-card__back" aria-hidden={!flipped}>
          <button className="cooling-flip-card__return" onClick={() => setFlipped(false)} aria-label={u.back} title={u.back} tabIndex={flipped ? 0 : -1}><ArrowLeftRight size={18} /></button>
          <h3>{localise(card.title, locale)}</h3>
          <strong>{u.strategy}</strong><p>{localise(card.strategy, locale)}</p>
          <strong>{u.principle}</strong><p>{localise(card.principle, locale)}</p>
          <strong>{u.evidence}</strong><p>{localise(card.evidence, locale)}</p>
        </section>
      </div>
    </article>
  )
}

export function CoolingFaultCards({ locale, vehicleId }: { locale: Locale; vehicleId: VehicleId }) {
  const u = text[locale]
  const cards = useMemo(() => coolingFaultCardsFor(vehicleId), [vehicleId])
  return <section className="cooling-card-page" aria-label={u.faultCards}><div className="cooling-card-grid">{cards.map((card, index) => <FaultCard key={card.id} locale={locale} vehicleId={vehicleId} index={index} />)}</div></section>
}
