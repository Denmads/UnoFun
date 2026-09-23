import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Button from '../components/ui/Button'
import Toggle from '../components/ui/Toggle'
import Slider from '../components/ui/Slider'
import { useGameStore } from '../stores/gameStore'
import { ALL_SPECIAL_CARDS, SPECIAL_CARD_LABELS, SPECIAL_CARD_TOOLTIPS, SPECIAL_CARD_ICONS, DEFAULT_SETTINGS } from '../../../shared/constants'
import type { GameSettings, PlusCardDefinition } from '../../../shared/types'
import Tooltip from '../components/ui/Tooltip'
import { useSettingsPresets } from '../hooks/useSettingsPresets'

export default function LobbyScreen() {
  const {
    mode, players, settings, myPlayerId, disconnect,
    updateSettings, startGame
  } = useGameStore()

  const [addresses, setAddresses] = useState<string[]>([])
  const [copied, setCopied] = useState(false)
  const isHost = mode === 'host'

  const { presets, savePreset, loadPreset, deletePreset } = useSettingsPresets()
  const [presetName, setPresetName] = useState('')
  const [presetsOpen, setPresetsOpen] = useState(false)
  const [overwriteTarget, setOverwriteTarget] = useState<string | null>(null)

  useEffect(() => {
    if (isHost) {
      window.api.getNetworkAddresses().then(setAddresses)
    }
  }, [isHost])

  const handleCopyAddress = (addr: string) => {
    navigator.clipboard.writeText(addr)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const updateSetting = <K extends keyof GameSettings>(key: K, value: GameSettings[K]) => {
    updateSettings({ ...settings, [key]: value })
  }

  const toggleSpecialCard = (type: string, enabled: boolean) => {
    updateSettings({
      ...settings,
      enabledSpecialCards: {
        ...settings.enabledSpecialCards,
        [type]: enabled,
      },
    })
  }

  const updatePlusCard = (index: number, patch: Partial<PlusCardDefinition>) => {
    const updated = settings.plusCards.map((pc, i) =>
      i === index ? { ...pc, ...patch } : pc
    )
    updateSettings({ ...settings, plusCards: updated })
  }

  const addPlusCard = () => {
    updateSettings({
      ...settings,
      plusCards: [...settings.plusCards, { amount: 1, isWild: false, count: 2 }],
    })
  }

  const removePlusCard = (index: number) => {
    updateSettings({
      ...settings,
      plusCards: settings.plusCards.filter((_, i) => i !== index),
    })
  }

  const resetToDefaults = () => {
    updateSettings(structuredClone(DEFAULT_SETTINGS))
  }

  const handleSavePreset = () => {
    const trimmed = presetName.trim()
    if (!trimmed) return
    if (overwriteTarget === trimmed) {
      savePreset(trimmed, settings)
      setOverwriteTarget(null)
      setPresetName('')
    } else if (presets.some((p) => p.name === trimmed)) {
      setOverwriteTarget(trimmed)
    } else {
      savePreset(trimmed, settings)
      setPresetName('')
    }
  }

  const handleLoadPreset = (name: string) => {
    const loaded = loadPreset(name)
    if (loaded) updateSettings(loaded)
  }

  return (
    <div className="h-screen bg-uno-black flex">
      {/* Left: Players */}
      <div className="w-80 bg-uno-dark border-r border-white/10 flex flex-col min-h-0">
        <div className="p-6 border-b border-white/10 shrink-0">
          <h2 className="text-2xl font-bold font-game text-white mb-1">Game Lobby</h2>
          <p className="text-sm text-gray-400 font-game">{players.length}/8 players</p>
        </div>

        {/* Connection info for host */}
        {isHost && addresses.length > 0 && (
          <div className="p-4 border-b border-white/10 shrink-0">
            <p className="text-xs text-gray-400 font-game mb-2">Share this address:</p>
            {addresses.map((addr) => (
              <button
                key={addr}
                onClick={() => handleCopyAddress(`${addr}:7777`)}
                className="w-full text-left bg-uno-surface rounded-lg px-3 py-2 mb-1
                  text-sm font-mono text-uno-accent hover:bg-uno-surface/80 transition-colors"
              >
                {addr}:7777
                <span className="text-xs text-gray-500 ml-2">
                  {copied ? '✓ copied' : '(click to copy)'}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Player list */}
        <div className="flex-1 p-4 overflow-y-auto min-h-0">
          <AnimatePresence mode="popLayout">
            {players.map((player, i) => (
              <motion.div
                key={player.id}
                layout
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className={`
                  flex items-center gap-3 p-3 rounded-xl mb-2
                  ${player.id === myPlayerId ? 'bg-uno-accent/10 border border-uno-accent/30' : 'bg-uno-surface/50'}
                `}
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold font-game shrink-0"
                  style={{
                    background: ['#ED1C24', '#0055A4', '#009A44', '#FFD600', '#E94560', '#9333EA', '#F97316', '#06B6D4'][i % 8],
                    color: i === 3 ? '#333' : 'white',
                  }}
                >
                  {player.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-game font-medium truncate">
                    {player.name}
                    {player.isHost && (
                      <span className="ml-2 text-xs text-uno-accent">👑 Host</span>
                    )}
                  </p>
                  <p className="text-xs text-gray-400 truncate">&quot;{player.unoMessage}&quot;</p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Bottom buttons */}
        <div className="p-4 border-t border-white/10 flex flex-col gap-2 shrink-0">
          <Button variant="ghost" size="sm" onClick={disconnect} className="w-full">
            ← Leave Lobby
          </Button>
        </div>
      </div>

      {/* Right: Settings + sticky start button */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Scrollable settings area */}
        <div className="flex-1 overflow-y-auto min-h-0 p-8">
          <h3 className="text-xl font-bold font-game text-white mb-6">
            ⚙️ Game Settings
            {!isHost && <span className="text-sm text-gray-400 ml-3">(host controls)</span>}
          </h3>

          <div className="grid gap-6 max-w-2xl">
            {/* Basic settings */}
            <div className="bg-uno-dark/50 rounded-xl p-5 border border-white/5">
              <h4 className="text-sm font-semibold text-gray-300 mb-4 uppercase tracking-wide">Basic Rules</h4>

              <div className="space-y-4">
                <Slider
                  label="Starting Cards"
                  value={settings.startingCards}
                  min={1}
                  max={20}
                  onChange={(v) => isHost && updateSetting('startingCards', v)}
                  disabled={!isHost}
                />

                <div className="flex items-center justify-between">
                  <Toggle
                    label="Time Limit per Turn"
                    checked={settings.timeLimitEnabled}
                    onChange={(v) => isHost && updateSetting('timeLimitEnabled', v)}
                    disabled={!isHost}
                  />
                </div>
                {settings.timeLimitEnabled && (
                  <Slider
                    label="Seconds per Turn"
                    value={settings.timeLimitSeconds}
                    min={5}
                    max={120}
                    step={5}
                    onChange={(v) => isHost && updateSetting('timeLimitSeconds', v)}
                    disabled={!isHost}
                  />
                )}

                <Toggle
                  label="Allow Challenge Wild Cards"
                  checked={settings.allowChallengeWild}
                  onChange={(v) => isHost && updateSetting('allowChallengeWild', v)}
                  disabled={!isHost}
                />

                <Toggle
                  label="Allow Stacking Same Number"
                  checked={settings.allowStackSameNumber}
                  onChange={(v) => isHost && updateSetting('allowStackSameNumber', v)}
                  disabled={!isHost}
                />

                <Toggle
                  label="Allow Continuing +Card Chains"
                  checked={settings.allowContinuePlusChain}
                  onChange={(v) => isHost && updateSetting('allowContinuePlusChain', v)}
                  disabled={!isHost}
                />

                <Toggle
                  label="Infinite Draw Pile"
                  checked={settings.infiniteDrawPile}
                  onChange={(v) => isHost && updateSetting('infiniteDrawPile', v)}
                  disabled={!isHost}
                />

                <Toggle
                  label="Only Win By Playing Your Last Card"
                  checked={settings.requireSelfPlayToWin}
                  onChange={(v) => isHost && updateSetting('requireSelfPlayToWin', v)}
                  disabled={!isHost}
                />

                <Toggle
                  label="Allow Playing a Just-Drawn Card"
                  checked={settings.allowPlayDrawnCard}
                  onChange={(v) => isHost && updateSetting('allowPlayDrawnCard', v)}
                  disabled={!isHost}
                />

                <Slider
                  label="Forget-UNO Penalty Cards"
                  value={settings.forgetUnoPenalty}
                  min={1}
                  max={10}
                  onChange={(v) => isHost && updateSetting('forgetUnoPenalty', v)}
                  disabled={!isHost}
                />
              </div>
            </div>

            {/* Plus cards — fully editable */}
            <div className="bg-uno-dark/50 rounded-xl p-5 border border-white/5">
              <h4 className="text-sm font-semibold text-gray-300 mb-4 uppercase tracking-wide">Plus Cards</h4>
              <div className="space-y-3">
                {settings.plusCards.map((pc, i) => (
                  <div key={i} className="bg-uno-surface/50 rounded-lg p-3 space-y-3">
                    <div className="flex items-center gap-3">
                      {/* Amount */}
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-gray-400 font-game w-6">+</span>
                        <input
                          type="number"
                          min={1}
                          max={20}
                          value={pc.amount}
                          onChange={(e) => isHost && updatePlusCard(i, { amount: Math.max(1, Math.min(20, Number(e.target.value) || 1)) })}
                          disabled={!isHost}
                          className="w-16 bg-uno-dark border border-white/10 rounded-md px-2 py-1
                            text-center text-sm font-bold font-game text-uno-accent
                            focus:outline-none focus:border-uno-accent disabled:opacity-50"
                        />
                      </div>

                      {/* Wild / Color toggle */}
                      <button
                        onClick={() => isHost && updatePlusCard(i, { isWild: !pc.isWild })}
                        disabled={!isHost}
                        className={`text-xs px-3 py-1 rounded-full font-game font-semibold transition-colors
                          ${pc.isWild
                            ? 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                            : 'bg-uno-red/20 text-uno-red hover:bg-uno-red/30'}
                          disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        {pc.isWild ? '🌈 Wild' : '🎨 Color'}
                      </button>

                      {/* Count */}
                      <div className="flex items-center gap-1.5 ml-auto">
                        <span className="text-xs text-gray-400 font-game">×</span>
                        <input
                          type="number"
                          min={1}
                          max={20}
                          value={pc.count}
                          onChange={(e) => isHost && updatePlusCard(i, { count: Math.max(1, Math.min(20, Number(e.target.value) || 1)) })}
                          disabled={!isHost}
                          className="w-14 bg-uno-dark border border-white/10 rounded-md px-2 py-1
                            text-center text-sm font-game text-gray-200
                            focus:outline-none focus:border-uno-accent disabled:opacity-50"
                        />
                        <span className="text-xs text-gray-500 font-game w-20">
                          {pc.isWild ? 'total' : `(${pc.count * 4} total)`}
                        </span>
                      </div>

                      {/* Remove button */}
                      {isHost && (
                        <button
                          onClick={() => removePlusCard(i)}
                          className="text-gray-500 hover:text-uno-red transition-colors p-1 rounded
                            hover:bg-uno-red/10"
                          title="Remove this plus card"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {/* Add new plus card button */}
                {isHost && (
                  <button
                    onClick={addPlusCard}
                    className="w-full py-2 border-2 border-dashed border-white/10 rounded-lg
                      text-sm font-game text-gray-400 hover:border-uno-accent/40 hover:text-uno-accent
                      transition-colors"
                  >
                    + Add Plus Card
                  </button>
                )}
              </div>
            </div>

            {/* Special cards */}
            <div className="bg-uno-dark/50 rounded-xl p-5 border border-white/5">
              <h4 className="text-sm font-semibold text-gray-300 mb-4 uppercase tracking-wide">Special Cards</h4>
              <div className="grid grid-cols-2 gap-2">
                {ALL_SPECIAL_CARDS.map((type) => (
                  <Tooltip key={type} content={SPECIAL_CARD_TOOLTIPS[type]} position="top">
                    <div className="flex items-center gap-2 bg-uno-surface/30 rounded-lg p-2.5">
                      <Toggle
                        checked={settings.enabledSpecialCards[type]}
                        onChange={(v) => isHost && toggleSpecialCard(type, v)}
                        disabled={!isHost}
                      />
                      <span className="text-base">{SPECIAL_CARD_ICONS[type]}</span>
                      <span className="text-xs text-gray-300 font-game">{SPECIAL_CARD_LABELS[type]}</span>
                    </div>
                  </Tooltip>
                ))}
              </div>
            </div>

            {/* Host-only: reset + presets */}
            {isHost && (
              <div className="bg-uno-dark/50 rounded-xl p-5 border border-white/5">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">Presets</h4>
                  <div className="flex gap-2">
                    <button
                      onClick={resetToDefaults}
                      className="text-xs px-3 py-1.5 rounded-lg font-game font-semibold
                        bg-uno-surface text-gray-300 hover:bg-red-900/40 hover:text-red-300
                        transition-colors border border-white/10"
                    >
                      ↺ Reset Defaults
                    </button>
                    <button
                      onClick={() => setPresetsOpen((v) => !v)}
                      className="text-xs px-3 py-1.5 rounded-lg font-game font-semibold
                        bg-uno-surface text-gray-300 hover:bg-uno-accent/20 hover:text-uno-accent
                        transition-colors border border-white/10"
                    >
                      {presetsOpen ? '▲ Hide Presets' : '▼ Manage Presets'}
                    </button>
                  </div>
                </div>

                <AnimatePresence>
                  {presetsOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      {/* Save current settings as preset */}
                      <div className="flex gap-2 mb-4">
                        <input
                          type="text"
                          value={presetName}
                          onChange={(e) => {
                            setPresetName(e.target.value)
                            setOverwriteTarget(null)
                          }}
                          onKeyDown={(e) => e.key === 'Enter' && handleSavePreset()}
                          placeholder="Preset name…"
                          className="flex-1 bg-uno-dark border border-white/10 rounded-lg px-3 py-1.5
                            text-sm font-game text-white placeholder-gray-500
                            focus:outline-none focus:border-uno-accent"
                        />
                        <button
                          onClick={handleSavePreset}
                          disabled={!presetName.trim()}
                          className="px-4 py-1.5 rounded-lg text-sm font-game font-semibold
                            bg-uno-accent/20 text-uno-accent hover:bg-uno-accent/30
                            disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                          {overwriteTarget === presetName.trim() ? '⚠ Overwrite?' : '💾 Save'}
                        </button>
                      </div>

                      {/* Preset list */}
                      {presets.length === 0 ? (
                        <p className="text-xs text-gray-500 font-game text-center py-3">
                          No presets saved yet.
                        </p>
                      ) : (
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {presets.map((preset) => (
                            <div
                              key={preset.name}
                              className="flex items-center gap-2 bg-uno-surface/40 rounded-lg px-3 py-2"
                            >
                              <span className="flex-1 text-sm font-game text-white truncate">
                                {preset.name}
                              </span>
                              <button
                                onClick={() => handleLoadPreset(preset.name)}
                                className="text-xs px-2.5 py-1 rounded font-game font-semibold
                                  bg-uno-accent/20 text-uno-accent hover:bg-uno-accent/30 transition-colors"
                              >
                                Load
                              </button>
                              <button
                                onClick={() => deletePreset(preset.name)}
                                className="text-xs px-2 py-1 rounded font-game
                                  text-gray-500 hover:text-red-400 hover:bg-red-900/20 transition-colors"
                                title="Delete preset"
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>

        {/* Sticky start game footer — always visible */}
        <div className="shrink-0 border-t border-white/10 bg-uno-dark/80 backdrop-blur px-8 py-4">
          <div className="max-w-2xl flex items-center gap-4">
            {isHost ? (
              <Button
                size="lg"
                onClick={startGame}
                disabled={players.length < 2}
                className="flex-1"
              >
                🎮 Start Game ({players.length}/2+ players)
              </Button>
            ) : (
              <p className="text-sm text-gray-400 font-game">
                ⏳ Waiting for host to start the game…
              </p>
            )}
            <span className="text-xs text-gray-500 font-game">
              {players.length}/8 players joined
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
