import { Droplet, Flame, Gauge, Zap } from 'lucide-react'
import type { CategoryIcon as IconName } from '../db/schema'
import { categoryColor, tint } from '../lib/category'

/** The icon of a category: Zap for Bijli, Flame for Gas, Droplet for Pani, Gauge otherwise. */
export function CategoryGlyph({ name, size, className }: { name: IconName | undefined; size: number; className?: string }) {
  switch (name) {
    case 'zap':
      return <Zap size={size} className={className} />
    case 'flame':
      return <Flame size={size} className={className} />
    case 'droplet':
      return <Droplet size={size} className={className} />
    default:
      return <Gauge size={size} className={className} />
  }
}

/** Rounded tile with the category's icon in the category's colour. */
export default function CategoryIcon({ name, muted = false }: { name: IconName | undefined; muted?: boolean }) {
  const color = categoryColor(name)
  return (
    <span
      aria-hidden="true"
      className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl ${muted ? 'bg-card-2 text-ink-3' : ''}`}
      style={muted ? undefined : { background: tint(color), color }}
    >
      <CategoryGlyph name={name} size={19} />
    </span>
  )
}
