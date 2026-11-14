# Arquitectura por módulos y dominio

El punto de partida es un monolito modular: una API desplegable y una aplicación web. Los módulos representan capacidades del negocio, no categorías técnicas globales. `onboarding` en Go y `contractors` en frontend son los primeros ejemplos; futuros dominios, como proyectos o contratos, tendrán sus propias carpetas cuando existan requisitos reales.

## Dependencias

Dentro de cada módulo:

```text
presentation ──> application ──> domain
infrastructure ───────────────> domain / puertos de application
index ──> composición e inyección de adaptadores
```

- El dominio no importa React, net/http, HTTP, base de datos ni contratos de transporte.
- Los casos de uso dependen de interfaces y reciben sus adaptadores por inyección.
- La presentación interpreta entradas y traduce resultados al contrato externo.
- La infraestructura implementa acceso a servicios y almacenamiento.
- `index.ts` / `index.tsx` / `module.go` es la API pública y el punto de composición del módulo. Otros módulos y la aplicación importan desde ahí, sin acceder a carpetas internas.
- Un módulo no consulta directamente tablas ni repositorios de otro dominio. La colaboración se hace mediante una API pública explícita; los ciclos se resuelven en la composición de la aplicación.

Estas reglas son convenciones de revisión; todavía no hay un verificador automático de dependencias entre capas.

## Frontend y backend

Los módulos de ambas aplicaciones comparten vocabulario, pero sus modelos evolucionan de forma independiente. El frontend mantiene modelos para las necesidades de la interfaz y usa un gateway para obtener datos. El backend concentra las reglas de negocio y los casos de uso. El módulo web de contratistas resuelve una consulta y onboarding incorpora una escritura; agrega casos de uso en `application` cuando aparezcan transformaciones o flujos de negocio.

`@platform/contracts` contiene exclusivamente declaraciones TypeScript de DTO de la API. Los adaptadores convierten estos DTO a modelos locales. No compartir entidades, repositorios, secretos ni código del servidor con el navegador. Los tipos no validan datos en tiempo de ejecución: al incorporar endpoints de escritura, agregar esquemas de validación HTTP y reglas en el dominio.

Evitar carpetas globales como `services`, `controllers` o `models` que mezclen dominios. Crear `shared` solo cuando exista una utilidad técnica reutilizada por varios módulos; no trasladar allí lógica de negocio para resolver dependencias.

## Agregar un dominio

1. Crear `modules/<dominio>` en la aplicación que lo necesite.
2. Definir sus modelos e invariantes en `domain`.
3. Agregar casos de uso y puertos sin dependencias de frameworks.
4. Implementar los adaptadores necesarios y la presentación.
5. Componer las dependencias y exportar su API desde `index`.
6. Registrar el módulo en la composición de la aplicación.
7. Compartir DTO solo si existe comunicación entre aplicaciones.
8. Probar las reglas relevantes y la integración HTTP con adaptadores inyectados.

## Sustituir la persistencia

Implementar `domain.Repository` del módulo onboarding con una base de datos y pasar el adaptador a `onboarding.Register` desde la composición. El caso de uso y las rutas no necesitan conocer el motor de almacenamiento. Cada módulo será dueño de su persistencia y sus migraciones.

Hay dos adaptadores: memoria (por defecto, usado en las pruebas de rutas) y SQLite (`infrastructure/sqlite_repository.go`), que se activa con `DATABASE_PATH` desde `cmd/api`. El repositorio SQLite crea su tabla al iniciar (`CREATE TABLE IF NOT EXISTS`); todavía no hay migraciones versionadas ni autenticación. `internal/platform/database` abre la conexión compartida con el driver Go puro `modernc.org/sqlite`, sin CGO.

## Backend Go

El backend usa un módulo Go independiente (`apps/backend/go.mod`); su única dependencia externa es el driver SQLite. `cmd/api` inicia el servidor; `internal/app` compone los módulos. Cada módulo vive en `internal/modules/<domain>` y expone `Register` en su raíz. Dominio y aplicación no dependen de HTTP. La memoria se protege con mutex para peticiones concurrentes y devuelve copias de los datos.

El contrato público se documenta en `docs/openapi.json`; los DTO TypeScript de `packages/contracts` deben mantenerse alineados con los tipos JSON de Go. No hay generación automática de clientes. Las pruebas HTTP verifican creación, recuperación, obligatoriedad y respuestas de error.
