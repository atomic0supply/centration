import { NavLink } from 'react-router-dom'

import {
  IconConcierge,
  IconDashboard,
  IconInventory,
  IconLedger,
  IconScan,
} from '@/components/icons/Icons'

import styles from './BottomNav.module.css'

const tabs = [
  { to: '/dashboard', label: 'Inicio', Icon: IconDashboard },
  { to: '/ledger', label: 'Ledger', Icon: IconLedger },
  { to: '/inventory', label: 'Hogar', Icon: IconInventory },
  { to: '/concierge', label: 'IA', Icon: IconConcierge },
]

export function BottomNav() {
  const half = Math.floor(tabs.length / 2)
  const left = tabs.slice(0, half)
  const right = tabs.slice(half)

  return (
    <nav className={styles.bar} aria-label="Navegación móvil">
      {left.map(({ to, label, Icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            [styles.tab, isActive ? styles.active : ''].filter(Boolean).join(' ')
          }
        >
          <Icon size={22} />
          <span className={styles.tabLabel}>{label}</span>
        </NavLink>
      ))}

      {/* FAB central → /scan */}
      <NavLink to="/scan" aria-label="Escanear / Añadir">
        <button className={styles.fab}>
          <IconScan size={24} />
        </button>
      </NavLink>

      {right.map(({ to, label, Icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            [styles.tab, isActive ? styles.active : ''].filter(Boolean).join(' ')
          }
        >
          <Icon size={22} />
          <span className={styles.tabLabel}>{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
