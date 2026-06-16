FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production

COPY frontend/package*.json ./
RUN npm ci --ignore-scripts

COPY frontend/ ./

RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
