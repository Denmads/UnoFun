import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'

interface TimerBarProps {
  startTime: number
  duration: number
  isMyTurn: boolean
}

export default function TimerBar({ startTime, duration, isMyTurn }: TimerBarProps) {
  const [progress, setProgress] = useState(1)

  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000
      const remaining = Math.max(0, 1 - elapsed / duration)
      setProgress(remaining)
    }, 50)

    return () => clearInterval(interval)
  }, [startTime, duration])

  const isLow = progress < 0.25
  const color = isLow ? '#ED1C24' : isMyTurn ? '#E94560' : '#4a5568'

  return (
    <div className="h-1.5 w-full bg-uno-surface/50 relative z-20">
      <motion.div
        className="h-full rounded-r-full"
        style={{ background: color }}
        animate={{ width: `${progress * 100}%` }}
        transition={{ duration: 0.1 }}
      />
      {isLow && isMyTurn && (
        <motion.div
          className="absolute inset-0"
          animate={{ opacity: [0, 0.3, 0] }}
          transition={{ duration: 0.5, repeat: Infinity }}
          style={{ background: '#ED1C24' }}
        />
      )}
    </div>
  )
}
