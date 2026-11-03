import type { CategoryIcon } from '../db/schema'

/** The category's own colour (Bijli amber, Gas flame blue, Pani cyan, other violet), from src/index.css. */
export const categoryColor = (icon: CategoryIcon | undefined) => `var(--cat-${icon ?? 'gauge'})`

/** A see-through tint of a colour, for icon badges and soft buttons. */
export const tint = (color: string, percent = 14) => `color-mix(in oklab, ${color} ${percent}%, transparent)`
