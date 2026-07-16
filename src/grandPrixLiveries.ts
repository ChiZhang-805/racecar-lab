import type { Locale } from './i18n'

export const GRAND_PRIX_LIVERY_IDS = ['ferrari', 'mclaren', 'mercedes', 'red-bull'] as const

export type GrandPrixLiveryId = typeof GRAND_PRIX_LIVERY_IDS[number]

export type GrandPrixLiveryPalette = {
  body: string
  secondary: string
  accent: string
  pinstripe: string
  carbon: string
  metal: string
  wheelAccent: string
  roughness: number
  metalness: number
}

export type GrandPrixLivery = {
  id: GrandPrixLiveryId
  name: Record<Locale, string>
  signature: Record<Locale, string>
  sourceLabel: Record<Locale, string>
  sourceUrl: string
  palette: GrandPrixLiveryPalette
}

/**
 * Logo-free educational interpretations of publicly presented 2026 liveries.
 * The palettes and procedural markings deliberately omit team marks, sponsor
 * artwork and manufacturing geometry that is not available in official public
 * material.
 */
export const GRAND_PRIX_LIVERIES: Record<GrandPrixLiveryId, GrandPrixLivery> = {
  ferrari: {
    id: 'ferrari',
    name: { zh: '法拉利风格', en: 'Ferrari style' },
    signature: {
      zh: '亮面赛车红，驾驶舱与发动机盖采用高对比白色分区。',
      en: 'Gloss racing red with high-contrast white cockpit and engine-cover zones.',
    },
    sourceLabel: { zh: '法拉利 SF-26 官方发布', en: 'Official Ferrari SF-26 reveal' },
    sourceUrl: 'https://www.ferrari.com/en-EN/formula1/articles/ferrari-unveils-the-sf-26',
    palette: {
      body: '#e01b24', secondary: '#f1eee8', accent: '#a70e17', pinstripe: '#ffffff',
      carbon: '#151719', metal: '#aeb7bc', wheelAccent: '#e6363e', roughness: .17, metalness: .42,
    },
  },
  mclaren: {
    id: 'mclaren',
    name: { zh: '迈凯伦风格', en: 'McLaren style' },
    signature: {
      zh: '木瓜橙与深炭灰为主，用少量青绿色细线勾勒空气动力学表面。',
      en: 'Papaya and anthracite with restrained teal lines tracing the aerodynamic surfaces.',
    },
    sourceLabel: { zh: '迈凯伦 MCL40 官方发布', en: 'Official McLaren MCL40 reveal' },
    sourceUrl: 'https://www.mclaren.com/racing/formula-1/2026/mclaren-racing-reveal-livery-for-the-mclaren-mastercard-formula-1-teams-2026-challenger/',
    palette: {
      body: '#ff8000', secondary: '#20242a', accent: '#22c7c7', pinstripe: '#f2f4f3',
      carbon: '#111417', metal: '#9da9af', wheelAccent: '#ff8c1a', roughness: .2, metalness: .4,
    },
  },
  mercedes: {
    id: 'mercedes',
    name: { zh: '梅赛德斯风格', en: 'Mercedes style' },
    signature: {
      zh: '银色向深黑渐进，车身下缘以青绿色流线和菱形纹理强调速度感。',
      en: 'Silver flowing into deep black, set off by a low teal line and rhombus texture.',
    },
    sourceLabel: { zh: '梅赛德斯 W17 官方发布', en: 'Official Mercedes W17 reveal' },
    sourceUrl: 'https://www.mercedesamgf1.com/news/mercedes-amg-f1-2026-challenger-w17-revealed',
    palette: {
      body: '#b9c3c9', secondary: '#080b0e', accent: '#00a69d', pinstripe: '#77e5d5',
      carbon: '#101417', metal: '#c4ccd0', wheelAccent: '#27c5ba', roughness: .19, metalness: .62,
    },
  },
  'red-bull': {
    id: 'red-bull',
    name: { zh: '红牛风格', en: 'Red Bull style' },
    signature: {
      zh: '传承白色亮面底漆，配深蓝主体以及红黄高对比速度线。',
      en: 'Gloss heritage white, deep navy bodywork and high-contrast red and yellow speed lines.',
    },
    sourceLabel: { zh: '红牛 RB22 官方发布', en: 'Official Red Bull RB22 reveal' },
    sourceUrl: 'https://www.redbullracing.com/int-en/races/season-launch-2026/',
    palette: {
      body: '#f0efe9', secondary: '#111c3c', accent: '#d9232e', pinstripe: '#f3c932',
      carbon: '#11151b', metal: '#abb5bb', wheelAccent: '#e22b33', roughness: .15, metalness: .46,
    },
  },
}

const liveryIdSet = new Set<string>(GRAND_PRIX_LIVERY_IDS)

export const DEFAULT_GRAND_PRIX_LIVERY_ID: GrandPrixLiveryId = 'ferrari'

export const isGrandPrixLiveryId = (value: string | null): value is GrandPrixLiveryId => value !== null && liveryIdSet.has(value)
