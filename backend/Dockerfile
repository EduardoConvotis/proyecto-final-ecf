# FieldOps backend — imagen de contenedor (feature 002-cicd-pipeline, ADR-0012).
# Monorepo npm workspaces: el build se hace desde la raíz para respetar el lockfile hoisted.
# Contexto de build esperado: RAÍZ del repo (docker build -f backend/Dockerfile .)

# ---- build stage ----
FROM node:22-alpine AS build
WORKDIR /app
# Manifiestos primero (mejor cacheo de capas)
COPY package.json package-lock.json ./
COPY backend/package.json ./backend/package.json
COPY frontend/package.json ./frontend/package.json
RUN npm ci
# Fuente necesaria
COPY contracts ./contracts
COPY backend ./backend
# Contract-first (Principio VII): tipos derivados del contrato antes de compilar
RUN npm run gen:api --workspace backend
# Prisma client + build TS
RUN npx --workspace backend prisma generate
RUN npm run build --workspace backend

# Dependencias de producción en un árbol limpio
RUN npm prune --omit=dev

# ---- runtime stage ----
FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
# node_modules hoisted (raíz) + prisma engines ya generados
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/backend/dist ./backend/dist
COPY --from=build /app/backend/package.json ./backend/package.json
COPY --from=build /app/backend/prisma ./backend/prisma
# Puerto por defecto del server (ajustar si difiere)
EXPOSE 3000
USER node
CMD ["node", "backend/dist/server.js"]
