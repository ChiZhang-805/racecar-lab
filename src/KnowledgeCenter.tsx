import { useMemo, useState } from 'react'
import { ArrowRight, BookOpenCheck, Calculator, Check, ChevronRight, CircleHelp, Lightbulb, RotateCcw, ShieldQuestion, Target, Trophy, Wrench, X } from 'lucide-react'
import { CATEGORIES, PARTS, PART_IDS, type CategoryId, type PartId } from './data'
import { localise } from './engineeringData'
import { getCategoryName, getPart, type Locale } from './i18n'
import { QUESTION_BANK, type AnswerIndex, type KnowledgeQuestion, type QuestionType } from './questionBank'
import { readJson, writeJson } from './storage'
import { useDialogFocus } from './useDialogFocus'
import type { VehicleId } from './vehicles'
import { GRAND_PRIX_QUESTION_BANK } from './grandPrixQuestionBank'

type ScoreRecord = { best: number; attempts: number }
type SavedProgress = Partial<Record<PartId, ScoreRecord>>
type QuestionIndex = 0 | 1 | 2 | 3 | 4

const ui = {
  zh: {
    title: '知识问答中心', choose: '题目范围', progress: '学习记录', question: '题目', of: '/', submit: '提交答案', next: '下一题', finish: '查看成绩', correct: '回答正确', incorrect: '需要再想一步', hint: '公式提示', result: '本轮成绩', mastered: '已掌握', developing: '继续巩固', retry: '重新挑战', backParts: '选择其他零件', close: '关闭', noAnswer: '请先选择一个答案', difficulty: '难度', types: { concept: '概念', calculation: '计算', scenario: '情境', diagnosis: '诊断', design: '设计' }, levels: ['基础', '进阶', '工程'], resultStrong: '你已经能把公式、现象和工程决策连接起来。', resultDevelop: '建议回到该零件的工作原理与诊断实验，再挑战一次。', questionCount: '5 道综合题', scoreUnit: '分',
  },
  en: {
    title: 'Knowledge Centre', choose: 'Question scope', progress: 'Learning record', question: 'Question', of: 'of', submit: 'Submit answer', next: 'Next question', finish: 'View result', correct: 'Correct', incorrect: 'Think one step further', hint: 'Formula hint', result: 'Session result', mastered: 'Mastered', developing: 'Keep developing', retry: 'Retry challenge', backParts: 'Choose another part', close: 'Close', noAnswer: 'Choose an answer first', difficulty: 'Difficulty', types: { concept: 'Concept', calculation: 'Calculation', scenario: 'Scenario', diagnosis: 'Diagnosis', design: 'Design' }, levels: ['Foundation', 'Applied', 'Engineering'], resultStrong: 'You can now connect equations, evidence and engineering decisions.', resultDevelop: 'Return to the part principles and diagnostic experiments, then challenge it again.', questionCount: '5 mixed questions', scoreUnit: 'pts',
  },
} as const

const categoryOrder: CategoryId[] = ['aero', 'structure', 'dynamics', 'power', 'electronics']
const partIdSet = new Set<string>(PART_IDS)
const questionIcons: Record<QuestionType, typeof CircleHelp> = { concept: CircleHelp, calculation: Calculator, scenario: Target, diagnosis: ShieldQuestion, design: Wrench }

const isSavedProgress = (value: unknown): value is SavedProgress => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  return Object.entries(value).every(([partId, entry]) => {
    if (!partIdSet.has(partId)) return false
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return false
    const record = entry as Record<string, unknown>
    return typeof record.best === 'number' && Number.isInteger(record.best) && record.best >= 0 && record.best <= 100 && record.best % 20 === 0
      && typeof record.attempts === 'number' && Number.isSafeInteger(record.attempts) && record.attempts >= 0
  })
}

export default function KnowledgeCenter({ vehicleId, locale, profileId, initialPartId, onClose }: { vehicleId: VehicleId; locale: Locale; profileId: string; initialPartId?: PartId | null; onClose: () => void }) {
  const initial: PartId = initialPartId ?? 'front-wing'
  const progressKey = vehicleId === 'student-ev' ? `racecar-lab-knowledge:${profileId}` : `racecar-lab-knowledge:${profileId}:${vehicleId}`
  const [category, setCategory] = useState<CategoryId>(() => PARTS.find(part => part.id === initial)?.category ?? 'aero')
  const [partId, setPartId] = useState<PartId>(initial)
  const [questionIndex, setQuestionIndex] = useState<QuestionIndex>(0)
  const [selected, setSelected] = useState<AnswerIndex | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [answers, setAnswers] = useState<AnswerIndex[]>([])
  const [finished, setFinished] = useState(false)
  const [showHint, setShowHint] = useState(false)
  const [notice, setNotice] = useState('')
  const [saved, setSaved] = useState<SavedProgress>(() => readJson(progressKey, isSavedProgress, {}))
  const dialogRef = useDialogFocus<HTMLDivElement>()
  const u = ui[locale]
  const parts = useMemo(() => PARTS.filter(part => part.category === category), [category])
  const questions = vehicleId === 'grand-prix-2026' ? GRAND_PRIX_QUESTION_BANK[partId] : QUESTION_BANK[partId]
  const question = questions[questionIndex]
  const score = answers.reduce<number>((total, answer, index) => total + (answer === questions[index]!.answer ? 20 : 0), 0)

  const resetSession = (nextPart: PartId = partId) => {
    setPartId(nextPart); setQuestionIndex(0); setSelected(null); setSubmitted(false); setAnswers([]); setFinished(false); setShowHint(false); setNotice('')
  }

  const chooseCategory = (next: CategoryId) => {
    setCategory(next)
    const first = PARTS.find(part => part.category === next)
    if (first) resetSession(first.id)
  }

  const submit = () => {
    if (selected === null) { setNotice(u.noAnswer); return }
    setNotice(''); setSubmitted(true)
  }

  const next = () => {
    if (selected === null) return
    const nextAnswers = [...answers, selected]
    if (questionIndex === questions.length - 1) {
      const finalScore = nextAnswers.reduce<number>((total, answer, index) => total + (answer === questions[index]!.answer ? 20 : 0), 0)
      const previous = saved[partId] ?? { best: 0, attempts: 0 }
      const updated = { ...saved, [partId]: { best: Math.max(previous.best, finalScore), attempts: previous.attempts + 1 } }
      setAnswers(nextAnswers); setSaved(updated); writeJson(progressKey, updated); setFinished(true)
    } else {
      setAnswers(nextAnswers); setQuestionIndex(index => (index + 1) as QuestionIndex); setSelected(null); setSubmitted(false); setShowHint(false); setNotice('')
    }
  }

  const TypeIcon = questionIcons[question.type]
  return (
    <div className="overlay knowledge-overlay" role="dialog" aria-modal="true" aria-label={u.title}>
      <div className="overlay-backdrop" onClick={onClose} />
      <div className="knowledge-modal" ref={dialogRef} tabIndex={-1}>
        <header className="knowledge-header"><div className="knowledge-title"><BookOpenCheck size={25} /><h2>{u.title}</h2></div><button className="settings-close" onClick={onClose} aria-label={u.close} title={u.close}><X size={22} /></button></header>
        <aside className="knowledge-sidebar">
          <div className="knowledge-categories">{categoryOrder.map(id => <button key={id} className={category === id ? 'is-active' : ''} onClick={() => chooseCategory(id)} style={{ '--quiz-color': CATEGORIES[id].color } as React.CSSProperties} aria-pressed={category === id}><i />{getCategoryName(id, locale)}</button>)}</div>
          <div className="knowledge-parts">{parts.map(part => { const progress = saved[part.id]; return <button key={part.id} className={partId === part.id ? 'is-active' : ''} onClick={() => resetSession(part.id)} aria-current={partId === part.id ? 'true' : undefined}><span>{part.index}</span><strong>{getPart(part.id, locale, vehicleId).name}</strong>{progress && <em>{progress.best}</em>}<ChevronRight size={15} /></button> })}</div>
        </aside>
        <main className="knowledge-main">
          {!finished ? <>
            <div className="knowledge-question-meta"><span><TypeIcon size={17} />{u.types[question.type]}</span><span>{u.difficulty} · {u.levels[question.difficulty - 1]!}</span><strong>{u.question} {questionIndex + 1} <small>{u.of} {questions.length}</small></strong></div>
            <div className="knowledge-progress"><i style={{ width: `${((questionIndex + (submitted ? 1 : 0)) / questions.length) * 100}%` }} /></div>
            <section className="knowledge-question"><div className="knowledge-question__number">{String(questionIndex + 1).padStart(2, '0')}</div><h3>{localise(question.prompt, locale)}</h3>{question.hint && <button className={`knowledge-hint ${showHint ? 'is-active' : ''}`} onClick={() => setShowHint(value => !value)}><Lightbulb size={16} />{u.hint}</button>}{showHint && question.hint && <code className="knowledge-hint-box">{localise(question.hint, locale)}</code>}</section>
            <div className="knowledge-options">{question.options.map((option, index) => { const answerIndex = index as AnswerIndex; const correct = submitted && answerIndex === question.answer; const wrong = submitted && answerIndex === selected && answerIndex !== question.answer; return <button key={index} disabled={submitted} className={`${selected === answerIndex ? 'is-selected' : ''} ${correct ? 'is-correct' : ''} ${wrong ? 'is-wrong' : ''}`} onClick={() => { setSelected(answerIndex); setNotice('') }} aria-pressed={selected === answerIndex}><i>{submitted && correct ? <Check size={18} /> : String.fromCharCode(65 + index)}</i><span>{localise(option, locale)}</span></button> })}</div>
            {notice && <p className="knowledge-notice">{notice}</p>}
            {submitted && <section className={`knowledge-explanation ${selected === question.answer ? 'is-correct' : 'is-wrong'}`}><div><strong>{selected === question.answer ? u.correct : u.incorrect}</strong></div><p>{localise(question.explanation, locale)}</p></section>}
            <footer className="knowledge-actions">{!submitted ? <button className="button button--primary" onClick={submit}>{u.submit}<ArrowRight size={17} /></button> : <button className="button button--primary" onClick={next}>{questionIndex === questions.length - 1 ? u.finish : u.next}<ArrowRight size={17} /></button>}</footer>
          </> : <section className="knowledge-result"><div className={`knowledge-result__ring ${score >= 80 ? 'is-strong' : ''}`}><Trophy size={32} /><strong>{score}</strong><span>{u.scoreUnit}</span></div><span>{score >= 80 ? u.mastered : u.developing}</span><h3>{getPart(partId, locale, vehicleId).name}</h3><p>{score >= 80 ? u.resultStrong : u.resultDevelop}</p><div className="knowledge-result__answers">{questions.map((item: KnowledgeQuestion, index) => <i key={item.id} className={answers[index] === item.answer ? 'is-correct' : 'is-wrong'}>{answers[index] === item.answer ? <Check size={16} /> : <X size={16} />}</i>)}</div><div><button className="button button--primary" onClick={() => resetSession()}><RotateCcw size={17} />{u.retry}</button><button className="button button--glass" onClick={() => { const current = categoryOrder.indexOf(category); chooseCategory(categoryOrder[(current + 1) % categoryOrder.length]!) }}>{u.backParts}<ArrowRight size={17} /></button></div></section>}
        </main>
      </div>
    </div>
  )
}
