FROM node:22-bookworm-slim AS build
WORKDIR /app

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

COPY prisma ./prisma
COPY prisma7.config.ts tsconfig.json ./
# o generate não conecta no banco, a URL só precisa existir
RUN DATABASE_URL=postgresql://build:build@localhost:5432/build \
    yarn prisma generate --config prisma7.config.ts

COPY src ./src
RUN yarn build


FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --production && yarn cache clean

COPY --from=build /app/dist ./dist

USER node
CMD ["node", "dist/worker.js"]
