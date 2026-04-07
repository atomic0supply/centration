Este es el documento maestro de especificaciones para **Concentrate**. Está diseñado como una hoja de ruta técnica y funcional para un "Life OS" de control total, eliminando silos y unificando tu vida financiera, patrimonial y doméstica en un solo motor de inteligencia.

---

# 📄 Documento de Funcionalidades: CONCENTRATE
**Visión:** El Sistema Operativo Personal para el control absoluto del patrimonio, el consumo y la eficiencia doméstica mediante IA Multimodal.

---

## 1. Núcleo de Gestión Patrimonial y Financiera
*El objetivo es la transparencia total sobre el valor neto, la liquidez y las obligaciones legales.*

### 1.1. Control de suscripciones y Gastos Recurrentes
* **Documentación Automatizada:** Registro de servicios (Streaming, SaaS, Gym, Seguros).
* **Calendario Maestro:** Vista unificada de cobros con alertas de periodos de prueba y renovaciones anuales.
* **Optimizador de Gastos:** Detección de servicios infrautilizados y sugerencias de cambio a planes más eficientes o cancelación.
* **Gestión de Pagos Compartidos:** Seguimiento de deudas y abonos en cuentas compartidas (familia/amigos).

### 1.2. Portafolio de Inversiones (Real-Time)
* **Multiactivo:** Seguimiento de Crypto, ETFs y acciones mediante APIs (CoinGecko/Alpha Vantage).
* **Métricas Avanzadas:** Cálculo automático de P&L (Pérdidas y Ganancias), precio medio de entrada (DCA) y diversificación por sectores/riesgo.
* **Simulador de Escenarios (IA):** Proyecciones de rentabilidad ajustadas a inflación, interés compuesto y aportaciones variables.
* **Optimización Fiscal AI:** Alertas para compensar ganancias con pérdidas antes del cierre de ejercicio y estimación en tiempo real del IRPF/Impuestos a pagar.

### 1.3. Activos Físicos (Propiedades y Vehículos)
* **Ficha Técnica Digital:** Registro de inmuebles, locales y vehículos.
* **Bitácora de Mantenimiento Predictivo:** * **Hogar:** Registro de reformas, garantías de electrodomésticos y alertas de revisión.
    * **Vehículos:** Control de kilometraje, neumáticos, ITV y revisiones mecánicas.
* **Bóveda de Documentos (Vault):** Almacenamiento cifrado de escrituras, contratos, seguros y facturas.
* **Valor de Mercado Dinámico:** Conexión con índices externos para actualizar el valor estimado de tus propiedades y coches en tu patrimonio neto.

---

## 2. Núcleo de Consumo e Inteligencia Doméstica
*El objetivo es la fricción cero en el registro y la eliminación del desperdicio.*

### 2.1. Ingesta de Datos Multimodal (Gemini AI)
* **Vision-to-Data:** Escaneo de tickets físicos. La IA extrae productos, precios, cantidades, comercio y categoría de gasto de forma automática.
* **Procesamiento de Recibos Digitales:** Integración (vía API o lectura de correos) para procesar pedidos online (Amazon, supermercados, etc.).
* **Voice-to-Inventory:** Comandos de voz para actualizar stock sobre la marcha ("He terminado el café", "Añade 3 kg de manzanas").

### 2.2. Inventario y Despensa Inteligente
* **Stock Dinámico:** Los productos se suman al inventario tras el escaneo del ticket y se restan manualmente o por predicción de consumo.
* **Gestión de Caducidades:** Alertas proactivas basadas en la vida útil estimada de frescos.
* **Monitor de Inflación Personal:** Histórico de precios por producto para identificar variaciones y saber dónde compras más barato.

### 2.3. Asistentes de Acción (Agentes IA)
* **El Cocinero AI:** Generación de recetas "Zero Waste" basadas exclusivamente en lo que tienes en la despensa, priorizando lo que va a caducar.
* **Planificador Nutricional:** Análisis de la calidad de tu compra y sugerencias de menús según objetivos (salud, ahorro o rendimiento deportivo).
* **Optimizador de Carrito:** Comparativa de precios entre distintos establecimientos para tu lista de la compra necesaria.

---

## 3. Integración Transversal (El "Cerebro" Concentrate)
*Donde los datos aislados se convierten en inteligencia aplicada.*

* **Sincronización Automática de Gastos:** Cualquier ticket procesado en el módulo de consumo impacta instantáneamente en el presupuesto financiero.
* **Detección de Activos desde Facturas:** Si compras un ítem de alto valor (ej. un ordenador), la IA pregunta si quieres registrarlo como "Activo" en el patrimonio, extrayendo automáticamente la garantía y manuales.
* **Presupuesto Dinámico:** Ajuste del límite de gasto en consumo/ocio basado en el rendimiento de tus inversiones y gastos fijos del mes.
* **Análisis de ROI de Vida:** Comparativa de gastos vs. utilidad (ej. "¿Me sale rentable mantener este coche o usar transporte público según mis gastos en reparaciones y gasolina registrados?").

---

## 4. Especificaciones Técnicas (Stack)
* **Frontend:** Flutter / React Native (Captura rápida y movilidad).
* **Backend & Auth:** Firebase (Firestore para datos NoSQL, Auth para acceso, Storage para documentos).
* **Motor de Inteligencia:** API de Gemini 1.5 Pro/Flash (Procesamiento de imagen, razonamiento lógico y agentes).
* **Seguridad:** * Cifrado de extremo a extremo en documentos sensibles.
    * Acceso biométrico obligatorio.
    * Reglas de seguridad de Firestore restrictivas (Solo lectura/escritura por UID).

---

## 5. El Factor de "Control Total" (Modo Conserje)
Interfaz de lenguaje natural (Chat) que permite consultas complejas:
> *"¿Cuánto dinero libre tendré a final de mes si compro los ingredientes para la cena de hoy, teniendo en cuenta que mañana me cobran el seguro del coche y que mis ETFs han bajado un 2%?"*

---

**Estado del Documento:** Listo para fase de desarrollo en GitHub.
**Prioridad 1:** Implementación de Auth + Vision-to-Data (Gemini) para tickets.