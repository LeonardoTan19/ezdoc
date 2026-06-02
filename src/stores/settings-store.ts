import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const SETTINGS_STORAGE_KEY = 'ezdoc-settings'

export type ColorMode = 'light' | 'dark'

export interface EditorSettings {
  fontSize: number
  lineNumbers: boolean
  wordWrap: boolean
  tabSize: number
}

export interface PreviewSettings {
  zoom: number
}

interface SettingsState {
  editorSettings: EditorSettings
  previewSettings: PreviewSettings
  autoSave: boolean
  autoSaveInterval: number

  updateEditorSettings: (settings: Partial<EditorSettings>) => void
  updatePreviewSettings: (settings: Partial<PreviewSettings>) => void
  setAutoSave: (enabled: boolean) => void
  setAutoSaveInterval: (interval: number) => void
  resetSettings: () => void
}

const DEFAULT_EDITOR: EditorSettings = {
  fontSize: 14,
  lineNumbers: true,
  wordWrap: true,
  tabSize: 2,
}

const DEFAULT_PREVIEW: PreviewSettings = {
  zoom: 100,
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      editorSettings: { ...DEFAULT_EDITOR },
      previewSettings: { ...DEFAULT_PREVIEW },
      autoSave: true,
      autoSaveInterval: 30000,

      updateEditorSettings(settings) {
        set((s) => ({ editorSettings: { ...s.editorSettings, ...settings } }))
      },

      updatePreviewSettings(settings) {
        set((s) => ({ previewSettings: { ...s.previewSettings, ...settings } }))
      },

      setAutoSave(enabled) {
        set({ autoSave: enabled })
      },

      setAutoSaveInterval(interval) {
        if (interval < 1000) return
        set({ autoSaveInterval: interval })
      },

      resetSettings() {
        set({ editorSettings: { ...DEFAULT_EDITOR }, previewSettings: { ...DEFAULT_PREVIEW }, autoSave: true, autoSaveInterval: 30000 })
      },
    }),
    { name: SETTINGS_STORAGE_KEY },
  ),
)
