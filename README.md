# 🎬 VideoCraft

**AI-powered desktop video editing app.** Import your footage, let AI transcribe, understand, edit, and output finished videos — all on your local machine.

**AI 驱动的桌面视频编辑工具。** 导入已有视频素材，AI 自动理解画面内容、生成字幕/配音、智能剪辑成片。

---

## 📖 English

### Overview

VideoCraft is an **Electron + React + TypeScript** desktop application that brings AI-powered video post-production to your local machine. Unlike pure generation tools (text-to-video), VideoCraft focuses on **editing existing footage** — you provide the raw videos, AI handles the rest: transcription → understanding → script generation → TTS narration → smart editing → multi-format export.

### Features

- **🎙️ AI Transcription** — Local Whisper transcription with word-level timestamps and filler word detection
- **🧠 AI Understanding** — VLM-based scene analysis, emotion detection, and content classification
- **✂️ Smart Editing Engine** — Multi-agent pipeline (Editor Agent + Reviewer Agent) with self-review loops
- **📝 AI Script Generation** — LLM-generated narration scripts with automatic image placement marking
- **🔊 TTS Narration** — Local Edge-TTS (free) or cloud-based Minimax TTS
- **🖼️ AI Image Generation** — Auto-generate covers and B-roll images via Minimax Image
- **🎵 Automatic BGM** — System auto-matches background music, or import your own
- **💬 Conversational Editing** — Chat with AI to edit: "speed up section 3", "add fade transitions"
- **📦 Multi-format Export** — 480p~4K, landscape/portrait/square, MP4/WAV/MP3/SRT, batch export presets
- **🎨 12 Style Presets** — Product launch, tutorial, vlog, douyin commerce, and more — one-click apply
- **🔐 Local-first** — Whisper.cpp + Edge-TTS run locally; API keys via `.env` file, never leave your machine

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Desktop | Electron 28 |
| Frontend | React 19 + TypeScript + Tailwind CSS 4 |
| State | Zustand 5 |
| Video | fluent-ffmpeg + whisper.cpp (local) |
| AI - Fast LLM | DeepSeek-V4 Flash (default) |
| AI - Heavy LLM | DeepSeek-V4 Pro (default) |
| AI - TTS | Edge-TTS (free, default) / Minimax TTS |
| AI - Vision | DeepSeek-VL2 / Minimax-VL-01 |
| AI - Image | Minimax Image |

### Quick Start

```bash
# 1. Clone
git clone https://github.com/vanilla945/VideoCraft.git
cd VideoCraft

# 2. Install
npm install

# 3. Configure API Keys
cp .env.example .env
# Edit .env with your API keys (DeepSeek, Minimax, Kimi optional)

# 4. Run
npm run dev
```

### Project Structure

```
src/
├── main/           # Main process (Node.js) — services, IPC handlers
│   ├── ipc/        # IPC handlers (project, media, export, settings, transcription, AI)
│   └── services/   # 25+ services (LLM, TTS, Whisper, Vision, BGM, editing engine, etc.)
├── preload/        # contextBridge → window.api
├── renderer/       # Browser process (React 19)
│   ├── components/ # AI panels, editor, export, layout, settings
│   └── stores/     # Zustand stores (project, media, editor, export, subtitle, AI)
└── shared/types/   # Shared TypeScript types
```

### AI Pipeline (6 Stages)

```
Stage 1: Media Analysis → ffprobe + scene detection + keyframe extraction
Stage 2: Transcription  → whisper.cpp → SRT subtitles + filler word marking
Stage 3: AI Understanding → VLM scene analysis + creative input (12 presets, 6 modes)
Stage 4: Smart Editing   → Editor Agent (EDL) → Reviewer Agent (self-review) → user preview
Stage 5: Post Enhancement → Script + TTS + Image Gen + Draft self-review + Color Grade
Stage 6: Export          → Multi-format batch export (480p~4K, MP4/WAV/MP3/SRT)
```

### Four Configurable Model Categories

| Category | Default | Alternatives |
|----------|---------|-------------|
| Fast LLM | DeepSeek-V4 Flash | Minimax-M3 |
| Heavy LLM | DeepSeek-V4 Pro | Minimax-M3 |
| TTS | Local Edge-TTS (free) | Minimax TTS / DeepSeek TTS |
| Image Gen | Minimax Image | Off |

All configurable in Settings → models, providers, API keys via `.env`.

---

## 📖 中文

### 项目概述

VideoCraft 是一款基于 **Electron + React + TypeScript** 的桌面端 AI 视频后期处理工具。与纯生成类项目（文生视频）不同，VideoCraft 聚焦于**已有素材的 AI 后期处理**——你提供原始视频，AI 完成转录→理解→文案→配音→智能剪辑→多格式导出全流程，所有核心处理均在本地完成。

### 功能特性

- **🎙️ AI 语音转录** — 本地 Whisper 转录，词级时间戳，自动标记填充词
- **🧠 AI 视觉理解** — VLM 场景分析，情绪检测，内容分类
- **✂️ 智能剪辑引擎** — 多 Agent 协作（Editor Agent + Reviewer Agent），含自检循环
- **📝 AI 脚本生成** — LLM 自动撰写解说词，智能标记配图位置
- **🔊 TTS 配音** — 本地 Edge-TTS（免费）或云端 Minimax TTS
- **🖼️ AI 图像生成** — Minimax Image 自动生成封面和 B-roll 配图
- **🎵 背景音乐** — 系统自动匹配 BGM，也支持导入本地音乐
- **💬 对话式编辑** — 与 AI 自然对话编辑视频："把第三段加速""添加淡入淡出"
- **📦 多格式导出** — 480p~4K，横屏/竖屏/方形，MP4/WAV/MP3/SRT，预设批量导出
- **🎨 12 种风格预设** — 产品发布会、教程/课程、Vlog、抖音带货等，一键选用
- **🔐 本地优先** — whisper.cpp + Edge-TTS 本地运行；API Key 走 `.env`，数据不离开本机

### 技术栈

| 层级 | 技术 |
|------|------|
| 桌面框架 | Electron 28 |
| 前端 | React 19 + TypeScript + Tailwind CSS 4 |
| 状态管理 | Zustand 5 |
| 视频处理 | fluent-ffmpeg + whisper.cpp (本地) |
| AI - 简单快速模型 | DeepSeek-V4 Flash (默认) |
| AI - 深度理解模型 | DeepSeek-V4 Pro (默认) |
| AI - TTS | Edge-TTS (免费默认) / Minimax TTS |
| AI - 视觉理解 | DeepSeek-VL2 / Minimax-VL-01 |
| AI - 图像生成 | Minimax Image |

### 快速开始

```bash
# 1. 克隆仓库
git clone https://github.com/vanilla945/VideoCraft.git
cd VideoCraft

# 2. 安装依赖
npm install

# 3. 配置 API Key
cp .env.example .env
# 编辑 .env，填入 DeepSeek、Minimax 的 API Key（Kimi 可选）

# 4. 启动开发环境
npm run dev
```

### 项目结构

```
src/
├── main/           # 主进程 (Node.js) — 25+ 服务模块、IPC 处理器
│   ├── ipc/        # IPC 处理（项目/媒体/导出/设置/转录/AI）
│   └── services/   # 服务层（LLM/TTS/Whisper/Vision/BGM/剪辑引擎 等）
├── preload/        # contextBridge → window.api
├── renderer/       # 渲染进程 (React 19)
│   ├── components/ # AI 面板、编辑器、导出、布局、设置
│   └── stores/     # Zustand 状态管理（项目/媒体/编辑器/导出/字幕/AI）
└── shared/types/   # 共享 TypeScript 类型
```

### AI 管线（6 阶段）

```
阶段 1: 媒体分析 → ffprobe 元数据 + 场景检测 + 关键帧提取
阶段 2: 语音转录 → whisper.cpp → SRT 字幕 + 填充词标记
阶段 3: AI 理解   → VLM 场景分析 + 创意输入（12 预设、6 模式）
阶段 4: 智能剪辑 → Editor Agent (EDL) → Reviewer Agent (自检) → 用户预览
阶段 5: 后期增强 → 脚本生成 + TTS + 图像生成 + 草稿自审 + 调色
阶段 6: 导出     → 多格式批量导出 (480p~4K, MP4/WAV/MP3/SRT)
```

### 四类可配置模型

| 类别 | 默认方案 | 可选方案 |
|------|---------|---------|
| 简单快速模型 | DeepSeek-V4 Flash | Minimax-M3 |
| 深度理解模型 | DeepSeek-V4 Pro | Minimax-M3 |
| TTS 模型 | 本地 Edge-TTS (免费) | Minimax TTS / DeepSeek TTS |
| 图像生成 | Minimax Image (默认开启) | 关闭 |

所有模型在「设置」中可自由切换供应商和型号，API Key 通过 `.env` 文件配置。

### 开发命令

```bash
npm run dev        # 启动开发环境 (Electron + Vite HMR)
npm run build      # 生产构建
npm run typecheck  # TypeScript 类型检查（不生成输出）
```

### 许可证

ISC

### 实施计划

完整计划书（13 章，7 Phase，16 周）见 `CLAUDE.md` 中引用的计划文件。
