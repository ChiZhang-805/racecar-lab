import { CATEGORIES, COURSES, PART_MAP, SCENARIOS, type CategoryId, type Course, type CourseId, type PartId, type PartInfo, type ScenarioId } from './data'
import { getGrandPrixPart } from './grandPrixContent'
import type { VehicleId } from './vehicles'
import { getGrandPrixCourse } from './grandPrixCourses'

export type Locale = 'zh' | 'en'

export const copy = {
  zh: {
    pageTitle: 'RaceCar Lab · 方程式赛车工程实验室', brandSubtitle: '方程式赛车工程实验室',
    eyebrow: '不用看视频，也能读懂一辆赛车', heroA: '从一颗螺栓开始', heroB: '理解方程式赛车',
    firstLesson: '开始第一课', freeExplore: '自由探索', dragCar: '拖动查看赛车', systems: '赛车系统',
    hide: '隐藏', show: '显示', close: '关闭', part: '部件', related: '关联部件', deepDive: '深入了解',
    detailIntro: '快速认识', detailPrinciple: '工作原理', detailObserve: '观察指南', detailEngineering: '工程师视角', detailFaults: '常见问题',
    whatIsIt: '它是什么', mission: '核心任务', analogy: '小白类比', workflow: '工作链路', worksWith: '协同系统',
    observeLabels: ['先定位', '再观察', '最后验证'], engineeringLabels: ['关键关系', '设计取舍', '整车影响'], faultLabels: ['失效现象', '工程后果', '检查思路'],
    coursePath: '从零开始的赛车工程路径', completed: '已完成',
    done: '已完成', currentCourse: '当前课程', locked: '尚未解锁', lesson: '课程', task: '本关任务',
    observeMore: '还需观察', components: '个部件', enterQuiz: '完成观察，进入测验', checkpoint: '知识检查', quiz: '课程测验',
    correct: '判断正确，你已经完成本关。', incorrect: '答案还不准确，请再想一想这些系统之间的关系。', backObserve: '返回观察', finishCourse: '完成本关',
    explode: '分层拆解', xray: '透视', selectPart: '选择一个零件', selectPartHint: '点击赛车开始观察',
    courseMap: '课程地图', knowledge: '知识问答', resetView: '复位视角', resetCar: '复原赛车', pauseCar: '暂停3D赛车旋转', resumeCar: '继续旋转3D赛车', home: '返回首页', settings: '设置',
    settingsTitle: '学习设置', language: '界面语言', vehicle: '赛车车型', chinese: '中文', english: 'English',
    music: '音乐', musicPlay: '播放音乐', musicPause: '暂停音乐', musicSequence: '顺序播放', musicRepeatOne: '单曲循环', musicShuffle: '随机播放', musicMissing: '请放入音频文件',
    resetProgress: '清空学习进度', resetConfirm: '确认清空', cancel: '取消',
    staticObserve: '静态观察', acceleration: '全力加速', braking: '重制动', cornering: '高速转弯', aeroFlow: '气流分析',
  },
  en: {
    pageTitle: 'RaceCar Lab · Formula Racing Engineering', brandSubtitle: 'Formula Racing Engineering',
    eyebrow: 'Understand a race car without watching a lecture', heroA: 'Start with one bolt', heroB: 'Understand the whole race car',
    firstLesson: 'Start lesson one', freeExplore: 'Explore freely', dragCar: 'Drag to inspect the car', systems: 'Car systems',
    hide: 'Hide', show: 'Show', close: 'Close', part: 'Part', related: 'Related parts', deepDive: 'Explore details',
    detailIntro: 'Overview', detailPrinciple: 'How it works', detailObserve: 'What to inspect', detailEngineering: 'Engineering view', detailFaults: 'Common faults',
    whatIsIt: 'What it is', mission: 'Core purpose', analogy: 'Simple analogy', workflow: 'Working chain', worksWith: 'Connected systems',
    observeLabels: ['Locate', 'Inspect', 'Verify'], engineeringLabels: ['Key relation', 'Design trade-off', 'Vehicle effect'], faultLabels: ['Failure sign', 'Engineering result', 'Check method'],
    coursePath: 'Your path into race car engineering', completed: 'Completed',
    done: 'Done', currentCourse: 'Current lesson', locked: 'Locked', lesson: 'Lesson', task: 'Your task',
    observeMore: 'Inspect', components: 'more parts', enterQuiz: 'Start checkpoint', checkpoint: 'Checkpoint', quiz: 'Lesson checkpoint',
    correct: 'Correct. You have completed this lesson.', incorrect: 'Not quite. Think again about how the systems interact.', backObserve: 'Back to car', finishCourse: 'Complete lesson',
    explode: 'Exploded view', xray: 'X-ray', selectPart: 'Select a part', selectPartHint: 'Click the car to begin',
    courseMap: 'Course map', knowledge: 'Knowledge centre', resetView: 'Reset view', resetCar: 'Reset car', pauseCar: 'Pause 3D car rotation', resumeCar: 'Resume 3D car rotation', home: 'Home', settings: 'Settings',
    settingsTitle: 'Learning settings', language: 'Interface language', vehicle: 'Race car', chinese: '中文', english: 'English',
    music: 'Music', musicPlay: 'Play music', musicPause: 'Pause music', musicSequence: 'Sequence', musicRepeatOne: 'Repeat one', musicShuffle: 'Shuffle', musicMissing: 'Audio file missing',
    resetProgress: 'Clear course progress', resetConfirm: 'Clear progress', cancel: 'Cancel',
    staticObserve: 'Inspect', acceleration: 'Acceleration', braking: 'Braking', cornering: 'Cornering', aeroFlow: 'Airflow',
  },
} as const

export type CopyKey = keyof typeof copy.zh

const categoryNames: Record<Locale, Record<CategoryId, string>> = {
  zh: { aero: '空气动力学', structure: '车身与安全', dynamics: '车辆动力学', power: '动力与热管理', electronics: '电子与数据' },
  en: { aero: 'Aerodynamics', structure: 'Body & Safety', dynamics: 'Vehicle Dynamics', power: 'Power & Thermal', electronics: 'Electronics & Data' },
}

const scenarioNames: Record<Locale, Record<ScenarioId, string>> = {
  zh: { idle: '静态观察', acceleration: '全力加速', braking: '重制动', cornering: '高速转弯', aero: '气流分析' },
  en: { idle: 'Inspect', acceleration: 'Acceleration', braking: 'Braking', cornering: 'Cornering', aero: 'Airflow' },
}

const enParts: Record<PartId, Partial<PartInfo>> = {
  'front-wing': {
    short: 'The first major aero surface to meet the air, controlling front downforce and the flow downstream.',
    purpose: 'Creates a pressure difference that pushes the front axle down while guiding disturbed front-wheel flow away from sensitive areas.',
    analogy: 'An upside-down aircraft wing: an aircraft rises, while the race car is pushed down.',
    observe: ['Count the main plane and flap elements from the front.', 'Check the element angle and ground clearance from the side.', 'Use Airflow mode to see how the wake is guided around the front tires.'],
    engineering: ['More flap angle usually adds downforce and drag.', 'Front-wing changes alter high-speed balance and can destabilize the rear.', 'Ride height and pitch continually change its operating point.'],
    faults: ['Damage can suddenly reduce front grip.', 'Left-right asymmetry may make the car yaw under braking.'], connections: ['Nose', 'Floor & diffuser', 'Front tires'],
  },
  'rear-wing': {
    short: 'The main rear downforce device, stabilizing the driven axle at speed.',
    purpose: 'Adds rear grip and sets the trade-off between corner performance and straight-line speed.',
    analogy: 'A hand pressing harder on the rear as speed increases.',
    observe: ['Compare the main plane and flap angles.', 'See how endplates limit pressure leakage at the tips.', 'Use Airflow mode to inspect the low-pressure wake.'],
    engineering: ['Downforce grows roughly with speed squared.', 'Too much angle creates a large drag penalty.', 'It must be balanced with the floor and diffuser.'],
    faults: ['Loose mounts can change the wing angle.', 'A failed element may cause sudden high-speed oversteer.'], connections: ['Diffuser', 'Rear suspension', 'Chassis'],
  },
  floor: {
    short: 'A hidden underbody flow path that can produce a major share of total downforce.',
    purpose: 'Accelerates air under the car to lower pressure, then expands it through the diffuser to recover pressure cleanly.',
    analogy: 'A controlled high-speed air tunnel between the car and the road.',
    observe: ['Enable X-ray and look beneath the car.', 'Find the rising diffuser channels at the rear.', 'Use Exploded view to see how the floor fits the chassis.'],
    engineering: ['Performance is highly sensitive to ride height, pitch and roll.', 'Running too low can cause contact and unstable flow.', 'An excessive diffuser angle can separate the flow.'],
    faults: ['Wear changes the intended geometry.', 'Broken edge sealing can make downforce inconsistent.'], connections: ['Front wing', 'Sidepods', 'Rear wing'],
  },
  nose: {
    short: 'The slender link between front wing and chassis, and a key frontal crash structure.',
    purpose: 'Supports the front wing, shapes the incoming flow and absorbs impact energy through controlled deformation.',
    analogy: 'Both the car’s nose bridge and its front crash cushion.',
    observe: ['Follow the section as it grows toward the chassis.', 'Locate the joint at the monocoque.', 'Isolate it to trace front-wing loads into the chassis.'],
    engineering: ['Low mass, stiffness and energy absorption must coexist.', 'The structure must fail progressively and predictably.', 'Packaging and aero needs both constrain the shape.'],
    faults: ['Hidden cracks after impact reduce capacity.', 'Loose joints can move the front-wing reference position.'], connections: ['Front wing', 'Monocoque', 'Front suspension'],
  },
  monocoque: {
    short: 'The primary load-bearing safety cell around which the driver and major systems are arranged.',
    purpose: 'Protects the driver and transfers suspension and aerodynamic loads through a stiff central structure.',
    analogy: 'The car’s skeleton and rib cage in one structure.',
    observe: ['Hide outer aero parts to reveal the central shell.', 'Find front and rear suspension mounting zones.', 'Compare the driver position with the shell section.'],
    engineering: ['Torsional stiffness makes suspension response predictable.', 'Composite fiber direction controls directional strength.', 'Mass reduction cannot compromise impact safety or hard-point stiffness.'],
    faults: ['Delamination may be invisible at the surface.', 'Local mount damage changes suspension geometry.'], connections: ['Nose', 'Cockpit protection', 'Suspension', 'Accumulator'],
  },
  halo: {
    short: 'A high-strength structure protecting the driver’s head and survival space.',
    purpose: 'Resists roll-over, debris and vehicle-overlap loads around the cockpit.',
    analogy: 'An extremely strong guard rail around the driver’s head.',
    observe: ['Check visibility around the central pillar.', 'Trace both side mounts into the chassis.', 'Use the top view to understand the protected zone.'],
    engineering: ['Strength, low mass and visibility must be balanced.', 'Loads must enter the monocoque through robust mounts.', 'Its shape also changes cockpit airflow.'],
    faults: ['Damaged mounts reduce structural capacity.', 'Post-incident inspection must go beyond the visible surface.'], connections: ['Monocoque', 'Seat & harness'],
  },
  tires: {
    short: 'All acceleration, braking and cornering forces pass through four small contact patches.',
    purpose: 'Generates longitudinal and lateral forces through the interaction between rubber and road.',
    analogy: 'Every advanced system still reaches the road through four shoe soles.',
    observe: ['Inspect tire width and camber from the front.', 'Use Cornering mode to compare inside and outside load.', 'Watch front load rise under braking.'],
    engineering: ['Grip does not rise linearly with vertical load.', 'Temperature, pressure, slip ratio and slip angle define available grip.', 'Braking and cornering share one finite friction budget.'],
    faults: ['Cold tires may sit outside their working window.', 'Overheating, locking or poor alignment causes abnormal wear.'], connections: ['Brakes', 'Suspension', 'Steering'],
  },
  brakes: {
    short: 'A friction system that converts vehicle kinetic energy into heat.',
    purpose: 'Slows the car controllably and uses the available longitudinal tire force before corner entry.',
    analogy: 'Speed does not disappear; it becomes heat in the brake disc.',
    observe: ['Hide the tire to reveal disc and caliper.', 'Use Braking mode to watch disc temperature.', 'Compare front and rear load arrows.'],
    engineering: ['Brake balance follows load transfer and aero load.', 'Disc radius and clamp force determine brake torque.', 'Poor cooling causes fade; low temperature can also reduce friction.'],
    faults: ['Boiling fluid creates excessive pedal travel.', 'Wrong balance can lock the front or rotate the rear.'], connections: ['Tires', 'Pedal system', 'Uprights'],
  },
  'front-suspension': {
    short: 'Guides the front wheels and transfers tire loads into the chassis.',
    purpose: 'Keeps the tires in an effective attitude over bumps, braking and steering while controlling body motion.',
    analogy: 'A precise linkage defining the wheel path, not just a spring moving up and down.',
    observe: ['Identify upper arm, lower arm and pushrod.', 'Compare outside compression and inside extension in Cornering mode.', 'Watch camber change through travel.'],
    engineering: ['Hard points set camber gain, roll center and motion ratio.', 'Springs support; dampers control motion speed.', 'Geometry balances braking, steering, aero platform and mechanical grip.'],
    faults: ['Joint play makes alignment drift.', 'A bent pushrod or leaking damper changes the response.'], connections: ['Front tires', 'Steering rack', 'Monocoque', 'Dampers'],
  },
  'rear-suspension': {
    short: 'Controls driven-wheel motion while carrying traction and lateral loads.',
    purpose: 'Maintains rear-tire contact and manages squat, roll and the aerodynamic platform.',
    analogy: 'The rear axle’s guide rails and shock-control system.',
    observe: ['Trace links from upright to gearbox area.', 'Compare left and right travel in Cornering mode.', 'Follow drive torque from differential to the wheel.'],
    engineering: ['Geometry affects traction, camber and roll behavior.', 'Stiffness changes both tire load control and aero platform.', 'Driveshaft and suspension travel must remain compatible.'],
    faults: ['Loose joints create unstable rear toe.', 'Damper or spring damage reduces traction consistency.'], connections: ['Rear tires', 'Differential', 'Chassis', 'Dampers'],
  },
  steering: {
    short: 'Converts driver input into a controlled change of front-wheel angle.',
    purpose: 'Provides accurate direction control and useful feedback while minimizing unwanted compliance.',
    analogy: 'A mechanical translator between the driver’s hands and the front tires.',
    observe: ['Follow the column from wheel to rack.', 'Locate both tie rods.', 'Use Cornering mode to compare inner and outer wheel angle.'],
    engineering: ['Rack ratio trades response speed against steering effort.', 'Ackermann geometry changes inner/outer angle difference.', 'Compliance and bump steer disturb the commanded angle.'],
    faults: ['Joint play creates a vague center response.', 'A bent tie rod changes toe and steering symmetry.'], connections: ['Steering wheel', 'Front suspension', 'Front tires'],
  },
  battery: {
    short: 'Stores the electrical energy used by the traction system.',
    purpose: 'Supplies high power safely while keeping cells within voltage and temperature limits.',
    analogy: 'The car’s fuel tank and energy reservoir, built from many monitored cells.',
    observe: ['Use Exploded view to reveal the pack.', 'Follow blue energy flow toward the inverter.', 'Inspect its central, low placement.'],
    engineering: ['Energy, power, mass and cooling are competing targets.', 'Cell consistency limits usable performance.', 'High-voltage isolation and impact protection are fundamental.'],
    faults: ['Overtemperature reduces performance and life.', 'Isolation failure requires immediate system shutdown.'], connections: ['Inverter', 'Cooling', 'Vehicle controller'],
  },
  inverter: {
    short: 'The power-electronics bridge between the DC battery and AC traction motor.',
    purpose: 'Switches electrical energy precisely to command motor torque and recover energy under regeneration.',
    analogy: 'A high-speed electrical gearbox that controls energy direction and form.',
    observe: ['Find it between battery and motor in the energy path.', 'Use Acceleration mode to see power flow.', 'Check its cooling connection.'],
    engineering: ['Switching efficiency directly affects heat and range.', 'Current limits cap available torque.', 'Control timing must match motor position accurately.'],
    faults: ['Overtemperature forces power derating.', 'A switching or isolation fault can disable drive.'], connections: ['Accumulator', 'Traction motor', 'Cooling', 'Vehicle controller'],
  },
  motor: {
    short: 'Converts electrical power into wheel-driving mechanical torque.',
    purpose: 'Delivers rapid, controllable torque across the speed range and supports regenerative braking.',
    analogy: 'An electromagnetic muscle whose force can change almost instantly.',
    observe: ['Follow energy flow from inverter to motor.', 'Trace torque toward the differential.', 'Compare acceleration and braking energy direction.'],
    engineering: ['Torque, speed, efficiency and temperature define the operating envelope.', 'Gear ratio trades launch force against top speed.', 'Cooling governs how long peak power can be sustained.'],
    faults: ['Excess heat reduces available torque.', 'Sensor errors can make torque control unstable.'], connections: ['Inverter', 'Differential', 'Cooling'],
  },
  differential: {
    short: 'Splits drive torque between the rear wheels while allowing different wheel speeds.',
    purpose: 'Lets inside and outside wheels follow different paths and manages traction during corner exit.',
    analogy: 'A torque junction that lets two runners travel different distances through a bend.',
    observe: ['Locate it between motor and rear driveshafts.', 'Use Cornering mode to compare wheel speeds.', 'Trace torque arrows to both rear wheels.'],
    engineering: ['Locking behavior trades rotation response against traction.', 'Torque bias strongly affects corner entry and exit balance.', 'Mount stiffness influences driveline response.'],
    faults: ['Excessive locking causes understeer or tire scrub.', 'Wear can create noise, heat and inconsistent torque split.'], connections: ['Traction motor', 'Rear wheels', 'Rear suspension'],
  },
  cooling: {
    short: 'Moves unwanted heat away from the battery, inverter and motor.',
    purpose: 'Keeps components in their efficient and reliable temperature windows.',
    analogy: 'The car’s circulation system, carrying heat to radiators instead of oxygen to organs.',
    observe: ['Find the side radiators and duct paths.', 'Trace cooling links to power components.', 'Use Acceleration mode to see where heat builds.'],
    engineering: ['More airflow improves cooling but adds drag.', 'Pump flow, radiator area and temperature targets must match.', 'Different components may need separate cooling loops.'],
    faults: ['Air pockets or leaks reduce heat transfer.', 'Blocked airflow causes progressive power derating.'], connections: ['Accumulator', 'Inverter', 'Traction motor', 'Sidepods'],
  },
  ecu: {
    short: 'The central controller coordinating driver requests, power, safety and vehicle states.',
    purpose: 'Reads sensors, applies control logic and commands actuators within safety limits.',
    analogy: 'The car’s nervous-system coordinator, making rapid decisions from many signals.',
    observe: ['Use X-ray to locate the controller.', 'Follow signal paths to sensors and power electronics.', 'Compare commands across live modes.'],
    engineering: ['Control quality depends on sensor accuracy and timing.', 'Safety states must be deterministic and testable.', 'Software changes require disciplined validation.'],
    faults: ['A bad input may trigger a safe reduced-power state.', 'Communication loss can disable dependent systems.'], connections: ['Sensors', 'Inverter', 'Accumulator', 'Driver controls'],
  },
  sensors: {
    short: 'Measurements that turn vehicle behavior into engineering evidence.',
    purpose: 'Captures motion, load, temperature and electrical data for control, diagnosis and setup work.',
    analogy: 'The car’s eyes, ears and medical monitor, recording what really happened.',
    observe: ['Find markers around wheels, chassis and powertrain.', 'Switch modes to see signals change.', 'Relate each measurement to a physical event.'],
    engineering: ['Sample rate and placement determine what can be observed.', 'Calibration and synchronization matter as much as sensor precision.', 'Useful analysis begins with a clear engineering question.'],
    faults: ['Drift can mislead setup decisions.', 'Noise, dropout or time misalignment can hide the true event.'], connections: ['Vehicle controller', 'Suspension', 'Brakes', 'Powertrain'],
  },
}

const enCourses: Record<CourseId, Partial<Course>> = {
  orientation: { title: 'Meet the race car', subtitle: 'Build the whole-car map', description: 'Find the major systems and see why they all work through the tires.', task: 'Locate and isolate the front wing, monocoque and tires.', question: 'What finally transfers every acceleration, braking and cornering force to the road?', options: ['Chassis', 'Air', 'Tires', 'Battery'] },
  forces: { title: 'Forces & loads', subtitle: 'Learn the shared language', description: 'Connect mass, acceleration, load and moment to center of gravity and load transfer.', task: 'Compare the four tire-load arrows in Braking and Cornering modes.', question: 'Which axle normally gains vertical load under braking?', options: ['Front axle', 'Rear axle', 'Both sides equally', 'Neither axle'] },
  tires: { title: 'Tires & grip', subtitle: 'Where performance reaches the road', description: 'Build a grip budget from longitudinal force, lateral force, slip, temperature and load sensitivity.', task: 'Use Cornering mode and find the most heavily loaded outside tire.', question: 'What happens when a tire is asked for maximum braking and cornering together?', options: ['Grip doubles', 'Both demands share finite grip', 'Only temperature changes', 'Nothing changes'] },
  braking: { title: 'Brake system', subtitle: 'Turn speed into heat', description: 'Observe disc temperature, axle load transfer and the stability effect of brake balance.', task: 'Use Braking mode, hide a tire and inspect disc temperature.', question: 'What is the main energy conversion in a brake disc?', options: ['Heat to motion', 'Motion to heat', 'Electricity to potential energy', 'Pressure to electricity'] },
  suspension: { title: 'Suspension & steering', subtitle: 'Manage tire attitude', description: 'Learn wishbones, pushrods, springs, dampers and steering links by watching wheel motion.', task: 'Use Cornering mode and compare left-right suspension travel from the front.', question: 'What does a damper primarily control?', options: ['Body color', 'Motion speed', 'Battery voltage', 'Wing area'] },
  aero: { title: 'Aerodynamics', subtitle: 'Manage invisible flow', description: 'Follow air from front wing through floor to rear wing, linking downforce, drag and balance.', task: 'Use Airflow mode and separate the three major aero devices.', question: 'Increasing wing angle normally produces which combination?', options: ['More downforce and drag', 'Less of both', 'Lower mass only', 'Tire pressure only'] },
  powertrain: { title: 'Electric power & cooling', subtitle: 'Turn energy into lap time', description: 'Trace energy through accumulator, inverter, motor and differential, then follow the waste heat.', task: 'Use Acceleration mode and follow the blue energy path through each power component.', question: 'Which two major components does the inverter connect?', options: ['Tire and road', 'Battery and motor', 'Front and rear wings', 'Wheel and rack'] },
  integration: { title: 'Whole-car setup', subtitle: 'Think in trade-offs', description: 'No parameter is optimized alone. Connect grip, attitude, aero, power and reliability.', task: 'Run Braking, Cornering and Airflow modes, then explain one performance trade-off.', question: 'What is the core mindset of race car setup?', options: ['Maximize every number', 'Chase peak power only', 'Understand system trade-offs', 'Copy another car'] },
}

export function t(locale: Locale, key: CopyKey) {
  return copy[locale][key]
}

export function getCategoryName(id: CategoryId, locale: Locale) {
  return categoryNames[locale][id]
}

export function getScenarioName(id: ScenarioId, locale: Locale) {
  return scenarioNames[locale][id]
}

export function getPart(id: PartId, locale: Locale, vehicleId: VehicleId = 'student-ev'): PartInfo {
  const base = PART_MAP[id]
  if (vehicleId === 'grand-prix-2026') return getGrandPrixPart(base, locale)
  if (locale === 'zh') return base
  return { ...base, ...enParts[id], name: base.nameEn, nameEn: base.nameEn }
}

export function getCourse(course: Course, locale: Locale, vehicleId: VehicleId = 'student-ev'): Course {
  if (vehicleId === 'grand-prix-2026') return getGrandPrixCourse(course, locale)
  return locale === 'zh' ? course : { ...course, ...enCourses[course.id] }
}

export function getCategoryColor(id: CategoryId) {
  return CATEGORIES[id].color
}

export function getScenarioColor(id: ScenarioId) {
  return SCENARIOS[id].color
}

export const localizedCourses = (locale: Locale) => COURSES.map((course) => getCourse(course, locale))
