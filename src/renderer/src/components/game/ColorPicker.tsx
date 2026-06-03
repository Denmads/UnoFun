import { motion, AnimatePresence } from 'framer-motion'
import type { CardColor } from '../../../../shared/types'

interface ColorPickerProps {
  open: boolean
  onPick: (color: CardColor) => void
}

const colors: { color: CardColor; bg: string; label: string }[] = [
  { color: 'red', bg: '#ED1C24', label: 'Red' },
  { color: 'blue', bg: '#0055A4', label: 'Blue' },
  { color: 'green', bg: '#009A44', label: 'Green' },
  { color: 'yellow', bg: '#FFD600', label: 'Yellow' },
]

export default function ColorPicker({ open, onPick }: ColorPickerProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 30, scale: 0.9 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed bottom-56 left-1/2 -translate-x-1/2 z-[300]
            bg-uno-dark/90 border border-white/15 rounded-2xl shadow-2xl p-4"
        >
          <p className="text-sm font-game font-semibold text-gray-300 text-center mb-3">
            Pick a Color
          </p>
          <div className="flex gap-3">
            {colors.map(({ color, bg, label }) => (
              <motion.button
                key={color}
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => onPick(color)}
                className="w-16 h-16 rounded-xl flex items-center justify-center
                  font-game font-bold text-sm cursor-pointer shadow-lg
                  transition-shadow hover:shadow-xl"
                style={{
                  background: bg,
                  color: color === 'yellow' ? '#333' : 'white',
                }}
              >
                {label}
              </motion.button>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
