import { useState, useCallback } from 'react'
import type { GameSettings } from '../../../shared/types'
import { DEFAULT_SETTINGS } from '../../../shared/constants'

const STORAGE_KEY = 'uno_settings_presets'

export interface SettingsPreset {
  name: string
  settings: GameSettings
}

function loadFromStorage(): SettingsPreset[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw) as SettingsPreset[]
  } catch {
    return []
  }
}

function saveToStorage(presets: SettingsPreset[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(presets))
}

export function useSettingsPresets() {
  const [presets, setPresets] = useState<SettingsPreset[]>(loadFromStorage)

  const savePreset = useCallback((name: string, settings: GameSettings) => {
    setPresets((prev) => {
      const existing = prev.findIndex((p) => p.name === name)
      const updated =
        existing >= 0
          ? prev.map((p, i) => (i === existing ? { name, settings: structuredClone(settings) } : p))
          : [...prev, { name, settings: structuredClone(settings) }]
      saveToStorage(updated)
      return updated
    })
  }, [])

  const loadPreset = useCallback(
    (name: string): GameSettings | null => {
      const preset = presets.find((p) => p.name === name)
      if (!preset) return null
      // Merge over defaults so any new setting keys introduced later always have a value
      return { ...structuredClone(DEFAULT_SETTINGS), ...structuredClone(preset.settings) }
    },
    [presets]
  )

  const deletePreset = useCallback((name: string) => {
    setPresets((prev) => {
      const updated = prev.filter((p) => p.name !== name)
      saveToStorage(updated)
      return updated
    })
  }, [])

  return { presets, savePreset, loadPreset, deletePreset }
}
