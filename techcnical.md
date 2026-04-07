# 📐 Documento de Especificación Técnica — CONCENTRATE v1.0

> **Plataforma:** WebApp (PWA) — Vite + React + TypeScript  
> **Backend:** Firebase (Cloud, single-user)  
> **Motor IA:** Gemini 1.5 Flash  
> **Actualizado:** 2026-04-07

---

## 1. Alcance Real (MVP Cerrado)

- **MVP:** Módulo de Ingesta (Vision) + Gastos/Suscripciones + Inventario básico.
- **Fuera del MVP:** Inversiones en tiempo real (APIs externas), Simulador de escenarios, Agente nutricional (Cocinero).
- **Usuario:** Single-user (personal).
- **Plataforma:** WebApp Progressive (PWA) — instalable en móvil y desktop desde el navegador.
- **Arquitectura:** 100% Cloud (Firebase). La latencia de la IA hace que el offline-first sea irrelevante para el flujo principal; se usa Service Worker solo para cachear assets estáticos y datos recientes de solo lectura.

---

## 2. Stack Tecnológico Definitivo

| Capa | Tecnología | Justificación |
|---|---|---|
| **Framework** | Vite + React 19 + TypeScript | Mejor ecosistema web, SEO, despliegue sencillo |
| **Estilos** | CSS Modules + CSS Variables (Design Tokens) | Control total, sin dependencias externas |
| **Estado global** | Zustand | Ligero, sin boilerplate, compatible con React 19 |
| **Routing** | React Router v7 | Estándar, rutas protegidas, lazy loading |
| **Firebase SDK** | Firebase Web SDK v10 (modular) | Tree-shaking, menor bundle size |
| **Gráficos** | Recharts | Declarativo, responsive, fácil de tematizar |
| **Animaciones** | Framer Motion | Micro-animaciones y transiciones de página |
| **Formularios** | React Hook Form + Zod | Validación tipada, rendimiento óptimo |
| **Testing** | Vitest + Testing Library + Playwright (E2E) | Suite completa sin configuración extra |
| **CI/CD** | GitHub Actions → Firebase Hosting | Pipeline automático en cada push a `main` |
| **PWA** | Vite PWA Plugin (Workbox) | Service Worker, manifest, offline básico |
| **Notificaciones** | Firebase Cloud Messaging (FCM) | Push en background + in-app |

---

## 3. Fuentes de Datos y Conectividad

- **Finanzas:** Entrada manual + Parsing de tickets con Gemini. *(PSD2/Open Banking descartado para MVP personal por coste y burocracia).*
- **Consumo:** Foco España — Mercadona, Carrefour, Lidl y Amazon (foto o PDF/screenshot).
- **Inversiones:** Entrada de transacciones manual. Precios vía:
  - **Alpha Vantage API** — Única fuente para Crypto, ETFs y Acciones. Free tier: 25 req/día; Premium si se necesita mayor frecuencia.
  - **Caché en Firestore:** TTL de 15 minutos para evitar rate limits (crítico en el tier gratuito). Si la API falla, se muestra el último precio cacheado con indicador `[Precio desactualizado]`.
  - **Frecuencia de actualización:** Solo al abrir la página de inversiones o manualmente (dado el límite del free tier).

---

## 4. Modelo de Datos Completo (Firestore Schema)

> Todas las colecciones son de nivel raíz (`/{collection}/{id}`) con UID del usuario embebido en cada documento para cumplir las Security Rules por UID.

### `users/{uid}`
```json
{
  "displayName": "string",
  "email": "string",
  "avatarUrl": "string",
  "currency": "EUR",
  "locale": "es-ES",
  "monthlyBudget": { "total": 2000, "byCategory": { "food": 400, "leisure": 200 } },
  "notificationPrefs": { "expiryDaysAhead": 3, "renewalDaysAhead": 7 },
  "fcmToken": "string",
  "createdAt": "timestamp"
}
```

### `expenses/{id}`
```json
{
  "uid": "string",
  "amount": 22.50,
  "currency": "EUR",
  "date": "timestamp",
  "category": "food|tech|health|leisure|transport|home|other",
  "provider": "Mercadona",
  "isSubscription": false,
  "billingCycle": "monthly|yearly|once",
  "ticketRef": "tickets/{uid}/{timestamp}.webp",
  "items": [{ "name": "string", "qty": 1, "price": 1.50, "unit": "kg|unit|l" }],
  "dataOrigin": "camera|ai|manual",
  "potentialAsset": false,
  "notes": "string",
  "createdAt": "timestamp"
}
```

### `subscriptions/{id}`
```json
{
  "uid": "string",
  "name": "Netflix",
  "logo": "url|null",
  "amount": 15.99,
  "currency": "EUR",
  "billingCycle": "monthly|yearly",
  "nextPaymentDate": "timestamp",
  "category": "streaming|saas|gym|insurance|other",
  "status": "active|trial|cancelled",
  "trialEndsAt": "timestamp|null",
  "sharedWith": ["email1", "email2"],
  "createdAt": "timestamp"
}
```

### `inventory/{id}`
```json
{
  "uid": "string",
  "name": "Leche Entera",
  "category": "dairy|fruit|veggie|meat|dry|cleaning|other",
  "quantity": 2,
  "unit": "kg|unit|l|g|ml",
  "expiryDate": "timestamp|null",
  "lastPrice": 1.05,
  "priceHistory": [{ "price": 0.99, "date": "timestamp", "provider": "Lidl" }],
  "minStock": 1,
  "dataOrigin": "camera|voice|manual",
  "updatedAt": "timestamp"
}
```

### `assets/{id}`
```json
{
  "uid": "string",
  "type": "crypto|etf|stock|vehicle|property|electronics|other",
  "name": "MacBook Pro M3",
  "identifier": "BTC|ISIN|Matrícula|null",
  "purchasePrice": 2499.00,
  "purchaseDate": "timestamp",
  "currentValue": 2100.00,
  "currency": "EUR",
  "warrantyExpiry": "timestamp|null",
  "maintenanceLog": [{ "date": "timestamp", "description": "string", "cost": 0 }],
  "nextMaintenance": "timestamp|null",
  "documentRefs": ["vault/{uid}/{filename}"],
  "metadata": {}
}
```

### `investments/{id}`
```json
{
  "uid": "string",
  "type": "crypto|etf|stock",
  "ticker": "BTC|VWCE|AAPL",
  "quantity": 0.5,
  "avgBuyPrice": 40000,
  "currency": "EUR",
  "transactions": [
    { "date": "timestamp", "type": "buy|sell", "qty": 0.5, "price": 40000 }
  ],
  "currentPrice": 62000,
  "priceUpdatedAt": "timestamp",
  "alerts": [{ "type": "above|below", "price": 70000, "active": true }]
}
```

### `networth_snapshots/{id}`
```json
{
  "uid": "string",
  "date": "timestamp",
  "totalValue": 124500.80,
  "breakdown": {
    "liquid": 5000,
    "investments": 45000,
    "physicalAssets": 80000,
    "debts": 5499.20
  }
}
```

### `chat_history/{uid}/messages/{id}`
```json
{
  "role": "user|assistant",
  "content": "string",
  "timestamp": "timestamp",
  "richCard": {
    "type": "chart|table|alert|null",
    "payload": {}
  }
}
```

### `alerts/{id}`
```json
{
  "uid": "string",
  "type": "expiry|renewal|budget|maintenance|price|custom",
  "title": "string",
  "body": "string",
  "relatedId": "inventory_id|subscription_id|asset_id",
  "severity": "info|warning|critical",
  "read": false,
  "scheduledFor": "timestamp",
  "createdAt": "timestamp"
}
```

### `shopping_lists/{id}`
```json
{
  "uid": "string",
  "name": "Compra semanal",
  "items": [{ "name": "string", "qty": 1, "unit": "string", "checked": false }],
  "autoGenerated": true,
  "createdAt": "timestamp"
}
```

---

## 5. IA: Definición de Prompts y Structured Output

Para evitar alucinaciones, se usa **Gemini 1.5 Flash** con `response_mime_type: "application/json"` en todas las llamadas.

### 5.1 Prompt: Extracción de Ticket (Vision-to-Data)
```
System: "Actúa como un extractor de datos contables. Analiza la imagen del ticket.
Tu salida debe ser EXCLUSIVAMENTE JSON con este esquema exacto:
{
  'total': number,
  'date': 'ISO8601',
  'provider': 'string',
  'category': 'food|tech|health|leisure|transport|home|other',
  'items': [{'name': string, 'qty': number, 'unit': 'kg|unit|l|g', 'price': number}],
  'isAsset': boolean,
  'potentialAsset': boolean,
  'confidence': 0.0-1.0
}
Si el ticket es ilegible o incompleto, devuelve: {'error': 'UNREADABLE', 'confidence': 0.0}.
Si es de supermercado, extrae todos los productos para inventario.
Si un ítem supera 150€ en categoría tech o home, marca 'potentialAsset: true'."
```

### 5.2 Prompt: Comando de Voz (Voice-to-Inventory)
```
System: "Analiza el comando de voz del usuario e identifica acciones sobre el inventario.
Salida JSON:
{
  'action': 'add|consume|delete|query',
  'item': 'string',
  'quantity': number,
  'unit': 'kg|unit|l|null',
  'confidence': 0.0-1.0
}
Ejemplo: 'He terminado el café' → {'action':'consume','item':'café','quantity':1,'unit':'unit','confidence':0.95}"
```

### 5.3 Prompt: Conserje (Chat con Contexto)
El system prompt se construye **dinámicamente** en cada llamada:
```
System: "Eres el Conserje de Concentrate, asistente financiero y doméstico personal.
Tienes acceso al contexto actualizado del usuario:
- Patrimonio Neto: {netWorth}€
- Gastos this month: {monthlyExpenses}€ / Budget: {budget}€
- Inventario crítico: {lowStockItems}
- Alertas activas: {activeAlerts}
- Próximos cobros: {upcomingPayments}

Cuando el usuario haga una pregunta, responde con JSON:
{
  'text': 'string (respuesta conversacional)',
  'richCard': { 'type': 'chart|table|alert|null', 'payload': {} } | null
}
Sé conciso. Si puedes mostrar datos en un gráfico o tabla, hazlo."
```

---

## 6. Arquitectura de Ingesta (El Flujo Crítico)

1. **Trigger (Frontend):** Usuario captura foto → compresión WebP a <500KB → subida a `Firebase Storage` en `tickets/{uid}/{timestamp}.webp`.
2. **Cloud Function (Storage onFinalize):** Se dispara automáticamente.
3. **Validación previa:** Verifica que el archivo es imagen válida y pertenece al UID correcto.
4. **IA (Gemini Flash):** Envía imagen + system prompt → recibe JSON estructurado.
5. **Validación de respuesta:** Schema Zod valida el JSON antes de escribir en Firestore.
6. **Lógica de escritura:**
   - Crea documento en `expenses`.
   - Si hay items de supermercado → upsert en `inventory` (busca por nombre normalizado).
   - Si `potentialAsset: true` → crea alerta en `alerts` para confirmar en UI.
7. **Notify:** Crea documento en `alerts` + envía FCM push notification: *"Gasto de 45€ en Mercadona registrado. 12 productos en despensa."*
8. **Realtime Update (Frontend):** El listener de Firestore (`onSnapshot`) actualiza el estado de Zustand automáticamente. La UI muestra la Confirmation Card.

### Manejo de Errores de IA
| Error | Causa | Respuesta |
|---|---|---|
| `UNREADABLE` | Ticket ilegible/borroso | Mostrar formulario de entrada manual con campos pre-completados vacíos |
| `TIMEOUT` | Gemini >15s sin respuesta | Reintentar 1 vez; si falla, notificar usuario y guardar imagen para procesar luego |
| `INVALID_JSON` | Gemini devuelve respuesta malformada | Log del error, notificar, ofrecer entrada manual |
| `QUOTA_EXCEEDED` | Límite API Gemini superado | Mostrar mensaje "Procesamiento pausado, inténtalo en unos minutos" |

---

## 7. Sistema de Autenticación

- **Provider:** Firebase Auth — Email/Password (base). Google Sign-In (opcional futuro).
- **Flujo:**
  1. Usuario accede a cualquier ruta → `ProtectedRoute` comprueba `onAuthStateChanged`.
  2. Si no autenticado → redirect a `/login`.
  3. Login exitoso → redirect a `/dashboard`.
  4. Sesión persistida con `setPersistence(browserLocalPersistence)` (no expira al cerrar pestaña).
- **Recuperación:** `sendPasswordResetEmail` con redirect a `/reset-password`.
- **Seguridad adicional:** Inactividad de 30 días → logout automático.
- **Biometría web (futuro):** WebAuthn API para acceso sin contraseña en dispositivos compatibles.

---

## 8. Gestión de Estado (Zustand Stores)

```
src/stores/
  authStore.ts       → user, isLoading, isAuthenticated, signOut()
  expensesStore.ts   → expenses[], addExpense(), deleteExpense(), filters
  inventoryStore.ts  → items[], updateItem(), consumeItem(), alerts[]
  assetsStore.ts     → assets[], investments[], netWorth
  uiStore.ts         → sidebarOpen, activeModal, notifications[], theme
  chatStore.ts       → messages[], sendMessage(), isTyping
```

- Los stores se inicializan con listeners `onSnapshot` de Firestore al hacer login.
- Al hacer logout, todos los stores se resetean para limpiar datos sensibles de memoria.

---

## 9. Estructura de Carpetas del Proyecto

```
concentrate/
├── src/
│   ├── components/        # Componentes reutilizables (Button, Card, Modal...)
│   │   ├── ui/            # Design system puro
│   │   └── domain/        # Componentes con lógica de negocio
│   ├── pages/             # Vistas asociadas a rutas
│   │   ├── Dashboard/
│   │   ├── Ledger/
│   │   ├── Inventory/
│   │   ├── Assets/
│   │   ├── Investments/
│   │   ├── Concierge/
│   │   └── Settings/
│   ├── hooks/             # Custom hooks (useAuth, useInventory, useCamera...)
│   ├── services/          # Llamadas a Firebase y APIs externas
│   ├── stores/            # Zustand stores
│   ├── utils/             # Helpers (formatters, validators, normalizers)
│   ├── types/             # Tipos TypeScript globales
│   ├── styles/            # CSS Variables, reset, globales
│   └── assets/            # Iconos, imágenes estáticas
├── functions/             # Cloud Functions (Node.js 20)
│   ├── src/
│   │   ├── ingestion/     # Función de procesamiento de tickets
│   │   ├── chat/          # Función de chat con Gemini
│   │   ├── scheduler/     # Funciones programadas (alertas, snapshots)
│   │   └── utils/         # Prompts, validators, Gemini client
├── public/                # manifest.json, sw.js, iconos PWA
├── .github/workflows/     # CI/CD GitHub Actions
└── firebase.json          # Hosting + Functions config
```

---

## 10. CI/CD Pipeline (GitHub Actions)

```yaml
# En cada push a main:
1. Lint (ESLint + TypeScript check)
2. Tests unitarios (Vitest)
3. Build (Vite)
4. Deploy a Firebase Hosting (preview URL en PRs, producción en merge)
5. Deploy Cloud Functions (si hay cambios en /functions)
# En cada PR:
- Preview deploy con URL única para revisar cambios visualmente
```

---

## 11. Sistema de Notificaciones

- **Push (FCM):** Para alertas cuando la app está cerrada (caducidades, renovaciones, gastos registrados).
  - Token FCM guardado en `users/{uid}.fcmToken`.
  - Cloud Function scheduled (diaria, 09:00) revisa todos los módulos y envía notificaciones relevantes.
- **In-app:** Centro de notificaciones (campana en header). Lee de la colección `alerts/{uid}` en tiempo real.
- **Preferencias:** El usuario configura qué tipos de alerta recibir y con cuánta antelación (en `/settings`).

---

## 12. PWA y Offline

- **Manifest:** Nombre "Concentrate", iconos adaptivos, `theme_color: #121212`, orientación portrait.
- **Service Worker (Workbox):** Cache de assets estáticos. Estrategia `stale-while-revalidate` para datos de la app.
- **Offline:** Si no hay conexión, se muestran datos cacheados con un banner "Modo offline — datos pueden no estar actualizados". Las acciones de escritura (nuevo gasto, actualizar inventario) se encolan y sincronizan al recuperar conexión.
- **Instalación:** Banner "Añadir a pantalla de inicio" detectando el evento `beforeinstallprompt`.

---

## 13. Seguridad y Privacidad

- **Firestore Security Rules:** `allow read, write: if request.auth != null && request.auth.uid == resource.data.uid;`
- **Storage Rules:** Solo el UID propietario puede leer/escribir sus carpetas.
- **API Keys:** Almacenadas en **Google Cloud Secret Manager**, accedidas solo desde Cloud Functions.
- **Headers HTTP:** `Content-Security-Policy`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff` configurados en Firebase Hosting (`firebase.json`).
- **Rate limiting:** Cloud Functions con verificación de UID y límite de 100 llamadas/hora por usuario.
- **Inputs:** Toda entrada del usuario se valida con Zod en Cloud Functions antes de escribir en Firestore.
- **Documentos sensibles (Vault):** Metadata en Storage marca `encrypted: true`. Cifrado AES-256 a nivel de cliente antes de subir (librería `crypto-js` o Web Crypto API).

---

## 14. Testing

| Tipo | Herramienta | Cobertura objetivo |
|---|---|---|
| Unitario | Vitest + Testing Library | Hooks, utils, stores, componentes UI |
| Integración | Vitest + Firebase Emulator | Flujos Firestore + Auth end-to-end |
| E2E | Playwright | Flujos críticos: login, scan, dashboard, chat |
| Funciones | Vitest + mocks | Cloud Functions con Gemini mock |

### Flujos E2E prioritarios:
1. Login → Dashboard → Ver patrimonio neto
2. Scan ticket → Confirmar → Ver en Ledger → Ver en Inventario
3. Chat Conserje → Pregunta compleja → Rich Card responde
4. Config presupuesto → Superar límite → Recibir alerta

---

## 15. APIs Externas — Detalle

| API | Uso | Tier/Coste | Caché | Fallback |
|---|---|---|---|---|
| **Gemini 1.5 Flash** | Tickets, voz, chat | Free tier (60 req/min) | No | Entrada manual |
| **Alpha Vantage** | Crypto + ETFs + Acciones | Free (25 req/día) / Premium | 15 min en Firestore | Último precio guardado |
| **Firebase FCM** | Push notifications | Incluido en Firebase | — | In-app solo |

---

## 16. Integración Transversal — Reglas de Negocio

- **Regla de Activos:** Si `expenses.category ∈ {tech, home}` y `amount > 150€` → Gemini flag `potentialAsset: true` → Cloud Function crea alerta → UI pregunta "¿Añadir a patrimonio?".
- **Regla de Suscripción:** Si `expenses` tiene ≥2 cargos del mismo `provider` en meses consecutivos → Cloud Function marca `isSubscription: true` y crea entrada en `subscriptions`.
- **Presupuesto Dinámico:** Al procesar un gasto, Cloud Function recalcula `budget_used / budget_total`. Si supera 80% → alerta `warning`. Si supera 100% → alerta `critical`.
- **Sincronización Stock:** Al crear/confirmar un `expense` con items → upsert en `inventory` sumando cantidades. Al marcar un item como "consumido" en inventario → se descuenta.

---

## 17. Accesibilidad e Internacionalización

- **Accesibilidad (a11y):** ARIA labels en todos los elementos interactivos. Contraste WCAG AA mínimo. Navegación completa por teclado. Focus traps en modales. `prefers-reduced-motion` respetado (deshabilita animaciones si el usuario lo requiere).
- **i18n:** La v1.0 es solo en español (`es-ES`). La estructura de textos usará un archivo `src/i18n/es.json` desde el inicio para facilitar traducciones futuras sin refactorización.

---

**Estado del Documento:** Especificación técnica completa para inicio de desarrollo.  
**Prioridad 1:** Fases 0-2 del Roadmap — Fundación + Auth + Motor de Ingesta IA.
