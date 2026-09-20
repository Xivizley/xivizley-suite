FROM node:22-alpine
WORKDIR /app

RUN npm install -g pnpm@9.15.0 tsx

# Monorepo dosyalarını kopyala
COPY . .

# Bağımlılıkları yükle
RUN pnpm install --frozen-lockfile=false

WORKDIR /app/apps/sso
RUN pnpm build

EXPOSE 3000
ENV PORT=3000
ENV NODE_ENV=production

CMD ["tsx", "src/server/index.ts"]
