import { describe, expect, it } from 'vitest'
import { secondOrderFreeResponse, settlingTimeTwoPercent } from './simulationMath'

describe('second-order suspension response', () => {
  it('starts from unit displacement with zero initial velocity in every damping regime', () => {
    for (const ratio of [0.25, 0.72, 1, 1.4, 2.2]) {
      expect(secondOrderFreeResponse(0, 14, ratio)).toBeCloseTo(1, 12)
      const derivative = (secondOrderFreeResponse(1e-6, 14, ratio) - 1) / 1e-6
      expect(Math.abs(derivative)).toBeLessThan(0.002)
    }
  })

  it('oscillates only when under-damped', () => {
    const underDamped = Array.from({ length: 300 }, (_, index) => secondOrderFreeResponse(index / 100, 12, 0.3))
    expect(underDamped.some(value => value < 0)).toBe(true)

    for (const ratio of [1, 1.35, 2]) {
      const response = Array.from({ length: 300 }, (_, index) => secondOrderFreeResponse(index / 100, 12, ratio))
      expect(response.every(value => Number.isFinite(value) && value >= 0)).toBe(true)
      for (let index = 1; index < response.length; index += 1) {
        expect(response[index]!).toBeLessThanOrEqual(response[index - 1]! + 1e-12)
      }
    }
  })

  it('computes a finite 2% settling boundary and verifies the response there', () => {
    for (const ratio of [0.2, 0.7, 1, 1.5, 2.4]) {
      const settling = settlingTimeTwoPercent(11, ratio)
      expect(Number.isFinite(settling)).toBe(true)
      expect(settling).toBeGreaterThan(0)
      if (ratio >= 1) expect(secondOrderFreeResponse(settling, 11, ratio)).toBeCloseTo(0.02, 8)
    }
  })
})
