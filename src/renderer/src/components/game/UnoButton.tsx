import { motion } from 'framer-motion'

interface UnoButtonProps {
  onClick: () => void
}

export default function UnoButton({ onClick }: UnoButtonProps) {
  return (
    <motion.button
      initial={{ scale: 0, rotate: -180 }}
      animate={{ scale: 1, rotate: 0 }}
      whileHover={{ scale: 1.15 }}
      whileTap={{ scale: 0.9 }}
      onClick={onClick}
      className="absolute bottom-52 right-8 z-50
        w-20 h-20 rounded-full
        bg-gradient-to-br from-uno-red to-red-700
        text-white font-game font-bold text-lg
        shadow-lg shadow-red-500/30
        border-4 border-white/20
        animate-pulse-glow
        cursor-pointer"
    >
      UNO!
    </motion.button>
  )
}
