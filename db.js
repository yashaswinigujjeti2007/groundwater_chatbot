const Database = require('better-sqlite3');
const path = require('path');

let db;

function init(dbFile) {
  const file = dbFile || process.env.DB_FILE || path.join(__dirname, 'chat.db');
  if (db) {
    try {
      db.close();
    } catch (e) {
      /* ignore */
    }
  }
  db = new Database(file);
  db.prepare(
    `CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      role TEXT NOT NULL,
      text TEXT NOT NULL,
      created_at INTEGER NOT NULL
    )`
  ).run();
}

function saveMessage(role, text) {
  const created_at = Date.now();
  const stmt = db.prepare('INSERT INTO messages (role, text, created_at) VALUES (?, ?, ?)');
  const info = stmt.run(role, text, created_at);
  return { id: info.lastInsertRowid, role, text, created_at };
}

function getHistory(limit = 100) {
  const stmt = db.prepare(
    'SELECT id, role, text, created_at FROM messages ORDER BY id DESC LIMIT ?'
  );
  return stmt.all(limit).reverse();
}

function clearHistory() {
  db.prepare('DELETE FROM messages').run();
}

// allow tests or server to reinitialize DB
function reopen(dbFile) {
  init(dbFile);
}

init();
module.exports = { saveMessage, getHistory, clearHistory, reopen };
