FROM node:22-alpine
WORKDIR /app

RUN npm install -g pnpm@9.15.0

# Monorepo dosyalarını kopyala
COPY . .

# Bağımlılıkları yükle
RUN pnpm install --frozen-lockfile=false

WORKDIR /app/apps/pass
RUN pnpm build

EXPOSE 3009
ENV PORT=3009
ENV NODE_ENV=production

CMD ["pnpm", "start"]
