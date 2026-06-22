import { ipcMain, app } from 'electron'
import path from 'path'
import fs from 'fs'
import ffmpeg from 'fluent-ffmpeg'
import { randomUUID } from 'crypto'
import { IPC_CHANNELS } from '../../shared/types/ipc'
import { whisperService } from '../services/whisper.service'
import type { SubtitleItem } from '../../shared/types/subtitle'

// Extract audio from video file to a temporary WAV file for whisper processing
function extractAudio(videoPath: string): Promise<string> {
  const tempDir = path.join(app.getPath('userData'), 'temp')
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true })
  const audioPath = path.join(tempDir, `whisper_aud_${randomUUID()}.wav`)

  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .output(audioPath)
      .audioCodec('pcm_s16le')
      .audioFrequency(16000)
      .audioChannels(1)
      .format('wav')
      .on('end', () => resolve(audioPath))
      .on('error', reject)
      .run()
  })
}

function isVideoFile(filePath: string): boolean {
  const videoExts = ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.flv', '.wmv', '.m4v']
  return videoExts.includes(path.extname(filePath).toLowerCase())
}

export function registerTranscriptionHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.TRANSCRIPTION_CHECK_READY, async () => {
    return whisperService.isReady()
  })

  ipcMain.handle(IPC_CHANNELS.TRANSCRIPTION_START, async (_event, filePath: string, language?: string) => {
    let audioPath = filePath
    let tempAudio: string | null = null

    try {
      // If input is a video file, extract audio first
      if (isVideoFile(filePath)) {
        tempAudio = await extractAudio(filePath)
        audioPath = tempAudio
      }

      const subtitles = await whisperService.transcribe(audioPath, language || 'zh')
      return { success: true, subtitles }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    } finally {
      // Clean up temp audio
      if (tempAudio) {
        try { fs.unlinkSync(tempAudio) } catch { /* ignore */ }
      }
    }
  })

  ipcMain.handle(IPC_CHANNELS.TRANSCRIPTION_RESULT, async (_event, subtitles: SubtitleItem[]) => {
    return {
      srt: whisperService.generateSRT(subtitles),
      withFillers: whisperService.markFillerWords(subtitles),
    }
  })

  ipcMain.handle(IPC_CHANNELS.TRANSCRIPTION_EXPORT_SRT, async (_event, subtitles: SubtitleItem[], outputPath?: string) => {
    try {
      const filePath = await whisperService.exportSRT(subtitles, outputPath)
      return { success: true, path: filePath }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })
}
