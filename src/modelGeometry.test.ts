import { describe, expect, it } from 'vitest'
import { PARTS } from './data'
import {
  GRAND_PRIX_REGULATION_BASIS,
  GRAND_PRIX_PART_VIEWS,
  grandPrixFrontWingIncidence,
  grandPrixRearWingIncidence,
  rodTransform,
  wheelGroundClearance,
  wheelOuterRadius,
  wheelSectionWidth,
  WHEEL_GEOMETRY,
  WORKSHOP_EXPLODE_VECTORS,
  workshopScaleForExplode,
} from './modelGeometry'

describe('3D model geometry integrity', () => {
  it('records the governing 2026 Grand Prix geometry and control anchors', () => {
    expect(GRAND_PRIX_REGULATION_BASIS).toMatchObject({
      maxBodyworkWidthMmExcludingTyresAndRims: 1900,
      maxWheelbaseMm: 3400,
      rimDiameterInches: 18,
      frontTyreMountingWidthMm: 315,
      rearTyreMountingWidthMm: 401.3,
      engineDisplacementCc: 1600,
      cylinderCount: 6,
      cylinderBankAngleDeg: 90,
      forwardGearRatios: 8,
      activeAeroPositions: 2,
      maximumActiveAeroTransitionMs: 400,
      outboardWheelDiscRequired: true,
      centralWheelFastenerRequired: true,
      dualWheelRetentionRequired: true,
    })
  })

  it('moves only the permitted active-wing flaps between the two states', () => {
    expect(grandPrixFrontWingIncidence(0, false)).toBe(grandPrixFrontWingIncidence(0, true))
    expect(grandPrixFrontWingIncidence(1, false)).not.toBe(grandPrixFrontWingIncidence(1, true))
    expect(grandPrixFrontWingIncidence(2, false)).not.toBe(grandPrixFrontWingIncidence(2, true))
    expect(grandPrixRearWingIncidence('mainplane', false)).toBe(grandPrixRearWingIncidence('mainplane', true))
    expect(grandPrixRearWingIncidence('flap', false)).not.toBe(grandPrixRearWingIncidence('flap', true))
  })

  it('keeps every tyre on the ground with realistic section proportions', () => {
    for (const spec of Object.values(WHEEL_GEOMETRY)) {
      const clearance = wheelGroundClearance(spec)
      const sectionRatio = wheelSectionWidth(spec) / (wheelOuterRadius(spec) * 2)
      expect(clearance).toBeGreaterThanOrEqual(0.005)
      expect(clearance).toBeLessThanOrEqual(0.015)
      expect(sectionRatio).toBeGreaterThan(0.35)
      expect(sectionRatio).toBeLessThan(0.6)
      expect(spec.rimWidth).toBeLessThan(wheelSectionWidth(spec))
      expect(spec.hubWidth).toBeGreaterThanOrEqual(spec.rimWidth)
      expect(spec.halfTrack * 2 / spec.wheelbase).toBeGreaterThan(0.45)
      expect(spec.halfTrack * 2 / spec.wheelbase).toBeLessThan(0.75)
    }
    expect(wheelSectionWidth(WHEEL_GEOMETRY.grandPrixRear)).toBeGreaterThan(wheelSectionWidth(WHEEL_GEOMETRY.grandPrixFront))
    expect(
      wheelSectionWidth(WHEEL_GEOMETRY.grandPrixRear) / wheelSectionWidth(WHEEL_GEOMETRY.grandPrixFront),
    ).toBeCloseTo(
      GRAND_PRIX_REGULATION_BASIS.rearTyreMountingWidthMm / GRAND_PRIX_REGULATION_BASIS.frontTyreMountingWidthMm,
      1,
    )
  })

  it('has one finite Grand Prix focus view for every selectable part', () => {
    expect(Object.keys(GRAND_PRIX_PART_VIEWS).sort()).toEqual(PARTS.map((part) => part.id).sort())
    for (const view of Object.values(GRAND_PRIX_PART_VIEWS)) {
      expect([...view.camera, ...view.target].every(Number.isFinite)).toBe(true)
      const distance = Math.hypot(
        view.camera[0] - view.target[0],
        view.camera[1] - view.target[1],
        view.camera[2] - view.target[2],
      )
      expect(distance).toBeGreaterThan(3)
      expect(distance).toBeLessThan(9)
    }
  })

  it('keeps all six workshop explosion paths finite, distinct and reversible', () => {
    expect(WORKSHOP_EXPLODE_VECTORS).toHaveLength(6)
    expect(new Set(WORKSHOP_EXPLODE_VECTORS.map((vector) => vector.join(','))).size).toBe(6)
    for (const vector of WORKSHOP_EXPLODE_VECTORS) {
      expect(vector.every(Number.isFinite)).toBe(true)
      expect(Math.hypot(...vector)).toBeGreaterThan(1)
    }
    expect(workshopScaleForExplode(1.18, 0)).toBeCloseTo(1.18)
    expect(workshopScaleForExplode(1.18, 1)).toBeCloseTo(0.7552)
    expect(workshopScaleForExplode(1.18, Number.NaN)).toBeCloseTo(1.18)
    expect(workshopScaleForExplode(1.18, 99)).toBeCloseTo(0.7552)
  })

  it('never creates NaN transforms for valid or coincident rod endpoints', () => {
    const regular = rodTransform([0, 0, 0], [1, 2, 3])
    expect(regular.length).toBeCloseTo(Math.sqrt(14))
    expect([...regular.midpoint.toArray(), ...regular.quaternion.toArray()].every(Number.isFinite)).toBe(true)

    const coincident = rodTransform([1, -2, 3], [1, -2, 3])
    expect(coincident.length).toBe(0)
    expect(coincident.midpoint.toArray()).toEqual([1, -2, 3])
    expect(coincident.quaternion.toArray()).toEqual([0, 0, 0, 1])
  })
})
