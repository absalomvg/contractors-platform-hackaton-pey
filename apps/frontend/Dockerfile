# Imagen del frontend. El contexto de build es la raíz del monorepo.
#   dev  -> servidor de Vite (docker-compose.yml)
#   prod -> archivos compilados servidos con nginx (perfil "prod")
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/frontend/package.json apps/frontend/
COPY apps/backend/package.json apps/backend/
COPY apps/edge/package.json apps/edge/
COPY packages/contracts/package.json packages/contracts/
RUN npm ci -w @platform/frontend -w @platform/contracts --include-workspace-root=false --ignore-scripts --no-audit --no-fund

FROM deps AS dev
COPY tsconfig.base.json ./
COPY packages/contracts packages/contracts
COPY apps/frontend apps/frontend
WORKDIR /app/apps/frontend
ENV VITE_API_PROXY_TARGET=http://backend:3001
EXPOSE 5173
CMD ["npx", "vite", "--host", "0.0.0.0"]

FROM dev AS build
RUN npx vite build

FROM nginx:1.27-alpine AS prod
COPY apps/frontend/nginx.conf /etc/nginx/templates/default.conf.template
COPY --from=build /app/apps/frontend/dist /usr/share/nginx/html
ENV API_UPSTREAM=http://api:8080
EXPOSE 80
