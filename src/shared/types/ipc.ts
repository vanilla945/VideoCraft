export const IPC_CHANNELS = {
  PROJECT_CREATE: 'project:create',
  PROJECT_SAVE: 'project:save',
  PROJECT_LOAD: 'project:load',
  PROJECT_GET_RECENT: 'project:get-recent',

  MEDIA_IMPORT: 'media:import',
  MEDIA_PROBE: 'media:probe',
  MEDIA_EXTRACT_THUMBNAIL: 'media:extract-thumbnail',
  MEDIA_EXTRACT_KEYFRAMES: 'media:extract-keyframes',

  EXPORT_START: 'export:start',
  EXPORT_CANCEL: 'export:cancel',
  EXPORT_PROGRESS: 'export:progress',

  DIALOG_OPEN_FILE: 'dialog:open-file',
  DIALOG_SAVE_FILE: 'dialog:save-file',
  APP_GET_PATH: 'app:get-path',

  SETTINGS_GET_CONFIG: 'settings:get-config',
  SETTINGS_GET_KEY_STATUS: 'settings:get-key-status',
  SETTINGS_UPDATE_MODEL: 'settings:update-model',

  TRANSCRIPTION_START: 'transcription:start',
  TRANSCRIPTION_RESULT: 'transcription:result',
  TRANSCRIPTION_EXPORT_SRT: 'transcription:export-srt',
  TRANSCRIPTION_CHECK_READY: 'transcription:check-ready',

  AI_EDIT_RUN: 'ai:edit-run',
  AI_EDIT_PREVIEW: 'ai:edit-preview',
  AI_CHAT_SEND: 'ai:chat-send',
  AI_CHAT_PARSE: 'ai:chat-parse',

  APP_CLEAR_CACHE: 'app:clear-cache',
  APP_GET_CACHE_SIZE: 'app:get-cache-size'
} as const
