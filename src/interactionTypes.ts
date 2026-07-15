import type { PartId } from './data'
import type { LocalText } from './engineeringData'
import type { VehicleId } from './vehicles'

export type InteractionDiagramMode = 'curve' | 'flow' | 'distribution' | 'geometry' | 'field' | 'timeline'

export type InteractionParameter = {
  key: string
  label: LocalText
  min: number
  max: number
  step: number
  initial: number
  unit: string
}

export type InteractionMetric = {
  id: string
  label: LocalText
  value: number
  unit: string
  tone?: 'good' | 'warn' | 'danger'
}

export type InteractionPoint = { x: number; y: number }

export type InteractionVisual = {
  labels: LocalText[]
  values: number[]
  marker?: number
  risk?: number
  direction?: number
}

export type InteractionResult = {
  metrics: InteractionMetric[]
  points: InteractionPoint[]
  secondaryPoints?: InteractionPoint[]
  insight: LocalText
  visual: InteractionVisual
}

export type InteractionExperiment = {
  id: string
  title: LocalText
  question: LocalText
  mode: InteractionDiagramMode
  parameters: InteractionParameter[]
  evaluate: (values: Record<string, number>) => InteractionResult
}

export type InteractionReferenceCard = {
  id: string
  title: LocalText
  image: string
  imageAlt: LocalText
  summary: LocalText
  purpose: LocalText
  details: LocalText[]
  sourceTitle: LocalText
  url: string
}

export type InteractionFaultCard = {
  id: string
  title: LocalText
  image: string
  imageAlt: LocalText
  scenario: LocalText
  strategy: LocalText
  principle: LocalText
  evidence: LocalText
}

export type PartInteractionPack = {
  partId: Exclude<PartId, 'cooling'>
  theme: string
  experimentsFor: (vehicleId: VehicleId) => InteractionExperiment[]
  referenceCards: InteractionReferenceCard[]
  faultCardsFor: (vehicleId: VehicleId) => InteractionFaultCard[]
}

export const initialInteractionValues = (experiment: InteractionExperiment): Record<string, number> =>
  Object.fromEntries(experiment.parameters.map(parameter => [parameter.key, parameter.initial]))

export const interactionCurve = (fn: (x: number) => number, min = 0, max = 1, count = 31): InteractionPoint[] =>
  Array.from({ length: count }, (_, index) => {
    const x = min + (max - min) * index / Math.max(1, count - 1)
    return { x, y: fn(x) }
  })

export const interactionClamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value))

export const localText = (zh: string, en: string): LocalText => ({ zh, en })

export const interactionParameter = (
  key: string,
  zh: string,
  en: string,
  min: number,
  max: number,
  step: number,
  initial: number,
  unit: string,
): InteractionParameter => ({ key, label: localText(zh, en), min, max, step, initial, unit })

export const interactionMetric = (
  id: string,
  zh: string,
  en: string,
  value: number,
  unit: string,
  tone?: InteractionMetric['tone'],
): InteractionMetric => ({ id, label: localText(zh, en), value, unit, tone })
