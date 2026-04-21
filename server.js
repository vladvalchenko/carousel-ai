const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.OPENAI_API_KEY;
const UNSPLASH_KEY = process.env.UNSPLASH_ACCESS_KEY;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const rateLimits = new Map();
function checkRate(ip) {
  const now = Date.now();
  const e = rateLimits.get(ip) || { count: 0, resetAt: now + 3600000 };
  if (now > e.resetAt) { e.count = 0; e.resetAt = now + 3600000; }
  if (e.count >= 20) return false;
  e.count++;
  rateLimits.set(ip, e);
  return true;
}

// POST /generate — генерация слайдов
app.post('/generate', async (req, res) => {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  if (!checkRate(ip)) return res.status(429).json({ error: 'Лимит запросов. Попробуй через час.' });

  const { text, style = 'noir', slideCount = 5, tone = 'expert' } = req.body;
  if (!text || text.trim().length < 10) return res.status(400).json({ error: 'Текст слишком короткий.' });
  if (!API_KEY) return res.status(500).json({ error: 'OPENAI_API_KEY не настроен.' });

  const toneInstructions = {
    expert: 'Пиши авторитетно и профессионально. Используй конкретные цифры, факты, термины. Заголовки — утверждения эксперта.',
    friendly: 'Пиши просто и по-человечески, как будто объясняешь другу. Избегай сложных слов. Заголовки — разговорные, близкие.',
    provocative: 'Пиши провокационно и остро. Используй риторические вопросы, неожиданные утверждения, разрушай стереотипы. Заголовки — цепляющие и спорные.',
    minimal: 'Пиши максимально кратко. Только суть, никакой воды. Заголовки — 3-5 слов. Тело — 1 предложение.'
  };

  const toneText = toneInstructions[tone] || toneInstructions.expert;

  const prompt = `Ты — редактор Instagram-каруселей. Твоя задача — вытащить САМОЕ ЦЕННОЕ из текста и упаковать это в ${slideCount} слайдов.

ТОНАЛЬНОСТЬ: ${toneText}

ПРАВИЛА:
- headline: 3-6 слов, КОНКРЕТНО — цифра, факт, глагол действия, провокация. НЕ "Всё что нужно знать". Примеры: "Один раз настроил — работает само", "5 фич о которых никто не говорит"
- subhead: 4-8 слов — уточнение к headline
- body: 1-2 предложения с КОНКРЕТИКОЙ — цифры, примеры, механика. Не общие слова
- photo_keyword: одно английское слово для поиска фото на Unsplash (природа, город, технологии и т.д.)
- Слайд 1: сильный крючок — вопрос или утверждение которое останавливает скролл
- Слайды 2-${slideCount-1}: каждый = одна конкретная мысль из текста
- Слайд ${slideCount}: что делать прямо сейчас — конкретное действие
- Запрещено: вода, общие слова, повторы, эмодзи

Верни ТОЛЬКО валидный JSON без markdown:
{"photo_keyword":"...","slides":[{"headline":"...","subhead":"...","body":"..."}]}

ТЕКСТ:
${text.trim()}`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}` },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: 1000,
        temperature: 0.7,
        messages: [
          { role: 'system', content: 'Ты эксперт по созданию контента для Instagram. Отвечаешь только валидным JSON.' },
          { role: 'user', content: prompt }
        ]
      })
    });

    if (!response.ok) {
      const e = await response.json().catch(() => ({}));
      throw new Error(e.error?.message || `OpenAI error ${response.status}`);
    }

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content || '';
    const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());
    if (!Array.isArray(parsed.slides)) throw new Error('Неверный формат');

    res.json({ slides: parsed.slides, photo_keyword: parsed.photo_keyword || '' });

  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /photo — поиск фото на Unsplash
app.get('/photo', async (req, res) => {
  const { query, page = 1 } = req.query;
  if (!query) return res.status(400).json({ error: 'Нужен поисковый запрос' });

  const key = UNSPLASH_KEY || 'R3nbfOFMFe3e7b2TStilkFRyMMelTR-XfuYSlWGPU1I';

  try {
    const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=24&page=${page}&orientation=portrait`;
    const response = await fetch(url, {
      headers: { 'Authorization': `Client-ID ${key}` }
    });

    if (!response.ok) throw new Error(`Unsplash error ${response.status}`);

    const data = await response.json();
    const photos = data.results.map(p => ({
      id: p.id,
      url: p.urls.regular,
      thumb: p.urls.small,
      full: p.urls.full,
      author: p.user.name,
      color: p.color
    }));

    res.json({ photos, total: data.total });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});


app.listen(PORT, () => console.log(`Carousel AI running on port ${PORT}`));
