FROM node:18

WORKDIR /app

COPY . .

ENV NODE_ENV=production
ENV DATABASE_URL=file:./dev.db
ENV TELEGRAM_TOKEN=${TELEGRAM_TOKEN}
ENV API_HOST=${API_HOST}
ENV ITERATION_DELAY_MS=${ITERATION_DELAY_MS}

RUN npm install -g pnpm@8.6.0
RUN pnpm install

# RUN npx playwright install chromium
RUN npx playwright install-deps

CMD npm run start
