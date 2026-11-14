# Plataforma de contratistas

Monorepo con npm workspaces y TypeScript estricto. Frontend en React + Vite y backend en Go (biblioteca estándar `net/http`). Cada aplicación organiza sus funcionalidades por dominio, dentro de módulos independientes.

## Desarrollo

Requiere Go 1.24 o superior, Node 22.12 o superior de la rama 22 y npm 10 o superior. `.nvmrc` selecciona Node 22.

```bash
nvm install
nvm use
npm ci
npm run dev
```

- Frontend: http://localhost:5173
- Backend: http://127.0.0.1:3001/api/health
- Contratistas: http://127.0.0.1:3001/api/contractors

Vite redirige `/api` al backend durante desarrollo. El formulario de onboarding crea y consulta registros en memoria. El listado de contratistas es una colección vacía de arranque. No incluye autenticación ni persistencia.

## Estructura

```text
apps/
  frontend/src/
    app/                     # Composición y estilos de la aplicación
    modules/contractors/
      domain/                # Modelo local, independiente de React y HTTP
      application/           # Puertos de acceso a datos
      infrastructure/        # Adaptador HTTP
      presentation/          # Página y estados de la interfaz
      index.tsx              # API pública y composición del módulo
  backend/
    cmd/api/                 # Arranque y cierre del servidor
    internal/app/            # Composición HTTP
    internal/modules/onboarding/
      domain/                # Modelo, validación y puerto de repositorio
      application/           # Casos de uso
      infrastructure/        # Repositorio en memoria con sincronización
      presentation/          # Adaptador HTTP
      module.go              # API pública del módulo
packages/
  contracts/                 # Tipos de transporte compartidos, sin runtime
```

## Comandos

```bash
npm run dev          # Ambas aplicaciones; Ctrl+C detiene ambas
npm run typecheck    # TypeScript y go vet
npm test             # Pruebas Go con detector de condiciones de carrera
npm run build        # Compila ambas aplicaciones
npm run check        # Tipos, pruebas y build; también se ejecuta en CI
```

También puedes ejecutar `npm run dev -w @platform/frontend` o `npm run dev -w @platform/backend`.

Después de compilar, `npm run start -w @platform/backend` inicia la API. Admite `PORT` (3001 por defecto) y `HOST` (127.0.0.1 por defecto) como variables del proceso. Si cambias el puerto, ajusta el proxy en `apps/frontend/vite.config.ts`.

El frontend compilado queda en `apps/frontend/dist`. En producción, el servidor web debe servir esos archivos y redirigir `/api` al backend; el proxy de Vite solo funciona en desarrollo. `npm run preview -w @platform/frontend` únicamente permite inspeccionar los archivos compilados.

Consulta [las reglas de arquitectura](docs/architecture.md) antes de agregar módulos.

## Contrato de onboarding

Especificación: [OpenAPI 3.1](docs/openapi.json). Código y campos en inglés; interfaz y errores de validación en español. `client` representa al usuario/cliente.

- `POST /api/onboarding`: crea el registro, responde `201` y `Location`.
- `GET /api/onboarding/{id}`: obtiene el registro, responde `200` o `404`.
- Solo `taxRegime` es opcional. Se validan campos obligatorios, formato de email, teléfono y sintaxis del RFC. No se verifica el RFC ante el SAT.

```bash
curl -i http://127.0.0.1:3001/api/onboarding \
  -H 'Content-Type: application/json' \
  -d '{"name":"Ana Pérez","profession":"Electricista","client":{"name":"Luis López","phone":"+52 555 123 4567","email":"luis@example.com"},"businessName":"Servicios Pérez","businessActivity":"Instalaciones eléctricas","rfc":"AAA010101AAA"}'
```

Los errores usan `{ "message": "…", "errors": { "client.email": "…" } }`; `errors` aparece en validaciones (`422`). JSON inválido o campos desconocidos: `400`; contenido distinto de JSON: `415`; cuerpo mayor a 1 MiB: `413`. Los registros desaparecen al reiniciar el proceso. El onboarding todavía no crea una entrada en el listado de contratistas.

El backend se ejecuta con `go run` en desarrollo; después de cambios Go hay que reiniciarlo. Para trabajar sin npm: `cd apps/backend`, `go run ./cmd/api`, `go test -race ./...`.
