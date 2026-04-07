Tienes toda la razón. Pasemos del "qué" al **"cómo"**. Si quieres programar esto este fin de semana sin perderte en el código, necesitamos un **Documento de Especificación Técnica (PRD Técnico)**.

Aquí tienes la definición de ingeniería para **Concentrate v1.0 (Uso Personal)**:

---

### 1. Alcance Real (MVP Cerrado)
* **MVP:** Módulo de Ingesta (Vision) + Gastos/Suscripciones + Inventario básico.
* **Fuera del MVP:** Inversiones en tiempo real (APIs externas), Simulador de escenarios, Agente nutricional (Cocinero).
* **Usuario:** Single-user (tú).
* **Arquitectura:** 100% Cloud (Firebase). La latencia de la IA hace que el offline-first sea irrelevante para el flujo principal.

### 2. Fuentes de Datos y Conectividad
* **Finanzas:** **Entrada Manual + Parsing de Tickets.** (Olvida PSD2/Open Banking para un MVP personal; el coste y la burocracia de plataformas como Salt Edge/Nordigen no valen la pena ahora).
* **Consumo (Tickets):** Foco en España: **Mercadona, Carrefour, Lidl y Amazon (PDF/Screenshot).**
* **Inversiones:** Entrada de transacciones manual. Precios vía **CoinGecko API** (Public/Free tier) y **Yahoo Finance API** (vía RapidAPI) para ETFs.

### 3. Modelo de Datos (Firestore Schema)
Estructura de colecciones optimizada para consultas y costes:

* **`users/{uid}`**: Perfil y configuración de IA.
* **`expenses/{id}`**: 
    ```json
    { "amount": float, "currency": "EUR", "date": timestamp, "category": string, 
      "provider": string, "isSubscription": bool, "billingCycle": "monthly|yearly",
      "ticketRef": "storage_path", "items": [{ "name": string, "price": float }] }
    ```
* **`inventory/{id}`**:
    ```json
    { "name": string, "category": string, "quantity": float, "unit": "kg|unit|l",
      "expiryDate": timestamp, "lastPrice": float, "minStock": float }
    ```
* **`assets/{id}`**:
    ```json
    { "type": "crypto|etf|vehicle|property", "identifier": "BTC|ISIN|Placa",
      "purchasePrice": float, "purchaseDate": timestamp, "metadata": map }
    ```

### 4. IA: Definición de Prompt y Structured Output
Para evitar alucinaciones, usaremos **Gemini 1.5 Flash** con `response_mime_type: "application/json"`.

**System Instructions:**
> "Actúa como un extractor de datos contables. Tu salida debe ser exclusivamente JSON siguiendo este esquema: `{"total": number, "date": "ISO8601", "items": [{"name": string, "qty": number, "price": number}], "category": "food|tech|health|leisure"}`. Si el ticket es de un supermercado, extrae los productos al inventario. Si es un electrodoméstico, marca 'isAsset: true'."

### 5. Arquitectura de Ingesta (El Flujo Crítico)
1.  **Trigger:** Subida de imagen a **Firebase Storage**.
2.  **Process:** **Cloud Function (Node.js)** se dispara.
3.  **IA:** Envía el buffer de la imagen a Gemini API.
4.  **Logic:**
    * Crea documento en `expenses`.
    * Si hay productos, actualiza/crea documentos en `inventory` (upsert por nombre).
    * Si la IA detecta "Garantía/Electrodoméstico", crea entrada en `assets`.
5.  **Notify:** Push al móvil: *"Gasto de 45€ en Mercadona registrado. 12 productos nuevos en despensa."*

### 6. Seguridad (Cifrado y Privacidad)
Al ser personal, la prioridad es que tus datos no sean legibles en "plano" si alguien accede a tu consola de Firebase:
* **Documentos Sensibles:** Los archivos en Storage tendrán `metadata: { "encrypted": true }`.
* **Security Rules:** `allow read, write: if request.auth.uid == userId;`
* **API Keys:** Almacenadas en **Google Cloud Secret Manager**, no en el código ni en variables de entorno de Firebase genéricas.

### 7. UX: El flujo de <10 segundos
1.  **Abrir App** → Cámara abierta por defecto.
2.  **Click** → Captura de ticket.
3.  **Carga** → Spinner con mensaje "Procesando con Gemini...".
4.  **Validación** → Pantalla resumen: "Total: 42.50€. ¿Correcto?" → **Botón OK.**
5.  **Fin.** (La edición manual solo se ofrece si el usuario pulsa en el resumen).

### 8. Integración Transversal (Reglas de Negocio)
* **Regla de Activos:** Si un gasto en categoría "Tech" o "Home" supera los 150€, Gemini devuelve un flag `potentialAsset: true`. La UI te preguntará: "¿Añadir a tu patrimonio?".
* **Regla de Suscripción:** Si en `expenses` hay dos cargos del mismo `provider` en meses consecutivos, marcar automáticamente como `isSubscription: true`.

