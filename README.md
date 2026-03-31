# Деплой Carousel AI — Render.com (бесплатно)

## Что нужно
- Аккаунт GitHub (бесплатно)
- Аккаунт Render.com (бесплатно)
- API ключ Anthropic ($5 минимум) — aistudio.google.com

---

## Шаг 1 — Загрузи на GitHub

1. Зайди на **github.com** → нажми **New repository**
2. Назови `carousel-ai`, сделай **Public**
3. Нажми **Create repository**
4. Распакуй ZIP, перетащи все файлы прямо на страницу репозитория
5. Нажми **Commit changes**

Структура должна быть такой:
```
carousel-ai/
├── server.js
├── package.json
├── .env.example
├── README.md
└── public/
    └── index.html
```

---

## Шаг 2 — Деплой на Render

1. Зайди на **render.com** → **Sign in with GitHub**
2. Нажми **New +** → **Web Service**
3. Выбери репозиторий `carousel-ai`
4. Заполни настройки:
   - **Name:** carousel-ai
   - **Runtime:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** Free
5. Нажми **Create Web Service**

---

## Шаг 3 — API ключ

В Render → твой сервис → вкладка **Environment** → **Add Environment Variable:**

| Key | Value |
|-----|-------|
| `GEMINI_API_KEY` | `AIzaSy_твой_ключ` |

Нажми **Save Changes** — сервис перезапустится автоматически.

Получить ключ: **aistudio.google.com** → Get API Key → Create API key

---

## Шаг 4 — Открывай

Render выдаст URL вида:
```
https://carousel-ai.onrender.com
```

Готово — сервис работает полностью бесплатно.

---

## Важно про Render Free

На бесплатном плане сервис **засыпает** после 15 минут без запросов.
Первый запрос после сна грузится ~30 секунд — это нормально.
Для личного использования и теста — подходит отлично.

Когда захочешь убрать задержку — перейди на Starter план ($7/месяц).

---

## Стоимость

| | |
|--|--|
| Render Free | $0 |
| Anthropic API (Haiku) | ~$0.001 за генерацию |
| 1000 генераций | ~$1 |
| Баланс $5 | ~5000 генераций |


---

## Бесплатные лимиты Gemini Flash

| | |
|--|--|
| Запросов в минуту | 15 |
| Запросов в день | 1500 |
| Цена сверх лимита | $0.075 за 1М токенов |

Для теста и личного использования — полностью бесплатно и без карты.
