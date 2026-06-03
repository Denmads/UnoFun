import React from 'react'
import { motion } from 'framer-motion'

interface NotificationProps {
  message: string
  duration?: number
  onClose?: () => void
}

export default function Notification({ message, duration = 3000, onClose }: NotificationProps) {
  // Auto-close after duration
  React.useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(onClose, duration)
      return () => clearTimeout(timer)
    }
  }, [duration, onClose])

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className="bg-uno-accent/90 border border-uno-accent/50 rounded-xl px-6 py-3
        text-white font-game font-semibold text-center shadow-2xl"
    >
      {message}
    </motion.div>
  )
}
