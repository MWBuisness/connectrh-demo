'use client'
import { NOTES_LABELS } from '@/lib/types-entretiens'

interface Props {
  value: number
  onChange?: (val: number) => void
  readonly?: boolean
  size?: 'sm' | 'md'
}

export default function NoteEtoiles({ value, onChange, readonly, size = 'md' }: Props) {
  const starSize = size === 'sm' ? 'w-4 h-4' : 'w-6 h-6'

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          onClick={() => !readonly && onChange?.(n)}
          disabled={readonly}
          title={NOTES_LABELS[n]}
          className={`transition-transform ${readonly ? 'cursor-default' : 'hover:scale-110 cursor-pointer'}`}
        >
          <svg
            className={`${starSize} ${n <= value ? 'text-amber-400' : 'text-gray-200'} transition-colors`}
            fill={n <= value ? 'currentColor' : 'none'}
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
          </svg>
        </button>
      ))}
      {value > 0 && (
        <span className="text-xs text-gray-500 ml-1">{NOTES_LABELS[value]}</span>
      )}
    </div>
  )
}
