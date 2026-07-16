import { describe, expect, it } from 'vitest'
import { initialInteractionValues } from './interactionTypes'
import { partInteractionRegistry } from './partInteractionRegistry'

const experimentResult = (
  partId: 'rear-wing' | 'floor',
  experimentId: string,
  overrides: Record<string, number>,
) => {
  const experiment = partInteractionRegistry[partId]!.experimentsFor('grand-prix-2026')
    .find(candidate => candidate.id === experimentId)
  expect(experiment).toBeDefined()
  return experiment!.evaluate({ ...initialInteractionValues(experiment!), ...overrides })
}

const metricValue = (result: ReturnType<typeof experimentResult>, id: string) => {
  const metric = result.metrics.find(candidate => candidate.id === id)
  expect(metric, `missing metric ${id}`).toBeDefined()
  return metric!.value
}

describe('interaction-model physical invariants', () => {
  it('treats positive rear-wing delay as a later start and later completion', () => {
    const result = experimentResult('rear-wing', 'active-state-transition', {
      frontTime: 300,
      rearTime: 320,
      delay: 20,
      speed: 300,
    })

    expect(metricValue(result, 'mismatch')).toBe(40)
    expect(metricValue(result, 'transition-limit')).toBe(60)
    expect(result.points.at(-1)!.x).toBeGreaterThanOrEqual(340)
    expect(result.secondaryPoints!.at(-1)!.y).toBe(1)
  })

  it('uses the same inlet-quality correction for Venturi metrics and scan curves', () => {
    const result = experimentResult('floor', 'venturi-throat', {
      speed: 240,
      throat: 18,
      ratio: 1.5,
      inlet: 62,
    })

    expect(result.points[0]!.x).toBe(18)
    expect(result.points[0]!.y).toBeCloseTo(metricValue(result, 'pressure-drop'), 10)
  })
})
