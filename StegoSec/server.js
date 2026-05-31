import express from 'express';
import cors from 'cors';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;
const DB_FILE = path.join(__dirname, 'database.json');

app.use(cors());
app.use(express.json());

// Initialize DB file if not exists
async function initDB() {
  try {
    await fs.access(DB_FILE);
  } catch {
    const initialData = {
      users: [],
      friends: [],
      messages: [],
      auditLogs: []
    };
    await fs.writeFile(DB_FILE, JSON.stringify(initialData, null, 2));
  }
}

async function readDB() {
  const data = await fs.readFile(DB_FILE, 'utf-8');
  return JSON.parse(data);
}

async function writeDB(data) {
  await fs.writeFile(DB_FILE, JSON.stringify(data, null, 2));
}

// Generic CRUD endpoints
app.get('/api/:store', async (req, res) => {
  const { store } = req.params;
  const db = await readDB();
  if (!db[store]) return res.status(404).send('Store not found');
  res.json(db[store]);
});

app.get('/api/:store/:id', async (req, res) => {
  const { store, id } = req.params;
  const db = await readDB();
  if (!db[store]) return res.status(404).send('Store not found');
  const item = db[store].find(i => i.id === id || String(i.id) === id);
  res.json(item || null);
});

app.post('/api/:store', async (req, res) => {
  const { store } = req.params;
  const item = req.body;
  const db = await readDB();
  if (!db[store]) return res.status(404).send('Store not found');
  
  // Handle auto-increment if no ID
  if (!item.id) {
    const maxId = db[store].reduce((max, i) => Math.max(max, Number(i.id) || 0), 0);
    item.id = maxId + 1;
  }

  // Update or insert
  const index = db[store].findIndex(i => i.id === item.id || String(i.id) === String(item.id));
  if (index >= 0) {
    db[store][index] = item;
  } else {
    db[store].push(item);
  }
  
  await writeDB(db);
  res.json(item);
});

app.delete('/api/:store/:id', async (req, res) => {
  const { store, id } = req.params;
  const db = await readDB();
  if (!db[store]) return res.status(404).send('Store not found');
  db[store] = db[store].filter(i => String(i.id) !== String(id));
  await writeDB(db);
  res.sendStatus(204);
});

initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`StegoSec Shared Backend running at http://localhost:${PORT}`);
  });
});
