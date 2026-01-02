# 🌌 3D Cyberpunk Lottery (3D 年会抽奖程序)

一个基于 **React Three Fiber** 构建的高性能、沉浸式 3D 年会抽奖应用程序。采用赛博朋克深空风格，结合电影级后期特效，为年会或活动带来极具科技感的视觉体验。

## 📸 界面预览
![GIF](/3D-抽奖.gif "3D")
| **沉浸式 3D 主界面** | **电影级中奖揭晓** |
|:---:|:---:|
| <img width="1245" height="925" alt="image" src="https://github.com/user-attachments/assets/68cd8930-013a-453c-a972-043dccc11050" /> | <img width="929" height="951" alt="image" src="https://github.com/user-attachments/assets/6550d2e7-f009-405e-9a02-dc769fa465a9" />
| 
| *全息 3D 名字球体与动态星环* | *支持多卡片布局与辉光特效* |

| **后台设置面板** | **奖项设置栏** |
|:---:|:---:|
| <img width="972" height="802" alt="image" src="https://github.com/user-attachments/assets/afaed8ce-d1c1-4c6b-a641-6397d4e32754" /> | <img width="987" height="729" alt="image" src="https://github.com/user-attachments/assets/3a409864-2aa8-4d15-8df3-1356d37fc41d" />


## ✨ 核心特性

### 🎨 极致视觉体验
- **沉浸式 3D 场景**：深空午夜蓝背景，搭配全息网格地板与动态星环系统。
- **电影级后期处理**：集成了 **Bloom (辉光)**、**Chromatic Aberration (色散)**、**Film Grain (胶片噪点)** 和 **Vignette (暗角)**，消除 3D 渲染的廉价感。
- **智能运镜系统**：摄像机在待机与抽奖状态间自动平滑过渡，配合鼠标视差特效，增强空间感。
- **高精全息标签**：基于 Canvas 动态生成的高分辨率发光名牌，支持各向异性过滤，确保任意角度清晰可见。

### ⚙️ 强大的功能配置
- **多轮次抽奖**：支持自定义奖项（特等奖、一等奖等）、奖品名称、奖品图及抽奖数量。
- **Excel 数据导入/导出**：
  - 支持 `.xlsx` 格式批量导入参与者名单。
  - 支持导出中奖名单为 Excel 表格。
  - 支持手动粘贴名单（格式：`姓名, 部门`）。
- **实时交互控制**：
  - 空格键 (`Space`) 快捷启动/停止。
  - 动态切换奖项，实时显示剩余名额。
  - 抽奖揭晓时的悬念模式（支持自定义揭晓速度）。
- **音效集成**：内置背景音乐（Loop）与中奖音效，增强现场氛围。

## 🛠️ 技术栈

- **核心框架**: [React 18](https://react.dev/) + [Vite](https://vitejs.dev/)
- **3D 引擎**: [Three.js](https://threejs.org/) + [@react-three/fiber](https://docs.pmnd.rs/react-three-fiber)
- **3D 辅助库**: [@react-three/drei](https://github.com/pmndrs/drei) + [@react-three/postprocessing](https://github.com/pmndrs/react-postprocessing)
- **UI 样式**: [TailwindCSS](https://tailwindcss.com/) + [Framer Motion](https://www.framer.com/motion/) (动画)
- **工具库**: 
  - `xlsx`: Excel 文件处理
  - `canvas-confetti`: 庆祝纸屑特效
  - `lucide-react`: 图标组件

## 🚀 快速开始

### 1. 环境准备
确保您的本地环境已安装 [Node.js](https://nodejs.org/) (推荐 v16+)。

### 2. 安装依赖

```bash
npm install
# 或者
yarn install
# 或者
pnpm install
```

### 3. 启动开发服务器

```bash
npm run dev
```

浏览器访问 `http://localhost:3000` 即可看到效果。

### 4. 构建生产版本

```bash
npm run build
```

## 📖 使用指南

### 1. 导入数据
1. 点击右下角的 **设置 (Settings)** 图标。
2. 切换到 **人员管理** 标签页。
3. **Excel 导入**：上传包含 `姓名` 和 `部门` 列的 `.xlsx` 文件。
4. **手动添加**：在文本框中输入 `姓名, 部门`（一行一个），点击添加。

### 2. 设置奖项
1. 在设置中切换到 **奖项设置**。
2. 您可以添加新奖项、修改奖品名称、设置每次抽取的名额数量以及奖项等级颜色。

### 3. 开始抽奖
1. 在主界面底部下拉框选择当前要抽取的奖项。
2. 点击中间的 **播放按钮** 或按下 **空格键** 开始滚动名字。
3. 再次点击按钮或按空格键停止，系统将根据设置的数量随机抽取获奖者。

### 4. 导出结果
抽奖结束后，在设置界面的 **中奖名单** 标签页中，点击导出 Excel 即可保存结果。

## ⌨️ 快捷键

| 按键 | 功能 |
| --- | --- |
| `Space` (空格) | 开始 / 停止抽奖 / 关闭中奖弹窗 |

## 📂 项目结构

```
src/
├── components/
│   ├── Controls.tsx        # 底部控制栏
│   ├── SettingsModal.tsx   # 设置弹窗（含Excel处理）
│   ├── TagCloud.tsx        # 3D 名字球体核心组件
│   └── WinnersOverlay.tsx  # 中奖展示弹窗
├── services/               # 业务逻辑服务
├── types.ts                # TypeScript 类型定义
├── constants.ts            # 默认数据与配置
├── App.tsx                 # 主入口与 3D 场景编排
└── index.css               # 全局样式
```

## 📜 License

MIT License
