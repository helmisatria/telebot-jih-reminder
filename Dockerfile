FROM node:18

WORKDIR /app

COPY . .

RUN npm install -g pnpm@8.6.0
RUN pnpm install
# RUN npx playwright install chromium
RUN npx playwright install-deps

CMD npm run start
