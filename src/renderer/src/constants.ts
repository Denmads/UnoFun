/**
 * Shared card color definitions used across the game.
 * Ensures consistency between hand cards, discard pile, and UI indicators.
 */

export type CardColorName = 'red' | 'blue' | 'green' | 'yellow' | 'wild'

export interface CardColorDef {
  bg: string
  text: string
}

export const CARD_COLORS: Record<CardColorName, CardColorDef> = {
  red:    { bg: '#ED1C24', text: 'white' },
  blue:   { bg: '#0055A4', text: 'white' },
  green:  { bg: '#009A44', text: 'white' },
  yellow: { bg: '#FFD600', text: '#333' },
  wild:   { bg: '#1A1A2E', text: 'white' },
}
