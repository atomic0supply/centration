import { describe, expect, it } from 'vitest'

type AssetType = 'property' | 'vehicle' | 'electronics'

interface AssetRecord {
  id: string
  name: string
  type: AssetType
  warrantyEndsAt: Date | null
  nextMaintenanceAt: Date | null
}

interface AssetAlertPrefs {
  maintenanceDaysAhead: number
  warrantyDaysAhead: number
}

interface AssetAlert {
  kind: 'warranty' | 'maintenance'
  severity: 'warning' | 'critical'
  daysLeft: number
}

const DEFAULT_PREFS: AssetAlertPrefs = {
  maintenanceDaysAhead: 14,
  warrantyDaysAhead: 30,
}

const FIXED_NOW = new Date('2026-04-08T12:00:00.000Z')
const DAY = 86_400_000

function daysFromNow(days: number): Date {
  return new Date(FIXED_NOW.getTime() + days * DAY)
}

function filterAssetsByType(assets: AssetRecord[], type: AssetType | 'all'): AssetRecord[] {
  if (type === 'all') return assets
  return assets.filter((asset) => asset.type === type)
}

function getAlerts(asset: AssetRecord, prefs: AssetAlertPrefs): AssetAlert[] {
  const alerts: AssetAlert[] = []

  if (asset.warrantyEndsAt) {
    const daysLeft = Math.ceil((asset.warrantyEndsAt.getTime() - FIXED_NOW.getTime()) / DAY)
    if (daysLeft <= prefs.warrantyDaysAhead) {
      alerts.push({
        kind: 'warranty',
        severity: daysLeft <= 0 ? 'critical' : 'warning',
        daysLeft,
      })
    }
  }

  if (asset.nextMaintenanceAt) {
    const daysLeft = Math.ceil((asset.nextMaintenanceAt.getTime() - FIXED_NOW.getTime()) / DAY)
    if (daysLeft <= prefs.maintenanceDaysAhead) {
      alerts.push({
        kind: 'maintenance',
        severity: daysLeft <= 0 ? 'critical' : 'warning',
        daysLeft,
      })
    }
  }

  return alerts
}

describe('asset alert logic', () => {
  it('filters assets by type without mutating the source list', () => {
    const assets: AssetRecord[] = [
      { id: 'p1', name: 'Piso', type: 'property', warrantyEndsAt: null, nextMaintenanceAt: null },
      { id: 'v1', name: 'Coche', type: 'vehicle', warrantyEndsAt: null, nextMaintenanceAt: null },
      { id: 'e1', name: 'Portatil', type: 'electronics', warrantyEndsAt: null, nextMaintenanceAt: null },
    ]

    expect(filterAssetsByType(assets, 'vehicle')).toEqual([assets[1]])
    expect(filterAssetsByType(assets, 'all')).toEqual(assets)
    expect(assets).toHaveLength(3)
  })

  it('raises warranty alerts inside the configurable window', () => {
    const asset: AssetRecord = {
      id: 'v1',
      name: 'Furgoneta',
      type: 'vehicle',
      warrantyEndsAt: daysFromNow(20),
      nextMaintenanceAt: null,
    }

    expect(getAlerts(asset, DEFAULT_PREFS)).toEqual([
      {
        kind: 'warranty',
        severity: 'warning',
        daysLeft: 20,
      },
    ])
  })

  it('marks overdue maintenance as critical', () => {
    const asset: AssetRecord = {
      id: 'p1',
      name: 'Chalet',
      type: 'property',
      warrantyEndsAt: daysFromNow(60),
      nextMaintenanceAt: daysFromNow(-2),
    }

    expect(
      getAlerts(asset, {
        maintenanceDaysAhead: 10,
        warrantyDaysAhead: 30,
      }),
    ).toEqual([
      {
        kind: 'maintenance',
        severity: 'critical',
        daysLeft: -2,
      },
    ])
  })

  it('returns no alerts when dates are outside the thresholds', () => {
    const asset: AssetRecord = {
      id: 'e1',
      name: 'Router',
      type: 'electronics',
      warrantyEndsAt: daysFromNow(90),
      nextMaintenanceAt: daysFromNow(45),
    }

    expect(
      getAlerts(asset, {
        maintenanceDaysAhead: 14,
        warrantyDaysAhead: 30,
      }),
    ).toEqual([])
  })
})
