import { motion } from 'framer-motion'
import type { Card as CardType } from '../../../../shared/types'
import Card from './Card'

interface CardStackProps {
  topCard: CardType | null
  count?: number
  label?: string
  onClick?: () => void
  highlight?: boolean
  displayColor?: CardType['color']  // For rendering wild cards with chosen color
}

export default function CardStack({ topCard, count, label, onClick, highlight, displayColor }: CardStackProps) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className={`relative ${onClick ? 'cursor-pointer' : ''}`}
        onClick={onClick}
      >
        {/* Stack shadow cards */}
        {count && count > 1 && (
          <>
            <div
              className="absolute rounded-card bg-uno-surface/50 border border-white/5"
              style={{ width: 80, height: 120, top: -4, left: -2 }}
            />
            <div
              className="absolute rounded-card bg-uno-surface/30 border border-white/5"
              style={{ width: 80, height: 120, top: -8, left: -4 }}
            />
          </>
        )}

        {/* Top card or placeholder */}
        {topCard ? (
          <Card card={topCard} playable={!!onClick} displayColor={displayColor} />
        ) : (
          <motion.div
            whileHover={onClick ? { scale: 1.05 } : {}}
            whileTap={onClick ? { scale: 0.95 } : {}}
            className={`
              rounded-card border-2 border-dashed border-white/20
              flex items-center justify-center
              ${onClick ? 'hover:border-white/40' : ''}
              ${highlight ? 'border-uno-accent animate-pulse-glow' : ''}
            `}
            style={{ width: 80, height: 120, background: 'rgba(30,42,71,0.5)' }}
          >
            <span className="text-3xl opacity-30">🂠</span>
          </motion.div>
        )}
      </div>

      {/* Label */}
      <div className="flex items-center gap-2">
        {label && <span className="text-xs text-gray-400 font-game">{label}</span>}
        {count !== undefined && (
          <span className="text-xs text-gray-500 font-game">({count})</span>
        )}
      </div>
    </div>
  )
}
