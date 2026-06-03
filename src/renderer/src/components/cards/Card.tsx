import { motion } from 'framer-motion'
import type { Card as CardType } from '../../../../shared/types'
import Tooltip from '../ui/Tooltip'
import { SPECIAL_CARD_TOOLTIPS, SPECIAL_CARD_ICONS, SPECIAL_CARD_LABELS } from '../../../../shared/constants'
import { CARD_COLORS } from '../../constants'

interface CardProps {
  card: CardType
  onClick?: () => void
  selected?: boolean
  playable?: boolean
  faceDown?: boolean
  size?: 'sm' | 'md' | 'lg'
  style?: React.CSSProperties
  // For displaying wild cards with chosen color
  displayColor?: CardType['color']
}

const colorMap = CARD_COLORS

const sizeMap = {
  sm: { width: 60, height: 90, fontSize: '1rem', iconSize: '1.2rem' },
  md: { width: 80, height: 120, fontSize: '1.4rem', iconSize: '1.6rem' },
  lg: { width: 100, height: 150, fontSize: '1.8rem', iconSize: '2rem' },
}

function getCardDisplay(card: CardType): { main: string; sub: string } {
  switch (card.type) {
    case 'number':
      return { main: String(card.value ?? 0), sub: '' }
    case 'plus':
      return { main: `+${card.plusAmount}`, sub: '' }
    case 'skip':
    case 'reverse':
    case 'color-change':
    case 'put-down-all-color':
    case 'pickup-until-color':
    case 'reflect':
    case 'swap-hand':
    case 'circle-hands':
    case 'king':
    case 'tax-collector':
    case 'communism':
      return {
        main: SPECIAL_CARD_ICONS[card.type] ?? '?',
        sub: SPECIAL_CARD_LABELS[card.type] ?? ''
      }
    default:
      return { main: '?', sub: '' }
  }
}

export default function Card({
  card, onClick, selected, playable = true, faceDown, size = 'md', style, displayColor
}: CardProps) {
  const dims = sizeMap[size]
  // Use displayColor for wild cards that have a chosen color, otherwise use card.color
  const colorToUse = displayColor || card.color
  const colors = colorMap[colorToUse]
  const display = getCardDisplay(card)

  // Only dim cards that are unplayable AND have a click handler (i.e., cards in the player's hand).
  // Display-only cards (like the discard pile top) should show full color.
  const shouldDim = !playable && !!onClick

  if (faceDown) {
    return (
      <div
        className="rounded-card shadow-card flex items-center justify-center"
        style={{
          width: dims.width,
          height: dims.height,
          background: 'linear-gradient(135deg, #2a1a4e 0%, #1a1a3e 50%, #2a1a4e 100%)',
          border: '2px solid rgba(255,255,255,0.15)',
          ...style,
        }}
      >
        <div className="text-2xl font-bold opacity-30">🂠</div>
      </div>
    )
  }

  const isSpecial = card.type !== 'number' && card.type !== 'plus'
  const tooltipContent = isSpecial ? SPECIAL_CARD_TOOLTIPS[card.type as keyof typeof SPECIAL_CARD_TOOLTIPS] : ''

  const cardElement = (
    <motion.div
      whileHover={playable ? { y: -24, scale: 1.15, transition: { type: 'spring', stiffness: 400, damping: 20 } } : {}}
      whileTap={playable ? { scale: 0.95 } : {}}
      onClick={playable ? onClick : undefined}
      className={`
        rounded-card shadow-card relative overflow-hidden
        transition-shadow duration-200
        ${playable ? 'cursor-pointer hover:shadow-[0_8px_30px_rgba(233,69,96,0.35)]' : ''}
        ${shouldDim ? 'brightness-75 saturate-50 cursor-not-allowed' : ''}
        ${selected ? 'ring-2 ring-white ring-offset-2 ring-offset-uno-black -translate-y-3' : ''}
      `}
      style={{
        width: dims.width,
        height: dims.height,
        background: colors.bg,
        border: `2px solid rgba(255,255,255,0.2)`,
        ...style,
      }}
    >
      {/* Inner oval */}
      <div
        className="absolute inset-2 rounded-[40%] flex flex-col items-center justify-center"
        style={{
          background: 'rgba(255,255,255,0.15)',
        }}
      >
        <span
          className="font-bold font-game leading-none"
          style={{
            fontSize: card.type === 'number' ? dims.fontSize : dims.iconSize,
            color: colors.text,
          }}
        >
          {display.main}
        </span>
        {display.sub && (
          <span
            className="font-game font-medium mt-0.5 text-center leading-tight"
            style={{
              fontSize: size === 'sm' ? '0.45rem' : size === 'md' ? '0.55rem' : '0.65rem',
              color: colors.text,
              opacity: 0.9,
            }}
          >
            {display.sub}
          </span>
        )}
      </div>

      {/* Corner values */}
      <span
        className="absolute top-1 left-1.5 font-bold font-game"
        style={{ fontSize: size === 'sm' ? '0.6rem' : '0.7rem', color: colors.text }}
      >
        {display.main}
      </span>
      <span
        className="absolute bottom-1 right-1.5 font-bold font-game rotate-180"
        style={{ fontSize: size === 'sm' ? '0.6rem' : '0.7rem', color: colors.text }}
      >
        {display.main}
      </span>

      {/* Wild card rainbow border */}
      {card.color === 'wild' && (
        <div
          className="absolute inset-0 rounded-card pointer-events-none"
          style={{
            background: 'conic-gradient(from 0deg, #ED1C24, #FFD600, #009A44, #0055A4, #ED1C24)',
            mask: 'linear-gradient(white 0 0) content-box, linear-gradient(white 0 0)',
            maskComposite: 'xor',
            WebkitMaskComposite: 'xor',
            padding: '2px',
            borderRadius: '12px',
          }}
        />
      )}
    </motion.div>
  )

  if (isSpecial && tooltipContent) {
    return (
      <Tooltip content={tooltipContent}>
        {cardElement}
      </Tooltip>
    )
  }

  return cardElement
}
