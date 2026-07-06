FROM node:20-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package.json ./
RUN npm install

FROM deps AS dev
COPY . .
EXPOSE 4000
CMD ["npm", "run", "dev"]

FROM deps AS build
COPY . .
RUN npm run build

FROM base AS prod
ENV NODE_ENV=production
COPY package.json ./
RUN npm install --omit=dev
COPY --from=build /app/dist ./dist
EXPOSE 4000
CMD ["node", "dist/index.js"]
