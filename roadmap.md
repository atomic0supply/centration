# 🗺️ ROADMAP — Concentrate WebApp

> **Versión:** 1.0  
> **Fecha:** 2026-04-07  
> **Documentos fuente:** `design.md` · `functions.md` · `techcnical.md`

---

## PARTE 1 — Revisión Crítica de los Documentos Actuales

### ✅ Lo que está bien definido

| Aspecto | Documento | Comentario |
|---|---|---|
| Visión y propósito del producto | `functions.md` | Clara y ambiciosa. "Life OS" bien articulado. |
| Paleta de colores y tipografía | `design.md` | Buenas decisiones (Deep Charcoal, Inter, JetBrains Mono). |
| Modelo de datos Firestore | `techcnical.md` | Esquemas JSON bien pensados para `expenses`, `inventory`, `assets`. |
| Flujo de ingesta (Vision-to-Data) | `techcnical.md` | Arquitectura Storage → Cloud Function → Gemini → Firestore bien definida. |
| Reglas de negocio transversales | `techcnical.md` | Regla de activos (>150€) y detección de suscripciones recurrentes. |
| Seguridad base | `techcnical.md` | Secret Manager, Security Rules por UID. |

### ✅ Decisiones Confirmadas y Gaps Resueltos

| # | Punto | Estado | Resolución en docs |
|---|---|---|---|
| 1 | **Plataforma** | ✅ Resuelto | **WebApp PWA — Vite + React 19 + TypeScript**. Actualizado en `techcnical.md` §2 y `functions.md` §6. |
| 2 | **Navegación Responsive** | ✅ Resuelto | Desktop: Sidebar colapsable. Mobile: Bottom Nav + FAB central. Especificado en `design.md` §3. |
| 3 | **Modelo de datos completo** | ✅ Resuelto | Añadidas colecciones: `subscriptions`, `alerts`, `shopping_lists`, `chat_history`, `investments`, `networth_snapshots`. Ver `techcnical.md` §4. |
| 4 | **Conserje/Chat (flujo técnico)** | ✅ Resuelto | Arquitectura Cloud Function + context injection + Rich Cards definida en `techcnical.md` §5.3 y `functions.md` §5. |
| 5 | **Gestión de estado** | ✅ Resuelto | **Zustand** — stores por módulo. Listeners `onSnapshot` en login, reset en logout. Ver `techcnical.md` §8. |
| 6 | **Notificaciones** | ✅ Resuelto | FCM + Service Worker para push. Centro de notificaciones in-app con colección `alerts`. Ver `techcnical.md` §11. |
| 7 | **Plan de tests** | ✅ Resuelto | Vitest + Testing Library (unitario/integración) + Playwright (E2E). Ver `techcnical.md` §14. |
| 8 | **CI/CD** | ✅ Resuelto | GitHub Actions → Firebase Hosting. Preview en PRs, producción en merge a `main`. Ver `techcnical.md` §10. |
| 9 | **Manejo de errores de IA** | ✅ Resuelto | Tabla de errores (UNREADABLE, TIMEOUT, INVALID_JSON, QUOTA_EXCEEDED) con respuesta UX para cada caso. Ver `techcnical.md` §6. |
| 10 | **APIs externas (detalle)** | ✅ Resuelto | CoinGecko + Yahoo Finance proxied via Cloud Functions. Caché Firestore TTL 15min. Fallback a último precio cacheado. Ver `techcnical.md` §15. |
| 11 | **Auth flow completo** | ✅ Resuelto | Email/password, persistent session, ProtectedRoute, reset password, logout por inactividad. Ver `techcnical.md` §7. |
| 12 | **i18n preparación** | ✅ Resuelto | `src/i18n/es.json` desde inicio. Strings extraídos para facilitar traducción futura. Ver `techcnical.md` §17. |
| 13 | **Accesibilidad (a11y)** | ✅ Resuelto | WCAG AA, ARIA, focus visible, touch targets 44px, `prefers-reduced-motion`. Ver `design.md` §9 y `techcnical.md` §17. |
| 14 | **Estructura de carpetas** | ✅ Resuelto | Árbol completo del proyecto en `techcnical.md` §9. |
| 15 | **Prompts de IA (detalle)** | ✅ Resuelto | System prompts para Vision, Voice y Conserje definidos en `techcnical.md` §5. |

---

## PARTE 2 — Decisiones Técnicas Recomendadas

Estas decisiones deben confirmarse antes de empezar el desarrollo.

| Decisión | Recomendación | Alternativa |
|---|---|---|
| **Framework** | Vite + React 19 + TypeScript | Next.js (si se necesita SSR/SEO público) |
| **Estilos** | CSS Modules + CSS Variables (Design Tokens) | Tailwind CSS v4 |
| **Estado global** | Zustand (ligero, sin boilerplate) | Redux Toolkit |
| **Routing** | React Router v7 | TanStack Router |
| **Firebase SDK** | Firebase Web SDK v10 (modular) | — |
| **Gráficos** | Recharts o Chart.js | D3.js (si se necesita customización extrema) |
| **Animaciones** | Framer Motion | Lottie (para micros específicas) |
| **Formularios** | React Hook Form + Zod (validación) | — |
| **Testing** | Vitest + Testing Library + Playwright (E2E) | — |
| **CI/CD** | GitHub Actions → Firebase Hosting | Cloud Build |
| **PWA** | Vite PWA Plugin (Workbox) | — |
| **Notificaciones** | Firebase Cloud Messaging (FCM) + Service Worker | — |

---

## PARTE 3 — Roadmap de Desarrollo Completo

### Nomenclatura

- 🟢 = Tarea sencilla (< 4h)
- 🟡 = Tarea media (4–8h)
- 🔴 = Tarea compleja (> 8h)
- 📋 = Requiere decisión previa
- 🧪 = Incluye tests

---

## FASE 0 — Fundación del Proyecto (Sprint 1)
> **Duración estimada:** 1 semana  
> **Objetivo:** Proyecto configurado, desplegable y con CI/CD

### 0.1 Scaffolding y Configuración
| # | Tarea | Complejidad | Detalle |
|---|---|---|---|
| 0.1.1 | Inicializar proyecto Vite + React + TS | 🟢 | `npx create-vite@latest ./ --template react-ts` |
| 0.1.2 | Configurar ESLint + Prettier | 🟢 | Reglas estrictas de TS, importaciones ordenadas |
| 0.1.3 | Configurar estructura de carpetas | 🟢 | `src/{components, pages, hooks, services, stores, utils, types, assets, styles}` |
| 0.1.4 | Instalar dependencias core | 🟢 | React Router, Zustand, Firebase SDK, Framer Motion, Recharts |
| 0.1.5 | Configurar aliases de importación (`@/`) | 🟢 | `tsconfig.json` + `vite.config.ts` |
| 0.1.6 | Crear `.env.example` y `.env.local` | 🟢 | Variables de Firebase, Gemini API key (ref a Secret Manager) |

### 0.2 Firebase Setup
| # | Tarea | Complejidad | Detalle |
|---|---|---|---|
| 0.2.1 | Crear proyecto Firebase | 🟢 | Console o CLI |
| 0.2.2 | Configurar Firestore (reglas iniciales) | 🟡 | Reglas restrictivas por UID como indica `techcnical.md` |
| 0.2.3 | Configurar Firebase Storage (reglas + CORS) | 🟡 | Bucket para tickets, documentos vault |
| 0.2.4 | Configurar Firebase Auth (email/password) | 🟢 | Provider base, expandible |
| 0.2.5 | Inicializar Firebase Hosting | 🟢 | Vinculado al proyecto Vite |
| 0.2.6 | Configurar Cloud Functions (Node.js 20) | 🟡 | Entorno base con Gemini SDK |
| 0.2.7 | Configurar Secret Manager | 🟡 | API keys de Gemini, CoinGecko, Yahoo Finance |

### 0.3 CI/CD y Deploy
| # | Tarea | Complejidad | Detalle |
|---|---|---|---|
| 0.3.1 | Crear repositorio GitHub | 🟢 | Con `.gitignore` adecuado |
| 0.3.2 | Configurar GitHub Actions | 🟡 | Pipeline: Lint → Test → Build → Deploy a Firebase Hosting |
| 0.3.3 | Primer deploy (Hello World) | 🟢 | Verificar que el pipeline funciona end-to-end |

---

## FASE 1 — Design System + Auth (Sprint 2)
> **Duración estimada:** 1 semana  
> **Objetivo:** Sistema de diseño funcional y autenticación completa

### 1.1 Design System / Tokens
| # | Tarea | Complejidad | Detalle |
|---|---|---|---|
| 1.1.1 | Crear Design Tokens (CSS Variables) | 🟡 | Colores (`--bg-primary: #121212`, `--accent: #6200EE`, etc.), espaciado, radios, sombras |
| 1.1.2 | Configurar tipografía (Inter + JetBrains Mono) | 🟢 | Google Fonts, clases `.text-body`, `.text-mono` |
| 1.1.3 | Crear componentes base: Button, Input, Card | 🟡 | Con variantes (primary, ghost, danger), estados hover/focus/disabled |
| 1.1.4 | Crear GlassmorphismCard (efecto blur) | 🟡 | `backdrop-filter: blur()`, borde sutil, compatible con el tema dark |
| 1.1.5 | Crear componente Modal/Dialog | 🟡 | Accesible, con animación de entrada/salida |
| 1.1.6 | Crear componente Toast/Notification | 🟡 | Auto-dismiss, tipos: success, error, warning, info |
| 1.1.7 | Crear componente Skeleton Loader | 🟢 | Para estados de carga (como indica `design.md`) |
| 1.1.8 | Crear componente ProgressRing | 🟡 | SVG animado, configurable (porcentaje, color, tamaño) |
| 1.1.9 | Documentar componentes (Storybook opcional) | 📋🟡 | Decidir si vale la pena Storybook para un proyecto personal |

### 1.2 Layout y Navegación
| # | Tarea | Complejidad | Detalle |
|---|---|---|---|
| 1.2.1 | Crear Layout principal responsive | 🔴 | **Desktop:** Sidebar izquierdo colapsable + área de contenido. **Mobile:** Bottom bar con FAB central |
| 1.2.2 | Implementar React Router (rutas) | 🟡 | `/dashboard`, `/ledger`, `/inventory`, `/concierge`, `/settings`, `/scan` |
| 1.2.3 | Crear Sidebar con iconos + labels | 🟡 | Dashboard, Ledger, Hogar, Conserje, Ajustes. Colapsable con animación |
| 1.2.4 | Crear Bottom Navigation (mobile) | 🟡 | 4 tabs + FAB central flotante (cámara/input) |
| 1.2.5 | Implementar rutas protegidas | 🟢 | Redirect a `/login` si no autenticado |

### 1.3 Autenticación
| # | Tarea | Complejidad | Detalle |
|---|---|---|---|
| 1.3.1 | Página de Login | 🟡 | Email + password, diseño dark, logo de la app |
| 1.3.2 | Página de Registro | 🟡 | Con validación Zod |
| 1.3.3 | Recuperación de contraseña | 🟢 | Firebase Auth `sendPasswordResetEmail` |
| 1.3.4 | Hook `useAuth()` | 🟡 | Estado de sesión, loading, user, signOut. Persistencia con `onAuthStateChanged` |
| 1.3.5 | Guard de rutas (ProtectedRoute) | 🟢 | HOC o wrapper que verifica auth |
| 1.3.6 | Página de perfil/ajustes de usuario | 🟡 | Cambio de nombre, avatar, preferencias |
| 1.3.7 | 🧪 Tests de autenticación | 🟡 | Login/logout, protección de rutas, estados de error |

---

## FASE 2 — Motor de Ingesta IA (Sprint 3–4)
> **Duración estimada:** 2 semanas  
> **Objetivo:** El flujo core de < 10 segundos: Captura → IA → Datos

### 2.1 Captura de Imagen
| # | Tarea | Complejidad | Detalle |
|---|---|---|---|
| 2.1.1 | Componente de cámara (MediaDevices API) | 🔴 | Acceso a cámara nativa del navegador, preview en vivo, botón de captura |
| 2.1.2 | Soporte para subida desde galería | 🟡 | Input file como fallback en desktop |
| 2.1.3 | Preview de imagen capturada | 🟢 | Con opción de re-capturar o confirmar |
| 2.1.4 | Compresión de imagen pre-upload | 🟡 | Reducir tamaño para optimizar costes de Storage y latencia de Gemini |
| 2.1.5 | Animación de "escáner láser" | 🟡 | Como define `design.md`, sobre la miniatura durante el procesamiento |
| 2.1.6 | Subida a Firebase Storage | 🟡 | Path: `tickets/{uid}/{timestamp}.webp`, con metadata |

### 2.2 Cloud Function: Procesamiento con Gemini
| # | Tarea | Complejidad | Detalle |
|---|---|---|---|
| 2.2.1 | Cloud Function trigger (Storage onFinalize) | 🔴 | Se dispara al subir imagen |
| 2.2.2 | Integración con Gemini 1.5 Flash API | 🔴 | Envío de imagen, system prompt de extracción, structured JSON output |
| 2.2.3 | Validación del JSON de respuesta (Zod) | 🟡 | Schema validation antes de guardar |
| 2.2.4 | Lógica de escritura en `expenses` | 🟡 | Crear documento con datos parseados |
| 2.2.5 | Lógica de upsert en `inventory` | 🔴 | Buscar producto por nombre (fuzzy match), actualizar cantidad o crear nuevo |
| 2.2.6 | Lógica de detección de activos | 🟡 | Si categoría tech/home y >150€ → flag `potentialAsset` |
| 2.2.7 | Manejo de errores de IA | 🟡 | Ticket ilegible, timeout, respuesta malformada → notificar al usuario para entrada manual |
| 2.2.8 | 🧪 Tests de Cloud Function | 🔴 | Mocks de Gemini, tests con imágenes reales de tickets |

### 2.3 UI Post-Procesamiento
| # | Tarea | Complejidad | Detalle |
|---|---|---|---|
| 2.3.1 | Pantalla de confirmación (Summary Card) | 🟡 | "Total: 22.50€ / Mercadona / 8 items" con botón Confirmar/Editar |
| 2.3.2 | Formulario de edición manual | 🟡 | Si el usuario quiere corregir datos de la IA |
| 2.3.3 | Auto-confirmación (5 segundos) | 🟢 | Timer visual, cancelable |
| 2.3.4 | Indicador de origen del dato | 🟢 | Icono de cámara/robot/lápiz ("Modo Auditoría" de `design.md`) |
| 2.3.5 | Notificación de éxito in-app | 🟢 | Toast: "Gasto registrado correctamente" |

### 2.4 Voice-to-Inventory (Entrada por Voz)
| # | Tarea | Complejidad | Detalle |
|---|---|---|---|
| 2.4.1 | Integración Web Speech API | 🔴 | Reconocimiento de voz en navegador |
| 2.4.2 | Parseo de comandos naturales con Gemini | 🔴 | "He terminado el café" → `{ action: "consume", item: "café", quantity: 1 }` |
| 2.4.3 | UI de micrófono (botón + feedback visual) | 🟡 | Indicador de grabación, animación de onda |
| 2.4.4 | 🧪 Tests de flujo de voz | 🟡 | Mocks del Speech API |

---

## FASE 3 — Módulo Financiero (Sprint 5–7)
> **Duración estimada:** 3 semanas  
> **Objetivo:** Control total de gastos, suscripciones y presupuesto

### 3.1 Gastos (Ledger)
| # | Tarea | Complejidad | Detalle |
|---|---|---|---|
| 3.1.1 | Página de lista de gastos | 🟡 | Tabla/lista con filtros por fecha, categoría, proveedor |
| 3.1.2 | Detalle de gasto individual | 🟡 | Vista con desglose de items, imagen del ticket, origen del dato |
| 3.1.3 | Formulario de gasto manual | 🟡 | Para gastos sin ticket (transferencias, efectivo) |
| 3.1.4 | Edición y eliminación de gastos | 🟡 | Con confirmación y actualización de inventario si aplica |
| 3.1.5 | Categorización automática + manual | 🟡 | Chips de categoría editables, sugerencias IA |
| 3.1.6 | Gráfico de gastos por categoría | 🟡 | Donut chart + listado con Recharts |
| 3.1.7 | Gráfico de gastos en el tiempo | 🟡 | Line chart mensual/semanal |
| 3.1.8 | Exportación de datos (CSV) | 🟢 | Para reporting fiscal |
| 3.1.9 | 🧪 Tests del módulo de gastos | 🟡 | CRUD, filtros, cálculos |

### 3.2 Suscripciones
| # | Tarea | Complejidad | Detalle |
|---|---|---|---|
| 3.2.1 | Colección `subscriptions` en Firestore | 🟡 | Schema: nombre, precio, ciclo, próximo cobro, estado, categoría |
| 3.2.2 | Página de suscripciones activas | 🟡 | Cards con próximo cobro, coste mensual/anual total |
| 3.2.3 | Detección automática de suscripciones | 🔴 | Cloud Function que analiza `expenses` por proveedor recurrente |
| 3.2.4 | Calendario de cobros | 🟡 | Vista mensual con dots indicando cobros programados |
| 3.2.5 | Alertas de renovación | 🟡 | Notificación X días antes de renovación anual o fin de prueba |
| 3.2.6 | Optimizador de gastos (IA) | 🔴 | Gemini analiza uso vs. coste y sugiere cancelaciones |
| 3.2.7 | 🧪 Tests de suscripciones | 🟡 | Detección, alertas, cálculos |

### 3.3 Presupuesto Dinámico
| # | Tarea | Complejidad | Detalle |
|---|---|---|---|
| 3.3.1 | Configuración de presupuesto mensual | 🟡 | Global y por categoría |
| 3.3.2 | Barra de progreso de presupuesto | 🟡 | Con indicadores de zona (verde/amarillo/rojo) |
| 3.3.3 | Alertas de exceso de presupuesto | 🟢 | Cuando se llega al 80% y 100% |
| 3.3.4 | Presupuesto ajustado por inversiones | 🔴 | Integración con datos de inversiones para ajustar dinámicamente |

---

## FASE 4 — Inventario y Hogar (Sprint 8–9)
> **Duración estimada:** 2 semanas  
> **Objetivo:** Gestión completa de despensa, caducidades y hogar

### 4.1 Inventario / Despensa
| # | Tarea | Complejidad | Detalle |
|---|---|---|---|
| 4.1.1 | Página de inventario con búsqueda y filtros | 🟡 | Por categoría, stock bajo, próxima caducidad |
| 4.1.2 | Card de producto con ProgressRing de stock | 🟡 | Cantidad actual vs. mínimo, indicador visual |
| 4.1.3 | Swipe gestures (Consumido / Eliminar) | 🟡 | Como define `design.md`, con animación |
| 4.1.4 | Formulario de producto manual | 🟡 | Añadir/editar items que no vienen de tickets |
| 4.1.5 | Sistema de caducidades con alertas | 🟡 | Cálculo de vida útil estimada para frescos, notificaciones |
| 4.1.6 | Historial de precios por producto | 🟡 | Tabla + gráfico de evolución de precio |
| 4.1.7 | Monitor de inflación personal | 🔴 | Comparativa de precios de los mismos productos en diferentes periodos |
| 4.1.8 | Lista de la compra automática | 🟡 | Basada en stock mínimo: cuando un producto baja del mínimo, se añade |
| 4.1.9 | 🧪 Tests de inventario | 🟡 | CRUD, caducidades, stock |

### 4.2 Activos Físicos
| # | Tarea | Complejidad | Detalle |
|---|---|---|---|
| 4.2.1 | Página de activos (propiedades, vehículos, electrónica) | 🟡 | Lista con filtros por tipo |
| 4.2.2 | Ficha técnica de activo | 🟡 | Detalle con foto, fecha de compra, valor, garantía |
| 4.2.3 | Bitácora de mantenimiento | 🟡 | Historial de revisiones, reparaciones, próximas citas |
| 4.2.4 | Alertas de mantenimiento (ITV, garantías) | 🟡 | Configurables por el usuario |
| 4.2.5 | Bóveda de documentos (Document Vault) | 🔴 | Upload a Storage, categorización, cifrado metadata, visor de PDF |
| 4.2.6 | 🧪 Tests de activos | 🟡 | CRUD, alertas |

---

## FASE 5 — Inversiones y Patrimonio (Sprint 10–12)
> **Duración estimada:** 3 semanas  
> **Objetivo:** Portafolio completo con datos en tiempo real y patrimonio neto

### 5.1 Portafolio de Inversiones
| # | Tarea | Complejidad | Detalle |
|---|---|---|---|
| 5.1.1 | Servicio de APIs externas (CoinGecko + Yahoo Finance) | 🔴 | Cloud Function proxy, caché en Firestore (TTL 15 min), manejo de rate limits |
| 5.1.2 | Registro manual de transacciones | 🟡 | Compra/venta con precio, fecha, cantidad |
| 5.1.3 | Página de portafolio | 🟡 | Lista de posiciones con P&L, precio medio (DCA) |
| 5.1.4 | Gráficos de rendimiento | 🟡 | Line chart temporal, donut de diversificación |
| 5.1.5 | Cálculo de métricas avanzadas | 🔴 | P&L realizado/no realizado, ROI, diversificación por sector/riesgo |
| 5.1.6 | Simulador de escenarios (IA) | 🔴 | Gemini proyecta rendimiento con interés compuesto, ajustado por inflación |
| 5.1.7 | Alertas de precio | 🟡 | Configurar umbral y recibir notificación |
| 5.1.8 | Optimización fiscal (IA) | 🔴 | Compensación de pérdidas, estimación de IRPF |
| 5.1.9 | 🧪 Tests de inversiones | 🟡 | Cálculos, API mocks |

### 5.2 Patrimonio Neto (Net Worth)
| # | Tarea | Complejidad | Detalle |
|---|---|---|---|
| 5.2.1 | Cálculo agregado de patrimonio neto | 🔴 | Suma de: inversiones (valor mercado) + activos físicos (valor estimado) + saldo líquido - deudas |
| 5.2.2 | Widget de Net Worth con tendencia | 🟡 | Como define `design.md`: valor + flecha de tendencia + gráfico micro |
| 5.2.3 | Historial de patrimonio (snapshots mensuales) | 🟡 | Cloud Function scheduled que guarda snapshot mensual |
| 5.2.4 | Valor de mercado dinámico (propiedades) | 🔴 | Integración con APIs inmobiliarias (Idealista/APIs públicas) o entrada manual |

---

## FASE 6 — Dashboard + Conserje IA (Sprint 13–15)
> **Duración estimada:** 3 semanas  
> **Objetivo:** La "Control Room" y el chat inteligente

### 6.1 Dashboard (Control Room)
| # | Tarea | Complejidad | Detalle |
|---|---|---|---|
| 6.1.1 | Bento Grid layout responsive | 🔴 | Grid CSS con celdas de diferentes tamaños, responsive |
| 6.1.2 | Widget: Patrimonio Neto | 🟡 | Conectado a la Fase 5 |
| 6.1.3 | Widget: Alertas Críticas | 🟡 | Agregador de alertas de todos los módulos (caducidades, renovaciones, mantenimiento) |
| 6.1.4 | Widget: Resumen Diario de gastos | 🟡 | Total gastado hoy, comparativa con media |
| 6.1.5 | Widget: Flujo mensual (Ingresos vs. Gastos) | 🟡 | Gráfico de barras apiladas |
| 6.1.6 | Widget: Estado del inventario | 🟡 | Items en stock bajo, próximas caducidades |
| 6.1.7 | Widget: Rendimiento inversiones | 🟡 | Mini gráfico con P&L del día |
| 6.1.8 | Personalización de widgets (orden/visibilidad) | 🔴 | Drag & Drop para reorganizar el Bento Grid |
| 6.1.9 | 🧪 Tests del dashboard | 🟡 | Renderizado de widgets, datos |

### 6.2 Modo Conserje (Chat con Gemini)
| # | Tarea | Complejidad | Detalle |
|---|---|---|---|
| 6.2.1 | Colección `chat_history/{uid}/messages` | 🟡 | Schema: role, content, timestamp, richCard (optional) |
| 6.2.2 | UI de chat tipo terminal | 🟡 | Input de texto + botón de voz, mensajes con burbujas, auto-scroll |
| 6.2.3 | Cloud Function: Chat endpoint | 🔴 | Recibe mensaje, inyecta contexto del usuario (resumen financiero, inventario, alertas), llama a Gemini |
| 6.2.4 | Sistema de contexto para Gemini | 🔴 | Construir un "system prompt" dinámico con datos agregados del usuario |
| 6.2.5 | Rich Cards en respuestas | 🔴 | Gemini devuelve JSON con tipo de widget (gráfico, tabla, alerta) y el frontend renderiza el componente adecuado |
| 6.2.6 | Integración de voz (Speech API) | 🟡 | Reutilizar componente de la Fase 2.4 |
| 6.2.7 | Sugerencias de preguntas frecuentes | 🟢 | Chips clickeables: "¿Cómo van mis inversiones?", "¿Qué cocino hoy?" |
| 6.2.8 | 🧪 Tests del Conserje | 🟡 | Flujo de chat, rendering de Rich Cards |

### 6.3 Agentes IA Especializados
| # | Tarea | Complejidad | Detalle |
|---|---|---|---|
| 6.3.1 | Agente "Cocinero AI" | 🔴 | Recetas Zero Waste basadas en inventario actual, priorizando caducidades próximas |
| 6.3.2 | Agente "Planificador Nutricional" | 🔴 | Análisis de compra, sugerencias por objetivo (salud/ahorro/deporte) |
| 6.3.3 | Agente "Optimizador de Carrito" | 🔴 | Comparativa de precios entre establecimientos para la lista de compra |
| 6.3.4 | Agente "Análisis ROI de Vida" | 🔴 | Consultas complejas tipo "¿Me sale rentable mantener el coche?" |

---

## FASE 7 — PWA, Notificaciones y Polish (Sprint 16–18)
> **Duración estimada:** 3 semanas  
> **Objetivo:** App instalable, notificaciones push y calidad de producción

### 7.1 PWA
| # | Tarea | Complejidad | Detalle |
|---|---|---|---|
| 7.1.1 | Configurar manifest.json | 🟢 | Nombre, iconos, colores, orientación |
| 7.1.2 | Service Worker con Workbox | 🟡 | Cache de assets estáticos, estrategia stale-while-revalidate |
| 7.1.3 | Prompt de instalación | 🟡 | Banner "Instalar Concentrate" con detección del evento |
| 7.1.4 | Splash screen y iconos adaptativos | 🟡 | Para Android e iOS |
| 7.1.5 | Modo offline básico | 🟡 | Mostrar datos cacheados cuando no hay conexión |

### 7.2 Notificaciones
| # | Tarea | Complejidad | Detalle |
|---|---|---|---|
| 7.2.1 | Configurar Firebase Cloud Messaging | 🟡 | Token management, permisos |
| 7.2.2 | Cloud Function scheduled para alertas | 🔴 | Diaria: revisa caducidades, renovaciones, stock bajo, cobros próximos |
| 7.2.3 | Notificaciones in-app (centro de notificaciones) | 🟡 | Panel con historial de alertas |
| 7.2.4 | Preferencias de notificación | 🟡 | Configurar qué alertas recibir y con cuánta antelación |

### 7.3 Polish y Optimización
| # | Tarea | Complejidad | Detalle |
|---|---|---|---|
| 7.3.1 | Auditoría de rendimiento (Lighthouse) | 🟡 | Target: 90+ en Performance, Accessibility, Best Practices |
| 7.3.2 | Lazy loading de rutas y componentes pesados | 🟡 | `React.lazy()` + `Suspense` |
| 7.3.3 | Optimización de queries Firestore | 🟡 | Índices compuestos, paginación, limitación de lecturas |
| 7.3.4 | Accesibilidad (a11y) | 🟡 | ARIA labels, contraste WCAG AA, navegación por teclado |
| 7.3.5 | Internationalization (i18n) preparación | 🟡 | Extraer strings, preparar estructura (aunque MVP solo en español) |
| 7.3.6 | Micro-animaciones finales | 🟡 | Transiciones entre páginas, hover effects, feedback háptico (Vibration API) |
| 7.3.7 | Modo Auditoría completo | 🟢 | Icono de origen en cada dato (cámara/robot/lápiz) |
| 7.3.8 | SEO y meta tags | 🟢 | Title, description, OG tags, favicon |
| 7.3.9 | Error Boundary global | 🟡 | Catch de errores con UI amigable |
| 7.3.10 | Logging y monitorización | 🟡 | Firebase Analytics + Crashlytics web |
| 7.3.11 | 🧪 Tests E2E completos (Playwright) | 🔴 | Flujos críticos: login → scan → confirm → dashboard |

---

## FASE 8 — Hardening y Lanzamiento (Sprint 19–20)
> **Duración estimada:** 2 semanas  
> **Objetivo:** Seguridad reforzada, backup y go-live

### 8.1 Seguridad
| # | Tarea | Complejidad | Detalle |
|---|---|---|---|
| 8.1.1 | Auditoría de Firestore Security Rules | 🟡 | Verificar que todas las colecciones están protegidas por UID |
| 8.1.2 | Auditoría de Storage Security Rules | 🟡 | Verificar paths y tipos de archivo permitidos |
| 8.1.3 | Revisión de CORS y headers | 🟢 | Content-Security-Policy, X-Frame-Options |
| 8.1.4 | Validación de inputs (server-side) | 🟡 | Cloud Functions validan todo dato antes de escribir |
| 8.1.5 | Rate limiting en Cloud Functions | 🟡 | Protección contra abuso |

### 8.2 Backup y Recuperación
| # | Tarea | Complejidad | Detalle |
|---|---|---|---|
| 8.2.1 | Configurar backups automáticos de Firestore | 🟡 | Scheduled exports a Cloud Storage |
| 8.2.2 | Exportación de datos del usuario | 🟡 | Botón "Descargar todos mis datos" (GDPR) |

### 8.3 Go-Live
| # | Tarea | Complejidad | Detalle |
|---|---|---|---|
| 8.3.1 | Dominio personalizado (opcional) | 🟢 | Firebase Hosting con dominio propio |
| 8.3.2 | Test de humo en producción | 🟡 | Verificar todos los flujos principales |
| 8.3.3 | Documentación de usuario básica | 🟡 | Onboarding in-app o README |
| 8.3.4 | Plan de monitorización activa | 🟡 | Alertas de Firebase por errores, costes, uso |

---

## Resumen Ejecutivo

| Fase | Sprint(s) | Duración | Entregable Principal |
|---|---|---|---|
| **0 — Fundación** | 1 | 1 sem | Proyecto configurado + CI/CD + deploy |
| **1 — Design System + Auth** | 2 | 1 sem | Componentes UI + Login funcional |
| **2 — Motor de Ingesta IA** | 3–4 | 2 sem | Scan ticket → IA → expenses + inventory |
| **3 — Módulo Financiero** | 5–7 | 3 sem | Gastos + Suscripciones + Presupuesto |
| **4 — Inventario y Hogar** | 8–9 | 2 sem | Despensa + Activos físicos + Vault |
| **5 — Inversiones y Patrimonio** | 10–12 | 3 sem | Portafolio + Net Worth |
| **6 — Dashboard + Conserje IA** | 13–15 | 3 sem | Control Room + Chat Gemini + Agentes |
| **7 — PWA + Polish** | 16–18 | 3 sem | Instalable + Push + Rendimiento |
| **8 — Hardening + Launch** | 19–20 | 2 sem | Seguridad + Backup + Go-Live |
| **TOTAL** | **20 sprints** | **~20 semanas** | **Concentrate v1.0** |

---

### Recomendaciones Finales

**Prioridad:** Si quieres resultados rápidos y motivación, empieza las Fases 0-2 seguidas. Tener el flujo "foto → datos en Firestore" funcionando es el mayor validador del proyecto y la feature más impresionante para demostrar.

**Riesgo principal:** La Fase 6 (Conserje + Agentes IA) es la más compleja y ambigua. Definir bien los prompts y el sistema de contexto antes de programar ahorrará muchas iteraciones. Considera escribir un `prompts.md` con todos los system instructions antes de codificar.

**Documento pendiente:** Se recomienda crear un `data-model.md` con el schema completo de Firestore (incluyendo las colecciones que faltan) antes de empezar la Fase 0.
