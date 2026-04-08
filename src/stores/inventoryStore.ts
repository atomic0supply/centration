import { create } from 'zustand'

import { subscribeInventory } from '@/services/inventoryService'
import {
  DEFAULT_INVENTORY_FILTERS,
  getDaysUntilExpiry,
  getStockStatus,
  type InventoryFiltersState,
  type InventoryItem,
} from '@/types/inventory'
import { toDate } from '@/utils/formatters'

interface InventoryState {
  items: InventoryItem[]
  loading: boolean
  error: string | null
  filters: InventoryFiltersState

  /* Actions */
  init: () => () => void
  setFilters: (updates: Partial<InventoryFiltersState>) => void
  resetFilters: () => void

  /* Computed */
  filteredItems: () => InventoryItem[]
  lowStockItems: () => InventoryItem[]
  expiringItems: () => InventoryItem[]
  shoppingListItems: () => InventoryItem[]
}

export const useInventoryStore = create<InventoryState>((set, get) => ({
  items: [],
  loading: true,
  error: null,
  filters: { ...DEFAULT_INVENTORY_FILTERS },

  init: () => {
    set({ loading: true, error: null })
    const unsub = subscribeInventory(
      (items) => set({ items, loading: false, error: null }),
      (err) => set({ error: err.message, loading: false }),
    )
    return unsub
  },

  setFilters: (updates) => {
    set((state) => ({ filters: { ...state.filters, ...updates } }))
  },

  resetFilters: () => {
    set({ filters: { ...DEFAULT_INVENTORY_FILTERS } })
  },

  filteredItems: () => {
    const { items, filters } = get()
    let result = [...items]

    // Search
    if (filters.search) {
      const q = filters.search.toLowerCase()
      result = result.filter((i) => i.name.toLowerCase().includes(q))
    }

    // Category
    if (filters.category !== 'all') {
      result = result.filter((i) => i.category === filters.category)
    }

    // Status
    if (filters.status === 'low_stock') {
      result = result.filter((i) => getStockStatus(i) !== 'ok')
    } else if (filters.status === 'expiring_soon') {
      const cutoff = Date.now() + 7 * 86_400_000
      result = result.filter(
        (i) => i.expiryDate !== null && i.expiryDate.toMillis() <= cutoff,
      )
    }

    // Sort
    result.sort((a, b) => {
      switch (filters.sortBy) {
        case 'name':
          return a.name.localeCompare(b.name, 'es')
        case 'qty_asc':
          return a.qty - b.qty
        case 'qty_desc':
          return b.qty - a.qty
        case 'expiry': {
          const aMs = a.expiryDate ? a.expiryDate.toMillis() : Infinity
          const bMs = b.expiryDate ? b.expiryDate.toMillis() : Infinity
          return aMs - bMs
        }
        default:
          return 0
      }
    })

    return result
  },

  lowStockItems: () => {
    return get().items.filter((i) => getStockStatus(i) !== 'ok')
  },

  expiringItems: () => {
    const cutoff = Date.now() + 7 * 86_400_000
    return get()
      .items.filter((i) => i.expiryDate !== null && i.expiryDate.toMillis() <= cutoff)
      .sort((a, b) => {
        const aMs = a.expiryDate!.toMillis()
        const bMs = b.expiryDate!.toMillis()
        return aMs - bMs
      })
  },

  shoppingListItems: () => {
    return get()
      .items.filter((i) => i.qty <= i.minimumQty)
      .sort((a, b) => a.name.localeCompare(b.name, 'es'))
  },
}))
