import { WebSocketServer, WebSocket } from 'ws'
import { v4 as uuidv4 } from 'uuid'
import type {
  GameState, GameSettings, Player, ClientMessage, ServerMessage,
  GameEvent, Card, CardColor
} from '../../shared/types'
import { DEFAULT_SETTINGS, MAX_PLAYERS } from '../../shared/constants'
import { generateDeck } from '../../shared/cards'
import {
  processAction, toPublicPlayer, toClientState, initializeGame,
  advanceTurn, drawCards
} from '../../shared/rules'
import { serializeMessage, deserializeClientMessage } from '../../shared/protocol'

interface ClientConnection {
  ws: WebSocket
  playerId: string
}

export class GameServer {
  private wss: WebSocketServer | null = null
  private clients: Map<string, ClientConnection> = new Map()
  private state: GameState
  private hostId: string | null = null
  private turnTimer: NodeJS.Timeout | null = null
  private onEvent: ((event: string, data?: unknown) => void) | null = null

  constructor() {
    this.state = this.createInitialState()
  }

  setEventHandler(handler: (event: string, data?: unknown) => void): void {
    this.onEvent = handler
  }

  private createInitialState(): GameState {
    return {
      phase: 'lobby',
      players: [],
      currentPlayerIndex: 0,
      direction: 'clockwise',
      drawPile: [],
      discardPile: [],
      currentColor: 'red',
      plusChain: null,
      winnerId: null,
      settings: structuredClone(DEFAULT_SETTINGS),
      turnStartTime: null,
      hasDrawnCardThisTurn: false,
      awaitingResolution: false,
    }
  }

  start(port: number): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.wss = new WebSocketServer({ port })

        this.wss.on('listening', () => {
          this.emit('status', 'listening')
          resolve()
        })

        this.wss.on('connection', (ws) => {
          this.handleConnection(ws)
        })

        this.wss.on('error', (err) => {
          this.emit('error', err.message)
          reject(err)
        })
      } catch (err) {
        reject(err)
      }
    })
  }

  stop(): void {
    this.clearTurnTimer()
    for (const [, client] of this.clients) {
      client.ws.close()
    }
    this.clients.clear()
    this.wss?.close()
    this.wss = null
    this.state = this.createInitialState()
    this.hostId = null
  }

  addLocalPlayer(name: string, unoMessage: string): string {
    const playerId = uuidv4()
    const player: Player = {
      id: playerId,
      name,
      unoMessage,
      hand: [],
      isHost: true,
      isConnected: true,
      calledUno: false,
    }
    this.state.players.push(player)
    this.hostId = playerId
    this.broadcastPlayerList()
    return playerId
  }

  handleLocalAction(action: ClientMessage): void {
    if (!this.hostId) return
    this.processClientMessage(this.hostId, action)
  }

  getState(): GameState {
    return this.state
  }

  getSettings(): GameSettings {
    return this.state.settings
  }

  private handleConnection(ws: WebSocket): void {
    const connectionId = uuidv4()

    ws.on('message', (data) => {
      const raw = data.toString()
      const msg = deserializeClientMessage(raw)
      if (!msg) return

      if (msg.type === 'join') {
        this.handleJoin(connectionId, ws, msg.name, msg.unoMessage)
        return
      }

      const client = this.clients.get(connectionId)
      if (client) {
        this.processClientMessage(client.playerId, msg)
      }
    })

    ws.on('close', () => {
      const client = this.clients.get(connectionId)
      if (client) {
        this.handleDisconnect(client.playerId)
        this.clients.delete(connectionId)
      }
    })

    ws.on('error', () => {
      ws.close()
    })
  }

  private handleJoin(connectionId: string, ws: WebSocket, name: string, unoMessage: string): void {
    if (this.state.players.length >= MAX_PLAYERS) {
      this.sendTo(ws, { type: 'error', message: 'Room is full' })
      ws.close()
      return
    }

    if (this.state.phase !== 'lobby') {
      this.sendTo(ws, { type: 'error', message: 'Game already in progress' })
      ws.close()
      return
    }

    const playerId = uuidv4()
    const player: Player = {
      id: playerId,
      name,
      unoMessage,
      hand: [],
      isHost: false,
      isConnected: true,
      calledUno: false,
    }

    this.state.players.push(player)
    this.clients.set(connectionId, { ws, playerId })

    // Tell the new player their ID, current player list, and current settings
    this.sendTo(ws, {
      type: 'joined',
      playerId,
      players: this.state.players.map(toPublicPlayer),
      settings: this.state.settings,
    })

    // Tell everyone else
    this.broadcast({
      type: 'player-joined',
      player: toPublicPlayer(player),
    }, playerId)

    this.emit('player-joined', { id: playerId, name })
  }

  private handleDisconnect(playerId: string): void {
    const player = this.state.players.find(p => p.id === playerId)
    if (!player) return

    player.isConnected = false

    if (this.state.phase === 'lobby') {
      // Remove from lobby
      this.state.players = this.state.players.filter(p => p.id !== playerId)
    }

    this.broadcast({ type: 'player-left', playerId })
    this.emit('player-left', { id: playerId, name: player.name })

    // If it's the disconnected player's turn during game, skip them
    if (this.state.phase === 'playing') {
      const currentPlayer = this.state.players[this.state.currentPlayerIndex]
      if (currentPlayer?.id === playerId) {
        advanceTurn(this.state)
        this.broadcastGameState()
      }

      // Check if only 1 connected player remains
      const connected = this.state.players.filter(p => p.isConnected)
      if (connected.length <= 1) {
        this.state.winnerId = connected[0]?.id ?? null
        this.state.phase = 'results'
        this.broadcastGameState()
      }
    }
  }

  private processClientMessage(playerId: string, msg: ClientMessage): void {
    switch (msg.type) {
      case 'settings':
        if (playerId === this.hostId && this.state.phase === 'lobby') {
          this.state.settings = msg.settings
          this.broadcast({ type: 'settings-updated', settings: msg.settings })
        }
        break

      case 'start-game':
        if (playerId === this.hostId && this.state.phase === 'lobby') {
          this.startGame()
        }
        break

      case 'action':
        if (this.state.phase === 'playing') {
          const events = processAction(this.state, playerId, msg.action)
          for (const event of events) {
            this.broadcastGameEvent(event)
          }
          this.broadcastGameState()
          this.resetTurnTimer()
        }
        break

      case 'kick':
        if (playerId === this.hostId && msg.playerId !== this.hostId) {
          this.kickPlayer(msg.playerId)
        }
        break

      case 'return-to-lobby':
        if (playerId === this.hostId) {
          this.returnToLobby()
        }
        break

      case 'ping':
        this.sendToPlayer(playerId, { type: 'pong' })
        break
    }
  }

  private startGame(): void {
    const connected = this.state.players.filter(p => p.isConnected)
    if (connected.length < 2) return

    initializeGame(this.state, generateDeck)
    this.broadcast({ type: 'game-started' })
    this.broadcastGameState()
    this.resetTurnTimer()
    this.emit('game-started')
  }

  private returnToLobby(): void {
    this.clearTurnTimer()
    // Remove disconnected players
    this.state.players = this.state.players.filter(p => p.isConnected)
    this.state.players.forEach(p => {
      p.hand = []
      p.calledUno = false
    })
    this.state.phase = 'lobby'
    this.state.drawPile = []
    this.state.discardPile = []
    this.state.plusChain = null
    this.state.winnerId = null
    this.state.currentPlayerIndex = 0
    this.state.direction = 'clockwise'
    this.state.turnStartTime = null
    this.broadcast({ type: 'return-to-lobby', settings: this.state.settings })
    this.broadcastPlayerList()
    this.emit('return-to-lobby')
  }

  private kickPlayer(playerId: string): void {
    // Find and close connection
    for (const [connId, client] of this.clients) {
      if (client.playerId === playerId) {
        this.sendTo(client.ws, { type: 'kicked', reason: 'Kicked by host' })
        client.ws.close()
        this.clients.delete(connId)
        break
      }
    }
    this.handleDisconnect(playerId)
  }

  private resetTurnTimer(): void {
    this.clearTurnTimer()
    if (!this.state.settings.timeLimitEnabled || this.state.phase !== 'playing') return

    this.turnTimer = setTimeout(() => {
      if (this.state.phase !== 'playing') return
      const currentPlayer = this.state.players[this.state.currentPlayerIndex]
      if (!currentPlayer) return

      // Auto-draw on timeout
      const drawn = drawCards(this.state, this.state.plusChain?.totalAmount ?? 1)
      currentPlayer.hand.push(...drawn)
      this.state.plusChain = null

      this.broadcastGameEvent({ type: 'turn-timeout', playerId: currentPlayer.id })
      advanceTurn(this.state)
      this.broadcastGameState()
      this.resetTurnTimer()
    }, this.state.settings.timeLimitSeconds * 1000)
  }

  private clearTurnTimer(): void {
    if (this.turnTimer) {
      clearTimeout(this.turnTimer)
      this.turnTimer = null
    }
  }

  // --- Broadcasting ---

  private broadcast(msg: ServerMessage, excludePlayerId?: string): void {
    const raw = serializeMessage(msg)

    // Send to local host via event handler
    if (this.hostId && this.hostId !== excludePlayerId) {
      this.emit('message', raw)
    }

    // Send to remote clients
    for (const [, client] of this.clients) {
      if (client.playerId !== excludePlayerId) {
        this.sendTo(client.ws, msg)
      }
    }
  }

  private broadcastGameState(): void {
    // Send personalized state to each player
    if (this.hostId) {
      const clientState = toClientState(this.state, this.hostId)
      this.emit('message', serializeMessage({
        type: 'game-event',
        event: { type: 'state-update', state: clientState }
      }))
    }

    for (const [, client] of this.clients) {
      const clientState = toClientState(this.state, client.playerId)
      this.sendTo(client.ws, {
        type: 'game-event',
        event: { type: 'state-update', state: clientState }
      })
    }
  }

  private broadcastPlayerList(): void {
    const players = this.state.players.map(toPublicPlayer)
    const msg: ServerMessage = {
      type: 'joined',
      playerId: '',
      players,
      settings: this.state.settings,
    }

    if (this.hostId) {
      const hostMsg = { ...msg, playerId: this.hostId }
      this.emit('message', serializeMessage(hostMsg))
    }

    for (const [, client] of this.clients) {
      this.sendTo(client.ws, { ...msg, playerId: client.playerId })
    }
  }

  private broadcastGameEvent(event: GameEvent): void {
    this.broadcast({ type: 'game-event', event })
  }

  private sendToPlayer(playerId: string, msg: ServerMessage): void {
    if (playerId === this.hostId) {
      this.emit('message', serializeMessage(msg))
      return
    }
    for (const [, client] of this.clients) {
      if (client.playerId === playerId) {
        this.sendTo(client.ws, msg)
        return
      }
    }
  }

  private sendTo(ws: WebSocket, msg: ServerMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(serializeMessage(msg))
    }
  }

  private emit(event: string, data?: unknown): void {
    this.onEvent?.(event, data)
  }
}
