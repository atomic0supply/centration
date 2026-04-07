# 🎨 Documento de Diseño UI/UX — CONCENTRATE

> **Plataforma:** WebApp Progressive (PWA) — Responsive Desktop + Mobile  
> **Filosofía:** Precisión Quirúrgica — datos accionables con estética de calma y control.  
> **Actualizado:** 2026-04-07

---

## 1. Identidad Visual: "The Dark Command"

Dado que es una app de control total, la estética es minimalista, técnica y de alto contraste.

### Paleta de Colores

| Token | Valor | Uso |
|---|---|---|
| `--bg-primary` | `#121212` | Fondo base (evita negro puro para reducir OLED blooming) |
| `--bg-surface` | `#1E1E1E` | Cards, paneles, sidebars |
| `--bg-elevated` | `#2A2A2A` | Dropdowns, modales, tooltips |
| `--accent` | `#6200EE` | Electric Indigo — botones de escaneo, CTAs, prompts de IA |
| `--accent-hover` | `#7C3AED` | Estado hover del accent |
| `--success` | `#03DAC6` | Emerald Green — saldos positivos, stock lleno, confirmaciones |
| `--danger` | `#CF6679` | Soft Coral — deudas, caducidades, presupuesto excedido |
| `--warning` | `#F59E0B` | Amber — alertas preventivas (80% de presupuesto, stock bajo) |
| `--text-primary` | `#FFFFFF` | Texto principal |
| `--text-secondary` | `#A0A0B0` | Texto secundario, labels |
| `--text-disabled` | `#555566` | Texto inactivo |
| `--border` | `rgba(255,255,255,0.08)` | Bordes sutiles de cards |
| `--glass-bg` | `rgba(255,255,255,0.05)` | Fondo de GlassmorphismCards |
| `--glass-blur` | `12px` | Blur para glassmorphism |

### Tipografía

| Uso | Fuente | Peso | Tamaño |
|---|---|---|---|
| Títulos | `Inter` | 700 | 24–32px |
| Cuerpo | `Inter` | 400–500 | 14–16px |
| Labels | `Inter` | 600 | 11–12px (uppercase + letter-spacing) |
| Datos numéricos | `JetBrains Mono` | 500–600 | 16–28px |
| Monospace UI | `JetBrains Mono` | 400 | 13px |

---

## 2. Arquitectura de Información (Sitemap)

### Rutas Principales

| Ruta | Sección | Descripción |
|---|---|---|
| `/dashboard` | Control Room | Vista macro: Net Worth, alertas, resumen diario |
| `/ledger` | Ledger | Gastos, suscripciones, presupuesto |
| `/inventory` | Hogar | Despensa e inventario |
| `/assets` | Activos | Inmuebles, vehículos, electrónica, inversiones |
| `/concierge` | Conserje | Chat con Gemini AI |
| `/scan` | — | Modal de captura de ticket (FAB) |
| `/settings` | Ajustes | Perfil, presupuesto, notificaciones |
| `/login` | — | Autenticación |

### Jerarquía de Navegación

```
/dashboard
  └─ Widget: Net Worth → /assets
  └─ Widget: Alertas → /alerts
  └─ Widget: Gastos hoy → /ledger
/ledger
  ├─ /ledger/expenses         Listado de gastos
  ├─ /ledger/subscriptions    Suscripciones
  └─ /ledger/budget           Presupuesto
/inventory
  ├─ /inventory/pantry        Despensa
  └─ /inventory/shopping      Lista de la compra
/assets
  ├─ /assets/physical         Inmuebles y vehículos
  ├─ /assets/investments      Portafolio financiero
  └─ /assets/vault            Bóveda de documentos
/concierge                    Chat Gemini
/settings
  ├─ /settings/profile
  ├─ /settings/budget
  └─ /settings/notifications
```

---

## 3. Navegación Responsive (WebApp)

La navegación adapta su estructura según el tamaño de pantalla:

### Desktop (≥ 1024px) — Sidebar Izquierdo

```
+------------------+------------------------------------------+
|  ⚡ CONCENTRATE  |  [Topbar: Breadcrumb + Alertas + Perfil] |
|  ──────────────  +------------------------------------------+
|  🏠 Dashboard    |                                          |
|  📒 Ledger       |          Área de contenido               |
|  📦 Inventario   |                                          |
|  💰 Activos      |                                          |
|  💬 Conserje     |                                          |
|  ──────────────  |                                          |
|  ⚙️ Ajustes      |                                          |
|                  |                                          |
|  [👤 Usuario]    |                                      [+] |
+------------------+------------------------------------------+
```

- **Sidebar colapsable:** Al hacer clic en el logo, colapsa a solo iconos (64px de ancho).
- **FAB (→ /scan):** Botón flotante en la esquina inferior derecha del área de contenido.
- **Topbar:** Breadcrumb de la ruta actual + campana de notificaciones + avatar de perfil.

### Tablet (768–1023px) — Sidebar Colapsado por Defecto

- Sidebar solo muestra iconos (colapsado). Se expande al hacer hover o clic.
- FAB permanece en la esquina inferior derecha.

### Mobile (< 768px) — Bottom Navigation Bar

```
+------------------------------------------+
| [← ]   CONCENTRATE            [🔔] [👤]  |
+------------------------------------------+
|                                          |
|          Área de contenido               |
|                                          |
|                          [ + ]  ← FAB   |
+------------------------------------------+
|  🏠    📒    [  ⚡  ]    📦    💬       |
|  Home  Ledger  Scan   Hogar  Conserje   |
+------------------------------------------+
```

- **Bottom Bar:** 4 tabs + botón central FAB destacado (Electric Indigo, elevado).
- **FAB central:** Botón de escaneo/captura. Prominente, con sombra de color (`box-shadow: 0 0 20px rgba(98,0,238,0.5)`).
- **Safe Area:** Padding inferior para respetar la barra de gestos de iOS/Android.
- **Header mobile:** Solo logo + campana + avatar (sin sidebar).

---

## 4. Design System — Componentes Web

### Componentes Base

| Componente | Descripción | Props clave |
|---|---|---|
| `Button` | Botón con variantes | `variant: primary|ghost|danger|success`, `size: sm|md|lg`, `isLoading` |
| `Input` | Campo de texto | `label`, `error`, `prefix`, `suffix` |
| `GlassmorphismCard` | Card con efecto blur | `variant: default|elevated|bordered`, `padding` |
| `ProgressRing` | SVG animado circular | `value: 0-100`, `color`, `size`, `label` |
| `SkeletonLoader` | Placeholder de carga | `variant: text|card|chart|avatar` |
| `Modal` | Diálogo accesible | `isOpen`, `onClose`, `title`, `size` |
| `Toast` | Notificación auto-dismiss | `type: success|error|warning|info`, `duration` |
| `Badge` | Etiqueta pequeña | `color`, `size` |
| `Chip` | Tag seleccionable | `selected`, `onClick`, `icon` |
| `DataOriginIcon` | Icono de origen del dato | `origin: camera|ai|manual` |

### Componentes de Dominio

| Componente | Descripción |
|---|---|
| `NetWorthWidget` | Valor + tendencia + micro gráfico de línea |
| `ExpenseCard` | Lista item de gasto con origen, categoría, importe |
| `InventoryCard` | Producto con ProgressRing de stock |
| `SubscriptionCard` | Suscripción con próximo cobro y estado |
| `AssetCard` | Activo físico con valor y alertas de mantenimiento |
| `AlertBadge` | Alerta crítica con severidad y link a detalle |
| `ChatBubble` | Burbuja de mensaje (user / assistant) |
| `RichCard` | Widget dinámico dentro del chat (gráfico, tabla, alerta) |
| `ScannerOverlay` | Animación de escáner láser sobre la miniatura del ticket |
| `ConfirmationCard` | Tarjeta flotante post-escaneo con auto-confirmación |

---

## 5. UX: Los 3 Flujos Maestros

### A. El Escaneo Invisible (Target: < 8s)

El usuario no debería sentir que está trabajando para la app.

1. **Tap en FAB** → Se abre la pantalla `/scan` instantáneamente (transición slide-up).
2. **Vista de cámara** → Viewfinder con guías de encuadre sutiles para el ticket.
3. **Captura** → Vibración háptica corta (`navigator.vibrate(50)`) + flash visual de confirmación.
4. **Procesamiento** → La pantalla muestra un escáner láser animado (CSS animation) sobre la miniatura de la foto + texto "Analizando con Gemini...".
5. **Confirmation Card** → Aparece una tarjeta flotante con:
   - Total: **22.50€** | Mercadona | 8 items
   - Timer visual de 5 segundos (auto-confirma).
   - Botón **"Confirmar"** (inmediato) y **"Editar"** (abre formulario).
6. **Fin** → Toast de éxito + regresa al Dashboard/Ledger.

**Flujo de error:** Si Gemini no puede leer el ticket → `ScannerOverlay` cambia a estado error (Soft Coral) + mensaje "No pude leer el ticket. Introduce los datos manualmente." → Abre formulario con campos vacíos.

### B. El Dashboard de "Un Vistazo"

No busques datos; deja que los datos te busquen.

- **Bento Grid** de widgets de diferentes tamaños (resizable en desktop mediante drag).
- **Widget superior (2/3 del ancho):** Net Worth con flecha de tendencia y gráfico de línea de 30 días.
- **Sección Alertas Críticas:** Solo aparece si hay alertas pendientes. Se oculta automáticamente cuando están resueltas.
- **Gráfico de flujo:** Barras apiladas Ingresos vs. Gastos del mes, con línea de presupuesto.

### C. El Modo Conserje (Chat)

- **Interfaz limpia tipo terminal oscura.** Sin sidebar visible en mobile (pantalla completa).
- **Solo un input de texto/voz.** Chips de sugerencias: *"¿Cómo van mis ETFs?"*, *"¿Qué cocino hoy?"*, *"¿Cuánto llevo gastado este mes?"*.
- **Rich Cards:** Cuando Gemini detecta que la respuesta se beneficia de un componente visual, devuelve un `richCard` con payload que el frontend renderiza como:
  - `chart` → Componente Recharts inline
  - `table` → Tabla de datos formateada
  - `alert` → Card de alerta con acción directa

---

## 6. Prototipo de Pantalla Principal

### Desktop Layout

```
+------------------+------------------------------------------+
|  ⚡ CONCENTRATE  |  Dashboard            🔔 3  [Avatar]     |
|  ──────────────  +------------------------------------------+
|  🏠 Dashboard ←  |  PATRIMONIO NETO                    [↗]  |
|  📒 Ledger       |  € 124,500.80  (+2.3% este mes)          |
|  📦 Inventario   |  [Gráfico de línea 30d — minimalista]    |
|  💰 Activos      +------------------+---------------------+  |
|  💬 Conserje     |  ALERTAS (3)     |  HOY                |  |
|  ──────────────  |  (!) Amazon (14€)|  Gastado: 45.00€    |  |
|  ⚙️ Ajustes      |  (!) Leche x2    |  Budget: 62%  ████░ |  |
|                  |  (!) ITV coche   |  vs ayer: -12%      |  |
|  [👤 Perfil]     +------------------+---------------------+  |
|                  |  GASTOS MES  ████████░░ 62% (1,240€)   |  |
|                  |  [Gráfico barras: Ingresos vs Gastos]   |  |
|                  +------------------------------------------+  |
|                  |  INVERSIONES         +2.1% hoy  [Ver →] |  |
|                  |  BTC ▲ ETF ▲ TOTAL: 45,000€            |  |
|                  +------------------------------------------+  |
|                  |                                      [+] |  |
+------------------+------------------------------------------+
```

### Mobile Layout

```
+------------------------------------------+
|  ⚡ CONCENTRATE          🔔   [Avatar]   |
+------------------------------------------+
|  € 124,500.80                      ↗+2.3%|
|  ──────────────────────────────────────── |
|  🔴 ALERTAS CRÍTICAS                      |
|  (!) Amazon Prime renovará mañana (14€)   |
|  (!) Quedan 2 unidades de: Huevos         |
+------------------------------------------+
|  HOY — Lunes 7 abril                     |
|  Gastado: 45.00€     Budget: 62% ████░   |
+------------------------------------------+
|  [  🏠  ]  [  📒  ]  [  ⚡  ]  [  📦  ]  [  💬  ] |
+------------------------------------------+
```

---

## 7. Diseño de Interacción (Micro-feedbacks)

### Feedback Háptico (Web Vibration API)

| Evento | Patrón de vibración |
|---|---|
| Gasto confirmado | `vibrate(50)` — pulso suave |
| Error de escaneo | `vibrate([100,50,100])` — doble pulso |
| Alerta crítica (en la web) | `vibrate(200)` — pulso largo |
| Swipe completado | `vibrate(30)` — micro-feedback |

> Nota: La Vibration API solo funciona en Android. iOS la ignora silenciosamente (no hay error).

### Skeleton Loaders

- Mientras Gemini procesa un ticket → la `ConfirmationCard` muestra la estructura de sus campos en skeleton (gris pulsante) antes de revelar los datos.
- En cambios de página → los widgets del Dashboard muestran skeleton hasta que los datos de Firestore llegan.

### Gestos de Swipe (Touch Events / Pointer Events)

En la lista de inventario (`/inventory/pantry`):
- **Swipe derecha** → "Consumido totalmente" → animación de salida a la derecha + actualización en Firestore.
- **Swipe izquierda** → "Eliminar/Tirar" → animación de salida a la izquierda + diálogo de confirmación (por ser destructivo).
- **Umbral:** El gesto se activa tras 80px de desplazamiento. Muestra icon de acción progresivamente (aparece al deslizar).

### Transiciones de Página

- Usando Framer Motion: `AnimatePresence` con slide horizontal entre páginas principales.
- Modales: slide-up en mobile, fade+scale en desktop.
- FAB a /scan: slide-up de pantalla completa.

### Modo Reducción de Movimiento

- Si `prefers-reduced-motion: reduce` → todas las animaciones se deshabilitan. Solo opacidad fade (sin transforms).

---

## 8. Modo Auditoría

Al activarlo en `/settings`, cada dato en la app muestra un pequeño icono de origen:

| Origen | Icono | Significado |
|---|---|---|
| 📷 Cámara | `camera` (Lucide) | Dato extraído de foto de ticket |
| 🤖 IA | `bot` (Lucide) | Dato procesado/inferido por Gemini |
| ✏️ Manual | `pencil` (Lucide) | Dato introducido manualmente por el usuario |

La transparencia total sobre el origen de cada dato genera confianza en el sistema.

---

## 9. Accesibilidad (WCAG AA)

- **Contraste:** Todos los textos sobre fondo `#121212` cumplen ratio ≥ 4.5:1.
- **ARIA:** `role`, `aria-label`, `aria-describedby` en todos los elementos interactivos no semánticos.
- **Focus visible:** Outline de `2px solid var(--accent)` en todos los elementos focusables.
- **Navegación por teclado:** Modales con focus trap. Tab order lógico. Esc cierra modales.
- **Alt text:** Imágenes de tickets muestran descripción generada por Gemini como `alt`.
- **Tamaño mínimo de touch:** 44×44px en todos los elementos interactivos (mobile).

---

## 10. Temas

- **Dark Mode:** Único tema v1.0 (la identidad visual es dark-only).
- **Auto Dark Mode:** La meta tag `color-scheme: dark` fuerza el dark mode del sistema operativo.
- **Futuro:** Light mode como opción en `/settings` (preparar CSS custom properties para swap de tokens).