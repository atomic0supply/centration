import { Outlet } from 'react-router-dom'

import { useUiStore } from '@/stores/uiStore'

import styles from './AppLayout.module.css'
import { BottomNav } from './BottomNav'
import { Sidebar } from './Sidebar'

export function AppLayout() {
  const collapsed = useUiStore((s) => s.sidebarCollapsed)
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768

  return (
    <div className={styles.root}>
      {/* Sidebar — desktop only */}
      {!isMobile && <Sidebar />}

      {/* Main content */}
      <main
        className={[
          styles.main,
          collapsed && !isMobile ? styles.mainCollapsed : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <div className={styles.content}>
          <Outlet />
        </div>
      </main>

      {/* Bottom nav — mobile only */}
      <div style={{ display: isMobile ? 'block' : 'none' }}>
        <BottomNav />
      </div>
    </div>
  )
}
