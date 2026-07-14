import { useEffect, useMemo, useState } from 'react'
import katex from 'katex'
import 'katex/dist/katex.min.css'
import { AlertTriangle, ArrowRight, BookOpen, Calculator, Check, ChevronRight, CircleGauge, ExternalLink, FlaskConical, RotateCcw, SlidersHorizontal, Wrench, X } from 'lucide-react'
import { ENGINEERING_LESSONS, localise, type DiagnosticCase, type GuidedExperiment } from './engineeringData'
import { initialValues, LAB_MODELS, type LabOutput } from './engineeringSim'
import { copy, getPart, type Locale } from './i18n'
import { ComponentWorkshop } from './ComponentWorkshop'
import { FORMULA_EXAMPLES } from './formulaExamples'
import type { PartId } from './data'
import { useDialogFocus } from './useDialogFocus'
import type { VehicleId } from './vehicles'
import { GRAND_PRIX_ENGINEERING_LESSONS } from './grandPrixEngineeringData'
import { GRAND_PRIX_FORMULA_EXAMPLES } from './grandPrixFormulaExamples'
import { GRAND_PRIX_LAB_MODELS, grandPrixInitialValues } from './grandPrixEngineeringSim'

type Tab = 'intro' | 'principle' | 'observe' | 'engineering' | 'faults'
type TripleIndex = 0 | 1 | 2
type PairIndex = 0 | 1

const lessonFor = (partId: PartId, vehicleId: VehicleId) => vehicleId === 'grand-prix-2026' ? GRAND_PRIX_ENGINEERING_LESSONS[partId] : ENGINEERING_LESSONS[partId]
const examplesFor = (partId: PartId, vehicleId: VehicleId) => vehicleId === 'grand-prix-2026' ? GRAND_PRIX_FORMULA_EXAMPLES[partId] : FORMULA_EXAMPLES[partId]
const modelFor = (kind: import('./engineeringData').LabKind, vehicleId: VehicleId) => vehicleId === 'grand-prix-2026' ? GRAND_PRIX_LAB_MODELS[kind] : LAB_MODELS[kind]
const valuesFor = (kind: import('./engineeringData').LabKind, vehicleId: VehicleId) => vehicleId === 'grand-prix-2026' ? grandPrixInitialValues(kind) : initialValues(kind)

const ui = {
  zh: {
    definition: '工程定义', architecture: '结构组成', mentalModels: '三个关键认识', liveModel: '实时工程模型', inputs: '设计参数', results: '计算结果', curve: '响应曲线', formula: '核心公式', symbols: '变量与边界', scenario: '工程情境', calculation: '计算过程', answer: '计算结论', experiment: '引导实验', prediction: '先做预测', reveal: '查看工程结论', hide: '收起结论', steps: '操作步骤', decision: '设计取舍', validation: '验证计划', sources: '专业资料', source: '资料', symptom: '故障现象', checks: '诊断顺序', resolution: '根因与措施', revealResolution: '显示诊断结论', chooseCase: '选择故障案例', reset: '复位参数', modelNote: '教学模型用于理解趋势，实际设计必须用试验数据校准。', case: '案例', experimentIndex: '实验', completeStep: '完成此步', evidence: '应观察的证据', close: '关闭',
  },
  en: {
    definition: 'Engineering definition', architecture: 'System architecture', mentalModels: 'Three key mental models', liveModel: 'Live engineering model', inputs: 'Design inputs', results: 'Calculated results', curve: 'Response curve', formula: 'Core equations', symbols: 'Variables and limits', scenario: 'Engineering scenario', calculation: 'Calculation', answer: 'Engineering result', experiment: 'Guided experiment', prediction: 'Make a prediction', reveal: 'Reveal engineering result', hide: 'Hide result', steps: 'Procedure', decision: 'Design trade-offs', validation: 'Validation plan', sources: 'Professional references', source: 'Source', symptom: 'Fault symptom', checks: 'Diagnostic sequence', resolution: 'Root cause and action', revealResolution: 'Reveal diagnosis', chooseCase: 'Choose a fault case', reset: 'Reset inputs', modelNote: 'This learning model explains trends; real designs must be calibrated with test data.', case: 'Case', experimentIndex: 'Experiment', completeStep: 'Complete step', evidence: 'Evidence to observe', close: 'Close',
  },
} as const

function MiniChart({ output, locale }: { output: LabOutput; locale: Locale }) {
  const width = 620
  const height = 210
  const pad = { l: 44, r: 18, t: 18, b: 34 }
  const xs = output.points.map(point => point.x)
  const ys = output.points.map(point => point.y)
  const xmin = Math.min(...xs); const xmax = Math.max(...xs)
  const ymin = Math.min(...ys); const ymax = Math.max(...ys)
  const sx = (x: number) => pad.l + (x - xmin) / Math.max(1e-9, xmax - xmin) * (width - pad.l - pad.r)
  const sy = (y: number) => height - pad.b - (y - ymin) / Math.max(1e-9, ymax - ymin) * (height - pad.t - pad.b)
  const path = output.points.map((point, index) => `${index ? 'L' : 'M'} ${sx(point.x).toFixed(1)} ${sy(point.y).toFixed(1)}`).join(' ')
  const format = (value: number) => Math.abs(value) >= 1000 ? `${(value / 1000).toFixed(1)}k` : Math.abs(value) >= 100 ? value.toFixed(0) : value.toFixed(1)
  return (
    <div className="eng-chart">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${localise(output.xLabel, locale)} — ${localise(output.yLabel, locale)}`}>
        <defs><linearGradient id="curve-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#50d8ff" stopOpacity=".28" /><stop offset="1" stopColor="#50d8ff" stopOpacity="0" /></linearGradient></defs>
        {[0, .25, .5, .75, 1].map(step => <line key={step} x1={pad.l} x2={width - pad.r} y1={pad.t + step * (height - pad.t - pad.b)} y2={pad.t + step * (height - pad.t - pad.b)} className="eng-chart__grid" />)}
        <path d={`${path} L ${sx(xmax)} ${height - pad.b} L ${sx(xmin)} ${height - pad.b} Z`} fill="url(#curve-fill)" />
        <path d={path} className="eng-chart__line" />
        {output.points.filter((_, index) => index % 5 === 0).map((point, index) => <circle key={index} cx={sx(point.x)} cy={sy(point.y)} r="2.4" className="eng-chart__dot" />)}
        <text x={pad.l} y={height - 9} className="eng-chart__tick">{format(xmin)}</text><text x={width - pad.r} y={height - 9} textAnchor="end" className="eng-chart__tick">{format(xmax)}</text>
        <text x={pad.l - 8} y={pad.t + 5} textAnchor="end" className="eng-chart__tick">{format(ymax)}</text><text x={pad.l - 8} y={height - pad.b} textAnchor="end" className="eng-chart__tick">{format(ymin)}</text>
        <text x={(width + pad.l - pad.r) / 2} y={height - 7} textAnchor="middle" className="eng-chart__label">{localise(output.xLabel, locale)}</text>
      </svg>
      <div className="eng-chart__ylabel">{localise(output.yLabel, locale)}</div>
    </div>
  )
}

function Overview({ locale, vehicleId, partId }: { locale: Locale; vehicleId: VehicleId; partId: PartId }) {
  const lesson = lessonFor(partId, vehicleId)
  return <ComponentWorkshop vehicleId={vehicleId} partId={partId} locale={locale} lesson={lesson} />
}

function Principle({ locale, vehicleId, partId }: { locale: Locale; vehicleId: VehicleId; partId: PartId }) {
  const lesson = lessonFor(partId, vehicleId)
  const model = modelFor(lesson.labKind, vehicleId)
  const [values, setValues] = useState<Record<string, number>>(() => valuesFor(lesson.labKind, vehicleId))
  const [formulaIndex, setFormulaIndex] = useState<TripleIndex>(0)
  useEffect(() => { setValues(valuesFor(lesson.labKind, vehicleId)); setFormulaIndex(0) }, [lesson.labKind, partId, vehicleId])
  const output = useMemo(() => model.evaluate(values), [model, values])
  const u = ui[locale]
  const formula = lesson.formulas[formulaIndex]
  const workedExample = examplesFor(partId, vehicleId)[formulaIndex]
  const formulaHtml = useMemo(() => katex.renderToString(formula.latex, { displayMode: true, throwOnError: false, strict: false }), [formula.latex])
  return (
    <div className="eng-principle">
      <section className="eng-controls">
        <div className="eng-section-title"><span><SlidersHorizontal size={17} />{u.inputs}</span><button onClick={() => setValues(valuesFor(lesson.labKind, vehicleId))} title={u.reset}><RotateCcw size={15} /></button></div>
        <h3>{localise(model.title, locale)}</h3>
        {model.parameters.map(parameter => { const value = values[parameter.key] ?? parameter.initial; return <label className="eng-slider" key={parameter.key}><span><b>{localise(parameter.label, locale)}</b><output>{value.toLocaleString(locale === 'zh' ? 'zh-CN' : 'en-US')} <small>{parameter.unit}</small></output></span><input type="range" min={parameter.min} max={parameter.max} step={parameter.step} value={value} onChange={event => setValues(current => ({ ...current, [parameter.key]: Number(event.target.value) }))} /></label> })}
        <small className="eng-model-note">{u.modelNote}</small>
      </section>
      <section className="eng-model-output">
        <div className="eng-section-title"><span><CircleGauge size={17} />{u.results}</span></div>
        <div className="eng-metrics">{output.metrics.map((metric, index) => <article key={index} className={metric.tone ? `is-${metric.tone}` : ''}><span>{localise(metric.label, locale)}</span><strong>{Number.isFinite(metric.value) ? metric.value.toLocaleString(locale === 'zh' ? 'zh-CN' : 'en-US', { maximumFractionDigits: 2 }) : '—'}<small>{metric.unit}</small></strong></article>)}</div>
        <MiniChart output={output} locale={locale} />
        <p className="eng-insight">{localise(output.insight, locale)}</p>
      </section>
      <section className="eng-formulas">
        <div className="eng-section-title"><span><Calculator size={17} />{u.formula}</span><div className="eng-formula-dots">{lesson.formulas.map((item, index) => <button key={index} className={index === formulaIndex ? 'is-active' : ''} onClick={() => setFormulaIndex(index as TripleIndex)} aria-pressed={index === formulaIndex} aria-label={localise(item.name, locale)} title={localise(item.name, locale)}><span className="sr-only">{localise(item.name, locale)}</span></button>)}</div></div>
        <article key={`${partId}-${formulaIndex}-${locale}`} className="eng-formula-card">
          <span>{localise(formula.name, locale)}</span>
          <div className={`eng-formula-math ${formula.latex.length > 58 ? 'is-long' : ''}`} role="img" aria-label={formula.expression} dangerouslySetInnerHTML={{ __html: formulaHtml }} />
          <section className="eng-formula-boundary"><h4>{u.symbols}</h4><p>{localise(formula.variables, locale)}</p><p>{localise(formula.insight, locale)}</p></section>
          <section className="eng-worked-example">
            <h4>{u.scenario}</h4>
            <p>{localise(workedExample.scenario, locale)}</p>
            <h4>{u.calculation}</h4>
            <ol>{workedExample.steps.map((step, index) => <li key={index}>{localise(step, locale)}</li>)}</ol>
            <div className="eng-worked-result"><h4>{u.answer}</h4><p>{localise(workedExample.result, locale)}</p></div>
          </section>
        </article>
      </section>
    </div>
  )
}

function ExperimentCard({ locale, experiment }: { locale: Locale; experiment: GuidedExperiment }) {
  const [step, setStep] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const u = ui[locale]
  useEffect(() => { setStep(0); setRevealed(false) }, [experiment])
  return (
    <div className="eng-experiment-card">
      <div className="eng-experiment-question"><span>{u.prediction}</span><h3>{localise(experiment.question, locale)}</h3></div>
      <div className="eng-experiment-steps"><span className="eng-label">{u.steps}</span>{experiment.steps.map((item, index) => <button key={index} className={`${index < step ? 'is-done' : ''} ${index === step ? 'is-active' : ''}`} onClick={() => setStep(Math.min(experiment.steps.length, index + 1))}><i>{index < step ? <Check size={15} /> : index + 1}</i><span>{localise(item, locale)}</span>{index === step && <ChevronRight size={17} />}</button>)}</div>
      <div className={`eng-evidence ${revealed ? 'is-revealed' : ''}`}><span>{u.evidence}</span>{revealed ? <p>{localise(experiment.evidence, locale)}</p> : <div className="eng-evidence__mask" />}</div>
      <button className="eng-action" disabled={step < experiment.steps.length} onClick={() => setRevealed(value => !value)}>{revealed ? u.hide : u.reveal}<ArrowRight size={16} /></button>
    </div>
  )
}

function Observe({ locale, vehicleId, partId }: { locale: Locale; vehicleId: VehicleId; partId: PartId }) {
  const lesson = lessonFor(partId, vehicleId)
  const [selected, setSelected] = useState<PairIndex>(0)
  const u = ui[locale]
  useEffect(() => setSelected(0), [partId])
  return <div className="eng-observe"><aside><span className="eng-label"><FlaskConical size={16} />{u.experiment}</span>{lesson.experiments.map((experiment, index) => <button className={selected === index ? 'is-active' : ''} key={index} onClick={() => setSelected(index as PairIndex)}><i>{String(index + 1).padStart(2, '0')}</i><span><small>{u.experimentIndex}</small><strong>{localise(experiment.title, locale)}</strong></span><ChevronRight size={17} /></button>)}</aside><ExperimentCard locale={locale} experiment={lesson.experiments[selected]} /></div>
}

function Engineering({ locale, vehicleId, partId }: { locale: Locale; vehicleId: VehicleId; partId: PartId }) {
  const lesson = lessonFor(partId, vehicleId)
  const u = ui[locale]
  return <div className="eng-engineering"><section><span className="eng-label"><Wrench size={16} />{u.decision}</span><div className="eng-decision-list">{lesson.decisions.map((item, index) => <article key={index}><i>{String(index + 1).padStart(2, '0')}</i><p>{localise(item, locale)}</p></article>)}</div></section><section><span className="eng-label"><Check size={16} />{u.validation}</span><div className="eng-validation-list">{lesson.validation.map((item, index) => <article key={index}><i><Check size={16} /></i><p>{localise(item, locale)}</p></article>)}</div><div className="eng-references"><strong>{u.sources}</strong>{lesson.references.map((reference, index) => <a key={reference.url} href={reference.url} target="_blank" rel="noopener noreferrer" title={reference.title}>{u.source} {String(index + 1).padStart(2, '0')}<ExternalLink size={14} /></a>)}</div></section></div>
}

function Diagnostic({ locale, diagnostic }: { locale: Locale; diagnostic: DiagnosticCase }) {
  const [revealed, setRevealed] = useState(false)
  const u = ui[locale]
  useEffect(() => setRevealed(false), [diagnostic])
  return <section className="eng-diagnostic"><div className="eng-diagnostic__symptom"><span>{u.symptom}</span><p>{localise(diagnostic.symptom, locale)}</p></div><div className="eng-diagnostic__checks"><span>{u.checks}</span>{diagnostic.checks.map((item, index) => <div key={index}><i>{index + 1}</i><p>{localise(item, locale)}</p><ArrowRight size={15} /></div>)}</div><div className={`eng-diagnostic__resolution ${revealed ? 'is-revealed' : ''}`}><span>{u.resolution}</span>{revealed ? <p>{localise(diagnostic.resolution, locale)}</p> : <button onClick={() => setRevealed(true)}>{u.revealResolution}<ArrowRight size={16} /></button>}</div></section>
}

function Faults({ locale, vehicleId, partId }: { locale: Locale; vehicleId: VehicleId; partId: PartId }) {
  const lesson = lessonFor(partId, vehicleId)
  const [selected, setSelected] = useState<PairIndex>(0)
  const u = ui[locale]
  useEffect(() => setSelected(0), [partId])
  return <div className="eng-faults"><aside><span className="eng-label"><AlertTriangle size={16} />{u.chooseCase}</span>{lesson.diagnostics.map((item, index) => <button key={index} className={selected === index ? 'is-active' : ''} onClick={() => setSelected(index as PairIndex)}><i>{String(index + 1).padStart(2, '0')}</i><span><small>{u.case}</small><strong>{localise(item.title, locale)}</strong></span><ChevronRight size={17} /></button>)}</aside><Diagnostic locale={locale} diagnostic={lesson.diagnostics[selected]} /></div>
}

export default function EngineeringDetail({ vehicleId, locale, partId, onClose }: { vehicleId: VehicleId; locale: Locale; partId: PartId; onClose: () => void }) {
  const [tab, setTab] = useState<Tab>('intro')
  const c = copy[locale]
  const u = ui[locale]
  const part = getPart(partId, locale, vehicleId)
  const dialogRef = useDialogFocus<HTMLDivElement>()
  useEffect(() => setTab('intro'), [partId])
  const tabs: { id: Tab; label: string; icon: typeof BookOpen }[] = [
    { id: 'intro', label: c.detailIntro, icon: BookOpen }, { id: 'principle', label: c.detailPrinciple, icon: Calculator }, { id: 'observe', label: c.detailObserve, icon: FlaskConical }, { id: 'engineering', label: c.detailEngineering, icon: Wrench }, { id: 'faults', label: c.detailFaults, icon: AlertTriangle },
  ]
  return (
    <div className="overlay detail-overlay" role="dialog" aria-modal="true" aria-label={`${part.name} · ${c.deepDive}`}>
      <div className="overlay-backdrop" onClick={onClose} />
      <div className="detail-modal engineering-detail" ref={dialogRef} tabIndex={-1}>
        <header className="detail-header engineering-detail__header"><h2>{part.name}</h2><button className="settings-close" onClick={onClose} aria-label={u.close} title={u.close}><X size={22} /></button></header>
        <nav className="detail-tabs engineering-tabs">{tabs.map((item) => { const Icon = item.icon; return <button key={item.id} className={tab === item.id ? 'is-active' : ''} onClick={() => setTab(item.id)} aria-current={tab === item.id ? 'page' : undefined}><i><Icon size={18} /></i>{item.label}</button> })}</nav>
        <div className="detail-body engineering-detail__body">{tab === 'intro' && <Overview vehicleId={vehicleId} locale={locale} partId={partId} />}{tab === 'principle' && <Principle vehicleId={vehicleId} locale={locale} partId={partId} />}{tab === 'observe' && <Observe vehicleId={vehicleId} locale={locale} partId={partId} />}{tab === 'engineering' && <Engineering vehicleId={vehicleId} locale={locale} partId={partId} />}{tab === 'faults' && <Faults vehicleId={vehicleId} locale={locale} partId={partId} />}</div>
      </div>
    </div>
  )
}
