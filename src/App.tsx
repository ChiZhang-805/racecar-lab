import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import {
  ArrowRight, Check, ChevronRight, CircleDot, Compass, Eye, EyeOff, Gauge, Globe2, House,
  Languages, Layers3, LockKeyhole, Map, Maximize2, Pause, Play, RotateCcw, ScanLine,
  Settings, Sparkles, Wind, X, Zap, BookOpenCheck, CarFront, Music2, Repeat, Repeat1, Shuffle,
  Volume2,
} from 'lucide-react'
import CarScene from './CarScene'
import { CATEGORIES, COURSES, COURSE_IDS, PARTS, PART_MAP, type CategoryId, type Course, type CourseId, type PartId, type ScenarioId } from './data'
import { copy, getCategoryName, getCourse, getPart, getScenarioName, type Locale } from './i18n'
import { readJson, readText, removeStored, writeJson, writeText } from './storage'
import { useDialogFocus } from './useDialogFocus'
import { VEHICLES, VEHICLE_IDS, isVehicleId, type VehicleId } from './vehicles'
import { MUSIC_MODES, MUSIC_TRACKS, type MusicMode, type MusicTrackId } from './music'

const EngineeringDetail = lazy(() => import('./EngineeringDetail'))
const KnowledgeCenter = lazy(() => import('./KnowledgeCenter'))

const CATEGORY_ORDER: CategoryId[] = ['aero', 'structure', 'dynamics', 'power', 'electronics']
const SCENARIO_ORDER: ScenarioId[] = ['idle', 'acceleration', 'braking', 'cornering', 'aero']

const scenarioIcons: Record<ScenarioId, typeof CircleDot> = {
  idle: Compass, acceleration: Zap, braking: CircleDot, cornering: Gauge, aero: Wind,
}

const courseScenario: Record<CourseId, ScenarioId> = {
  orientation: 'idle', forces: 'braking', tires: 'cornering', braking: 'braking',
  suspension: 'cornering', aero: 'aero', powertrain: 'acceleration', integration: 'idle',
}

const courseIdSet = new Set<string>(COURSE_IDS)
const musicTrackIdSet = new Set<string>(MUSIC_TRACKS.map((track) => track.id))
const isMusicTrackId = (value: string | null): value is MusicTrackId => value !== null && musicTrackIdSet.has(value)
const isMusicMode = (value: string | null): value is MusicMode => value !== null && (MUSIC_MODES as readonly string[]).includes(value)
const isCourseProgress = (value: unknown): value is CourseId[] => Array.isArray(value)
  && value.length <= COURSE_IDS.length
  && new Set(value).size === value.length
  && value.every((id) => typeof id === 'string' && courseIdSet.has(id))
const prefersReducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
const isProfileId = (value: string | null): value is string => value !== null && /^[A-Z0-9-]{3,64}$/.test(value)

function Brand({ locale, compact = false }: { locale: Locale; compact?: boolean }) {
  return (
    <div className={`brand ${compact ? 'brand--compact' : ''}`}>
      <span className="brand-mark"><span /></span>
      <span className="brand-copy">
        <strong>RACECAR LAB</strong>
        {!compact && <small>{copy[locale].brandSubtitle}</small>}
      </span>
    </div>
  )
}

function LoadingOverlay({ locale }: { locale: Locale }) {
  return <div className="overlay loading-overlay" role="status" aria-live="polite"><div className="loading-indicator" /><span>{locale === 'zh' ? '正在加载…' : 'Loading…'}</span></div>
}

function IntroScreen({ locale, paused, onEnter, onReset, onTogglePause, onKnowledge, onSettings }: { locale: Locale; paused: boolean; onEnter: (courseMode: boolean) => void; onReset: () => void; onTogglePause: () => void; onKnowledge: () => void; onSettings: () => void }) {
  const c = copy[locale]
  return (
    <section className="intro-screen">
      <div className="intro-decor" aria-hidden="true">
        <span className="decor-orbit decor-orbit--outer" />
        <span className="decor-orbit decor-orbit--inner" />
        <span className="decor-frame decor-frame--top" />
        <span className="decor-frame decor-frame--bottom" />
        <span className="decor-axis" />
        <i className="decor-node decor-node--one" />
        <i className="decor-node decor-node--two" />
        <i className="decor-node decor-node--three" />
      </div>
      <header className="intro-nav">
        <Brand locale={locale} />
        <div className="intro-nav__actions">
          <button className="top-button top-button--icon" onClick={onReset} title={c.resetCar} aria-label={c.resetCar}><RotateCcw size={19} /></button>
          <button className={`top-button top-button--icon ${paused ? 'is-active' : ''}`} onClick={onTogglePause} title={paused ? c.resumeCar : c.pauseCar} aria-label={paused ? c.resumeCar : c.pauseCar} aria-pressed={paused}>
            {paused ? <Play size={19} fill="currentColor" /> : <Pause size={19} />}
          </button>
          <button className="top-button top-button--icon" onClick={onKnowledge} title={c.knowledge} aria-label={c.knowledge}><BookOpenCheck size={19} /></button>
          <button className="top-button top-button--icon" onClick={onSettings} title={c.settings} aria-label={c.settings}><Settings size={19} /></button>
        </div>
      </header>

      <div className="intro-copy">
        <div className="eyebrow"><Sparkles size={15} /> {c.eyebrow}</div>
        <h1>{c.heroA}<br /><span>{c.heroB}</span></h1>
        <div className="intro-actions">
          <button className="button button--primary button--large" onClick={() => onEnter(true)}>
            <Play size={18} fill="currentColor" /> {c.firstLesson} <ArrowRight size={18} />
          </button>
          <button className="button button--glass button--large" onClick={() => onEnter(false)}>
            <Compass size={19} /> {c.freeExplore}
          </button>
        </div>
      </div>

      <div className="intro-hint"><span className="mouse"><span /></span><span>{c.dragCar}</span></div>
      <div className="intro-line intro-line--one" /><div className="intro-line intro-line--two" />
    </section>
  )
}

function SystemRail({ locale, visible, onToggle }: { locale: Locale; visible: CategoryId[]; onToggle: (category: CategoryId) => void }) {
  const c = copy[locale]
  return (
    <aside className="system-rail glass-panel">
      <div className="rail-label">{c.systems}</div>
      {CATEGORY_ORDER.map((category, index) => {
        const active = visible.includes(category)
        return (
          <button key={category} className={`system-button ${active ? 'is-active' : ''}`} onClick={() => onToggle(category)} title={`${active ? c.hide : c.show} ${getCategoryName(category, locale)}`} aria-pressed={active}>
            <span className="system-index">0{index + 1}</span>
            <span className="system-dot" style={{ '--system-color': CATEGORIES[category].color } as React.CSSProperties} />
            <span className="system-name"><strong>{getCategoryName(category, locale)}</strong></span>
            {active ? <Eye size={16} /> : <EyeOff size={16} />}
          </button>
        )
      })}
    </aside>
  )
}

function PartPanel({ locale, vehicleId, partId, onClose, onDetails }: { locale: Locale; vehicleId: VehicleId; partId: PartId; onClose: () => void; onDetails: () => void }) {
  const c = copy[locale]
  const part = getPart(partId, locale, vehicleId)
  if (!part) return null
  const summary = [part.short, part.purpose, part.analogy, part.engineering[0], part.engineering[1], part.faults[0]].join(locale === 'zh' ? '' : ' ')
  return (
    <aside className="part-panel glass-panel">
      <div className="part-panel__topline">
        <div className="category-pill" style={{ '--category-color': CATEGORIES[part.category].color } as React.CSSProperties}>
          <span /> {getCategoryName(part.category, locale)}
        </div>
        <button className="icon-button" onClick={onClose} aria-label={c.close}><X size={18} /></button>
      </div>
      <h2>{part.name}</h2>
      <p>{summary}</p>
      <div className="connection-row"><span>{c.related}</span><div>{part.connections.slice(0, 3).map((name) => <em key={name}>{name}</em>)}</div></div>
      <button className="button button--primary part-deep-button" onClick={onDetails}>{c.deepDive} <Maximize2 size={17} /></button>
    </aside>
  )
}

function CourseMap({ locale, vehicleId, completed, activeCourse, onStart, onClose }: { locale: Locale; vehicleId: VehicleId; completed: CourseId[]; activeCourse: Course | null; onStart: (course: Course) => void; onClose: () => void }) {
  const c = copy[locale]
  const dialogRef = useDialogFocus<HTMLDivElement>()
  return (
    <div className="overlay course-overlay" role="dialog" aria-modal="true" aria-label={c.courseMap}>
      <div className="overlay-backdrop" onClick={onClose} />
      <div className="course-modal" ref={dialogRef} tabIndex={-1}>
        <header className="course-header">
          <div><span className="modal-overline">{c.courseMap}</span><h2>{c.coursePath}</h2></div>
          <div className="course-progress-ring"><strong>{completed.length}<small>/{String(COURSES.length).padStart(2, '0')}</small></strong><span>{c.completed}</span></div>
          <button className="settings-close" onClick={onClose} aria-label={c.close} title={c.close}><X size={20} /></button>
        </header>
        <div className="course-path">{COURSES.map((baseCourse, index) => {
          const course = getCourse(baseCourse, locale, vehicleId)
          const done = completed.includes(course.id)
          const previous = COURSES[index - 1]
          const unlocked = index === 0 || Boolean(previous && completed.includes(previous.id))
          const active = activeCourse?.id === course.id
          return (
            <div className={`course-node-wrap ${index % 2 ? 'course-node-wrap--lower' : ''}`} key={course.id}>
              {index < COURSES.length - 1 && <span className="course-connector" />}
              <button className={`course-node ${done ? 'is-done' : ''} ${active ? 'is-active' : ''} ${!unlocked ? 'is-locked' : ''}`} disabled={!unlocked} onClick={() => onStart(baseCourse)} aria-current={active ? 'step' : undefined}>
                <span className="course-node__number">{done ? <Check size={18} /> : !unlocked ? <LockKeyhole size={16} /> : course.number}</span>
                <span className="course-node__copy"><strong>{course.title}</strong></span>{unlocked && <ChevronRight size={18} />}
              </button>
            </div>
          )
        })}</div>
        <footer className="course-footer"><span><i className="legend-dot legend-dot--done" /> {c.done}</span><span><i className="legend-dot legend-dot--active" /> {c.currentCourse}</span><span><i className="legend-dot legend-dot--locked" /> {c.locked}</span></footer>
      </div>
    </div>
  )
}

function LessonPanel({ locale, vehicleId, course: baseCourse, visited, onPart, onQuiz, onClose }: { locale: Locale; vehicleId: VehicleId; course: Course; visited: PartId[]; onPart: (partId: PartId) => void; onQuiz: () => void; onClose: () => void }) {
  const c = copy[locale]
  const course = getCourse(baseCourse, locale, vehicleId)
  const requiredVisited = course.parts.filter((part) => visited.includes(part)).length
  const remaining = course.parts.length - requiredVisited
  return (
    <aside className="lesson-panel glass-panel">
      <div className="lesson-top"><span>{c.lesson} {course.number}</span><button className="icon-button" onClick={onClose} aria-label={c.close}><X size={17} /></button></div>
      <h3>{course.title}</h3><p>{course.description}</p>
      <div className="lesson-task"><span>{c.task}</span>{course.task}</div>
      <div className="lesson-parts">{course.parts.map((partId, index) => (
        <button key={partId} className={visited.includes(partId) ? 'is-visited' : ''} onClick={() => onPart(partId)}>
          {visited.includes(partId) ? <Check size={14} /> : <span>0{index + 1}</span>}{getPart(partId, locale, vehicleId).name}
        </button>
      ))}</div>
      <button className="button button--primary lesson-finish" disabled={remaining > 0} onClick={onQuiz}>
        {remaining > 0 ? `${c.observeMore} ${remaining} ${c.components}` : c.enterQuiz}<ArrowRight size={16} />
      </button>
    </aside>
  )
}

function QuizModal({ locale, vehicleId, course: baseCourse, onComplete, onClose }: { locale: Locale; vehicleId: VehicleId; course: Course; onComplete: () => void; onClose: () => void }) {
  const c = copy[locale]
  const course = getCourse(baseCourse, locale, vehicleId)
  const [answer, setAnswer] = useState<number | null>(null)
  const dialogRef = useDialogFocus<HTMLDivElement>()
  const correct = answer === course.answer
  return (
    <div className="overlay quiz-overlay" role="dialog" aria-modal="true" aria-label={c.quiz}>
      <div className="overlay-backdrop" onClick={onClose} /><div className="quiz-modal" ref={dialogRef} tabIndex={-1}>
        <div className="quiz-label">{c.checkpoint} · {course.number}</div><h2>{course.question}</h2>
        <div className="quiz-options" role="radiogroup">{course.options.map((option, index) => (
          <button key={option} role="radio" aria-checked={answer === index} disabled={correct} className={`${answer === index ? 'is-selected' : ''} ${answer !== null && index === course.answer ? 'is-correct' : ''} ${answer === index && !correct ? 'is-wrong' : ''}`} onClick={() => setAnswer(index)}>
            <span>{String.fromCharCode(65 + index)}</span>{option}
          </button>
        ))}</div>
        <div className={`quiz-result ${answer === null ? '' : 'is-visible'} ${correct ? 'is-correct' : ''}`}>{correct ? c.correct : c.incorrect}</div>
        <div className="quiz-actions"><button className="button button--glass" onClick={onClose}>{c.backObserve}</button><button className="button button--primary" disabled={!correct} onClick={onComplete}>{c.finishCourse} <Check size={16} /></button></div>
      </div>
    </div>
  )
}

function ScenarioDock({ locale, scenario, onScenario, explode, onExplode, xray, onXray }: { locale: Locale; scenario: ScenarioId; onScenario: (scenario: ScenarioId) => void; explode: number; onExplode: (value: number) => void; xray: boolean; onXray: () => void }) {
  const c = copy[locale]
  return (
    <div className="scenario-dock glass-panel">
      <div className="scenario-group">{SCENARIO_ORDER.map((id) => {
        const Icon = scenarioIcons[id]
        return <button key={id} className={scenario === id ? 'is-active' : ''} onClick={() => onScenario(id)} aria-pressed={scenario === id}><Icon size={22} /><span><strong>{getScenarioName(id, locale)}</strong></span></button>
      })}</div>
      <div className="dock-divider" />
      <div className="explode-control"><span><Layers3 size={22} /> {c.explode}</span><input aria-label={c.explode} type="range" min="0" max="1" step="0.01" value={explode} onChange={(event) => onExplode(Number(event.target.value))} /><em>{Math.round(explode * 100)}%</em></div>
      <button className={`xray-button ${xray ? 'is-active' : ''}`} onClick={onXray} aria-pressed={xray}><ScanLine size={22} /> {c.xray}</button>
    </div>
  )
}

function SettingsModal({
  locale, vehicleId, musicTrackId, musicMode, musicPlaying, musicError,
  onLocale, onVehicle, onMusicTrack, onMusicMode, onToggleMusic, onClose, onResetProgress,
}: {
  locale: Locale
  vehicleId: VehicleId
  musicTrackId: MusicTrackId
  musicMode: MusicMode
  musicPlaying: boolean
  musicError: boolean
  onLocale: (locale: Locale) => void
  onVehicle: (vehicleId: VehicleId) => void
  onMusicTrack: (trackId: MusicTrackId) => void
  onMusicMode: () => void
  onToggleMusic: () => void
  onClose: () => void
  onResetProgress: () => void
}) {
  const c = copy[locale]
  const [confirmReset, setConfirmReset] = useState(false)
  const dialogRef = useDialogFocus<HTMLElement>()
  const selectedTrack = MUSIC_TRACKS.find((track) => track.id === musicTrackId) ?? MUSIC_TRACKS[0]!
  const ModeIcon = musicMode === 'repeat-one' ? Repeat1 : musicMode === 'shuffle' ? Shuffle : Repeat
  const modeLabel = musicMode === 'repeat-one' ? c.musicRepeatOne : musicMode === 'shuffle' ? c.musicShuffle : c.musicSequence
  return (
    <div className="overlay settings-overlay" role="dialog" aria-modal="true" aria-label={c.settingsTitle}>
      <div className="overlay-backdrop" onClick={onClose} />
      <section className="settings-modal" ref={dialogRef} tabIndex={-1}>
        <header className="settings-modal__header"><span className="settings-title"><Settings size={20} /> {c.settings}</span><button className="settings-close" onClick={onClose} aria-label={c.close} title={c.close}><X size={20} /></button></header>
        <div className="settings-section"><h3><Languages size={20} /> {c.language}</h3><div className="language-options">
          <button data-locale="zh" className={locale === 'zh' ? 'is-active' : ''} onClick={() => onLocale('zh')} aria-pressed={locale === 'zh'}><Globe2 size={22} /><strong>中文</strong>{locale === 'zh' && <Check size={19} />}</button>
          <button data-locale="en" className={locale === 'en' ? 'is-active' : ''} onClick={() => onLocale('en')} aria-pressed={locale === 'en'}><Globe2 size={22} /><strong>English</strong>{locale === 'en' && <Check size={19} />}</button>
        </div></div>
        <div className="settings-section"><h3><CarFront size={20} /> {c.vehicle}</h3><div className="language-options vehicle-options">
          {VEHICLE_IDS.map((id) => <button data-vehicle={id} key={id} className={vehicleId === id ? 'is-active' : ''} onClick={() => onVehicle(id)} aria-pressed={vehicleId === id}><CarFront size={22} /><strong>{VEHICLES[id].name[locale]}</strong>{vehicleId === id && <Check size={19} />}</button>)}
        </div></div>
        <div className="settings-section settings-section--music">
          <div className="music-header">
            <h3><Music2 size={20} /> {c.music}</h3>
            <div className="music-actions">
              <button className="settings-icon-button" onClick={onToggleMusic} aria-label={musicPlaying ? c.musicPause : c.musicPlay} title={musicPlaying ? c.musicPause : c.musicPlay}>
                {musicPlaying ? <Pause size={18} /> : <Play size={18} fill="currentColor" />}
              </button>
              <button className="settings-icon-button" onClick={onMusicMode} aria-label={modeLabel} title={modeLabel}>
                <ModeIcon size={18} />
              </button>
            </div>
          </div>
          <div className={`music-now ${musicError ? 'has-error' : ''}`}>
            <Volume2 size={18} />
            <strong>{selectedTrack.title[locale]}</strong>
            <span>{musicError ? c.musicMissing : modeLabel}</span>
          </div>
          <div className="music-track-list">
            {MUSIC_TRACKS.map((track) => (
              <button key={track.id} className={musicTrackId === track.id ? 'is-active' : ''} onClick={() => onMusicTrack(track.id)} aria-pressed={musicTrackId === track.id}>
                <strong>{track.title[locale]}</strong>
                {musicTrackId === track.id && <Check size={17} />}
              </button>
            ))}
          </div>
        </div>
        <div className="settings-section settings-section--progress">
          {confirmReset ? <div className="reset-confirm"><span>{c.resetConfirm}?</span><button className="button button--glass" onClick={() => setConfirmReset(false)}>{c.cancel}</button><button className="button button--danger" onClick={() => { onResetProgress(); setConfirmReset(false) }}>{c.resetConfirm}</button></div>
            : <button className="button button--glass reset-progress" onClick={() => setConfirmReset(true)}><RotateCcw size={16} /> {c.resetProgress}</button>}
        </div>
      </section>
    </div>
  )
}

function App() {
  const [locale, setLocale] = useState<Locale>(() => readText('racecar-lab-locale') === 'en' ? 'en' : 'zh')
  const [vehicleId, setVehicleId] = useState<VehicleId>(() => {
    const saved = readText('racecar-lab-vehicle')
    return isVehicleId(saved) ? saved : 'student-ev'
  })
  const [musicTrackId, setMusicTrackId] = useState<MusicTrackId>(() => {
    const saved = readText('racecar-lab-music-track')
    return isMusicTrackId(saved) ? saved : MUSIC_TRACKS[0]!.id
  })
  const [musicMode, setMusicMode] = useState<MusicMode>(() => {
    const saved = readText('racecar-lab-music-mode')
    return isMusicMode(saved) ? saved : 'sequence'
  })
  const [musicPlaying, setMusicPlaying] = useState(false)
  const [musicError, setMusicError] = useState(false)
  const [intro, setIntro] = useState(true)
  const [introPaused, setIntroPaused] = useState(prefersReducedMotion)
  const [entering, setEntering] = useState(false)
  const [selectedId, setSelectedId] = useState<PartId | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [courseMapOpen, setCourseMapOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [knowledgeOpen, setKnowledgeOpen] = useState(false)
  const [quizOpen, setQuizOpen] = useState(false)
  const [activeCourse, setActiveCourse] = useState<Course | null>(null)
  const [visitedParts, setVisitedParts] = useState<PartId[]>([])
  const [scenario, setScenario] = useState<ScenarioId>('idle')
  const [explode, setExplode] = useState(0)
  const [xray, setXray] = useState(false)
  const [visibleCategories, setVisibleCategories] = useState<CategoryId[]>(CATEGORY_ORDER)
  const [resetSignal, setResetSignal] = useState(0)
  const audioRef = useRef<HTMLAudioElement>(null)
  const audioSourceRef = useRef('')
  const timers = useRef(new Set<number>())
  const [profileId] = useState(() => {
    const existing = readText('racecar-lab-profile')
    if (isProfileId(existing)) return existing
    const created = `RC-${Math.random().toString(36).slice(2, 7).toUpperCase()}`
    writeText('racecar-lab-profile', created)
    return created
  })
  const progressKey = vehicleId === 'student-ev' ? `racecar-lab-progress:${profileId}` : `racecar-lab-progress:${profileId}:${vehicleId}`
  const knowledgeKey = vehicleId === 'student-ev' ? `racecar-lab-knowledge:${profileId}` : `racecar-lab-knowledge:${profileId}:${vehicleId}`
  const [completed, setCompleted] = useState<CourseId[]>(() => readJson(progressKey, isCourseProgress, []))

  const c = copy[locale]
  const selectedPart = selectedId ? PART_MAP[selectedId] : null
  const currentMusicTrack = MUSIC_TRACKS.find((track) => track.id === musicTrackId) ?? MUSIC_TRACKS[0]!

  useEffect(() => { writeJson(progressKey, completed) }, [completed, progressKey])
  useEffect(() => { writeText('racecar-lab-vehicle', vehicleId) }, [vehicleId])
  useEffect(() => { writeText('racecar-lab-music-track', musicTrackId) }, [musicTrackId])
  useEffect(() => { writeText('racecar-lab-music-mode', musicMode) }, [musicMode])
  useEffect(() => {
    writeText('racecar-lab-locale', locale)
    document.documentElement.lang = locale === 'zh' ? 'zh-CN' : 'en'
    document.title = c.pageTitle
    document.querySelector<HTMLMetaElement>('meta[name="description"]')?.setAttribute('content', locale === 'zh'
      ? 'RaceCar Lab — 通过 3D 拆解与交互实验，从零理解方程式赛车工程。'
      : 'RaceCar Lab – learn formula race car engineering through interactive 3D disassembly and engineering experiments.')
  }, [locale, c.pageTitle])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    if (audioSourceRef.current !== currentMusicTrack.file) {
      audioSourceRef.current = currentMusicTrack.file
      audio.load()
      audio.currentTime = 0
    }
    if (!musicPlaying) {
      audio.pause()
      return
    }
    void audio.play().catch(() => {
      setMusicError(true)
      setMusicPlaying(false)
    })
  }, [currentMusicTrack.file, musicPlaying])

  useEffect(() => {
    let cancelled = false
    const checkAudioFile = async () => {
      try {
        const response = await fetch(currentMusicTrack.file, { method: 'HEAD', cache: 'no-store' })
        const contentType = response.headers.get('content-type')?.toLowerCase() ?? ''
        if (!cancelled) setMusicError(!response.ok || !contentType.startsWith('audio/'))
      } catch {
        if (!cancelled) setMusicError(true)
      }
    }
    void checkAudioFile()
    return () => { cancelled = true }
  }, [currentMusicTrack.file])

  useEffect(() => () => { timers.current.forEach((timer) => window.clearTimeout(timer)); timers.current.clear() }, [])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      if (knowledgeOpen) setKnowledgeOpen(false)
      else if (quizOpen) setQuizOpen(false)
      else if (detailOpen) setDetailOpen(false)
      else if (courseMapOpen) setCourseMapOpen(false)
      else if (settingsOpen) setSettingsOpen(false)
      else setSelectedId(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [knowledgeOpen, quizOpen, detailOpen, courseMapOpen, settingsOpen])

  const overlayOpen = detailOpen || courseMapOpen || quizOpen || settingsOpen || knowledgeOpen
  const schedule = (callback: () => void, delay: number) => {
    const timer = window.setTimeout(() => { timers.current.delete(timer); callback() }, delay)
    timers.current.add(timer)
  }
  const enterLab = (courseMode: boolean) => {
    if (entering) return
    setEntering(true)
    schedule(() => { setIntro(false); setEntering(false); if (courseMode) startCourse(COURSES[0]!) }, 650)
  }
  const selectPart = (id: PartId | null) => {
    setSelectedId(id)
    if (!id) return
    setVisitedParts((current) => current.includes(id) ? current : [...current, id])
    const part = PART_MAP[id]
    if (part && !visibleCategories.includes(part.category)) setVisibleCategories((current) => [...current, part.category])
  }
  const startCourse = (course: Course) => {
    setVisitedParts([])
    setActiveCourse(course); setCourseMapOpen(false); setQuizOpen(false); setScenario(courseScenario[course.id] ?? 'idle')
    setExplode(course.id === 'aero' ? 0.28 : 0); selectPart(course.parts[0]!)
  }
  const finishCourse = () => {
    if (!activeCourse) return
    setCompleted((current) => current.includes(activeCourse.id) ? current : [...current, activeCourse.id]); setQuizOpen(false)
    schedule(() => setCourseMapOpen(true), 280)
  }
  const toggleCategory = (category: CategoryId) => {
    setVisibleCategories((current) => current.includes(category) ? current.filter((item) => item !== category) : [...current, category])
    if (selectedPart?.category === category) setSelectedId(null)
  }
  const resetView = () => {
    setSelectedId(null); setScenario('idle'); setExplode(0); setXray(false); setVisibleCategories(CATEGORY_ORDER); setResetSignal((value) => value + 1)
  }
  const returnHome = () => {
    timers.current.forEach((timer) => window.clearTimeout(timer)); timers.current.clear()
    setIntro(true); setEntering(false); setSelectedId(null); setDetailOpen(false); setCourseMapOpen(false); setSettingsOpen(false); setKnowledgeOpen(false); setQuizOpen(false)
    setIntroPaused(prefersReducedMotion()); setActiveCourse(null); setScenario('idle'); setExplode(0); setXray(false); setVisibleCategories(CATEGORY_ORDER); setResetSignal((value) => value + 1)
  }
  const resetProgress = () => {
    setCompleted([])
    setVisitedParts([])
    removeStored(progressKey)
    removeStored(knowledgeKey)
  }
  const switchVehicle = (next: VehicleId) => {
    if (next === vehicleId) return
    const nextProgressKey = next === 'student-ev' ? `racecar-lab-progress:${profileId}` : `racecar-lab-progress:${profileId}:${next}`
    setVehicleId(next)
    setCompleted(readJson(nextProgressKey, isCourseProgress, []))
    setSelectedId(null); setDetailOpen(false); setKnowledgeOpen(false); setCourseMapOpen(false); setQuizOpen(false)
    setActiveCourse(null); setVisitedParts([]); setScenario('idle'); setExplode(0); setXray(false); setVisibleCategories(CATEGORY_ORDER)
    setResetSignal((value) => value + 1)
  }
  const chooseMusicTrack = (trackId: MusicTrackId) => {
    const audio = audioRef.current
    if (audio) audio.currentTime = 0
    setMusicError(false)
    setMusicTrackId(trackId)
    setMusicPlaying(true)
  }
  const cycleMusicMode = () => {
    setMusicMode((current) => MUSIC_MODES[(MUSIC_MODES.indexOf(current) + 1) % MUSIC_MODES.length]!)
  }
  const advanceMusic = () => {
    const currentIndex = Math.max(0, MUSIC_TRACKS.findIndex((track) => track.id === musicTrackId))
    if (musicMode === 'repeat-one') {
      const audio = audioRef.current
      if (audio) audio.currentTime = 0
      setMusicPlaying(true)
      void audio?.play().catch(() => {
        setMusicError(true)
        setMusicPlaying(false)
      })
      return
    }
    if (musicMode === 'shuffle' && MUSIC_TRACKS.length > 1) {
      let nextIndex = currentIndex
      while (nextIndex === currentIndex) nextIndex = Math.floor(Math.random() * MUSIC_TRACKS.length)
      setMusicTrackId(MUSIC_TRACKS[nextIndex]!.id)
    } else {
      setMusicTrackId(MUSIC_TRACKS[(currentIndex + 1) % MUSIC_TRACKS.length]!.id)
    }
    setMusicPlaying(true)
  }
  return (
    <main className={`app-shell ${intro ? 'is-intro' : 'is-lab'} ${entering ? 'is-entering' : ''} ${overlayOpen ? 'has-overlay' : ''}`}>
      <audio ref={audioRef} src={currentMusicTrack.file} preload="metadata" onEnded={advanceMusic} onCanPlay={() => setMusicError(false)} onError={() => { setMusicError(true); setMusicPlaying(false) }} />
      <CarScene vehicleId={vehicleId} intro={intro && !entering} introPaused={introPaused} selectedId={selectedId} onSelect={selectPart} explode={explode} xray={xray} visibleCategories={visibleCategories} scenario={scenario} resetSignal={resetSignal} ariaLabel={VEHICLES[vehicleId].sceneLabel[locale]} partOptions={PARTS.map((part) => ({ id: part.id, label: getPart(part.id, locale, vehicleId).name, category: part.category }))} />
      {intro ? <IntroScreen locale={locale} paused={introPaused} onEnter={enterLab} onReset={() => setResetSignal((value) => value + 1)} onTogglePause={() => setIntroPaused((value) => !value)} onKnowledge={() => setKnowledgeOpen(true)} onSettings={() => setSettingsOpen(true)} /> : (
        <div className="lab-ui">
          <header className="lab-topbar">
            <Brand locale={locale} compact />
            <div className="lab-status"><span className="live-dot" /><strong>{activeCourse ? getCourse(activeCourse, locale, vehicleId).title : c.freeExplore}</strong></div>
            <div className="lab-spacer" />
            <button className="top-button" onClick={() => setCourseMapOpen(true)}><Map size={19} /> {c.courseMap}</button>
            <button className={`top-button top-button--icon ${knowledgeOpen ? 'is-active' : ''}`} onClick={() => setKnowledgeOpen(true)} title={c.knowledge} aria-label={c.knowledge}><BookOpenCheck size={19} /></button>
            <button className="top-button top-button--icon" onClick={resetView} title={c.resetView} aria-label={c.resetView}><RotateCcw size={19} /></button>
            <button className="top-button top-button--icon" onClick={returnHome} title={c.home} aria-label={c.home}><House size={19} /></button>
            <button className={`top-button top-button--icon ${settingsOpen ? 'is-active' : ''}`} onClick={() => setSettingsOpen(true)} title={c.settings} aria-label={c.settings}><Settings size={19} /></button>
          </header>

          <SystemRail locale={locale} visible={visibleCategories} onToggle={toggleCategory} />
          {selectedId && <PartPanel locale={locale} vehicleId={vehicleId} partId={selectedId} onClose={() => setSelectedId(null)} onDetails={() => setDetailOpen(true)} />}
          {activeCourse && <LessonPanel locale={locale} vehicleId={vehicleId} course={activeCourse} visited={visitedParts} onPart={selectPart} onQuiz={() => setQuizOpen(true)} onClose={() => setActiveCourse(null)} />}
          <ScenarioDock locale={locale} scenario={scenario} onScenario={setScenario} explode={explode} onExplode={setExplode} xray={xray} onXray={() => setXray((value) => !value)} />
          {!selectedId && !activeCourse && <div className="interaction-hint"><span className="hint-pulse" /><strong>{c.selectPart}</strong><span>{c.selectPartHint}</span></div>}
          {detailOpen && selectedId && <Suspense fallback={<LoadingOverlay locale={locale} />}><EngineeringDetail vehicleId={vehicleId} locale={locale} partId={selectedId} onClose={() => setDetailOpen(false)} /></Suspense>}
          {courseMapOpen && <CourseMap locale={locale} vehicleId={vehicleId} completed={completed} activeCourse={activeCourse} onStart={startCourse} onClose={() => setCourseMapOpen(false)} />}
          {quizOpen && activeCourse && <QuizModal locale={locale} vehicleId={vehicleId} course={activeCourse} onComplete={finishCourse} onClose={() => setQuizOpen(false)} />}
        </div>
      )}
      {knowledgeOpen && <Suspense fallback={<LoadingOverlay locale={locale} />}><KnowledgeCenter vehicleId={vehicleId} locale={locale} profileId={profileId} initialPartId={selectedId} onClose={() => setKnowledgeOpen(false)} /></Suspense>}
      {settingsOpen && <SettingsModal locale={locale} vehicleId={vehicleId} musicTrackId={musicTrackId} musicMode={musicMode} musicPlaying={musicPlaying} musicError={musicError} onLocale={setLocale} onVehicle={switchVehicle} onMusicTrack={chooseMusicTrack} onMusicMode={cycleMusicMode} onToggleMusic={() => setMusicPlaying((value) => !value)} onClose={() => setSettingsOpen(false)} onResetProgress={resetProgress} />}
    </main>
  )
}

export default App
