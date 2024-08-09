# Development
FROM node:20-alpine as development
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY ./ ./

# Production
FROM node:20-alpine as production
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY ./ ./
ENV NODE_ENV=production
RUN npm run build
