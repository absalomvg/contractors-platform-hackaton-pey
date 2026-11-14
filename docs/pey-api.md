# Integración con `api.pey.mx` (Payment Links y CoDi QR)

Referencia técnica y operativa para el módulo de pagos del backend en Go (`apps/backend`) y los contratos compartidos (`packages/contracts`).

---

## 1. Modalidades de cobro activas

Todas las llamadas hacia `https://api.pey.mx` se realizan exclusivamente desde el backend (`apps/backend`) autenticadas con `Authorization: Bearer <PEY_API_KEY>`.

| Método (`PaymentMethodDto`) | Endpoint en `api.pey.mx` | Entrega al cliente | Uso principal |
| :--- | :--- | :--- | :--- |
| **`PAYMENT_LINK`** | `POST /payment-link/create`<br>`POST /payment-link/update`<br>`GET /payment-link/:id` | URL alojada por `pey` compartida por WhatsApp, correo electrónico o mensaje. | Cobros remotos, mensualidades, anticipos y recordatorios de pago (`MSJ Reminders`). |
| **`CODI_QR`** | `POST /codi/qr` | Devuelve `id` (IDC), `qrString` y `qrImage` opcional para escanear desde la app bancaria. | Cobros presenciales al finalizar una sesión, clase o servicio. |

> **Regla monetaria:** El dominio y los contratos internos operan en **centavos enteros** (`amountCents`, por ejemplo `80000` para `$800.00 MXN`). Únicamente el adaptador HTTP de infraestructura hacia `api.pey.mx` convierte centavos a pesos (`amount = amountCents / 100`).

---

## 2. Especificación de endpoints de `api.pey.mx`

### 2.1 Payment Links (`POST https://api.pey.mx/payment-link/create`)

- **Cuerpo de petición (JSON):**
  - `amount` (`number`, obligatorio): importe en **pesos** (`> 0`).
  - `successUrl` (`string`, obligatorio): URL HTTPS de redirección tras completar el pago.
  - `backUrl` (`string`, obligatorio): URL HTTPS de redirección cuando el pagador regresa sin pagar.
  - `hasTip` (`boolean`, opcional): habilita propina opcional.
  - `clientReferenceId` (`string`, opcional, `<= 255` caracteres): identificador interno del cobro (`paymentIntent.id`).
  - `metadata` (`Record<string, string>`, opcional): hasta 50 pares clave-valor (`<= 500` caracteres por valor).
- **Operaciones complementarias:**
  - `POST /payment-link/update`: permite actualizar el monto mientras el enlace permanece en estado `pending`.
  - `GET /payment-link/:id`: consulta el estado y detalle del enlace.

### 2.2 Código QR CoDi (`POST https://api.pey.mx/codi/qr`)

- **Cuerpo de petición (JSON):**
  - `amount` (`number`, obligatorio): importe en **pesos** (`> 0` para monto fijo; `0` para monto abierto).
  - `concept` (`string`, obligatorio): descripción del cobro (`1..40` caracteres).
  - `expiration` (`number`, obligatorio): `0` (sin vencimiento) o entero `>= 360` segundos.
  - `numRef` (`string`, opcional): referencia numérica de `1` a `7` dígitos (`^\d{1,7}$`).
  - `bankAccountId` (`string`, opcional): ULID de la cuenta bancaria destino registrada en `pey`.
  - `metadata` (`Record<string, string>`, opcional): hasta 50 pares clave-valor.
- **Respuesta (`200 OK`):**
  ```json
  {
    "id": "01J...",
    "qrString": "{\"TYP\":19,...}",
    "qrImage": "data:image/png;base64,..."
  }
  ```
- **Nota de conciliación:** Cancelar un cobro localmente no invalida un QR ya emitido ante Banxico. Si llega un webhook de pago para un cobro en estado `EXPIRED` o `CANCELLED`, el sistema debe transicionarlo a `SETTLED`.

### 2.3 Cuentas bancarias destino (`/bank-account`)

- `POST https://api.pey.mx/bank-account`: registra la CLABE de 18 dígitos del contratista/profesional (`alias`, `name`, `clabe`, `entity: "PERSON" | "BUSINESS"`, `taxId` opcional).
- `GET https://api.pey.mx/bank-account/:id`: consulta el estado de activación ante Banxico (`codiStatus`: `"PENDING"` | `"PROCESSING"` | `"ACTIVE"` | `"ERROR"`).
- **Seguridad de datos:** No persistir la CLABE completa de 18 dígitos en la base de datos de la plataforma; conservar únicamente `peyBankAccountId` y los últimos 4 dígitos (`clabeLast4`).

### 2.4 Webhooks (`standardwebhooks`)

- Todas las notificaciones de pago recibidas desde `pey` se verifican con el secreto `PEY_WEBHOOK_SECRET` siguiendo la especificación `standardwebhooks`.
- El encabezado `webhook-id` actúa como llave de idempotencia obligatoria para evitar procesar dos veces la misma notificación.
- En pagos CoDi (`codi.qr.payment_received`), la cuenta `clabe` incluida en el payload corresponde a la cuenta receptora del profesional; la conciliación con el cliente se realiza mediante el `codiQrId`, `clientReferenceId` o `numRef` asociado al cobro.

---

## 3. Reglas de seguridad y cumplimiento

1. **Sin custodia de fondos:** Los cobros se dirigen únicamente a la cuenta bancaria registrada del contratista (`bankAccountId`). La plataforma no concentra ni dispersa fondos de terceros (cláusulas 3.3, 5.2d y 5.4 de los términos de `pey`).
2. **Secretos solo en servidor:** `PEY_API_KEY` y `PEY_WEBHOOK_SECRET` se leen desde variables de entorno en `apps/backend` y nunca se exponen al cliente web ni a `packages/contracts`.
3. **Pruebas reales de bajo monto:** Dado que `api.pey.mx` opera sobre la red productiva de Banxico, las pruebas de extremo a extremo se ejecutan con montos de `$0.01 MXN` (`amountCents = 1`) sobre una cuenta con `codiStatus = "ACTIVE"`.
