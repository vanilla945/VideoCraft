# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**VideoCraft** — AI-powered desktop video editing app. Electron + React + TypeScript + FFmpeg. Users import footage, AI transcribes/understands/edits and outputs finished videos. Currently in early development: the editing skeleton works but AI features are not yet implemented.

## Commands

```bash
npm run dev          # Start dev (Electron + Vite HMR)
npm run build        # Production build
npm run typecheck    # TypeScript check (no emit)
```

No test runner, linter, or formatter is configured yet. Not a git repository.

## Architecture

Three-process Electron app built with `electron-vite`:

```
src/main/      — Main process (Node.js): ffmpeg, IPC handlers, file system
src/preload/   — contextBridge to expose window.api
src/renderer/  — Browser process (React 19 + Tailwind CSS 4)
src/shared/    — Types shared across all processes (path alias: @shared)
```

**IPC pattern**: Renderer calls `window.api.<module>.<method>()` via `ipcRenderer.invoke()` → Main process handles via `ipcMain.handle()` on typed channel constants defined in `src/shared/types/ipc.ts`.

**State management**: Zustand 5. Four stores: `useProjectStore`, `useMediaStore`, `useEditorStore`, `useExportStore`.

**FFmpeg pipeline** (`src/main/services/ffmpeg.service.ts`): probe → trim (stream copy) → concat demuxer → transcode with progress/cancellation. Export presets support H.264/H.265/VideoToolbox, MP4/MOV/WebM.

## Key Files

| File | Purpose |
|------|---------|
| `electron.vite.config.ts` | Build config: main/preload/renderer with path aliases |
| `src/main/index.ts` | BrowserWindow creation, IPC registration |
| `src/main/ipc/index.ts` | Registers all 4 IPC handler modules |
| `src/main/services/ffmpeg.service.ts` | All video processing (singleton) |
| `src/renderer/src/App.tsx` | Root — renders AppShell |
| `src/renderer/src/components/layout/AppShell.tsx` | Main layout: Toolbar / Sidebar / Preview / Timeline |
| `src/shared/types/project.ts` | `.vcraft` project file format (version 1.0.0) |

## Current State

**Complete**: Project CRUD, media import+probe, timeline editing, drag-drop, FFmpeg export with progress.
**Stubs**: SettingsDialog has API key inputs but save is a TODO. OnboardingWizard is defined but never rendered.
**Not started**: All AI features, tests, documentation, git, linting.

## Implementation Plan

Full plan at `/Users/tanli/.claude/plans/fuzzy-prancing-peacock.md`. 13 chapters, 7 phases (16 weeks).

**Quick reference — Phase order**:
1. AI infrastructure (.env, ModelRouter, LLM/TTS services)
2. Whisper transcription + subtitles
3. Creative input (style presets, subtitle editor, chat panel, BGM)
4. Smart editing engine (Editor/Reviewer agent loop, silence removal, beat sync)
5. TTS, image generation, draft self-review
6. Conversational AI editing
7. Polish & release (NLE export, preference learning, HTML titles, packages)

**Four model categories** (settable in Settings):
- Fast LLM → DeepSeek-V4 Flash (default)
- Heavy LLM → DeepSeek-V4 Pro (default)
- TTS → Local Edge-TTS (default, free)
- Image Gen → Minimax Image (default)

**API Keys**: via `.env` file (see `.env.example` template in plan), loaded by dotenv.

## UI Language

All current UI text is Simplified Chinese (`zh-CN`). No i18n framework in place yet.
