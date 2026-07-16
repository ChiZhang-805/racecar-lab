# RaceCar Lab 全量审计报告

审计日期：2026-07-16
审计范围：全部源码、配置、双语内容、工程公式、仿真逻辑、两款整车、四套 2026 涂装、36 套零部件工作台模型、216 个子组件、全部弹窗/页面、108 张交互图片、8 首音频、构建与腾讯云部署链路。

## 1. 结论

本轮审计发现的问题已直接修复，并通过单元、构建和真实 Chromium 回归。当前版本可作为交互式赛车工程教学站继续迭代，但必须区分“教学可视化模型”和“制造/认证 CAD”：代码原生模型用于解释部件关系、受力、流路与拆解，不应被用于零件制造、结构认证或赛事合规申报。

仍需项目所有者补充的外部材料：7 首音频的一手下载页、下载日期、作者、许可文本/版本及 Content ID 记录；正式公网发布还应配置域名、HTTPS、项目 LICENSE 与第三方 NOTICE。

## 2. 逐文件审查记录

### 应用、界面与状态

| 文件 | 审查重点 | 结果 |
| --- | --- | --- |
| `src/main.tsx` | React 启动、样式入口 | 通过 |
| `src/App.tsx` | 首屏、实验室、课程、设置、音乐、涂装、最小化面板、焦点恢复 | 新增四套 GP 涂装选择、官方参考入口与安全持久化；通过 |
| `src/EngineeringDetail.tsx` | 五页签、公式、工作台、弹窗焦点与键盘切换 | 修复页签 ARIA、方向键/Home/End 与滚动定位；通过 |
| `src/KnowledgeCenter.tsx` | 题库筛选、答题、评分、双语与移动端 | 通过真实浏览器回归 |
| `src/CoolingInteractionPanels.tsx` | 五个实验、资料翻转卡、故障翻转卡 | 修复翻转焦点、状态语义和共享图域；通过 |
| `src/PartInteractionPanels.tsx` | 其余 17 个零件的实验/卡片通用呈现 | 修复翻转状态与键盘可达性；通过 |
| `src/useDialogFocus.ts` | 焦点圈定、Escape、关闭后恢复 | 通过 |
| `src/storage.ts` | localStorage 不可用、损坏 JSON、车型命名空间 | 通过损坏数据与车型隔离回归 |
| `src/styles.css` | 桌面、320–390 px 手机竖屏、英文长词、无页面级滚动、弹窗内部滚动 | 将窄屏系统栏改为横向可滑动区、底部控制改为两行，课程卡/零件卡/工具条分区不相交；通过 |
| `src/uiNumber.ts` | 本地化数字与百分数 | 新增稳定格式化与测试；通过 |

### 3D 整车与零件模型

| 文件 | 审查重点 | 结果 |
| --- | --- | --- |
| `src/CarScene.tsx` | 轮胎接地/旋转、悬架连杆、轮距、驾驶舱、Halo、前后翼、发动机盖、拆解、镜头 | 新增四套程序化无标志涂装、发动机盖和进气口；收窄前翼并保留主动襟翼/环盘/Halo/悬架逻辑；通过 |
| `src/grandPrixLiveries.ts` | 四队公开配色、双语说明、来源、持久化 ID | 法拉利、迈凯伦、梅赛德斯、红牛四套独立调色板与官方来源完整；通过 |
| `src/ComponentWorkshop.tsx` | 36 套零件模型、216 个子组件、选中、爆炸、复位 | 修复零长度连杆、资源释放、爆炸比例与 GP 传动结构；36/36 通过 |
| `src/componentWorkshopData.ts` | Student 108 个子组件说明与模型映射 | 通过数据完整性和浏览器选择回归 |
| `src/grandPrixWorkshopFacts.ts` | GP 108 个子组件说明与车型专属结构 | 修正气流措辞；通过 |
| `src/modelGeometry.ts` | 轮胎/轮辋/轮距/整车包络/几何常量与向量工具 | 按 FIA Issue 19 记录 1900 mm、3400 mm、轮辋宽度和动态最低质量基准，并将场景前翼宽度纳入自动约束；通过 |

模型专项确认：

- Formula Student 教学车与 2026 顶级混动单座赛车使用独立尺寸、动力与驾驶舱语义。
- 轮胎以刚体最低点接地，不再出现轮胎下方悬空圆盘；2026 车型保留规则要求的轮辋外侧环盘，但其位于轮毂外侧，不位于地面下方。
- 2026 Halo 为中央柱、左右分叉臂和三个安装点，没有虚构横梁。
- 2026 前翼固定前段加活动襟翼、后翼固定主翼加活动襟翼，避免把整个翼面错误旋转。
- GP 前翼按 3400 mm 轴距场景标尺换算后不超过 1900 mm 公开宽度基准；四涂装不含队徽或赞助商图案。
- 传动工作台展示八组齿轮副及对齐轴；拆解方向与子组件选择保持一致。

### 工程仿真、交互与规则逻辑

| 文件 | 审查重点 | 结果 |
| --- | --- | --- |
| `src/engineeringSim.ts` | Student 16 类仿真 | 修复底板当前点、轮胎速度耗散、开放差速、80 kW 正向驱动边界；通过 |
| `src/grandPrixEngineeringSim.ts` | GP 16 类仿真 | 修复 ERS、底板、差速、轮胎速度与符号方向；通过 |
| `src/simulationMath.ts` | 二阶响应、稳态与有限值 | 改为解析二阶响应并处理边界；通过 |
| `src/ersRules.ts` | 2026 ERS-K 功率、速度、扭矩与效率规则 | 新增集中规则函数和边界测试；通过 |
| `src/aeroStructureInteractions.ts` | 翼面、底板、鼻锥、单体壳、Halo | 修复主动翼延迟/400 ms 总转换时长、Venturi 指标与曲线一致性、冲击速度边界；通过 |
| `src/dynamicsInteractions.ts` | 轮胎、制动、悬架、转向 | 修复再生混合、轮速与开放差速边界；通过 |
| `src/powerElectronicsInteractions.ts` | 电池、逆变器、电机、差速、ECU、传感器 | 修复能量窗口、效率方向、500 N·m、FS 再生例外、ECU 仲裁和传感器边界；通过 |
| `src/coolingInteractions.ts` | 冷却系统五实验与卡片数据 | 通过 |
| `src/partInteractionRegistry.ts` | 18 个零件交互注册与车型分派 | 通过完整注册测试 |
| `src/interactionTypes.ts` | 交互数据契约、图形与翻转卡类型 | 通过 |

关键规则回归：

- Formula Student 正向牵引系统输出不超过 80 kW；再生回收不错误套用 80 kW 正向上限。
- GP ERS-K DC 电功率上限 350 kW，345 km/h 及以上普通模式正向部署为零，机械扭矩上限 500 N·m。
- GP 电气/机械换算按 0.97 或其倒数处理，避免把效率方向写反。
- 开放式差速器两侧等扭矩，并受低附着侧能力限制。
- Student 与 GP 底板扫描曲线的当前点与所选离地高度一致。

### 内容、公式、课程与题库

| 文件 | 审查重点 | 结果 |
| --- | --- | --- |
| `src/data.ts` | Student 18 零件、课程、双语说明 | 修正座舱防护、制动力矩、轮胎力与动能措辞；通过 |
| `src/i18n.ts` | 完整中文/英文隔离 | 同步修正双语内容和故障标签；通过 |
| `src/grandPrixContent.ts` | GP 18 零件专属内容 | 修正主动翼为车手请求、SECU 两固定状态；通过 |
| `src/engineeringData.ts` | Student 18 套五页签工程课程 | 通过完整性测试 |
| `src/grandPrixEngineeringData.ts` | GP 18 套五页签工程课程 | 通过完整性测试 |
| `src/formulaExamples.ts` | Student 54 个逐公式计算案例 | 通过 |
| `src/grandPrixFormulaExamples.ts` | GP 54 个逐公式计算案例 | 修正质量、轴端扭矩和摩擦椭圆平方利用率措辞；通过 |
| `src/questionBank.ts` | Student 90 题 | 修正 Nyquist 严格边界；通过 |
| `src/grandPrixQuestionBank.ts` | GP 90 题 | 重构 18 零件公式干扰项、实验场景、诊断链和设计题；通过 |
| `src/grandPrixCourses.ts` | GP 8 关课程 | 通过 |
| `src/vehicles.ts` | 车型注册、命名空间与语义别名 | 新增明确车型语义映射，防止 Halo/动力单元串用；通过 |

### 构建、测试、资产与部署

| 文件 | 审查重点 | 结果 |
| --- | --- | --- |
| `package.json` / `package-lock.json` | Node 基线、脚本、依赖安全 | Node 20.19+ / 22.12+；0 个已知漏洞 |
| `.nvmrc` | 可复现 Node 版本 | 新增 22.12.0 |
| `vite.config.ts` | 生产分包与静态构建 | 通过，无 source map 泄漏 |
| `vitest.config.ts` | 单元测试发现规则 | 修复测试匹配；通过 |
| `playwright.config.ts` | 本地生产预览与线上复测 | 修复外部 URL/预览服务器切换；通过 |
| `tests/app.spec.ts` | 桌面/横屏/320–390 px 竖屏、双语、两车型、四涂装、36 模型、弹窗、WCAG | 13/13 通过 |
| `src/dataIntegrity.test.ts` | 内容、公式、题库、车型映射、四涂装 | 通过 |
| `src/engineeringSimulation.test.ts` | 仿真规则与边界 | 6/6 通过 |
| `src/ersRules.test.ts` | 2026 ERS 分段边界 | 通过 |
| `src/modelGeometry.test.ts` | 轮胎、轮距和几何边界 | 通过 |
| `src/interactionPhysics.test.ts` | 主动翼时序和 Venturi 一致性 | 通过 |
| `src/staticAssets.test.ts` | 108 图、8 MP3、哈希、引用与帧连续性 | 2/2 通过 |
| `src/coolingVisualization.test.ts` | 冷却图域和当前点 | 通过 |
| `src/simulationMath.test.ts` | 动态响应数学边界 | 通过 |
| `src/uiNumber.test.ts` | 双语数值格式 | 通过 |
| `public/audio/manifest.json` | 8 个音频 SHA-256、时长、参数和权利状态 | 新增；通过 |
| `public/audio/README.md` | 音频技术与权利记录 | 修正，不再把文件名当作许可证明 |
| `deploy/deploy-racecar-lab.sh` | 危险归档、原子发布、健康检查、回滚、保留版本 | 加固并通过 `bash -n` |
| `deploy/racecar-lab.nginx.conf` | SPA 回退、缓存、CSP、MIME、媒体缓存 | 通过本地和腾讯云 `nginx -t` |
| `README.md` | 功能、验证、部署与模型边界 | 更新 |

## 3. 图片、音频和页面清单

- 108/108 张 WebP 可完整解码，全部 RGB；引用与磁盘文件双向一致。
- SHA-256 完全重复为 0；256-bit dHash 距离小于等于 10 的近重复为 0。
- 8/8 首 MP3 均为 MPEG-1 Layer III、44.1 kHz、双声道、CBR 256 kbit/s；逐帧扫描无损坏和未读尾部。
- 主要页面/弹窗逐项检查：首屏、整车实验室、课程地图、知识问答中心、设置、语言、车型、音乐、课程学习面板、零件摘要卡、零件工程详情、零件 3D 工作台、五类详情页签、重置确认。
- 目标视口：1920×1080、1366×768、844×390、390×844、360×800、320×568；桌面布局与手机竖屏规则分离。

## 4. 最终验证结果

- `npm test`：9 个测试文件，73/73 通过。
- `npm run build`：TypeScript 与 Vite 生产构建通过。
- `npm run test:browser`：13/13 Chromium 场景通过，包含 36 套零件模型、216 子组件、四套涂装、两种车型、双语、320 px 竖屏和 WCAG 检查。
- `npm audit --omit=dev` 与 `npm audit`：0 个已知漏洞。
- `git diff --check`：通过。
- `bash -n deploy/deploy-racecar-lab.sh`：通过。
- 腾讯云候选 Nginx 配置 `nginx -t`：通过。
- 腾讯云 release `20260716T062053Z_70e49f7` 已原子部署，Nginx 为 active，公网首页与生产 JS 资源均返回 200。
- 公网 Playwright 关键回归 3/3 通过：完整视口矩阵、320×568 分区布局、Grand Prix 18 个专属总成与四套涂装。

## 5. 规则来源与边界

- [FIA 2026 Formula 1 Technical Regulations, Issue 19](https://www.fia.com/system/files/documents/fia_2026_f1_regulations_-_section_c_technical_-_iss_19_-_2026-06-25.pdf)
- [FIA Formula 1 Technical Regulations](https://www.fia.com/regulation/fia-formula-1-world-championship-technical-regulations)
- [Formula Student Germany 2026 Rules](https://www.formulastudent.de/fileadmin/user_upload/all/2026/rules/FS-Rules_2026_v1.1.pdf)
- [Formula Student Rules Portal](https://www.formulastudent.de/fsg/rules/tid/523)
- 四套涂装和车队公开规格来源见 [`docs/2026-grand-prix-model-and-livery-basis.md`](docs/2026-grand-prix-model-and-livery-basis.md)。

规则会更新；赛事合规判断必须以参赛当期官方版本和技术裁判解释为准。站内数值模型用于教学趋势与概念验证，不替代 CFD、FEA、台架标定、赛道相关性测试或认证报告。
