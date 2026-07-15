import { useEffect, useMemo, useState } from 'react'
import katex from 'katex'
import 'katex/dist/katex.min.css'
import { Activity, AlertTriangle, ArrowRight, BookOpen, Calculator, Check, ChevronRight, CircleGauge, ExternalLink, FlaskConical, Gauge, GitBranch, RotateCcw, SearchCheck, ShieldCheck, SlidersHorizontal, Target, ThermometerSun, Wrench, X } from 'lucide-react'
import { ENGINEERING_LESSONS, localise, type DiagnosticCase, type GuidedExperiment, type LabKind } from './engineeringData'
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
import { CoolingFaultCards, CoolingObserveLab, CoolingReferenceCards } from './CoolingInteractionPanels'

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

const visualUi = {
  zh: {
    predict: '预测', linear: '持续变好', limit: '出现拐点', risk: '进入风险',
    flow: '系统图', data: '数据', conclusion: '结论', tune: '调参数',
    tradeMap: '取舍图', profile: '方案', balanced: '均衡', aggressive: '激进',
    performance: '性能', reliability: '可靠', mass: '重量', efficiency: '效率', riskAxis: '风险',
    testFlow: '验证链路', bench: '台架', install: '装车', track: '赛道', review: '复盘',
    faultMap: '故障图', inspect: '排查', suspects: '根因选择', selected: '已选择',
    correct: '最可能根因', exclude: '需要排除', sensor: '测量偏差', boundary: '边界条件',
    thermal: '热源', control: '控制', transfer: '传递', output: '输出', environment: '环境',
  },
  en: {
    predict: 'Predict', linear: 'Keeps improving', limit: 'Hits a limit', risk: 'Turns risky',
    flow: 'System map', data: 'Data', conclusion: 'Result', tune: 'Tune',
    tradeMap: 'Trade map', profile: 'Setup', balanced: 'Balanced', aggressive: 'Aggressive',
    performance: 'Performance', reliability: 'Reliability', mass: 'Mass', efficiency: 'Efficiency', riskAxis: 'Risk',
    testFlow: 'Validation chain', bench: 'Bench', install: 'Install', track: 'Track', review: 'Review',
    faultMap: 'Fault map', inspect: 'Inspect', suspects: 'Suspects', selected: 'Selected',
    correct: 'Most likely', exclude: 'Rule out', sensor: 'Sensor bias', boundary: 'Boundary condition',
    thermal: 'Heat', control: 'Control', transfer: 'Transfer', output: 'Output', environment: 'Environment',
  },
} as const

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

const visualTheme = (kind: LabKind, locale: Locale) => {
  const v = visualUi[locale]
  const themes: Record<LabKind, { color: string; nodes: string[]; icon: typeof Activity }> = {
    wing: { color: '#50d8ff', nodes: [locale === 'zh' ? '气流' : 'Air', locale === 'zh' ? '翼面' : 'Wing', locale === 'zh' ? '压力' : 'Pressure', locale === 'zh' ? '载荷' : 'Load'], icon: Activity },
    floor: { color: '#52e0c4', nodes: [locale === 'zh' ? '入口' : 'Inlet', locale === 'zh' ? '喉部' : 'Throat', locale === 'zh' ? '扩散器' : 'Diffuser', locale === 'zh' ? '地面效应' : 'Ground effect'], icon: Activity },
    impact: { color: '#ffb75b', nodes: [locale === 'zh' ? '碰撞' : 'Impact', locale === 'zh' ? '压溃' : 'Crush', locale === 'zh' ? '吸能' : 'Energy', locale === 'zh' ? '舱体' : 'Cell'], icon: ShieldCheck },
    structure: { color: '#75d7ff', nodes: [locale === 'zh' ? '载荷' : 'Load', locale === 'zh' ? '蒙皮' : 'Skin', locale === 'zh' ? '夹芯' : 'Core', locale === 'zh' ? '刚度' : 'Stiffness'], icon: ShieldCheck },
    protection: { color: '#9ee7ff', nodes: [locale === 'zh' ? '冲击' : 'Strike', locale === 'zh' ? '支点' : 'Mounts', locale === 'zh' ? '变形' : 'Deflection', locale === 'zh' ? '净空' : 'Clearance'], icon: ShieldCheck },
    tire: { color: '#b9f071', nodes: [locale === 'zh' ? '载荷' : 'Load', locale === 'zh' ? '滑移' : 'Slip', locale === 'zh' ? '温度' : 'Temp', locale === 'zh' ? '抓地' : 'Grip'], icon: Gauge },
    brake: { color: '#ff826b', nodes: [locale === 'zh' ? '踏板' : 'Pedal', locale === 'zh' ? '夹紧' : 'Clamp', locale === 'zh' ? '热量' : 'Heat', locale === 'zh' ? '减速' : 'Decel'], icon: ThermometerSun },
    suspension: { color: '#a78bfa', nodes: [locale === 'zh' ? '轮胎' : 'Tyre', locale === 'zh' ? '弹簧' : 'Spring', locale === 'zh' ? '阻尼' : 'Damper', locale === 'zh' ? '平台' : 'Platform'], icon: GitBranch },
    steering: { color: '#7dd3fc', nodes: [locale === 'zh' ? '输入' : 'Input', locale === 'zh' ? '转向机' : 'Rack', locale === 'zh' ? '轮角' : 'Wheel angle', locale === 'zh' ? '响应' : 'Response'], icon: Target },
    battery: { color: '#7cf7b5', nodes: [locale === 'zh' ? '电芯' : 'Cells', locale === 'zh' ? '电流' : 'Current', locale === 'zh' ? '热量' : 'Heat', locale === 'zh' ? '功率' : 'Power'], icon: Activity },
    inverter: { color: '#69e6ff', nodes: [locale === 'zh' ? '直流' : 'DC', locale === 'zh' ? '开关' : 'Switching', locale === 'zh' ? '三相' : '3 phase', locale === 'zh' ? '扭矩' : 'Torque'], icon: Activity },
    motor: { color: '#58e6c5', nodes: [locale === 'zh' ? '电流' : 'Current', locale === 'zh' ? '磁场' : 'Field', locale === 'zh' ? '转子' : 'Rotor', locale === 'zh' ? '扭矩' : 'Torque'], icon: Activity },
    differential: { color: '#f5c56a', nodes: [locale === 'zh' ? '输入' : 'Input', locale === 'zh' ? '锁止' : 'Lock', locale === 'zh' ? '轮速差' : 'Delta speed', locale === 'zh' ? '牵引' : 'Traction'], icon: GitBranch },
    cooling: { color: '#4fd8ff', nodes: [v.thermal, locale === 'zh' ? '泵' : 'Pump', locale === 'zh' ? '散热器' : 'Radiator', v.environment], icon: ThermometerSun },
    control: { color: '#d6b4ff', nodes: [locale === 'zh' ? '请求' : 'Request', locale === 'zh' ? '限制器' : 'Limits', locale === 'zh' ? '策略' : 'Logic', locale === 'zh' ? '命令' : 'Command'], icon: Target },
    telemetry: { color: '#91d5ff', nodes: [locale === 'zh' ? '传感器' : 'Sensor', locale === 'zh' ? '采样' : 'Sample', locale === 'zh' ? '记录' : 'Log', locale === 'zh' ? '判断' : 'Decision'], icon: SearchCheck },
  }
  return themes[kind]
}

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

function FlowDiagram({ locale, labKind, intensity = 55, activeIndex = 1 }: { locale: Locale; labKind: LabKind; intensity?: number; activeIndex?: number }) {
  const theme = visualTheme(labKind, locale)
  const Icon = theme.icon
  const glow = clamp(intensity, 0, 100)
  return (
    <div className="eng-flow-visual" style={{ ['--flow-color' as string]: theme.color, ['--flow-level' as string]: `${glow}%` }}>
      <svg viewBox="0 0 680 210" role="img" aria-label={visualUi[locale].flow}>
        <defs>
          <linearGradient id={`flow-${labKind}`} x1="0" x2="1"><stop offset="0" stopColor={theme.color} stopOpacity=".18" /><stop offset="1" stopColor={theme.color} stopOpacity=".9" /></linearGradient>
          <filter id={`flow-glow-${labKind}`}><feGaussianBlur stdDeviation="4" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        </defs>
        <path className="eng-flow-visual__rail" d="M92 105 H588" />
        <path className="eng-flow-visual__pulse" d="M92 105 H588" style={{ strokeDashoffset: 240 - glow * 1.6 }} />
        {theme.nodes.map((node, index) => {
          const x = 92 + index * (496 / (theme.nodes.length - 1))
          return (
            <g key={node} className={index === activeIndex ? 'is-active' : ''} transform={`translate(${x} 105)`}>
              <circle r={index === activeIndex ? 34 : 28} fill="rgba(8,18,23,.92)" stroke={theme.color} strokeOpacity={index === activeIndex ? .9 : .38} />
              <circle r={11 + index * 2} fill={theme.color} opacity={index <= activeIndex ? .42 : .13} filter={`url(#flow-glow-${labKind})`} />
              <text y="58" textAnchor="middle">{node}</text>
            </g>
          )
        })}
      </svg>
      <Icon className="eng-flow-visual__icon" size={28} />
    </div>
  )
}

function GaugeTile({ label, value, unit, tone = 'normal' }: { label: string; value: number; unit: string; tone?: string }) {
  const pct = clamp(Math.abs(value) % 120, 8, 100)
  return (
    <article className={`eng-visual-gauge is-${tone}`} style={{ ['--gauge' as string]: `${pct}%` }}>
      <span>{label}</span>
      <strong>{Number.isFinite(value) ? value.toLocaleString(undefined, { maximumFractionDigits: 1 }) : '—'}<small>{unit}</small></strong>
      <i />
    </article>
  )
}

function ExperimentCard({ locale, vehicleId, labKind, experiment }: { locale: Locale; vehicleId: VehicleId; labKind: LabKind; experiment: GuidedExperiment }) {
  const model = modelFor(labKind, vehicleId)
  const [values, setValues] = useState<Record<string, number>>(() => valuesFor(labKind, vehicleId))
  const [prediction, setPrediction] = useState<'linear' | 'limit' | 'risk'>('limit')
  const [activeNode, setActiveNode] = useState(1)
  const [revealed, setRevealed] = useState(false)
  const u = ui[locale]
  const v = visualUi[locale]
  useEffect(() => { setValues(valuesFor(labKind, vehicleId)); setPrediction('limit'); setActiveNode(1); setRevealed(false) }, [experiment, labKind, vehicleId])
  const output = useMemo(() => model.evaluate(values), [model, values])
  const controls = model.parameters.slice(0, 3)
  const intensity = controls.length ? controls.reduce((sum, parameter) => {
    const value = values[parameter.key] ?? parameter.initial
    return sum + ((value - parameter.min) / Math.max(1e-9, parameter.max - parameter.min)) * 100
  }, 0) / controls.length : 55
  const predictionOptions: { id: typeof prediction; label: string }[] = [
    { id: 'linear', label: v.linear }, { id: 'limit', label: v.limit }, { id: 'risk', label: v.risk },
  ]
  return (
    <div className="eng-experiment-card eng-experiment-card--visual">
      <section className="eng-visual-brief">
        <span>{v.predict}</span>
        <h3>{localise(experiment.question, locale)}</h3>
        <div className="eng-prediction-switch">{predictionOptions.map(item => <button key={item.id} className={prediction === item.id ? 'is-active' : ''} onClick={() => setPrediction(item.id)}>{item.label}</button>)}</div>
      </section>
      <section className="eng-visual-stage">
        <span className="eng-label"><Activity size={16} />{v.flow}</span>
        <FlowDiagram locale={locale} labKind={labKind} intensity={intensity} activeIndex={activeNode} />
        <div className="eng-node-dots">{experiment.steps.map((stepText, index) => <button key={index} className={activeNode === index ? 'is-active' : ''} onClick={() => setActiveNode(index)} title={localise(stepText, locale)}><span>{index + 1}</span></button>)}</div>
      </section>
      <section className="eng-visual-controls">
        <div className="eng-section-title"><span><SlidersHorizontal size={17} />{v.tune}</span><button onClick={() => setValues(valuesFor(labKind, vehicleId))} title={u.reset}><RotateCcw size={15} /></button></div>
        {controls.map(parameter => {
          const value = values[parameter.key] ?? parameter.initial
          return <label key={parameter.key}><span>{localise(parameter.label, locale)}</span><input type="range" min={parameter.min} max={parameter.max} step={parameter.step} value={value} onChange={event => setValues(current => ({ ...current, [parameter.key]: Number(event.target.value) }))} /></label>
        })}
      </section>
      <section className="eng-visual-data">
        <span className="eng-label"><CircleGauge size={16} />{v.data}</span>
        <div>{output.metrics.slice(0, 4).map((metric, index) => <GaugeTile key={index} label={localise(metric.label, locale)} value={metric.value} unit={metric.unit} tone={metric.tone} />)}</div>
      </section>
      <section className={`eng-visual-conclusion ${revealed ? 'is-revealed' : ''}`}>
        <span>{v.conclusion}</span>
        <p>{revealed ? localise(experiment.evidence, locale) : localise(experiment.steps[activeNode] ?? experiment.steps[0] ?? experiment.evidence, locale)}</p>
        <button onClick={() => setRevealed(value => !value)}>{revealed ? u.hide : u.reveal}<ArrowRight size={16} /></button>
      </section>
    </div>
  )
}

function Observe({ locale, vehicleId, partId }: { locale: Locale; vehicleId: VehicleId; partId: PartId }) {
  const lesson = lessonFor(partId, vehicleId)
  const [selected, setSelected] = useState<PairIndex>(0)
  const u = ui[locale]
  useEffect(() => setSelected(0), [partId, vehicleId])
  if (partId === 'cooling') return <CoolingObserveLab locale={locale} vehicleId={vehicleId} />
  return <div className="eng-observe eng-observe--visual"><aside><span className="eng-label"><FlaskConical size={16} />{u.experiment}</span>{lesson.experiments.map((experiment, index) => <button className={selected === index ? 'is-active' : ''} key={index} onClick={() => setSelected(index as PairIndex)}><i>{String(index + 1).padStart(2, '0')}</i><span><strong>{localise(experiment.title, locale)}</strong></span><ChevronRight size={17} /></button>)}</aside><ExperimentCard locale={locale} vehicleId={vehicleId} labKind={lesson.labKind} experiment={lesson.experiments[selected]} /></div>
}

function RadarChart({ locale, values }: { locale: Locale; values: number[] }) {
  const v = visualUi[locale]
  const labels = [v.performance, v.reliability, v.mass, v.efficiency, v.riskAxis]
  const cx = 120; const cy = 110; const r = 82
  const point = (index: number, scale = 1): [number, number] => {
    const angle = -Math.PI / 2 + index * 2 * Math.PI / labels.length
    return [cx + Math.cos(angle) * r * scale, cy + Math.sin(angle) * r * scale]
  }
  const poly = values.map((value, index) => point(index, clamp(value, 0, 100) / 100).join(',')).join(' ')
  return (
    <svg className="eng-radar" viewBox="0 0 240 230" role="img" aria-label={v.tradeMap}>
      {[.35, .68, 1].map(level => <polygon key={level} points={labels.map((_, index) => point(index, level).join(',')).join(' ')} />)}
      {labels.map((label, index) => {
        const [x1, y1] = point(index, 0); const [x2, y2] = point(index, 1.08)
        return <g key={label}><line x1={x1} y1={y1} x2={x2} y2={y2} /><text x={x2} y={y2} textAnchor={x2 > cx + 8 ? 'start' : x2 < cx - 8 ? 'end' : 'middle'}>{label}</text></g>
      })}
      <polygon className="eng-radar__shape" points={poly} />
      {values.map((value, index) => { const [x, y] = point(index, clamp(value, 0, 100) / 100); return <circle key={index} cx={x} cy={y} r="4" /> })}
    </svg>
  )
}

function Engineering({ locale, vehicleId, partId }: { locale: Locale; vehicleId: VehicleId; partId: PartId }) {
  const lesson = lessonFor(partId, vehicleId)
  const [selected, setSelected] = useState<TripleIndex>(0)
  const [profile, setProfile] = useState(48)
  const u = ui[locale]
  const v = visualUi[locale]
  useEffect(() => { setSelected(0); setProfile(48) }, [partId, vehicleId])
  if (partId === 'cooling') return <CoolingReferenceCards locale={locale} />
  const seed = (partId.length * 11 + selected * 17 + Math.round(profile)) % 31
  const radarValues = [68 + seed % 18, 76 - selected * 7, 54 + Math.round(profile / 5) % 18, 72 - Math.round(profile / 7) % 17, 38 + selected * 13 + Math.round(profile / 12)]
  const stages = [v.bench, v.install, v.track, v.review]
  return (
    <div className="eng-engineering eng-engineering--visual">
      <section className="eng-trade-console">
        <span className="eng-label"><Wrench size={16} />{v.tradeMap}</span>
        <div className="eng-trade-main">
          <RadarChart locale={locale} values={radarValues} />
          <div className="eng-profile-control">
            <span>{v.profile}</span>
            <div><b>{v.balanced}</b><b>{v.aggressive}</b></div>
            <input type="range" min="0" max="100" value={profile} onChange={event => setProfile(Number(event.target.value))} />
          </div>
        </div>
        <div className="eng-decision-pills">{lesson.decisions.map((item, index) => <button key={index} className={selected === index ? 'is-active' : ''} onClick={() => setSelected(index as TripleIndex)}><i>{index + 1}</i><span>{localise(item, locale)}</span></button>)}</div>
        <div className="eng-trade-matrix">
          {[v.performance, v.reliability, v.efficiency, v.riskAxis].map((label, index) => {
            const value = clamp(radarValues[index] ?? 50, 0, 100)
            return <article key={label} style={{ ['--score' as string]: `${value}%` }}><span>{label}</span><strong>{Math.round(value)}</strong><i /></article>
          })}
        </div>
      </section>
      <section className="eng-validation-console">
        <span className="eng-label"><ShieldCheck size={16} />{v.testFlow}</span>
        <div className="eng-validation-track">{stages.map((stage, index) => <article key={stage} className={index <= selected + 1 ? 'is-on' : ''}><i>{index < 3 ? index + 1 : <Check size={15} />}</i><strong>{stage}</strong></article>)}</div>
        <div className="eng-validation-brief">
          {lesson.validation.map((item, index) => <p key={index}>{localise(item, locale)}</p>)}
        </div>
        <div className="eng-validation-gates">
          {[v.performance, v.reliability, v.efficiency, v.riskAxis].map((label, index) => <article key={label} style={{ ['--gate' as string]: `${clamp(radarValues[index] ?? 50, 0, 100)}%` }}><span>{label}</span><i /></article>)}
        </div>
        <div className="eng-validation-map">
          {stages.map((stage, index) => <article key={stage} className={index <= selected + 1 ? 'is-on' : ''}><span>{stage}</span><i /></article>)}
        </div>
        <div className="eng-references"><strong>{u.sources}</strong>{lesson.references.map((reference, index) => <a key={reference.url} href={reference.url} target="_blank" rel="noopener noreferrer" title={reference.title}>{u.source} {String(index + 1).padStart(2, '0')}<ExternalLink size={14} /></a>)}</div>
      </section>
    </div>
  )
}

function Diagnostic({ locale, labKind, diagnostic }: { locale: Locale; labKind: LabKind; diagnostic: DiagnosticCase }) {
  const [activeCheck, setActiveCheck] = useState(0)
  const [suspect, setSuspect] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const u = ui[locale]
  const v = visualUi[locale]
  useEffect(() => { setActiveCheck(0); setSuspect(0); setRevealed(false) }, [diagnostic])
  const suspects = [localise(diagnostic.title, locale), v.sensor, v.boundary]
  return (
    <section className="eng-diagnostic eng-diagnostic--visual">
      <div className="eng-fault-map">
        <span className="eng-label"><SearchCheck size={16} />{v.faultMap}</span>
        <FlowDiagram locale={locale} labKind={labKind} intensity={revealed ? 86 : 58} activeIndex={activeCheck} />
        <p>{localise(diagnostic.symptom, locale)}</p>
      </div>
      <div className="eng-diagnostic__checks">
        <span>{v.inspect}</span>
        {diagnostic.checks.map((item, index) => <button key={index} className={activeCheck === index ? 'is-active' : ''} onClick={() => setActiveCheck(index)}><i>{index + 1}</i><p>{localise(item, locale)}</p><ArrowRight size={15} /></button>)}
        <div className="eng-diagnostic-strip">
          {[v.data, v.control, v.output].map((label, index) => <article key={label} className={index === activeCheck ? 'is-hot' : ''}><span>{label}</span><i /></article>)}
        </div>
      </div>
      <div className="eng-suspect-board">
        <span>{v.suspects}</span>
        <div>{suspects.map((item, index) => <button key={item} className={suspect === index ? 'is-active' : ''} onClick={() => setSuspect(index)}><i>{index === 0 ? <Target size={15} /> : <AlertTriangle size={15} />}</i>{item}</button>)}</div>
      </div>
      <div className={`eng-diagnostic__resolution ${revealed ? 'is-revealed' : ''}`}>
        <span>{suspect === 0 ? v.correct : v.exclude}</span>
        {revealed ? <p>{localise(diagnostic.resolution, locale)}</p> : <button onClick={() => setRevealed(true)}>{u.revealResolution}<ArrowRight size={16} /></button>}
      </div>
    </section>
  )
}

function Faults({ locale, vehicleId, partId }: { locale: Locale; vehicleId: VehicleId; partId: PartId }) {
  const lesson = lessonFor(partId, vehicleId)
  const [selected, setSelected] = useState<PairIndex>(0)
  const u = ui[locale]
  useEffect(() => setSelected(0), [partId, vehicleId])
  if (partId === 'cooling') return <CoolingFaultCards locale={locale} vehicleId={vehicleId} />
  return <div className="eng-faults eng-faults--visual"><aside><span className="eng-label"><AlertTriangle size={16} />{u.chooseCase}</span>{lesson.diagnostics.map((item, index) => <button key={index} className={selected === index ? 'is-active' : ''} onClick={() => setSelected(index as PairIndex)}><i>{String(index + 1).padStart(2, '0')}</i><span><strong>{localise(item.title, locale)}</strong></span><ChevronRight size={17} /></button>)}</aside><Diagnostic locale={locale} labKind={lesson.labKind} diagnostic={lesson.diagnostics[selected]} /></div>
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
