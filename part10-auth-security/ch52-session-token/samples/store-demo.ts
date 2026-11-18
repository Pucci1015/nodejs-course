// 8.1節: セッションの保存場所（store）を自分で持って、ある人のセッションをすべて消す
// 動かし方: node samples/store-demo.ts   → http://127.0.0.1:9627
// パスワードは確かめない（store の使い方だけを見るため）。本物のログインは session-app.ts
import express from 'express';
import session from 'express-session';

declare module 'express-session' {
  interface SessionData {
    name: string;
  }
}

// 保存場所を自分で作って、session() に渡す。こうすると、後で store.destroy を呼べる
const store = new session.MemoryStore();
/** 名前 → その人のセッションの ID の集まり */
const sessionsOf = new Map<string, Set<string>>();

const app = express();
app.use(session({ name: 'sid', secret: 'dev-only-session-secret-change-me', store, resave: false, saveUninitialized: false }));

app.post('/login/:name', (req, res) => {
  req.session.regenerate((err) => {
    if (err) return res.status(500).end();
    const name = req.params.name;
    req.session.name = name;
    // req.sessionID は、今のセッションの ID（Cookie に署名を付けて入っている値）
    const set = sessionsOf.get(name) ?? new Set<string>();
    set.add(req.sessionID);
    sessionsOf.set(name, set);
    res.json({ name, sessions: set.size });
  });
});

app.get('/me', (req, res) => {
  if (req.session.name === undefined) return res.status(401).json({ detail: 'ログインしてください' });
  res.json({ name: req.session.name });
});

/** store.destroy はコールバックの形なので、Promise に包む（第3部 第12章） */
function destroySid(sid: string) {
  return new Promise<void>((resolve, reject) => {
    store.destroy(sid, (err: unknown) => {
      if (err) reject(err instanceof Error ? err : new Error('セッションを消せませんでした'));
      else resolve();
    });
  });
}

// その人のセッションを、すべて消す（ほかの端末からも、ログアウトさせる）
app.post('/kick/:name', async (req, res) => {
  const set = sessionsOf.get(req.params.name) ?? new Set<string>();
  for (const sid of set) await destroySid(sid);
  sessionsOf.delete(req.params.name);
  res.json({ destroyed: set.size });
});

app.listen(9627, '127.0.0.1', () => console.log('http://127.0.0.1:9627'));
