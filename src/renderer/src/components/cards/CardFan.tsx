import { motion, AnimatePresence } from 'framer-motion'
import type { Card as CardType } from '../../../../shared/types'
import Card from './Card'

interface CardFanProps {
  cards: CardType[]
  selectedIds: Set<string>
  onCardClick: (card: CardType) => void
  playableIds?: Set<string>
  maxWidth?: number
}

export default function CardFan({
  cards, selectedIds, onCardClick, playableIds, maxWidth = 800
}: CardFanProps) {
  const cardWidth = 80
  const maxOverlap = Math.min(cardWidth * 0.65, (maxWidth - cardWidth) / Math.max(cards.length - 1, 1))
  const totalWidth = cardWidth + maxOverlap * (cards.length - 1)
  const startX = -totalWidth / 2

  // Fan arc
  const maxAngle = Math.min(cards.length * 2, 30)
  const angleStep = cards.length > 1 ? (maxAngle * 2) / (cards.length - 1) : 0

  return (
    <div
      className="relative flex items-end justify-center"
      style={{ height: 160, width: Math.min(totalWidth + 40, maxWidth) }}
    >
      <AnimatePresence mode="popLayout">
        {cards.map((card, i) => {
          const angle = cards.length > 1
            ? -maxAngle + angleStep * i
            : 0
          const yOffset = Math.abs(angle) * 0.8
          const isPlayable = !playableIds || playableIds.has(card.id)

          return (
            <motion.div
              key={card.id}
              layout
              initial={{ opacity: 0, y: 50, scale: 0.8 }}
              animate={{
                opacity: 1,
                y: selectedIds.has(card.id) ? -20 : 0,
                scale: 1,
                rotate: angle,
              }}
              exit={{ opacity: 0, y: 50, scale: 0.8 }}
              whileHover={{ zIndex: 200 }}
              transition={{ type: 'spring', damping: 20, stiffness: 300 }}
              style={{
                position: 'absolute',
                left: `calc(50% + ${startX + maxOverlap * i}px)`,
                bottom: yOffset,
                zIndex: selectedIds.has(card.id) ? 100 : i,
                transformOrigin: 'bottom center',
              }}
            >
              <Card
                card={card}
                selected={selectedIds.has(card.id)}
                playable={isPlayable}
                onClick={() => onCardClick(card)}
              />
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
