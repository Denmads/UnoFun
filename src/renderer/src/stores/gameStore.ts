import { create } from 'zustand'
import type { ClientGameState, GameSettings, GameAction, GameEvent, PublicPlayer } from '../../../shared/types'
import { DEFAULT_SETTINGS } from '../../../shared/constants'
import { handleServerMessage } from './messageHandler'

export type AppScreen = 'start' | 'name' | 'lobby' | 'game' | 'results'

export interface GameStoreState {
  // Navigation
  screen: AppScreen
  setScreen: (screen: AppScreen) => void

  // Connection
  mode: 'host' | 'join' | null
  setMode: (mode: 'host' | 'join') => void
  isConnected: boolean
  myPlayerId: string | null
  connectionError: string | null

  // Player info
  playerName: string
  unoMessage: string
  setPlayerName: (name: string) => void
  setUnoMessage: (msg: string) => void

  // Lobby
  players: PublicPlayer[]
  settings: GameSettings

  // Game state
  gameState: ClientGameState | null
  pendingAction: string | null

  // Notifications
  notification: { message: string; id: string } | null
  setNotification: (msg: string | null) => void

  // Actions
  connect: (port: number, address?: string) => Promise<void>
  disconnect: () => void
  sendAction: (action: GameAction) => void
  updateSettings: (settings: GameSettings) => void
  startGame: () => void
  returnToLobby: () => void

  // Game Events
  lastEvent: GameEvent | null
}

export const useGameStore = create<GameStoreState>((set, get) => {
  // Setup message listener
  const setupListeners = (): void => {
    window.api.onMessage((raw: string) => {
      try {
        handleServerMessage(raw, set, get)
      } catch (err) {
        console.error('Error in handleServerMessage:', err)
      }
    })

    window.api.onConnectionChange((status: string) => {
      if (status === 'disconnected') {
        set({ isConnected: false })
      } else if (status === 'error') {
        set({ isConnected: false })
      }
    })
  }

  // Call once
  if (typeof window !== 'undefined' && window.api) {
    setTimeout(setupListeners, 0)
  }

  return {
    screen: 'start',
    setScreen: (screen) => set({ screen }),

    mode: null,
    setMode: (mode) => set({ mode }),
    isConnected: false,
    myPlayerId: null,
    connectionError: null,

    playerName: localStorage.getItem('uno_playerName') || '',
    unoMessage: localStorage.getItem('uno_unoMessage') || 'UNO!',
    setPlayerName: (name) => {
      localStorage.setItem('uno_playerName', name)
      set({ playerName: name })
    },
    setUnoMessage: (msg) => {
      localStorage.setItem('uno_unoMessage', msg)
      set({ unoMessage: msg })
    },

    players: [],
    settings: structuredClone(DEFAULT_SETTINGS),

    gameState: null,
    pendingAction: null,

    notification: null,
    setNotification: (msg) => {
      set({
        notification: msg ? { message: msg, id: Math.random().toString() } : null
      })
    },

    connect: async (port: number, address?: string) => {
      const { playerName, unoMessage, mode } = get()
      try {
        if (mode === 'host') {
          const result = await window.api.hostGame(port, playerName, unoMessage)
          if (result.success) {
            set({
              isConnected: true,
              myPlayerId: result.playerId ?? null,
              connectionError: null,
              screen: 'lobby',
            })
          } else {
            set({ connectionError: result.error || 'Failed to host' })
          }
        } else {
          const fullAddress = address || `localhost:${port}`
          const result = await window.api.joinGame(fullAddress, playerName, unoMessage)
          if (result.success) {
            set({
              isConnected: true,
              connectionError: null,
              screen: 'lobby',
            })
          } else {
            set({ connectionError: result.error || 'Failed to join' })
          }
        }
      } catch (err: any) {
        set({ connectionError: err.message })
      }
    },

    disconnect: () => {
      window.api.disconnect()
      set({
        isConnected: false,
        myPlayerId: null,
        players: [],
        gameState: null,
        screen: 'start',
        mode: null,
        pendingAction: null,
          settings: structuredClone(DEFAULT_SETTINGS),
      })
    },

    sendAction: (action) => {
      window.api.sendMessage(JSON.stringify({ type: 'action', action }))
    },

    updateSettings: (settings) => {
      set({ settings })
      window.api.sendMessage(JSON.stringify({ type: 'settings', settings }))
    },

    startGame: () => {
      window.api.sendMessage(JSON.stringify({ type: 'start-game' }))
    },

    returnToLobby: () => {
      window.api.sendMessage(JSON.stringify({ type: 'return-to-lobby' }))
    },

    lastEvent: null,
  }
})
