import { useState, type CSSProperties } from 'react'
import { BookOpenCheck, CarFront, Check, ExternalLink, Palette, Sparkles, UsersRound, X } from 'lucide-react'
import type { Locale } from './i18n'
import { GRAND_PRIX_DRIVERS } from './grandPrixDrivers'
import {
  GRAND_PRIX_TEAMS,
  GRAND_PRIX_TEAM_IDS,
  type EvidenceLevel,
  type GrandPrixTeamId,
} from './grandPrixTeams'
import { useDialogFocus } from './useDialogFocus'
import BalancedParagraph from './BalancedParagraph'

type GarageTab = 'models' | 'compare' | 'drivers'

const evidenceCopy: Record<EvidenceLevel, Record<Locale, string>> = {
  'official-spec': { zh: '官方规格', en: 'Official specification' },
  'public-observation': { zh: '公开可见', en: 'Public observation' },
  'educational-inference': { zh: '教学推演', en: 'Teaching inference' },
}

/** A code-native side elevation with real single-seater visual structure. */
function TeamCarGraphic({ id }: { id: GrandPrixTeamId }) {
  const geometry = GRAND_PRIX_TEAMS[id].geometry
  const cockpitX = 91 + geometry.cockpitOffset * 28
  const noseY = 43 - (geometry.noseTipHeight - .65) * 35
  const sidepodTop = 37 + (geometry.sidepodDrop - .05) * 19
  const sidepodRear = 55 - (geometry.sidepodLength - 2.18) * 13
  const engineTop = 25 - (geometry.engineCoverHeight - .74) * 14
  const frontWingY = 51 - geometry.frontWingSweep * 12

  return <svg className="garage-car-art" viewBox="0 0 180 78" data-car-art-team={id} aria-hidden="true">
    <ellipse className="garage-car-art__shadow" cx="91" cy="68" rx="80" ry="5" />
    <g className="garage-car-art__suspension">
      <path d="M42 43 31 52M42 44 53 52M137 42 126 52M138 43 149 52" />
      <path d="M32 49 52 49M127 48 149 48" />
    </g>
    <path className="garage-car-art__floor" d="M23 51 155 49 163 57 149 61 31 61 18 57Z" />
    <path className="garage-car-art__body" d={`M28 48C42 46 52 42 ${sidepodRear} ${sidepodTop}C66 32 78 30 ${cockpitX - 7} 33L${cockpitX + 10} 39C111 40 123 42 139 43L165 ${noseY} 171 48 164 52 119 52C105 56 83 57 64 52L29 52Z`} />
    <path className="garage-car-art__sidepod" d={`M${sidepodRear} ${sidepodTop}C67 ${sidepodTop - 3} 80 ${sidepodTop - 2} ${cockpitX - 6} 38L102 48 91 54 58 51 48 45Z`} />
    <path className="garage-car-art__engine" d={`M29 47C43 40 50 31 63 ${engineTop + 5}L84 ${engineTop} 104 39 94 43 56 42 43 49Z`} />
    <path className="garage-car-art__intake" d={`M69 ${engineTop + 4} 78 ${engineTop - 5} 87 ${engineTop + 2} 82 ${engineTop + 8}Z`} />
    <ellipse className="garage-car-art__cockpit" cx={cockpitX} cy="34" rx="12" ry="7" />
    <g className="garage-car-art__halo">
      <path d={`M${cockpitX - 11} 34C${cockpitX - 8} 22 ${cockpitX + 8} 22 ${cockpitX + 12} 34`} />
      <path d={`M${cockpitX} 24  ${cockpitX + 2} 38`} />
    </g>
    <path className="garage-car-art__rear-mount" d="M18 44 28 42 39 47 39 52 29 55 18 50Z" />
    <g className="garage-car-art__rear-wing">
      <path d="M11 21 33 21 30 27 9 27Z" />
      <path className="garage-car-art__rear-wing-support" d="M15 27 18 44 24 48M29 27 32 39 37 46" />
      <path d="M7 31 31 31" />
    </g>
    <g className="garage-car-art__front-wing">
      <path d={`M149 ${frontWingY} 175 ${frontWingY - 4} 173 ${frontWingY + 1} 151 ${frontWingY + 5}Z`} />
      <path d={`M154 ${frontWingY - 4} 176 ${frontWingY - 9}`} />
      <path d={`M168 ${frontWingY - 9} 174 ${frontWingY + 5}`} />
    </g>
    <g className="garage-car-art__surface-lines">
      <path className="garage-car-art__accent" d={`M49 44C74 47 99 45 118 47L165 ${noseY + 4}`} />
      <path className="garage-car-art__pinstripe" d={`M55 ${sidepodTop + 4} 87 42 112 44`} />
    </g>
    <g className="garage-car-art__wheel garage-car-art__wheel--rear">
      <circle cx="42" cy="54" r="15" /><circle cx="42" cy="54" r="9" /><circle cx="42" cy="54" r="3" />
    </g>
    <g className="garage-car-art__wheel garage-car-art__wheel--front">
      <circle cx="138" cy="54" r="15" /><circle cx="138" cy="54" r="9" /><circle cx="138" cy="54" r="3" />
    </g>
  </svg>
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
    models: '车型研究',
    compare: '四车对比',
    drivers: '当家车手',
    selected: '当前研究车',
    question: '工程问题',
    evidence: '证据分层',
    sources: '公开来源',
    choose: '切换至',
    close: '关闭车队技术车库',
    noLogo: '独立 3D 教学模型 · 不含官方车队或赞助商标志 · 几何参数不是车队 CAD',
    power: '动力单元',
    suspension: '底盘 / 封装',
    aero: '空气动力路线',
    learning: '核心学习问题',
    profile: '查看官方车手资料：',
    photoBy: '摄影：',
  } : {
    eyebrow: '2026 GRAND PRIX GARAGE',
    title: 'Team engineering garage',
    models: 'Study cars',
    compare: 'Compare four',
    drivers: 'Driver line-up',
    selected: 'Current study car',
    question: 'Engineering question',
    evidence: 'Evidence levels',
    sources: 'Public sources',
    choose: 'Switch to',
    close: 'Close team engineering garage',
    noLogo: 'Independent 3D teaching models · no official team or sponsor marks · geometry controls are not team CAD',
    power: 'Power unit',
    suspension: 'Chassis / package',
    aero: 'Aero route',
    learning: 'Core learning question',
    profile: 'Open official driver profile: ',
    photoBy: 'Photo: ',
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
          </div>
          <button className="garage-close" onClick={onClose} aria-label={ui.close} title={ui.close}><X size={21} /></button>
        </header>

        <div className="garage-tabs" role="tablist" aria-label={ui.title}>
          <button id="garage-tab-models" role="tab" aria-controls="garage-panel-models" aria-selected={tab === 'models'} className={tab === 'models' ? 'is-active' : ''} onClick={() => setTab('models')}><CarFront size={19} />{ui.models}</button>
          <button id="garage-tab-compare" role="tab" aria-controls="garage-panel-compare" aria-selected={tab === 'compare'} className={tab === 'compare' ? 'is-active' : ''} onClick={() => setTab('compare')}><BookOpenCheck size={19} />{ui.compare}</button>
          <button id="garage-tab-drivers" role="tab" aria-controls="garage-panel-drivers" aria-selected={tab === 'drivers'} className={tab === 'drivers' ? 'is-active' : ''} onClick={() => setTab('drivers')}><UsersRound size={19} />{ui.drivers}</button>
        </div>

        {tab === 'models' ? <div className="garage-body" id="garage-panel-models" role="tabpanel" aria-labelledby="garage-tab-models">
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
                <span className="garage-car-art-shell"><TeamCarGraphic id={id} /></span>
                <span className="garage-model-copy"><small>{team.teamName}</small><strong>{team.modelName}</strong><em>{team.snapshot[locale]}</em></span>
                {active ? <Check size={19} /> : <span className="garage-model-index">0{GRAND_PRIX_TEAM_IDS.indexOf(id) + 1}</span>}
              </button>
            })}
          </nav>

          <article className="garage-profile" style={styleFor(teamId)} data-profile-team={teamId}>
            <div className="garage-profile-hero">
              <div className="garage-car-hero"><TeamCarGraphic id={teamId} /></div>
              <div><span>{ui.selected}</span><h3>{selected.name[locale]}</h3><BalancedParagraph locale={locale} text={selected.signature[locale]} /></div>
            </div>

            <div className="garage-question"><Palette size={20} /><div><span>{ui.question}</span><strong>{selected.designQuestion[locale]}</strong></div></div>

            <div className="garage-facts" aria-label={ui.evidence}>
              {selected.facts.map((fact) => <article key={fact.label.en} data-evidence={fact.evidence}>
                <span>{fact.label[locale]}</span>
                <strong>{fact.value[locale]}</strong>
                <BalancedParagraph locale={locale} text={fact.detail[locale]} />
                <small>{evidenceCopy[fact.evidence][locale]}</small>
              </article>)}
            </div>

            <div className="garage-sources">
              <span>{ui.sources}</span>
              <div>{selected.sources.map((source) => <a key={source.url} href={source.url} target="_blank" rel="noopener noreferrer"><ExternalLink size={14} />{source.label[locale]}</a>)}</div>
            </div>
          </article>
        </div> : tab === 'compare' ? <div className="garage-compare" id="garage-panel-compare" role="tabpanel" aria-labelledby="garage-tab-compare">
          <div className="garage-compare-grid">
            {GRAND_PRIX_TEAM_IDS.map((id) => {
              const team = GRAND_PRIX_TEAMS[id]
              return <article key={id} style={styleFor(id)} data-compare-team={id}>
                <header><span className="garage-car-art-shell"><TeamCarGraphic id={id} /></span><div><small>{team.teamName}</small><h3>{team.modelName}</h3></div></header>
                <dl>
                  <div><dt>{ui.power}</dt><dd>{team.facts[0]!.value[locale]}</dd></div>
                  <div><dt>{ui.suspension}</dt><dd>{team.signature[locale]}</dd></div>
                  <div><dt>{ui.aero}</dt><dd>{team.facts[2]!.value[locale]}</dd></div>
                  <div><dt>{ui.learning}</dt><dd>{team.designQuestion[locale]}</dd></div>
                </dl>
                <button className={teamId === id ? 'is-active' : ''} onClick={() => { onTeam(id); setTab('models') }} aria-label={`${ui.choose} ${team.name[locale]}`}>{teamId === id && <Check size={16} />}{teamId === id ? ui.selected : `${ui.choose} ${team.modelName}`}</button>
              </article>
            })}
          </div>
        </div> : <div className="garage-drivers" id="garage-panel-drivers" role="tabpanel" aria-labelledby="garage-tab-drivers">
          <div className="garage-driver-grid">
            {GRAND_PRIX_TEAM_IDS.map((id) => {
              const team = GRAND_PRIX_TEAMS[id]
              return <section className="garage-driver-team" key={id} style={styleFor(id)} data-driver-team={id}>
                <header>
                  <span className="garage-car-art-shell"><TeamCarGraphic id={id} /></span>
                  <div><small>{team.modelName}</small><h3>{team.teamName}</h3></div>
                </header>
                <div className="garage-driver-pair">
                  {GRAND_PRIX_DRIVERS[id].map((driver) => <article className="garage-driver" key={driver.id} data-driver-id={driver.id}>
                    <div className="garage-driver-photo">
                      <img src={driver.image} alt={driver.name} loading="lazy" decoding="async" />
                      <span>#{driver.number}</span>
                    </div>
                    <div className="garage-driver-copy">
                      <div className="garage-driver-title">
                        <div><small>{driver.nationality[locale]}</small><h4>{driver.name}</h4></div>
                        <a href={driver.profileUrl} target="_blank" rel="noopener noreferrer" aria-label={`${ui.profile}${driver.name}`} title={`${ui.profile}${driver.name}`}><ExternalLink size={16} /></a>
                      </div>
                      <BalancedParagraph locale={locale} text={driver.intro[locale]} />
                      <div className="garage-driver-credit">
                        <a href={driver.photo.sourceUrl} target="_blank" rel="noopener noreferrer">{ui.photoBy}{driver.photo.author}</a>
                        <a href={driver.photo.licenseUrl} target="_blank" rel="noopener noreferrer">{driver.photo.license}</a>
                      </div>
                    </div>
                  </article>)}
                </div>
              </section>
            })}
          </div>
        </div>}

        <footer className="garage-disclaimer"><span aria-hidden="true" /><p>{ui.noLogo}</p></footer>
      </section>
    </div>
  )
}
