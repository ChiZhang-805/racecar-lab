export const MUSIC_MODES = ['sequence', 'repeat-one', 'shuffle'] as const

export type MusicMode = typeof MUSIC_MODES[number]

export type MusicTrackId =
  | 'cinematic-fairy-tale-story'
  | 'tomorrow'
  | 'happy-happy-music'
  | 'travel'
  | 'hotel-wood'
  | 'cozy-routine'
  | 'rise-and-shine'
  | 'luxury-cars'

export const MUSIC_RIGHTS_ARCHIVE_NOTICE = {
  zh: '发布或再分发前，需为本音轨归档原始来源、许可条款和署名要求。',
  en: 'Archive this track’s original source, license terms and attribution requirements before release or redistribution.',
} as const

export type MusicTrack = {
  id: MusicTrackId
  file: string
  title: Record<'zh' | 'en', string>
  sourceFilename: string
  rightsArchiveNotice: typeof MUSIC_RIGHTS_ARCHIVE_NOTICE
}

export const MUSIC_TRACKS: MusicTrack[] = [
  {
    id: 'cinematic-fairy-tale-story',
    file: '/audio/good_b_music-cinematic-fairy-tale-story-main-8697.mp3',
    title: { zh: '电影童话叙事', en: 'Cinematic Fairy Tale Story' },
    sourceFilename: 'good_b_music-cinematic-fairy-tale-story-main-8697.mp3',
    rightsArchiveNotice: MUSIC_RIGHTS_ARCHIVE_NOTICE,
  },
  {
    id: 'tomorrow',
    file: '/audio/lemonmusicstudio-tomorrow-114848.mp3',
    title: { zh: '明日旅程', en: 'Tomorrow' },
    sourceFilename: 'lemonmusicstudio-tomorrow-114848.mp3',
    rightsArchiveNotice: MUSIC_RIGHTS_ARCHIVE_NOTICE,
  },
  {
    id: 'happy-happy-music',
    file: '/audio/paulyudin-happy-happy-music-477929.mp3',
    title: { zh: '愉快节拍', en: 'Happy Happy Music' },
    sourceFilename: 'paulyudin-happy-happy-music-477929.mp3',
    rightsArchiveNotice: MUSIC_RIGHTS_ARCHIVE_NOTICE,
  },
  {
    id: 'travel',
    file: '/audio/nastelbom-travel-437814.mp3',
    title: { zh: '旅行律动', en: 'Travel' },
    sourceFilename: 'nastelbom-travel-437814.mp3',
    rightsArchiveNotice: MUSIC_RIGHTS_ARCHIVE_NOTICE,
  },
  {
    id: 'hotel-wood',
    file: '/audio/magiksolo-hotel-wood-124516.mp3',
    title: { zh: '木质酒店', en: 'Hotel Wood' },
    sourceFilename: 'magiksolo-hotel-wood-124516.mp3',
    rightsArchiveNotice: MUSIC_RIGHTS_ARCHIVE_NOTICE,
  },
  {
    id: 'cozy-routine',
    file: '/audio/lafrey_music-cozy-routine-537367.mp3',
    title: { zh: '惬意日常', en: 'Cozy Routine' },
    sourceFilename: 'lafrey_music-cozy-routine-537367.mp3',
    rightsArchiveNotice: MUSIC_RIGHTS_ARCHIVE_NOTICE,
  },
  {
    id: 'rise-and-shine',
    file: '/audio/high_kick-rise-and-shine-110981.mp3',
    title: { zh: '迎光启动', en: 'Rise and Shine' },
    sourceFilename: 'high_kick-rise-and-shine-110981.mp3',
    rightsArchiveNotice: MUSIC_RIGHTS_ARCHIVE_NOTICE,
  },
  {
    id: 'luxury-cars',
    file: '/audio/soundsurfer-luxury-cars-276737.mp3',
    title: { zh: '豪华跑车', en: 'Luxury Cars' },
    sourceFilename: 'soundsurfer-luxury-cars-276737.mp3',
    rightsArchiveNotice: MUSIC_RIGHTS_ARCHIVE_NOTICE,
  },
]
