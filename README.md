# Concentrate

WebApp PWA construida con Vite + React + TypeScript + Firebase.

## Firebase Setup (Fase 0.2)

Este repositorio ya incluye la base de configuración para:

- Firebase project alias (`.firebaserc`) apuntando a `centrate`
- Firestore rules por UID (`firestore.rules`)
- Storage rules para `tickets/{uid}` y `vault/{uid}` (`storage.rules`)
- Hosting SPA + headers de seguridad (`firebase.json`)
- Cloud Functions Node.js 20 (`functions/`)
- Secret Manager integration (`defineSecret` en funciones)
- CORS template para Storage (`storage.cors.json`)

## 1) Requisitos

- Node.js 20+
- Firebase CLI (`firebase-tools`)
- Google Cloud SDK (`gcloud`) para aplicar CORS al bucket

## 2) Variables de entorno del frontend

Crea `.env.local` a partir de `.env.example` y rellena solo variables `VITE_FIREBASE_*`.

## 3) Auth (Email/Password)

En Firebase Console:

1. Abre `Authentication`.
2. Ve a `Sign-in method`.
3. Habilita `Email/Password`.

## 4) Secret Manager para Functions

```bash
firebase functions:secrets:set GEMINI_API_KEY
firebase functions:secrets:set FINNHUB_API_KEY
```

### Desarrollo local (sin exponer keys en frontend)

Usa `functions/.secret.local` (ya ignorado por git) con:

```bash
GEMINI_API_KEY=...
FINNHUB_API_KEY=...
```

Para referencia rápida hay una plantilla en `functions/.secret.local.example`.

## 5) Aplicar CORS en Firebase Storage

```bash
gcloud storage buckets update gs://centrate.firebasestorage.app --cors-file=storage.cors.json
```

## 6) Instalar dependencias

```bash
npm install
cd functions && npm install
```

## 7) Ejecutar en local

```bash
npm run dev
firebase emulators:start
```

## 8) Deploy

```bash
npm run build
firebase deploy --only firestore:rules,storage,hosting,functions
```

## 9) CI/CD (Fase 0.3)

Se añadió el workflow [`ci-cd.yml`](.github/workflows/ci-cd.yml) con el flujo:

1. `Lint`
2. `Test`
3. `Build`
4. `Deploy` a Firebase Hosting (solo en `push` a `main`)

### Secret obligatorio en GitHub

En `Settings > Secrets and variables > Actions`, crea:

- `FIREBASE_SERVICE_ACCOUNT_CENTRATE` con el JSON de una Service Account con permisos de deploy en Firebase Hosting.

Con ese secret configurado, cada push a `main` compila y publica automáticamente en Hosting.

## Notas de seguridad

- Las claves de Gemini/Finnhub **no** deben ir en el frontend.
- Cloud Functions valida payloads con `zod` y usa secretos de Secret Manager.
- `vault/{uid}` exige metadata `encrypted=true` en uploads, como base para el flujo cifrado.
