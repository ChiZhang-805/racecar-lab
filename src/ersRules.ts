export const FIA_ERS_K_ABSOLUTE_DC_POWER_KW = 350
export const FIA_ERS_K_MECHANICAL_TORQUE_NM = 500
export const FIA_ERS_ELECTRICAL_MECHANICAL_CORRECTION = 0.97
export const FIA_ES_STATE_OF_CHARGE_SWING_MJ = 4
export const FIA_LAP_RECHARGE_MAX_MJ = 8.5

/**
 * 2026 FIA Section C, C5.2.8 normal (non-overtake) deployment curve.
 * The absolute 350 kW DC limit from C5.2.7 remains active throughout.
 */
export const fiaNormalDeploymentDcLimitKw = (vehicleSpeedKph: number) => {
  const speed = Math.max(0, vehicleSpeedKph)
  const speedCurve = speed < 340
    ? 1800 - 5 * speed
    : speed < 345
      ? 6900 - 20 * speed
      : 0
  return Math.max(0, Math.min(FIA_ERS_K_ABSOLUTE_DC_POWER_KW, speedCurve))
}

/**
 * Convert a signed ERS-K DC-bus power to its rule-corrected mechanical value.
 * Positive values deploy power to the crankshaft; negative values recharge the
 * DC bus, so the inverse correction is required in the harvesting direction.
 */
export const fiaDcToMechanicalPowerKw = (dcPowerKw: number) => dcPowerKw >= 0
  ? dcPowerKw * FIA_ERS_ELECTRICAL_MECHANICAL_CORRECTION
  : dcPowerKw / FIA_ERS_ELECTRICAL_MECHANICAL_CORRECTION

export type OrderedEnergyTrace = {
  points: { x: number; y: number }[]
  finishMj: number
  swingMj: number
  minimumMj: number
  maximumMj: number
}

/**
 * Build a simple ordered lap ledger: propulsion first consumes energy and the
 * braking phase then recharges it. Unlike |deploy-recharge|, the max-to-min
 * range remains correct when the lap finishes at its starting energy.
 */
export const orderedLapEnergyTrace = (
  startMj: number,
  deployMj: number,
  rechargeMj: number,
  propulsionFraction: number,
  count = 61,
): OrderedEnergyTrace => {
  const split = Math.min(0.95, Math.max(0.05, propulsionFraction))
  const points = Array.from({ length: Math.max(2, count) }, (_, index) => {
    const x = index / (Math.max(2, count) - 1)
    const y = x <= split
      ? startMj - deployMj * x / split
      : startMj - deployMj + rechargeMj * (x - split) / (1 - split)
    return { x, y }
  })
  const values = points.map(point => point.y)
  const minimumMj = Math.min(...values)
  const maximumMj = Math.max(...values)
  return {
    points,
    finishMj: startMj - deployMj + rechargeMj,
    swingMj: maximumMj - minimumMj,
    minimumMj,
    maximumMj,
  }
}
