const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.OPENAI_API_KEY;

const db = new Database(path.join(__dirname, 'db.sqlite'));
db.exec(`
  CREATE TABLE IF NOT EXISTS generations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    input_text TEXT NOT NULL,
    style TEXT NOT NULL,
    slide_count INTEGER NOT NULL,
    slides_json TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

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

app.post('/generate', async (req, res) => {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  if (!checkRate(ip)) return res.status(429).json({ error: 'Лимит запросов. Попробуй через час.' });

  const { text, style = 'minimal', slideCount = 5, sessionId = 'anon' } = req.body;
  if (!text || text.trim().length < 10) return res.status(400).json({ error: 'Текст слишком короткий.' });
  if (!API_KEY) return res.status(500).json({ error: 'OPENAI_API_KEY не настроен.' });

  const prompt = `Сделай карусель из ${slideCount} слайдов для Instagram.
Слайд 1 — цепляющий крупный заголовок-вопрос или утверждение (до 6 слов).
Слайды 2-${slideCount - 1} — суть по нарастающей, каждый одна мысль с подзаголовком и пояснением.
Слайд ${slideCount} — призыв к действию, короткий и конкретный.
Без эмодзи. Без слов "крючок", "призыв" и подобных меток.

Верни ТОЛЬКО JSON без markdown:
{"slides":[{"headline":"...","subhead":"...","body":"..."}]}

ТЕКСТ: ${text.trim()}`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
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
      throw new Error(e.error?.message || `OpenAI API error ${response.status}`);
    }

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content || '';
    const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());
    if (!Array.isArray(parsed.slides)) throw new Error('Неверный формат ответа');

    db.prepare(`
      INSERT INTO generations (session_id, input_text, style, slide_count, slides_json)
      VALUES (?, ?, ?, ?, ?)
    `).run(sessionId, text.trim().slice(0, 500), style, slideCount, JSON.stringify(parsed.slides));

    res.json({ slides: parsed.slides });

  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/history', (req, res) => {
  const { sessionId = 'anon' } = req.query;
  const rows = db.prepare(`
    SELECT id, input_text, style, slide_count, slides_json, created_at
    FROM generations WHERE session_id = ?
    ORDER BY created_at DESC LIMIT 20
  `).all(sessionId);
  res.json(rows.map(r => ({ ...r, slides: JSON.parse(r.slides_json) })));
});

app.get('/stats', (req, res) => {
  const total = db.prepare('SELECT COUNT(*) as cnt FROM generations').get().cnt;
  const today = db.prepare(`SELECT COUNT(*) as cnt FROM generations WHERE date(created_at) = date('now')`).get().cnt;
  const thisWeek = db.prepare(`SELECT COUNT(*) as cnt FROM generations WHERE created_at >= datetime('now', '-7 days')`).get().cnt;
  res.json({ total, today, thisWeek });
});

app.get('/health', (_, res) => res.json({ ok: true }));
app.listen(PORT, () => console.log(`Carousel AI running on port ${PORT}`));
