import { describe, expect, it } from 'vitest'
import katex from 'katex'
import { CATEGORIES, COURSES, COURSE_IDS, PARTS, PART_IDS, PART_MAP } from './data'
import { COMPONENT_FACTS } from './componentWorkshopData'
import { ENGINEERING_LESSONS, type EngineeringLesson } from './engineeringData'
import { LAB_MODELS, initialValues } from './engineeringSim'
import { QUESTION_BANK } from './questionBank'
import { FORMULA_EXAMPLES } from './formulaExamples'
import { getCourse, getPart } from './i18n'
import { GRAND_PRIX_PARTS } from './grandPrixContent'
import { GRAND_PRIX_ENGINEERING_LESSONS } from './grandPrixEngineeringData'
import { GRAND_PRIX_QUESTION_BANK } from './grandPrixQuestionBank'
import { GRAND_PRIX_FORMULA_EXAMPLES } from './grandPrixFormulaExamples'
import { GRAND_PRIX_LAB_MODELS, grandPrixInitialValues } from './grandPrixEngineeringSim'
import { grandPrixWorkshopFacts } from './grandPrixWorkshopFacts'

const sorted = (values: readonly string[]) => [...values].sort()
const cjk = /[\u3400-\u9fff]/

const expectLocalText = (value: { zh: string; en: string }) => {
  expect(value.zh.trim()).not.toBe('')
  expect(value.en.trim()).not.toBe('')
  expect(value.en).not.toMatch(cjk)
}

const expectCompleteLesson = (lesson: EngineeringLesson) => {
  expectLocalText(lesson.overview)
  expect(lesson.subcomponents).toHaveLength(6)
  lesson.subcomponents.forEach(expectLocalText)
  expect(lesson.concepts).toHaveLength(3)
  lesson.concepts.forEach(expectLocalText)
  expect(lesson.formulas).toHaveLength(3)
  lesson.formulas.forEach((formula) => {
    expectLocalText(formula.name)
    expectLocalText(formula.variables)
    expectLocalText(formula.insight)
    expect(formula.expression.trim()).not.toBe('')
    expect(formula.latex.trim()).not.toBe('')
  })
  expect(lesson.experiments).toHaveLength(2)
  lesson.experiments.forEach((experiment) => {
    expectLocalText(experiment.title)
    expectLocalText(experiment.question)
    expectLocalText(experiment.evidence)
    expect(experiment.steps.length).toBeGreaterThanOrEqual(3)
    experiment.steps.forEach(expectLocalText)
  })
  expect(lesson.decisions).toHaveLength(3)
  lesson.decisions.forEach(expectLocalText)
  expect(lesson.validation).toHaveLength(2)
  lesson.validation.forEach(expectLocalText)
  expect(lesson.diagnostics).toHaveLength(2)
  lesson.diagnostics.forEach((diagnostic) => {
    expectLocalText(diagnostic.title)
    expectLocalText(diagnostic.symptom)
    expectLocalText(diagnostic.resolution)
    expect(diagnostic.checks.length).toBeGreaterThanOrEqual(3)
    diagnostic.checks.forEach(expectLocalText)
  })
  expect(lesson.references.length).toBeGreaterThanOrEqual(2)
  lesson.references.forEach((reference) => {
    expect(reference.title.trim()).not.toBe('')
    expect(reference.url).toMatch(/^https:\/\//)
  })
}

describe('complete engineering curriculum', () => {
  it('fills every learning, experiment, validation and diagnosis field without English-language leakage', () => {
    PART_IDS.forEach((id) => expectCompleteLesson(ENGINEERING_LESSONS[id]))
  })
  it('has exactly 18 unique, fully indexed parts in all dependent records', () => {
    expect(PART_IDS).toHaveLength(18)
    expect(new Set(PART_IDS).size).toBe(18)
    expect(PARTS.map((part) => part.id)).toEqual(PART_IDS)
    for (const record of [PART_MAP, COMPONENT_FACTS, ENGINEERING_LESSONS, QUESTION_BANK, FORMULA_EXAMPLES]) {
      expect(sorted(Object.keys(record))).toEqual(sorted(PART_IDS))
    }
  })

  it('maps every part into exactly one category without gaps', () => {
    const mapped = PARTS.map((part) => part.id)
    expect(sorted(mapped)).toEqual(sorted(PART_IDS))
    expect(new Set(mapped).size).toBe(PART_IDS.length)
    expect(sorted(Object.keys(CATEGORIES))).toEqual(['aero', 'dynamics', 'electronics', 'power', 'structure'])
  })

  it('keeps six subassemblies and six explanations aligned for every 3D model', () => {
    for (const id of PART_IDS) {
      const lesson = ENGINEERING_LESSONS[id]
      const facts = COMPONENT_FACTS[id]
      expect(lesson.subcomponents).toHaveLength(6)
      expect(facts).toHaveLength(6)
      facts.forEach((fact, index) => {
        expect(lesson.subcomponents[index]!.zh.trim()).not.toBe('')
        expect(lesson.subcomponents[index]!.en.trim()).not.toBe('')
        for (const field of ['position', 'role', 'principle', 'plain'] as const) {
          expect(fact[field].zh.trim()).not.toBe('')
          expect(fact[field].en.trim()).not.toBe('')
        }
      })
    }
  })

  it('contains the full five-question assessment for every part', () => {
    const ids = new Set<string>()
    for (const id of PART_IDS) {
      const questions = QUESTION_BANK[id]
      expect(questions).toHaveLength(5)
      expect(questions.map((question) => question.type)).toEqual(['concept', 'calculation', 'scenario', 'diagnosis', 'design'])
      questions.forEach((question) => {
        expect(ids.has(question.id)).toBe(false)
        ids.add(question.id)
        expect(question.options).toHaveLength(3)
        expect(question.answer).toBeGreaterThanOrEqual(0)
        expect(question.answer).toBeLessThan(3)
        expect(question.prompt.zh.trim()).not.toBe('')
        expect(question.prompt.en.trim()).not.toBe('')
        expect(question.explanation.zh.trim()).not.toBe('')
        expect(question.explanation.en.trim()).not.toBe('')
      })
    }
    expect(ids.size).toBe(90)
  })

  it('renders all 54 equations as valid KaTeX with real mathematical layout', () => {
    let count = 0
    for (const id of PART_IDS) {
      const formulas = ENGINEERING_LESSONS[id].formulas
      expect(formulas).toHaveLength(3)
      formulas.forEach((formula) => {
        const html = katex.renderToString(formula.latex, { displayMode: true, throwOnError: true, strict: false })
        expect(html).toContain('class="katex"')
        expect(html).not.toContain('katex-error')
        expect(formula.variables.zh.trim()).not.toBe('')
        expect(formula.variables.en.trim()).not.toBe('')
        count += 1
      })
    }
    expect(count).toBe(54)
  })

  it('provides 54 distinct bilingual engineering scenarios with calculations and results', () => {
    const zhScenarios = new Set<string>()
    const enScenarios = new Set<string>()
    let count = 0
    for (const id of PART_IDS) {
      const examples = FORMULA_EXAMPLES[id]
      expect(examples).toHaveLength(3)
      examples.forEach((example) => {
        expect(example.steps.length).toBeGreaterThanOrEqual(2)
        expect(example.scenario.zh.trim()).not.toBe('')
        expect(example.scenario.en.trim()).not.toBe('')
        expect(example.result.zh).toMatch(/\d/)
        expect(example.result.en).toMatch(/\d/)
        example.steps.forEach((step) => {
          expect(step.zh.trim()).not.toBe('')
          expect(step.en.trim()).not.toBe('')
        })
        expect(example.steps.some((step) => /\d|=|×|÷/.test(step.zh))).toBe(true)
        expect(example.steps.some((step) => /\d|=|×|÷/.test(step.en))).toBe(true)
        zhScenarios.add(example.scenario.zh)
        enScenarios.add(example.scenario.en)
        count += 1
      })
    }
    expect(count).toBe(54)
    expect(zhScenarios.size).toBe(54)
    expect(enScenarios.size).toBe(54)
  })

  it('evaluates every engineering simulator with finite, ordered outputs', () => {
    for (const [kind, model] of Object.entries(LAB_MODELS)) {
      const output = model.evaluate(initialValues(kind as keyof typeof LAB_MODELS))
      expect(output.metrics).toHaveLength(4)
      expect(output.points.length).toBeGreaterThanOrEqual(20)
      output.metrics.forEach((metric) => expect(Number.isFinite(metric.value)).toBe(true))
      output.points.forEach((point) => {
        expect(Number.isFinite(point.x)).toBe(true)
        expect(Number.isFinite(point.y)).toBe(true)
      })
      for (let index = 1; index < output.points.length; index += 1) {
        expect(output.points[index]!.x).toBeGreaterThan(output.points[index - 1]!.x)
      }
    }
  })

  it('uses physical x-axis ranges in the simulators that previously double-scaled inputs', () => {
    const range = (kind: keyof typeof LAB_MODELS) => {
      const points = LAB_MODELS[kind].evaluate(initialValues(kind)).points
      return [points[0]!.x, points.at(-1)!.x]
    }
    expect(range('wing')).toEqual([30, 160])
    expect(range('floor')).toEqual([15, 60])
    expect(range('steering')).toEqual([3, 30])
    expect(range('battery')).toEqual([20, 500])
    expect(range('inverter')).toEqual([4, 24])
    expect(range('motor')).toEqual([0, 18000])
    expect(range('cooling')).toEqual([20, 100])
  })

  it('keeps the eight-course dependency graph and localisation valid', () => {
    expect(COURSE_IDS).toHaveLength(8)
    expect(COURSES.map((course) => course.id)).toEqual(COURSE_IDS)
    COURSES.forEach((course) => {
      expect(course.parts.length).toBeGreaterThan(0)
      course.parts.forEach((id) => expect(PART_IDS).toContain(id))
      expect(course.answer).toBeGreaterThanOrEqual(0)
      expect(course.answer).toBeLessThan(course.options.length)
      for (const locale of ['zh', 'en'] as const) {
        const translated = getCourse(course, locale)
        expect(translated.title.trim()).not.toBe('')
        expect(translated.options).toHaveLength(4)
      }
    })
  })

  it('provides complete standalone Chinese and English part content', () => {
    for (const id of PART_IDS) {
      const zh = getPart(id, 'zh')
      const en = getPart(id, 'en')
      for (const part of [zh, en]) {
        expect(part.name.trim()).not.toBe('')
        expect(part.short.trim()).not.toBe('')
        expect(part.purpose.trim()).not.toBe('')
        expect(part.analogy.trim()).not.toBe('')
        expect(part.observe).toHaveLength(3)
        expect(part.engineering).toHaveLength(3)
        expect(part.faults).toHaveLength(2)
      }
      expect(en.name).not.toBe(zh.name)
    }
  })
})

describe('complete grand prix hybrid curriculum', () => {
  it('fills every grand-prix learning, experiment, validation and diagnosis field without English-language leakage', () => {
    PART_IDS.forEach((id) => expectCompleteLesson(GRAND_PRIX_ENGINEERING_LESSONS[id]))
  })
  it('keeps all 18 systems isolated with 108 model subassemblies and bilingual facts', () => {
    for (const record of [GRAND_PRIX_PARTS, GRAND_PRIX_ENGINEERING_LESSONS, GRAND_PRIX_QUESTION_BANK, GRAND_PRIX_FORMULA_EXAMPLES]) {
      expect(sorted(Object.keys(record))).toEqual(sorted(PART_IDS))
    }
    let subassemblyCount = 0
    const uniqueFactFields = Object.fromEntries(
      (['position', 'role', 'principle', 'plain'] as const).flatMap((field) => [
        [`${field}-zh`, new Set<string>()], [`${field}-en`, new Set<string>()],
      ]),
    ) as Record<string, Set<string>>
    for (const id of PART_IDS) {
      const lesson = GRAND_PRIX_ENGINEERING_LESSONS[id]
      const facts = grandPrixWorkshopFacts(id, lesson)
      expect(lesson.subcomponents).toHaveLength(6)
      expect(facts).toHaveLength(6)
      facts.forEach((fact) => {
        for (const field of ['position', 'role', 'principle', 'plain'] as const) {
          expect(fact[field].zh.trim()).not.toBe('')
          expect(fact[field].en.trim()).not.toBe('')
          expect(fact[field].en).not.toMatch(/[\u3400-\u9fff]/)
          uniqueFactFields[`${field}-zh`]!.add(fact[field].zh)
          uniqueFactFields[`${field}-en`]!.add(fact[field].en)
        }
      })
      subassemblyCount += facts.length
    }
    expect(subassemblyCount).toBe(108)
    Object.values(uniqueFactFields).forEach((values) => expect(values.size).toBe(108))
  })

  it('contains 90 vehicle-specific questions without language leakage', () => {
    const ids = new Set<string>()
    const answerSlots = new Set<number>()
    for (const id of PART_IDS) {
      const questions = GRAND_PRIX_QUESTION_BANK[id]
      expect(questions).toHaveLength(5)
      expect(questions.map((question) => question.type)).toEqual(['concept', 'calculation', 'scenario', 'diagnosis', 'design'])
      questions.forEach((question) => {
        expect(ids.has(question.id)).toBe(false)
        ids.add(question.id)
        expect(question.options).toHaveLength(3)
        expect(question.answer).toBeGreaterThanOrEqual(0)
        expect(question.answer).toBeLessThan(3)
        expect(question.prompt.en).not.toMatch(/[\u3400-\u9fff]/)
        expect(question.explanation.en).not.toMatch(/[\u3400-\u9fff]/)
        expect(new Set(question.options.map((option) => option.zh)).size).toBe(3)
        expect(new Set(question.options.map((option) => option.en)).size).toBe(3)
        answerSlots.add(question.answer)
      })
    }
    expect(ids.size).toBe(90)
    expect(answerSlots).toEqual(new Set([0, 1, 2]))
  })

  it('renders 54 formulas and provides 54 manually distinct numeric scenarios', () => {
    const zhScenarios = new Set<string>()
    const enScenarios = new Set<string>()
    let formulaCount = 0
    for (const id of PART_IDS) {
      const formulas = GRAND_PRIX_ENGINEERING_LESSONS[id].formulas
      const examples = GRAND_PRIX_FORMULA_EXAMPLES[id]
      expect(formulas).toHaveLength(3)
      expect(examples).toHaveLength(3)
      expect(formulas).not.toBe(ENGINEERING_LESSONS[id].formulas)
      formulas.forEach((formula) => expect(ENGINEERING_LESSONS[id].formulas).not.toContain(formula))
      formulas.forEach((formula, index) => {
        const html = katex.renderToString(formula.latex, { displayMode: true, throwOnError: true, strict: false })
        expect(html).toContain('class="katex"')
        expect(html).not.toContain('katex-error')
        const example = examples[index]!
        expect(example.steps.length).toBeGreaterThanOrEqual(2)
        expect(example.result.zh).toMatch(/\d/)
        expect(example.result.en).toMatch(/\d/)
        expect(example.scenario.en).not.toMatch(/[\u3400-\u9fff]/)
        zhScenarios.add(example.scenario.zh)
        enScenarios.add(example.scenario.en)
        formulaCount += 1
      })
    }
    expect(formulaCount).toBe(54)
    expect(zhScenarios.size).toBe(54)
    expect(enScenarios.size).toBe(54)
  })

  it('evaluates all 16 full-size hybrid simulators with finite physical axes', () => {
    expect(sorted(Object.keys(GRAND_PRIX_LAB_MODELS))).toEqual(sorted(Object.keys(LAB_MODELS)))
    for (const [kind, model] of Object.entries(GRAND_PRIX_LAB_MODELS)) {
      const values = grandPrixInitialValues(kind as keyof typeof GRAND_PRIX_LAB_MODELS)
      const result = model.evaluate(values)
      expect(result.metrics).toHaveLength(4)
      expect(result.points.length).toBeGreaterThanOrEqual(20)
      result.metrics.forEach((metric) => expect(Number.isFinite(metric.value)).toBe(true))
      for (let index = 0; index < result.points.length; index += 1) {
        expect(Number.isFinite(result.points[index]!.x)).toBe(true)
        expect(Number.isFinite(result.points[index]!.y)).toBe(true)
        if (index > 0) expect(result.points[index]!.x).toBeGreaterThan(result.points[index - 1]!.x)
      }
    }
    const axis = (kind: keyof typeof GRAND_PRIX_LAB_MODELS) => {
      const points = GRAND_PRIX_LAB_MODELS[kind].evaluate(grandPrixInitialValues(kind)).points
      return [points[0]!.x, points.at(-1)!.x]
    }
    expect(axis('wing')).toEqual([80, 350])
    expect(axis('floor')).toEqual([18, 65])
    expect(axis('steering')).toEqual([5, 80])
    expect(axis('battery')).toEqual([50, 800])
    expect(axis('cooling')).toEqual([20, 100])
  })

  it('provides independent localized courses and part content for the second vehicle', () => {
    for (const course of COURSES) {
      const zh = getCourse(course, 'zh', 'grand-prix-2026')
      const en = getCourse(course, 'en', 'grand-prix-2026')
      expect(zh.title.trim()).not.toBe('')
      expect(en.title.trim()).not.toBe('')
      expect(en.title).not.toMatch(/[\u3400-\u9fff]/)
      expect(en.description).not.toMatch(/[\u3400-\u9fff]/)
      expect(en.options).toHaveLength(4)
    }
    for (const id of PART_IDS) {
      const student = getPart(id, 'en', 'student-ev')
      const grandPrix = getPart(id, 'en', 'grand-prix-2026')
      expect(grandPrix.name.trim()).not.toBe('')
      expect(grandPrix.name).not.toBe(student.name)
      expect(grandPrix.name).not.toMatch(/[\u3400-\u9fff]/)
      expect(grandPrix.short).not.toMatch(/[\u3400-\u9fff]/)
      expect(grandPrix.observe).toHaveLength(3)
      expect(grandPrix.engineering).toHaveLength(3)
      expect(grandPrix.faults).toHaveLength(2)
    }
  })
})
