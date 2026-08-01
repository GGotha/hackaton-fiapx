FROM node:22-slim AS builder
WORKDIR /app
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable
COPY . .
RUN pnpm install --frozen-lockfile

ARG APP
RUN pnpm nx build @fiapx/${APP}

FROM node:22-slim AS runtime
ARG APP
ARG INSTALL_FFMPEG=false
ENV NODE_ENV=production
WORKDIR /app

RUN if [ "$INSTALL_FFMPEG" = "true" ]; then \
      apt-get update \
      && apt-get install -y --no-install-recommends ffmpeg \
      && rm -rf /var/lib/apt/lists/*; \
    fi

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/${APP}/dist ./dist

CMD ["node", "dist/main.js"]
