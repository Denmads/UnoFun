import { describe, it, expect } from 'vitest'
import { processAction, initializeGame } from './rules'
import { generateDeck } from './cards'
import { DEFAULT_SETTINGS } from './constants'
import type { Card, GameState, Player } from './types'

function makeCard(overrides: Partial<Card> = {}): Card {
  return { id: Math.random().toString(36).slice(2), type: 'number', color: 'red', value: 5, ...overrides }
}

function makePlayer(id: string, overrides: Partial<Player> = {}): Player {
  return {
    id,
    name: id,
    unoMessage: 'UNO!',
    hand: [],
    isHost: false,
    isConnected: true,
    calledUno: false,
    ...overrides,
  }
}

function makeState(overrides: Partial<GameState> = {}): GameState {
  return {
    phase: 'playing',
    players: [makePlayer('p1'), makePlayer('p2')],
    currentPlayerIndex: 0,
    direction: 'clockwise',
    drawPile: [],
    discardPile: [makeCard({ color: 'wild', type: 'plus', plusAmount: 4 })],
    currentColor: 'red',
    plusChain: null,
    winnerId: null,
    settings: DEFAULT_SETTINGS,
    turnStartTime: Date.now(),
    hasDrawnCardThisTurn: false,
    awaitingResolution: false,
    ...overrides,
  }
}

describe('processChallengeWild', () => {
  it('rejects a player challenging their own wild +4', () => {
    const state = makeState({
      currentPlayerIndex: 0,
      plusChain: {
        totalAmount: 4,
        cardCount: 1,
        currentPlusAmount: 4,
        colorBeforeWild: 'blue',
        lastWildPlayerId: 'p1',
      },
    })
    const before = JSON.stringify(state.players)

    const events = processAction(state, 'p1', { type: 'challenge-wild' })

    expect(events.some(e => e.type === 'error')).toBe(true)
    expect(events.some(e => e.type === 'challenge-result')).toBe(false)
    expect(JSON.stringify(state.players)).toBe(before)
  })

  it('allows challenging a different player', () => {
    const state = makeState({
      currentPlayerIndex: 0,
      players: [
        makePlayer('p1'),
        makePlayer('p2', { hand: [makeCard({ color: 'blue' })] }),
      ],
      plusChain: {
        totalAmount: 4,
        cardCount: 1,
        currentPlusAmount: 4,
        colorBeforeWild: 'blue',
        lastWildPlayerId: 'p2',
      },
    })

    const events = processAction(state, 'p1', { type: 'challenge-wild' })

    expect(events.some(e => e.type === 'challenge-result')).toBe(true)
  })
})

describe('king card reducing a victim to 0 cards', () => {
  function kingState(requireSelfPlayToWin: boolean): GameState {
    return makeState({
      currentPlayerIndex: 0,
      players: [
        makePlayer('king', { hand: [makeCard({ type: 'king', color: 'wild' })] }),
        makePlayer('victim', { hand: [makeCard({ color: 'blue', value: 7 })] }),
      ],
      settings: { ...DEFAULT_SETTINGS, requireSelfPlayToWin },
    })
  }

  it('declares the victim the winner by default (requireSelfPlayToWin: false)', () => {
    const state = kingState(false)
    const kingCardId = state.players[0].hand[0].id

    const events = processAction(state, 'king', { type: 'play-cards', cardIds: [kingCardId] })

    expect(events.some(e => e.type === 'player-won' && e.playerId === 'victim')).toBe(true)
    expect(state.winnerId).toBe('victim')
    expect(state.phase).toBe('results')
  })

  it('does not declare the victim the winner when requireSelfPlayToWin is on', () => {
    const state = kingState(true)
    const kingCardId = state.players[0].hand[0].id

    const events = processAction(state, 'king', { type: 'play-cards', cardIds: [kingCardId] })

    expect(events.some(e => e.type === 'player-won')).toBe(false)
    expect(state.winnerId).toBeNull()
    expect(state.phase).toBe('playing')
    expect(state.players[1].hand.length).toBe(0)
  })

  it('auto-protects the victim from "forgot uno" once they draw back to 1 card', () => {
    const state = kingState(true)
    const kingCardId = state.players[0].hand[0].id
    processAction(state, 'king', { type: 'play-cards', cardIds: [kingCardId] })
    // King is wild-colored, so the king player must pick a color before the turn
    // advances — this also resolves awaitingResolution and hands the turn to victim.
    processAction(state, 'king', { type: 'pick-color', color: 'blue' })

    const victim = state.players.find(p => p.id === 'victim')!
    expect(victim.hand.length).toBe(0)
    expect(victim.calledUno).toBe(false)
    expect(state.currentPlayerIndex).toBe(state.players.findIndex(p => p.id === 'victim'))

    state.drawPile = [makeCard({ color: 'green', value: 3 })]
    processAction(state, 'victim', { type: 'draw-card' })

    expect(victim.hand.length).toBe(1)
    expect(victim.calledUno).toBe(true)
  })
})

describe('allowPlayDrawnCard setting', () => {
  it('does not advance the turn when the drawn card is playable and the setting is on', () => {
    const state = makeState({
      currentPlayerIndex: 0,
      discardPile: [makeCard({ color: 'blue', value: 1 })],
      currentColor: 'blue',
      drawPile: [makeCard({ color: 'blue', value: 9 })],
      settings: { ...DEFAULT_SETTINGS, allowPlayDrawnCard: true },
    })

    const events = processAction(state, 'p1', { type: 'draw-card' })

    expect(events.some(e => e.type === 'card-drawn')).toBe(true)
    expect(state.currentPlayerIndex).toBe(0)
    expect(state.hasDrawnCardThisTurn).toBe(true)
    expect(state.players[0].hand.length).toBe(1)
  })

  it('advances the turn on a second draw ("pass") after declining to play', () => {
    const state = makeState({
      currentPlayerIndex: 0,
      discardPile: [makeCard({ color: 'blue', value: 1 })],
      currentColor: 'blue',
      drawPile: [makeCard({ color: 'blue', value: 9 }), makeCard({ color: 'red', value: 2 })],
      settings: { ...DEFAULT_SETTINGS, allowPlayDrawnCard: true },
    })

    processAction(state, 'p1', { type: 'draw-card' })
    const events = processAction(state, 'p1', { type: 'draw-card' })

    expect(events.some(e => e.type === 'card-drawn')).toBe(false)
    expect(state.currentPlayerIndex).toBe(1)
    expect(state.players[0].hand.length).toBe(1)
  })

  it('advances the turn immediately when the setting is off, even if playable', () => {
    const state = makeState({
      currentPlayerIndex: 0,
      discardPile: [makeCard({ color: 'blue', value: 1 })],
      currentColor: 'blue',
      drawPile: [makeCard({ color: 'blue', value: 9 })],
      settings: { ...DEFAULT_SETTINGS, allowPlayDrawnCard: false },
    })

    processAction(state, 'p1', { type: 'draw-card' })

    expect(state.currentPlayerIndex).toBe(1)
  })
})

describe('initializeGame starting player', () => {
  it('does not always start with player 0 (the host)', () => {
    const startIndexes = new Set<number>()
    for (let i = 0; i < 50; i++) {
      const state = makeState({
        players: [makePlayer('host'), makePlayer('p2'), makePlayer('p3'), makePlayer('p4')],
      })
      initializeGame(state, generateDeck)
      startIndexes.add(state.currentPlayerIndex)
    }
    expect(startIndexes.size).toBeGreaterThan(1)
  })
})

describe('processCallUno pre-call validity', () => {
  it('rejects a pre-call with 2 cards when neither is playable', () => {
    const state = makeState({
      currentPlayerIndex: 0,
      currentColor: 'red',
      discardPile: [makeCard({ color: 'red', value: 5 })],
      players: [
        makePlayer('p1', { hand: [makeCard({ color: 'blue', value: 1 }), makeCard({ color: 'green', value: 2 })] }),
        makePlayer('p2'),
      ],
    })

    const events = processAction(state, 'p1', { type: 'call-uno', message: 'UNO!' })

    expect(events).toEqual([{ type: 'error', message: 'Cannot call UNO right now' }])
    expect(state.players[0].calledUno).toBe(false)
  })

  it('allows a pre-call with 2 cards when one is playable', () => {
    const state = makeState({
      currentPlayerIndex: 0,
      currentColor: 'red',
      discardPile: [makeCard({ color: 'red', value: 5 })],
      players: [
        makePlayer('p1', { hand: [makeCard({ color: 'red', value: 1 }), makeCard({ color: 'green', value: 2 })] }),
        makePlayer('p2'),
      ],
    })

    const events = processAction(state, 'p1', { type: 'call-uno', message: 'UNO!' })

    expect(events.some(e => e.type === 'uno-called')).toBe(true)
    expect(state.players[0].calledUno).toBe(true)
  })
})

describe('awaitingResolution blocks acting again before a pending pick is resolved', () => {
  function pendingColorPickState(): GameState {
    return makeState({
      currentPlayerIndex: 0,
      discardPile: [makeCard({ color: 'red', value: 5 })],
      currentColor: 'red',
      players: [
        makePlayer('p1', {
          hand: [
            makeCard({ type: 'color-change', color: 'wild' }),
            makeCard({ color: 'blue', value: 3 }),
          ],
        }),
        makePlayer('p2'),
      ],
    })
  }

  it('sets awaitingResolution after playing a wild card that needs a color pick', () => {
    const state = pendingColorPickState()
    const wildCardId = state.players[0].hand[0].id

    processAction(state, 'p1', { type: 'play-cards', cardIds: [wildCardId] })

    expect(state.awaitingResolution).toBe(true)
    expect(state.currentPlayerIndex).toBe(0)
  })

  it('rejects a second play-cards while a color pick is pending', () => {
    const state = pendingColorPickState()
    const wildCardId = state.players[0].hand[0].id
    processAction(state, 'p1', { type: 'play-cards', cardIds: [wildCardId] })
    const remainingCardId = state.players[0].hand[0].id

    const events = processAction(state, 'p1', { type: 'play-cards', cardIds: [remainingCardId] })

    expect(events).toEqual([{ type: 'error', message: 'Resolve the pending choice first' }])
    expect(state.players[0].hand.length).toBe(1)
  })

  it('rejects draw-card while a color pick is pending', () => {
    const state = pendingColorPickState()
    const wildCardId = state.players[0].hand[0].id
    processAction(state, 'p1', { type: 'play-cards', cardIds: [wildCardId] })

    const events = processAction(state, 'p1', { type: 'draw-card' })

    expect(events).toEqual([{ type: 'error', message: 'Resolve the pending choice first' }])
  })

  it('clears awaitingResolution once pick-color resolves, allowing the next player to act normally', () => {
    const state = pendingColorPickState()
    state.players[1].hand = [makeCard({ color: 'blue', value: 7 })]
    const wildCardId = state.players[0].hand[0].id
    processAction(state, 'p1', { type: 'play-cards', cardIds: [wildCardId] })

    processAction(state, 'p1', { type: 'pick-color', color: 'blue' })
    expect(state.awaitingResolution).toBe(false)
    expect(state.currentPlayerIndex).toBe(1)

    const events = processAction(state, 'p2', { type: 'play-cards', cardIds: [state.players[1].hand[0].id] })

    expect(events.some(e => e.type === 'card-played')).toBe(true)
  })
})
