import type { Locale } from './i18n'
import type { GrandPrixTeamId } from './grandPrixTeams'

export type GrandPrixDriver = {
  id: string
  teamId: GrandPrixTeamId
  number: number
  name: string
  nationality: Record<Locale, string>
  intro: Record<Locale, string>
  image: string
  profileUrl: string
  photo: {
    author: string
    sourceUrl: string
    license: string
    licenseUrl: string
  }
}

/**
 * 2026 race-driver line-ups checked against Formula 1's official team and
 * driver pages on 2026-07-16. Photographs are locally hosted, openly licensed
 * Wikimedia Commons files; full provenance lives beside the assets.
 */
export const GRAND_PRIX_DRIVERS: Record<GrandPrixTeamId, readonly [GrandPrixDriver, GrandPrixDriver]> = {
  ferrari: [
    {
      id: 'charles-leclerc',
      teamId: 'ferrari',
      number: 16,
      name: 'Charles Leclerc',
      nationality: { zh: '摩纳哥', en: 'Monaco' },
      intro: {
        zh: '勒克莱尔在 2017 年夺得 F2 冠军，2018 年进入 F1，并从 2019 年起代表 Ferrari。他以锐利的单圈速度、强势的排位表现和精准的前轴反馈著称，是研究车手如何在低抓地与轮胎窗口边缘建立信心的典型样本。',
        en: 'Leclerc won the 2017 F2 title, entered Formula 1 in 2018 and has raced for Ferrari since 2019. His sharp one-lap pace, qualifying strength and precise front-axle feedback make him a valuable reference for studying how a driver builds confidence near the edge of grip and tyre performance.',
      },
      image: '/images/drivers/charles-leclerc.jpg',
      profileUrl: 'https://www.formula1.com/en/drivers/charles-leclerc',
      photo: {
        author: 'Steffen Prößdorf',
        sourceUrl: 'https://commons.wikimedia.org/wiki/File:2024-08-25_Motorsport,_Formel_1,_Gro%C3%9Fer_Preis_der_Niederlande_2024_STP_3978_by_Stepro_(cropped2).jpg',
        license: 'CC BY-SA 4.0',
        licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0',
      },
    },
    {
      id: 'lewis-hamilton',
      teamId: 'ferrari',
      number: 44,
      name: 'Lewis Hamilton',
      nationality: { zh: '英国', en: 'United Kingdom' },
      intro: {
        zh: '汉密尔顿是七届世界冠军，拥有跨越多个技术规则周期的顶级经验，并于 2025 年加入 Ferrari。他擅长轮胎管理、湿地驾驶和长距离节奏控制，也能帮助学习者理解车手反馈如何影响赛车设定、研发方向与比赛策略。',
        en: 'Hamilton is a seven-time World Champion with elite experience across several technical eras, and he joined Ferrari in 2025. His tyre management, wet-weather craft and long-run control help illustrate how driver feedback can shape car set-up, development direction and race strategy.',
      },
      image: '/images/drivers/lewis-hamilton.jpg',
      profileUrl: 'https://www.formula1.com/en/drivers/lewis-hamilton',
      photo: {
        author: 'Number 10',
        sourceUrl: 'https://commons.wikimedia.org/wiki/File:Prime_Minister_Keir_Starmer_meets_Sir_Lewis_Hamilton_(54566928382)_(cropped).jpg',
        license: 'OGL 3.0',
        licenseUrl: 'https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/',
      },
    },
  ],
  mclaren: [
    {
      id: 'lando-norris',
      teamId: 'mclaren',
      number: 4,
      name: 'Lando Norris',
      nationality: { zh: '英国', en: 'United Kingdom' },
      intro: {
        zh: '诺里斯自 2019 年 F1 首秀以来一直效力 McLaren，并在 2025 年赢得世界冠军。他的高速弯承诺度、细腻的刹车释放和不断成熟的比赛管理，使他成为观察车手如何把一台前端敏感的赛车转化为稳定圈速的理想对象。',
        en: 'Norris has raced for McLaren since his 2019 Formula 1 debut and won the 2025 World Championship. His commitment in fast corners, delicate brake release and increasingly complete race management make him an ideal reference for turning a front-sensitive car into repeatable lap time.',
      },
      image: '/images/drivers/lando-norris.jpg',
      profileUrl: 'https://www.formula1.com/en/drivers/lando-norris',
      photo: {
        author: 'Steffen Prößdorf / Mb2437',
        sourceUrl: 'https://commons.wikimedia.org/wiki/File:2024-08-25_Motorsport,_Formel_1,_Gro%C3%9Fer_Preis_der_Niederlande_2024_STP_3968_by_Stepro_(cropped2).jpg',
        license: 'CC BY-SA 4.0',
        licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0',
      },
    },
    {
      id: 'oscar-piastri',
      teamId: 'mclaren',
      number: 81,
      name: 'Oscar Piastri',
      nationality: { zh: '澳大利亚', en: 'Australia' },
      intro: {
        zh: '皮亚斯特里连续在新秀赛季赢得 F3 与 F2 总冠军，2023 年代表 McLaren 完成 F1 首秀，并很快成长为分站冠军与年度争冠车手。他冷静、直接的驾驶风格尤其适合用来分析刹车稳定性、低速牵引和高压力下的决策质量。',
        en: 'Piastri won both F3 and F2 as a rookie, made his Formula 1 debut with McLaren in 2023 and rapidly became a Grand Prix winner and title contender. His calm, direct style is especially useful for analysing braking stability, low-speed traction and decision quality under pressure.',
      },
      image: '/images/drivers/oscar-piastri.jpg',
      profileUrl: 'https://www.formula1.com/en/drivers/oscar-piastri',
      photo: {
        author: 'Liauzh',
        sourceUrl: 'https://commons.wikimedia.org/wiki/File:2026_Chinese_GP_-_Oscar_Piastri_(cropped)_(cropped).jpg',
        license: 'CC BY 4.0',
        licenseUrl: 'https://creativecommons.org/licenses/by/4.0',
      },
    },
  ],
  mercedes: [
    {
      id: 'george-russell',
      teamId: 'mercedes',
      number: 63,
      name: 'George Russell',
      nationality: { zh: '英国', en: 'United Kingdom' },
      intro: {
        zh: '拉塞尔在 2017 年加入 Mercedes 青训体系，历经 Williams 三个赛季后于 2022 年进入 Mercedes 厂队。他拥有出色的排位执行力和清晰的工程表达，适合用于理解车手如何在制动、入弯旋转与轮胎温度之间建立可重复的设定基线。',
        en: 'Russell joined the Mercedes junior programme in 2017 and moved to the works team in 2022 after three seasons with Williams. His qualifying execution and clear engineering communication help explain how a driver builds a repeatable set-up baseline across braking, corner-entry rotation and tyre temperature.',
      },
      image: '/images/drivers/george-russell.jpg',
      profileUrl: 'https://www.formula1.com/en/drivers/george-russell',
      photo: {
        author: 'Raph_PH',
        sourceUrl: 'https://commons.wikimedia.org/wiki/File:George_Russell_KingsLeonSilverstne040724_(29_of_112)_(53838190205)_(cropped).jpg',
        license: 'CC BY 2.0',
        licenseUrl: 'https://creativecommons.org/licenses/by/2.0',
      },
    },
    {
      id: 'kimi-antonelli',
      teamId: 'mercedes',
      number: 12,
      name: 'Kimi Antonelli',
      nationality: { zh: '意大利', en: 'Italy' },
      intro: {
        zh: '安东内利从 Mercedes 青训梯队快速晋升，并在 2025 年完成 F1 新秀赛季。他的成长轨迹提供了独特的学习视角：年轻车手如何适应制动能量回收、复杂方向盘流程、高速下压力和长距离轮胎管理。',
        en: 'Antonelli rose rapidly through the Mercedes junior system and completed his Formula 1 rookie season in 2025. His development offers a distinctive learning lens on how a young driver adapts to brake-energy recovery, complex steering-wheel procedures, high downforce and long-run tyre management.',
      },
      image: '/images/drivers/kimi-antonelli.jpg',
      profileUrl: 'https://www.formula1.com/en/drivers/kimi-antonelli',
      photo: {
        author: 'Kuyper',
        sourceUrl: 'https://commons.wikimedia.org/wiki/File:Kimi_Antonelli_at_the_2025_US_Grand_Prix_in_Austin,_TX_(cropped).jpg',
        license: 'CC BY-SA 4.0',
        licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0',
      },
    },
  ],
  'red-bull': [
    {
      id: 'max-verstappen',
      teamId: 'red-bull',
      number: 3,
      name: 'Max Verstappen',
      nationality: { zh: '荷兰', en: 'Netherlands' },
      intro: {
        zh: '维斯塔潘在 2016 年成为 F1 历史上最年轻的分站冠军，并连续赢得 2021 至 2024 年世界冠军。他对前轴响应和车尾旋转的高容忍度，加上极强的临场调整能力，为研究激进赛车平衡与车手适应性提供了鲜明案例。',
        en: 'Verstappen became Formula 1\'s youngest Grand Prix winner in 2016 and won four consecutive World Championships from 2021 to 2024. His tolerance for sharp front response and rear rotation, combined with exceptional mid-race adaptation, offers a vivid case study in aggressive car balance and driver adaptability.',
      },
      image: '/images/drivers/max-verstappen.jpg',
      profileUrl: 'https://www.formula1.com/en/drivers/max-verstappen',
      photo: {
        author: 'Steffen Prößdorf',
        sourceUrl: 'https://commons.wikimedia.org/wiki/File:2024-08-25_Motorsport,_Formel_1,_Gro%C3%9Fer_Preis_der_Niederlande_2024_STP_3973_by_Stepro_(medium_crop).jpg',
        license: 'CC BY-SA 4.0',
        licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0',
      },
    },
    {
      id: 'isack-hadjar',
      teamId: 'red-bull',
      number: 6,
      name: 'Isack Hadjar',
      nationality: { zh: '法国', en: 'France' },
      intro: {
        zh: '哈贾尔在 2025 年代表 Racing Bulls 完成 F1 首秀，并凭借包括赞德沃特领奖台在内的表现升入 2026 年 Red Bull 阵容。他的案例展示了新生代车手如何在高下压力赛车中快速建立信心，同时应对顶级车队更高的反馈精度与成绩压力。',
        en: 'Hadjar debuted with Racing Bulls in 2025 and earned promotion to Red Bull for 2026 after a rookie campaign that included a Zandvoort podium. His path shows how a new-generation driver builds confidence in a high-downforce car while meeting a leading team\'s greater demands for feedback precision and results.',
      },
      image: '/images/drivers/isack-hadjar.jpg',
      profileUrl: 'https://www.formula1.com/en/drivers/isack-hadjar',
      photo: {
        author: 'Yu Chu Chin',
        sourceUrl: 'https://commons.wikimedia.org/wiki/File:Isack_Hadjar_at_the_Melbourne_Walk_during_the_2026_Australian_Grand_Prix_(028A8753)_(cropped).jpg',
        license: 'CC BY-SA 4.0',
        licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0',
      },
    },
  ],
}

export const GRAND_PRIX_DRIVER_IDS = Object.values(GRAND_PRIX_DRIVERS).flatMap((drivers) => drivers.map((driver) => driver.id))
