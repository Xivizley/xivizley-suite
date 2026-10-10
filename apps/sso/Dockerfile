FROM node:22-alpine
WORKDIR /app

RUN npm install -g pnpm@9.15.0 tsx
# Native optional deps (ssh2/cpu-features) need a toolchain at install time
RUN apk add --no-cache python3 make g++

# Monorepo dosyalarını kopyala
COPY . .

# Yalnızca hub (sso) ve workspace bağımlılıklarını yükle — tüm monorepo yerine
RUN pnpm install --frozen-lockfile=false --filter @xivizley/sso...

WORKDIR /app/apps/sso
RUN pnpm build

# Drop build-only toolchain to keep the runtime image slim
RUN apk del python3 make g++ || true

EXPOSE 3000
ENV PORT=3000
ENV NODE_ENV=production

CMD ["tsx", "src/server/index.ts"]
