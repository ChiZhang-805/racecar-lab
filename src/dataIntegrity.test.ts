import { describe, expect, it } from 'vitest'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
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
import { MUSIC_TRACKS } from './music'
import { VEHICLE_PART_ALIASES } from './vehicles'
import { GRAND_PRIX_TEAMS, GRAND_PRIX_TEAM_IDS, isGrandPrixTeamId } from './grandPrixTeams'
import { GRAND_PRIX_DRIVERS } from './grandPrixDrivers'
import { getGrandPrixTeamLens } from './grandPrixTeamLens'
import {
  coolingExperimentsFor,
  coolingFaultCardsFor,
  coolingReferenceCards,
  evaluateCoolingExperiment,
  initialCoolingValues,
  type CoolingExperiment,
  type CoolingExperimentResult,
} from './coolingInteractions'
import { partInteractionRegistry } from './partInteractionRegistry'
import { initialInteractionValues, type InteractionResult } from './interactionTypes'

const sorted = (values: readonly string[]) => [...values].sort()
const cjk = /[\u3400-\u9fff]/

const expectLocalText = (value: { zh: string; en: string }) => {
  expect(value.zh.trim()).not.toBe('')
  expect(value.en.trim()).not.toBe('')
  expect(value.en).not.toMatch(cjk)
}

const coolingMetric = (result: CoolingExperimentResult, id: string) => {
  const metric = result.metrics.find(item => item.id === id)
  expect(metric, `missing cooling metric: ${id}`).toBeDefined()
  return metric!.value
}

const coolingExperiment = (vehicleId: 'student-ev' | 'grand-prix-2026', id: CoolingExperiment['id']) => {
  const experiment = coolingExperimentsFor(vehicleId).find(item => item.id === id)
  expect(experiment, `missing cooling experiment: ${vehicleId}/${id}`).toBeDefined()
  return experiment!
}

const coolingResult = (
  vehicleId: 'student-ev' | 'grand-prix-2026',
  id: CoolingExperiment['id'],
  overrides: Record<string, number> = {},
) => {
  const experiment = coolingExperiment(vehicleId, id)
  return evaluateCoolingExperiment(experiment, { ...initialCoolingValues(experiment), ...overrides }, vehicleId)
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

  it('keeps the crash force-displacement curve energy-consistent', () => {
    const output = LAB_MODELS.impact.evaluate({ mass: 300, speed: 7, stroke: 260, progressive: 75 })
    const curveEnergy = output.points.slice(1).reduce((energy, point, index) => {
      const previous = output.points[index]!
      return energy + (point.y + previous.y) / 2 * (point.x - previous.x) * 1000
    }, 0)
    expect(curveEnergy).toBeCloseTo(output.metrics[0]!.value, 8)
  })

  it('keeps the full-size crash curve energy-consistent and peak-consistent', () => {
    const output = GRAND_PRIX_LAB_MODELS.impact.evaluate({ mass: 620, speed: 12, stroke: 620, progressive: 82 })
    const curveEnergy = output.points.slice(1).reduce((energy, point, index) => {
      const previous = output.points[index]!
      return energy + (point.y + previous.y) / 2 * (point.x - previous.x) * 1000
    }, 0)
    expect(curveEnergy).toBeCloseTo(output.metrics[0]!.value * 1000, 7)
    expect(Math.max(...output.points.map(point => point.y))).toBeCloseTo(output.metrics[2]!.value, 8)
  })

  it('keeps the 2026 hybrid deployment examples inside their declared electrical boundaries', () => {
    const deploy = GRAND_PRIX_FORMULA_EXAMPLES.battery[0]!
    expect(deploy.scenario.zh).toContain('10 s')
    expect(deploy.steps.some(step => step.zh.includes('3.276 MJ < 4 MJ'))).toBe(true)
    const combinedPower = GRAND_PRIX_FORMULA_EXAMPLES.motor[1]!
    expect(combinedPower.steps.some(step => step.zh.includes('350×0.94 = 329 kW'))).toBe(true)
    expect(combinedPower.result.zh).toContain('942 kW')
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

  it('keeps calculation distractors physically meaningful and diagnoses with validation actions', () => {
    for (const id of PART_IDS) {
      const questions = GRAND_PRIX_QUESTION_BANK[id]
      const calculation = questions[1]
      const diagnosis = questions[3]
      const lesson = GRAND_PRIX_ENGINEERING_LESSONS[id]

      expect(calculation.prompt.zh).toContain('量纲与物理')
      expect(calculation.prompt.en).toContain('dimensionally and physically')
      expect(calculation.options.some(option => option.zh.includes('错误路径'))).toBe(false)
      expect(diagnosis.prompt.zh).toContain(lesson.diagnostics[0].symptom.zh)
      expect(diagnosis.options[diagnosis.answer].zh).toContain(lesson.diagnostics[0].checks[0].zh)
      expect(diagnosis.options[diagnosis.answer].en).toContain(lesson.diagnostics[0].checks[0].en)
    }
  })

  it('documents vehicle-specific meanings for reused compatibility part ids', () => {
    expect(VEHICLE_PART_ALIASES['student-ev'].halo).toBe('formula-student-roll-hoops-and-cockpit-protection')
    expect(VEHICLE_PART_ALIASES['grand-prix-2026'].halo).toBe('fia-halo-and-cockpit-safety-structure')
    expect(VEHICLE_PART_ALIASES['student-ev'].motor).toBe('electric-traction-motor')
    expect(VEHICLE_PART_ALIASES['grand-prix-2026'].motor).toBe('v6-hybrid-power-unit')
    expect(VEHICLE_PART_ALIASES['student-ev'].differential).toBe('final-drive-differential')
    expect(VEHICLE_PART_ALIASES['grand-prix-2026'].differential).toBe('gearbox-differential-and-driveline')
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

  it('keeps the 2026 power-unit explanation aligned with FIA Issue 19 constraints', () => {
    const motor = GRAND_PRIX_ENGINEERING_LESSONS.motor
    expect(motor.overview.zh).toContain('1.6 L')
    expect(motor.overview.zh).toContain('90°')
    expect(motor.overview.zh).toContain('350 kW')
    expect(motor.overview.zh).toContain('车速函数')
    expect(motor.overview.zh).toContain('250 kW')
    expect(motor.overview.zh).toContain('SOC')
    expect(motor.overview.zh).not.toContain('4 月公布')
    expect(motor.overview.en).toContain('speed-dependent')
    expect(motor.overview.en).toContain('250 kW')
    expect(motor.overview.en).toContain('state-of-charge')
    expect(motor.overview.en).not.toContain('April 2026')
    expect(motor.concepts.map((item) => item.zh).join(' ')).not.toContain('350/250')
    expect(motor.concepts.map((item) => item.en).join(' ')).not.toContain('350/250')
  })

  it('provides four distinct public-evidence team study cars instead of paint-only interpretations', () => {
    expect(GRAND_PRIX_TEAM_IDS).toEqual(['ferrari', 'mclaren', 'mercedes', 'red-bull'])
    expect(new Set(GRAND_PRIX_TEAM_IDS.map(id => GRAND_PRIX_TEAMS[id].modelName)).size).toBe(4)
    expect(new Set(GRAND_PRIX_TEAM_IDS.map(id => GRAND_PRIX_TEAMS[id].palette.body)).size).toBe(4)

    const geometrySignatures = new Set<string>()
    const driverIds = new Set<string>()
    for (const id of GRAND_PRIX_TEAM_IDS) {
      const team = GRAND_PRIX_TEAMS[id]
      expect(team.id).toBe(id)
      expect(isGrandPrixTeamId(id)).toBe(true)
      expect(team.teamName.trim()).not.toBe('')
      expect(team.modelName.trim()).not.toBe('')
      expectLocalText(team.name)
      expectLocalText(team.snapshot)
      expectLocalText(team.signature)
      expectLocalText(team.designQuestion)

      expect(Object.values(team.palette).every(value => typeof value === 'number' || /^#[0-9a-f]{6}$/i.test(value))).toBe(true)
      expect(team.palette.roughness).toBeGreaterThan(0)
      expect(team.palette.roughness).toBeLessThan(1)
      expect(team.palette.metalness).toBeGreaterThanOrEqual(0)
      expect(team.palette.metalness).toBeLessThanOrEqual(1)

      const geometryValues = Object.values(team.geometry)
      expect(geometryValues.every(Number.isFinite)).toBe(true)
      expect(team.geometry.floorBoardCount).toBeGreaterThanOrEqual(2)
      expect(team.geometry.floorBoardCount).toBeLessThanOrEqual(4)
      expect(team.geometry.sidepodWidth).toBeGreaterThan(0.45)
      expect(team.geometry.sidepodWidth).toBeLessThan(0.8)
      geometrySignatures.add(JSON.stringify([
        team.geometry.noseRearRadius,
        team.geometry.cockpitOffset,
        team.geometry.sidepodWidth,
        team.geometry.engineCoverHeight,
        team.geometry.powerUnitWidth,
      ]))

      expect(team.facts).toHaveLength(4)
      expect(new Set(team.facts.map(fact => fact.evidence))).toEqual(new Set(['official-spec', 'public-observation', 'educational-inference']))
      team.facts.forEach((fact) => {
        expectLocalText(fact.label)
        expectLocalText(fact.value)
        expectLocalText(fact.detail)
      })

      expect(team.sources.length).toBeGreaterThanOrEqual(3)
      expect(team.sources.some(source => source.kind === 'regulation')).toBe(true)
      expect(team.sources.some(source => source.kind === 'team')).toBe(true)
      team.sources.forEach((source) => {
        expectLocalText(source.label)
        expect(source.url).toMatch(/^https:\/\//)
      })
      const drivers = GRAND_PRIX_DRIVERS[id]
      expect(drivers).toHaveLength(2)
      drivers.forEach((driver) => {
        expect(driver.teamId).toBe(id)
        expect(driverIds.has(driver.id)).toBe(false)
        driverIds.add(driver.id)
        expect(driver.number).toBeGreaterThan(0)
        expect(driver.number).toBeLessThan(100)
        expect(driver.name.trim()).not.toBe('')
        expectLocalText(driver.nationality)
        expectLocalText(driver.intro)
        expect(driver.intro.zh.length).toBeGreaterThan(65)
        expect(driver.intro.en.length).toBeGreaterThan(180)
        expect(driver.image).toMatch(/^\/images\/drivers\/.+\.jpg$/)
        const imagePath = join(process.cwd(), 'public', driver.image.replace(/^\//, ''))
        expect(existsSync(imagePath), `missing driver photo: ${driver.image}`).toBe(true)
        expect(statSync(imagePath).size).toBeGreaterThan(100_000)
        expect(driver.profileUrl).toMatch(/^https:\/\/www\.formula1\.com\/en\/drivers\//)
        expect(driver.photo.author.trim()).not.toBe('')
        expect(driver.photo.sourceUrl).toMatch(/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/)
        expect(driver.photo.license.trim()).not.toBe('')
        expect(driver.photo.licenseUrl).toMatch(/^https:\/\//)
      })
      PART_IDS.forEach((partId) => {
        const lens = getGrandPrixTeamLens(id, partId)
        expect(['official-spec', 'public-observation', 'educational-inference']).toContain(lens.evidence)
        expectLocalText(lens.text)
      })
    }
    expect(driverIds.size).toBe(8)
    expect(geometrySignatures.size).toBe(4)
    expect(GRAND_PRIX_TEAMS.mclaren.facts[0]!.value.en).toBe(GRAND_PRIX_TEAMS.mercedes.facts[0]!.value.en)
    expect(GRAND_PRIX_TEAMS.ferrari.facts[0]!.value.en).not.toBe(GRAND_PRIX_TEAMS['red-bull'].facts[0]!.value.en)
    expect(isGrandPrixTeamId('unknown')).toBe(false)
    expect(isGrandPrixTeamId(null)).toBe(false)
  })
})

describe('runtime media configuration', () => {
  it('keeps the eight configured music tracks localized and mapped to MP3 paths', () => {
    expect(MUSIC_TRACKS).toHaveLength(8)
    const ids = new Set<string>()
    MUSIC_TRACKS.forEach((track) => {
      expect(ids.has(track.id)).toBe(false)
      ids.add(track.id)
      expect(track.title.zh.trim()).not.toBe('')
      expect(track.title.en.trim()).not.toBe('')
      expect(track.title.en).not.toMatch(cjk)
      expect(track.file).toMatch(/^\/audio\/.+\.mp3$/)
      const diskPath = join(process.cwd(), 'public', track.file.replace(/^\//, ''))
      expect(existsSync(diskPath)).toBe(true)
      expect(statSync(diskPath).size).toBeGreaterThan(1024)
    })
  })
})

describe('interactive cooling curriculum', () => {
  const vehicleIds = ['student-ev', 'grand-prix-2026'] as const

  it('provides five distinct, localized experiments for both vehicles', () => {
    for (const vehicleId of vehicleIds) {
      const experiments = coolingExperimentsFor(vehicleId)
      expect(experiments).toHaveLength(5)
      expect(new Set(experiments.map((experiment) => experiment.id)).size).toBe(5)
      expect(new Set(experiments.map((experiment) => experiment.mode)).size).toBe(5)
      expect(new Set(experiments.map((experiment) => experiment.parameters.map((parameter) => parameter.key).join('|'))).size).toBe(5)

      for (const experiment of experiments) {
        expectLocalText(experiment.title)
        expectLocalText(experiment.question)
        expect(experiment.parameters.length).toBeGreaterThanOrEqual(3)
        expect(experiment.parameters.length).toBeLessThanOrEqual(4)
        expect(new Set(experiment.parameters.map((parameter) => parameter.key)).size).toBe(experiment.parameters.length)
        experiment.parameters.forEach((parameter) => {
          expectLocalText(parameter.label)
          expect(parameter.min).toBeLessThan(parameter.max)
          expect(parameter.step).toBeGreaterThan(0)
          expect(parameter.initial).toBeGreaterThanOrEqual(parameter.min)
          expect(parameter.initial).toBeLessThanOrEqual(parameter.max)
          expect(parameter.unit.trim()).not.toBe('')
        })

        const result = evaluateCoolingExperiment(experiment, initialCoolingValues(experiment), vehicleId)
        expect(result.metrics).toHaveLength(4)
        expect(new Set(result.metrics.map((metric) => metric.id)).size).toBe(4)
        expectLocalText(result.observation)
        result.metrics.forEach((metric) => {
          expectLocalText(metric.label)
          expect(Number.isFinite(metric.value)).toBe(true)
          expect(metric.unit.trim()).not.toBe('')
        })
        for (const value of [result.visual.heat, result.visual.coolant, result.visual.airflow, result.visual.pressure, result.visual.hot, result.visual.cold]) {
          expect(Number.isFinite(value)).toBe(true)
        }
      }
    }
  })

  it('provides three unique reference cards and three vehicle-specific fault cards', () => {
    expect(coolingReferenceCards).toHaveLength(3)
    expect(new Set(coolingReferenceCards.map((card) => card.id)).size).toBe(3)
    expect(new Set(coolingReferenceCards.map((card) => card.image)).size).toBe(3)
    expect(new Set(coolingReferenceCards.map((card) => card.url)).size).toBe(3)
    coolingReferenceCards.forEach((card) => {
      expectLocalText(card.title)
      expectLocalText(card.imageAlt)
      expectLocalText(card.summary)
      expectLocalText(card.purpose)
      expectLocalText(card.sourceTitle)
      expect(card.details).toHaveLength(3)
      card.details.forEach(expectLocalText)
      expect(card.url).toMatch(/^https:\/\//)
    })

    for (const vehicleId of vehicleIds) {
      const cards = coolingFaultCardsFor(vehicleId)
      expect(cards).toHaveLength(3)
      expect(new Set(cards.map((card) => card.id)).size).toBe(3)
      expect(new Set(cards.map((card) => card.image)).size).toBe(3)
      cards.forEach((card) => {
        expectLocalText(card.title)
        expectLocalText(card.imageAlt)
        expectLocalText(card.scenario)
        expectLocalText(card.strategy)
        expectLocalText(card.principle)
        expectLocalText(card.evidence)
        expect(card.scenario.zh).toMatch(/\d/)
        expect(card.scenario.en).toMatch(/\d/)
      })
    }
  })

  it('ships six distinct cooling illustrations rather than repeated placeholders', () => {
    const cards = [...coolingReferenceCards, ...coolingFaultCardsFor('student-ev')]
    expect(cards).toHaveLength(6)
    expect(new Set(cards.map((card) => card.image)).size).toBe(6)

    const hashes = new Set<string>()
    cards.forEach((card) => {
      expect(card.image).toMatch(/^\/images\/cooling\/.+\.webp$/)
      const diskPath = join(process.cwd(), 'public', card.image.replace(/^\/+/, ''))
      expect(existsSync(diskPath), `missing cooling illustration: ${card.image}`).toBe(true)
      expect(statSync(diskPath).size, `cooling illustration is unexpectedly small: ${card.image}`).toBeGreaterThan(50_000)
      hashes.add(createHash('sha256').update(readFileSync(diskPath)).digest('hex'))
    })
    expect(hashes.size).toBe(6)
  })

  it('keeps heat-balance trends thermodynamically consistent', () => {
    for (const vehicleId of vehicleIds) {
      const experiment = coolingExperiment(vehicleId, 'energy-balance')
      const heat = experiment.parameters.find((parameter) => parameter.key === 'heat')!
      const flow = experiment.parameters.find((parameter) => parameter.key === 'flow')!
      const ambient = experiment.parameters.find((parameter) => parameter.key === 'ambient')!
      const lowFlow = coolingResult(vehicleId, 'energy-balance', { flow: flow.min })
      const highFlow = coolingResult(vehicleId, 'energy-balance', { flow: flow.max })
      expect(coolingMetric(highFlow, 'coolant-rise')).toBeLessThan(coolingMetric(lowFlow, 'coolant-rise'))
      expect(coolingMetric(highFlow, 'hot-outlet')).toBeLessThan(coolingMetric(lowFlow, 'hot-outlet'))

      const lowHeat = coolingResult(vehicleId, 'energy-balance', { heat: heat.min })
      const highHeat = coolingResult(vehicleId, 'energy-balance', { heat: heat.max })
      expect(coolingMetric(highHeat, 'coolant-rise')).toBeGreaterThan(coolingMetric(lowHeat, 'coolant-rise'))
      expect(coolingMetric(highHeat, 'hot-outlet')).toBeGreaterThan(coolingMetric(lowHeat, 'hot-outlet'))

      const coolAmbient = coolingResult(vehicleId, 'energy-balance', { ambient: ambient.min })
      const hotAmbient = coolingResult(vehicleId, 'energy-balance', { ambient: ambient.max })
      expect(coolingMetric(hotAmbient, 'hot-outlet')).toBeGreaterThan(coolingMetric(coolAmbient, 'hot-outlet'))
    }
  })

  it('solves the pump and system curves in the physically correct direction', () => {
    for (const vehicleId of vehicleIds) {
      const lowCommand = coolingResult(vehicleId, 'pump-system', { pumpDuty: 30 })
      const highCommand = coolingResult(vehicleId, 'pump-system', { pumpDuty: 100 })
      expect(coolingMetric(highCommand, 'flow')).toBeGreaterThan(coolingMetric(lowCommand, 'flow'))

      const openLoop = coolingResult(vehicleId, 'pump-system', { resistance: 40 })
      const restrictedLoop = coolingResult(vehicleId, 'pump-system', { resistance: 180 })
      expect(coolingMetric(restrictedLoop, 'flow')).toBeLessThan(coolingMetric(openLoop, 'flow'))
      for (const id of ['pressure', 'hydraulic-power', 'shaft-power']) {
        expect(coolingMetric(restrictedLoop, id)).toBeGreaterThanOrEqual(0)
      }
      expect(restrictedLoop.visual.workingPoint).toBeDefined()
      expect(restrictedLoop.visual.pumpCurve?.length).toBeGreaterThanOrEqual(20)
      expect(restrictedLoop.visual.systemCurve?.length).toBe(restrictedLoop.visual.pumpCurve?.length)
    }
  })

  it('models radiator airflow, leakage and blockage without reversing their effects', () => {
    const studentLowAir = coolingResult('student-ev', 'radiator-airside', { fanDuty: 20, ductSeal: 40, blockage: 0 })
    const studentHighAir = coolingResult('student-ev', 'radiator-airside', { fanDuty: 100, ductSeal: 100, blockage: 0 })
    expect(coolingMetric(studentHighAir, 'effective-air')).toBeGreaterThan(coolingMetric(studentLowAir, 'effective-air'))
    expect(coolingMetric(studentHighAir, 'coolant-out')).toBeLessThan(coolingMetric(studentLowAir, 'coolant-out'))
    const studentBlocked = coolingResult('student-ev', 'radiator-airside', { fanDuty: 100, ductSeal: 100, blockage: 55 })
    expect(coolingMetric(studentBlocked, 'coolant-out')).toBeGreaterThan(coolingMetric(studentHighAir, 'coolant-out'))

    const gpLowAir = coolingResult('grand-prix-2026', 'radiator-airside', { vehicleSpeed: 30, coolingOpening: 30, blockage: 0 })
    const gpHighAir = coolingResult('grand-prix-2026', 'radiator-airside', { vehicleSpeed: 340, coolingOpening: 100, blockage: 0 })
    expect(coolingMetric(gpHighAir, 'effective-air')).toBeGreaterThan(coolingMetric(gpLowAir, 'effective-air'))
    expect(coolingMetric(gpHighAir, 'coolant-out')).toBeLessThan(coolingMetric(gpLowAir, 'coolant-out'))
    const gpBlocked = coolingResult('grand-prix-2026', 'radiator-airside', { vehicleSpeed: 340, coolingOpening: 100, blockage: 55 })
    expect(coolingMetric(gpBlocked, 'coolant-out')).toBeGreaterThan(coolingMetric(gpHighAir, 'coolant-out'))

    for (const result of [studentLowAir, studentHighAir, studentBlocked, gpLowAir, gpHighAir, gpBlocked]) {
      expect(coolingMetric(result, 'coolant-out')).toBeGreaterThan(30)
    }
  })

  it('redistributes parallel-branch flow and exposes the resulting hot branch', () => {
    for (const vehicleId of vehicleIds) {
      const open = coolingResult(vehicleId, 'branch-balance', { inverterValve: 100 })
      const restricted = coolingResult(vehicleId, 'branch-balance', { inverterValve: 15 })
      expect(coolingMetric(restricted, 'branch-two')).toBeLessThan(coolingMetric(open, 'branch-two'))
      expect(coolingMetric(restricted, 'hottest')).toBeGreaterThan(coolingMetric(open, 'hottest'))
      expect(restricted.visual.branches).toHaveLength(3)
      restricted.visual.branches!.forEach((branch) => {
        expect(Number.isFinite(branch)).toBe(true)
        expect(branch).toBeGreaterThanOrEqual(0)
        expect(branch).toBeLessThanOrEqual(1)
      })
    }
  })

  it('keeps lap-transient peak and recovery responses physically ordered', () => {
    for (const vehicleId of vehicleIds) {
      const experiment = coolingExperiment(vehicleId, 'lap-transient')
      const peakHeat = experiment.parameters.find((parameter) => parameter.key === 'peakHeat')!
      const lowHeat = coolingResult(vehicleId, 'lap-transient', { peakHeat: peakHeat.min })
      const highHeat = coolingResult(vehicleId, 'lap-transient', { peakHeat: peakHeat.max })
      expect(coolingMetric(highHeat, 'peak-temperature')).toBeGreaterThan(coolingMetric(lowHeat, 'peak-temperature'))

      const weakRecovery = coolingResult(vehicleId, 'lap-transient', { recovery: 30 })
      const strongRecovery = coolingResult(vehicleId, 'lap-transient', { recovery: 100 })
      expect(coolingMetric(strongRecovery, 'recovery-temperature')).toBeLessThan(coolingMetric(weakRecovery, 'recovery-temperature'))
      expect(strongRecovery.visual.timeline?.length).toBeGreaterThanOrEqual(80)
    }
  })

  it('remains finite at every experiment boundary for both vehicle models', () => {
    for (const vehicleId of vehicleIds) {
      for (const experiment of coolingExperimentsFor(vehicleId)) {
        const boundarySets = [
          Object.fromEntries(experiment.parameters.map((parameter) => [parameter.key, parameter.min])),
          Object.fromEntries(experiment.parameters.map((parameter) => [parameter.key, parameter.max])),
        ]
        for (const values of boundarySets) {
          const result = evaluateCoolingExperiment(experiment, values, vehicleId)
          result.metrics.forEach((metric) => expect(Number.isFinite(metric.value), `${vehicleId}/${experiment.id}/${metric.id}`).toBe(true))
          for (const value of [result.visual.heat, result.visual.coolant, result.visual.airflow, result.visual.pressure, result.visual.hot, result.visual.cold]) {
            expect(Number.isFinite(value), `${vehicleId}/${experiment.id}`).toBe(true)
          }
          expect(result.visual.pressure).toBeGreaterThanOrEqual(0)
        }
      }
    }
  })
})

describe('interactive curriculum for every non-cooling assembly', () => {
  const vehicleIds = ['student-ev', 'grand-prix-2026'] as const
  const interactivePartIds = PART_IDS.filter(partId => partId !== 'cooling')
  type InteractivePartId = Exclude<(typeof PART_IDS)[number], 'cooling'>

  const interactionResult = (
    partId: InteractivePartId,
    vehicleId: (typeof vehicleIds)[number],
    experimentId: string,
    overrides: Record<string, number> = {},
  ) => {
    const experiment = partInteractionRegistry[partId]!.experimentsFor(vehicleId).find(item => item.id === experimentId)
    expect(experiment, `missing interaction experiment: ${partId}/${vehicleId}/${experimentId}`).toBeDefined()
    return experiment!.evaluate({ ...initialInteractionValues(experiment!), ...overrides })
  }

  const interactionMetric = (result: InteractionResult, id: string) => {
    const value = result.metrics.find(metric => metric.id === id)
    expect(value, `missing interaction metric: ${id}`).toBeDefined()
    return value!.value
  }

  it('registers every non-cooling assembly exactly once', () => {
    expect(Object.keys(partInteractionRegistry).sort()).toEqual([...interactivePartIds].sort())
  })

  it('does not misapply the Formula Student 80 kW drive-power cap to regeneration', () => {
    const cases = [
      ['inverter', 'inverter-regen-overvoltage', 'regenPower'],
      ['ecu', 'ecu-torque-arbitration', 'rechargeLimit'],
      ['brakes', 'regen-blend', 'regenLimit'],
    ] as const

    for (const [partId, experimentId, parameterId] of cases) {
      const experiment = partInteractionRegistry[partId]!.experimentsFor('student-ev').find(item => item.id === experimentId)
      expect(experiment, `missing Formula Student regeneration experiment: ${partId}/${experimentId}`).toBeDefined()
      const parameter = experiment!.parameters.find(item => item.key === parameterId)
      expect(parameter, `missing Formula Student regeneration parameter: ${partId}/${experimentId}/${parameterId}`).toBeDefined()
      expect(parameter!.max).toBeGreaterThan(80)
    }
  })

  it('keeps all 180 nominal experiment states out of danger', () => {
    let count = 0
    for (const vehicleId of vehicleIds) {
      for (const partId of interactivePartIds) {
        for (const experiment of partInteractionRegistry[partId]!.experimentsFor(vehicleId)) {
          const output = experiment.evaluate(initialInteractionValues(experiment))
          output.metrics.forEach(metric => expect(metric.tone, `${partId}/${vehicleId}/${experiment.id}/${metric.id}`).not.toBe('danger'))
          count += 1
        }
      }
      for (const experiment of coolingExperimentsFor(vehicleId)) {
        const output = evaluateCoolingExperiment(experiment, initialCoolingValues(experiment), vehicleId)
        output.metrics.forEach(metric => expect(metric.tone, `cooling/${vehicleId}/${experiment.id}/${metric.id}`).not.toBe('danger'))
        count += 1
      }
    }
    expect(count).toBe(180)
  })

  it('keeps corrected nominal engineering quantities in credible teaching windows', () => {
    for (const vehicleId of vehicleIds) {
      const frontWing = interactionResult('front-wing', vehicleId, 'stiffness-deflection')
      expect(interactionMetric(frontWing, 'deflection')).toBeGreaterThan(0)
      expect(interactionMetric(frontWing, 'deflection')).toBeLessThan(15)

      const rearWing = interactionResult('rear-wing', vehicleId, 'pylon-flap-aeroelasticity')
      expect(interactionMetric(rearWing, 'load-error')).toBeLessThan(30)

      const cell = interactionResult('monocoque', vehicleId, 'side-floor-equivalence')
      expect(interactionMetric(cell, 'deflection')).toBeLessThan(25)
      expect(interactionMetric(cell, 'margin')).toBeGreaterThan(10)

      const nosePulse = interactionResult('nose', vehicleId, 'force-stroke-shaping')
      expect(interactionMetric(nosePulse, 'peak-g')).toBeLessThan(vehicleId === 'grand-prix-2026' ? 38 : 32)
      expect(interactionMetric(nosePulse, 'quality')).toBeGreaterThan(65)
      const noseMount = interactionResult('nose', vehicleId, 'wing-mount-repeatability')
      expect(interactionMetric(noseMount, 'repeatability')).toBeGreaterThan(65)

      const tyre = interactionResult('tires', vehicleId, 'thermal-pressure-transient')
      expect(interactionMetric(tyre, 'carcass-temperature')).toBeGreaterThan(vehicleId === 'grand-prix-2026' ? 75 : 50)
      expect(interactionMetric(tyre, 'grip-window')).toBeGreaterThan(75)

      const steering = interactionResult('steering', vehicleId, 'steering-effort')
      expect(interactionMetric(steering, 'hand-torque')).toBeGreaterThan(5)
      expect(interactionMetric(steering, 'hand-torque')).toBeLessThan(28)

      const battery = interactionResult('battery', vehicleId, 'battery-soc-ledger')
      expect(interactionMetric(battery, 'true-soc')).toBeGreaterThan(20)
      expect(interactionMetric(battery, 'true-soc')).toBeLessThan(60)

      const inverter = interactionResult('inverter', vehicleId, 'inverter-voltage-utilisation')
      expect(interactionMetric(inverter, 'voltage-margin')).toBeGreaterThan(0)

      const motor = interactionResult('motor', vehicleId, 'motor-efficiency-map')
      expect(interactionMetric(motor, 'motor-efficiency')).toBeGreaterThan(94)
      expect(interactionMetric(motor, 'motor-efficiency')).toBeLessThan(98.5)
      expect(interactionMetric(motor, 'copper-loss')).toBeGreaterThan(vehicleId === 'grand-prix-2026' ? .7 : .25)

      const gearing = interactionResult('motor', vehicleId, 'motor-wheel-force')
      expect(interactionMetric(gearing, 'top-speed')).toBeGreaterThan(vehicleId === 'grand-prix-2026' ? 250 : 140)
      expect(interactionMetric(gearing, 'top-speed')).toBeLessThan(vehicleId === 'grand-prix-2026' ? 350 : 210)
      expect(interactionMetric(gearing, 'grip-margin')).toBeGreaterThan(0)

      const canBus = interactionResult('ecu', vehicleId, 'ecu-can-age')
      expect(interactionMetric(canBus, 'bus-load')).toBeGreaterThan(35)
      expect(interactionMetric(canBus, 'bus-load')).toBeLessThan(65)
      expect(interactionMetric(canBus, 'stale-signals')).toBe(0)

      const timeSync = interactionResult('sensors', vehicleId, 'sensor-time-sync')
      expect(interactionMetric(timeSync, 'power-balance')).toBeGreaterThan(90)
    }
  })

  it('preserves the corrected nonlinear and precedence-sensitive trends', () => {
    const deadTimeZero = interactionResult('inverter', 'student-ev', 'inverter-dead-time', { phaseCurrent: 0 })
    const deadTimeLoaded = interactionResult('inverter', 'student-ev', 'inverter-dead-time', { phaseCurrent: 120 })
    expect(interactionMetric(deadTimeZero, 'torque-ripple')).toBe(0)
    expect(interactionMetric(deadTimeLoaded, 'torque-ripple')).toBeGreaterThan(0)

    const oilCold = interactionResult('differential', 'grand-prix-2026', 'differential-oil', { oilTemp: 20 })
    const oilHot = interactionResult('differential', 'grand-prix-2026', 'differential-oil', { oilTemp: 160 })
    expect(interactionMetric(oilCold, 'viscosity')).toBeGreaterThan(interactionMetric(oilHot, 'viscosity'))

    const wingLowLoad = interactionResult('front-wing', 'student-ev', 'stiffness-deflection', { force: 100 })
    const wingHighLoad = interactionResult('front-wing', 'student-ev', 'stiffness-deflection', { force: 900 })
    expect(interactionMetric(wingHighLoad, 'deflection')).toBeGreaterThan(interactionMetric(wingLowLoad, 'deflection'))

    const longRatio = interactionResult('motor', 'student-ev', 'motor-wheel-force', { ratio: 7 })
    const shortRatio = interactionResult('motor', 'student-ev', 'motor-wheel-force', { ratio: 16 })
    expect(interactionMetric(longRatio, 'top-speed')).toBeGreaterThan(interactionMetric(shortRatio, 'top-speed'))

    const canFast = interactionResult('ecu', 'student-ev', 'ecu-can-age', { bitrate: 1 })
    const canSlow = interactionResult('ecu', 'student-ev', 'ecu-can-age', { bitrate: .5 })
    expect(interactionMetric(canSlow, 'bus-load')).toBeGreaterThan(interactionMetric(canFast, 'bus-load'))
  })

  it('enforces conservation, thermal closed forms and tyre grip limits', () => {
    const sag = interactionResult('battery', 'grand-prix-2026', 'battery-voltage-sag', { soc: 60, resistance: 48, temperature: 25 })
    const sagOpenCircuitVoltage = 800 * (.88 + .15 * .6)
    for (const point of sag.points) {
      const requestedPower = point.x * 350_000
      const discriminant = sagOpenCircuitVoltage ** 2 - 4 * .048 * requestedPower
      const expectedVoltage = (sagOpenCircuitVoltage + Math.sqrt(discriminant)) / 2
      expect(point.y).toBeCloseTo(expectedVoltage, 8)
    }

    const safeThermal = interactionResult('motor', 'student-ev', 'motor-thermal-transient', { load: 10, cooling: 100 })
    expect(interactionMetric(safeThermal, 'remaining-time')).toBe(600)
    const thermalAt60 = interactionResult('motor', 'student-ev', 'motor-thermal-transient', { load: 60, cooling: 20, duration: 60 })
    const thermalAt120 = interactionResult('motor', 'student-ev', 'motor-thermal-transient', { load: 60, cooling: 20, duration: 120 })
    expect(interactionMetric(thermalAt60, 'remaining-time') - interactionMetric(thermalAt120, 'remaining-time')).toBeCloseTo(60, 0)

    for (const vehicleId of vehicleIds) {
      const total = vehicleId === 'grand-prix-2026' ? 140 : 45
      for (const offset of [vehicleId === 'grand-prix-2026' ? -220 : -180, vehicleId === 'grand-prix-2026' ? 220 : 180]) {
        const reactions = interactionResult('halo', vehicleId, 'mount-load-sharing', { offset, direction: 90 })
        const front = interactionMetric(reactions, 'front')
        const left = interactionMetric(reactions, 'rear-left')
        const right = interactionMetric(reactions, 'rear-right')
        expect(front).toBeGreaterThanOrEqual(0)
        expect(left).toBeGreaterThanOrEqual(0)
        expect(right).toBeGreaterThanOrEqual(0)
        expect(front + left + right).toBeCloseTo(total, 8)
      }
    }

    const frequency = 400
    const ripple = .1
    const skew = .0002
    const phase = 2 * Math.PI * frequency * skew
    const correlatedRipple = .1 * ripple / 2
    const expectedPowerError = correlatedRipple * (1 - Math.cos(phase)) / (1 + correlatedRipple) * 100
    const timeSync = interactionResult('sensors', 'student-ev', 'sensor-time-sync', { rippleFrequency: frequency, ripple: ripple * 100, skew: skew * 1000, sampleRate: 1000 })
    expect(interactionMetric(timeSync, 'power-error')).toBeCloseTo(expectedPowerError, 2)
    expect(interactionMetric(timeSync, 'energy-error')).toBeCloseTo(expectedPowerError, 2)

    const openDiff = interactionResult('differential', 'student-ev', 'differential-locking', { inputTorque: 180, insideLoad: 200, rearLoad: 600, preload: 0, locking: 0 })
    const lockedDiff = interactionResult('differential', 'student-ev', 'differential-locking', { inputTorque: 180, insideLoad: 200, rearLoad: 600, preload: 0, locking: 80 })
    const outsideCap = (600 - 200) * 1.35 * .24
    expect(interactionMetric(lockedDiff, 'outside-torque')).toBeGreaterThan(interactionMetric(openDiff, 'outside-torque'))
    expect(interactionMetric(lockedDiff, 'outside-torque')).toBeLessThanOrEqual(outsideCap + .1)
    expect(interactionMetric(lockedDiff, 'inside-torque') + interactionMetric(lockedDiff, 'outside-torque')).toBeLessThanOrEqual(180.1)

    const oil = interactionResult('differential', 'student-ev', 'differential-oil', { oilTemp: 75, speed: 5000, torque: 160, fill: 100 })
    const inputPower = 160 * 5000 * Math.PI / 30 / 1000
    const reportedLoss = inputPower * (100 - interactionMetric(oil, 'efficiency')) / 100
    const expectedLoss = interactionMetric(oil, 'churn-loss') + inputPower * .025
    expect(reportedLoss).toBeCloseTo(expectedLoss, 1)

    const highGrip = interactionResult('tires', 'student-ev', 'combined-slip', { longitudinalDemand: -35, lateralDemand: 65, gripScale: 100, normalLoad: 850 })
    const lowGrip = interactionResult('tires', 'student-ev', 'combined-slip', { longitudinalDemand: -35, lateralDemand: 65, gripScale: 40, normalLoad: 850 })
    const lowGripForce = Math.hypot(interactionMetric(lowGrip, 'actual-fx'), interactionMetric(lowGrip, 'actual-fy'))
    expect(lowGripForce).toBeLessThanOrEqual(1.4 * 850 * .4 + .1)
    expect(interactionMetric(lowGrip, 'friction-utilisation')).toBeGreaterThan(interactionMetric(highGrip, 'friction-utilisation'))
    expect(interactionMetric(lowGrip, 'lateral-reserve')).toBeLessThan(interactionMetric(highGrip, 'lateral-reserve'))
  })

  it('provides five distinct, bilingual experiments with finite boundary behaviour', () => {
    for (const partId of interactivePartIds) {
      const pack = partInteractionRegistry[partId]
      expect(pack, `missing interaction pack: ${partId}`).toBeDefined()
      expect(pack!.partId).toBe(partId)
      expect(pack!.theme).toMatch(/^#[0-9a-f]{6}$/i)

      for (const vehicleId of vehicleIds) {
        const experiments = pack!.experimentsFor(vehicleId)
        expect(experiments, `${partId}/${vehicleId}`).toHaveLength(5)
        expect(new Set(experiments.map(experiment => experiment.id)).size).toBe(5)

        for (const experiment of experiments) {
          expectLocalText(experiment.title)
          expectLocalText(experiment.question)
          expect(experiment.parameters.length).toBeGreaterThanOrEqual(2)
          expect(new Set(experiment.parameters.map(parameter => parameter.key)).size).toBe(experiment.parameters.length)
          experiment.parameters.forEach(parameter => {
            expectLocalText(parameter.label)
            expect(Number.isFinite(parameter.min)).toBe(true)
            expect(Number.isFinite(parameter.max)).toBe(true)
            expect(Number.isFinite(parameter.step)).toBe(true)
            expect(Number.isFinite(parameter.initial)).toBe(true)
            expect(parameter.min).toBeLessThan(parameter.max)
            expect(parameter.initial).toBeGreaterThanOrEqual(parameter.min)
            expect(parameter.initial).toBeLessThanOrEqual(parameter.max)
            expect(parameter.step).toBeGreaterThan(0)
            expect(parameter.unit.trim()).not.toBe('')
          })

          const valueSets = [
            initialInteractionValues(experiment),
            Object.fromEntries(experiment.parameters.map(parameter => [parameter.key, parameter.min])),
            Object.fromEntries(experiment.parameters.map(parameter => [parameter.key, parameter.max])),
            Object.fromEntries(experiment.parameters.map(parameter => [parameter.key, Number.NaN])),
          ]
          for (const values of valueSets) {
            const result = experiment.evaluate(values)
            expect(result.metrics.length, `${partId}/${vehicleId}/${experiment.id}`).toBeGreaterThanOrEqual(3)
            expect(new Set(result.metrics.map(metric => metric.id)).size).toBe(result.metrics.length)
            result.metrics.forEach(metric => {
              expectLocalText(metric.label)
              expect(Number.isFinite(metric.value), `${partId}/${vehicleId}/${experiment.id}/${metric.id}`).toBe(true)
              expect(metric.unit.trim()).not.toBe('')
            })
            expectLocalText(result.insight)
            expect(result.points.length).toBeGreaterThanOrEqual(2)
            for (const point of [...result.points, ...(result.secondaryPoints ?? [])]) {
              expect(Number.isFinite(point.x)).toBe(true)
              expect(Number.isFinite(point.y)).toBe(true)
            }
            expect(result.visual.labels.length).toBe(result.visual.values.length)
            result.visual.labels.forEach(expectLocalText)
            result.visual.values.forEach(value => {
              expect(Number.isFinite(value)).toBe(true)
              expect(value).toBeGreaterThanOrEqual(0)
              expect(value).toBeLessThanOrEqual(1)
            })
            if (result.visual.marker !== undefined) {
              expect(result.visual.marker).toBeGreaterThanOrEqual(0)
              expect(result.visual.marker).toBeLessThanOrEqual(1)
            }
            if (result.visual.risk !== undefined) {
              expect(result.visual.risk).toBeGreaterThanOrEqual(0)
              expect(result.visual.risk).toBeLessThanOrEqual(1)
            }
            if (result.visual.direction !== undefined) {
              expect(result.visual.direction).toBeGreaterThanOrEqual(-1)
              expect(result.visual.direction).toBeLessThanOrEqual(1)
            }
          }
        }
      }
    }
  })

  it('provides three professional references and three vehicle-specific fault scenarios per assembly', () => {
    for (const partId of interactivePartIds) {
      const pack = partInteractionRegistry[partId]!
      expect(pack.referenceCards).toHaveLength(3)
      expect(new Set(pack.referenceCards.map(card => card.id)).size).toBe(3)
      expect(new Set(pack.referenceCards.map(card => card.image)).size).toBe(3)
      for (const card of pack.referenceCards) {
        expectLocalText(card.title)
        expectLocalText(card.imageAlt)
        expectLocalText(card.summary)
        expectLocalText(card.purpose)
        expectLocalText(card.sourceTitle)
        expect(card.details).toHaveLength(3)
        card.details.forEach(expectLocalText)
        expect(card.url).toMatch(/^https:\/\//)
      }

      for (const vehicleId of vehicleIds) {
        const faultCards = pack.faultCardsFor(vehicleId)
        expect(faultCards, `${partId}/${vehicleId}`).toHaveLength(3)
        expect(new Set(faultCards.map(card => card.id)).size).toBe(3)
        expect(new Set(faultCards.map(card => card.image)).size).toBe(3)
        for (const card of faultCards) {
          expectLocalText(card.title)
          expectLocalText(card.imageAlt)
          expectLocalText(card.scenario)
          expectLocalText(card.strategy)
          expectLocalText(card.principle)
          expectLocalText(card.evidence)
          expect(card.scenario.zh).toMatch(/\d/)
          expect(card.scenario.en).toMatch(/\d/)
        }
      }
    }
  })

  it('ships six distinct, non-placeholder interaction images for every assembly', () => {
    for (const partId of interactivePartIds) {
      const pack = partInteractionRegistry[partId]!
      const cards = [...pack.referenceCards, ...pack.faultCardsFor('student-ev')]
      expect(cards).toHaveLength(6)
      expect(new Set(cards.map(card => card.image)).size).toBe(6)
      const hashes = new Set<string>()
      for (const card of cards) {
        expect(card.image).toMatch(new RegExp(`^/images/interactions/${partId}/.+\\.webp$`))
        const diskPath = join(process.cwd(), 'public', card.image.replace(/^\/+/, ''))
        expect(existsSync(diskPath), `missing interaction image: ${card.image}`).toBe(true)
        expect(statSync(diskPath).size, `interaction image is unexpectedly small: ${card.image}`).toBeGreaterThan(50_000)
        hashes.add(createHash('sha256').update(readFileSync(diskPath)).digest('hex'))
      }
      expect(hashes.size, `${partId} reuses an image`).toBe(6)
    }
  })
})
