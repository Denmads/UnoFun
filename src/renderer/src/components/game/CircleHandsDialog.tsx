import { motion } from 'framer-motion'
import Modal from '../ui/Modal'
import Button from '../ui/Button'

interface CircleHandsDialogProps {
  open: boolean
  onSelect: (direction: 'left' | 'right') => void
  onClose: () => void
}

export default function CircleHandsDialog({ open, onSelect, onClose }: CircleHandsDialogProps) {
  return (
    <Modal open={open} onClose={onClose} title="🔃 Circle Hands">
      <p className="text-gray-300 text-sm font-game mb-4">
        Pass all hands one position. Which direction?
      </p>
      <div className="flex gap-4">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onSelect('left')}
          className="flex-1 bg-uno-blue/20 hover:bg-uno-blue/30 border border-uno-blue/40
            rounded-xl p-4 text-center cursor-pointer transition-colors"
        >
          <span className="text-3xl block mb-1">⬅️</span>
          <span className="text-white font-game font-medium">Left</span>
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onSelect('right')}
          className="flex-1 bg-uno-green/20 hover:bg-uno-green/30 border border-uno-green/40
            rounded-xl p-4 text-center cursor-pointer transition-colors"
        >
          <span className="text-3xl block mb-1">➡️</span>
          <span className="text-white font-game font-medium">Right</span>
        </motion.button>
      </div>
    </Modal>
  )
}
