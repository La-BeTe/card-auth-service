FROM node:20

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

ENV NODE_TLS_REJECT_UNAUTHORIZED="0"

CMD [ "npm", "start" ]