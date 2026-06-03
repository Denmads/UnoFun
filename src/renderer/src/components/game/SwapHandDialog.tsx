import { motion } from 'framer-motion'
import Modal from '../ui/Modal'
import type { PublicPlayer } from '../../../../shared/types'

interface SwapHandDialogProps {
  open: boolean
  players: PublicPlayer[]
  onSelect: (playerId: string) => void
  onClose: () => void
}

export default function SwapHandDialog({ open, players, onSelect, onClose }: SwapHandDialogProps) {
  return (
    <Modal open={open} onClose={onClose} title="🔄 Swap Hand With...">
      <p className="text-gray-300 text-sm font-game mb-4">
        Choose a player to swap your entire hand with.
      </p>
      <div className="flex flex-col gap-2">
        {players.filter(p => p.isConnected).map(player => (
          <motion.button
            key={player.id}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelect(player.id)}
            className="flex items-center gap-3 bg-uno-surface/50 hover:bg-uno-surface
              rounded-xl p-3 transition-colors cursor-pointer"
          >
            <span className="text-white font-game font-medium">{player.name}</span>
            <span className="text-gray-400 text-sm font-game ml-auto">{player.cardCount} cards</span>
          </motion.button>
        ))}
      </div>
    </Modal>
  )
}
