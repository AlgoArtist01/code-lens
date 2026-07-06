FROM node:20-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package.json ./
RUN npm install

FROM deps AS dev
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev"]

FROM deps AS build
COPY . .
RUN npm run build

FROM nginx:alpine AS prod
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
