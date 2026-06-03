import { motion } from 'framer-motion'
import type { PublicPlayer } from '../../../../shared/types'

interface PlayerSlotProps {
  player: PublicPlayer
  isCurrentTurn: boolean
  onForgotUno?: () => void
}

export default function PlayerSlot({ player, isCurrentTurn, onForgotUno }: PlayerSlotProps) {
  const showUnoCallout = player.cardCount === 1 && !player.calledUno

  return (
    <motion.div
      animate={isCurrentTurn ? { scale: 1.05 } : { scale: 1 }}
      className={`
        flex flex-col items-center gap-1.5 p-3 rounded-xl min-w-[100px]
        transition-colors duration-300
        ${isCurrentTurn ? 'bg-uno-accent/15 border border-uno-accent/40' : 'bg-uno-surface/30'}
        ${!player.isConnected ? 'opacity-40' : ''}
      `}
    >
      {/* Name */}
      <p className="text-sm font-game font-medium text-white truncate max-w-[100px]">
        {player.name}
      </p>

      {/* Card count visual */}
      <div className="flex gap-0.5 justify-center">
        {Array.from({ length: Math.min(player.cardCount, 10) }).map((_, i) => (
          <div
            key={i}
            className="w-4 h-6 rounded bg-gradient-to-b from-gray-600 to-gray-800 border border-white/10"
            style={{
              transform: `rotate(${(i - Math.min(player.cardCount, 10) / 2) * 3}deg)`,
              marginLeft: i > 0 ? '-6px' : '0',
            }}
          />
        ))}
      </div>
      <span className="text-xs text-gray-400 font-game">{player.cardCount} cards</span>

      {/* Current turn indicator */}
      {isCurrentTurn && (
        <motion.div
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="text-xs text-uno-accent font-game font-semibold"
        >
          Playing...
        </motion.div>
      )}

      {/* Forgot UNO button */}
      {showUnoCallout && onForgotUno && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="bg-red-600 hover:bg-red-700 text-white text-xs font-game font-bold
            px-2 py-1 rounded-lg mt-1 animate-bounce-slow"
          onClick={onForgotUno}
        >
          Forgot UNO! 🚨
        </motion.button>
      )}

      {/* Disconnected badge */}
      {!player.isConnected && (
        <span className="text-xs text-gray-500 font-game">Disconnected</span>
      )}
    </motion.div>
  )
}
