import { motion } from 'framer-motion'

interface ToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: string
  disabled?: boolean
}

export default function Toggle({ checked, onChange, label, disabled }: ToggleProps) {
  return (
    <label className={`flex items-center gap-3 cursor-pointer ${disabled ? 'opacity-50' : ''}`}>
      <div
        className={`
          relative w-11 h-6 rounded-full transition-colors duration-200
          ${checked ? 'bg-uno-accent' : 'bg-uno-surface border border-white/20'}
        `}
        onClick={() => !disabled && onChange(!checked)}
      >
        <motion.div
          className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow"
          animate={{ left: checked ? '22px' : '2px' }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        />
      </div>
      {label && <span className="text-sm text-gray-200 font-game">{label}</span>}
    </label>
  )
}
