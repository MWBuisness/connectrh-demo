interface BarItem {
  label: string
  value: number
  pct?: number
  color?: string
  sublabel?: string
}

interface Props {
  items: BarItem[]
  title?: string
  showValues?: boolean
  unit?: string
  maxColor?: string
}

const COLORS = ['#378ADD', '#1D9E75', '#534AB7', '#BA7517', '#D85A30', '#E24B4A', '#888780']

export default function BarreHorizontale({ items, title, showValues = true, unit = '', maxColor }: Props) {
  const max = Math.max(...items.map(i => i.value), 1)

  return (
    <div>
      {title && <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">{title}</h4>}
      <div className="space-y-3">
        {items.map((item, i) => {
          const pct = item.pct ?? Math.round(item.value / max * 100)
          const color = item.color ?? maxColor ?? COLORS[i % COLORS.length]
          return (
            <div key={item.label}>
              <div className="flex justify-between items-baseline mb-1">
                <div>
                  <span className="text-xs font-medium text-gray-700">{item.label}</span>
                  {item.sublabel && <span className="text-[10px] text-gray-400 ml-1">{item.sublabel}</span>}
                </div>
                {showValues && (
                  <span className="text-xs font-semibold text-gray-900 tabular-nums">
                    {typeof item.value === 'number' && item.value >= 1000
                      ? new Intl.NumberFormat('fr-FR').format(item.value)
                      : item.value}{unit}
                    {item.pct !== undefined && <span className="text-gray-400 ml-1 font-normal">({item.pct}%)</span>}
                  </span>
                )}
              </div>
              <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, backgroundColor: color }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
