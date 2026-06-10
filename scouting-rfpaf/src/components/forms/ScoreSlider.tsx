interface ScoreSliderProps {
  label: string
  value: number
  max?: number
  onChange: (v: number) => void
  color?: string
}

export default function ScoreSlider({ label, value, max = 10, onChange, color = '#1a3a6b' }: ScoreSliderProps) {
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-sm text-gray-700">{label}</span>
        <span className="text-sm font-bold" style={{ color }}>{value}/{max}</span>
      </div>
      <div className="flex items-center gap-3">
        <input
          type="range"
          min={1}
          max={max}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="flex-1 h-2 rounded-lg appearance-none cursor-pointer"
          style={{ accentColor: color }}
        />
        <input
          type="number"
          min={1}
          max={max}
          value={value}
          onChange={(e) => {
            const v = Math.min(max, Math.max(1, Number(e.target.value)))
            onChange(v)
          }}
          className="w-14 border border-gray-300 rounded-lg px-2 py-1 text-center text-sm font-bold"
        />
      </div>
    </div>
  )
}
