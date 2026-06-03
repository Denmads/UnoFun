import type { ServerMessage, GameEvent } from '../../../shared/types'
import type { GameStoreState } from './gameStore'

type SetState = (partial: Partial<GameStoreState>) => void
type GetState = () => GameStoreState

export function handleServerMessage(
  raw: string,
  set: SetState,
  get: GetState
): void {
  let msg: ServerMessage
  try {
    msg = JSON.parse(raw) as ServerMessage
  } catch {
    return
  }

  switch (msg.type) {
    case 'joined':
      set({
        myPlayerId: get().myPlayerId || msg.playerId,
        players: msg.players,
        settings: msg.settings,
      })
      break

    case 'player-joined':
      set({ players: [...get().players, msg.player] })
      break

    case 'player-left':
      set({ players: get().players.filter(p => p.id !== msg.playerId) })
      break

    case 'settings-updated':
      set({ settings: msg.settings })
      break

    case 'game-started':
      set({ screen: 'game' })
      break

    case 'return-to-lobby':
      set({
        screen: 'lobby',
        gameState: null,
        pendingAction: null,
        settings: msg.settings,
      })
      break

    case 'game-event':
      handleGameEvent(msg.event, set, get)
      break

    case 'kicked':
      set({
        isConnected: false,
        screen: 'start',
        connectionError: msg.reason,
      })
      break

    case 'error':
      set({ connectionError: msg.message })
      break
  }
}

function handleGameEvent(
  event: GameEvent,
  set: SetState,
  get: GetState
): void {
  set({ lastEvent: event })

  switch (event.type) {
    case 'state-update':
      set({
        gameState: event.state,
        players: event.state.players,
        settings: event.state.settings,
      })

      if (event.state.phase === 'results') {
        set({ screen: 'results' })
      }
      break

    case 'uno-called': {
      const caller = get().players.find(p => p.id === event.playerId)
      const notification = `${caller?.name ?? 'Player'} says: ${event.message}`
      set({ notification: { message: notification, id: Math.random().toString() } })
      break
    }

    case 'color-picked':
      set({ pendingAction: null })
      break

    case 'player-won':
      set({ screen: 'results' })
      break
  }
}
