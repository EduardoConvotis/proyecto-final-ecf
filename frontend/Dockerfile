# FieldOps frontend — imagen de contenedor (feature 002-cicd-pipeline, ADR-0012).
# Build Angular en un stage Node y sirve estáticos con nginx.
# Contexto de build esperado: RAÍZ del repo (docker build -f frontend/Dockerfile .)

# ---- build stage ----
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY backend/package.json ./backend/package.json
COPY frontend/package.json ./frontend/package.json
RUN npm ci
COPY contracts ./contracts
COPY frontend ./frontend
# Contract-first: tipos de API derivados del contrato
RUN npm run gen:api --workspace frontend
RUN npm run build --workspace frontend

# ---- runtime stage ----
FROM nginx:1.27-alpine AS runtime
# Angular 19 emite en dist/fieldops/browser
COPY --from=build /app/frontend/dist/fieldops/browser /usr/share/nginx/html
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
