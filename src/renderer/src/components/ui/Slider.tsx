interface SliderProps {
  value: number
  min: number
  max: number
  step?: number
  onChange: (value: number) => void
  label?: string
  showValue?: boolean
  disabled?: boolean
}

export default function Slider({
  value, min, max, step = 1, onChange, label, showValue = true, disabled
}: SliderProps) {
  const pct = ((value - min) / (max - min)) * 100

  return (
    <div className="flex flex-col gap-1.5">
      {(label || showValue) && (
        <div className="flex justify-between items-center">
          {label && <span className="text-sm text-gray-300 font-game">{label}</span>}
          {showValue && <span className="text-sm font-semibold text-uno-accent font-game">{value}</span>}
        </div>
      )}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        disabled={disabled}
        className="w-full h-2 rounded-full appearance-none cursor-pointer
          bg-uno-surface accent-uno-accent
          [&::-webkit-slider-thumb]:appearance-none
          [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
          [&::-webkit-slider-thumb]:rounded-full
          [&::-webkit-slider-thumb]:bg-uno-accent
          [&::-webkit-slider-thumb]:shadow-md
          [&::-webkit-slider-thumb]:cursor-pointer"
        style={{
          background: `linear-gradient(to right, #E94560 0%, #E94560 ${pct}%, #1E2A47 ${pct}%, #1E2A47 100%)`
        }}
      />
    </div>
  )
}
