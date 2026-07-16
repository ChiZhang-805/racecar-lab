import { ENGINEERING_LESSONS, type EngineeringLesson, type FormulaCard, type LocalText } from './engineeringData'
import type { PartId } from './data'

const l = (zh: string, en: string): LocalText => ({ zh, en })
const f = (zh: string, en: string, expression: string, latex: string, variablesZh: string, variablesEn: string, insightZh: string, insightEn: string): FormulaCard => ({
  name: l(zh, en), expression, latex, variables: l(variablesZh, variablesEn), insight: l(insightZh, insightEn),
})
const six = (...items: [string, string][]) => items.map(([zh, en]) => l(zh, en)) as EngineeringLesson['subcomponents']
const three = (...items: [string, string][]) => items.map(([zh, en]) => l(zh, en)) as EngineeringLesson['concepts']

type Override = Pick<EngineeringLesson, 'overview' | 'subcomponents' | 'concepts' | 'formulas' | 'references'>
const FIA = { title: 'FIA 2026 Formula 1 Technical Regulations — Issue 19', url: 'https://www.fia.com/system/files/documents/fia_2026_f1_regulations_-_section_c_technical_-_iss_19_-_2026-06-25.pdf' }
const FIA_OVERVIEW = { title: 'FIA — 2026 Formula 1 technical overview', url: 'https://www.fia.com/news/f1s-new-era-everything-you-need-know-about-how-fia-making-formula-1-more-competitive-more' }
const FIA_REFINEMENTS = { title: 'FIA — 2026 Formula 1 regulation refinements, 20 April 2026', url: 'https://www.fia.com/news/refinements-2026-fia-formula-1-regulations-agreed-all-stakeholders' }
const NASA = { title: 'NASA Glenn — Aerodynamic Force Equations', url: 'https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/lift-equation/' }
const BOSCH = { title: 'Bosch Motorsport — Motorsport Systems', url: 'https://www.bosch-motorsport.com/' }

const O: Record<PartId, Override> = {
  'front-wing': {
    overview: l('主动前翼既产生前轴载荷，也通过活动襟翼在高载与低阻状态之间切换。工程师必须同时管理绝对载荷、阻力、前后气动平衡、执行器铰链力矩和状态转换安全。', 'The active front wing creates front load and switches movable flaps between high-load and low-drag states. Engineering must manage load, drag, aero balance, actuator hinge moment and safe state transitions together.'),
    subcomponents: six(['主翼与固定翼段','Mainplane and fixed section'],['左右活动襟翼','Left/right active flaps'],['端板与翼尖结构','Endplates and tips'],['作动器与传动连杆','Actuator and linkage'],['鼻锥安装与载荷接头','Nose mounts and load joints'],['位置与压力传感器','Position and pressure sensors']),
    concepts: three(['主动翼不是简单的开关；转换期间的前后载荷轨迹决定车辆稳定性。','An active wing is not a simple switch; the front/rear load trajectory during transition determines stability.'],['装车系数包含车轮、鼻锥、底板入口和离地高度耦合，不能直接采用孤立翼型数据。','Installed coefficients include wheel, nose, floor-entry and ride-height coupling and cannot be taken from an isolated profile.'],['执行器必须克服气动铰链力矩并在单点故障后回到规定安全状态。','The actuator must overcome aerodynamic hinge moment and reach a defined safe state after a single fault.']),
    formulas: [
      f('前翼下压力','Front-wing downforce','Fzf = ½ρV²Sf·CLf',String.raw`F_{z,f}=\frac{1}{2}\rho V^2 S_f C_{L,f}`,'ρ 空气密度；V 车速；Sf 前翼参考面积；CLf 装车下压力系数','ρ density; V speed; Sf front-wing reference area; CLf installed downforce coefficient','系数只在给定车高、偏航和活动翼状态附近有效。','The coefficient is valid only near the mapped ride height, yaw and active state.'),
      f('前翼阻力','Front-wing drag','Df = ½ρV²Sf·CDf',String.raw`D_f=\frac{1}{2}\rho V^2 S_f C_{D,f}`,'CDf 为包含干扰效应的装车阻力系数','CDf is the installed drag coefficient including interference','低阻状态的价值必须通过整车直线能耗和圈速评估。','Low-drag value must be assessed through whole-car energy and lap time.'),
      f('襟翼铰链力矩','Flap hinge moment','Mh = ½ρV²Sf·cf·Ch',String.raw`M_h=\frac{1}{2}\rho V^2 S_f c_f C_h`,'cf 襟翼参考弦长；Ch 铰链力矩系数','cf flap reference chord; Ch hinge-moment coefficient','作动器选型需叠加摩擦、惯性、挠度和故障安全裕量。','Actuator sizing adds friction, inertia, deflection and fail-safe margin.'),
    ], references: [FIA, FIA_OVERVIEW, NASA],
  },
  'rear-wing': {
    overview: l('主动尾翼在弯道建立后轴载荷，在指定直线工况降低阻力，并必须与前翼同步改变状态。其支柱、变速箱壳体和作动系统共同承受高速气动载荷。', 'The active rear wing builds rear load in corners and reduces drag in defined straight-line conditions while coordinating with the front wing. Supports, gearbox casing and actuator share high-speed aero loads.'),
    subcomponents: six(['主翼','Mainplane'],['活动上襟翼','Movable upper flap'],['端板与翼尖','Endplates and tips'],['双支柱与壳体接头','Twin supports and casing joints'],['作动器、锁止与回位机构','Actuator, latch and return'],['位置、载荷与振动监测','Position, load and vibration sensing']),
    concepts: three(['后翼与扩散器出口相互影响，单独优化可能降低整车效率。','Rear wing and diffuser exit are coupled; isolated optimization can reduce whole-car efficiency.'],['低阻状态减少阻力但也减少后轴载荷，前翼必须保持合适的平衡迁移。','Low drag removes rear load as well as drag, requiring a coordinated balance migration.'],['支柱挠度会改变有效攻角，因此气动图谱需要结构耦合修正。','Support deflection changes effective incidence, requiring aeroelastic correction.']),
    formulas: [
      f('后翼下压力','Rear-wing downforce','Fzr = ½ρV²Sr·CLr',String.raw`F_{z,r}=\frac{1}{2}\rho V^2 S_r C_{L,r}`,'Sr 后翼参考面积；CLr 装车下压力系数','Sr rear-wing area; CLr installed downforce coefficient','尾流、横摆和扩散器出口压力会改变 CLr。','Wake, yaw and diffuser pressure alter CLr.'),
      f('低阻收益','Low-drag benefit','ΔD = ½ρV²S·(CD,high − CD,low)',String.raw`\Delta D=\frac{1}{2}\rho V^2S\left(C_{D,\mathrm{high}}-C_{D,\mathrm{low}}\right)`,'CD,high 与 CD,low 为高载和低阻状态整车阻力系数','CD,high and CD,low are whole-car drag coefficients in both states','阻力下降应与转换时间和失去的载荷一起评价。','Drag reduction is evaluated with transition time and removed load.'),
      f('气动平衡','Aerodynamic balance','βa = Fzf / (Fzf + Fzr)',String.raw`\beta_a=\frac{F_{z,f}}{F_{z,f}+F_{z,r}}`,'Fzf、Fzr 为前后轴气动载荷','Fzf and Fzr are axle aerodynamic loads','活动翼转换时 βa 的时间历程比单一稳态值更重要。','The time history of βa during transition matters more than one steady value.'),
    ], references: [FIA, FIA_OVERVIEW, NASA],
  },
  floor: {
    overview: l('文丘里底板通过入口、收缩段、喉部、边缘涡和扩散器建立主要地面效应载荷。基础流体公式用于理解趋势，真实设计必须用三维黏性流动和动态车高图谱验证。', 'The Venturi floor uses inlets, contractions, throats, edge vortices and diffuser to create ground-effect load. Basic fluid equations explain trends; real design requires 3D viscous flow and dynamic ride-height maps.'),
    subcomponents: six(['底板入口与前缘','Floor inlets and leading edge'],['左右文丘里通道','Left/right Venturi tunnels'],['喉部与最低间隙区','Throats and minimum-clearance zone'],['边缘涡与密封几何','Edge-vortex sealing geometry'],['扩散器与分流片','Diffuser and strakes'],['磨损板与离地监测','Plank and ride-height monitoring']),
    concepts: three(['喉部速度升高伴随静压降低，但能量损失使简单伯努利关系只能做一阶解释。','Throat velocity rises as static pressure falls, but losses make Bernoulli only first-order.'],['底板载荷对俯仰、侧倾、横摆、轮胎变形和路面高度高度敏感。','Floor load is sensitive to pitch, roll, yaw, tire deformation and road height.'],['触地、通道堵塞或扩散器分离可能导致载荷非线性下降。','Ground strike, choking or diffuser separation can cause nonlinear load loss.']),
    formulas: [
      f('通道质量流量','Tunnel mass flow','ṁ = ρA·V',String.raw`\dot m=\rho A V`,'A 局部通道面积；V 截面平均速度','A local passage area; V mean section speed','真实通道存在边界层和三维速度分布。','Real passages contain boundary layers and 3D velocity profiles.'),
      f('压力系数','Pressure coefficient','Cp = (p − p∞) / (½ρV∞²)',String.raw`C_p=\frac{p-p_\infty}{\tfrac12\rho V_\infty^2}`,'p 局部静压；p∞、V∞ 为参考自由流','p local static pressure; p∞ and V∞ reference free stream','底板下 Cp 越负通常吸力越大，但必须对面积积分。','More negative underfloor Cp generally means more suction, but force needs area integration.'),
      f('扩散器面积速度关系','Diffuser area-velocity relation','A1V1 ≈ A2V2',String.raw`A_1V_1\approx A_2V_2`,'在定常、近似不可压且无明显泄漏时使用','For steady approximately incompressible flow without large leakage','面积增加会降低平均速度，但过快扩张会产生分离。','Larger area lowers mean speed, but excessive expansion separates.'),
    ], references: [FIA, NASA],
  },
  nose: {
    overview: l('前部碰撞结构用受控压溃把动能转化为复合材料破坏功，并限制传入生存舱的峰值力与平均减速度。外部鼻锥还承担前翼定位和气流整形。', 'The frontal impact structure converts kinetic energy into controlled crush work while limiting peak force and average deceleration into the survival cell. The nose also locates the wing and shapes flow.'),
    subcomponents: six(['外部鼻锥整流壳','External nose fairing'],['前部碰撞结构','Frontal impact structure'],['防侵入界面与前舱壁','Anti-intrusion interface and front bulkhead'],['前翼安装接头','Front-wing mounting joints'],['压溃触发与分段结构','Crush triggers and segmentation'],['应变、加速度与检查区域','Strain, acceleration and inspection zones']),
    concepts: three(['吸能结构追求稳定平台力，而不是最大刚度。','An energy absorber seeks a stable force plateau rather than maximum stiffness.'],['平均力决定所需压溃行程，峰值力决定瞬时载荷风险。','Mean force sets crush stroke while peak force governs instantaneous risk.'],['复合材料冲击后的内部损伤可能在表面不可见。','Internal composite impact damage may be invisible at the surface.']),
    formulas: [
      f('碰撞动能','Impact kinetic energy','Ek = ½mV²',String.raw`E_k=\frac12mV^2`,'m 等效碰撞质量；V 碰撞速度','m equivalent impact mass; V impact speed','速度增加对吸能需求是平方影响。','Speed increases energy demand quadratically.'),
      f('平均压溃力','Mean crush force','Favg = Eabs / s',String.raw`F_{\mathrm{avg}}=\frac{E_{\mathrm{abs}}}{s}`,'Eabs 吸收能量；s 有效压溃行程','Eabs absorbed energy; s effective crush stroke','缩短行程会提高所需平均力。','Shorter stroke raises required mean force.'),
      f('平均减速度','Mean deceleration','ā = Favg / m',String.raw`\bar a=\frac{F_{\mathrm{avg}}}{m}`,'这里忽略其他外力，仅用于一阶吸能估算','First-order estimate neglecting other external forces','合规评估仍需完整力时程和结构试验。','Compliance still needs full force history and structural testing.'),
    ], references: [FIA, ...ENGINEERING_LESSONS.nose.references],
  },
  monocoque: {
    overview: l('生存舱是整车主要承载闭合壳体，座椅、头枕和安全带系统把驾驶员固定在受保护空间内。刚度、碰撞、人体工程和撤离要求必须作为一个系统验证。', 'The survival cell is the primary closed load-bearing shell. Seat, headrest and harness locate the driver inside the protected volume; stiffness, crash, ergonomics and extraction are verified as one system.'),
    subcomponents: six(['碳纤维承载蒙皮','Carbon load-bearing skins'],['蜂窝夹芯与局部填充','Honeycomb core and local fills'],['前后舱壁与闭合截面','Bulkheads and closed sections'],['定制座椅与臀点','Custom seat and hip point'],['六点式安全带与锚点','Six-point harness and anchors'],['头枕、侧防护与检查区','Headrest, side protection and inspection zones']),
    concepts: three(['扭转刚度不足会把车架弹性混入悬架调校。','Insufficient torsional stiffness contaminates suspension tuning with chassis compliance.'],['夹芯板用极低质量增加截面惯性，但对脱粘和局部压溃敏感。','Sandwich panels add section inertia at low mass but are sensitive to debonding and crushing.'],['约束系统的带路角度、座椅支撑和头枕间隙共同决定碰撞人体载荷。','Harness angles, seat support and headrest clearance jointly determine occupant load.']),
    formulas: [
      f('扭转刚度','Torsional stiffness','Kt = T / θ',String.raw`K_t=\frac{T}{\theta}`,'T 施加扭矩；θ 两测量截面相对扭转角','T applied torque; θ relative twist between sections','测试夹具柔度必须从结果中扣除。','Rig compliance must be removed from the result.'),
      f('夹芯面板弯曲应力','Sandwich face stress','σf ≈ M / (b·tf·d)',String.raw`\sigma_f\approx\frac{M}{b t_f d}`,'b 宽度；tf 单侧蒙皮厚度；d 两蒙皮中心距','b width; tf face thickness; d face-centroid spacing','这是长宽比合理、蒙皮薄且粘结完整时的一阶估算。','First-order estimate for slender panels with thin, fully bonded faces.'),
      f('驾驶员惯性载荷','Driver inertial load','Fd = md·a',String.raw`F_d=m_d a`,'md 含头盔与装备的驾驶员等效质量；a 规定减速度','md driver plus equipment equivalent mass; a prescribed deceleration','安全带各带路载荷取决于姿态与几何，不能简单平均。','Individual belt loads depend on posture and geometry and cannot simply be averaged.'),
    ], references: [FIA, ...ENGINEERING_LESSONS.monocoque.references],
  },
  halo: {
    overview: l('头部保护环、防滚结构与座舱边缘共同维持头部保护包络。零件本体、安装点、单体壳局部强化和载荷方向必须一起评估。', 'Halo, roll structures and cockpit edges maintain the head-protection envelope. The member, mounts, local monocoque reinforcement and load directions must be evaluated together.'),
    subcomponents: six(['头部保护环中央支柱','Halo central pillar'],['头部保护环左右环臂','Halo left/right hoop arms'],['三点安装与局部强化','Three mounts and local reinforcement'],['主防滚结构','Primary roll structure'],['次防滚结构与保护线','Secondary roll structure and protection line'],['头盔、头枕与保护包络','Helmet, headrest and protected envelope']),
    concepts: three(['多方向载荷可能由弯曲、拉压、接头撬力或局部壳体变形控制。','Multidirectional loads may be governed by bending, axial force, joint prying or local shell deformation.'],['高强材料并不能补偿柔弱安装边界。','High-strength material cannot compensate for a weak mounting boundary.'],['结构变形后仍必须保持头盔与地面或侵入物之间的净空。','The deformed structure must still preserve helmet clearance.']),
    formulas: [
      f('轴向应力','Axial stress','σ = F / A',String.raw`\sigma=\frac{F}{A}`,'F 轴向载荷；A 有效截面积','F axial force; A effective area','偏心与弯曲需要另行叠加。','Eccentricity and bending must be added.'),
      f('欧拉屈曲','Euler buckling','Pcr = π²EI / (KL)²',String.raw`P_{\mathrm{cr}}=\frac{\pi^2EI}{(KL)^2}`,'E 弹性模量；I 截面惯性矩；K 有效长度系数','E modulus; I second moment; K effective-length factor','仅适用于理想细长弹性构件，真实接头与初弯曲会降低能力。','Valid for ideal slender elastic members; joints and imperfections reduce capacity.'),
      f('安全裕量','Margin of safety','MoS = allowable / applied − 1',String.raw`\mathrm{MoS}=\frac{\mathrm{allowable}}{\mathrm{applied}}-1`,'allowable 应含材料、制造、疲劳与规则折减','allowable includes material, manufacturing, fatigue and rule knock-downs','正裕量仍需变形和保护包络验证。','Positive margin still needs deformation and envelope checks.'),
    ], references: [FIA, FIA_OVERVIEW, ...ENGINEERING_LESSONS.halo.references],
  },
  tires: {
    overview: l('18英寸轮胎把所有车辆系统的能力转换为接地力。抓地取决于载荷、滑移、温度、压力、外倾、路面与磨耗，并具有显著的瞬态与迟滞。', 'The 18-inch tires convert every vehicle-system capability into contact-patch force. Grip depends on load, slip, temperature, pressure, camber, road and wear with strong transient and hysteretic behavior.'),
    subcomponents: six(['胎面胶料与工作层','Tread compound and working layer'],['带束层与胎体','Belt package and carcass'],['胎圈与轮辋锁止','Bead and rim retention'],['18英寸轮辋','18-inch rim'],['气腔、气门与压力控制','Cavity, valve and pressure control'],['胎温、胎压与红外测量','Temperature, pressure and infrared sensing']),
    concepts: three(['轮胎力随滑移先增加后饱和，峰值附近控制裕量很小。','Tire force rises then saturates with slip, leaving little control margin near the peak.'],['载荷敏感性意味着载荷转移会降低一根车轴的总能力。','Load sensitivity means load transfer reduces combined axle capability.'],['胎面表面温度、胎体温度与气腔压力具有不同时间常数。','Surface temperature, carcass temperature and cavity pressure have different time constants.']),
    formulas: [
      f('纵向滑移率','Longitudinal slip ratio','κ = (Rω − Vx) / max(|Rω|, |Vx|)',String.raw`\kappa=\frac{R\omega-V_x}{\max\!\left(\lvert R\omega\rvert,\lvert V_x\rvert\right)}`,'R 有效滚动半径；ω 轮速；Vx 轮心纵向速度','R effective rolling radius; ω wheel speed; Vx longitudinal hub speed','接近零速时必须切换到带速度阈值的定义，避免分母趋近于零。','Near zero speed, use a thresholded definition to avoid a vanishing denominator.'),
      f('轮胎侧偏角','Tire slip angle','α = atan2(Vy, Vx) − δ',String.raw`\alpha=\operatorname{atan2}(V_y,V_x)-\delta`,'Vx、Vy 为轮心速度分量；δ 为路轮转角','Vx/Vy are hub-velocity components; δ is road-wheel angle','坐标系、车轮局部轴和正负号必须与轮胎台图谱完全一致。','Frames, wheel-local axes and signs must match the tire-rig map exactly.'),
      f('组合滑移椭圆','Combined-slip ellipse','(Fx/Fx0)² + (Fy/Fy0)² ≤ 1',String.raw`\left(\frac{F_x}{F_{x0}}\right)^2+\left(\frac{F_y}{F_{y0}}\right)^2\leq1`,'Fx0、Fy0 为当前载荷、温度与路面下的纯向极限','Fx0/Fy0 are pure-direction limits at the current load, temperature and surface','椭圆只是一阶包络，真实组合滑移应使用经试验辨识的非对称轮胎图谱。','The ellipse is a first-order envelope; real combined slip needs an identified asymmetric tire map.'),
    ], references: [FIA, ...ENGINEERING_LESSONS.tires.references],
  },
  brakes: {
    overview: l('制动系统把前轴液压碳碳制动、后轴摩擦制动和 MGU-K 回收组合为驾驶员要求的减速度。制动迁移、温度窗口与线控制动连续性决定稳定性。', 'The brake system combines front hydraulic carbon braking, rear friction braking and MGU-K regeneration into requested deceleration. Migration, thermal window and brake-by-wire continuity determine stability.'),
    subcomponents: six(['碳碳制动盘','Carbon-carbon discs'],['多活塞卡钳与摩擦片','Multi-piston calipers and pads'],['主缸、液压回路与踏板','Master cylinders, hydraulics and pedal'],['后轴线控制动执行器','Rear brake-by-wire actuator'],['MGU-K回收制动接口','MGU-K regenerative interface'],['制动导管、温度与压力传感','Ducts, temperature and pressure sensing']),
    concepts: three(['总制动扭矩必须在回收变化时保持连续。','Total brake torque must stay continuous as regeneration changes.'],['碳碳摩擦系数高度依赖温度、表面状态与压力。','Carbon-carbon friction depends strongly on temperature, surface condition and pressure.'],['制动平衡随速度降低和气动载荷衰减而迁移。','Brake balance migrates as speed and aerodynamic load fall.']),
    formulas: [
      f('单轮摩擦制动扭矩','Wheel friction torque','Tb = μ·Fclamp·Re',String.raw`T_b=\mu F_{\mathrm{clamp}}R_e`,'μ 摩擦系数；Fclamp 夹紧力；Re 有效半径','μ friction coefficient; Fclamp clamp force; Re effective radius','实际卡钳活塞数与两侧摩擦面应在 Fclamp 定义中一致。','Piston count and both friction faces must match the Fclamp definition.'),
      f('制动能量','Braking energy','ΔEk = ½m(V1² − V2²)',String.raw`\Delta E_k=\frac12m\left(V_1^2-V_2^2\right)`,'m 车辆质量；V1、V2 制动前后速度','m vehicle mass; V1/V2 initial and final speed','部分能量进入电池，其余主要变成制动与轮胎热。','Some energy enters the battery; the rest mainly becomes brake and tire heat.'),
      f('后轴扭矩混合','Rear torque blending','Treq,r = Tfric,r + Tregen',String.raw`T_{\mathrm{req},r}=T_{\mathrm{fric},r}+T_{\mathrm{regen}}`,'所有扭矩按同一后轴与符号约定','All torques use the same rear-axle reference and sign','线控制动补偿回收限制，避免总扭矩台阶。','Brake-by-wire fills regeneration limits to avoid torque steps.'),
    ], references: [FIA, BOSCH],
  },
  'front-suspension': {
    overview: l('前悬架既控制轮胎姿态，又控制底板前端的气动平台。摇臂和第三弹性元件把轮跳、俯仰和侧倾运动分解成可调刚度与阻尼通道。', 'Front suspension controls tire attitude and the front aerodynamic platform. Rockers and heave elements separate wheel, pitch and roll motions into tunable stiffness and damping paths.'),
    subcomponents: six(['上控制臂','Upper wishbone'],['下控制臂','Lower wishbone'],['推/拉杆与轮端','Push/pull rod and upright'],['摇臂与扭杆','Rocker and torsion spring'],['第三弹性元件与阻尼器','Heave element and dampers'],['防倾、限位与位移传感','Roll, travel-limit and displacement sensing']),
    concepts: three(['硬点几何决定轮心轨迹和外倾、前束变化。','Hardpoint geometry determines wheel path, camber and toe change.'],['轮跳与车身姿态的频率和阻尼目标不同。','Wheel and platform modes need different frequency and damping targets.'],['过度追求平台刚度会增加轮胎载荷波动。','Excessive platform stiffness increases tire-load variation.']),
    formulas: [
      f('轮端刚度','Wheel rate','kw = ks·MR²',String.raw`k_w=k_s\,\mathrm{MR}^2`,'ks 弹性元件切线刚度；MR 为弹簧位移/轮心位移','ks tangent spring rate; MR is spring travel divided by wheel travel','运动比随行程变化时，应沿完整轮跳重新计算轮端刚度。','When motion ratio varies with travel, recalculate wheel rate over the full sweep.'),
      f('簧载模态频率','Sprung-mode frequency','fn = (1/2π)√(kw/ms)',String.raw`f_n=\frac{1}{2\pi}\sqrt{\frac{k_w}{m_s}}`,'ms 为单角等效簧载质量；这里暂不含轮胎与气动刚度','ms is equivalent corner sprung mass; tire and aero stiffness are omitted here','实际平台模态还与前后轴、第三弹性元件和气动载荷耦合。','The real platform mode also couples both axles, heave elements and aerodynamic load.'),
      f('局部阻尼比','Local damping ratio','ζ = c / (2√(kw·ms))',String.raw`\zeta=\frac{c}{2\sqrt{k_wm_s}}`,'c 为该工作点等效轮端阻尼','c is equivalent wheel damping at the operating point','真实阻尼器具有压缩/回弹、低速/高速和温度相关的非线性。','A real damper is nonlinear across bump/rebound, low/high speed and temperature.'),
    ], references: [FIA, ...ENGINEERING_LESSONS['front-suspension'].references],
  },
  'rear-suspension': {
    overview: l('后悬架围绕变速箱布置，联结后轮、差速器和扩散器平台。它同时管理牵引、后束角顺从、蹲伏与车尾高度。', 'Rear suspension packages around the gearbox and links rear tires, differential and diffuser platform. It manages traction, rear-toe compliance, squat and rear ride height.'),
    subcomponents: six(['上控制臂','Upper link set'],['下控制臂','Lower link set'],['推/拉杆与轮端','Push/pull rod and upright'],['摇臂、弹簧与阻尼器','Rocker, spring and damper'],['防倾与第三弹性元件','Roll and heave elements'],['半轴、束角与位移监测','Halfshaft, toe and displacement sensing']),
    concepts: three(['驱动扭矩、轮胎力与气动载荷共享变速箱壳体载荷路径。','Drive, tire and aero loads share the gearbox-casing load path.'],['后束角顺从会直接改变高速稳定和轮胎温度。','Rear-toe compliance directly changes stability and tire temperature.'],['差速锁止与横向载荷转移共同决定出弯牵引。','Differential locking and lateral load transfer jointly determine exit traction.']),
    formulas: [
      f('后轮端刚度','Rear wheel rate','kw,r = ks,r·MRr²',String.raw`k_{w,r}=k_{s,r}\,\mathrm{MR}_r^2`,'ks,r 后弹性元件切线刚度；MRr 后摇臂运动比','ks,r rear tangent spring rate; MRr rear rocker motion ratio','半轴、第三弹性元件和缓冲块会改变完整行程的等效刚度。','Halfshafts, heave element and bump stops change effective rate through travel.'),
      f('后轴弹性载荷转移','Rear elastic load transfer','ΔFz,r = (Kφr/KφΣ)·ms·ay·hr/tr',String.raw`\Delta F_{z,r}=\frac{K_{\phi r}}{K_{\phi\Sigma}}\frac{m_s a_y h_r}{t_r}`,'Kφr/KφΣ 为后轴弹性滚转刚度份额；hr 为重心到滚转轴力臂','Kφr/KφΣ is rear elastic roll-stiffness share; hr is CG-to-roll-axis arm','总载荷转移还含几何、簧下质量、轮胎和气动项。','Total transfer also includes geometric, unsprung, tire and aerodynamic terms.'),
      f('半轴机械功率','Halfshaft mechanical power','Pshaft = Tshaft·ωshaft',String.raw`P_{\mathrm{shaft}}=T_{\mathrm{shaft}}\omega_{\mathrm{shaft}}`,'Tshaft 为该半轴扭矩；ωshaft 为同截面角速度','Tshaft is torque and ωshaft angular speed at the same section','等速节角度、扭振和瞬态峰值决定损耗与寿命，不能只看平均功率。','Joint angle, torsional vibration and transients govern loss and life beyond mean power.'),
    ], references: [FIA, ...ENGINEERING_LESSONS['rear-suspension'].references],
  },
  steering: {
    overview: l('驾驶控制系统把方向盘、拨片、踏板和旋钮输入传给机械转向与车辆控制器。机械几何、信号合理性和驾驶员反馈必须作为一个闭环设计。', 'Driver controls send wheel, paddle, pedal and rotary inputs to mechanical steering and vehicle controllers. Geometry, signal plausibility and driver feedback form one closed-loop design.'),
    subcomponents: six(['可拆式方向盘与显示','Detachable wheel and display'],['换挡拨片与旋钮','Shift paddles and rotaries'],['转向柱与万向节','Column and universal joints'],['齿条、小齿轮与横拉杆','Rack, pinion and tie rods'],['油门、制动与离合控制','Throttle, brake and clutch controls'],['双通道位置与扭矩监测','Dual-channel position and torque sensing']),
    concepts: three(['驾驶员感受到的是轮胎、悬架、车架和转向机构共同形成的反馈。','Driver feedback combines tire, suspension, chassis and steering effects.'],['Ackermann 只是低速几何参考，真实目标取决于轮胎侧偏特性。','Ackermann is a low-speed geometric reference; real targets depend on tire slip behavior.'],['关键输入采用多通道合理性检查并定义安全降级。','Critical inputs use multi-channel plausibility and defined degradation.']),
    formulas: [
      f('理想阿克曼关系','Ideal Ackermann relation','cot(δo) − cot(δi) = t/L',String.raw`\cot\delta_o-\cot\delta_i=\frac{t}{L}`,'δi、δo 为内外轮转角；t 轮距；L 轴距','δi/δo inner/outer angles; t track; L wheelbase','它只是不含轮胎侧偏与顺从性的低速几何基准。','It is a low-speed geometric baseline without tire slip or compliance.'),
      f('区间平均转向比','Interval steering ratio','is = Δθsw / Δδrw',String.raw`i_s=\frac{\Delta\theta_{\mathrm{sw}}}{\Delta\delta_{\mathrm{rw}}}`,'θsw 方向盘角；δrw 左右路轮平均转角','θsw steering-wheel angle; δrw mean road-wheel angle','非线性齿条应报告随位置变化的瞬时比值，而不只给一个平均数。','A nonlinear rack needs its position-dependent instantaneous ratio, not only one average.'),
      f('小齿轮扭矩','Pinion torque','Tpinion = Frack·rp',String.raw`T_{\mathrm{pinion}}=F_{\mathrm{rack}}r_p`,'Frack 齿条轴向力；rp 小齿轮节圆半径；这里忽略损失','Frack rack axial force; rp pinion pitch radius; losses omitted','换算到驾驶员手轮还要加入柱系传动比、效率、摩擦和惯量。','Conversion to handwheel torque also needs column ratio, efficiency, friction and inertia.'),
    ], references: [FIA, BOSCH],
  },
  battery: {
    overview: l('能量存储系统在单圈内高速充放电，重点是功率能力、SOC窗口、内阻发热与高压安全，而不是公路车式长续航。', 'The energy store cycles rapidly within a lap; priorities are power capability, SOC window, resistive heating and HV safety rather than road-car range.'),
    subcomponents: six(['高功率电芯与模组','High-power cells and modules'],['母排、熔断与电流测量','Busbars, fusing and current sensing'],['接触器与预充回路','Contactors and precharge circuit'],['电池管理与单体监测','BMS and cell monitoring'],['冷却板、绝缘与泄压','Cooling plate, insulation and venting'],['碰撞壳体与高压互锁','Crash enclosure and HV interlock']),
    concepts: three(['端电压在大电流下受开路电压和内阻压降共同决定。','Terminal voltage under high current combines open-circuit voltage and internal drop.'],['可用充放电功率取决于最弱单体、温度、SOC和绝缘状态。','Available power is limited by the weakest cell, temperature, SOC and insulation.'],['接触器断开不代表所有直流母线立即无电，必须验证放电。','Open contactors do not guarantee an immediately de-energized DC link; discharge must be verified.']),
    formulas: [
      f('直流母线能量','DC-bus energy','Edc = ∫Vdc·Idc dt',String.raw`E_{\mathrm{dc}}=\int V_{\mathrm{dc}}I_{\mathrm{dc}}\,\mathrm{d}t`,'Vdc、Idc 必须在同一测点、同一符号约定与同步时间轴上','Vdc/Idc require one location, sign convention and synchronized time base','母线电能不等于电芯化学能变化，差值包含内阻与连接损耗。','Bus energy is not cell chemical-energy change; the difference includes internal and interconnect losses.'),
      f('库仑计量SOC','Coulomb-counted SOC','SOCk = SOC0 − (1/Qn)∫I dt',String.raw`\mathrm{SOC}_k=\mathrm{SOC}_0-\frac{1}{Q_n}\int I\,\mathrm{d}t`,'Qn 可用容量；此处规定放电电流为正','Qn usable charge capacity; discharge current is positive here','电流偏置会积分成漂移，需要模型与可追溯参考事件校正。','Current offset integrates into drift and needs model/reference-event correction.'),
      f('电芯组欧姆发热','Pack ohmic heat','Q̇ohm = I²·Rint',String.raw`\dot Q_{\mathrm{ohm}}=I^2R_{\mathrm{int}}`,'Rint 随SOC、温度、频率和老化变化','Rint varies with SOC, temperature, frequency and aging','总热量还包含极化、熵热、母排和接触器损耗。','Total heat also includes polarization, entropic, busbar and contactor losses.'),
    ], references: [FIA, ...ENGINEERING_LESSONS.battery.references],
  },
  inverter: {
    overview: l('MGU-K 逆变器在直流母线与三相电机之间双向变换能量，并以转子位置为基准控制电流和扭矩。电气、控制与热设计高度耦合。', 'The MGU-K inverter transfers energy bidirectionally between DC link and three-phase machine, controlling current and torque relative to rotor position. Electrical, control and thermal design are tightly coupled.'),
    subcomponents: six(['功率半导体桥臂','Power semiconductor bridge'],['直流母线与电容','DC link and capacitors'],['栅极驱动与快速保护','Gate drive and fast protection'],['电流、电压与转子位置采样','Current, voltage and rotor-position sensing'],['控制板与调制算法','Control board and modulation'],['冷却板、绝缘与屏蔽','Cooling plate, insulation and shielding']),
    concepts: three(['电流限制主导低速扭矩，母线电压主导高速能力。','Current limits low-speed torque while bus voltage limits high-speed capability.'],['开关损耗、导通损耗与冷却共同决定结温。','Switching, conduction and cooling jointly determine junction temperature.'],['错误转子角可能产生错误扭矩，需要硬件级快速保护。','Incorrect rotor angle can create unintended torque and needs hardware-fast protection.']),
    formulas: [
      f('驱动变换效率','Drive conversion efficiency','ηinv = Pac / Pdc',String.raw`\eta_{\mathrm{inv}}=\frac{P_{\mathrm{ac}}}{P_{\mathrm{dc}}}`,'Pac 为三相输出有功功率；Pdc 为直流输入功率','Pac is three-phase active output at the motor terminals; Pdc is DC-link input power','回收方向必须反转功率比并统一符号，损耗始终为正。','In regeneration, invert the power ratio and keep signs consistent while loss remains positive.'),
      f('开关损耗','Switching loss','Psw = fs·Σ(Eon + Eoff)',String.raw`P_{\mathrm{sw}}=f_s\sum_j\left(E_{\mathrm{on},j}+E_{\mathrm{off},j}\right)`,'fs 开关频率；器件能量取当前母线电压、电流与结温','fs switching frequency; device energies correspond to current voltage, current and junction temperature','数据手册单点能量不能直接覆盖完整任务循环。','One datasheet energy point cannot represent the full duty cycle.'),
      f('电角频率','Electrical frequency','fe = p·nm / 60',String.raw`f_e=\frac{p\,n_m}{60}`,'p 极对数；nm 机械转速，单位 rpm','p pole pairs; nm mechanical speed in rpm','采样、PWM 和位置估算带宽需覆盖基本频率及关键谐波。','Sampling, PWM and position estimation must cover the fundamental and relevant harmonics.'),
    ], references: [FIA, BOSCH],
  },
  motor: {
    overview: l('2026 顶级混动动力单元由 1.6 L、90°夹角、六缸涡轮增压内燃机和 ERS-K/MGU-K 组成，不再包含 MGU-H。FIA 2026 技术规则规定 ERS-K 直流电功率上限为 350 kW，但驱动输出还会被车速函数、指定赛段低速 250 kW 限制、能量存储 SOC 窗口、单圈回收能量和 MGU-K 机械扭矩共同约束。内燃机、电机、电池与热状态必须按整圈协调，而不是只看某一个瞬时峰值。', 'The 2026 grand prix power unit combines a 1.6 L, 90-degree, six-cylinder turbocharged ICE and ERS-K/MGU-K without MGU-H. The FIA 2026 technical rules cap ERS-K DC electrical power at 350 kW, but deployment is also constrained by speed-dependent power curves, a 250 kW low-speed limit in specified sectors, the ES state-of-charge window, per-lap recharge limits and MGU-K mechanical torque. Engine, motor, battery and thermal state must be coordinated across the lap rather than judged by one peak number.'),
    subcomponents: six(['1.6 L V6内燃机','1.6 L V6 internal-combustion engine'],['涡轮与压气机','Turbine and compressor'],['进气、燃烧与排气系统','Intake, combustion and exhaust'],['MGU-K电机发电机','MGU-K motor-generator'],['燃料、润滑与液压附件','Fuel, lubrication and hydraulic auxiliaries'],['扭矩、爆震、转速与温度传感','Torque, knock, speed and temperature sensing']),
    concepts: three(['内燃机与 MGU-K 扭矩必须在换挡、牵引和制动回收中连续协调。','ICE and MGU-K torque must coordinate through shifts, traction and regeneration.'],['没有 MGU-H 后，涡轮瞬态、压气机工作线和 MGU-K 的车速相关部署边界更关键；工程判断必须同时看牵引、SOC 和热余量。','Without MGU-H, turbo transient response, compressor operating line and the MGU-K speed-dependent deployment boundary matter more; engineering judgement must consider traction, SOC and thermal margin together.'],['最大瞬时功率不是整圈最优，SOC和热状态具有跨弯道记忆。','Maximum instant power is not lap-optimal; SOC and thermal state carry memory across corners.']),
    formulas: [
      f('内燃机轴功率','ICE shaft power','PICE = TICE·ωICE',String.raw`P_{\mathrm{ICE}}=T_{\mathrm{ICE}}\omega_{\mathrm{ICE}}`,'TICE 曲轴扭矩；ωICE 曲轴角速度','TICE crank torque; ωICE crank angular speed','测得功率必须明确是曲轴、变速箱输入还是轮端基准。','Measured power must state crank, gearbox-input or wheel reference.'),
      f('混动合成功率','Combined hybrid power','Pshaft = PICE + PK − Ploss',String.raw`P_{\mathrm{shaft}}=P_{\mathrm{ICE}}+P_K-P_{\mathrm{loss}}`,'PK 为 MGU-K 机械功率，驱动为正；Ploss 为机械损耗','PK is MGU-K mechanical power positive in drive; Ploss mechanical losses','功率相加前必须统一测量位置与符号。','Power terms require a common location and sign convention.'),
      f('制动热效率','Brake thermal efficiency','ηb = PICE / (ṁf·LHV)',String.raw`\eta_b=\frac{P_{\mathrm{ICE}}}{\dot m_f\,\mathrm{LHV}}`,'ṁf 燃料质量流量；LHV 低位热值','ṁf fuel mass flow; LHV lower heating value','瞬态燃料膜、能量储存和附件功率会影响短时间窗估算。','Transient fuel film, stored energy and auxiliaries affect short-window estimates.'),
    ], references: [FIA, FIA_OVERVIEW, FIA_REFINEMENTS],
  },
  differential: {
    overview: l('变速箱、主减速与差速器把混动合成扭矩传给左右后轮。挡位选择、换挡时间、锁止特性与半轴顺从共同决定牵引和横摆响应。', 'Gearbox, final drive and differential deliver hybrid torque to the rear wheels. Ratio choice, shift time, locking and halfshaft compliance determine traction and yaw response.'),
    subcomponents: six(['多挡齿轮组与轴系','Multi-ratio gear train and shafts'],['换挡鼓、拨叉与执行器','Shift drum, forks and actuator'],['主减速齿轮','Final drive'],['可控差速器','Controlled differential'],['左右半轴与等速节','Halfshafts and joints'],['壳体、轴承与润滑系统','Casing, bearings and lubrication']),
    concepts: three(['齿比决定动力单元工作点与轮端扭矩。','Gear ratio sets power-unit operating point and wheel torque.'],['差速锁止改变左右纵向力差，从而产生横摆力矩。','Differential locking changes left-right longitudinal force and yaw moment.'],['壳体既承受齿轮载荷，也承受后悬架和尾翼载荷。','The casing carries gear loads plus rear suspension and wing loads.']),
    formulas: [
      f('对称差速器运动学','Symmetric differential kinematics','ωc = (ωL + ωR) / 2',String.raw`\omega_c=\frac{\omega_L+\omega_R}{2}`,'ωc 差速器壳体转速；ωL、ωR 左右输出转速','ωc carrier speed; ωL/ωR left/right output speeds','左右轮速不同是正常转弯运动学，不能单凭差值判定打滑。','Different wheel speeds are normal in a turn and do not alone prove slip.'),
      f('扭矩偏置比','Torque-bias ratio','TBR = Thigh / Tlow',String.raw`\mathrm{TBR}=\frac{T_{\mathrm{high}}}{T_{\mathrm{low}}}`,'高低扭矩必须来自同一锁止、温度与速度差工作点','High/low torques require the same lock, temperature and speed-difference state','多片摩擦系统的偏置随预载、斜面、磨损和油温变化。','A multi-plate system changes bias with preload, ramps, wear and oil temperature.'),
      f('差动驱动偏航力矩','Differential drive yaw moment','Mz ≈ (Fx,R − Fx,L)·tr/2',String.raw`M_z\approx\left(F_{x,R}-F_{x,L}\right)\frac{t_r}{2}`,'Fx,R、Fx,L 为后轮纵向力；tr 后轮距','Fx,R/Fx,L rear longitudinal forces; tr rear track','方向取决于坐标与弯向，并与横向轮胎力和顺从性共同作用。','Sign depends on coordinates and turn direction and combines with lateral force and compliance.'),
    ], references: [FIA, ...ENGINEERING_LESSONS.differential.references],
  },
  cooling: {
    overview: l('多回路热管理分别服务发动机、机油、增压空气、电池和功率电子。散热开口、泵功、温度窗口与尾部气动必须按赛事环境共同配置。', 'Multiple thermal loops serve engine, oil, charge air, battery and power electronics. Cooling opening, pump power, temperature window and rear-body aerodynamics are configured together for each event.'),
    subcomponents: six(['高温发动机冷却回路','High-temperature engine coolant loop'],['机油与变速箱油回路','Engine and gearbox oil loops'],['增压空气冷却','Charge-air cooling'],['电池与功率电子低温回路','Battery and electronics low-temperature loop'],['侧箱换热器与导流','Sidepod exchangers and ducting'],['泵、膨胀罐、百叶与传感','Pumps, expansion tank, louvres and sensing']),
    concepts: three(['热系统具有储热，瞬时产热与测得温升不会完全同步。','Thermal systems store energy, so heat generation and temperature rise are not simultaneous.'],['增加流量会改善换热但提高泵功和压降。','More flow can improve heat transfer but increases pressure drop and pump power.'],['扩大车身开口增加散热也增加阻力并改变尾流。','Opening bodywork improves rejection but adds drag and changes the wake.']),
    formulas: [
      f('冷却回路带热量','Coolant heat transport','Q̇ = ṁ·cp·ΔT',String.raw`\dot Q=\dot m\,c_p\,\Delta T`,'ṁ 质量流量；cp 比热；ΔT 同步进出口温差','ṁ mass flow; cp heat capacity; ΔT synchronized inlet/outlet difference','瞬态时还需计入固体、机油、管路与冷却液储热。','Transient analysis also includes heat stored in solids, oil, plumbing and coolant.'),
      f('节点间等效热阻','Node-to-node thermal resistance','Rth = ΔT / Q̇',String.raw`R_{\mathrm{th}}=\frac{\Delta T}{\dot Q}`,'温差两端与热流路径必须定义一致','Temperature nodes and heat-flow path must be defined consistently','热阻会随流量、接触压力、界面材料和沸腾状态变化。','Thermal resistance varies with flow, contact pressure, interface material and boiling state.'),
      f('冷却泵轴功率','Coolant-pump shaft power','Ppump = Δp·qv / ηp',String.raw`P_{\mathrm{pump}}=\frac{\Delta p\,q_v}{\eta_p}`,'Δp 回路压升；qv 体积流量；ηp 液压效率','Δp loop pressure rise; qv volume flow; ηp hydraulic efficiency','电池侧功率还要包含电机、逆变器和控制损耗。','Battery-side power also includes motor, inverter and control losses.'),
    ], references: [FIA, ...ENGINEERING_LESSONS.cooling.references],
  },
  ecu: {
    overview: l('标准控制单元与分布式控制器执行扭矩仲裁、能量管理、换挡、线控制动和故障降级。所有策略必须可追溯、可验证并满足规则接口。', 'The standard control unit and distributed controllers execute torque arbitration, energy management, shifts, brake-by-wire and degradation. Strategies must be traceable, verifiable and rule-compliant.'),
    subcomponents: six(['标准电子控制单元','Standard electronic control unit'],['动力单元控制与扭矩仲裁','Power-unit control and torque arbitration'],['能量管理与SOC目标','Energy management and SOC targeting'],['线控制动与换挡协调','Brake-by-wire and shift coordination'],['车载网络、时钟与记录','Vehicle networks, clocks and logging'],['安全监控与故障降级','Safety monitors and fault degradation']),
    concepts: three(['控制器依赖有单位、有时间戳、有有效范围的信号。','Controllers depend on signals with units, timestamps and valid ranges.'],['能量管理是受规则、温度与SOC约束的最优控制。','Energy management is optimal control constrained by rules, temperature and SOC.'],['故障策略必须给出确定、可测试的安全状态。','Fault strategies need deterministic, testable safe states.']),
    formulas: [
      f('一阶离散滤波','First-order discrete filter','y[k] = y[k−1] + α(x[k]−y[k−1])',String.raw`y[k]=y[k-1]+\alpha\left(x[k]-y[k-1]\right)`,'α 在0到1之间；x 原始输入；y 滤波状态','α lies from 0 to 1; x raw input; y filter state','滤波降低噪声也增加相位延迟，安全监控应保留独立快速路径。','Filtering reduces noise but adds phase delay; safety monitoring needs an independent fast path.'),
      f('扭矩斜率限制','Torque slew limit','|Tcmd[k]−Tcmd[k−1]| ≤ Ṫmax·Δt',String.raw`\left\lvert T_{\mathrm{cmd}}[k]-T_{\mathrm{cmd}}[k-1]\right\rvert\leq\dot T_{\max}\Delta t`,'Ṫmax 为允许斜率；Δt 控制周期','Ṫmax allowed slew; Δt control period','上升、下降、换挡和故障状态通常需要分别标定。','Rise, fall, shift and fault states normally require separate calibration.'),
      f('单圈电能变化','Lap electrical-energy change','ΔEES = ∫(Pregen − Pdeploy)dt',String.raw`\Delta E_{\mathrm{ES}}=\int\left(P_{\mathrm{regen}}-P_{\mathrm{deploy}}\right)\mathrm{d}t`,'Pregn、Pdeploy 使用电池端同一正负约定','Pregen and Pdeploy use one battery-terminal sign convention','圈末SOC目标需要考虑效率和不可用能量边界。','End-lap SOC targeting includes efficiency and inaccessible energy limits.')], references: [FIA, BOSCH],
  },
  sensors: {
    overview: l('传感与遥测系统把驾驶输入、车辆运动、轮胎、动力、热和安全状态放在同一时间轴上。数据质量、同步和不确定度决定工程结论是否可信。', 'Sensors and telemetry align driver input, vehicle motion, tires, power, thermal and safety state on one timeline. Data quality, synchronization and uncertainty determine whether conclusions are credible.'),
    subcomponents: six(['惯性测量与车辆速度','Inertial measurement and vehicle speed'],['轮速、制动与轮胎测量','Wheel-speed, brake and tire sensing'],['悬架位移、应变与载荷代理','Suspension displacement, strain and load proxies'],['动力单元、电气与热测量','Power-unit, electrical and thermal sensing'],['遥测链路、数据记录与时间同步','Telemetry, logging and time synchronization'],['事故记录、驾驶员安全与规则通道','Accident, driver-safety and regulatory channels']),
    concepts: three(['每个通道必须对应明确的物理量、坐标系、单位和工程问题。','Every channel needs a physical quantity, frame, unit and engineering question.'],['同步误差可能把因果关系颠倒。','Synchronization error can reverse apparent causality.'],['校准、滤波和派生信号必须保留版本与处理链。','Calibration, filtering and derived channels require versioned processing lineage.']),
    formulas: [
      f('线性通道标定','Linear channel calibration','y = a·x + b',String.raw`y=ax+b`,'a 灵敏度；b 零点；x 物理输入；y 通道输出','a sensitivity; b offset; x physical input; y channel output','上线标定还要检查迟滞、非线性、温漂、安装与端到端缩放。','Release calibration also checks hysteresis, nonlinearity, thermal drift, installation and end-to-end scaling.'),
      f('奈奎斯特必要条件','Nyquist necessary condition','fs > 2·fmax',String.raw`f_s>2f_{\max}`,'fs 采样率；fmax 需要保留的最高信号频率','fs sample rate; fmax highest signal frequency to preserve','还必须为模拟抗混叠滤波器的过渡带、幅值和相位留裕量。','Additional margin is needed for analog anti-alias transition band, amplitude and phase.'),
      f('合成标准不确定度','Combined standard uncertainty','uc = √(Σui²)',String.raw`u_c=\sqrt{\sum_i u_i^2}`,'ui 为相互独立的标准不确定度分量','ui are independent standard-uncertainty components','相关分量必须加入协方差；扩展不确定度还需要覆盖因子。','Correlated terms require covariance; expanded uncertainty also needs a coverage factor.'),
    ], references: [FIA, BOSCH, ...ENGINEERING_LESSONS.sensors.references],
  },
}

export const GRAND_PRIX_ENGINEERING_LESSONS: Record<PartId, EngineeringLesson> = Object.fromEntries(
  Object.entries(ENGINEERING_LESSONS).map(([id, base]) => [id, { ...base, ...O[id as PartId] }]),
) as Record<PartId, EngineeringLesson>
