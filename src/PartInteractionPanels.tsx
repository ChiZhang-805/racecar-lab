import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { ArrowLeftRight, ExternalLink, FileChartColumn, FlaskConical, RotateCcw, SlidersHorizontal } from 'lucide-react'
import type { PartId } from './data'
import { localise } from './engineeringData'
import { getPart, type Locale } from './i18n'
import {
  initialInteractionValues,
  type InteractionDiagramMode,
  type InteractionFaultCard,
  type InteractionMetric,
  type InteractionReferenceCard,
  type InteractionResult,
  type PartInteractionPack,
} from './interactionTypes'
import type { VehicleId } from './vehicles'

const ui = {
  zh: {
    experiments: '工程实验', parameters: '实验参数', results: '实时测量', reset: '复位当前实验',
    flip: '翻转卡片', back: '返回正面', purpose: '工程用途', details: '技术细节',
    strategy: '解决策略', principle: '背后原理', evidence: '确认修复',
    engineerCards: '工程资料卡', faultCards: '故障情境卡', diagram: '交互工程图',
  },
  en: {
    experiments: 'Engineering experiments', parameters: 'Experiment inputs', results: 'Live measurements', reset: 'Reset this experiment',
    flip: 'Flip card', back: 'Return to front', purpose: 'Engineering use', details: 'Technical details',
    strategy: 'Resolution strategy', principle: 'Underlying principle', evidence: 'Repair evidence',
    engineerCards: 'Engineering reference cards', faultCards: 'Fault scenario cards', diagram: 'Interactive engineering diagram',
  },
} as const

const chartPoints = (points: { x: number; y: number }[], width = 620, height = 238, pad = 36) => {
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

function CurveDiagram({ result, label }: { result: InteractionResult; label: string }) {
  return <svg viewBox="0 0 620 238" role="img" aria-label={label}>
    <g className="interaction-grid">{[0, 1, 2, 3, 4].map(index => <line key={index} x1="36" x2="584" y1={34 + index * 42} y2={34 + index * 42} />)}</g>
    {result.secondaryPoints?.length ? <polyline className="interaction-line is-secondary" points={chartPoints(result.secondaryPoints)} /> : null}
    <polyline className="interaction-line" points={chartPoints(result.points)} />
    <line className="interaction-marker" x1={36 + (result.visual.marker ?? .5) * 548} x2={36 + (result.visual.marker ?? .5) * 548} y1="28" y2="204" />
  </svg>
}

function FlowDiagram({ result, locale, label }: { result: InteractionResult; locale: Locale; label: string }) {
  const labels = result.visual.labels.slice(0, 4)
  const values = result.visual.values
  return <svg viewBox="0 0 640 250" role="img" aria-label={label}>
    <defs><linearGradient id="interaction-flow-gradient" x1="0" x2="1"><stop offset="0" stopColor="#54dcfa" /><stop offset="1" stopColor="#73e8c3" /></linearGradient></defs>
    <path className="interaction-flow-base" d="M82 126 H558" />
    <path className="interaction-flow-active" style={{ strokeWidth: 4 + (values[0] ?? .5) * 9, opacity: .38 + (1 - (result.visual.risk ?? 0)) * .62 }} d="M82 126 H558" />
    {labels.map((item, index) => {
      const x = 82 + index * 158.5
      const value = values[index] ?? .5
      return <g key={index} className={value < .25 ? 'is-danger' : ''} transform={`translate(${x - 38} 88)`}>
        <circle cx="38" cy="38" r={27 + value * 8} />
        <circle className="interaction-node-core" cx="38" cy="38" r={7 + value * 8} />
        <text x="38" y="92" textAnchor="middle">{localise(item, locale)}</text>
      </g>
    })}
  </svg>
}

function DistributionDiagram({ result, locale, label }: { result: InteractionResult; locale: Locale; label: string }) {
  return <svg viewBox="0 0 640 250" role="img" aria-label={label}>
    <line className="interaction-axis" x1="48" x2="604" y1="206" y2="206" />
    {result.visual.labels.slice(0, 5).map((item, index) => {
      const value = Math.max(0, Math.min(1, result.visual.values[index] ?? 0))
      const width = 78
      const gap = 29
      const x = 58 + index * (width + gap)
      const height = 24 + value * 142
      return <g key={index} transform={`translate(${x} 0)`}>
        <rect className="interaction-bar-track" x="0" y="38" width={width} height="168" rx="5" />
        <rect className="interaction-bar" x="0" y={206 - height} width={width} height={height} rx="5" />
        <text x={width / 2} y="230" textAnchor="middle">{localise(item, locale)}</text>
      </g>
    })}
  </svg>
}

function GeometryDiagram({ result, locale, label }: { result: InteractionResult; locale: Locale; label: string }) {
  const values = result.visual.values
  const left = 112 + (values[0] ?? .5) * 35
  const right = 528 - (values[1] ?? .5) * 35
  const upper = 55 + (1 - (values[2] ?? .5)) * 28
  const lower = 195 - (1 - (values[3] ?? .5)) * 28
  return <svg viewBox="0 0 640 250" role="img" aria-label={label}>
    <path className="interaction-geometry-link" d={`M${left} ${lower} L270 130 L${left} ${upper} M${right} ${lower} L370 130 L${right} ${upper} M270 130 H370`} />
    <rect className="interaction-geometry-body" x="270" y="91" width="100" height="78" rx="13" />
    {[{ x: left, y: upper }, { x: left, y: lower }, { x: right, y: upper }, { x: right, y: lower }].map((node, index) => <g key={index}>
      <circle className="interaction-geometry-node" cx={node.x} cy={node.y} r="22" />
      <text x={node.x} y={node.y + (index < 2 ? -31 : 39)} textAnchor="middle">{result.visual.labels[index] ? localise(result.visual.labels[index]!, locale) : ''}</text>
    </g>)}
    <path className="interaction-direction" style={{ opacity: .3 + Math.abs(result.visual.direction ?? 0) * .7 }} d={(result.visual.direction ?? 0) >= 0 ? 'M286 55 H354 L344 45 M354 55 L344 65' : 'M354 55 H286 L296 45 M286 55 L296 65'} />
  </svg>
}

function FieldDiagram({ result, locale, label }: { result: InteractionResult; locale: Locale; label: string }) {
  const values = result.visual.values
  return <svg viewBox="0 0 640 250" role="img" aria-label={label}>
    <defs><radialGradient id="interaction-field-hot"><stop offset="0" stopColor="#ffbc68" stopOpacity=".92" /><stop offset="1" stopColor="#ff665e" stopOpacity=".06" /></radialGradient></defs>
    {result.visual.labels.slice(0, 5).map((item, index) => {
      const angle = -Math.PI / 2 + index * Math.PI * 2 / Math.min(5, result.visual.labels.length)
      const x = 320 + Math.cos(angle) * 145
      const y = 126 + Math.sin(angle) * 78
      const value = values[index] ?? .5
      return <g key={index}>
        <circle className="interaction-field-halo" cx={x} cy={y} r={25 + value * 34} style={{ opacity: .18 + value * .68 }} />
        <circle className="interaction-field-node" cx={x} cy={y} r={14 + value * 8} />
        <line className="interaction-field-link" x1="320" y1="126" x2={x} y2={y} />
        <text x={x} y={y + 43} textAnchor="middle">{localise(item, locale)}</text>
      </g>
    })}
    <circle className="interaction-field-center" cx="320" cy="126" r={34 + (result.visual.risk ?? .2) * 18} />
  </svg>
}

function TimelineDiagram({ result, label }: { result: InteractionResult; label: string }) {
  return <svg viewBox="0 0 620 238" role="img" aria-label={label}>
    <rect className="interaction-timeline-zone" x="36" y="30" width="274" height="174" />
    <rect className="interaction-timeline-zone is-secondary" x="310" y="30" width="274" height="174" />
    <g className="interaction-grid">{[0, 1, 2, 3, 4].map(index => <line key={index} x1="36" x2="584" y1={36 + index * 40} y2={36 + index * 40} />)}</g>
    {result.secondaryPoints?.length ? <polyline className="interaction-line is-secondary" points={chartPoints(result.secondaryPoints)} /> : null}
    <polyline className="interaction-line" points={chartPoints(result.points)} />
  </svg>
}

function ExperimentDiagram({ mode, locale, result }: { mode: InteractionDiagramMode; locale: Locale; result: InteractionResult }) {
  const label = ui[locale].diagram
  if (mode === 'flow') return <FlowDiagram result={result} locale={locale} label={label} />
  if (mode === 'distribution') return <DistributionDiagram result={result} locale={locale} label={label} />
  if (mode === 'geometry') return <GeometryDiagram result={result} locale={locale} label={label} />
  if (mode === 'field') return <FieldDiagram result={result} locale={locale} label={label} />
  if (mode === 'timeline') return <TimelineDiagram result={result} label={label} />
  return <CurveDiagram result={result} label={label} />
}

function MetricTile({ locale, metric }: { locale: Locale; metric: InteractionMetric }) {
  return <article className={`cooling-metric is-${metric.tone ?? 'normal'}`} data-metric-id={metric.id}>
    <span>{localise(metric.label, locale)}</span>
    <strong>{Number.isFinite(metric.value) ? metric.value.toLocaleString(undefined, { maximumFractionDigits: Math.abs(metric.value) < 1 ? 3 : 1 }) : '—'}<small>{metric.unit}</small></strong>
  </article>
}

export function PartObserveLab({ locale, vehicleId, partId, pack }: { locale: Locale; vehicleId: VehicleId; partId: Exclude<PartId, 'cooling'>; pack: PartInteractionPack }) {
  const u = ui[locale]
  const part = getPart(partId, locale, vehicleId)
  const experiments = useMemo(() => pack.experimentsFor(vehicleId), [pack, vehicleId])
  const [selected, setSelected] = useState(0)
  const experiment = experiments[selected] ?? experiments[0]!
  const [values, setValues] = useState<Record<string, number>>(() => initialInteractionValues(experiment))
  useEffect(() => { setSelected(0); setValues(initialInteractionValues(experiments[0]!)) }, [experiments])
  useEffect(() => setValues(initialInteractionValues(experiment)), [experiment])
  const result = useMemo(() => experiment.evaluate(values), [experiment, values])
  return <div className="cooling-observe part-interaction-observe" data-testid="part-observe" data-part-id={partId} style={{ '--interaction-accent': pack.theme } as CSSProperties}>
    <aside className="cooling-experiment-list">
      <span><FlaskConical size={17} />{part.name} · {u.experiments}</span>
      {experiments.map((item, index) => <button key={item.id} data-experiment-id={item.id} className={selected === index ? 'is-active' : ''} aria-pressed={selected === index} onClick={() => setSelected(index)}><i>{String(index + 1).padStart(2, '0')}</i><strong>{localise(item.title, locale)}</strong></button>)}
    </aside>
    <section className="cooling-lab-console">
      <header><span>{localise(experiment.question, locale)}</span></header>
      <div className="cooling-lab-stage interaction-lab-stage" data-diagram-mode={experiment.mode}><ExperimentDiagram mode={experiment.mode} locale={locale} result={result} /></div>
      <aside className="cooling-lab-inputs"><div><span><SlidersHorizontal size={16} />{u.parameters}</span><button onClick={() => setValues(initialInteractionValues(experiment))} aria-label={u.reset} title={u.reset}><RotateCcw size={16} /></button></div>
        {experiment.parameters.map(parameter => {
          const value = values[parameter.key] ?? parameter.initial
          return <label key={parameter.key}><span>{localise(parameter.label, locale)}<output>{value.toLocaleString()} <small>{parameter.unit}</small></output></span><input aria-label={localise(parameter.label, locale)} type="range" min={parameter.min} max={parameter.max} step={parameter.step} value={value} onChange={event => setValues(current => ({ ...current, [parameter.key]: Number(event.target.value) }))} /></label>
        })}
      </aside>
      <section className="cooling-lab-results" aria-live="polite"><span><FileChartColumn size={16} />{u.results}</span><div>{result.metrics.map(metric => <MetricTile key={metric.id} locale={locale} metric={metric} />)}</div></section>
    </section>
  </div>
}

function ReferenceCard({ locale, card, index }: { locale: Locale; card: InteractionReferenceCard; index: number }) {
  const u = ui[locale]
  const [flipped, setFlipped] = useState(false)
  const frontRef = useRef<HTMLButtonElement>(null)
  const returnRef = useRef<HTMLButtonElement>(null)
  const showBack = () => {
    setFlipped(true)
    requestAnimationFrame(() => returnRef.current?.focus())
  }
  const showFront = () => {
    setFlipped(false)
    requestAnimationFrame(() => frontRef.current?.focus())
  }
  return <article className={`cooling-flip-card ${flipped ? 'is-flipped' : ''}`} data-resource-card-id={card.id} data-flipped={flipped}>
    <div className="cooling-flip-card__inner">
      <button ref={frontRef} className="cooling-flip-card__face cooling-flip-card__front" onClick={showBack} aria-expanded={flipped} aria-hidden={flipped} tabIndex={flipped ? -1 : 0}>
        <img src={card.image} alt={localise(card.imageAlt, locale)} loading="eager" decoding="async" fetchPriority="high" />
        <div><i>{String(index + 1).padStart(2, '0')}</i><h3>{localise(card.title, locale)}</h3><p>{localise(card.summary, locale)}</p><span><ArrowLeftRight size={16} />{u.flip}</span></div>
      </button>
      <section className="cooling-flip-card__face cooling-flip-card__back" aria-hidden={!flipped}>
        <button ref={returnRef} className="cooling-flip-card__return" onClick={showFront} aria-label={u.back} title={u.back} tabIndex={flipped ? 0 : -1}><ArrowLeftRight size={18} /></button>
        <h3>{localise(card.title, locale)}</h3><strong>{u.purpose}</strong><p>{localise(card.purpose, locale)}</p><strong>{u.details}</strong><ul>{card.details.map((detail, detailIndex) => <li key={detailIndex}>{localise(detail, locale)}</li>)}</ul>
        <a href={card.url} target="_blank" rel="noopener noreferrer" tabIndex={flipped ? 0 : -1}>{localise(card.sourceTitle, locale)}<ExternalLink size={15} /></a>
      </section>
    </div>
  </article>
}

export function PartReferenceCards({ locale, pack }: { locale: Locale; pack: PartInteractionPack }) {
  return <section className="cooling-card-page" aria-label={ui[locale].engineerCards}><div className="cooling-card-grid">{pack.referenceCards.map((card, index) => <ReferenceCard key={card.id} locale={locale} card={card} index={index} />)}</div></section>
}

function FaultCard({ locale, card, index }: { locale: Locale; card: InteractionFaultCard; index: number }) {
  const u = ui[locale]
  const [flipped, setFlipped] = useState(false)
  const frontRef = useRef<HTMLButtonElement>(null)
  const returnRef = useRef<HTMLButtonElement>(null)
  const showBack = () => {
    setFlipped(true)
    requestAnimationFrame(() => returnRef.current?.focus())
  }
  const showFront = () => {
    setFlipped(false)
    requestAnimationFrame(() => frontRef.current?.focus())
  }
  return <article className={`cooling-flip-card cooling-fault-card ${flipped ? 'is-flipped' : ''}`} data-fault-card-id={card.id} data-flipped={flipped}>
    <div className="cooling-flip-card__inner">
      <button ref={frontRef} className="cooling-flip-card__face cooling-flip-card__front" onClick={showBack} aria-expanded={flipped} aria-hidden={flipped} tabIndex={flipped ? -1 : 0}>
        <img src={card.image} alt={localise(card.imageAlt, locale)} loading="eager" decoding="async" fetchPriority="high" />
        <div><i>{String(index + 1).padStart(2, '0')}</i><h3>{localise(card.title, locale)}</h3><p>{localise(card.scenario, locale)}</p><span><ArrowLeftRight size={16} />{u.flip}</span></div>
      </button>
      <section className="cooling-flip-card__face cooling-flip-card__back" aria-hidden={!flipped}>
        <button ref={returnRef} className="cooling-flip-card__return" onClick={showFront} aria-label={u.back} title={u.back} tabIndex={flipped ? 0 : -1}><ArrowLeftRight size={18} /></button>
        <h3>{localise(card.title, locale)}</h3><strong>{u.strategy}</strong><p>{localise(card.strategy, locale)}</p><strong>{u.principle}</strong><p>{localise(card.principle, locale)}</p><strong>{u.evidence}</strong><p>{localise(card.evidence, locale)}</p>
      </section>
    </div>
  </article>
}

export function PartFaultCards({ locale, vehicleId, pack }: { locale: Locale; vehicleId: VehicleId; pack: PartInteractionPack }) {
  const cards = useMemo(() => pack.faultCardsFor(vehicleId), [pack, vehicleId])
  return <section className="cooling-card-page" aria-label={ui[locale].faultCards}><div className="cooling-card-grid">{cards.map((card, index) => <FaultCard key={card.id} locale={locale} card={card} index={index} />)}</div></section>
}
