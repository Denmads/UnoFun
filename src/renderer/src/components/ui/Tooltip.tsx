import { useState, useRef, useCallback, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'

interface TooltipProps {
  content: string
  children: ReactNode
}

export default function Tooltip({ content, children }: TooltipProps) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)

  const handleMouseEnter = useCallback(() => {
    if (wrapperRef.current) {
      const rect = wrapperRef.current.getBoundingClientRect()
      setPos({ x: rect.left + rect.width / 2, y: rect.top - 8 })
    }
  }, [])

  const handleMouseLeave = useCallback(() => setPos(null), [])

  return (
    <div
      ref={wrapperRef}
      className="inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      {createPortal(
        <AnimatePresence>
          {pos && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.15 }}
              style={{
                position: 'fixed',
                left: pos.x,
                top: pos.y,
                transform: 'translate(-50%, -100%)',
                zIndex: 9999,
              }}
              className="px-3 py-1.5 rounded-lg bg-gray-900 text-white text-xs font-game whitespace-nowrap pointer-events-none shadow-lg"
            >
              {content}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  )
}
