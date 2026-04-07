import { motion } from 'framer-motion'
import { NavLink } from 'react-router-dom'

import {
  IconChevronLeft,
  IconChevronRight,
  IconConcierge,
  IconDashboard,
  IconInventory,
  IconLedger,
  IconLogOut,
  IconSettings,
} from '@/components/icons/Icons'
import { useAuthStore } from '@/stores/authStore'
import { useUiStore } from '@/stores/uiStore'

import styles from './Sidebar.module.css'

const navItems = [
  { to: '/dashboard', label: 'Dashboard', Icon: IconDashboard },
  { to: '/ledger', label: 'Ledger', Icon: IconLedger },
  { to: '/inventory', label: 'Hogar', Icon: IconInventory },
  { to: '/concierge', label: 'Conserje', Icon: IconConcierge },
  { to: '/settings', label: 'Ajustes', Icon: IconSettings },
]

export function Sidebar() {
  const { collapsed, toggle } = useUiStore((s) => ({
    collapsed: s.sidebarCollapsed,
    toggle: s.toggleSidebar,
  }))
  const signOut = useAuthStore((s) => s.signOut)

  return (
    <motion.aside
      className={[styles.sidebar, collapsed ? styles.collapsed : ''].filter(Boolean).join(' ')}
      animate={{ width: collapsed ? 'var(--sidebar-collapsed)' : 'var(--sidebar-width)' }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    >
      {/* Logo */}
      <div className={styles.logoArea}>
        <div className={styles.logoMark}>C</div>
        <motion.span
          className={styles.logoText}
          animate={{ opacity: collapsed ? 0 : 1, width: collapsed ? 0 : 'auto' }}
          transition={{ duration: 0.15 }}
        >
          Centration
        </motion.span>
      </div>

      {/* Navigation */}
      <nav className={styles.nav} aria-label="Navegación principal">
        {navItems.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              [styles.navItem, isActive ? styles.active : ''].filter(Boolean).join(' ')
            }
            title={collapsed ? label : undefined}
          >
            <span className={styles.navIcon}>
              <Icon size={20} />
            </span>
            <motion.span
              className={styles.navLabel}
              animate={{ opacity: collapsed ? 0 : 1 }}
              transition={{ duration: 0.12 }}
            >
              {label}
            </motion.span>
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className={styles.footer}>
        <button
          className={styles.navItem}
          onClick={() => void signOut()}
          title={collapsed ? 'Cerrar sesión' : undefined}
          style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer' }}
        >
          <span className={styles.navIcon}>
            <IconLogOut size={20} />
          </span>
          <motion.span
            className={styles.navLabel}
            animate={{ opacity: collapsed ? 0 : 1 }}
            transition={{ duration: 0.12 }}
          >
            Salir
          </motion.span>
        </button>

        <button className={styles.toggleBtn} onClick={toggle} aria-label={collapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}>
          {collapsed ? <IconChevronRight size={18} /> : <IconChevronLeft size={18} />}
        </button>
      </div>
    </motion.aside>
  )
}
