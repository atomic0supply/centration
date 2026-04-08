import { Button, Card } from '@/components/ui'
import {
  type AssetAlertPreferences,
  type AssetMaintenanceEntry,
  daysUntilIso,
  getMaintenanceKindLabel,
} from '@/stores/assetsStore'
import { formatCurrency, formatShortDate } from '@/utils/formatters'

import styles from './Assets.module.css'

interface MaintenanceLogProps {
  assetName: string
  entries: AssetMaintenanceEntry[]
  preferences: AssetAlertPreferences
  onAdd: () => void
  onEdit: (entry: AssetMaintenanceEntry) => void
  onDelete: (entry: AssetMaintenanceEntry) => void
}

function severityClass(daysLeft: number | null): string {
  if (daysLeft === null) return styles.chipNeutral
  if (daysLeft < 0) return styles.chipCritical
  if (daysLeft <= 7) return styles.chipWarning
  return styles.chipInfo
}

function dueLabel(daysLeft: number | null): string {
  if (daysLeft === null) return 'Sin próxima cita'
  if (daysLeft < 0) return `Vencida hace ${String(Math.abs(daysLeft))} día${Math.abs(daysLeft) === 1 ? '' : 's'}`
  if (daysLeft === 0) return 'Hoy'
  return `En ${String(daysLeft)} día${daysLeft === 1 ? '' : 's'}`
}

export function MaintenanceLog({ assetName, entries, preferences, onAdd, onEdit, onDelete }: MaintenanceLogProps) {
  const upcoming = entries
    .filter((entry) => entry.nextDueDate && (daysUntilIso(entry.nextDueDate) ?? Number.POSITIVE_INFINITY) <= preferences.maintenanceDaysAhead)
    .slice()
    .sort((a, b) => (daysUntilIso(a.nextDueDate) ?? Number.POSITIVE_INFINITY) - (daysUntilIso(b.nextDueDate) ?? Number.POSITIVE_INFINITY))

  const history = entries.slice().sort((a, b) => b.performedAt.localeCompare(a.performedAt))

  return (
    <div className={styles.detailSection}>
      <div className={styles.detailSectionHeader}>
        <div>
          <div className={styles.detailSectionTitle}>Bitácora de mantenimiento</div>
          <div className={styles.detailSectionMeta}>{assetName}</div>
        </div>
        <Button size="sm" onClick={onAdd}>
          Nueva revisión
        </Button>
      </div>

      <div className={styles.maintenanceUpcoming}>
        <Card className={styles.detailStat}>
          <span className={styles.detailStatLabel}>Próximas citas</span>
          <span className={styles.detailStatValue}>{upcoming.length}</span>
        </Card>
        <Card className={styles.detailStat}>
          <span className={styles.detailStatLabel}>Historial</span>
          <span className={styles.detailStatValue}>{history.length}</span>
        </Card>
      </div>

      <div className={styles.maintenanceGroup}>
        <div className={styles.maintenanceGroupTitle}>
          <span>Próximas citas</span>
          <span className={styles.detailSectionMeta}>Umbral: {preferences.maintenanceDaysAhead} días</span>
        </div>
        {upcoming.length === 0 ? (
          <div className={styles.maintenanceEmpty}>No hay próximas citas dentro del umbral configurado.</div>
        ) : (
          <div className={styles.maintenanceList}>
            {upcoming.map((entry) => {
              const daysLeft = daysUntilIso(entry.nextDueDate)
              function handleEditClick() {
                onEdit(entry)
              }

              function handleDeleteClick() {
                onDelete(entry)
              }

              return (
                <div key={entry.id} className={styles.maintenanceItem}>
                  <div className={styles.maintenanceItemMain}>
                    <div className={styles.maintenanceItemTitle}>
                      <span>{entry.title}</span>
                      <span className={`${styles.chip} ${severityClass(daysLeft)}`}>{dueLabel(daysLeft)}</span>
                    </div>
                    <div className={styles.maintenanceItemMeta}>
                      <span>{getMaintenanceKindLabel(entry.kind)}</span>
                      <span>Realizada: {formatShortDate(entry.performedAt)}</span>
                      {entry.nextDueDate && <span>Próxima: {formatShortDate(entry.nextDueDate)}</span>}
                      {entry.cost !== null && <span>Coste: {formatCurrency(entry.cost)}</span>}
                    </div>
                  </div>
                  <div className={styles.maintenanceItemActions}>
                    <Button size="sm" variant="secondary" onClick={handleEditClick}>
                      Editar
                    </Button>
                    <Button size="sm" variant="ghost" onClick={handleDeleteClick}>
                      Eliminar
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className={styles.maintenanceGroup}>
        <div className={styles.maintenanceGroupTitle}>
          <span>Historial</span>
          <span className={styles.detailSectionMeta}>Entradas completas</span>
        </div>
        {history.length === 0 ? (
          <div className={styles.maintenanceEmpty}>Todavía no hay revisiones registradas.</div>
        ) : (
          <div className={styles.maintenanceList}>
            {history.map((entry) => {
              const daysLeft = entry.nextDueDate ? daysUntilIso(entry.nextDueDate) : null
              function handleEditClick() {
                onEdit(entry)
              }

              function handleDeleteClick() {
                onDelete(entry)
              }

              return (
                <div key={entry.id} className={styles.maintenanceItem}>
                  <div className={styles.maintenanceItemMain}>
                    <div className={styles.maintenanceItemTitle}>
                      <span>{entry.title}</span>
                      <span className={`${styles.chip} ${entry.completed ? styles.chipSuccess : styles.chipNeutral}`}>
                        {entry.completed ? 'Completada' : 'Pendiente'}
                      </span>
                    </div>
                    <div className={styles.maintenanceItemMeta}>
                      <span>{getMaintenanceKindLabel(entry.kind)}</span>
                      <span>Realizada: {formatShortDate(entry.performedAt)}</span>
                      {entry.nextDueDate && <span>Próxima: {formatShortDate(entry.nextDueDate)} · {dueLabel(daysLeft)}</span>}
                      {entry.mileageKm !== null && <span>{entry.mileageKm} km</span>}
                    </div>
                    {entry.description && <div className={styles.detailNotes}>{entry.description}</div>}
                  </div>
                  <div className={styles.maintenanceItemActions}>
                    <Button size="sm" variant="secondary" onClick={handleEditClick}>
                      Editar
                    </Button>
                    <Button size="sm" variant="ghost" onClick={handleDeleteClick}>
                      Eliminar
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
