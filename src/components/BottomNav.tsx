import { BarChart3, Gauge, Settings2, type LucideIcon } from 'lucide-react'
import { NavLink } from 'react-router'

type Tab = { to: string; label: string; icon: LucideIcon }

const tabs: Tab[] = [
  { to: '/', label: 'Home', icon: Gauge },
  { to: '/summary', label: 'Summary', icon: BarChart3 },
  { to: '/meters', label: 'Meters', icon: Settings2 },
]

/** Floating dark bar in the meter-display style; the active tab glows in the accent colour. */
export default function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 px-4 pb-[calc(env(safe-area-inset-bottom)+0.6rem)]">
      <ul className="lcd-panel mx-auto grid max-w-sm grid-cols-3 gap-1 rounded-full p-1.5 shadow-[0_12px_30px_-10px_rgb(0_0_0/0.45)]">
        {tabs.map(({ to, label, icon: Icon }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center justify-center gap-1.5 rounded-full py-2.5 text-[13px] font-semibold transition ${
                  isActive ? 'bg-primary text-on-primary shadow-[0_0_18px_-2px_var(--primary)]' : 'text-lcd-dim'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={18} strokeWidth={isActive ? 2.4 : 1.9} />
                  {label}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
