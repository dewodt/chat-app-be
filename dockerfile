# Development
FROM node:20 as development
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY ./ ./

# Production
FROM node:20 as production
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY ./ ./
ENV NODE_ENV=production
RUN npm run build
