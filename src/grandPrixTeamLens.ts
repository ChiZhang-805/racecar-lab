import type { PartId } from './data'
import type { Locale } from './i18n'
import { GRAND_PRIX_TEAMS, type EvidenceLevel, type GrandPrixTeamId } from './grandPrixTeams'

export type GrandPrixTeamLens = {
  evidence: EvidenceLevel
  text: Record<Locale, string>
}

const protectedDetail = (modelName: string, subject: Record<Locale, string>): GrandPrixTeamLens => ({
  evidence: 'educational-inference',
  text: {
    zh: `${modelName} 的${subject.zh}没有完整公开；本模型保留 FIA 共通架构，只呈现可见线索，不虚构车队内部数据。`,
    en: `${modelName} ${subject.en} is not fully public. The model keeps the shared FIA architecture and visible cues without inventing team internals.`,
  },
})

const protectedSubjects: Partial<Record<PartId, Record<Locale, string>>> = {
  'rear-wing': { zh: '主动尾翼细节', en: 'active rear-wing detail' },
  halo: { zh: 'Halo 安装与层压细节', en: 'Halo mounting and laminate detail' },
  tires: { zh: '轮胎使用窗口与设定', en: 'tyre operating window and setup' },
  brakes: { zh: '制动材料、冷却与线控制动标定', en: 'brake material, cooling and brake-by-wire calibration' },
  steering: { zh: '转向几何与控制映射', en: 'steering geometry and control maps' },
  differential: { zh: '变速箱与差速器内部布置', en: 'gearbox and differential internals' },
  ecu: { zh: '控制策略和软件', en: 'control strategy and software' },
  sensors: { zh: '传感器布置与遥测通道', en: 'sensor layout and telemetry channels' },
}

export function getGrandPrixTeamLens(teamId: GrandPrixTeamId, partId: PartId): GrandPrixTeamLens {
  const team = GRAND_PRIX_TEAMS[teamId]
  const protectedSubject = protectedSubjects[partId]
  if (protectedSubject) return protectedDetail(team.modelName, protectedSubject)

  if (partId === 'front-wing') return {
    evidence: 'public-observation',
    text: {
      zh: `${team.modelName} 前翼与鼻锥必须一起阅读：${team.signature.zh}`,
      en: `Read the ${team.modelName} front wing together with its nose: ${team.signature.en}`,
    },
  }
  if (partId === 'floor') return { evidence: team.facts[3]!.evidence, text: team.facts[3]!.detail }
  if (partId === 'nose' || partId === 'monocoque') return {
    evidence: 'public-observation',
    text: {
      zh: `${team.modelName} 的公开车身线索提出这一问题：${team.designQuestion.zh}`,
      en: `The public ${team.modelName} bodywork raises this question: ${team.designQuestion.en}`,
    },
  }
  if (partId === 'front-suspension' || partId === 'rear-suspension') {
    if (teamId === 'ferrari' || teamId === 'mclaren') return { evidence: team.facts[1]!.evidence, text: team.facts[1]!.detail }
    return protectedDetail(team.modelName, { zh: '完整悬架运动学与车内机构', en: 'full suspension kinematics and inboard mechanism' })
  }
  if (partId === 'battery' || partId === 'inverter' || partId === 'motor') return {
    evidence: 'official-spec',
    text: {
      zh: `${team.facts[0]!.value.zh}：${team.facts[0]!.detail.zh} 电芯、逆变器拓扑与内部封装并未完整公开。`,
      en: `${team.facts[0]!.value.en}: ${team.facts[0]!.detail.en} Cell, inverter-topology and internal packaging detail remains private.`,
    },
  }
  if (partId === 'cooling') return {
    evidence: 'educational-inference',
    text: {
      zh: `${team.facts[2]!.detail.zh} ${team.facts[3]!.detail.zh}`,
      en: `${team.facts[2]!.detail.en} ${team.facts[3]!.detail.en}`,
    },
  }
  return protectedDetail(team.modelName, { zh: '车队专属设计', en: 'team-specific design' })
}
