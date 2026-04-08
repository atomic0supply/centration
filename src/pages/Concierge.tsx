import { useState } from 'react'

import { Card } from '@/components/ui'
import {
  AiChefPanel,
  CartOptimizerPanel,
  ConciergeChat,
  LifeRoiPanel,
  NutritionalPlannerPanel,
} from '@/components/domain/agents'

type AgentTab = 'chat' | 'chef' | 'nutrition' | 'cart' | 'roi'

interface TabDef {
  id: AgentTab
  emoji: string
  label: string
  subtitle: string
}

const TABS: TabDef[] = [
  { id: 'chat', emoji: '💬', label: 'Chat', subtitle: 'Conserje IA' },
  { id: 'chef', emoji: '👨‍🍳', label: 'Cocinero', subtitle: 'Recetas Zero Waste' },
  { id: 'nutrition', emoji: '🥗', label: 'Nutrición', subtitle: 'Plan semanal' },
  { id: 'cart', emoji: '🛒', label: 'Carrito', subtitle: 'Compara precios' },
  { id: 'roi', emoji: '📊', label: 'ROI Vida', subtitle: 'Análisis financiero' },
]

const tabStyles: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 2,
  padding: '8px 12px',
  borderRadius: 10,
  border: 'none',
  background: 'transparent',
  cursor: 'pointer',
  transition: 'background 0.15s',
  minWidth: 68,
  flex: '1 1 0',
}

const tabActiveStyles: React.CSSProperties = {
  background: 'var(--accent-bg)',
}

export function Concierge() {
  const [activeTab, setActiveTab] = useState<AgentTab>('chat')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 4 }}>
          Conserje IA
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
          Agentes especializados que conocen tus datos y te ayudan a tomar mejores decisiones.
        </p>
      </div>

      {/* Tab bar */}
      <div
        style={{
          display: 'flex',
          gap: 4,
          overflowX: 'auto',
          padding: '4px 0',
          scrollbarWidth: 'none',
        }}
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            style={{
              ...tabStyles,
              ...(activeTab === tab.id ? tabActiveStyles : {}),
            }}
            onClick={() => setActiveTab(tab.id)}
          >
            <span style={{ fontSize: 22 }}>{tab.emoji}</span>
            <span
              style={{
                fontSize: 12,
                fontWeight: activeTab === tab.id ? 700 : 500,
                color: activeTab === tab.id ? 'var(--accent-light)' : 'var(--text-secondary)',
                whiteSpace: 'nowrap',
              }}
            >
              {tab.label}
            </span>
            <span
              style={{
                fontSize: 10,
                color: 'var(--text-muted)',
                whiteSpace: 'nowrap',
                display: activeTab === tab.id ? 'none' : 'block',
              }}
            >
              {tab.subtitle}
            </span>
          </button>
        ))}
      </div>

      {/* Panel */}
      <Card>
        {activeTab === 'chat' && <ConciergeChat />}
        {activeTab === 'chef' && <AiChefPanel />}
        {activeTab === 'nutrition' && <NutritionalPlannerPanel />}
        {activeTab === 'cart' && <CartOptimizerPanel />}
        {activeTab === 'roi' && <LifeRoiPanel />}
      </Card>
    </div>
  )
}
