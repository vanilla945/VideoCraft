export interface SubtitleItem {
  id: string
  text: string
  startTime: number         // seconds
  endTime: number           // seconds
  confidence: number        // 0-1
  speaker?: string          // speaker label (diarization)
  isFillerWord: boolean     // 填充词标记
}

export interface SubtitleStyle {
  fontFamily: string
  fontSize: number
  fontColor: string
  backgroundColor: string
  position: 'bottom' | 'top' | 'center'
  alignment: 'left' | 'center' | 'right'
  marginBottom: number       // px
}

export const DEFAULT_SUBTITLE_STYLE: SubtitleStyle = {
  fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
  fontSize: 24,
  fontColor: '#FFFFFF',
  backgroundColor: '#00000080',
  position: 'bottom',
  alignment: 'center',
  marginBottom: 80,
}
