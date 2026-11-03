import { formatReading } from '../lib/format'

/** A reading drawn like the meter's own counter: one window per digit, decimals in accent windows. */
export default function MeterDigits({ value }: { value: number }) {
  const [whole, fraction = ''] = formatReading(value).split('.')
  const box = 'grid h-9 w-7 place-items-center rounded-lg text-xl'
  return (
    <div className="flex flex-wrap items-center gap-1" aria-label={`Meter reading ${formatReading(value)}`}>
      {whole.padStart(5, '0').split('').map((d, i) => (
        <span key={`w${i}`} aria-hidden="true" className={`${box} lcd-digits border border-lcd-line bg-lcd-to/70`}>
          {d}
        </span>
      ))}
      {fraction && (
        <>
          <span aria-hidden="true" className="lcd-digits px-0.5 text-xl">
            .
          </span>
          {fraction.split('').map((d, i) => (
            <span key={`f${i}`} aria-hidden="true" className={`${box} bg-lcd-digit font-lcd text-lcd-to`}>
              {d}
            </span>
          ))}
        </>
      )}
    </div>
  )
}
