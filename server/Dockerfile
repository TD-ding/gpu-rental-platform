FROM node:22-alpine AS builder-client
WORKDIR /build
COPY client/package.json client/package-lock.json* ./
RUN npm install --legacy-peer-deps
COPY client/ ./
RUN npm run build

FROM node:22-alpine AS builder-admin
WORKDIR /build
COPY admin/package.json admin/package-lock.json* ./
RUN npm install --legacy-peer-deps
COPY admin/ ./
RUN npm run build

FROM node:22-alpine
WORKDIR /app

COPY server/package.json server/package-lock.json* ./
RUN npm install --omit=dev

COPY server/src/ src/

COPY --from=builder-client /build/build /app/client/build
COPY --from=builder-admin /build/build /app/admin/build

ENV NODE_ENV=production
ENV PORT=5000

RUN mkdir -p /app/data

EXPOSE 5000

CMD ["node", "src/index.js"]
