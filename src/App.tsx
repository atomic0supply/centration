import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import { AppLayout } from '@/components/layout/AppLayout'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import { Toaster } from '@/components/ui'
import { Concierge } from '@/pages/Concierge'
import { Dashboard } from '@/pages/Dashboard'
import { ExpenseDetail } from '@/pages/ExpenseDetail'
import { Inventory } from '@/pages/Inventory'
import { Ledger } from '@/pages/Ledger'
import { Login } from '@/pages/Login'
import { Scan } from '@/pages/Scan'
import { Settings } from '@/pages/Settings'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<Login />} />

        {/* Protected — nested inside AppLayout */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/ledger" element={<Ledger />} />
            <Route path="/ledger/:id" element={<ExpenseDetail />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/concierge" element={<Concierge />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/scan" element={<Scan />} />
          </Route>
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>

      <Toaster />
    </BrowserRouter>
  )
}
