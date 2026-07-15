# RaceCar Lab

RaceCar Lab 是一个全屏、无页面级滚动条的交互式方程式赛车工程学习站。它以两款可切换、程序化构建的 Three.js 赛车为总入口：基础电动方程式教学车和 2026 顶级混动单座赛车。每款车型都独立覆盖 18 个核心零件、18 套可拆解零件模型、108 个内部子组件、54 条工程公式、16 类实时仿真、8 关课程和 90 道综合题；全站合计 36 套零件模型、216 个子组件、108 条公式和 180 道题。

## 已实现

- 设置中可切换基础电动方程式教学车与 2026 顶级混动单座赛车
- 两款车型分别提供可旋转、缩放、聚焦、复位和暂停的整车 3D 场景
- 每款车型含 18 个可独立选择、隔离、透视和分层拆解的整车零件
- 每款车型的每个零件都有一套由 6 个可选择子组件组成的专用 3D 模型，可组装、爆炸和复位
- 每个子组件的位置、功能、机理和通俗解释
- 快速认识、工作原理、观察实验、工程师视角、故障诊断五类学习页面
- 每款车型的 18 个零件均包含 5 个可调工程实验，共 90 个实验；每个零件另有 3 张工程资料翻转卡与 3 张车型专属故障情境翻转卡
- 观察实验覆盖曲线、流路、分布、几何、场域和时序六类动态图形，参数、测量结果和风险状态实时联动
- 工程资料与故障情境使用 108 张独立工程场景图片，并支持键盘翻转、焦点返回和手机竖屏滚动阅读
- 每款车型含 54 条 KaTeX 数学公式，包含上下标、分式、希腊字母、变量边界和手工计算案例
- 每款车型含 16 类可调参数工程模型、实时指标、响应曲线和设计结论
- 每款车型的 18 个零件各有 5 道概念、计算、情境、诊断和设计题，共 90 道
- 每款车型有独立的 8 关课程地图、观察任务、关卡测验和解锁逻辑
- 中文与 English 完整隔离；车型选择、语言、课程进度和问答成绩均在本地持久化，且两款车型的数据互不串用
- 设置中提供 8 首赛车学习背景音乐、播放/暂停、顺序播放、单曲循环和随机播放；音频文件由 `public/audio/` 管理
- 键盘可访问的整车零件选择器、弹窗焦点圈定和减少动态效果支持
- 1920×1080、1366×768、844×390 和 390×844 自适应布局

## 技术结构

这是一个静态前端应用，不依赖数据库或应用后端。服务器侧只需要 Nginx 提供静态文件、缓存、安全响应头和单页回退。

- `src/App.tsx`：全局状态、课程、弹窗、进度、语言和入口逻辑
- `src/CarScene.tsx`：整车 3D 几何、18 个零件、镜头、拆解和动态场景
- `src/ComponentWorkshop.tsx`：两款车型共 36 套专用零件模型及其组装、爆炸和选择交互
- `src/componentWorkshopData.ts`、`src/grandPrixWorkshopFacts.ts`：两款车型共 216 个子组件的双语工程解释
- `src/EngineeringDetail.tsx`：五类深度学习页面、公式和实验交互
- `src/PartInteractionPanels.tsx`：非冷却零件统一的动态图形实验、工程资料卡和故障情境卡交互
- `src/aeroStructureInteractions.ts`、`src/dynamicsInteractions.ts`、`src/powerElectronicsInteractions.ts`：17 个非冷却零件的双车型实验模型、资料与故障内容
- `src/partInteractionRegistry.ts`、`src/interactionTypes.ts`：零件交互注册表、实验数据契约与通用计算工具
- `src/engineeringData.ts`、`src/grandPrixEngineeringData.ts`：两款车型各 18 套工程课程、公式、实验、诊断与参考资料
- `src/engineeringSim.ts`、`src/grandPrixEngineeringSim.ts`：两款车型各 16 类实时工程计算模型与曲线
- `src/formulaExamples.ts`、`src/grandPrixFormulaExamples.ts`：108 个双语、逐公式计算案例
- `src/KnowledgeCenter.tsx`：知识问答流程和成绩记录
- `src/questionBank.ts`、`src/grandPrixQuestionBank.ts`：两款车型各 90 道双语题目
- `src/grandPrixContent.ts`、`src/grandPrixCourses.ts`：顶级混动单座赛车的独立零件与课程内容
- `src/vehicles.ts`：车型注册、名称和存储命名空间
- `src/data.ts`：零件、课程、分类和场景的强类型主数据
- `src/i18n.ts`：完整中英文界面与内容本地化
- `src/music.ts`：背景音乐歌单、文件路径和官方来源
- `src/storage.ts`：受限浏览器与损坏数据下的安全本地存储
- `src/useDialogFocus.ts`：弹窗焦点圈定与关闭后焦点恢复
- `src/styles.css`：全屏视觉系统和响应式规则

## 本地运行

```bash
npm install
npm run dev
```

默认开发地址为 `http://localhost:4173`。

## 构建与验证

```bash
npm test
npm run build
npm run test:browser
```

- `npm test` 检查两款车型的 36 套零件模型、216 个子组件、108 条公式、180 道题、仿真有限值、语言隔离和课程映射。
- `npm run build` 执行 TypeScript 编译和 Vite 生产构建。
- `npm run test:browser` 在真实 Chromium 中检查四种目标分辨率、语言隔离、车型与课程状态、36 套 3D 模型、爆炸交互、公式、实时计算和主要界面的 WCAG 自动化规则。

构建产物位于 `dist/`。

## 当前部署

- 公网地址：`http://124.221.220.60`
- 服务器发布目录：`/var/www/racecar-lab/releases/`
- 当前版本链接：`/var/www/racecar-lab/current`
- Web 服务：Nginx
- 静态资源：gzip 与 30 天不可变缓存
- HTML：不缓存，未知路径回退到 `index.html`
- 安全：CSP、禁止 iframe、MIME 嗅探保护、权限策略和同源资源策略响应头

`work/deploy-racecar-lab.sh` 使用独立暂存目录、归档路径校验、Nginx 配置预检、原子软链接切换和失败自动回滚；它不会清理任何无关应用或目录。

当前入口使用公网 IP 和 HTTP。绑定正式域名后应再启用 HTTPS、将 HTTP 永久重定向至 HTTPS，并在可信来源上恢复 `Cross-Origin-Opener-Policy`。

## 3D 模型说明

两款整车与全部 36 套零件工作台模型目前都使用代码原生几何构建，不依赖外部 GLB，因此没有模型下载失败、跨域或第三方资源失效风险。每个零件模型固定包含 6 个与当前车型课程数据一一对应的子组件。若未来接入高精度 CAD/GLB，应保留稳定的 mesh 名称、局部坐标、选中层、爆炸向量、`VehicleId` 与 `PartId` 映射，并继续通过现有的双车型浏览器回归测试。
