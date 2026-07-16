import type { PartId, PartInfo } from './data'
import type { Locale } from './i18n'

type LocalPart = Pick<PartInfo, 'name' | 'short' | 'purpose' | 'analogy' | 'observe' | 'engineering' | 'faults' | 'connections'>
type BilingualPart = Record<Locale, LocalPart>

const p = (zh: LocalPart, en: LocalPart): BilingualPart => ({ zh, en })

export const GRAND_PRIX_PARTS: Record<PartId, BilingualPart> = {
  'front-wing': p({
    name: '主动前翼', short: '跨越车头的大型多翼面组件，并带有可切换工作状态的活动襟翼。', purpose: '前翼产生前轴下压力、调节气动平衡，并决定气流如何绕过前轮进入底板入口。', analogy: '它像赛车最前方的一把空气梳子，同时也是会改变角度的倒置机翼。',
    observe: ['比较弯道状态与直道低阻状态下活动襟翼的角度。', '从正前方追踪主翼、襟翼、端板和鼻锥连接区。', '观察前翼尾流是否稳定进入底板入口并绕开前轮。'],
    engineering: ['气动力近似随动压与装车升力系数变化，速度翻倍时载荷约增至四倍。', '活动翼降低阻力时必须与后翼协调，避免气动平衡突然前移或后移。', '翼面挠度、离地高度、横摆角和前轮尾流都会改变真实装车性能。'],
    faults: ['活动机构不同步会造成左右下压力差和高速偏航。', '前翼端板或襟翼受损会同时损失前轴抓地并污染下游气流。'], connections: ['鼻锥与前部碰撞结构', '底板与扩散器', '前轮', '主动尾翼'],
  }, {
    name: 'ACTIVE FRONT WING', short: 'A full-width multi-element front wing with movable flaps that switch between operating states.', purpose: 'It creates front-axle downforce, sets aerodynamic balance and conditions the flow around the front wheels and into the floor.', analogy: 'It is both an inverted aircraft wing and the first comb that organizes the air for everything downstream.',
    observe: ['Compare flap angle in cornering and low-drag straight-line states.', 'Trace the mainplane, flap, endplate and nose interfaces from the front.', 'Watch whether the wake reaches the floor inlet cleanly around the front tires.'],
    engineering: ['Aerodynamic force follows dynamic pressure and installed lift coefficient, so doubling speed roughly quadruples load.', 'Front and rear active devices must change coherently or the aero balance will migrate abruptly.', 'Deflection, ride height, yaw and front-wheel wake make installed performance different from an isolated wing.'],
    faults: ['Left-right actuator disagreement creates asymmetric load and high-speed yaw.', 'A damaged flap or endplate removes front grip and degrades every downstream device.'], connections: ['Nose and FIS', 'Floor and diffuser', 'Front tires', 'Active rear wing'],
  }),
  'rear-wing': p({
    name: '主动尾翼', short: '由主翼、活动襟翼、端板和双支柱构成的后轴气动控制装置。', purpose: '它在弯道状态建立后轴下压力；车手在允许激活区请求低阻状态，标准电子控制单元（SECU）协调前后翼在两个规定的固定状态间切换。', analogy: '像一只可在两档姿态间切换、持续按住后轮的手：车手在允许区提出请求，SECU 负责安全执行。',
    observe: ['比较 SECU 指令的弯道与直道两种固定襟翼状态。', '从后方检查端板、翼尖泄漏和支柱周围的尾流。', '把尾翼与扩散器出口同时显示，观察两股气流如何耦合。'],
    engineering: ['尾翼下压力与阻力都随速度平方增长，但接近失速时系数不再线性。', '直道低阻状态只能在允许激活区由车手请求并由 SECU 控制；恢复弯道状态也必须满足规定的安全逻辑。', '尾翼载荷通过支架进入变速箱壳体，结构挠度会改变有效攻角。'],
    faults: ['襟翼卡滞会造成直线极速不足或弯道后轴抓地不足。', '支柱裂纹或位置传感器漂移会使控制器无法确认安全状态。'], connections: ['扩散器', '变速箱壳体', '后悬架', '主动前翼'],
  }, {
    name: 'ACTIVE REAR WING', short: 'A rear-axle aero device made from a mainplane, movable flap, endplates and twin supports.', purpose: 'It creates rear downforce in Corner Mode; in permitted activation zones the driver requests Straight-Line Mode and the SECU coordinates the front and rear wings between two prescribed fixed states.', analogy: 'It is a hand pressing the rear tires with two available postures: the driver requests the change in an allowed zone and the SECU executes it safely.',
    observe: ['Compare the two fixed flap states commanded by the SECU for Corner and Straight-Line Modes.', 'Inspect tip leakage and the wake around endplates and supports from behind.', 'Display the diffuser exit and rear wing together to study their coupled flow.'],
    engineering: ['Load and drag grow near the square of speed, but coefficients become nonlinear near separation.', 'The driver may request the low-drag state only in a permitted activation zone under SECU control; restoration to Corner Mode must also obey defined safety logic.', 'Wing load enters the gearbox casing through the supports, so structural deflection alters effective incidence.'],
    faults: ['A stuck flap either limits top speed or removes rear grip.', 'Support damage or position-sensor drift prevents the controller from proving a safe state.'], connections: ['Diffuser', 'Gearbox casing', 'Rear suspension', 'Active front wing'],
  }),
  floor: p({
    name: '文丘里底板与扩散器', short: '从底板入口、收缩段、喉部到底部扩散段组成的主要地面效应系统。', purpose: '它利用车底通道加速气流并降低静压，在扩散器内逐步恢复压力，从而用较低阻力产生大量下压力。', analogy: '像一条贴着地面工作的文丘里隧道，赛车高度就是它不断变化的阀门开度。',
    observe: ['透视查看左右通道的入口、喉部、边缘涡结构和扩散器。', '改变分层拆解，比较底板与单体壳、侧箱和后悬架的空间关系。', '在制动俯仰和高速压缩状态下观察最低离地间隙。'],
    engineering: ['质量守恒和伯努利关系能解释基本趋势，但真实流动还受黏性、边界层、涡和三维分离控制。', '底板对离地高度、俯仰、侧倾、横摆以及轮胎变形高度敏感。', '过低可能堵塞通道或触底，过高又会损失密封和吸力，因此机械平台与气动平台必须协同。'],
    faults: ['底板边缘或扩散器损伤会让下压力随横摆和高度剧烈波动。', '磨损板超限或局部触底说明车辆姿态与刚度设定不合适。'], connections: ['主动前翼', '侧箱入口', '后悬架', '主动尾翼'],
  }, {
    name: 'VENTURI FLOOR & DIFFUSER', short: 'The main ground-effect system, spanning inlet, contraction, throat and pressure-recovery diffuser.', purpose: 'It accelerates underfloor flow to reduce static pressure, then recovers pressure progressively to create large load with relatively low drag.', analogy: 'It is a Venturi tunnel whose opening is continuously adjusted by the car ride height.',
    observe: ['Use X-ray to locate inlets, throats, edge-vortex structures and diffuser passages.', 'Explode the assembly to compare its space claim with chassis, sidepods and rear suspension.', 'Inspect minimum clearance under braking pitch and high-speed compression.'],
    engineering: ['Continuity and Bernoulli explain first-order trends, while real flow depends on viscosity, boundary layers, vortices and 3D separation.', 'Ride height, pitch, roll, yaw and tire deformation strongly affect the floor.', 'Too low can choke or strike the road; too high loses sealing and suction, so mechanical and aerodynamic platforms must be co-designed.'],
    faults: ['Edge or diffuser damage makes load highly sensitive to ride height and yaw.', 'Excessive plank wear or repeated strikes indicate an unsuitable platform setup.'], connections: ['Active front wing', 'Sidepod inlet', 'Rear suspension', 'Active rear wing'],
  }),
  nose: p({
    name: '鼻锥与前部碰撞结构', short: '连接前翼、前舱壁和单体壳的可拆式鼻锥，并包含经认证的前部吸能结构。', purpose: '它支撑前翼并管理车头气流，同时在正面碰撞中按受控方式变形吸收能量，限制传给生存舱的减速度。', analogy: '它既是空气入口前的整流鼻梁，也是驾驶员前方的一次性安全缓冲器。',
    observe: ['追踪前翼载荷通过鼻锥进入前舱壁的路径。', '比较外部整流壳与内部承载、吸能结构。', '检查转向拉杆、前悬架和踏板舱周围的装配余量。'],
    engineering: ['碰撞设计关注吸能、峰值力、平均减速度和变形行程，而不是单纯追求最高刚度。', '层合方向、触发结构和胶接界面决定复合材料如何逐级破坏。', '可拆接口必须重复定位气动表面并可靠传递前翼载荷。'],
    faults: ['轻微碰撞后的隐蔽分层可能削弱后续吸能能力。', '连接面松动会使前翼位置变化并产生无法解释的气动平衡漂移。'], connections: ['主动前翼', '生存舱', '前悬架', '踏板与转向系统'],
  }, {
    name: 'NOSE & FRONTAL IMPACT STRUCTURE', short: 'A removable nose joining the front wing and front bulkhead, with a homologated frontal energy-absorbing structure.', purpose: 'It supports the wing and shapes the inlet flow while crushing progressively in a frontal impact to limit loads reaching the survival cell.', analogy: 'It is both an aerodynamic nose bridge and a sacrificial safety cushion ahead of the driver.',
    observe: ['Trace front-wing loads into the front bulkhead.', 'Separate the outer fairing from load-bearing and crush structures.', 'Inspect packaging around steering, suspension and the pedal volume.'],
    engineering: ['Crash design balances absorbed energy, peak force, average deceleration and crush stroke rather than maximizing stiffness.', 'Laminate direction, triggers and bonded interfaces govern progressive composite failure.', 'The removable joint must relocate aero surfaces and transfer wing load repeatedly.'],
    faults: ['Hidden delamination after a minor impact can reduce later crash capacity.', 'Loose interfaces shift the front wing and produce unexplained aero-balance drift.'], connections: ['Active front wing', 'Survival cell', 'Front suspension', 'Pedals and steering'],
  }),
  monocoque: p({
    name: '生存舱、座椅与约束系统', short: '围绕驾驶员构建的碳纤维承载壳体，内部包含定制座椅、头枕、六点式安全带和腿部空间。', purpose: '它保护驾驶员生存空间，并把悬架、气动、动力单元与安全带载荷可靠传递到整车。', analogy: '它同时是赛车的脊柱、肋骨和驾驶员量身定做的安全舱。',
    observe: ['从上方查看驾驶员臀点、肩部、头盔和踏板之间的姿态关系。', '隔离座椅、头枕和安全带，追踪约束载荷进入壳体的位置。', '比较前后悬架硬点与单体壳闭合截面的距离。'],
    engineering: ['扭转刚度必须足够高，使轮胎载荷响应主要由悬架而非车架弹性决定。', '复合材料铺层按载荷方向设计，并通过夹芯结构提高弯曲与局部屈曲能力。', '驾驶员尺寸、快速撤离、视野、散热和碰撞净空都是几何设计输入。'],
    faults: ['表面无明显裂纹也可能存在冲击后的内部脱粘或夹芯损伤。', '安全带角度、座椅支撑或头枕间隙错误会在碰撞中放大伤害。'], connections: ['头部保护环与防滚结构', '鼻锥', '前后悬架', '动力单元'],
  }, {
    name: 'SURVIVAL CELL, SEAT & RESTRAINTS', short: 'A carbon-composite load-bearing shell around the driver containing a molded seat, headrest, six-point harness and leg volume.', purpose: 'It preserves survival space and transfers suspension, aero, power-unit and restraint loads through the car.', analogy: 'It is simultaneously the spine, rib cage and custom-fitted safety shell of the race car.',
    observe: ['Inspect the relationship among hip point, shoulders, helmet and pedals from above.', 'Isolate seat, headrest and belts and trace restraint loads into the shell.', 'Compare suspension hard points with the closed monocoque section.'],
    engineering: ['Torsional stiffness must keep chassis compliance from dominating tire-load response.', 'Composite plies follow load paths and sandwich construction improves bending and local buckling resistance.', 'Driver size, extraction, sight lines, heat and crash clearance are geometric design inputs.'],
    faults: ['Impact delamination or core damage may exist beneath an intact surface.', 'Incorrect belt angles, seat support or headrest clearance amplify injury risk.'], connections: ['Halo and roll structure', 'Nose', 'Front and rear suspension', 'Power unit'],
  }),
  halo: p({
    name: '头部保护环与座舱安全结构', short: '由钛合金头部保护环、主防滚结构、次防滚结构和座舱边缘防护共同定义的头部生存空间。', purpose: '它抵抗大物体、赛车重叠和翻滚载荷，并为驾驶员头盔周围维持受保护的几何区域。', analogy: '像围绕头盔搭起的超高强度门框和防滚笼。',
    observe: ['检查中央支柱与驾驶员视线的相对位置。', '追踪头部保护环三个安装点如何把载荷传入单体壳。', '从侧视图比较头盔、头枕和防滚结构包络线。'],
    engineering: ['安全结构必须通过规定方向与幅值的静载和冲击验证。', '安装点局部强化需要把集中载荷扩散进复合材料壳体。', '可视性、空气动力影响、质量和结构安全必须同时满足。'],
    faults: ['安装座损伤或错误紧固会显著降低载荷能力。', '事故后仅凭肉眼无法确认安全，必须按规定进行无损检查与更换判断。'], connections: ['生存舱', '头枕与座椅', '驾驶员头盔', '车载摄像与传感器'],
  }, {
    name: 'HALO & COCKPIT SAFETY STRUCTURES', short: 'The protected head volume defined by titanium Halo, primary and secondary roll structures and cockpit-edge protection.', purpose: 'It resists debris, overlap and rollover loads while maintaining a protected envelope around the helmet.', analogy: 'It is an extremely strong door frame and roll cage built tightly around the driver head.',
    observe: ['Check the central pillar relative to sight lines.', 'Trace loads from all three Halo mounts into the monocoque.', 'Compare helmet, headrest and roll-structure envelopes from the side.'],
    engineering: ['Safety structures must pass prescribed static and impact load cases.', 'Local mount reinforcement spreads concentrated loads into the composite shell.', 'Visibility, aerodynamics, mass and structural safety must all be satisfied.'],
    faults: ['Damaged mounts or incorrect fastener preload reduce capacity severely.', 'Visual inspection alone cannot clear a post-incident assembly; defined NDT and replacement criteria are required.'], connections: ['Survival cell', 'Headrest and seat', 'Driver helmet', 'Camera and sensors'],
  }),
  tires: p({
    name: '18英寸轮胎与轮组', short: '承接赛车与路面之间纵向、横向和垂向载荷的四个轮胎、轮辋与固定总成。', purpose: '轮胎通过滑移率与侧偏角产生抓地，并依靠温度、压力和胎体变形维持可用接地印迹。', analogy: '驱动、制动和转向能力都要通过四块不断变形、只有手掌大小量级的接地印迹作用于路面。',
    observe: ['比较前后轮宽度、胎壁挠曲和轮胎温度分布。', '在转弯模式观察外侧轮载增加与内侧轮卸载。', '在制动与加速之间比较滑移率方向和轮胎力预算。'],
    engineering: ['轮胎力对垂向载荷并非线性，载荷转移通常会降低一根车轴的总可用摩擦系数。', '胎压影响胎体刚度、接地形状、发热和高速尺寸增长。', '温度窗口、表面过热、胎体温度和磨损状态需要从多类传感数据联合判断。'],
    faults: ['冷胎、过热或压力偏差都会让峰值抓地和响应速度下降。', '锁死、打滑、外倾或束角错误会形成平斑和非均匀磨损。'], connections: ['碳碳制动器', '前后悬架', '转向系统', '胎压与温度传感器'],
  }, {
    name: '18-INCH TIRES & WHEEL ASSEMBLIES', short: 'Four tire, rim and retention assemblies carrying longitudinal, lateral and vertical loads between the car and road.', purpose: 'Tires create grip through slip ratio and slip angle while temperature, pressure and carcass deformation maintain the usable contact patch.', analogy: 'Propulsion, braking and steering act on the road through four deforming contact patches only about hand-sized in scale.',
    observe: ['Compare front and rear width, sidewall deflection and temperature distribution.', 'Watch outside load rise and inside load fall in cornering mode.', 'Compare slip direction and force budget across braking and acceleration.'],
    engineering: ['Tire force is load-sensitive; load transfer usually lowers the combined friction coefficient of an axle.', 'Pressure changes carcass stiffness, contact shape, heat generation and high-speed growth.', 'Surface temperature, bulk temperature, operating window and wear require multiple sensor channels.'],
    faults: ['Cold, overheated or incorrectly pressurized tires lose peak force and response.', 'Locking, wheelspin, camber or toe errors create flats and uneven wear.'], connections: ['Carbon brakes', 'Front and rear suspension', 'Steering', 'Pressure and temperature sensors'],
  }),
  brakes: p({
    name: '碳碳制动与线控制动', short: '四轮碳碳盘、卡钳、液压回路与后轴线控制动协同组成的减速系统。', purpose: '前轴主要通过液压摩擦制动减速，后轴把摩擦制动与 MGU-K 能量回收协调成驾驶员要求的总制动力。', analogy: '它像两支乐队共同演奏同一个踏板指令：一支把能量变成热，另一支把能量送回电池。',
    observe: ['比较制动初段、高速段和低速段的前后轴制动力分配。', '查看后轴回收功率变化时线控制动如何补偿摩擦制动力。', '追踪制动导管气流进入盘、卡钳并从轮内排出。'],
    engineering: ['单轮制动扭矩由夹紧力、摩擦系数和有效半径共同决定。', '碳碳材料需要进入工作温度窗口，同时避免热冲击、氧化和过热。', '制动迁移与回收变化必须连续，否则驾驶员会感到踏板或后轴减速度不一致。'],
    faults: ['温度过低、表面釉化或冷却不均会造成摩擦系数变化。', '后轴线控制动、液压或回收系统故障会改变制动平衡并触发安全降级。'], connections: ['MGU-K', '轮胎', '制动踏板', '冷却导管'],
  }, {
    name: 'CARBON BRAKES & BRAKE-BY-WIRE', short: 'Carbon-carbon discs and calipers, hydraulic circuits and rear brake-by-wire form the deceleration system.', purpose: 'The front axle is mainly friction-braked while the rear blends friction braking with MGU-K energy recovery to meet the driver request.', analogy: 'Two orchestras play one pedal command: one turns energy into heat and the other returns it to the battery.',
    observe: ['Compare axle brake split during initial, high-speed and low-speed phases.', 'Watch brake-by-wire fill friction torque as regenerative power changes.', 'Trace duct flow through disc and caliper and out of the wheel.'],
    engineering: ['Wheel brake torque follows clamp force, friction coefficient and effective radius.', 'Carbon-carbon must enter its operating window without thermal shock, oxidation or overheating.', 'Brake migration and changing regeneration must remain continuous for consistent pedal and rear-axle response.'],
    faults: ['Low temperature, glazing or uneven cooling changes friction coefficient.', 'Rear BBW, hydraulic or regeneration faults alter balance and demand a safe degraded mode.'], connections: ['MGU-K', 'Tires', 'Brake pedal', 'Cooling ducts'],
  }),
  'front-suspension': p({
    name: '前悬架与车身姿态控制', short: '由上下控制臂、推/拉杆、摇臂、弹簧、阻尼器与防倾结构组成的前轮导向系统。', purpose: '它控制轮胎外倾、前束和垂向运动，同时管理制动俯仰、侧倾与底板前端离地高度。', analogy: '它不是简单的弹簧，而是一套精确规定轮心三维路径的机械计算机。',
    observe: ['追踪轮心载荷经过控制臂和推/拉杆进入单体壳。', '比较轮跳、俯仰和侧倾时摇臂与第三弹性元件的运动。', '测量转向过程中外倾、前束和主销几何的变化。'],
    engineering: ['硬点决定瞬时中心、侧倾中心、外倾增益、抗俯仰与转向几何。', '轮速阻尼与车身姿态阻尼的目标不同，需要通过摇臂和互联系统分配。', '气动平台需求很高，但过度刚硬会让轮胎无法跟随路面并增加载荷波动。'],
    faults: ['球铰间隙、杆件屈曲或摇臂轴承损伤会造成定位漂移。', '阻尼器气蚀或温漂会让重复圈的姿态控制不一致。'], connections: ['前轮胎', '转向齿条', '单体壳', '主动前翼'],
  }, {
    name: 'FRONT SUSPENSION & PLATFORM CONTROL', short: 'Wishbones, push/pull rods, rockers, springs, dampers and anti-roll elements guide the front wheels.', purpose: 'It controls camber, toe and wheel travel while managing brake pitch, roll and front-floor clearance.', analogy: 'It is not merely a spring; it is a mechanical computer prescribing the wheel center path.',
    observe: ['Trace wheel loads through links and push/pull rod into the monocoque.', 'Compare rocker and heave-element motion in wheel bump, pitch and roll.', 'Measure camber, toe and steering-axis changes through steer.'],
    engineering: ['Hard points define instant centers, roll center, camber gain, anti-dive and steering geometry.', 'Wheel and platform damping have different targets and are distributed through rocker/interconnection design.', 'Aero wants stiffness, but excessive stiffness stops the tire following the road and increases load variation.'],
    faults: ['Joint play, link buckling or rocker-bearing damage changes alignment.', 'Damper cavitation or thermal drift makes platform response inconsistent lap to lap.'], connections: ['Front tires', 'Steering rack', 'Monocoque', 'Active front wing'],
  }),
  'rear-suspension': p({
    name: '后悬架与牵引平台', short: '围绕变速箱布置的多连杆、推/拉杆、摇臂和弹性阻尼系统。', purpose: '它在驱动、制动与侧向载荷下维持后轮姿态，并控制车尾高度以稳定扩散器与牵引。', analogy: '像同时服务轮胎和底板的双重平台控制器。',
    observe: ['追踪驱动扭矩、轮胎力和气动载荷进入变速箱壳体的路径。', '比较加速蹲伏、制动抬升和转弯侧倾中的后轮运动。', '检查传动轴在全行程和转向顺从下的角度余量。'],
    engineering: ['后悬架几何决定抗蹲、后轮外倾增益、束角变化和侧倾中心。', '差速器锁止与悬架载荷转移共同决定弯中和出弯牵引。', '车尾平台必须在轮胎机械抓地与扩散器高度敏感性之间折中。'],
    faults: ['后束角顺从异常会造成高速不稳定与轮胎温度差。', '杆端、阻尼器或壳体安装点损伤会同时影响牵引和气动平台。'], connections: ['后轮胎', '变速箱与差速器', '扩散器', '动力单元'],
  }, {
    name: 'REAR SUSPENSION & TRACTION PLATFORM', short: 'Links, push/pull rods, rockers and spring-damper elements are packaged around the gearbox.', purpose: 'It maintains rear-wheel attitude under drive, braking and lateral load while controlling diffuser ride height and traction.', analogy: 'It is a dual platform controller serving both tire and underfloor.',
    observe: ['Trace drive, tire and aero loads into the gearbox casing.', 'Compare squat, brake lift and roll wheel motions.', 'Check driveshaft angle margin through travel and compliance.'],
    engineering: ['Geometry sets anti-squat, camber gain, toe change and roll center.', 'Differential locking and suspension load transfer jointly define mid-corner and exit traction.', 'Rear platform control trades mechanical grip against diffuser height sensitivity.'],
    faults: ['Abnormal rear-toe compliance causes instability and tire-temperature splits.', 'Damage to links, damper or casing mounts affects traction and aero platform together.'], connections: ['Rear tires', 'Gearbox and differential', 'Diffuser', 'Power unit'],
  }),
  steering: p({
    name: '驾驶控制与转向系统', short: '可拆方向盘、转向柱、齿条、拉杆、踏板与换挡拨片共同构成驾驶员的控制接口。', purpose: '它把驾驶员的转向、制动、油门、换挡和能量管理意图转化为机械位移与电子指令。', analogy: '像驾驶员与赛车之间的高带宽人机接口。',
    observe: ['跟随方向盘转角经过转向柱、齿条和横拉杆到前轮。', '查看方向盘显示、旋钮、拨片与车载控制器的信号关系。', '比较制动踏板机械液压路径与后轴线控路径。'],
    engineering: ['转向比、机械曳距、顺从和助力决定操纵灵敏度与反馈。', 'Ackermann、前束变化和轮胎侧偏刚度共同决定内外轮目标角。', '驾驶控制必须满足单点故障监测、信号合理性和安全降级策略。'],
    faults: ['齿条或拉杆间隙会形成中间虚位和非对称响应。', '双通道踏板信号不一致必须被识别并限制动力请求。'], connections: ['前悬架', '制动系统', '标准控制单元', '混动动力单元'],
  }, {
    name: 'DRIVER CONTROLS & STEERING', short: 'The detachable wheel, column, rack, tie rods, pedals and shift paddles form the driver control interface.', purpose: 'It converts steering, braking, throttle, shift and energy-management intent into mechanical movement and electronic commands.', analogy: 'It is the high-bandwidth human-machine interface between driver and car.',
    observe: ['Follow steering angle through column, rack and tie rods to the front wheels.', 'Relate display, rotaries and paddles to control-unit signals.', 'Compare the mechanical-hydraulic brake path with rear brake-by-wire.'],
    engineering: ['Ratio, mechanical trail, compliance and assistance set sensitivity and feedback.', 'Ackermann, toe change and tire cornering stiffness define target inner/outer wheel angles.', 'Driver controls need plausibility monitoring, single-fault detection and safe degradation.'],
    faults: ['Rack or tie-rod play creates dead band and asymmetric response.', 'Disagreement between dual pedal channels must be detected and torque limited.'], connections: ['Front suspension', 'Brake system', 'Standard control unit', 'Hybrid power unit'],
  }),
  battery: p({
    name: '高压能量存储系统', short: '由高功率电芯、母排、接触器、熔断保护、绝缘监测和热管理组成的高压电池。', purpose: '它在回收阶段接收 MGU-K 电能，在加速阶段释放电能，并始终限制电压、电流、温度和荷电状态。', analogy: '像一个能在几秒内大进大出的高压能量水库，而不是普通长续航电池。',
    observe: ['追踪制动回收时能量从后轴进入电池的方向。', '比较高功率放电、充电和安全断开时接触器状态。', '查看电池温度、SOC、单体压差与可用功率的关系。'],
    engineering: ['端电压等于开路电压减去内阻压降，电流越高损耗与发热越大。', '可用功率由电芯电压、SOC、温度、绝缘状态和赛事能量规则共同限制。', '壳体必须同时解决碰撞保护、热失控隔离、泄压与电气绝缘。'],
    faults: ['单体压差扩大或温度不均会提前触发功率降额。', '绝缘下降、接触器焊死或热失控征兆必须立即进入安全状态。'], connections: ['MGU-K逆变器', '热管理', '能量管理控制', '高压安全回路'],
  }, {
    name: 'HIGH-VOLTAGE ENERGY STORE', short: 'A high-power battery containing cells, busbars, contactors, fusing, insulation monitoring and thermal management.', purpose: 'It accepts MGU-K energy under regeneration and releases it under acceleration while enforcing voltage, current, temperature and state-of-charge limits.', analogy: 'It is a high-voltage reservoir designed for rapid in-and-out flow, not a long-range road-car battery.',
    observe: ['Trace energy from rear axle to battery during braking.', 'Compare contactor states under charge, discharge and safe isolation.', 'Relate battery temperature, SOC and cell spread to available power.'],
    engineering: ['Terminal voltage is open-circuit voltage minus internal-resistance drop; high current increases loss and heat.', 'Available power is limited by cell voltage, SOC, temperature, insulation and sporting energy constraints.', 'The enclosure must provide crash protection, runaway containment, venting and insulation.'],
    faults: ['Cell-voltage spread or thermal gradients trigger early derating.', 'Insulation loss, welded contactors or runaway indicators require an immediate safe state.'], connections: ['MGU-K inverter', 'Thermal management', 'Energy control', 'HV safety loop'],
  }),
  inverter: p({
    name: 'MGU-K功率电子', short: '在高压直流电池与三相 MGU-K 之间高速切换能量的逆变器和直流母线系统。', purpose: '它根据扭矩指令调制相电流，在驱动时把直流变成交流，在回收时把交流整流回直流。', analogy: '像每秒成千上万次换挡的双向电子变速器。',
    observe: ['观察加速和回收时直流电流方向如何反转。', '比较相电流、转子位置、电压调制率与实际扭矩。', '查看功率模块、直流电容和冷却板的热路径。'],
    engineering: ['电磁扭矩由磁链与 q 轴电流决定，电流与母线电压限制工作包络。', '开关损耗和导通损耗随电流、开关频率、温度与调制策略变化。', '控制器必须处理过流、过压、欠压、绝缘与转子位置异常。'],
    faults: ['冷却退化会使结温上升并快速降额。', '位置角错误或功率器件故障可能产生错误扭矩，因此需要硬件级快速关断。'], connections: ['能量存储', 'MGU-K', '冷却回路', '标准控制单元'],
  }, {
    name: 'MGU-K POWER ELECTRONICS', short: 'The inverter and DC-link system switch energy between the HV battery and three-phase MGU-K.', purpose: 'It controls phase current for torque, converting DC to AC in drive and rectifying AC back to DC in regeneration.', analogy: 'It is a bidirectional electronic gearbox switching thousands of times per second.',
    observe: ['Watch DC current reverse between drive and regeneration.', 'Relate phase current, rotor position and modulation to actual torque.', 'Inspect thermal paths through power modules, DC capacitors and cooling plate.'],
    engineering: ['Electromagnetic torque follows flux and q-axis current; current and bus voltage bound the operating envelope.', 'Switching and conduction losses vary with current, frequency, temperature and modulation.', 'Controls must handle overcurrent, over/undervoltage, insulation and position faults.'],
    faults: ['Cooling degradation raises junction temperature and forces rapid derating.', 'Position error or switch failure can create unintended torque, demanding hardware-fast shutdown.'], connections: ['Energy store', 'MGU-K', 'Cooling circuit', 'Standard control unit'],
  }),
  motor: p({
    name: 'V6涡轮混动动力单元', short: '1.6升涡轮增压 V6 内燃机与高功率 MGU-K 共同构成的混合动力系统，2026 架构不再使用 MGU-H。', purpose: '内燃机把燃料化学能转为曲轴功，MGU-K 在驱动与回收间双向工作，两者通过控制策略共同满足车轮功率需求。', analogy: '像两名特长不同的运动员共享一根传动轴：发动机擅长持续输出，电机擅长瞬时补能和回收。',
    observe: ['从进气压缩、燃烧、排气涡轮到曲轴追踪能量流。', '比较低转速电助力、高速功率限制与制动回收时 MGU-K 的工作象限。', '查看燃油流、点火、增压、曲轴扭矩和电功率如何共同决定轮端输出。'],
    engineering: ['发动机有效功率等于扭矩乘角速度，效率受燃烧、泵气、摩擦与涡轮匹配影响。', '混动控制在燃油能量、电池能量、SOC目标、热限制和圈速之间优化。', '没有 MGU-H 后，涡轮瞬态、压气机工作线和 MGU-K 补偿成为更重要的系统协同问题。'],
    faults: ['爆震、排温过高或润滑压力异常会触发点火、增压和功率限制。', '电机或发动机扭矩模型偏差会使换挡、牵引与制动回收不连续。'], connections: ['燃料系统', 'MGU-K功率电子', '变速箱', '多回路冷却'],
  }, {
    name: 'V6 TURBO HYBRID POWER UNIT', short: 'A 1.6-litre turbocharged V6 and high-power MGU-K form the hybrid system; the 2026 architecture no longer uses an MGU-H.', purpose: 'The ICE converts fuel energy to crank power while the MGU-K drives and regenerates, coordinated to meet wheel-power demand.', analogy: 'Two athletes share one driveline: the engine sustains output while the electric machine supplies and recovers rapidly.',
    observe: ['Trace energy through compressor, combustion, turbine and crankshaft.', 'Compare low-speed electric boost, high-speed power limitation and regenerative quadrants.', 'Relate fuel flow, ignition, boost, crank torque and electrical power to wheel output.'],
    engineering: ['Engine power equals torque times angular speed; efficiency includes combustion, pumping, friction and turbo matching.', 'Hybrid control optimizes lap time across fuel energy, battery energy, SOC targets and thermal limits.', 'Without MGU-H, turbo transient response, compressor operating line and MGU-K compensation become more important.'],
    faults: ['Knock, high exhaust temperature or poor oil pressure triggers ignition, boost and power limits.', 'Torque-model disagreement between engine and motor disrupts shifts, traction and regeneration.'], connections: ['Fuel system', 'MGU-K electronics', 'Gearbox', 'Multi-loop cooling'],
  }),
  differential: p({
    name: '变速箱、差速器与半轴', short: '顺序式多挡变速箱、主减速、可控差速器与左右半轴把动力单元扭矩传到后轮。', purpose: '齿比让动力单元维持在有效转速区间，差速器允许左右轮速不同并调节可用扭矩分配。', analogy: '它既是扭矩放大器，也是决定两只后轮如何合作的交通指挥中心。',
    observe: ['追踪曲轴与 MGU-K 合成扭矩经过挡位、主减速和差速器到半轴。', '比较直线、弯中与出弯时左右轮速和锁止需求。', '观察换挡期间扭矩切断、接合和车轮冲击。'],
    engineering: ['轮端扭矩等于输入扭矩乘总传动比与效率，车速决定目标发动机转速。', '差速锁止提高一侧低抓地时的牵引，但过强会抑制转向并增加轮胎滑动。', '齿轮强度、传动效率、壳体刚度、润滑与换挡时间共同决定可靠性。'],
    faults: ['齿面点蚀、润滑污染或轴承间隙会造成温度、振动与效率异常。', '差速控制或半轴故障会立即改变后轴横摆力矩与牵引。'], connections: ['动力单元', '后轮胎', '后悬架', '润滑与液压系统'],
  }, {
    name: 'GEARBOX, DIFFERENTIAL & HALFSHAFTS', short: 'A sequential multi-ratio gearbox, final drive, controlled differential and halfshafts transmit power-unit torque to the rear tires.', purpose: 'Ratios keep the power unit in an effective speed range while the differential permits wheel-speed difference and manages torque transfer.', analogy: 'It is both a torque multiplier and the traffic controller deciding how the rear tires cooperate.',
    observe: ['Trace combined ICE/MGU-K torque through ratio, final drive, differential and halfshafts.', 'Compare wheel speeds and locking demand on straights, mid-corner and exit.', 'Watch torque interruption, engagement and wheel shock during shifts.'],
    engineering: ['Wheel torque equals input torque times overall ratio and efficiency; vehicle speed sets target engine speed.', 'Locking improves traction with unequal grip but excess lock resists rotation and increases tire slip.', 'Gear strength, efficiency, casing stiffness, lubrication and shift time determine reliability.'],
    faults: ['Pitting, contaminated oil or bearing clearance creates heat, vibration and efficiency loss.', 'Differential-control or halfshaft failure changes rear yaw moment and traction immediately.'], connections: ['Power unit', 'Rear tires', 'Rear suspension', 'Lubrication and hydraulics'],
  }),
  cooling: p({
    name: '多回路热管理与流体系统', short: '侧箱换热器、泵、管路和导流系统分别服务发动机、增压空气、润滑油、电池与功率电子。', purpose: '它把各系统产生的热量送到换热器并排入环境，同时用尽可能小的进气口和阻力维持温度窗口。', analogy: '像多套温度不同、彼此协调的人体循环系统。',
    observe: ['区分高温冷却液、低温电气回路、机油与增压空气路径。', '比较直道、跟车和低速弯中侧箱入口的可用压差。', '查看百叶窗、出口和车身开口变化如何影响阻力与后部气流。'],
    engineering: ['热平衡满足产热率减去散热率等于系统储热变化率。', '泵功率随压降与体积流量增长，散热器性能受空气质量流量和温差限制。', '扩大开口提高散热裕量却增加阻力并扰乱尾部气动，因此按赛道与环境配置。'],
    faults: ['气泡、泄漏、泵气蚀或换热器堵塞会让局部温度快速上升。', '温度传感器偏差可能造成不必要降额或危险的过热漏判。'], connections: ['V6动力单元', '能量存储', '功率电子', '侧箱气动'],
  }, {
    name: 'MULTI-LOOP THERMAL & FLUID SYSTEMS', short: 'Sidepod exchangers, pumps, plumbing and ducts serve engine, charge air, oil, battery and power electronics.', purpose: 'They move heat to exchangers and reject it to ambient while maintaining temperature windows with the smallest practical inlet and drag.', analogy: 'Several body circulatory systems operate together at different temperatures.',
    observe: ['Separate high-temperature coolant, low-temperature electrical, oil and charge-air paths.', 'Compare available inlet pressure on straights, in traffic and through slow corners.', 'Relate louvres and body exits to drag and rear-body flow.'],
    engineering: ['Heat generation minus rejection equals stored thermal energy rate.', 'Pump power rises with pressure drop and volume flow; exchanger performance is limited by air mass flow and temperature difference.', 'Larger openings add margin but also drag and aero disturbance, so configurations are event-specific.'],
    faults: ['Air, leakage, cavitation or blockage drives local temperatures upward.', 'Sensor bias causes unnecessary derating or dangerous missed overheating.'], connections: ['V6 power unit', 'Energy store', 'Power electronics', 'Sidepod aerodynamics'],
  }),
  ecu: p({
    name: '标准控制单元与能量管理', short: '接收驾驶员、动力单元、底盘和安全信号，并执行扭矩、换挡、制动回收与故障策略的实时控制网络。', purpose: '它把多个子系统约束汇总为可验证的指令，使赛车在规则和硬件边界内实现最快圈速。', analogy: '像同时担任指挥、裁判和安全员的赛车神经中枢。',
    observe: ['跟踪踏板请求如何经过扭矩仲裁形成发动机与 MGU-K 指令。', '查看制动、换挡、SOC和热降额发生时各限制器的优先级。', '比较传感器原始值、估算状态、控制目标和执行器反馈。'],
    engineering: ['控制周期、信号延迟与滤波必须小于被控动态的关键时间尺度。', '扭矩安全采用多通道合理性、限幅、监控器和确定性降级。', '能量策略是带规则约束的最优控制问题，目标不是每一时刻功率最大，而是整圈最优。'],
    faults: ['总线丢包、时钟不同步或模型漂移会使控制器错误判断系统状态。', '软件与标定变更必须可追溯，并通过单元、台架、在环和赛道验证。'], connections: ['驾驶控制', '动力单元', '线控制动', '传感与遥测'],
  }, {
    name: 'STANDARD CONTROL UNIT & ENERGY MANAGEMENT', short: 'A real-time network receives driver, power-unit, chassis and safety signals and executes torque, shift, regeneration and fault strategies.', purpose: 'It combines subsystem constraints into verifiable commands that maximize lap performance within rules and hardware limits.', analogy: 'It is the car nervous center acting as conductor, referee and safety officer.',
    observe: ['Trace pedal demand through torque arbitration to ICE and MGU-K commands.', 'Inspect limiter priority during braking, shifting, SOC and thermal derating.', 'Compare raw sensors, estimated states, targets and actuator feedback.'],
    engineering: ['Control periods, delay and filtering must be short relative to the controlled dynamics.', 'Torque safety uses channel plausibility, limits, monitors and deterministic degradation.', 'Energy strategy is constrained optimal control: maximum instantaneous power is not maximum lap performance.'],
    faults: ['Packet loss, clock mismatch or model drift creates incorrect state estimates.', 'Software and calibration changes require traceability plus unit, bench, HIL and track validation.'], connections: ['Driver controls', 'Power unit', 'Brake-by-wire', 'Sensors and telemetry'],
  }),
  sensors: p({
    name: '传感、遥测与安全电子', short: '轮速、惯性、压力、温度、位移、应变、电气与驾驶员安全传感器构成赛车的测量网络。', purpose: '它们支持实时控制、规则监督、故障诊断、性能分析和事故记录，把赛车行为转化为可验证证据。', analogy: '像赛车的眼睛、耳朵、神经末梢和黑匣子。',
    observe: ['把每个测量点映射到一个明确的工程问题和物理量。', '比较不同采样率、时间戳和滤波对快速瞬态的影响。', '在同一事件中对齐驾驶员输入、车辆响应、轮胎载荷和动力能量流。'],
    engineering: ['测量不确定度包含精度、偏置、安装方向、温漂、采样、同步与信号处理。', '抗混叠滤波和采样率必须与目标频率内容匹配。', '关键安全信号需要冗余、合理性判断、故障注入和端到端延迟验证。'],
    faults: ['零点漂移、接地回路、丢包和时间偏移会制造看似合理但错误的结论。', '传感器更换后若不校准与记录版本，会破坏跨圈和跨赛事比较。'], connections: ['标准控制单元', '悬架', '制动', '动力单元'],
  }, {
    name: 'SENSORS, TELEMETRY & SAFETY ELECTRONICS', short: 'Wheel speed, inertial, pressure, temperature, displacement, strain, electrical and driver-safety sensors form the measurement network.', purpose: 'They support control, regulatory supervision, diagnosis, performance analysis and accident recording by turning behavior into evidence.', analogy: 'They are the car eyes, ears, nerve endings and black box.',
    observe: ['Map every channel to one physical quantity and engineering question.', 'Compare the effect of sample rate, timestamp and filtering on transients.', 'Align driver input, vehicle response, tire load and energy flow in one event.'],
    engineering: ['Measurement uncertainty includes accuracy, bias, orientation, thermal drift, sampling, synchronization and processing.', 'Anti-alias filtering and sample rate must match target frequency content.', 'Safety-critical channels require redundancy, plausibility, fault injection and end-to-end latency tests.'],
    faults: ['Offset drift, ground loops, dropout and timing error create plausible but false conclusions.', 'Uncalibrated or untracked sensor replacement destroys lap and event comparisons.'], connections: ['Standard control unit', 'Suspension', 'Brakes', 'Power unit'],
  }),
}

export function getGrandPrixPart(base: PartInfo, locale: Locale): PartInfo {
  const content = GRAND_PRIX_PARTS[base.id][locale]
  return { ...base, ...content, nameEn: GRAND_PRIX_PARTS[base.id].en.name }
}
