FROM oven/bun:1 as base
WORKDIR /usr/src/app

# Instalar dependências
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production


COPY . .


ENV PORT=3000
EXPOSE 3000


CMD ["bun", "run", "src/index.ts"]