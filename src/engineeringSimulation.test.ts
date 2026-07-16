import { describe, expect, it } from 'vitest'
import { LAB_MODELS } from './engineeringSim'
import { GRAND_PRIX_LAB_MODELS } from './grandPrixEngineeringSim'
import { partInteractionRegistry } from './partInteractionRegistry'

const metric = (values: ReturnType<typeof LAB_MODELS.differential.evaluate>, index: number) => {
  const item = values.metrics[index]
  expect(item, `missing metric at index ${index}`).toBeDefined()
  return item!.value
}

describe('engineering simulation invariants', () => {
  it('keeps an open differential equal-torque and bounded by the lower-grip side', () => {
    const student = LAB_MODELS.differential.evaluate({
      insideLoad: 100,
      outsideLoad: 1800,
      locking: 0,
      torque: 1200,
    })
    const studentLowSideCap = 100 * 1.55 * 0.23
    expect(metric(student, 0)).toBeCloseTo(metric(student, 1), 12)
    expect(metric(student, 0)).toBeLessThanOrEqual(studentLowSideCap)

    const grandPrix = GRAND_PRIX_LAB_MODELS.differential.evaluate({
      insideLoad: 500,
      outsideLoad: 7000,
      locking: 0,
      torque: 1800,
    })
    const grandPrixLowSideCap = 500 * 1.8 * 0.36
    expect(metric(grandPrix, 0)).toBeCloseTo(metric(grandPrix, 1), 12)
    expect(metric(grandPrix, 0)).toBeLessThanOrEqual(grandPrixLowSideCap)
  })

  it('keeps the Grand Prix floor curve consistent with the displayed current point', () => {
    const result = GRAND_PRIX_LAB_MODELS.floor.evaluate({
      speed: 240,
      frontHeight: 18,
      rearHeight: 46,
      seal: 88,
    })
    expect(result.points[0]!.x).toBe(18)
    expect(result.points[0]!.y).toBeCloseTo(metric(result, 0), 10)
  })

  it('keeps the Formula Student floor curve consistent with the displayed current point', () => {
    const currentHeight = 30
    const result = LAB_MODELS.floor.evaluate({
      speed: 110,
      frontHeight: currentHeight,
      rearHeight: 48,
      seal: 82,
    })
    const currentPoint = result.points.find(point => Math.abs(point.x - currentHeight) < 1e-9)
    expect(currentPoint, 'floor curve must include the selected ride height').toBeDefined()
    expect(currentPoint!.y).toBeCloseTo(metric(result, 0), 10)
  })

  it('applies the Formula Student 80 kW cap only to positive TSAC drive power', () => {
    const battery = LAB_MODELS.battery.evaluate({ soc: 90, current: 500, resistance: 18, temp: 35 })
    expect(metric(battery, 1)).toBeLessThanOrEqual(80)

    const inverter = LAB_MODELS.inverter.evaluate({ power: 100, current: 450, switching: 24, coolant: 35 })
    const inverterLoss = metric(inverter, 0)
    const inverterShaftOutput = metric(inverter, 1)
    expect(inverterLoss + inverterShaftOutput).toBeLessThanOrEqual(80 + 1e-9)

    const motor = LAB_MODELS.motor.evaluate({ speed: 8000, current: 450, ratio: 9.5, temp: 90 })
    expect(metric(motor, 1)).toBeLessThanOrEqual(80 * .94 + 1e-9)

    const regenExperiment = partInteractionRegistry.inverter!.experimentsFor('student-ev')
      .find(experiment => experiment.id === 'inverter-regen-overvoltage')
    expect(regenExperiment).toBeDefined()
    const regen = regenExperiment!.evaluate({ regenPower: 100, chargeLimit: 120, capacitance: 5, soc: 70 })
    const acceptedPower = regen.metrics.find(item => item.id === 'accepted-power')
    expect(acceptedPower).toBeDefined()
    expect(acceptedPower!.value).toBe(100)
    expect(acceptedPower!.value).toBeGreaterThan(80)
  })

  it('increases tyre slip dissipation with speed at the same load and slip ratio', () => {
    const slowStudent = LAB_MODELS.tire.evaluate({ load: 1100, slip: 10, speed: 8, temp: 72, pressure: 84 })
    const fastStudent = LAB_MODELS.tire.evaluate({ load: 1100, slip: 10, speed: 24, temp: 72, pressure: 84 })
    expect(metric(fastStudent, 2)).toBeGreaterThan(metric(slowStudent, 2))

    const slowGrandPrix = GRAND_PRIX_LAB_MODELS.tire.evaluate({ load: 3800, slip: 9, vehicleSpeed: 100, temp: 98, pressure: 155 })
    const fastGrandPrix = GRAND_PRIX_LAB_MODELS.tire.evaluate({ load: 3800, slip: 9, vehicleSpeed: 300, temp: 98, pressure: 155 })
    expect(metric(fastGrandPrix, 2)).toBeGreaterThan(metric(slowGrandPrix, 2))
  })

  it('provides no positive ERS-K mechanical deployment at 345 km/h in normal mode', () => {
    const result = GRAND_PRIX_LAB_MODELS.motor.evaluate({
      icePower: 400,
      mguPower: 350,
      vehicleSpeed: 345,
      mguSpeed: 15_000,
      efficiency: 47,
      soc: 100,
    })
    expect(metric(result, 2)).toBe(0)
    expect(metric(result, 0)).toBe(400)
  })
})
