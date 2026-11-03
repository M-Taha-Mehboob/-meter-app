// Shared Tailwind class strings. Only semantic theme tokens (see src/index.css).

export const cardClass = 'rounded-[1.4rem] border border-line bg-card shadow-card'

/** The dark meter-display panel (see .lcd-panel in src/index.css). */
export const lcdClass = 'lcd-panel relative overflow-hidden rounded-[1.75rem] shadow-card'

export const inputClass =
  'w-full rounded-2xl border border-line bg-card px-3.5 py-2.5 text-base text-ink placeholder:text-ink-3 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/20'

const buttonBase =
  'inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 font-semibold transition active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50'

export const buttonPrimary = `${buttonBase} bg-primary text-on-primary shadow-[0_10px_24px_-10px_var(--primary)]`

export const buttonSecondary = `${buttonBase} border border-line bg-card text-ink active:bg-card-2`

export const buttonDanger = `${buttonBase} border border-danger/30 bg-card text-danger active:bg-danger-soft`

export const iconButton =
  'grid h-9 w-9 place-items-center rounded-xl text-ink-2 transition active:bg-card-2 disabled:opacity-30'

export const labelClass = 'mb-1.5 block text-sm font-medium text-ink-2'

export const checkboxClass = 'h-5 w-5 rounded accent-primary'

/** Small upper-case caption, as printed on a meter's faceplate. */
export const captionClass = 'text-[11px] font-semibold tracking-[0.14em] uppercase'
