import type { ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface ModalProps {
  open: boolean
  onClose?: () => void
  title?: string
  children: ReactNode
  closable?: boolean
}

export default function Modal({ open, onClose, title, children, closable = true }: ModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[400] flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={closable ? onClose : undefined}
          />

          {/* Modal content */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative z-10 bg-uno-dark border border-white/10 rounded-2xl
              shadow-2xl p-6 min-w-[320px] max-w-[90vw] max-h-[85vh] overflow-y-auto"
          >
            {title && (
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold font-game text-white">{title}</h2>
                {closable && onClose && (
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-white transition-colors text-xl leading-none"
                  >
                    ✕
                  </button>
                )}
              </div>
            )}
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
