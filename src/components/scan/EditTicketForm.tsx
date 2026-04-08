import { zodResolver } from '@hookform/resolvers/zod'
import { motion } from 'framer-motion'
import { useFieldArray, useForm } from 'react-hook-form'
import { z } from 'zod'

import { Button, Input } from '@/components/ui'
import {
  CATEGORY_EMOJIS,
  CATEGORY_LABELS,
  type ExtractedTicket,
  type TicketCategory,
} from '@/types/ticket'

/* ── Schema ── */
const itemSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Requerido'),
  quantity: z.coerce.number().min(1),
  unitPrice: z.coerce.number().min(0),
  total: z.coerce.number().min(0),
})

const schema = z.object({
  store: z.string().min(1, 'Nombre de tienda requerido'),
  date: z.string().min(1, 'Fecha requerida'),
  total: z.coerce.number().min(0, 'Total inválido'),
  currency: z.string(),
  category: z.enum([
    'alimentacion',
    'transporte',
    'salud',
    'hogar',
    'entretenimiento',
    'ropa',
    'otros',
  ]),
  notes: z.string().optional(),
  items: z.array(itemSchema),
})

type FormData = z.infer<typeof schema>

interface EditTicketFormProps {
  ticket: ExtractedTicket
  onSave: (updated: ExtractedTicket) => void
  onCancel: () => void
}

export function EditTicketForm({ ticket, onSave, onCancel }: EditTicketFormProps) {
  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      store: ticket.store,
      date: ticket.date,
      total: ticket.total,
      currency: ticket.currency,
      category: ticket.category,
      notes: ticket.notes ?? '',
      items: ticket.items.map((i) => ({
        id: i.id,
        name: i.name,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        total: i.total,
      })),
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'items' })
  const selectedCategory = watch('category')

  const onSubmit = (data: FormData) => {
    onSave({
      ...ticket,
      ...data,
      origin: 'manual',
      items: data.items.map((item) => ({
        ...item,
        origin: 'manual' as const,
      })),
    })
  }

  return (
    <motion.form
      onSubmit={handleSubmit(onSubmit)}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-5)',
        width: '100%',
        maxWidth: 520,
        margin: '0 auto',
      }}
    >
      {/* ── Header fields ── */}
      <section
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-xl)',
          padding: 'var(--space-5)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-4)',
        }}
      >
        <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: -4 }}>
          Datos del ticket
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
          <Input
            label="Tienda"
            placeholder="Mercadona"
            error={errors.store?.message}
            {...register('store')}
            style={{ gridColumn: '1 / -1' }}
          />
          <Input
            label="Fecha"
            type="date"
            error={errors.date?.message}
            {...register('date')}
          />
          <Input
            label="Total (€)"
            type="number"
            step="0.01"
            placeholder="0.00"
            error={errors.total?.message}
            {...register('total')}
          />
        </div>

        <Input
          label="Notas (opcional)"
          placeholder="Compra semanal, regalo, etc."
          {...register('notes')}
        />
      </section>

      {/* ── Category ── */}
      <section
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-xl)',
          padding: 'var(--space-5)',
        }}
      >
        <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 'var(--space-3)' }}>
          Categoría
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 'var(--space-2)' }}>
          {(Object.keys(CATEGORY_LABELS) as TicketCategory[]).map((cat) => {
            const active = selectedCategory === cat
            return (
              <button
                key={cat}
                type="button"
                onClick={() => { setValue('category', cat) }}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 4,
                  padding: 'var(--space-3)',
                  borderRadius: 'var(--radius-md)',
                  background: active ? 'var(--accent-bg)' : 'var(--bg-tertiary)',
                  border: `1px solid ${active ? 'var(--accent-border)' : 'var(--border)'}`,
                  cursor: 'pointer',
                  transition: 'all var(--transition-base)',
                  color: active ? 'var(--accent-light)' : 'var(--text-muted)',
                }}
              >
                <span style={{ fontSize: 20 }}>{CATEGORY_EMOJIS[cat]}</span>
                <span style={{ fontSize: 11, fontWeight: 500 }}>{CATEGORY_LABELS[cat]}</span>
              </button>
            )
          })}
        </div>
      </section>

      {/* ── Items ── */}
      <section
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-xl)',
          padding: 'var(--space-5)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-3)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)' }}>
            Artículos ({fields.length})
          </h3>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() =>
              append({ id: crypto.randomUUID(), name: '', quantity: 1, unitPrice: 0, total: 0 })
            }
          >
            + Añadir
          </Button>
        </div>

        {fields.map((field, index) => (
          <div
            key={field.id}
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 56px 72px 28px',
              gap: 'var(--space-2)',
              alignItems: 'end',
              paddingBottom: 'var(--space-3)',
              borderBottom: '1px solid var(--border)',
            }}
          >
            <Input
              placeholder="Nombre del artículo"
              error={errors.items?.[index]?.name?.message}
              {...register(`items.${index}.name`)}
            />
            <Input
              placeholder="Cant."
              type="number"
              min="1"
              step="1"
              {...register(`items.${index}.quantity`)}
            />
            <Input
              placeholder="€ Total"
              type="number"
              step="0.01"
              min="0"
              {...register(`items.${index}.total`)}
            />
            <button
              type="button"
              onClick={() => { remove(index) }}
              aria-label="Eliminar artículo"
              style={{
                width: 28,
                height: 44,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                borderRadius: 'var(--radius-sm)',
                transition: 'color var(--transition-fast)',
                flexShrink: 0,
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--error)' }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)' }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14H6L5 6" />
                <path d="M10 11v6M14 11v6" />
              </svg>
            </button>
          </div>
        ))}
      </section>

      {/* ── Submit ── */}
      <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
        <Button type="button" variant="ghost" size="lg" onClick={onCancel} style={{ flex: 1 }}>
          Cancelar
        </Button>
        <Button type="submit" variant="primary" size="lg" style={{ flex: 2 }}>
          Guardar cambios
        </Button>
      </div>
    </motion.form>
  )
}
