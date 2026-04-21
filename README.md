# Carousel AI

Генератор Instagram-каруселей на основе AI.

## Запуск локально
```
npm install
cp .env.example .env
# Заполни .env своими ключами
npm start
```

## Деплой на Render
1. Загрузи проект на GitHub
2. Подключи репозиторий на render.com
3. Build: `npm install`, Start: `npm start`
4. Добавь переменные окружения: OPENAI_API_KEY, UNSPLASH_ACCESS_KEY

## Структура
- `server.js` — Express сервер, API endpoints
- `public/index.html` — весь фронтенд в одном файле
- `package.json` — зависимости (express, better-sqlite3)

