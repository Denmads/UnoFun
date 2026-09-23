import type { GameSettings, CardColor, SpecialCardType, PlusCardDefinition } from './types'

export const CARD_COLORS: CardColor[] = ['red', 'blue', 'green', 'yellow']

export const ALL_SPECIAL_CARDS: SpecialCardType[] = [
  'skip',
  'reverse',
  'color-change',
  'put-down-all-color',
  'pickup-until-color',
  'reflect',
  'swap-hand',
  'circle-hands',
  'king',
  'tax-collector',
  'communism'
]

export const DEFAULT_PLUS_CARDS: PlusCardDefinition[] = [
  { amount: 2, isWild: false, count: 2 },  // +2 color card, 2 per color = 8 total
  { amount: 4, isWild: true, count: 4 },    // +4 wild card, 4 total
]

export const DEFAULT_SETTINGS: GameSettings = {
  startingCards: 7,
  timeLimitEnabled: false,
  timeLimitSeconds: 30,
  allowChallengeWild: true,
  allowStackSameNumber: true,
  allowContinuePlusChain: true,
  infiniteDrawPile: false,
  plusCards: DEFAULT_PLUS_CARDS,
  forgetUnoPenalty: 2,
  requireSelfPlayToWin: false,
  allowPlayDrawnCard: false,
  enabledSpecialCards: {
    'skip': true,
    'reverse': true,
    'color-change': true,
    'put-down-all-color': true,
    'pickup-until-color': true,
    'reflect': true,
    'swap-hand': true,
    'circle-hands': true,
    'king': true,
    'tax-collector': true,
    'communism': true,
  }
}

export const MAX_PLAYERS = 8
export const MIN_PLAYERS = 2
export const DEFAULT_PORT = 7777

export interface SpecialCardMeta {
  label: string
  tooltip: string
  icon: string
}

export const SPECIAL_CARD_META: Record<SpecialCardType, SpecialCardMeta> = {
  'skip': {
    label: 'Skip',
    tooltip: 'Skips the next player\'s turn',
    icon: '⊘',
  },
  'reverse': {
    label: 'Reverse',
    tooltip: 'Reverses the direction of play',
    icon: '⟲',
  },
  'color-change': {
    label: 'Color Change',
    tooltip: 'Choose the color to continue with',
    icon: '🎨',
  },
  'put-down-all-color': {
    label: 'Dump Color',
    tooltip: 'Play all cards of a chosen color from your hand',
    icon: '⬇',
  },
  'pickup-until-color': {
    label: 'Dig for Color',
    tooltip: 'Draw cards until you get a card of a chosen color',
    icon: '⬆',
  },
  'reflect': {
    label: 'Reflect',
    tooltip: 'Send back a +card punishment to the player who played it',
    icon: '🛡',
  },
  'swap-hand': {
    label: 'Swap Hand',
    tooltip: 'Swap your entire hand with another player',
    icon: '🔄',
  },
  'circle-hands': {
    label: 'Circle Hands',
    tooltip: 'All hands rotate one position left or right',
    icon: '🔃',
  },
  'king': {
    label: 'King',
    tooltip: 'Every other player gives you their best card',
    icon: '👑',
  },
  'tax-collector': {
    label: 'Tax Collector',
    tooltip: 'Every other player gives you one random card',
    icon: '💰',
  },
  'communism': {
    label: 'Communism',
    tooltip: 'All hands are combined, shuffled, and redistributed evenly',
    icon: '☭',
  },
}

// Convenience accessors derived from the single source of truth
export const SPECIAL_CARD_LABELS: Record<SpecialCardType, string> =
  Object.fromEntries(ALL_SPECIAL_CARDS.map(k => [k, SPECIAL_CARD_META[k].label])) as Record<SpecialCardType, string>

export const SPECIAL_CARD_TOOLTIPS: Record<SpecialCardType, string> =
  Object.fromEntries(ALL_SPECIAL_CARDS.map(k => [k, SPECIAL_CARD_META[k].tooltip])) as Record<SpecialCardType, string>

export const SPECIAL_CARD_ICONS: Record<SpecialCardType, string> =
  Object.fromEntries(ALL_SPECIAL_CARDS.map(k => [k, SPECIAL_CARD_META[k].icon])) as Record<SpecialCardType, string>
