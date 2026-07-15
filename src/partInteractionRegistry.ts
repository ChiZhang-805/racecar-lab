import type { PartId } from './data'
import { aeroStructureInteractionPacks } from './aeroStructureInteractions'
import { dynamicsInteractionPackByPart } from './dynamicsInteractions'
import type { PartInteractionPack } from './interactionTypes'
import { powerElectronicsInteractionPacks } from './powerElectronicsInteractions'

export const partInteractionRegistry: Partial<Record<PartId, PartInteractionPack>> = {
  ...aeroStructureInteractionPacks,
  ...dynamicsInteractionPackByPart,
  ...powerElectronicsInteractionPacks,
}

export const getPartInteractionPack = (partId: PartId) => partInteractionRegistry[partId]
