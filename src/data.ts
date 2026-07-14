export type CategoryId = 'aero' | 'structure' | 'dynamics' | 'power' | 'electronics'
export type ScenarioId = 'idle' | 'acceleration' | 'braking' | 'cornering' | 'aero'
export const PART_IDS = ['front-wing', 'rear-wing', 'floor', 'nose', 'monocoque', 'halo', 'tires', 'brakes', 'front-suspension', 'rear-suspension', 'steering', 'battery', 'inverter', 'motor', 'differential', 'cooling', 'ecu', 'sensors'] as const
export type PartId = typeof PART_IDS[number]
export const COURSE_IDS = ['orientation', 'forces', 'tires', 'braking', 'suspension', 'aero', 'powertrain', 'integration'] as const
export type CourseId = typeof COURSE_IDS[number]

export type PartInfo = {
  id: PartId
  name: string
  nameEn: string
  category: CategoryId
  index: string
  short: string
  purpose: string
  analogy: string
  observe: [string, string, string]
  engineering: [string, string, string]
  faults: [string, string]
  connections: string[]
  camera: [number, number, number]
  target: [number, number, number]
}

export const CATEGORIES: Record<CategoryId, { name: string; short: string; color: string }> = {
  aero: { name: '空气动力学', short: 'AERO', color: '#52d7ff' },
  structure: { name: '车身与安全', short: 'BODY', color: '#f4f7fa' },
  dynamics: { name: '底盘与车辆动力学', short: 'DYNAMICS', color: '#ffb34d' },
  power: { name: '动力与热管理', short: 'POWER', color: '#ff5c55' },
  electronics: { name: '电子与数据', short: 'DATA', color: '#a887ff' },
}

export const PARTS: PartInfo[] = [
  {
    id: 'front-wing', name: '前翼', nameEn: 'FRONT WING', category: 'aero', index: '01',
    short: '赛车接触气流的第一组关键翼面，决定前轴下压力，也影响整车后方气流。',
    purpose: '利用上下表面的压强差把车头压向地面，提升高速转向能力；同时把轮胎产生的脏乱气流引向可控区域。',
    analogy: '像倒过来的飞机机翼：飞机翼要向上升，赛车翼要向下压。',
    observe: ['从正前方看主翼片与襟翼的层数。', '从侧面看翼片迎角，以及它与地面的距离。', '切换“气流”场景，观察气流经过前翼后如何绕开前轮。'],
    engineering: ['翼片角度增大通常能提高前轴下压力，但阻力也会增加。', '前翼调节会改变高速转向平衡，过强可能造成高速车尾不稳定。', '离地高度和车身俯仰会让前翼工作状态持续变化。'],
    faults: ['翼片破损会造成前轴抓地突然下降。', '左右翼面不对称可能让赛车在高速制动时偏航。'],
    connections: ['鼻锥', '底板与扩散器', '前轮'], camera: [5.6, 2.3, 5.7], target: [0, 0.45, 3.55],
  },
  {
    id: 'rear-wing', name: '尾翼', nameEn: 'REAR WING', category: 'aero', index: '02',
    short: '位于赛车最后方的主下压力装置，负责高速时稳定后轴。',
    purpose: '为驱动轮提供高速抓地，并通过不同翼片设定在弯道性能与直线速度之间取舍。',
    analogy: '像有人在高速时持续按住车尾，速度越高，按得越重。',
    observe: ['比较主翼片与上方襟翼的角度。', '观察端板如何限制翼尖两侧的气流交换。', '在气流场景中查看尾翼后的低压尾流。'],
    engineering: ['尾翼下压力随速度平方近似增长。', '尾翼角度过大会显著增加直线阻力。', '需要与底板、扩散器共同确定整车气动平衡。'],
    faults: ['支架松动会使翼面迎角变化。', '翼片失效可能导致高速转向突然过度。'],
    connections: ['扩散器', '后悬架', '车架'], camera: [5.8, 2.8, -5.6], target: [0, 1.45, -3.8],
  },
  {
    id: 'floor', name: '底板与扩散器', nameEn: 'FLOOR & DIFFUSER', category: 'aero', index: '03',
    short: '藏在车底、肉眼最容易忽略，却可能贡献大量下压力的气动通道。',
    purpose: '加速车底气流、降低局部静压，再通过扩散器让气流逐步减速回到外界压力。',
    analogy: '像把赛车和地面之间变成一条受控的高速气流隧道。',
    observe: ['开启透视模式，从低角度看平整底板。', '观察车尾向上张开的扩散器通道。', '调节爆炸滑杆，看底板与车身之间的装配关系。'],
    engineering: ['底板对离地高度、俯仰和侧倾非常敏感。', '过低可能触底并让气流失稳。', '扩散角过大容易发生气流分离，反而损失下压力。'],
    faults: ['底板磨损会改变几何形状。', '密封气流被破坏会让下压力波动。'],
    connections: ['前翼', '侧箱', '尾翼'], camera: [5.1, 1.1, -2.5], target: [0, 0.15, 0],
  },
  {
    id: 'nose', name: '鼻锥与吸能盒', nameEn: 'NOSE & IMPACT ATTENUATOR', category: 'structure', index: '04',
    short: '连接前翼与主体车架的细长结构，也是正面碰撞时的重要吸能区域。',
    purpose: '支撑前翼、梳理车头气流，并在碰撞中通过受控变形吸收能量。',
    analogy: '既是赛车的“鼻梁”，也是正面碰撞时的缓冲区。',
    observe: ['沿鼻锥从前向后看截面如何逐渐增大。', '寻找它与单体壳前端的连接位置。', '隔离鼻锥，观察前翼载荷如何传回车架。'],
    engineering: ['结构既要轻，也要满足刚度与吸能要求。', '吸能结构需要以可预测方式逐级破坏。', '外形同时受到结构空间和气动需求约束。'],
    faults: ['碰撞后的隐藏裂纹可能降低承载能力。', '连接点松动会影响前翼定位。'],
    connections: ['前翼', '单体壳', '前悬架'], camera: [5.2, 2.2, 4.2], target: [0, 0.65, 2.35],
  },
  {
    id: 'monocoque', name: '单体壳', nameEn: 'MONOCOQUE', category: 'structure', index: '05',
    short: '赛车的核心承力骨架，驾驶员、悬架和主要系统都围绕它布置。',
    purpose: '形成高刚度安全舱，把悬架和气动力产生的载荷可靠传递到整车。',
    analogy: '相当于赛车的骨骼与胸腔，既承担力量，也保护内部人员。',
    observe: ['隐藏外部气动件，查看中央封闭壳体。', '观察前后悬架安装点所在区域。', '查看驾驶员坐姿与单体壳截面的关系。'],
    engineering: ['扭转刚度会影响悬架调校是否可预测。', '碳纤维铺层方向决定不同方向的强度。', '减重不能牺牲碰撞安全和安装点刚度。'],
    faults: ['分层或裂纹可能不易从表面发现。', '安装点局部损伤会改变悬架几何。'],
    connections: ['鼻锥', '座舱防护结构', '悬架', '电池包'], camera: [5.6, 2.8, 0.7], target: [0, 0.8, 0.45],
  },
  {
    id: 'halo', name: '座舱防护结构', nameEn: 'COCKPIT PROTECTION', category: 'structure', index: '06',
    short: '围绕驾驶员头部布置的高强度防护结构。',
    purpose: '在翻滚、飞来物或车辆叠压等事故中，为驾驶员头部保留生存空间。',
    analogy: '像驾驶员头顶的一圈坚固护栏，但要承受远超普通护栏的冲击。',
    observe: ['从驾驶员视角观察中央支柱的视野影响。', '查看两侧支撑点如何连接到主体结构。', '旋转到俯视角，理解它保护的空间范围。'],
    engineering: ['高强度、低质量和驾驶视野需要同时兼顾。', '载荷最终必须通过安装点传入单体壳。', '外形还会影响座舱附近的气流。'],
    faults: ['连接区域损伤可能降低整体承载能力。', '事故后必须进行完整检查而非只看表面。'],
    connections: ['单体壳', '座椅与安全带'], camera: [4.4, 3.3, 1.0], target: [0, 1.48, 0.25],
  },
  {
    id: 'tires', name: '光头赛车轮胎', nameEn: 'RACING SLICKS', category: 'dynamics', index: '07',
    short: '赛车所有加速、制动和转弯力量最终都必须通过四块很小的接地面积传给路面。',
    purpose: '利用橡胶与路面的相互作用产生纵向和横向力，是整车性能的最终执行者。',
    analogy: '发动机、空气动力学和悬架再先进，最后都要通过四只“鞋底”落到地面。',
    observe: ['从正面观察轮胎宽度和外倾角。', '切换转弯场景，比较内外侧轮胎载荷。', '观察制动时前轮载荷增加、后轮载荷减少。'],
    engineering: ['抓地力不会与垂直载荷严格成正比，这叫轮胎载荷敏感性。', '温度、胎压、滑移率和侧偏角共同决定可用抓地。', '同时要求极限制动和极限转弯会争夺同一个摩擦能力。'],
    faults: ['温度过低无法进入理想工作区。', '过热、锁死或定位不当会造成异常磨损。'],
    connections: ['轮毂与制动', '悬架', '转向系统'], camera: [6.2, 2.2, 3.4], target: [1.55, 0.62, 2.1],
  },
  {
    id: 'brakes', name: '制动系统', nameEn: 'BRAKE SYSTEM', category: 'dynamics', index: '08',
    short: '通过摩擦把赛车的动能转化为热量，使车辆减速。',
    purpose: '让驾驶员可控地降低车速，并在入弯前把轮胎纵向能力尽可能利用起来。',
    analogy: '制动器不是把能量消失，而是把速度换成制动盘上的热。',
    observe: ['隐藏轮胎，查看制动盘和卡钳。', '切换制动场景，观察盘温颜色变化。', '比较制动时前后轴箭头长度。'],
    engineering: ['制动平衡需要随载荷转移和下压力变化设定。', '盘径、有效半径和卡钳夹紧力共同决定制动力矩。', '散热不足会引起衰退，温度过低也可能达不到最佳摩擦。'],
    faults: ['制动液沸腾会造成踏板行程突然变长。', '前后平衡错误可能导致前轮锁死或车尾旋转。'],
    connections: ['轮胎', '踏板机构', '悬架立柱'], camera: [5.8, 2.0, 3.1], target: [1.6, 0.62, 2.15],
  },
  {
    id: 'front-suspension', name: '前悬架', nameEn: 'FRONT SUSPENSION', category: 'dynamics', index: '09',
    short: '控制前轮相对车身的运动轨迹，并把轮胎载荷传入车架。',
    purpose: '保持轮胎在颠簸、制动和转向时尽可能处于有效姿态，同时控制车身运动。',
    analogy: '它不是简单的上下弹簧，而是一套精确规定车轮运动路线的连杆机构。',
    observe: ['区分上控制臂、下控制臂和推杆。', '切换转弯场景，观察外侧压缩与内侧伸长。', '从车头看轮胎外倾角随行程的变化。'],
    engineering: ['安装点位置决定外倾增益、滚心和运动比。', '弹簧支撑车身，减振器控制运动速度。', '几何设计需要兼顾制动、转向、气动平台和机械抓地。'],
    faults: ['球头间隙会造成定位参数漂移。', '推杆弯曲或减振器泄漏会改变动态响应。'],
    connections: ['前轮', '转向齿条', '单体壳', '减振器'], camera: [5.7, 2.5, 3.2], target: [1.25, 0.72, 2.0],
  },
  {
    id: 'rear-suspension', name: '后悬架', nameEn: 'REAR SUSPENSION', category: 'dynamics', index: '10',
    short: '控制驱动轮姿态，并把动力、侧向力和气动载荷传回车身。',
    purpose: '在加速和转弯时维持后轮有效接地，同时稳定车尾。',
    analogy: '它既要让后轮有抓地，又要成为动力系统和车架之间精准的关节。',
    observe: ['查看半轴如何穿过悬架区域连接车轮。', '观察控制臂与后部结构的安装点。', '在加速场景中查看后轴载荷变化。'],
    engineering: ['后悬架几何会影响出弯牵引力和车尾响应。', '抗蹲几何可改变加速时的车身姿态。', '需要为传动轴、制动和气流留出空间。'],
    faults: ['左右定位差异会造成车辆偏航。', '轴承或球头磨损会带来不可预测的轮胎姿态。'],
    connections: ['后轮', '差速器', '传动轴', '车架'], camera: [5.8, 2.5, -3.2], target: [1.25, 0.75, -2.15],
  },
  {
    id: 'steering', name: '转向系统', nameEn: 'STEERING', category: 'dynamics', index: '11',
    short: '把驾驶员方向盘的转动转换为前轮的精确角度变化。',
    purpose: '快速、低间隙地传递驾驶员输入，并提供足够清晰的路感反馈。',
    analogy: '像把双手的微小动作，通过机械链路精确放大到两只前轮。',
    observe: ['从方向盘沿转向柱找到齿条。', '查看左右拉杆连接到轮端的位置。', '切换转弯场景，比较内外轮转角。'],
    engineering: ['转向比决定手部动作与车轮角度的关系。', '几何需要考虑阿克曼关系、轮胎特性和悬架跳动。', '任何间隙都会降低驾驶员对前轮状态的判断。'],
    faults: ['拉杆松动会产生虚位。', '几何干涉可能造成悬架运动时车轮自行转向。'],
    connections: ['方向盘', '转向齿条', '前悬架'], camera: [4.8, 2.7, 2.0], target: [0, 0.83, 1.45],
  },
  {
    id: 'battery', name: '动力电池包', nameEn: 'ACCUMULATOR', category: 'power', index: '12',
    short: '储存赛车比赛所需的高压电能，是电动赛车最重、也最需要保护的部件之一。',
    purpose: '在规定电压、电流和温度范围内稳定供电，并在故障时快速安全地隔离高压。',
    analogy: '像赛车的油箱，但内部储存的是高压电能，还需要实时监控每一组电芯。',
    observe: ['开启动力层，查看电池在车身低处的位置。', '观察它与逆变器之间的高压路径。', '切换加速场景，查看能量从电池流向电机。'],
    engineering: ['容量、峰值功率、质量与散热之间需要权衡。', '电芯一致性和热管理决定可用性能与寿命。', '壳体必须承担机械保护、电气绝缘和防火隔离。'],
    faults: ['过温或绝缘下降会触发高压切断。', '电芯不一致会限制整个电池包的可用能量。'],
    connections: ['逆变器', '电池管理系统', '冷却系统'], camera: [5.0, 2.7, -0.4], target: [0, 0.55, -0.65],
  },
  {
    id: 'inverter', name: '逆变器', nameEn: 'INVERTER', category: 'power', index: '13',
    short: '位于电池和电机之间的高速电力电子控制器。',
    purpose: '把电池直流电变成电机需要的可控交流电，并在能量回收时反向工作。',
    analogy: '像动力系统的翻译官和阀门：既改变电流形式，也精确控制流量。',
    observe: ['沿蓝色高压路径找到电池、逆变器和电机。', '查看逆变器与冷却回路的连接。', '在加速场景观察功率流向。'],
    engineering: ['开关频率、效率和热量相互影响。', '控制算法根据扭矩指令和电机位置生成相电流。', '封装需要承受振动、热循环和电磁干扰。'],
    faults: ['功率器件过热可能触发降功率。', '位置或电流传感异常会导致扭矩控制失准。'],
    connections: ['动力电池包', '驱动电机', '冷却系统', '车辆控制器'], camera: [4.7, 2.4, -1.8], target: [0.45, 0.72, -1.65],
  },
  {
    id: 'motor', name: '驱动电机', nameEn: 'TRACTION MOTOR', category: 'power', index: '14',
    short: '把电能转换成机械扭矩，是电动赛车加速的核心执行器。',
    purpose: '在很宽的转速范围内快速、精确地输出扭矩，也可在制动时回收部分能量。',
    analogy: '它像反应极快的肌肉，控制器给多少指令，就几乎立刻输出多少力量。',
    observe: ['隔离动力系统，找到电机输出轴。', '观察电机如何连接减速器和差速器。', '在加速场景查看扭矩箭头。'],
    engineering: ['峰值扭矩、持续功率、转速和冷却能力共同限制性能。', '高转速有利于提高功率密度，但对减速器与轴承提出更高要求。', '输出能力常常受到温度而非瞬时电流限制。'],
    faults: ['温度过高会触发扭矩降额。', '轴承、绝缘或位置传感器异常都会威胁可靠性。'],
    connections: ['逆变器', '差速器', '冷却系统'], camera: [4.9, 2.4, -2.5], target: [0, 0.72, -2.25],
  },
  {
    id: 'differential', name: '差速器', nameEn: 'DIFFERENTIAL', category: 'power', index: '15',
    short: '把动力分配给左右驱动轮，并允许两侧车轮在转弯时采用不同转速。',
    purpose: '减少转弯时的轮胎拖滑，同时利用限滑特性改善出弯牵引力。',
    analogy: '像一位协调员：既把力量分给两边，又允许弯道外侧轮走得更快。',
    observe: ['查看中央输出与左右半轴的位置。', '切换转弯场景，注意内外轮路径长度不同。', '沿传动轴观察扭矩如何到达轮端。'],
    engineering: ['开放式差速器转向自然，但单侧打滑时牵引受限。', '限滑强度影响入弯灵活性和出弯稳定性。', '齿轮、轴承与润滑都要承受冲击载荷。'],
    faults: ['润滑不足会造成齿轮和轴承过热。', '限滑设定不当会让赛车推头或出弯不稳定。'],
    connections: ['驱动电机', '传动轴', '后轮'], camera: [5.2, 2.1, -3.0], target: [0, 0.65, -2.75],
  },
  {
    id: 'cooling', name: '冷却系统', nameEn: 'COOLING SYSTEM', category: 'power', index: '16',
    short: '把电池、电机和逆变器产生的热量带走，让动力系统持续工作。',
    purpose: '把关键部件维持在高效、可靠的温度区间，避免过热降功率。',
    analogy: '像赛车的血液循环：冷却液搬运热量，散热器把热量交给空气。',
    observe: ['找到侧箱内的散热器。', '沿管路观察热流从动力部件到散热器。', '切换加速场景，查看热负荷逐步增加。'],
    engineering: ['散热能力、空气阻力、泵功率和系统质量需要权衡。', '不同部件可能需要不同温度和独立回路。', '导流设计决定多少空气真正穿过散热器芯体。'],
    faults: ['气泡、泄漏或泵故障会迅速降低散热能力。', '散热器堵塞会造成温度持续上升。'],
    connections: ['电池包', '逆变器', '驱动电机', '侧箱'], camera: [5.4, 2.3, -0.9], target: [1.0, 0.72, -0.65],
  },
  {
    id: 'ecu', name: '车辆控制器', nameEn: 'VEHICLE CONTROL UNIT', category: 'electronics', index: '17',
    short: '协调驾驶员输入、动力系统、安全状态和各种执行器的中央控制节点。',
    purpose: '读取传感器、执行控制逻辑、下发扭矩指令，并在异常时让赛车进入安全状态。',
    analogy: '像赛车的协调中枢：它不直接制造力量，却决定各系统何时、如何行动。',
    observe: ['开启电子层，观察紫色数据连接。', '查看踏板、方向盘、逆变器和传感器如何汇入控制器。', '在不同场景中观察指令方向。'],
    engineering: ['控制周期、信号可信度和故障处理决定系统可靠性。', '关键输入通常需要合理性检查或冗余。', '软件要区分正常控制、降级运行和紧急停机。'],
    faults: ['传感器漂移可能产生错误控制判断。', '通信超时必须触发明确且安全的响应。'],
    connections: ['逆变器', '传感器', '方向盘', '数据采集'], camera: [4.4, 2.8, 0.3], target: [-0.45, 0.95, 0.1],
  },
  {
    id: 'sensors', name: '传感器与遥测', nameEn: 'SENSORS & TELEMETRY', category: 'electronics', index: '18',
    short: '把赛车的速度、温度、压力、位移和加速度变成工程师可以分析的数据。',
    purpose: '帮助控制系统实时判断状态，也帮助工程师在赛后找到性能和可靠性问题。',
    analogy: '传感器是赛车的感觉器官，遥测则把这些感觉送到工程师面前。',
    observe: ['查看轮速、悬架位移和温度测点。', '切换场景，观察实时数据条变化。', '点击关联部件理解每项数据的物理来源。'],
    engineering: ['采样率必须匹配被观察现象的变化速度。', '数据需要校准、滤波和时间同步。', '更多通道不等于更多知识，必须先提出正确问题。'],
    faults: ['噪声、断线或漂移会让数据失去可信度。', '时间不同步会造成错误的因果判断。'],
    connections: ['车辆控制器', '轮速传感器', '悬架位移', '温度与压力'], camera: [4.7, 3.1, 0.8], target: [0, 1.0, 0],
  },
]

export const PART_MAP = Object.fromEntries(PARTS.map((part) => [part.id, part])) as Record<PartId, PartInfo>

export type Course = {
  id: CourseId
  number: string
  title: string
  subtitle: string
  description: string
  parts: PartId[]
  task: string
  question: string
  options: [string, string, string, string]
  answer: 0 | 1 | 2 | 3
}

export const COURSES: Course[] = [
  { id: 'orientation', number: '00', title: '认识赛车', subtitle: '建立整车地图', description: '先不急着背术语。找到一辆方程式赛车最重要的系统，理解它们为什么围绕轮胎协同工作。', parts: ['front-wing', 'monocoque', 'tires'], task: '依次找到前翼、单体壳和轮胎，并分别隔离观察。', question: '赛车产生的所有加速、制动和转弯力，最终通过什么传给地面？', options: ['车架', '空气', '轮胎', '电池'], answer: 2 },
  { id: 'forces', number: '01', title: '力与载荷', subtitle: '看懂赛车的共同语言', description: '从质量、加速度、载荷和力矩开始，理解为什么工程师关心重心与载荷转移。', parts: ['monocoque', 'tires', 'floor'], task: '切换制动与转弯场景，观察四个轮胎上箭头的变化。', question: '赛车制动时，通常哪一轴的垂直载荷会增加？', options: ['前轴', '后轴', '左右完全相同', '都不会变化'], answer: 0 },
  { id: 'tires', number: '02', title: '轮胎与抓地', subtitle: '所有性能的最终出口', description: '学习纵向力、横向力、滑移、温度和载荷敏感性，建立“抓地预算”的概念。', parts: ['tires', 'brakes'], task: '进入转弯场景，找出载荷最大的外侧轮胎。', question: '要求轮胎同时极限制动和极限转弯时会怎样？', options: ['抓地自动翻倍', '两种需求争夺有限抓地', '只影响胎温', '完全没有影响'], answer: 1 },
  { id: 'braking', number: '03', title: '制动系统', subtitle: '把速度变成热', description: '观察制动盘温升、前后轴载荷变化，以及制动平衡如何影响稳定性。', parts: ['brakes', 'tires', 'front-suspension'], task: '打开制动场景并隐藏轮胎，观察制动盘的温度变化。', question: '制动盘的主要能量转换是什么？', options: ['热能变动能', '动能变热能', '电能变势能', '气压变电能'], answer: 1 },
  { id: 'suspension', number: '04', title: '悬架与转向', subtitle: '管理轮胎姿态', description: '认识双横臂、推杆、弹簧、减振器与转向拉杆，观察车轮如何随车身运动。', parts: ['front-suspension', 'rear-suspension', 'steering'], task: '进入转弯场景，从车头观察左右悬架行程差异。', question: '减振器最主要控制什么？', options: ['车身颜色', '运动速度', '电池电压', '尾翼面积'], answer: 1 },
  { id: 'aero', number: '05', title: '空气动力学', subtitle: '管理看不见的流动', description: '沿着气流从前翼走到底板和尾翼，理解下压力、阻力以及气动平衡。', parts: ['front-wing', 'floor', 'rear-wing'], task: '进入气流场景，再用爆炸视图分离三个主要气动部件。', question: '翼片角度增大通常会带来什么组合？', options: ['下压力和阻力都增大', '两者都减小', '只减小质量', '只改变胎压'], answer: 0 },
  { id: 'powertrain', number: '06', title: '电驱与热管理', subtitle: '把电能变成圈速', description: '沿能量流认识电池、逆变器、电机和差速器，再观察热量如何被冷却系统带走。', parts: ['battery', 'inverter', 'motor', 'differential', 'cooling'], task: '进入加速场景，按照蓝色能量流依次点击动力部件。', question: '逆变器位于哪两个主要部件之间？', options: ['轮胎和路面', '电池和电机', '前翼和尾翼', '方向盘和齿条'], answer: 1 },
  { id: 'integration', number: '07', title: '整车调校', subtitle: '像工程师一样取舍', description: '没有一个参数可以孤立优化。用四个场景串联抓地、姿态、气动、动力和可靠性。', parts: ['tires', 'front-wing', 'rear-wing', 'ecu'], task: '分别运行制动、转弯和气流场景，并解释一个性能取舍。', question: '赛车调校最核心的思维是什么？', options: ['每个参数越大越好', '只追求峰值功率', '理解系统之间的取舍', '复制另一辆车的设置'], answer: 2 },
]

export const SCENARIOS: Record<ScenarioId, { name: string; subtitle: string; color: string }> = {
  idle: { name: '静态观察', subtitle: '自由旋转与拆解', color: '#edf7ff' },
  acceleration: { name: '全力加速', subtitle: '能量与扭矩流', color: '#41d6ff' },
  braking: { name: '重制动', subtitle: '载荷前移与热量', color: '#ff5b4d' },
  cornering: { name: '高速转弯', subtitle: '侧向力与车身侧倾', color: '#ffb34d' },
  aero: { name: '气流分析', subtitle: '下压力与尾流', color: '#57e4c2' },
}
