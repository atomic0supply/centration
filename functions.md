# 📄 Documento de Funcionalidades — CONCENTRATE

> **Visión:** El Sistema Operativo Personal para el control absoluto del patrimonio, el consumo y la eficiencia doméstica mediante IA Multimodal.  
> **Plataforma:** WebApp Progressive (PWA)  
> **Stack:** Vite + React + TypeScript + Firebase + Gemini AI  
> **Actualizado:** 2026-04-07

---

## 1. Núcleo de Gestión Patrimonial y Financiera

*El objetivo es la transparencia total sobre el valor neto, la liquidez y las obligaciones legales.*

### 1.1. Control de Suscripciones y Gastos Recurrentes

- **Documentación Automatizada:** Registro de servicios (Streaming, SaaS, Gym, Seguros). Colección `subscriptions` separada de `expenses`.
- **Detección Automática:** Si en `expenses` aparecen ≥2 cargos del mismo proveedor en meses consecutivos, el sistema marca automáticamente el gasto como suscripción y mueve el registro a `subscriptions`.
- **Calendario Maestro:** Vista mensual unificada de cobros. Dots en el calendario indican días con pagos programados. Alertas configurables X días antes de renovaciones anuales y fin de periodos de prueba.
- **Optimizador de Gastos (IA):** Gemini analiza las suscripciones activas y su uso estimado para sugerir cancelaciones o cambios de plan más eficientes.
- **Gestión de Pagos Compartidos:** Seguimiento de deudas y abonos con familia/amigos. Campo `sharedWith: [emails]` en la suscripción.
- **Panel de coste total:** Visualización del gasto mensual y anual acumulado en suscripciones.

### 1.2. Portafolio de Inversiones (Real-Time)

- **Multiactivo:** Seguimiento de Crypto, ETFs y Acciones con **Finnhub API**. Entrada de transacciones manual.
- **Frecuencia de precios:** Actualización al abrir la sección o manualmente. Caché en Firestore con TTL de 15 minutos.
- **Métricas Avanzadas:**
  - P&L realizado y no realizado.
  - Precio medio de entrada (DCA — Dollar Cost Average).
  - Diversificación por tipo de activo y sector.
  - ROI total y por posición.
- **Simulador de Escenarios (IA):** Gemini proyecta rentabilidad con interés compuesto, ajustado por inflación y aportaciones variables definidas por el usuario.
- **Alertas de Precio:** Configurar umbral de precio (arriba/abajo) y recibir notificación push.
- **Optimización Fiscal AI:** Alertas para compensar ganancias con pérdidas antes del cierre del ejercicio fiscal. Estimación en tiempo real del IRPF a pagar por plusvalías realizadas.
- **Fallback offline:** Si la API externa falla, se muestra el último precio guardado con indicador `[Precio desactualizado]`.

### 1.3. Activos Físicos (Propiedades y Vehículos)

- **Ficha Técnica Digital:** Registro de inmuebles, locales, vehículos y electrónica de alto valor.
- **Detección desde Facturas:** Si Gemini detecta un gasto >150€ en categoría tech/home, pregunta al usuario si quiere registrarlo como activo. Extrae automáticamente garantía y modelo del ticket.
- **Bitácora de Mantenimiento Predictivo:**
  - **Hogar:** Registro de reformas, garantías de electrodomésticos y alertas de revisión.
  - **Vehículos:** Control de kilometraje, neumáticos, ITV y revisiones mecánicas.
  - Alertas configurables con antelación ajustable.
- **Bóveda de Documentos (Vault):** Almacenamiento cifrado en Firebase Storage de escrituras, contratos, seguros y facturas. Referencia desde el activo (`documentRefs`). Visor de PDF integrado.
- **Valor de Mercado Dinámico:** Campo editable `currentValue` con posibilidad de conexión futura a índices externos (Idealista API / Datos del Catastro).

---

## 2. Núcleo de Consumo e Inteligencia Doméstica

*El objetivo es la fricción cero en el registro y la eliminación del desperdicio.*

### 2.1. Ingesta de Datos Multimodal (Gemini AI)

- **Vision-to-Data:** Fotografía de tickets físicos. La IA extrae: productos, precios, cantidades, unidades, comercio y categoría de gasto de forma automática. Structured JSON output con `response_mime_type: "application/json"`.
  - **Supermercados soportados (España):** Mercadona, Carrefour, Lidl, Aldi, Dia, El Corte Inglés.
  - **Online:** Amazon (foto de comprobante), Glovo/Uber Eats (screenshot de recibo).
  - **Confianza:** Gemini devuelve campo `confidence: 0.0-1.0`. Si es <0.7, se muestra aviso y ofrece edición manual.
- **Procesamiento de Recibos Digitales:** El usuario puede subir PDFs o screenshots. El pipeline es el mismo que para fotos físicas (Storage → Cloud Function → Gemini).
- **Voice-to-Inventory:** Comandos de voz mediante Web Speech API + Gemini para parsear la intención: *"He terminado el café"* → `{action: "consume", item: "café", quantity: 1}`.
- **Entrada Manual:** Formulario completo como siempre alternativa disponible.
- **Origin Tracking:** Cada dato registrado lleva un campo `dataOrigin: "camera|voice|manual"` para el Modo Auditoría.

### 2.2. Inventario y Despensa Inteligente

- **Stock Dinámico:** Los productos se suman al inventario al confirmar el ticket. Se restan manualmente (swipe en la lista) o mediante comandos de voz.
- **Upsert Inteligente:** Si el producto ya existe, se suma la nueva cantidad. La normalización del nombre elimina variantes (ej. "Leche Entera 1L" y "Leche entera" se consideran el mismo producto).
- **Gestión de Caducidades:** Las caducidades se registran si aparecen en el ticket (poco común) o se estiman según categoría (ej. fruta fresca: +5 días, lácteos: +14 días). Alertas proactivas X días antes.
- **Monitor de Inflación Personal:** Cada vez que se compra un producto, el `lastPrice` y el `priceHistory` se actualizan. La app muestra si ese producto está más caro o barato que la última compra y en qué establecimiento salió más barato históricamente.
- **Stock Mínimo:** El usuario configura `minStock` por producto. Cuando la cantidad cae por debajo, el producto se añade automáticamente a la lista de la compra.
- **Lista de la Compra:** Generada automáticamente a partir de ítems bajo mínimo. El usuario puede añadir ítems manualmente. Checkboxes para marcar mientras compra.

### 2.3. Asistentes de Acción (Agentes IA)

- **El Cocinero AI:** Consulta el inventario actual (priorizando items próximos a caducar) y genera recetas "Zero Waste" con ingredientes disponibles. Devuelve lista de ingredientes y pasos.
- **Planificador Nutricional:** Analiza las últimas compras y sugiere menús semanales según el objetivo del usuario (salud, ahorro, rendimiento deportivo). El objetivo se configura en `/settings`.
- **Optimizador de Carrito:** Toma la lista de la compra y compara precios entre establecimientos (basándose en el historial de precios de `inventory.priceHistory`). Sugiere dónde comprar cada ítem.

---

## 3. Integración Transversal (El "Cerebro" Concentrate)

*Donde los datos aislados se convierten en inteligencia aplicada.*

### 3.1. Reglas de Negocio Automáticas

- **Sincronización de Gastos:** Cualquier ticket confirmado impacta en: `expenses`, `inventory` y el cálculo del presupuesto mensual, de forma simultánea vía Cloud Functions.
- **Detección de Activos:** Si un ítem supera 150€ en category tech/home → alerta en UI "¿Registrar como activo patrimonial?". Si confirma, extrae metadata de garantía del ticket.
- **Detección de Suscripciones:** Si hay ≥2 cargos del mismo `provider` en meses consecutivos → crea automáticamente entrada en `subscriptions` con `isSubscription: true`.
- **Presupuesto Dinámico:** Tras cada gasto confirmado, se recalcula el porcentaje de presupuesto consumido. Alertas automáticas al 80% (warning) y 100% (crítico).

### 3.2. Patrimonio Neto Unificado

El Net Worth se calcula en tiempo real como:

```
Net Worth = Σ(investments.currentValue) 
          + Σ(assets.currentValue) 
          + liquid_cash (manual)
          - debts (manual)
```

Un snapshot mensual se guarda automáticamente en `networth_snapshots` el día 1 de cada mes mediante Cloud Function scheduled.

### 3.3. Análisis de ROI de Vida

Consultas complejas mediante el Conserje:

> *"¿Cuánto dinero libre tendré a final de mes si compro los ingredientes para la cena de hoy, teniendo en cuenta que mañana me cobran el seguro del coche y que mis ETFs han bajado un 2%?"*

> *"¿Me sale rentable mantener el coche o usar transporte público según mis gastos registrados en reparaciones y gasolina?"*

Gemini accede al contexto completo del usuario (finanzas, gastos, inversiones, activos) para responder con datos reales.

---

## 4. Sistema de Alertas

*Central de alertas unificada de todos los módulos.*

### Tipos de Alerta

| Tipo | Origen | Ejemplo | Severidad |
|---|---|---|---|
| `expiry` | Inventario | "La leche caduca en 2 días" | warning |
| `renewal` | Suscripciones | "Amazon Prime renueva mañana (14€)" | info / critical |
| `budget` | Gastos | "Has gastado el 90% de tu presupuesto" | warning / critical |
| `maintenance` | Activos | "ITV del coche vence en 10 días" | warning |
| `price` | Inversiones | "BTC ha superado los 70,000€" | info |
| `low_stock` | Inventario | "Quedan 2 unidades de huevos" | info |
| `potential_asset` | Ingesta IA | "¿Registrar el MacBook como activo?" | info |

### Canales de Entrega

- **Push notification (FCM):** Para alertas cuando la app está en background.
- **Centro de notificaciones in-app:** Campana en el header/topbar con badge de conteo.
- **Dashboard (Widget Alertas Críticas):** Solo alertas de severidad `warning` o `critical`.

---

## 5. El Factor de "Control Total" — Modo Conserje

Interfaz de lenguaje natural (Chat) que permite consultas complejas combinando datos de todos los módulos.

### Arquitectura del Conserje

1. **Frontend:** UI de chat con historial persistente en `chat_history/{uid}/messages`.
2. **Cloud Function:** Endpoint HTTP que:
   - Recibe el mensaje del usuario.
   - Construye un system prompt dinámico con el contexto financiero/doméstico actualizado.
   - Llama a Gemini con el historial de los últimos 10 mensajes como contexto de conversación.
   - Devuelve respuesta en JSON: `{ text: string, richCard: {...} | null }`.
3. **Rich Cards:** El frontend renderiza dinámicamente el componente adecuado:
   - `chart` → Gráfico de Recharts con los datos del payload.
   - `table` → Tabla de datos formateada.
   - `alert` → Card de alerta con botón de acción directa.
4. **Voz:** El usuario puede hablar en lugar de escribir. Web Speech API convierte voz a texto antes de enviar al Conserje.

### Ejemplos de Consultas

- *"¿Cuánto he gastado en supermercados este mes?"*
- *"¿Qué puedo cocinar con lo que tengo en la despensa?"*
- *"¿Cuándo es la próxima renovación más cara que tengo?"*
- *"¿Cómo va mi portafolio de inversiones hoy?"*
- *"¿Me quedan huevos?"*

---

## 6. Especificaciones Técnicas (Stack Definitivo)

| Capa | Tecnología |
|---|---|
| **Frontend** | Vite + React 19 + TypeScript (PWA instalable) |
| **Estilos** | CSS Modules + CSS Custom Properties (Design Tokens) |
| **Estado** | Zustand (stores por módulo) |
| **Routing** | React Router v7 |
| **Backend & Auth** | Firebase (Firestore, Auth, Storage, Cloud Functions) |
| **IA** | Gemini 1.5 Flash (Vision, NLP, Agentes) |
| **APIs externas** | Finnhub (Crypto + ETFs + Acciones) |
| **Notificaciones** | Firebase Cloud Messaging (FCM) |
| **Deploy** | Firebase Hosting + GitHub Actions CI/CD |
| **PWA** | Vite PWA Plugin (Workbox) |
| **Testing** | Vitest + Testing Library + Playwright |

### Seguridad

- Cifrado de documentos sensibles (Vault) con Web Crypto API antes de subir a Storage.
- Acceso a datos solo por UID autenticado (Firestore Security Rules + Storage Rules).
- API Keys de terceros en Google Cloud Secret Manager, accedidas solo desde Cloud Functions.
- Validación de inputs en Cloud Functions con Zod antes de escribir en Firestore.
- Rate limiting: 100 llamadas/hora por UID en Cloud Functions críticas.

---

**Estado del Documento:** ✅ Completo — Listo para fase de desarrollo.  
**Prioridad 1:** Fases 0-2 del Roadmap — Fundación del proyecto + Auth + Motor de Ingesta IA (Vision-to-Data con Gemini).
