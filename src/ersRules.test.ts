import { describe, expect, it } from 'vitest'
import {
  FIA_ERS_K_MECHANICAL_TORQUE_NM,
  FIA_ERS_ELECTRICAL_MECHANICAL_CORRECTION,
  fiaDcToMechanicalPowerKw,
  fiaNormalDeploymentDcLimitKw,
  orderedLapEnergyTrace,
} from './ersRules'
import { dynamicsInteractionPackByPart } from './dynamicsInteractions'
import { powerElectronicsInteractionPacks } from './powerElectronicsInteractions'

const experiment = (
  experiments: ReturnType<typeof powerElectronicsInteractionPacks.motor.experimentsFor>,
  id: string,
) => {
  const match = experiments.find(item => item.id === id)
  expect(match, `missing interaction experiment ${id}`).toBeDefined()
  return match!
}

const metricValue = (result: ReturnType<ReturnType<typeof experiment>['evaluate']>, id: string) => {
  const match = result.metrics.find(metric => metric.id === id)
  expect(match, `missing interaction metric ${id}`).toBeDefined()
  return match!.value
}

describe('2026 ERS-K rule helpers', () => {
  it('applies the absolute and normal-mode speed-dependent DC limits', () => {
    expect(fiaNormalDeploymentDcLimitKw(200)).toBe(350)
    expect(fiaNormalDeploymentDcLimitKw(310)).toBe(250)
    expect(fiaNormalDeploymentDcLimitKw(340)).toBe(100)
    expect(fiaNormalDeploymentDcLimitKw(344)).toBe(20)
    expect(fiaNormalDeploymentDcLimitKw(345)).toBe(0)
  })

  it('uses the fixed correction in the appropriate direction', () => {
    expect(fiaDcToMechanicalPowerKw(350)).toBeCloseTo(350 * FIA_ERS_ELECTRICAL_MECHANICAL_CORRECTION)
    expect(fiaDcToMechanicalPowerKw(-350)).toBeCloseTo(-350 / FIA_ERS_ELECTRICAL_MECHANICAL_CORRECTION)
  })

  it('measures max-to-min energy rather than only the finish delta', () => {
    const trace = orderedLapEnergyTrace(4, 6, 6, 0.75)
    expect(trace.finishMj).toBeCloseTo(4)
    expect(trace.swingMj).toBeCloseTo(6)
    expect(trace.minimumMj).toBeCloseTo(-2)
    expect(trace.maximumMj).toBeCloseTo(4)
  })

  it('clips the GP torque-speed lab by vehicle-speed deployment and the 500 N·m boundary', () => {
    const model = experiment(
      powerElectronicsInteractionPacks.motor.experimentsFor('grand-prix-2026'),
      'motor-torque-speed',
    )

    const at340 = model.evaluate({
      speed: 1000,
      dcVoltage: 800,
      currentLimit: 600,
      coolantTemp: 45,
      vehicleSpeed: 340,
    })
    expect(metricValue(at340, 'dc-power-limit')).toBeCloseTo(100)
    expect(metricValue(at340, 'mechanical-power')).toBeLessThanOrEqual(
      100 * FIA_ERS_ELECTRICAL_MECHANICAL_CORRECTION + 0.1,
    )
    expect(metricValue(at340, 'available-torque')).toBeLessThanOrEqual(FIA_ERS_K_MECHANICAL_TORQUE_NM)

    const at345 = model.evaluate({
      speed: 12000,
      dcVoltage: 800,
      currentLimit: 600,
      coolantTemp: 45,
      vehicleSpeed: 345,
    })
    expect(metricValue(at345, 'dc-power-limit')).toBe(0)
    expect(metricValue(at345, 'mechanical-power')).toBe(0)
    expect(metricValue(at345, 'available-torque')).toBe(0)
  })

  it('clips the GP efficiency lab before estimating losses', () => {
    const model = experiment(
      powerElectronicsInteractionPacks.motor.experimentsFor('grand-prix-2026'),
      'motor-efficiency-map',
    )
    const clipped = model.evaluate({
      speed: 25000,
      torque: FIA_ERS_K_MECHANICAL_TORQUE_NM,
      vehicleSpeed: 340,
      windingTemp: 105,
      weakening: 20,
    })

    expect(metricValue(clipped, 'mechanical-output')).toBeCloseTo(
      100 * FIA_ERS_ELECTRICAL_MECHANICAL_CORRECTION,
      1,
    )
  })

  it('applies the harvesting-side correction and crank-referenced torque cap in brake blending', () => {
    const model = experiment(
      dynamicsInteractionPackByPart.brakes.experimentsFor('grand-prix-2026'),
      'regen-blend',
    )

    const torqueLimited = model.evaluate({
      brakePower: 500,
      regenLimit: 350,
      mguSpeed: 1000,
      soc: 55,
      handover: 50,
    })
    const expectedMechanicalKw = FIA_ERS_K_MECHANICAL_TORQUE_NM * 1000 * 2 * Math.PI / 60 / 1000
    expect(metricValue(torqueLimited, 'regen-power')).toBeCloseTo(expectedMechanicalKw, 5)
    expect(metricValue(torqueLimited, 'recovered-energy')).toBeCloseTo(
      expectedMechanicalKw * FIA_ERS_ELECTRICAL_MECHANICAL_CORRECTION * 2.4 / 3600,
      5,
    )

    const dcLimited = model.evaluate({
      brakePower: 500,
      regenLimit: 350,
      mguSpeed: 15000,
      soc: 55,
      handover: 50,
    })
    expect(metricValue(dcLimited, 'regen-power')).toBeCloseTo(
      350 / FIA_ERS_ELECTRICAL_MECHANICAL_CORRECTION,
      5,
    )
    expect(metricValue(dcLimited, 'recovered-energy')).toBeCloseTo(350 * 2.4 / 3600, 5)
  })
})
