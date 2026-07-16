import { useState, type CSSProperties } from 'react'
import { BookOpenCheck, CarFront, Check, ExternalLink, Palette, Sparkles, X } from 'lucide-react'
import type { Locale } from './i18n'
import {
  GRAND_PRIX_TEAMS,
  GRAND_PRIX_TEAM_IDS,
  type EvidenceLevel,
  type GrandPrixTeamId,
} from './grandPrixTeams'
import { useDialogFocus } from './useDialogFocus'

type GarageTab = 'models' | 'compare'

const evidenceCopy: Record<EvidenceLevel, Record<Locale, string>> = {
  'official-spec': { zh: '官方规格', en: 'Official specification' },
  'public-observation': { zh: '公开可见', en: 'Public observation' },
  'educational-inference': { zh: '教学推演', en: 'Teaching inference' },
}

export default function GrandPrixGarage({
  locale,
  teamId,
  onTeam,
  onClose,
}: {
  locale: Locale
  teamId: GrandPrixTeamId
  onTeam: (teamId: GrandPrixTeamId) => void
  onClose: () => void
}) {
  const [tab, setTab] = useState<GarageTab>('models')
  const dialogRef = useDialogFocus<HTMLElement>()
  const selected = GRAND_PRIX_TEAMS[teamId]
  const ui = locale === 'zh' ? {
    eyebrow: '2026 GRAND PRIX GARAGE',
    title: '车队技术车库',
    subtitle: '切换的不只是颜色：鼻锥、驾驶舱、侧箱、地板、冷却与动力单元会随车型改变。',
    models: '车型研究',
    compare: '四车对比',
    selected: '当前研究车',
    question: '工程问题',
    evidence: '证据分层',
    sources: '公开来源',
    choose: '切换至',
    close: '关闭车队技术车库',
    noLogo: '独立教学模型 · 不含官方车队或赞助商标志 · 几何参数不是车队 CAD',
    compareLead: '共同受 FIA 设计盒约束，但性能路线仍由车队选择。横向比较以下公开可验证差异。',
    model: '车型',
    power: '动力单元',
    suspension: '底盘 / 封装',
    aero: '空气动力路线',
    learning: '核心学习问题',
  } : {
    eyebrow: '2026 GRAND PRIX GARAGE',
    title: 'Team engineering garage',
    subtitle: 'This changes more than paint: nose, cockpit, sidepods, floor, cooling and power-unit packaging all follow the selected car.',
    models: 'Study cars',
    compare: 'Compare four',
    selected: 'Current study car',
    question: 'Engineering question',
    evidence: 'Evidence levels',
    sources: 'Public sources',
    choose: 'Switch to',
    close: 'Close team engineering garage',
    noLogo: 'Independent teaching models · no official team or sponsor marks · geometry controls are not team CAD',
    compareLead: 'All cars share the FIA design box, while teams choose distinct performance routes. Compare the public differences below.',
    model: 'Model',
    power: 'Power unit',
    suspension: 'Chassis / package',
    aero: 'Aero route',
    learning: 'Core learning question',
  }

  const styleFor = (id: GrandPrixTeamId) => {
    const palette = GRAND_PRIX_TEAMS[id].palette
    return {
      '--team-body': palette.body,
      '--team-secondary': palette.secondary,
      '--team-accent': palette.accent,
      '--team-pinstripe': palette.pinstripe,
    } as CSSProperties
  }

  return (
    <div className="overlay garage-overlay" role="dialog" aria-modal="true" aria-label={ui.title}>
      <div className="overlay-backdrop" onClick={onClose} />
      <section className="garage-modal" ref={dialogRef} tabIndex={-1} data-garage-tab={tab}>
        <header className="garage-header">
          <div>
            <span className="garage-eyebrow"><Sparkles size={15} /> {ui.eyebrow}</span>
            <h2>{ui.title}</h2>
            <p>{ui.subtitle}</p>
          </div>
          <button className="garage-close" onClick={onClose} aria-label={ui.close} title={ui.close}><X size={21} /></button>
        </header>

        <div className="garage-tabs" role="tablist" aria-label={ui.title}>
          <button role="tab" aria-selected={tab === 'models'} className={tab === 'models' ? 'is-active' : ''} onClick={() => setTab('models')}><CarFront size={18} />{ui.models}</button>
          <button role="tab" aria-selected={tab === 'compare'} className={tab === 'compare' ? 'is-active' : ''} onClick={() => setTab('compare')}><BookOpenCheck size={18} />{ui.compare}</button>
        </div>

        {tab === 'models' ? <div className="garage-body">
          <nav className="garage-model-list" aria-label={ui.models}>
            {GRAND_PRIX_TEAM_IDS.map((id) => {
              const team = GRAND_PRIX_TEAMS[id]
              const active = teamId === id
              return <button
                key={id}
                data-grand-prix-team={id}
                className={active ? 'is-active' : ''}
                style={styleFor(id)}
                onClick={() => onTeam(id)}
                aria-pressed={active}
                aria-label={`${ui.choose} ${team.name[locale]}`}
              >
                <span className="garage-model-glyph" aria-hidden="true"><i /><i /><i /></span>
                <span className="garage-model-copy"><small>{team.teamName}</small><strong>{team.modelName}</strong><em>{team.snapshot[locale]}</em></span>
                {active ? <Check size={19} /> : <span className="garage-model-index">0{GRAND_PRIX_TEAM_IDS.indexOf(id) + 1}</span>}
              </button>
            })}
          </nav>

          <article className="garage-profile" style={styleFor(teamId)} data-profile-team={teamId}>
            <div className="garage-profile-hero">
              <div className="garage-silhouette" aria-hidden="true"><i /><i /><i /><i /></div>
              <div><span>{ui.selected}</span><h3>{selected.name[locale]}</h3><p>{selected.signature[locale]}</p></div>
            </div>

            <div className="garage-question"><Palette size={20} /><div><span>{ui.question}</span><strong>{selected.designQuestion[locale]}</strong></div></div>

            <div className="garage-facts" aria-label={ui.evidence}>
              {selected.facts.map((fact) => <article key={fact.label.en} data-evidence={fact.evidence}>
                <span>{fact.label[locale]}</span>
                <strong>{fact.value[locale]}</strong>
                <p>{fact.detail[locale]}</p>
                <small>{evidenceCopy[fact.evidence][locale]}</small>
              </article>)}
            </div>

            <div className="garage-sources">
              <span>{ui.sources}</span>
              <div>{selected.sources.map((source) => <a key={source.url} href={source.url} target="_blank" rel="noopener noreferrer"><ExternalLink size={13} />{source.label[locale]}</a>)}</div>
            </div>
          </article>
        </div> : <div className="garage-compare">
          <p className="garage-compare-lead">{ui.compareLead}</p>
          <div className="garage-compare-grid">
            {GRAND_PRIX_TEAM_IDS.map((id) => {
              const team = GRAND_PRIX_TEAMS[id]
              return <article key={id} style={styleFor(id)} data-compare-team={id}>
                <header><span className="garage-model-glyph" aria-hidden="true"><i /><i /><i /></span><div><small>{team.teamName}</small><h3>{team.modelName}</h3></div></header>
                <dl>
                  <div><dt>{ui.power}</dt><dd>{team.facts[0]!.value[locale]}</dd></div>
                  <div><dt>{ui.suspension}</dt><dd>{team.signature[locale]}</dd></div>
                  <div><dt>{ui.aero}</dt><dd>{team.facts[2]!.value[locale]}</dd></div>
                  <div><dt>{ui.learning}</dt><dd>{team.designQuestion[locale]}</dd></div>
                </dl>
                <button className={teamId === id ? 'is-active' : ''} onClick={() => { onTeam(id); setTab('models') }} aria-label={`${ui.choose} ${team.name[locale]}`}>{teamId === id && <Check size={15} />}{teamId === id ? ui.selected : `${ui.choose} ${team.modelName}`}</button>
              </article>
            })}
          </div>
        </div>}

        <footer className="garage-disclaimer"><span aria-hidden="true" /><p>{ui.noLogo}</p></footer>
      </section>
    </div>
  )
}
