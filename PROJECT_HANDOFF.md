# RaceCar Lab 项目交接文档

更新时间：2026-07-16

## 0. 当前可核验状态

- GitHub：<https://github.com/ChiZhang-805/racecar-lab>
- 线上地址：<http://124.221.220.60/>
- 当前线上应用提交：`884f6d3`（`fix: restore portrait system rail layout`）
- 当前线上 release：`20260716T122642Z_884f6d3`
- 上一回滚 release：`20260716T114839Z_54c3476`
- 最终验证：Vitest `74/74`、Playwright `13/13`、TypeScript 与 Vite 生产构建通过
- 公网回归：Playwright `2/2` 通过；1440×900 与 390×844 覆盖中英文和两类车型，另以 320×568 检查 Grand Prix 极窄屏；五个系统按钮均为纵向同列、页面无横向溢出、面板无重叠陷阱、浏览器错误 `0`
- 本轮完整备份：`C:\Users\zju20\Documents\Codex\2026-07-16\yue\outputs\racecar-lab-mobile-layout-2026-07-16`

本文件之后如果仅有交接/备份类文档提交，线上应用仍对应 `884f6d3`；不要把纯文档提交误报为已重新部署的页面版本。

## 1. 项目定位

RaceCar Lab 是一个全屏交互式方程式赛车工程学习网站。用户通过代码生成的 3D 赛车、零部件拆解、工程卡片、公式实验、故障诊断、问答练习和课程地图建立赛车工程知识体系，而不是观看普通视频课程。

当前应用是纯前端静态站点：没有后端、数据库、账号、云同步、支付或 AI 接口。语言、车型、课程进度、答题记录和音乐设置保存在浏览器 `localStorage`。

## 2. 当前功能

- 两类教学车辆：基础电动方程式教学车、2026 顶级混动单座赛车。
- 每类车辆覆盖 18 个核心总成，共 36 套独立 3D 工作台、216 个可选子组件。
- 整车支持旋转、缩放、聚焦、暂停、复位、高亮、分层拆解和透视。
- 零件详情包含快速认识、工作原理、观察指南、工程师视角、常见问题、公式、实时曲线和计算案例。
- 题库共 180 道双语题；课程地图每类车辆各 8 关。
- Grand Prix 实验室右上角进入“车队技术车库”，而不是把车型入口塞回设置页。
- 四款独立研究车：Ferrari SF-26、McLaren MCL40、Mercedes W17、Red Bull RB22。
- 四车不是换色：鼻锥、驾驶舱、侧箱、进气口、发动机盖、地板导流板、扩散器、翼面、悬架拾取点和动力单元封装均由不同参数驱动。
- 四车各有鼻锥、单体壳、侧箱、发动机罩、进气箱、Halo、前后翼及翼面强调色共 10 个独立漆面区；主体使用清漆物理材质，侧箱和发动机罩图案使用贴合表面的程序化多边形。
- Ferrari 为高光红/白/黑，McLaren 为木瓜橙/无烟煤/青绿，Mercedes 为黑/银/青绿，Red Bull 为深蓝/黄/红/白；旧版 Red Bull 白色主体已按官方公开图修正。
- 390×844 竖屏使用独立 58° 相机视场角，四车的前翼、四轮和尾翼均可同时进入画面；桌面继续使用 36°。
- 手机竖屏的五个工程系统恢复为左侧纵向同列；390×844 与 320×568 均一次显示五项。移动整车总览目标高度由 `0.72` 调到 `1.05`，使赛车轻微下移；选择零件提示向右移动 `18 px`，桌面布局不受影响。
- 车库含三个整行等宽页签：车型研究、四车对比、当家车手。
- 四车对比正文已放大到 16 px、标签 12 px、车型标题 30 px；标题下两段重复说明已移除。
- 车库赛车缩略图是代码原生 SVG，包含车轮、悬架、底板、侧箱、发动机盖、驾驶舱、Halo 和前后翼，不再是简单方块堆叠。
- 2026 现役车手：Leclerc/Hamilton、Norris/Piastri、Russell/Antonelli、Verstappen/Hadjar。
- 桌面端四张车队卡同排并统一撑满可用高度，每卡上下两位车手严格等分；中英文使用同一几何规则。平板两列，手机单列并按内容自然增高、在弹窗内部滚动。
- 8 张车手照片均为本地静态资源，不依赖外站热链；作者、源页和开放许可证在界面及素材 README 中可见。
- 中英文内容完全隔离；桌面与 320–390 px 手机竖屏均有回归覆盖。

## 3. 关键文件

### 应用与界面

- `src/App.tsx`：全局状态、首屏、实验室、课程、设置、音乐和弹窗入口。
- `src/GrandPrixGarage.tsx`：四车选择、横向对比、车手页、车型 SVG、资料链接。
- `src/styles.css`：全站桌面/移动端样式和车库响应式规则。
- `src/useDialogFocus.ts`：弹窗焦点圈定、Escape 和关闭后焦点恢复。
- `src/storage.ts`：安全读写 `localStorage`。

### 车型、3D 与工程数据

- `src/CarScene.tsx`：两台整车与四款研究车的代码生成几何、镜头、拆解和高亮。
- `src/grandPrixTeams.ts`：四车公开证据、几何控制、动力单元、双语事实与来源。
- `src/grandPrixTeamLens.ts`：4×18 总成的车型证据视角和未公开边界。
- `src/grandPrixDrivers.ts`：四队八位车手、双语简介、官方资料链接、照片许可证。
- `src/ComponentWorkshop.tsx`：36 套零件 3D 工作台。
- `src/EngineeringDetail.tsx`：零件五页签课程、公式、仿真与交互容器。
- `src/data.ts`、`src/grandPrixContent.ts`：两类车辆基础内容。
- `src/engineeringData.ts`、`src/grandPrixEngineeringData.ts`：工程课程。
- `src/engineeringSim.ts`、`src/grandPrixEngineeringSim.ts`：工程仿真。
- `src/formulaExamples.ts`、`src/grandPrixFormulaExamples.ts`：108 个公式案例。
- `src/questionBank.ts`、`src/grandPrixQuestionBank.ts`：180 道题。

### 素材与依据

- `public/images/interactions/`、`public/images/cooling/`：108 张工程/故障 WebP。
- `public/images/drivers/`：8 张开放许可车手 JPG 及 `README.md` 署名表。
- `public/audio/`：8 首 MP3 及清单。
- `docs/2026-grand-prix-team-model-basis.md`：FIA 锚点、四车公开证据、车手阵容和照片许可策略。
- `AUDIT_REPORT.md`：全量工程、内容、响应式、素材和部署审计。

## 4. 工程准确性边界

- 3D 模型是代码生成的教学模型，不是制造级、认证级或车队 CAD。
- 四款研究车是基于公开资料的独立教学演绎，不是官方授权复制品。
- 公开资料没有车队内部冷却器、电芯/逆变器拓扑、完整悬架运动学、层压和控制软件；这些内容必须继续标注为“教学推演”或“未公开”，不得伪装成事实。
- 公式和仿真用于解释趋势，不替代 CFD、FEA、台架、赛道关联或赛事合规申报。
- 车手阵容和规则会变化；更新赛季时必须同步更新数据、官方链接、照片、署名、测试和本文档。
- 3D 研究车不含官方队徽或赞助商图案。开放许可纪实照片中自然出现的标志只用于识别被摄人物，不表示官方背书。

## 5. 运行、测试与构建

推荐 Node `22.12.0`，仓库有 `.nvmrc`。

```bash
npm install
npm run dev
npm test
npm run build
npm run test:browser
npm run verify
```

最终基线：

- Vitest：9 个文件、74 个测试全部通过。
- Playwright：13 个测试全部通过。
- 浏览器矩阵覆盖 1920×1080、1366×768、844×390、390×844、360×800、320×568。
- 车库额外断言三页签等宽、两段说明已移除、字号下限、SVG 结构、8 张图片解码、桌面/手机无横向溢出、左右区域不重叠，以及中英文桌面四卡等高、卡片贴合面板底部、上下两位车手等高。
- 自动 WCAG 检查覆盖首屏、实验室、设置、车库三个页签、知识中心和工程详情。

页面、布局、3D、素材或响应式变化必须运行 `npm run verify`。纯文档变化至少运行 `git diff --check`。

## 6. 部署

- 服务器：腾讯云轻量应用服务器
- SSH 别名：`lawcase-tencent`
- Nginx 站点：`/etc/nginx/conf.d/racecar-lab.conf`
- 站点根：`/var/www/racecar-lab`
- 当前软链接：`/var/www/racecar-lab/current`
- 版本目录：`/var/www/racecar-lab/releases/`
- 部署脚本：`deploy/deploy-racecar-lab.sh`
- Nginx 模板：`deploy/racecar-lab.nginx.conf`

部署脚本创建独立 release、校验归档路径和文件类型、执行 `nginx -t`、原子切换 `current`、本机健康检查、失败自动回滚，并保留最近 5 个 release。

本轮因 SSH 带宽较慢，完整 56 MB 包上传超时；最终采用经 SHA-256 校验的 4 MB 增量包，在服务器 `/tmp` 以旧健康 release 为基底复制未变化音频/工程图片，删除并替换全部 `assets/` 与 `images/drivers/`，重新打成完整归档后交给原部署脚本。合成归档通过 `tar -tzf`，线上 release 完整且可独立回滚。

车手卡等高修复采用同一策略上传 `1,727,852` 字节增量包，SHA-256 为 `fae5adc538a5d74b8cba2bcb4b581046339b84bb21c99a3be32bcde8b84c499e`；只替换 `index.html`、`favicon.svg` 和完整 `assets/`，保留已验证的音频、工程图片与 8 张车手照片。服务器合成的完整归档为 `55,906,728` 字节，SHA-256 为 `9f5fc9803af80f1910aa33c99dfbc8dc3ca1acea168a4594e74889f668173cc5`。

四队涂装升级上传 `1,730,118` 字节增量包，SHA-256 为 `403d55926172333ad838ce65188ade8b8625f62a2059eb6f4742bc924bbc1fae`；服务器从上一健康 release 重组的完整发布归档为 `55,908,035` 字节，SHA-256 为 `5d2b25857dcee999ceb4118ed31e841f418f6bf79726856fd090c72932203abf`。部署脚本生成 release `20260716T114839Z_54c3476`，保留 `20260716T104108Z_9794e7d` 为上一回滚点，Nginx 状态为 active。

手机竖屏系统栏修复上传 `1,729,457` 字节增量包，SHA-256 为 `1a9f81a816a7a0fded134688bd133a54465772ead3cf477de2386697417a0df6`；服务器从上一健康 release 重组的完整发布归档为 `55,906,670` 字节，SHA-256 为 `6456ec695e84bc7435e7183a7c05dbbad94af61e07356142593829599669e167`。部署脚本生成 release `20260716T122642Z_884f6d3`，保留 `20260716T114839Z_54c3476` 为上一回滚点，Nginx 状态为 active；公网资源为 `index-B8g0FB74.js` 与 `index-DK2wXjZp.css`。

## 7. GitHub 与发布规则

用户已明确要求每轮改动都提交到 GitHub；页面变化还必须部署。

1. 修改前执行 `git status --short --branch`。
2. 不覆盖用户或其他工作的未提交内容。
3. 只暂存本轮相关文件。
4. 运行与风险相称的测试；页面改动必须完整验证。
5. 提交并直接推送 `origin/main`（这是项目既定规则）。
6. 构建并用版本化 release 部署。
7. 公网确认首页新哈希、关键静态资源和真实浏览器交互。
8. 更新本交接文档和本轮备份。

注意：`.gitignore` 全局忽略 `*.jpg`。新增或替换车手照片时必须用明确路径 `git add -f`，并在提交后用 `git show --stat` 确认 8 个二进制文件确实进入提交；不要只看到本地构建通过就推送。

## 8. 已知风险与所有者待办

- 当前公网只有 HTTP 和 IP 地址；正式域名需要 DNS、ICP（如适用）和 HTTPS。
- 项目尚无根目录 LICENSE 与完整第三方 NOTICE。
- 8 首音频中仍有 7 首缺少完整一手下载页、作者、许可版本、下载日期和 Content ID 档案；长期公开运营前必须补齐。
- `localStorage` 进度不跨设备；清缓存或换设备会丢失。
- 无后端、账号、云同步、运营后台和 AI 接口；需要这些能力时应单独设计服务端，不要硬塞进当前纯前端结构。

## 9. 后续优先级

1. 随 FIA issue、车队公开技术图和赛季阵容更新证据文档，再调整模型/车手数据，禁止凭外观猜测保密结构。
2. 将冷却系统的高交互标准继续扩展到其他零件，并让更多实验读取当前车队公开参数。
3. 持续审查轮胎接地、悬架连杆、翼面、Halo、动力单元、冷却回路、制动和传动结构。
4. 补齐音频版权链、项目 LICENSE、第三方 NOTICE、域名和 HTTPS。
5. 如需账号和云进度，再独立设计 API、数据库与迁移方案。

## 10. 新任务接手清单

```powershell
cd C:\Users\zju20\Documents\Codex\2026-07-13\f1\outputs\racecar-lab
git status --short --branch
git log -3 --oneline
npm test
```

继续改页面或 3D 前先读：

- `PROJECT_HANDOFF.md`
- `AUDIT_REPORT.md`
- `docs/2026-grand-prix-team-model-basis.md`
- 本轮备份目录中的 `MANIFEST.sha256` 与关键截图

接手时不要只看截图；必须同时核对双语隔离、车型数据、证据等级、`localStorage` 命名空间、手机竖屏、3D 几何、静态资源许可、完整测试和线上 release 指向。

## 11. 一句话总结

RaceCar Lab 当前是一个已上线、可回滚、经过 74 个单元测试和 13 个真实浏览器测试验证的互动赛车工程学习站；四辆 2026 研究车具备独立几何、十区清漆漆面、程序化车身图案、车型/车号标识和完整竖屏构图，车队技术车库还包含大字号、三栏全宽、复杂车型 SVG 与四队八位车手，后续应继续提高公开证据质量、工程交互深度与长期发布合规性。
