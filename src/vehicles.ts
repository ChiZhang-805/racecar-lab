import type { Locale } from './i18n'
import type { PartId } from './data'

export const VEHICLE_IDS = ['student-ev', 'grand-prix-2026'] as const
export type VehicleId = typeof VEHICLE_IDS[number]

export type VehicleInfo = {
  id: VehicleId
  name: Record<Locale, string>
  sceneLabel: Record<Locale, string>
  storageSuffix: string
}

/**
 * Navigation keeps one stable PartId set so saved progress and deep links remain
 * compatible across vehicles.  These aliases make the deliberately different
 * physical scope explicit instead of silently treating unlike assemblies as the
 * same component.
 */
export const VEHICLE_PART_ALIASES: Record<VehicleId, Partial<Record<PartId, string>>> = {
  'student-ev': {
    halo: 'formula-student-roll-hoops-and-cockpit-protection',
    motor: 'electric-traction-motor',
    differential: 'final-drive-differential',
  },
  'grand-prix-2026': {
    halo: 'fia-halo-and-cockpit-safety-structure',
    motor: 'v6-hybrid-power-unit',
    differential: 'gearbox-differential-and-driveline',
  },
}

export const VEHICLES: Record<VehicleId, VehicleInfo> = {
  'student-ev': {
    id: 'student-ev',
    name: { zh: '基础电动方程式', en: 'Electric Formula Trainer' },
    sceneLabel: { zh: '基础电动方程式教学车', en: 'Electric formula training car' },
    storageSuffix: 'student-ev',
  },
  'grand-prix-2026': {
    id: 'grand-prix-2026',
    name: { zh: '顶级混动方程式', en: 'Grand Prix Hybrid' },
    sceneLabel: { zh: '2026 顶级混动单座方程式赛车', en: '2026 grand prix hybrid single-seater' },
    storageSuffix: 'grand-prix-2026',
  },
}

export const isVehicleId = (value: string | null): value is VehicleId =>
  value !== null && (VEHICLE_IDS as readonly string[]).includes(value)

export const getVehicleName = (id: VehicleId, locale: Locale) => VEHICLES[id].name[locale]
