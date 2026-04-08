import { fireEvent, render, screen } from '@testing-library/react'
import { useMemo, useState } from 'react'
import { describe, expect, it } from 'vitest'

type AssetType = 'property' | 'vehicle' | 'electronics'
type AssetFilter = AssetType | 'all'

interface UiAsset {
  id: string
  name: string
  type: AssetType
  alert?: string
  pdfUrl?: string
  mimeType?: string
}

const ASSETS: UiAsset[] = [
  {
    id: 'asset-1',
    name: 'Piso de Madrid',
    type: 'property',
    alert: 'Garantía vence en 5 días',
  },
  {
    id: 'asset-2',
    name: 'Furgoneta',
    type: 'vehicle',
    alert: 'ITV vencida',
  },
  {
    id: 'asset-3',
    name: 'Manual PDF',
    type: 'electronics',
    pdfUrl: 'https://cdn.example/manual.pdf',
    mimeType: 'application/pdf',
  },
]

function AssetBrowser() {
  const [filter, setFilter] = useState<AssetFilter>('all')
  const [selectedId, setSelectedId] = useState('asset-1')

  const filtered = useMemo(() => {
    if (filter === 'all') return ASSETS
    return ASSETS.filter((asset) => asset.type === filter)
  }, [filter])

  const selected = ASSETS.find((asset) => asset.id === selectedId) ?? null

  return (
    <section>
      <div role="toolbar" aria-label="Filtros de activos">
        <button type="button" onClick={() => {
          setFilter('all')
        }}>
          Todos
        </button>
        <button type="button" onClick={() => {
          setFilter('property')
        }}>
          Propiedades
        </button>
        <button type="button" onClick={() => {
          setFilter('vehicle')
        }}>
          Vehículos
        </button>
        <button type="button" onClick={() => {
          setFilter('electronics')
        }}>
          Electrónica
        </button>
      </div>

      <ul aria-label="Listado de activos">
        {filtered.map((asset) => (
          <li key={asset.id}>
            <button
              type="button"
              onClick={() => {
                setSelectedId(asset.id)
              }}
            >
              {asset.name}
            </button>
          </li>
        ))}
      </ul>

      <aside aria-label="Detalle de activo">
        {selected?.mimeType === 'application/pdf' ? (
          <iframe title="Vista previa PDF" src={selected.pdfUrl ?? ''} />
        ) : (
          <p role="status">{selected ? selected.alert : 'Sin alertas activas'}</p>
        )}
      </aside>
    </section>
  )
}

describe('asset UI smoke flow', () => {
  it('filters assets by type and renders alert or PDF preview', () => {
    render(<AssetBrowser />)

    expect(screen.getByRole('status')).toHaveTextContent('Garantía vence en 5 días')

    fireEvent.click(screen.getByRole('button', { name: 'Vehículos' }))

    expect(screen.getByRole('button', { name: 'Furgoneta' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Piso de Madrid' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Todos' }))
    fireEvent.click(screen.getByRole('button', { name: 'Manual PDF' }))

    expect(screen.getByTitle('Vista previa PDF')).toHaveAttribute(
      'src',
      'https://cdn.example/manual.pdf',
    )
  })
})
