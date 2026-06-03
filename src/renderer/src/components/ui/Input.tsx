import type { InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export default function Input({ label, error, className = '', ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-sm font-medium text-gray-300">{label}</label>
      )}
      <input
        className={`
          bg-uno-surface border border-white/10 rounded-xl px-4 py-2.5
          text-white placeholder-gray-500 font-game
          focus:outline-none focus:border-uno-accent focus:ring-1 focus:ring-uno-accent/50
          transition-colors duration-200
          ${error ? 'border-red-500' : ''}
          ${className}
        `}
        {...props}
      />
      {error && (
        <span className="text-red-400 text-xs">{error}</span>
      )}
    </div>
  )
}
