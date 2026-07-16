import type { Locale } from './i18n'

export const GRAND_PRIX_TEAM_IDS = ['ferrari', 'mclaren', 'mercedes', 'red-bull'] as const

export type GrandPrixTeamId = typeof GRAND_PRIX_TEAM_IDS[number]
export type EvidenceLevel = 'official-spec' | 'public-observation' | 'educational-inference'

export type GrandPrixPalette = {
  body: string
  secondary: string
  accent: string
  pinstripe: string
  carbon: string
  metal: string
  wheelAccent: string
  powerUnitAccent: string
  roughness: number
  metalness: number
}

export type GrandPrixGeometry = {
  noseRearRadius: number
  noseTipRadius: number
  noseLength: number
  noseHeight: number
  noseTipHeight: number
  noseUndercutDepth: number
  cockpitOffset: number
  monocoqueLength: number
  monocoqueWidth: number
  sidepodWidth: number
  sidepodHeight: number
  sidepodLength: number
  sidepodOffset: number
  sidepodYaw: number
  sidepodDrop: number
  inletWidth: number
  inletHeight: number
  inletOffset: number
  engineCoverWidth: number
  engineCoverHeight: number
  engineCoverLength: number
  engineCoverOffset: number
  airboxWidth: number
  airboxHeight: number
  floorBoardCount: number
  floorBoardSweep: number
  floorEdgeCut: number
  diffuserSlotWidth: number
  frontWingSweep: number
  rearWingWidthScale: number
  frontPickupOffset: number
  rearPickupHeight: number
  powerUnitWidth: number
  powerUnitLength: number
  turboOffset: number
}

export type GrandPrixFact = {
  label: Record<Locale, string>
  value: Record<Locale, string>
  detail: Record<Locale, string>
  evidence: EvidenceLevel
}

export type GrandPrixSource = {
  label: Record<Locale, string>
  url: string
  kind: 'regulation' | 'team' | 'technical-analysis'
}

export type GrandPrixTeam = {
  id: GrandPrixTeamId
  teamName: string
  modelName: string
  shortName: string
  name: Record<Locale, string>
  snapshot: Record<Locale, string>
  signature: Record<Locale, string>
  designQuestion: Record<Locale, string>
  palette: GrandPrixPalette
  geometry: GrandPrixGeometry
  facts: GrandPrixFact[]
  sources: GrandPrixSource[]
}

const regulationSource: GrandPrixSource = {
  label: { zh: 'FIA 2026 技术规则 Issue 19', en: 'FIA 2026 Technical Regulations, Issue 19' },
  url: 'https://www.fia.com/system/files/documents/fia_2026_f1_regulations_-_section_c_technical_-_iss_19_-_2026-06-25.pdf',
  kind: 'regulation',
}

/**
 * Public-evidence teaching profiles, frozen to a 2026 early-season baseline.
 * Geometry values are scene-space modelling controls, not team CAD dimensions.
 * Every UI fact states whether it is an official specification, a visible public
 * observation, or an educational inference from those public surfaces.
 */
export const GRAND_PRIX_TEAMS: Record<GrandPrixTeamId, GrandPrixTeam> = {
  ferrari: {
    id: 'ferrari',
    teamName: 'Scuderia Ferrari',
    modelName: 'SF-26',
    shortName: 'SF-26',
    name: { zh: 'Ferrari SF-26 研究车', en: 'Ferrari SF-26 study car' },
    snapshot: { zh: '2026 赛季初公开规格', en: 'Public early-2026 specification' },
    signature: {
      zh: '低鼻锥、刚性三叶片地板导流板与 Ferrari 自研混动系统。',
      en: 'Low nose, rigid three-vane floor board and Ferrari works hybrid integration.',
    },
    designQuestion: {
      zh: '低鼻锥减少了底板进气体积，Ferrari 如何靠导流板和扩散器流动补偿？',
      en: 'How does Ferrari recover floor and diffuser flow while committing to a lower nose?',
    },
    palette: {
      body: '#e01b24', secondary: '#f1eee8', accent: '#a70e17', pinstripe: '#ffffff',
      carbon: '#151719', metal: '#aeb7bc', wheelAccent: '#e6363e', powerUnitAccent: '#d2aa55',
      roughness: .17, metalness: .42,
    },
    geometry: {
      noseRearRadius: .40, noseTipRadius: .075, noseLength: 2.30, noseHeight: .70, noseTipHeight: .65, noseUndercutDepth: .05,
      cockpitOffset: -.06, monocoqueLength: 3.12, monocoqueWidth: 1.42,
      sidepodWidth: .66, sidepodHeight: .70, sidepodLength: 2.18, sidepodOffset: -.16, sidepodYaw: .07, sidepodDrop: .05,
      inletWidth: .13, inletHeight: .55, inletOffset: .38,
      engineCoverWidth: .88, engineCoverHeight: .79, engineCoverLength: 2.86, engineCoverOffset: -1.40,
      airboxWidth: .34, airboxHeight: .72,
      floorBoardCount: 3, floorBoardSweep: .16, floorEdgeCut: .10, diffuserSlotWidth: .33,
      frontWingSweep: .03, rearWingWidthScale: 1, frontPickupOffset: -.03, rearPickupHeight: 1.02,
      powerUnitWidth: 1.08, powerUnitLength: 1.08, turboOffset: .55,
    },
    facts: [
      {
        label: { zh: '动力单元', en: 'Power unit' }, value: { zh: 'Ferrari 067/6', en: 'Ferrari 067/6' },
        detail: { zh: '1.6 L 90° V6、单涡轮、350 kW MGU-K。', en: '1.6 L 90° V6, single turbo and 350 kW MGU-K.' }, evidence: 'official-spec',
      },
      {
        label: { zh: '悬架', en: 'Suspension' }, value: { zh: '前后推杆', en: 'Push-rod front and rear' },
        detail: { zh: '与上一代 Ferrari 的拉杆路线不同，释放低位气流区域。', en: 'A departure from Ferrari pull-rod layouts, clearing the low airflow region.' }, evidence: 'official-spec',
      },
      {
        label: { zh: '空气动力特征', en: 'Aero signature' }, value: { zh: '低鼻锥＋三叶片导流板', en: 'Low nose + three-vane floor board' },
        detail: { zh: '公开图像可见低鼻锥和带塔形前缘的刚性导流板。', en: 'Public imagery shows a low nose and rigid board with a leading tower.' }, evidence: 'public-observation',
      },
      {
        label: { zh: '教学建模', en: 'Teaching model' }, value: { zh: '扩散器补流路径', en: 'Diffuser feed path' },
        detail: { zh: '用可视化槽口解释外部气流如何帮助扩散器保持附着。', en: 'A visible slot explains how external flow can help the diffuser remain attached.' }, evidence: 'educational-inference',
      },
    ],
    sources: [
      regulationSource,
      { label: { zh: 'Ferrari SF-26 官方发布与规格', en: 'Official Ferrari SF-26 reveal and specification' }, url: 'https://www.ferrari.com/en-EN/formula1/articles/ferrari-unveils-the-sf-26', kind: 'team' },
      { label: { zh: 'Formula 1 官方技术分析', en: 'Formula 1 official technical analysis' }, url: 'https://www.formula1.com/en/latest/article/the-fascinating-tech-secrets-of-the-2026-regulations-revealed-by-ferrari-and.3cMuqQXJ7RTqHvGkyV1H8t', kind: 'technical-analysis' },
    ],
  },
  mclaren: {
    id: 'mclaren',
    teamName: 'McLaren Racing',
    modelName: 'MCL40',
    shortName: 'MCL40',
    name: { zh: 'McLaren MCL40 研究车', en: 'McLaren MCL40 study car' },
    snapshot: { zh: '2026 赛季初公开规格', en: 'Public early-2026 specification' },
    signature: {
      zh: '自研底盘包裹 Mercedes M17，强调角点抓地与独立侧箱路线。',
      en: 'A McLaren chassis around the Mercedes M17, with its own sidepod and cornering concept.',
    },
    designQuestion: {
      zh: '同样使用 Mercedes 动力单元，McLaren 为什么仍需要完全不同的冷却、侧箱与底盘包装？',
      en: 'Why does McLaren need distinct cooling, sidepods and packaging around the same Mercedes power unit?',
    },
    palette: {
      body: '#ff8000', secondary: '#20242a', accent: '#22c7c7', pinstripe: '#f2f4f3',
      carbon: '#111417', metal: '#9da9af', wheelAccent: '#ff8c1a', powerUnitAccent: '#48d9d4',
      roughness: .20, metalness: .40,
    },
    geometry: {
      noseRearRadius: .36, noseTipRadius: .09, noseLength: 2.38, noseHeight: .76, noseTipHeight: .69, noseUndercutDepth: .11,
      cockpitOffset: .02, monocoqueLength: 3.20, monocoqueWidth: 1.40,
      sidepodWidth: .70, sidepodHeight: .64, sidepodLength: 2.34, sidepodOffset: -.12, sidepodYaw: .11, sidepodDrop: .13,
      inletWidth: .11, inletHeight: .47, inletOffset: .43,
      engineCoverWidth: .82, engineCoverHeight: .74, engineCoverLength: 2.92, engineCoverOffset: -1.43,
      airboxWidth: .31, airboxHeight: .66,
      floorBoardCount: 3, floorBoardSweep: .23, floorEdgeCut: .16, diffuserSlotWidth: .27,
      frontWingSweep: .08, rearWingWidthScale: .98, frontPickupOffset: .08, rearPickupHeight: 1.07,
      powerUnitWidth: 1.03, powerUnitLength: 1.05, turboOffset: .50,
    },
    facts: [
      {
        label: { zh: '动力单元', en: 'Power unit' }, value: { zh: 'Mercedes-AMG M17', en: 'Mercedes-AMG M17' },
        detail: { zh: '与 Mercedes 厂队共享动力单元规则架构，但底盘和冷却由 McLaren 集成。', en: 'Shared PU family with Mercedes, integrated into McLaren chassis and cooling.' }, evidence: 'official-spec',
      },
      {
        label: { zh: '悬架与制动', en: 'Suspension and brakes' }, value: { zh: '前后推杆＋AP Racing', en: 'Push-rod + AP Racing' },
        detail: { zh: '碳纤维/钛合金悬架杆、车内扭杆弹簧阻尼系统。', en: 'Carbon/titanium legs operating inboard torsion bars, springs and dampers.' }, evidence: 'official-spec',
      },
      {
        label: { zh: '侧箱路线', en: 'Sidepod route' }, value: { zh: '独立于三家对手', en: 'Distinct from three rivals' },
        detail: { zh: 'McLaren 公开表态认为 2026 各队侧箱设计仍远未收敛。', en: 'McLaren states the 2026 sidepod concepts remain far from convergence.' }, evidence: 'public-observation',
      },
      {
        label: { zh: '教学建模', en: 'Teaching model' }, value: { zh: '深下切冷却肩部', en: 'Deep-cut cooling shoulder' },
        detail: { zh: '模型夸张进气肩部与底板通道，帮助观察气流取舍。', en: 'The model clarifies the inlet shoulder and floor channel for teaching.' }, evidence: 'educational-inference',
      },
    ],
    sources: [
      regulationSource,
      { label: { zh: 'McLaren MCL40 官方技术规格', en: 'Official McLaren MCL40 technical specification' }, url: 'https://www.mclaren.com/racing/formula-1/2026/what-is-the-technical-specification-of-our-2026-formula-1/', kind: 'team' },
      { label: { zh: 'McLaren MCL40 设计说明', en: 'McLaren MCL40 design briefing' }, url: 'https://www.mclaren.com/racing/formula-1/2026/behind-the-design-of-the-mcl40/', kind: 'team' },
      { label: { zh: 'Formula 1 侧箱路线对照', en: 'Formula 1 sidepod concept comparison' }, url: 'https://www.formula1.com/en/latest/article/theyve-been-quite-smart-and-innovative-stella-singles-out-different-design-trend-from-mclaren-rival.4JiI9b23NHWjwnK53TBQNH.4JiI9b23NHWjwnK53TBQNH', kind: 'technical-analysis' },
    ],
  },
  mercedes: {
    id: 'mercedes',
    teamName: 'Mercedes-AMG PETRONAS',
    modelName: 'W17',
    shortName: 'W17',
    name: { zh: 'Mercedes W17 研究车', en: 'Mercedes W17 study car' },
    snapshot: { zh: '2026 赛季初公开规格', en: 'Public early-2026 specification' },
    signature: {
      zh: '更靠前的驾驶舱、高鼻锥与 Mercedes 厂队一体化 M17 包装。',
      en: 'A forward cockpit, higher nose and works integration of the Mercedes M17.',
    },
    designQuestion: {
      zh: '驾驶舱前移和高鼻锥怎样改变前轮尾流、底板进气与车手感知？',
      en: 'How do a forward cockpit and higher nose alter wheel wake, floor feed and driver feel?',
    },
    palette: {
      body: '#b9c3c9', secondary: '#080b0e', accent: '#00a69d', pinstripe: '#77e5d5',
      carbon: '#101417', metal: '#c4ccd0', wheelAccent: '#27c5ba', powerUnitAccent: '#31d5c9',
      roughness: .19, metalness: .62,
    },
    geometry: {
      noseRearRadius: .43, noseTipRadius: .12, noseLength: 2.18, noseHeight: .84, noseTipHeight: .77, noseUndercutDepth: .17,
      cockpitOffset: .14, monocoqueLength: 3.22, monocoqueWidth: 1.46,
      sidepodWidth: .68, sidepodHeight: .68, sidepodLength: 2.26, sidepodOffset: -.05, sidepodYaw: .05, sidepodDrop: .08,
      inletWidth: .15, inletHeight: .52, inletOffset: .48,
      engineCoverWidth: .84, engineCoverHeight: .82, engineCoverLength: 2.78, engineCoverOffset: -1.32,
      airboxWidth: .36, airboxHeight: .78,
      floorBoardCount: 3, floorBoardSweep: .11, floorEdgeCut: .08, diffuserSlotWidth: .35,
      frontWingSweep: -.02, rearWingWidthScale: 1.02, frontPickupOffset: -.08, rearPickupHeight: 1.10,
      powerUnitWidth: 1.02, powerUnitLength: 1.05, turboOffset: .48,
    },
    facts: [
      {
        label: { zh: '动力单元', en: 'Power unit' }, value: { zh: 'Mercedes-AMG M17', en: 'Mercedes-AMG M17' },
        detail: { zh: '厂队底盘与动力单元联合开发，官方公开 185 kg 最低动力单元质量。', en: 'Works chassis-PU integration with a published 185 kg minimum PU mass.' }, evidence: 'official-spec',
      },
      {
        label: { zh: '公开尺寸', en: 'Published envelope' }, value: { zh: '1900 × 970 mm', en: '1900 × 970 mm' },
        detail: { zh: '宽 1900 mm、高 970 mm，总长低于 5505 mm。', en: '1900 mm wide, 970 mm high and under 5505 mm long.' }, evidence: 'official-spec',
      },
      {
        label: { zh: '车体布局', en: 'Chassis layout' }, value: { zh: '高鼻锥＋前置驾驶舱', en: 'High nose + forward cockpit' },
        detail: { zh: '公开对比显示驾驶舱比 Ferrari 与 Red Bull 更靠前。', en: 'Public comparison places the cockpit forward of Ferrari and Red Bull.' }, evidence: 'public-observation',
      },
      {
        label: { zh: '教学建模', en: 'Teaching model' }, value: { zh: '大底板进气窗口', en: 'Larger floor-feed window' },
        detail: { zh: '用更明显的鼻底通道展示高鼻锥的潜在气流收益。', en: 'An explicit under-nose channel demonstrates the potential floor-feed benefit.' }, evidence: 'educational-inference',
      },
    ],
    sources: [
      regulationSource,
      { label: { zh: 'Mercedes W17 官方技术规格', en: 'Official Mercedes W17 technical specification' }, url: 'https://www.mercedesamgf1.com/f1-w17-2026-technical-specifications', kind: 'team' },
      { label: { zh: 'Mercedes W17 官方发布', en: 'Official Mercedes W17 reveal' }, url: 'https://www.mercedesamgf1.com/news/mercedes-amg-f1-2026-challenger-w17-revealed', kind: 'team' },
      { label: { zh: 'Formula 1 官方技术分析', en: 'Formula 1 official technical analysis' }, url: 'https://www.formula1.com/en/latest/article/the-fascinating-tech-secrets-of-the-2026-regulations-revealed-by-ferrari-and.3cMuqQXJ7RTqHvGkyV1H8t', kind: 'technical-analysis' },
    ],
  },
  'red-bull': {
    id: 'red-bull',
    teamName: 'Oracle Red Bull Racing',
    modelName: 'RB22',
    shortName: 'RB22',
    name: { zh: 'Red Bull RB22 研究车', en: 'Red Bull RB22 study car' },
    snapshot: { zh: '2026 赛季初公开规格', en: 'Public early-2026 specification' },
    signature: {
      zh: '宽鼻锥、管状下倾侧箱与 Red Bull Ford DM01 首套厂队动力系统。',
      en: 'Wide nose, tube-like falling sidepods and Red Bull Ford works DM01 power.',
    },
    designQuestion: {
      zh: '狭窄管状侧箱如何扩大裸露底板，同时把冷却质量重新分配到车体上部？',
      en: 'How do tube-like sidepods expose more floor while moving cooling mass upward?',
    },
    palette: {
      body: '#f0efe9', secondary: '#111c3c', accent: '#d9232e', pinstripe: '#f3c932',
      carbon: '#11151b', metal: '#abb5bb', wheelAccent: '#e22b33', powerUnitAccent: '#f2b72e',
      roughness: .15, metalness: .46,
    },
    geometry: {
      noseRearRadius: .47, noseTipRadius: .15, noseLength: 2.22, noseHeight: .79, noseTipHeight: .72, noseUndercutDepth: .14,
      cockpitOffset: -.02, monocoqueLength: 3.14, monocoqueWidth: 1.44,
      sidepodWidth: .53, sidepodHeight: .52, sidepodLength: 2.44, sidepodOffset: -.22, sidepodYaw: .04, sidepodDrop: .24,
      inletWidth: .085, inletHeight: .28, inletOffset: .55,
      engineCoverWidth: .76, engineCoverHeight: .92, engineCoverLength: 2.98, engineCoverOffset: -1.38,
      airboxWidth: .39, airboxHeight: .86,
      floorBoardCount: 2, floorBoardSweep: .28, floorEdgeCut: .23, diffuserSlotWidth: .25,
      frontWingSweep: .11, rearWingWidthScale: .97, frontPickupOffset: .04, rearPickupHeight: 1.16,
      powerUnitWidth: .98, powerUnitLength: 1.12, turboOffset: .60,
    },
    facts: [
      {
        label: { zh: '动力单元', en: 'Power unit' }, value: { zh: 'Red Bull Ford DM01', en: 'Red Bull Ford DM01' },
        detail: { zh: 'Red Bull 首次在同一体系内制造底盘与完整动力单元。', en: 'Red Bull builds both chassis and complete power unit within one works programme.' }, evidence: 'official-spec',
      },
      {
        label: { zh: '动力架构', en: 'Power architecture' }, value: { zh: '1.6 L V6＋350 kW MGU-K', en: '1.6 L V6 + 350 kW MGU-K' },
        detail: { zh: '90° V6、15,000 rpm 上限，取消 MGU-H。', en: '90° V6, 15,000 rpm ceiling and no MGU-H.' }, evidence: 'official-spec',
      },
      {
        label: { zh: '侧箱路线', en: 'Sidepod route' }, value: { zh: '窄管状下倾侧箱', en: 'Narrow falling tube sidepods' },
        detail: { zh: '公开图像与官方 F1 分析显示其与其他三队明显不同。', en: 'Public imagery and official F1 analysis distinguish it from the other three.' }, evidence: 'public-observation',
      },
      {
        label: { zh: '教学建模', en: 'Teaching model' }, value: { zh: '上置冷却质量', en: 'Raised cooling mass' },
        detail: { zh: '用缩窄侧箱与加高发动机盖解释潜在冷却器重新布置。', en: 'Narrow pods and a taller cover explain the inferred cooling relocation.' }, evidence: 'educational-inference',
      },
    ],
    sources: [
      regulationSource,
      { label: { zh: 'Red Bull RB22 官方车型资料', en: 'Official Red Bull RB22 car profile' }, url: 'https://www.redbullracing.com/int-en/cars/rb22', kind: 'team' },
      { label: { zh: 'Red Bull 2026 技术指南', en: 'Red Bull 2026 technical guide' }, url: 'https://www.redbullracing.com/int-en/f1-season-guide-2026', kind: 'team' },
      { label: { zh: 'Formula 1 侧箱路线对照', en: 'Formula 1 sidepod concept comparison' }, url: 'https://www.formula1.com/en/latest/article/theyve-been-quite-smart-and-innovative-stella-singles-out-different-design-trend-from-mclaren-rival.4JiI9b23NHWjwnK53TBQNH.4JiI9b23NHWjwnK53TBQNH', kind: 'technical-analysis' },
    ],
  },
}

const teamIdSet = new Set<string>(GRAND_PRIX_TEAM_IDS)

export const DEFAULT_GRAND_PRIX_TEAM_ID: GrandPrixTeamId = 'ferrari'

export const isGrandPrixTeamId = (value: string | null): value is GrandPrixTeamId => value !== null && teamIdSet.has(value)

export const getGrandPrixTeam = (id: GrandPrixTeamId) => GRAND_PRIX_TEAMS[id]
