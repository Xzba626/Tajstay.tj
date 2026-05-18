# syntax=docker/dockerfile:1
FROM node:20-bookworm-slim
WORKDIR /app
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npx prisma generate && npm run build
ENV NODE_ENV=production
EXPOSE 3000
CMD ["npm", "run", "start"]
