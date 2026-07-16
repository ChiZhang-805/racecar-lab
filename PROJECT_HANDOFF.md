# RaceCar Lab 项目交接文档

更新时间：2026-07-16

当前仓库：<https://github.com/ChiZhang-805/racecar-lab>

当前线上地址：<http://124.221.220.60/>

当前应用基线提交：`70e49f7`

当前线上 release：`20260716T062053Z_70e49f7`

## 1. 项目定位

RaceCar Lab 是一个交互式方程式赛车工程学习网站。目标不是做传统视频课程，而是让用户通过 3D 赛车、零部件拆解、工程卡片、公式实验、问答练习和课程地图，从小白逐步建立赛车工程知识体系。

当前项目是一个纯前端静态应用，没有数据库、账号系统、后端 API 或服务端业务逻辑。所有核心交互都在浏览器中完成，学习进度、语言、车型、音乐设置等状态保存在浏览器本地存储中。

## 2. 当前功能状态

已完成的主要功能：

- 首屏 3D 赛车入口，支持中文和英文界面。
- 两种车型切换：基础电动方程式教学车、顶级混动方程式赛车。
- 顶级混动车型提供四套可持久化的原创教学涂装：Ferrari、McLaren、Mercedes、Red Bull 风格；仅使用公开配色与造型语言，不含车队标志或赞助商素材。
- 整车 3D 交互：旋转、暂停、复原、车型切换、部件高亮、分层拆解、透视。
- 每款车型覆盖 18 个核心零部件。
- 每个零部件有摘要卡片，可进入详细资料。
- 每个零部件详情包含五个板块：快速认识、工作原理、观察指南、工程师视角、常见问题。
- 每个零部件都有独立 3D 子模型工作台，支持子结构点击、拆解和复原。
- 每个零部件有公式、参数滑块、实时曲线、计算案例和工程解释。
- 知识问答中心，按车型、系统、零部件组织题目。
- 课程地图，包含 8 个学习关卡。
- 设置面板，包含语言、车型、音乐和清空学习进度。
- 背景音乐支持 8 首 MP3，支持播放、暂停、顺序播放、单曲循环、随机播放。
- 桌面端和手机竖屏均做过专项适配；320×568 下导航、课程、零件信息和场景控制分区可达，不再互相覆盖。
- 部署在腾讯云轻量服务器，通过 Nginx 提供静态文件。

## 3. 技术架构

技术栈：

- React 19
- TypeScript
- Vite
- Three.js
- React Three Fiber
- Drei
- KaTeX
- Lucide React
- Vitest
- Playwright
- Nginx

应用结构：

```text
浏览器
  -> 加载 HTML/CSS/JS
  -> 加载图片、音频和代码生成的 3D 几何
  -> React 管理界面状态
  -> Three.js 渲染整车和零部件模型
  -> localStorage 保存语言、车型、学习进度和音乐设置
```

当前没有：

- 后端服务
- 数据库
- 用户注册或登录
- 云端进度同步
- 后台管理系统
- 支付、会员、权限系统
- AI 问答接口

如果后续要做账号、云端学习记录、后台题库、AI 问答、用户成绩统计，应新增后端，建议独立设计 API 和数据库，不要硬塞进当前纯前端结构。

## 4. 关键目录和文件

根目录重要文件：

- `README.md`：项目功能、运行、构建、部署说明。
- `AUDIT_REPORT.md`：最近一轮全量审计报告。
- `PROJECT_HANDOFF.md`：当前交接文档。
- `package.json`：脚本和依赖。
- `vite.config.ts`：Vite 构建配置。
- `playwright.config.ts`：浏览器回归测试配置。
- `deploy/deploy-racecar-lab.sh`：服务器部署脚本。
- `deploy/racecar-lab.nginx.conf`：Nginx 站点配置。

核心源码：

- `src/App.tsx`：主应用状态、首屏、实验室、课程地图、设置、音乐和弹窗入口。
- `src/CarScene.tsx`：整车 3D 场景、车型几何、零件高亮、拆解、透视、镜头。
- `src/ComponentWorkshop.tsx`：零部件详情中的独立 3D 工作台。
- `src/EngineeringDetail.tsx`：零部件五个学习板块的主容器。
- `src/CoolingInteractionPanels.tsx`：冷却系统专门交互面板，目前是观察指南、工程师视角、常见问题的质量标杆。
- `src/PartInteractionPanels.tsx`：其他零部件复用的交互面板。
- `src/KnowledgeCenter.tsx`：知识问答中心。
- `src/styles.css`：全站视觉、桌面端、手机端、弹窗、卡片和响应式规则。
- `src/grandPrixLiveries.ts`：四套 Grand Prix 教学涂装的双语元数据、配色、材质参数、官方公开来源与合法 ID 校验。

数据和模型：

- `src/data.ts`：基础教学车零部件、系统、课程等主数据。
- `src/grandPrixContent.ts`：顶级混动方程式赛车内容。
- `src/engineeringData.ts`：基础教学车工程详情数据。
- `src/grandPrixEngineeringData.ts`：顶级混动车型工程详情数据。
- `src/engineeringSim.ts`：基础教学车工程仿真。
- `src/grandPrixEngineeringSim.ts`：顶级混动车型工程仿真。
- `src/formulaExamples.ts`：基础教学车公式计算案例。
- `src/grandPrixFormulaExamples.ts`：顶级混动车型公式计算案例。
- `src/questionBank.ts`：基础教学车题库。
- `src/grandPrixQuestionBank.ts`：顶级混动车型题库。
- `src/componentWorkshopData.ts`：基础教学车零部件子结构解释。
- `src/grandPrixWorkshopFacts.ts`：顶级混动车型零部件子结构解释。
- `src/aeroStructureInteractions.ts`：空气动力学和结构类交互数据。
- `src/dynamicsInteractions.ts`：车辆动力学类交互数据。
- `src/powerElectronicsInteractions.ts`：动力、电驱、电子类交互数据。
- `src/coolingInteractions.ts`：冷却系统交互数据。
- `src/partInteractionRegistry.ts`：零部件交互注册表。
- `src/interactionTypes.ts`：交互数据类型。
- `src/modelGeometry.ts`：3D 模型通用几何常量和工具。
- `docs/2026-grand-prix-model-and-livery-basis.md`：2026 FIA 尺寸锚点、四支车队公开资料、建模依据与知识产权边界。

本地状态和可访问性：

- `src/storage.ts`：localStorage 安全读写。
- `src/useDialogFocus.ts`：弹窗焦点圈定和关闭后焦点恢复。
- `src/uiNumber.ts`：中英文数字格式化。
- `src/i18n.ts`：界面语言文案。
- `src/music.ts`：音乐列表和音频路径。
- `src/vehicles.ts`：车型注册、车型 ID 和本地存储命名空间。
- Grand Prix 涂装使用独立键 `racecar-lab-grand-prix-livery`，读取时会校验并回退到默认值。

资源：

- `public/audio/`：8 首 MP3 和 `manifest.json`。
- `public/images/cooling/`：冷却系统工程资料和故障图片。
- `public/images/interactions/`：其他零部件资料和故障图片。
- `public/favicon.svg`：站点图标。

测试：

- `src/dataIntegrity.test.ts`
- `src/engineeringSimulation.test.ts`
- `src/interactionPhysics.test.ts`
- `src/modelGeometry.test.ts`
- `src/staticAssets.test.ts`
- `src/coolingVisualization.test.ts`
- `src/simulationMath.test.ts`
- `src/uiNumber.test.ts`
- `tests/app.spec.ts`

## 5. 运行、测试和构建

推荐 Node 版本：`22.12.0`，仓库内有 `.nvmrc`。

安装依赖：

```bash
npm install
```

开发运行：

```bash
npm run dev
```

构建：

```bash
npm run build
```

单元测试：

```bash
npm test
```

浏览器回归测试：

```bash
npm run test:browser
```

全量验证：

```bash
npm run verify
```

2026-07-16 完整基线：Vitest 73/73，Playwright 13/13；浏览器矩阵覆盖 1920×1080、1366×768、844×390、390×844、360×800、320×568。

如果只改文档，通常不需要重新构建线上页面；如果改了 `src/`、`public/`、`index.html`、配置或部署文件，必须至少运行：

```bash
npm test
npm run build
```

影响布局、交互、3D、手机端或弹窗时，还必须运行：

```bash
npm run test:browser
```

## 6. 部署信息

当前服务器：

- 云厂商：腾讯云轻量应用服务器
- 公网 IP：`124.221.220.60`
- SSH 别名：`lawcase-tencent`
- Web 服务：Nginx
- 站点根目录：`/var/www/racecar-lab`
- 当前软链接：`/var/www/racecar-lab/current`
- 发布目录：`/var/www/racecar-lab/releases/`
- Nginx 配置：`/etc/nginx/conf.d/racecar-lab.conf`
- 已部署 release：`/var/www/racecar-lab/releases/20260716T062053Z_70e49f7`
- 上一版回滚 release：`/var/www/racecar-lab/releases/20260716T015146Z_d6e2e45`

部署脚本：

```text
deploy/deploy-racecar-lab.sh
```

脚本特性：

- 使用压缩包发布 `dist/`。
- 每次发布创建独立 release 目录。
- 原子切换 `current` 软链接。
- 部署前执行 `nginx -t`。
- 部署后访问本机 `http://127.0.0.1/` 做健康检查。
- 失败时自动回滚 Nginx 配置和上一版 release。
- 默认保留最近 5 个 release。

如果后续绑定域名，需要改：

- `deploy/racecar-lab.nginx.conf` 里的 `server_name`
- 服务器上的 DNS 解析
- HTTPS 证书和 HTTP 到 HTTPS 重定向
- 页面或页脚中的备案号信息，前提是 ICP 备案已完成

## 7. GitHub 和发布规则

用户已明确要求：每一次改动都要提交到 GitHub，并且涉及线上页面的改动要部署到服务器。

执行规则：

- 修改前先看 `git status --short --branch`。
- 不要覆盖用户或其他 agent 的未提交改动。
- 只 stage 本次任务相关文件。
- 提交信息简洁说明本次改动。
- 推送到 `origin/main`。
- 如果改动影响线上页面，构建并部署到腾讯云。
- 部署后访问 `http://124.221.220.60/` 做基本验证。

当前远程仓库：

```text
origin https://github.com/ChiZhang-805/racecar-lab.git
```

GitHub 仓库右侧 About 区域建议填写网站地址：

```text
http://124.221.220.60/
```

## 8. 产品和设计要求

用户偏好非常明确，后续接手时要遵守：

- 主打交互式学习，不做普通视频课页面。
- 尽量一屏式体验，桌面端避免页面级滚动条。
- 手机竖屏允许弹窗内部滚动，但不要横向溢出。
- 不要添加不必要的小字说明。
- 能用图标表达的地方优先用图标。
- 中文和英文必须完全隔离，不要同屏混用。
- 英文长词不能挤出卡片或换成奇怪的两行。
- 设置、关闭、首页、复原、暂停等按钮尽量用图标，hover tooltip 可以保留。
- 桌面端布局稳定后，手机端改动必须用 media query 或局部响应式规则隔离，不要破坏桌面端。
- 所有卡片要减少空白，优先用图形、图表、翻转卡、参数实验、3D 子模型提升交互性。
- 3D 模型不能只是好看，要符合基本物理常识和赛车工程逻辑。
- 任何新增赛车知识、公式、规则，都要尽量对照官方规则或专业资料。

## 9. 当前内容标准

目前冷却系统的三个后续板块是用户认可的参考标准：

- 观察指南：多个实验入口、可调参数、系统图变化、数据和工程结论联动。
- 工程师视角：用工程资料卡片、取舍图、验证链路和指标图表达，而不是堆文字。
- 常见问题：用故障情境、诊断图、根因选择、排查步骤和诊断结论表达。

后续如果要继续提升其他零部件，应以冷却系统这一套交互密度为参考，而不是只增加文字。

## 10. 已知边界和风险

工程模型边界：

- 当前 3D 模型是代码生成的教学模型，不是制造级 CAD。
- 四套车队风格涂装是基于公开资料的无标志原创教学演绎，不是官方车队资产或一比一复制品。
- 公开资料不包含车队保密 CAD、完整内部布局或制造数据；不得将当前模型描述为官方、授权或制造级复刻。
- 公式、仿真和参数用于教学趋势展示，不替代 CFD、FEA、台架标定、赛道测试或赛事合规报告。
- F1/方程式规则会更新，涉及规则限值时必须重新核对官方最新版。

音频风险：

- 8 首 MP3 已放入 `public/audio/`。
- 其中部分音频的一手下载页和许可证记录尚未完全补齐。
- 正式公开长期运营前，应补全每首音频的来源 URL、作者、许可证、下载日期和再分发权限。

部署风险：

- 当前是 HTTP 和公网 IP 访问。
- 绑定中国大陆服务器域名后，必须走 ICP 备案。
- 正式域名上线应启用 HTTPS。
- 如果改 CSP、资源路径、缓存策略，必须做线上回归。

前端状态风险：

- 进度和设置保存在本地浏览器中，不跨设备同步。
- 清浏览器缓存或换设备会丢失本地学习进度。
- 如果未来做账号系统，需要迁移 localStorage 数据模型。

## 11. 后续优先级建议

建议按这个顺序继续：

1. 继续把冷却系统的高交互标准推广到所有零部件。
2. 每完成一批零部件，跑单元测试和浏览器截图，重点看手机竖屏。
3. 继续审查 3D 模型，尤其是轮胎接地、悬架连杆、翼面角度、Halo、动力单元、冷却回路、制动和传动结构。
4. 补齐音频版权记录。
5. 购买并备案域名，绑定 Nginx，配置 HTTPS。
6. 如需要用户系统，再单独设计后端，不要在当前纯前端里临时拼接。

## 12. 新聊天框接手建议

新聊天框开始工作时，建议先执行：

```bash
cd C:\Users\zju20\Documents\Codex\2026-07-13\f1\outputs\racecar-lab
git status --short --branch
npm test
```

如果要改界面或 3D：

```bash
npm run build
npm run test:browser
```

如果要部署：

1. 确认本地构建通过。
2. 提交并推送 GitHub。
3. 生成 `dist/` 压缩包。
4. 上传压缩包和 Nginx 配置到服务器。
5. 运行 `deploy/deploy-racecar-lab.sh`。
6. 验证线上 `http://124.221.220.60/`。

接手时不要只看页面截图。需要同时检查：

- 数据文件是否双语完整。
- 车型隔离是否正确。
- localStorage key 是否带车型或功能命名空间。
- 手机竖屏是否溢出。
- 桌面端是否仍是一屏式体验。
- 3D 几何是否符合基本工程常识。
- 公式是否用 KaTeX 表达上下标、分式和希腊字母。
- 测试是否覆盖新增数据和边界。

## 13. 一句话总结

RaceCar Lab 当前是一个已上线的纯前端交互式赛车工程学习站，核心价值在 3D 拆解、零部件深度卡片、公式实验和问答训练。后续工作重点不是重新搭架构，而是在现有架构内继续提高每个零部件的交互深度、工程准确性、手机适配和长期上线合规性。
