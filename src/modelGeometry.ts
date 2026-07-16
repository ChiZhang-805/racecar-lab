import * as THREE from 'three'
import type { PartId } from './data'

export type V3 = [number, number, number]

export const SCENE_CAMERA_MAX_DISTANCE = 24
export const SCENE_CAMERA_FOV = { desktop: 36, mobilePortrait: 58 } as const
export const MOBILE_SCENE_OVERVIEW_TARGET_Y = 1.05
export const MOBILE_SCENE_CAMERAS = {
  grandPrixIntro: [11.2, 5.9, 13.1],
  studentIntro: [9.7, 5.15, 11.55],
  grandPrixOverview: [13.0, 7.0, 14.65],
  studentOverview: [11.45, 6.2, 12.85],
} satisfies Record<string, V3>

export type WheelGeometry = {
  centerY: number
  majorRadius: number
  tubeRadius: number
  widthScale: number
  rimWidth: number
  hubWidth: number
  halfTrack: number
  wheelbase: number
}

/**
 * Primary 2026 geometry/control anchors used when checking the schematic GP
 * model. These are traceability values, not a claim that scene units are CAD
 * millimetres. Source: FIA Formula 1 Technical Regulations, Issue 19
 * (25 June 2026), articles C2.3, C3.10.10, C3.11.6, C5.1, C9.6,
 * C10.7 and C10.9.
 */
export const GRAND_PRIX_REGULATION_BASIS = {
  maxBodyworkWidthMmExcludingTyresAndRims: 1900,
  maxWheelbaseMm: 3400,
  rimDiameterInches: 18,
  frontTyreMountingWidthMm: 315,
  rearTyreMountingWidthMm: 401.3,
  frontRimOverallWidthMm: 334,
  rearRimOverallWidthMm: 420.3,
  qualifyingMinimumMassWithoutNominalTyresKg: 726,
  otherSessionMinimumMassWithoutNominalTyresKg: 724,
  engineDisplacementCc: 1600,
  cylinderCount: 6,
  cylinderBankAngleDeg: 90,
  forwardGearRatios: 8,
  activeAeroPositions: 2,
  maximumActiveAeroTransitionMs: 400,
  outboardWheelDiscRequired: true,
  centralWheelFastenerRequired: true,
  dualWheelRetentionRequired: true,
} as const

/**
 * Dimensionless scene geometry. Ratios follow representative Formula Student
 * and 2026 Grand Prix slick dimensions; the 10 mm scene clearance prevents
 * z-fighting with the ground grid without making the tyre visibly float.
 */
export const WHEEL_GEOMETRY = {
  student: {
    centerY: 0.66,
    majorRadius: 0.46,
    tubeRadius: 0.19,
    widthScale: 1.35,
    rimWidth: 0.44,
    hubWidth: 0.48,
    halfTrack: 1.55,
    wheelbase: 4.5,
  },
  grandPrixFront: {
    centerY: 0.68,
    majorRadius: 0.48,
    tubeRadius: 0.19,
    widthScale: 1.5,
    rimWidth: 0.54,
    hubWidth: 0.575,
    halfTrack: 1.5,
    wheelbase: 6.18,
  },
  grandPrixRear: {
    centerY: 0.68,
    majorRadius: 0.48,
    tubeRadius: 0.19,
    widthScale: 1.98,
    rimWidth: 0.7,
    hubWidth: 0.735,
    halfTrack: 1.5,
    wheelbase: 6.18,
  },
} as const satisfies Record<string, WheelGeometry>

/**
 * Shared exterior envelope for the code-generated 2026 teaching model. The
 * scale is anchored to the FIA maximum wheelbase, allowing model dimensions to
 * be checked in millimetres without presenting the scene as manufacturing CAD.
 */
export const GRAND_PRIX_SCENE_ENVELOPE = {
  millimetresPerSceneUnit: GRAND_PRIX_REGULATION_BASIS.maxWheelbaseMm / WHEEL_GEOMETRY.grandPrixFront.wheelbase,
  frontWingWidthSceneUnits: 3.44,
  frontWingEndplateHalfSpanSceneUnits: 1.69,
  frontExtremityZ: 4.6,
  rearExtremityZ: -4.6,
} as const

export const grandPrixSceneUnitsToMm = (sceneUnits: number) => sceneUnits * GRAND_PRIX_SCENE_ENVELOPE.millimetresPerSceneUnit

export function wheelOuterRadius(spec: WheelGeometry) {
  return spec.majorRadius + spec.tubeRadius
}

export function wheelSectionWidth(spec: WheelGeometry) {
  return spec.tubeRadius * 2 * spec.widthScale
}

export function wheelGroundClearance(spec: WheelGeometry) {
  return spec.centerY - wheelOuterRadius(spec)
}

/** Corner Mode and Straight Mode incidence for the schematic active wings. */
export function grandPrixFrontWingIncidence(layer: 0 | 1 | 2, straightMode: boolean) {
  return layer === 0 ? -0.09 : straightMode ? -0.025 - layer * 0.008 : -0.09 - layer * 0.025
}

export function grandPrixRearWingIncidence(surface: 'mainplane' | 'flap', straightMode: boolean) {
  return surface === 'mainplane' ? 0.11 : straightMode ? -0.1 : 0.2
}

export const WORKSHOP_EXPLODE_VECTORS: readonly V3[] = [
  [-2.6, 0.5, 0.5],
  [2.5, 0.7, 0.4],
  [-2.2, 1.8, -0.5],
  [2.1, 1.8, -0.6],
  [-1.2, -1.6, 0.6],
  [1.5, -1.5, -0.8],
]

export function workshopScaleForExplode(baseScale: number, explode: number) {
  const safeExplode = THREE.MathUtils.clamp(Number.isFinite(explode) ? explode : 0, 0, 1)
  return baseScale * (1 - safeExplode * 0.36)
}

export function rodTransform(start: V3, end: V3) {
  const a = new THREE.Vector3(...start)
  const b = new THREE.Vector3(...end)
  const direction = b.clone().sub(a)
  const length = direction.length()
  const quaternion = length > 1e-8
    ? new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.multiplyScalar(1 / length))
    : new THREE.Quaternion()
  return {
    midpoint: a.add(b).multiplyScalar(0.5),
    quaternion,
    length,
  }
}

export type PartView = { camera: V3; target: V3 }

/** Grand Prix geometry is longer than the student car, so it needs its own focus map. */
export const GRAND_PRIX_PART_VIEWS: Record<PartId, PartView> = {
  'front-wing': { camera: [6.0, 2.4, 6.5], target: [0, 0.42, 4.2] },
  'rear-wing': { camera: [6.3, 3.2, -6.2], target: [0, 2.1, -4.1] },
  floor: { camera: [5.8, 1.5, -2.8], target: [0, 0.25, -0.2] },
  nose: { camera: [5.8, 2.4, 5.0], target: [0, 0.75, 3.4] },
  monocoque: { camera: [6.0, 3.0, 1.0], target: [0, 1.0, 0.7] },
  halo: { camera: [4.8, 3.6, 1.1], target: [0, 1.65, 0.35] },
  tires: { camera: [6.3, 2.3, 4.0], target: [1.5, 0.68, 2.93] },
  brakes: { camera: [6.0, 2.2, 3.8], target: [1.5, 0.68, 2.93] },
  'front-suspension': { camera: [6.2, 2.6, 4.2], target: [1.3, 0.75, 2.75] },
  'rear-suspension': { camera: [6.2, 2.7, -4.2], target: [1.3, 0.75, -3.05] },
  steering: { camera: [5.2, 2.9, 2.6], target: [0, 1.0, 1.8] },
  battery: { camera: [5.2, 2.7, -0.7], target: [0, 0.7, -1.25] },
  inverter: { camera: [5.0, 2.6, -2.1], target: [0.72, 0.92, -1.8] },
  motor: { camera: [5.6, 2.6, -2.5], target: [0, 0.8, -2.2] },
  differential: { camera: [5.8, 2.4, -3.5], target: [0, 0.7, -3.25] },
  cooling: { camera: [5.8, 2.5, -0.3], target: [1.0, 0.8, -0.15] },
  ecu: { camera: [4.8, 3.0, -0.6], target: [-0.55, 0.6, -0.82] },
  sensors: { camera: [5.2, 3.3, 0.8], target: [0, 1.05, 0] },
}
