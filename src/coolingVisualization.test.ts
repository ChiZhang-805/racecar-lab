import { describe, expect, it } from 'vitest'
import { projectCoolingChartPoint, sharedCoolingChartDomain } from './CoolingInteractionPanels'

describe('cooling pump-map projection', () => {
  it('projects pump curve, system curve and working point through one shared domain', () => {
    const pump = [{ x: 0, y: 100 }, { x: 10, y: 20 }]
    const system = [{ x: 0, y: 10 }, { x: 16, y: 90 }]
    const workingPoint = { x: 8, y: 50 }
    const domain = sharedCoolingChartDomain([pump, system, [workingPoint]])

    expect(domain).toEqual({ minX: 0, maxX: 16, minY: 0, maxY: 100 })

    const pumpEnd = projectCoolingChartPoint(pump[1]!, domain)
    const systemEnd = projectCoolingChartPoint(system[1]!, domain)
    const projectedWorkingPoint = projectCoolingChartPoint(workingPoint, domain)

    // The shorter pump series must not stretch independently to the right edge.
    expect(pumpEnd.x).toBeCloseTo(355)
    expect(systemEnd.x).toBeCloseTo(550)
    expect(projectedWorkingPoint).toEqual({ x: 290, y: 110 })
  })

  it('keeps negative measured values inside a shared domain', () => {
    const domain = sharedCoolingChartDomain([[{ x: -2, y: -4 }], [{ x: 6, y: 12 }]])
    expect(domain).toEqual({ minX: -2, maxX: 6, minY: -4, maxY: 12 })
    expect(projectCoolingChartPoint({ x: -2, y: -4 }, domain)).toEqual({ x: 30, y: 190 })
    expect(projectCoolingChartPoint({ x: 6, y: 12 }, domain)).toEqual({ x: 550, y: 30 })
  })
})
