import type { SubtitleItem } from './subtitle'

// ============================================================
// Editing Modes
// ============================================================

export type EditingMode =
  | 'ai_narrate'       // AI 智能解说
  | 'pure_mix'         // 纯混剪
  | 'music_beat'       // 音乐卡点
  | 'podcast'          // 播客精简
  | 'meeting'          // 会议纪要
  | 'custom'           // 全自定义

export interface ModeConfig {
  id: EditingMode
  name: string
  icon: string
  description: string
  processingSteps: string[]
}

export const EDITING_MODES: ModeConfig[] = [
  {
    id: 'ai_narrate',
    name: 'AI 智能解说',
    icon: '🎙️',
    description: '转录→理解→去冗余→高光→解说词→TTS→字幕→导出',
    processingSteps: ['transcribe', 'analyze', 'remove_silence', 'highlight', 'script', 'tts', 'subtitle', 'export'],
  },
  {
    id: 'pure_mix',
    name: '纯混剪',
    icon: '✂️',
    description: '去冗余+高光提取+转场+保留原声',
    processingSteps: ['transcribe', 'remove_silence', 'highlight', 'transitions', 'optimize_rhythm', 'subtitle', 'export'],
  },
  {
    id: 'music_beat',
    name: '音乐卡点',
    icon: '🎵',
    description: 'BPM检测→BGM匹配→按节拍切镜→变速',
    processingSteps: ['transcribe', 'bpm_detect', 'bgm_match', 'beat_cut', 'speed_ramp', 'subtitle', 'export'],
  },
  {
    id: 'podcast',
    name: '播客精简',
    icon: '🎧',
    description: '去冗余+填充词切除+保留原声',
    processingSteps: ['transcribe', 'remove_silence', 'remove_fillers', 'subtitle', 'export'],
  },
  {
    id: 'meeting',
    name: '会议纪要',
    icon: '📋',
    description: '说话人分离+关键发言提取+标题卡片',
    processingSteps: ['transcribe', 'diarize', 'key_points', 'title_cards', 'chapters', 'export'],
  },
  {
    id: 'custom',
    name: '全自定义',
    icon: '🔧',
    description: '自由勾选处理步骤',
    processingSteps: [],
  },
]
