import { PART_IDS, type PartId } from './data'
import type { AnswerIndex, KnowledgeQuestion, QuestionType } from './questionBank'
import type { LocalText } from './engineeringData'
import { GRAND_PRIX_PARTS } from './grandPrixContent'
import { GRAND_PRIX_ENGINEERING_LESSONS } from './grandPrixEngineeringData'
import { GRAND_PRIX_FORMULA_EXAMPLES } from './grandPrixFormulaExamples'

const l = (zh: string, en: string): LocalText => ({ zh, en })
const q = (id: string, type: QuestionType, difficulty: 1 | 2 | 3, prompt: LocalText, options: [LocalText, LocalText, LocalText], answer: AnswerIndex, explanation: LocalText, hint?: LocalText): KnowledgeQuestion => ({ id, type, difficulty, prompt, options, answer, explanation, hint })
const choice = (id: string, type: QuestionType, difficulty: 1 | 2 | 3, prompt: LocalText, correct: LocalText, wrongA: LocalText, wrongB: LocalText, answer: AnswerIndex, explanation: LocalText, hint?: LocalText) => {
  const options = [wrongA, wrongB] as LocalText[]
  options.splice(answer, 0, correct)
  return q(id, type, difficulty, prompt, options as [LocalText, LocalText, LocalText], answer, explanation, hint)
}
const perturbFirstNumber = (value: string, factor: number) => value.replace(/-?\d+(?:\.\d+)?/, (raw) => {
  const next = Number(raw) * factor
  if (!Number.isFinite(next)) return raw
  return Math.abs(next) >= 100 ? next.toFixed(0) : Number(next.toFixed(2)).toString()
})

const makeQuestions = (id: PartId): [KnowledgeQuestion, KnowledgeQuestion, KnowledgeQuestion, KnowledgeQuestion, KnowledgeQuestion] => {
  const part = GRAND_PRIX_PARTS[id]
  const lesson = GRAND_PRIX_ENGINEERING_LESSONS[id]
  const formula = lesson.formulas[0]
  const worked = GRAND_PRIX_FORMULA_EXAMPLES[id][0]
  const partIndex = PART_IDS.indexOf(id)
  const adjacentA = GRAND_PRIX_PARTS[PART_IDS[(partIndex + 5) % PART_IDS.length]!]
  const adjacentB = GRAND_PRIX_PARTS[PART_IDS[(partIndex + 11) % PART_IDS.length]!]
  const answerAt = (offset: number) => ((partIndex + offset) % 3) as AnswerIndex
  return [
    choice(`gp-${id}-concept`, 'concept', 1,
      l(`${part.zh.name}在整车中的核心任务是什么？`, `What is the primary vehicle-level task of ${part.en.name}?`),
      l(part.zh.purpose, part.en.purpose), l(adjacentA.zh.purpose, adjacentA.en.purpose), l(adjacentB.zh.purpose, adjacentB.en.purpose), answerAt(0),
      l(`${part.zh.short}${part.zh.engineering[0]}`, `${part.en.short} ${part.en.engineering[0]}`)),
    choice(`gp-${id}-calculation`, 'calculation', 2,
      l(`根据以下工况完成“${formula.name.zh}”计算：${worked.scenario.zh}`, `Calculate “${formula.name.en}” for this case: ${worked.scenario.en}`),
      worked.result,
      l(perturbFirstNumber(worked.result.zh, 2), perturbFirstNumber(worked.result.en, 2)),
      l(perturbFirstNumber(worked.result.zh, 0.5), perturbFirstNumber(worked.result.en, 0.5)),
      answerAt(1),
      l(`${worked.steps.map((step) => step.zh).join(' ')} ${worked.result.zh}`, `${worked.steps.map((step) => step.en).join(' ')} ${worked.result.en}`), formula.variables),
    choice(`gp-${id}-scenario`, 'scenario', 2,
      l(`赛车进入新赛道的第一次系统检查中，针对${part.zh.name}最合理的观察是什么？`, `On the first systems check at a new circuit, what is the most useful observation for ${part.en.name}?`),
      l(part.zh.observe[0], part.en.observe[0]), l(adjacentA.zh.observe[0], adjacentA.en.observe[0]), l(adjacentB.zh.observe[0], adjacentB.en.observe[0]), answerAt(2),
      l(`${part.zh.observe[1]}${part.zh.observe[2]}`, `${part.en.observe[1]} ${part.en.observe[2]}`)),
    choice(`gp-${id}-diagnosis`, 'diagnosis', 3,
      l(`若${part.zh.name}出现异常，哪一项最符合需要优先验证的工程故障？`, `If ${part.en.name} behaves abnormally, which item is the engineering fault that needs priority validation?`),
      l(part.zh.faults[0], part.en.faults[0]), l(adjacentA.zh.faults[0], adjacentA.en.faults[0]), l(adjacentB.zh.faults[0], adjacentB.en.faults[0]), answerAt(3),
      l(`${part.zh.faults[0]}${part.zh.faults[1]}`, `${part.en.faults[0]} ${part.en.faults[1]}`)),
    choice(`gp-${id}-design`, 'design', 3,
      l(`设计或标定${part.zh.name}时，哪一项判断最完整？`, `Which judgement is most complete when designing or calibrating ${part.en.name}?`),
      l(part.zh.engineering[0], part.en.engineering[0]), l(adjacentA.zh.engineering[0], adjacentA.en.engineering[0]), l(adjacentB.zh.engineering[0], adjacentB.en.engineering[0]), answerAt(4),
      l(`${part.zh.engineering[1]}${part.zh.engineering[2]}`, `${part.en.engineering[1]} ${part.en.engineering[2]}`)),
  ]
}

export const GRAND_PRIX_QUESTION_BANK: Record<PartId, [KnowledgeQuestion, KnowledgeQuestion, KnowledgeQuestion, KnowledgeQuestion, KnowledgeQuestion]> = Object.fromEntries(
  PART_IDS.map((id) => [id, makeQuestions(id)]),
) as Record<PartId, [KnowledgeQuestion, KnowledgeQuestion, KnowledgeQuestion, KnowledgeQuestion, KnowledgeQuestion]>
