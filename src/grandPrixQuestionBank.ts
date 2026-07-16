import { PART_IDS, type PartId } from './data'
import type { AnswerIndex, KnowledgeQuestion, QuestionType } from './questionBank'
import type { LabKind, LocalText } from './engineeringData'
import { GRAND_PRIX_PARTS } from './grandPrixContent'
import { GRAND_PRIX_ENGINEERING_LESSONS } from './grandPrixEngineeringData'
import { GRAND_PRIX_FORMULA_EXAMPLES } from './grandPrixFormulaExamples'

const l = (zh: string, en: string): LocalText => ({ zh, en })
const q = (id: string, type: QuestionType, difficulty: 1 | 2 | 3, prompt: LocalText, options: [LocalText, LocalText, LocalText], answer: AnswerIndex, explanation: LocalText, hint?: LocalText): KnowledgeQuestion => ({ id, type, difficulty, prompt, options, answer, explanation, hint })
const choice = (id: string, type: QuestionType, difficulty: 1 | 2 | 3, prompt: LocalText, correct: LocalText, wrongA: LocalText, wrongB: LocalText, answer: AnswerIndex, explanation: LocalText, hint?: LocalText) => {
  const options = [wrongA, wrongB] as LocalText[]
  options.splice(answer, 0, correct)
  return q(id, type, difficulty, prompt, options as [LocalText, LocalText, LocalText], answer, explanation, hint)
}
const calculationErrors: Record<PartId, [LocalText, LocalText]> = {
  'front-wing': [l('把车速直接按一次方缩放气动力。', 'Scale aerodynamic load linearly with speed.'), l('把孤立翼型系数当作所有车高、横摆和活动翼状态下都不变。', 'Treat an isolated-section coefficient as constant at every ride height, yaw and active-wing state.')],
  'rear-wing': [l('用车速一次方而不是动压计算后翼载荷。', 'Use speed rather than dynamic pressure for rear-wing load.'), l('忽略扩散器尾流与装车系数，直接套用孤立翼型数据。', 'Ignore diffuser wake and installed coefficients and use isolated-wing data directly.')],
  floor: [l('面积改变后仍假定通道速度完全不变。', 'Assume passage velocity is unchanged after area changes.'), l('把体积流量当成质量流量，漏掉密度及单位换算。', 'Treat volumetric flow as mass flow, omitting density and unit conversion.')],
  nose: [l('漏掉动能公式中的二分之一。', 'Omit the one-half factor in kinetic energy.'), l('让吸能需求随碰撞速度一次方而不是平方变化。', 'Scale impact energy linearly rather than quadratically with speed.')],
  monocoque: [l('把扭矩与转角相乘作为扭转刚度。', 'Multiply torque by twist to obtain torsional stiffness.'), l('混用度和弧度，却不声明刚度的角度基准。', 'Mix degrees and radians without stating the angular basis of stiffness.')],
  halo: [l('把 kN 直接除以 mm²，并把数值误读成 Pa。', 'Divide kN by mm² and misread the numerical result as pascals.'), l('使用外包络面积而不是有效承载截面积。', 'Use envelope area rather than effective load-bearing area.')],
  tires: [l('把 rpm 直接当成 rad/s，并漏掉有效滚动半径。', 'Use rpm as rad/s and omit effective rolling radius.'), l('低速时仍用趋近于零的单一车速作分母。', 'Keep a vanishing vehicle-speed denominator near zero speed.')],
  brakes: [l('只用夹紧力乘半径，漏掉摩擦系数。', 'Multiply clamp force by radius but omit friction coefficient.'), l('在夹紧力已含两侧摩擦面时再次把结果乘二。', 'Double the result after clamp force already includes both friction faces.')],
  'front-suspension': [l('轮端刚度只乘一次运动比。', 'Multiply spring rate by motion ratio only once.'), l('更换运动比定义后仍沿用原公式而不取倒数。', 'Change the motion-ratio convention without inverting the formula.')],
  'rear-suspension': [l('把后摇臂运动比按一次方代入轮端刚度。', 'Use rear rocker motion ratio to the first power for wheel rate.'), l('把缓冲块和第三弹性元件的并联贡献误当成串联。', 'Treat parallel bump-stop and heave-element contributions as series elements.')],
  steering: [l('假定内外轮在低速转弯中必须保持相同转角。', 'Assume inner and outer wheels must have equal steer angles in a low-speed turn.'), l('把 cot 关系直接替换成角度差的线性关系。', 'Replace the cotangent relation with a linear angle difference.')],
  battery: [l('把 Ah 直接当作 J，省略电流、时间和电压边界。', 'Treat ampere-hours as joules while omitting current, time and voltage boundaries.'), l('不统一电流符号，也不在同步时间轴上积分。', 'Integrate without a common current sign convention or synchronized time base.')],
  inverter: [l('在驱动和回收方向都固定使用 Pac/Pdc。', 'Use Pac/Pdc unchanged in both drive and regeneration.'), l('把效率百分数直接当作损耗功率的 kW 数值。', 'Read efficiency percentage directly as loss power in kW.')],
  motor: [l('用 rpm 直接乘 N·m，省略角速度单位换算。', 'Multiply rpm by N·m without converting to angular speed.'), l('把直流侧功率直接当作轴功率，忽略变换损耗。', 'Treat DC-side power as shaft power with no conversion loss.')],
  differential: [l('把左右输出转速相加而不是取平均。', 'Add left and right output speeds instead of averaging them.'), l('仅凭左右轮速不同就判定某一侧打滑。', 'Diagnose wheelspin solely from unequal left and right wheel speeds.')],
  cooling: [l('把 L/min 的数值直接当作 kg/s。', 'Use the numerical value in L/min as kg/s.'), l('用单点绝对温度替代同步进出口温差。', 'Use one absolute temperature instead of synchronized inlet/outlet difference.')],
  ecu: [l('只计算 αx[k]，漏掉上一时刻滤波状态。', 'Calculate only αx[k] and omit the previous filter state.'), l('认为增大滤波必然改善控制，不检查相位延迟。', 'Assume more filtering always improves control without checking phase delay.')],
  sensors: [l('强制标定线通过原点，漏掉零点偏置 b。', 'Force calibration through the origin and omit offset b.'), l('把输出对输入的标定斜率直接当成其倒数。', 'Use the output-versus-input calibration slope as its reciprocal.')],
}

const conceptMisconceptions: Record<LabKind, [LocalText, LocalText]> = {
  wing: [l('气动载荷只由固定攻角决定，与速度和装车流场无关。', 'Aerodynamic load depends only on fixed incidence, not speed or installed flow.'), l('该翼面只影响自身，不会改变下游部件或整车平衡。', 'The wing affects only itself, not downstream devices or vehicle balance.')],
  floor: [l('底板性能与离地高度和姿态无关。', 'Floor performance is independent of ride height and attitude.'), l('扩散角越大，压力恢复和下压力一定越好。', 'A larger diffuser angle always improves recovery and downforce.')],
  impact: [l('正面结构越刚、压溃越少就一定越安全。', 'A stiffer frontal structure with less crush is always safer.'), l('只要外皮无裂纹，碰撞结构就无需复检。', 'An uncracked outer skin proves the impact structure needs no reinspection.')],
  structure: [l('只看一个全局刚度数字即可，局部硬点和载荷路径无关紧要。', 'One global stiffness number is sufficient; hardpoints and load paths do not matter.'), l('复合材料各方向性能相同，铺层方向只影响外观。', 'Composite properties are identical in every direction; ply angle is cosmetic.')],
  protection: [l('只要材料强度合格，生存空间、视野和逃生无需验证。', 'Material strength alone is enough; survival space, visibility and egress need no validation.'), l('事故后目视无损即可继续使用安全结构。', 'A safety structure may return to service after visual inspection alone.')],
  tire: [l('轮胎力与载荷完全线性，温度、压力和滑移均不影响。', 'Tire force is perfectly linear with load and independent of temperature, pressure and slip.'), l('轮胎压力只改变外径，不影响刚度、接地形状或发热。', 'Tire pressure changes only diameter, not stiffness, footprint or heat generation.')],
  brake: [l('制动只改变车速，不涉及热负荷和前后轴平衡。', 'Braking changes only speed and has no thermal or axle-balance consequences.'), l('能量回收可替代全部独立摩擦制动与液压安全路径。', 'Regeneration can replace all independent friction braking and hydraulic safety paths.')],
  suspension: [l('悬架硬点只用于装配，不会改变轮胎运动学。', 'Suspension hardpoints are only packaging features and do not change tire kinematics.'), l('弹簧和阻尼越硬，机械抓地在任何路面都越高。', 'Stiffer springs and dampers always create more mechanical grip on every surface.')],
  steering: [l('转向几何只影响驾驶员手感，不改变轮胎姿态。', 'Steering geometry affects driver feel only, not tire attitude.'), l('内外前轮在所有转弯半径下都应保持相同转角。', 'Inner and outer front wheels should keep equal angles at every turn radius.')],
  battery: [l('端电压可在任何负载下直接、唯一地给出 SOC。', 'Terminal voltage uniquely gives SOC under every load.'), l('直流母线能量等于电芯化学能变化，不存在内阻或连接损耗。', 'DC-bus energy equals cell chemical-energy change with no internal or interconnect loss.')],
  inverter: [l('效率接近 100% 就不需要核算绝对损耗与结温。', 'Near-100% efficiency removes the need to calculate absolute loss and junction temperature.'), l('直流与交流侧在驱动和回收时始终具有相同功率方向。', 'DC and AC sides always have the same power direction in drive and regeneration.')],
  motor: [l('峰值扭矩与峰值功率可在全部转速同时保持。', 'Peak torque and peak power can both be held at every speed.'), l('直流侧功率上限可直接当作机械轴功率，不需效率换算。', 'A DC-side limit is directly the mechanical shaft power with no efficiency conversion.')],
  differential: [l('左右轮速不同本身就证明有车轮打滑。', 'Unequal wheel speeds alone prove wheelspin.'), l('增加锁止在任何路面和弯道阶段都会提高总抓地。', 'More locking always increases total grip on every surface and in every corner phase.')],
  cooling: [l('单点冷却液绝对温度足以计算带热量。', 'One absolute coolant temperature is enough to calculate heat transport.'), l('泵速或风量增加时，冷却能力必然保持线性增长。', 'Cooling capability must grow linearly with pump speed or airflow.')],
  control: [l('滤波越强越安全，不会产生延迟或掩盖瞬态。', 'Stronger filtering is always safer and cannot add delay or hide transients.'), l('一个传感器通道足以授权关键扭矩，无需合理性检查。', 'One sensor channel is enough to authorize critical torque without plausibility checks.')],
  telemetry: [l('采样率等于两倍最高频率就有充分抗混叠裕量。', 'Sampling at exactly twice the highest frequency gives ample anti-alias margin.'), l('不同通道的时间戳对齐不会影响因果判断。', 'Timestamp alignment across channels does not affect causal diagnosis.')],
}

const makeQuestions = (id: PartId): [KnowledgeQuestion, KnowledgeQuestion, KnowledgeQuestion, KnowledgeQuestion, KnowledgeQuestion] => {
  const part = GRAND_PRIX_PARTS[id]
  const lesson = GRAND_PRIX_ENGINEERING_LESSONS[id]
  const formula = lesson.formulas[0]
  const worked = GRAND_PRIX_FORMULA_EXAMPLES[id][0]
  const partIndex = PART_IDS.indexOf(id)
  const answerAt = (offset: number) => ((partIndex + offset) % 3) as AnswerIndex
  const experiment = lesson.experiments[0]
  const diagnosis = lesson.diagnostics[0]
  const misconception = conceptMisconceptions[lesson.labKind]
  const calculationError = calculationErrors[id]
  return [
    choice(`gp-${id}-concept`, 'concept', 1,
      l(`${part.zh.name}在整车中的核心任务是什么？`, `What is the primary vehicle-level task of ${part.en.name}?`),
      l(part.zh.purpose, part.en.purpose), misconception[0], misconception[1], answerAt(0),
      l(`${part.zh.short}${part.zh.engineering[0]}`, `${part.en.short} ${part.en.engineering[0]}`)),
    choice(`gp-${id}-calculation`, 'calculation', 2,
      l(`以下“${formula.name.zh}”工况中，哪条结果路径在量纲与物理上都成立？${worked.scenario.zh}`, `For this “${formula.name.en}” case, which result path is dimensionally and physically consistent? ${worked.scenario.en}`),
      worked.result,
      calculationError[0],
      calculationError[1],
      answerAt(1),
      l(`${worked.steps.map((step) => step.zh).join(' ')} ${worked.result.zh}`, `${worked.steps.map((step) => step.en).join(' ')} ${worked.result.en}`), formula.variables),
    choice(`gp-${id}-scenario`, 'scenario', 2,
      l(`要回答“${experiment.question.zh}”，哪套观察方法最可靠？`, `Which observation plan most reliably answers “${experiment.question.en}”?`),
      l(`${experiment.steps.map((step) => step.zh).join('；')}；记录${experiment.evidence.zh}`, `${experiment.steps.map((step) => step.en).join('; ')}; record ${experiment.evidence.en}`),
      l('只记录最快一圈的车手主观感觉，不同步控制量与车辆状态。', 'Record only the driver impression from the fastest lap, without synchronized controls or vehicle states.'),
      l('直接更换相邻系统，并只比较一个峰值通道。', 'Change a neighbouring system directly and compare only one peak channel.'), answerAt(2),
      l(`${part.zh.observe.join('')}${experiment.evidence.zh}`, `${part.en.observe.join(' ')} ${experiment.evidence.en}`)),
    choice(`gp-${id}-diagnosis`, 'diagnosis', 3,
      l(`${diagnosis.symptom.zh} 哪条优先验证路径最合理？`, `${diagnosis.symptom.en} Which priority validation path is most defensible?`),
      l(diagnosis.checks.map((check) => check.zh).join('；'), diagnosis.checks.map((check) => check.en).join('; ')),
      l('在验证测量链和硬件之前，先用标定补偿把症状隐藏。', 'Hide the symptom with calibration compensation before validating the measurement chain or hardware.'),
      l('只清除故障码并重启；若短时消失就判定已修复。', 'Clear faults and reboot only; declare it fixed if the symptom briefly disappears.'), answerAt(3),
      diagnosis.resolution),
    choice(`gp-${id}-design`, 'design', 3,
      l(`设计或标定${part.zh.name}时，哪套决策与验证闭环最完整？`, `Which decision-and-validation loop is most complete for ${part.en.name}?`),
      l(`${lesson.decisions[0].zh}；${lesson.validation[0].zh}`, `${lesson.decisions[0].en}; ${lesson.validation[0].en}`),
      l('只优化一个峰值输出，忽略规则边界、相邻系统、故障状态和工作包络。', 'Optimize one peak output while ignoring rules, neighbouring systems, fault states and operating envelope.'),
      l('采用第一版几何或标定，不做台架、装车、赛道和复盘验证。', 'Freeze the first geometry or calibration with no rig, vehicle, track or review validation.'), answerAt(4),
      l(`${part.zh.engineering.join('')}${lesson.validation.map((item) => item.zh).join('')}`, `${part.en.engineering.join(' ')} ${lesson.validation.map((item) => item.en).join(' ')}`)),
  ]
}

export const GRAND_PRIX_QUESTION_BANK: Record<PartId, [KnowledgeQuestion, KnowledgeQuestion, KnowledgeQuestion, KnowledgeQuestion, KnowledgeQuestion]> = Object.fromEntries(
  PART_IDS.map((id) => [id, makeQuestions(id)]),
) as Record<PartId, [KnowledgeQuestion, KnowledgeQuestion, KnowledgeQuestion, KnowledgeQuestion, KnowledgeQuestion]>
