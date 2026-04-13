import Database from 'better-sqlite3';
import * as os from 'node:os';
import * as path from 'node:path';
import * as fs from 'node:fs';

// Finds the active session's SQLite DB by picking the most recently modified
// session.db under ~/.copilot/session-state/<session-id>/session.db.
export function resolveDbPath(): string {
  const copilotHome = process.env.COPILOT_HOME ?? path.join(os.homedir(), '.copilot');
  const sessionStateDir = path.join(copilotHome, 'session-state');

  if (!fs.existsSync(sessionStateDir)) {
    return path.join(copilotHome, 'session-store.db'); // legacy fallback
  }

  let newest: { path: string; mtime: number } | null = null;

  for (const entry of fs.readdirSync(sessionStateDir)) {
    const dbFile = path.join(sessionStateDir, entry, 'session.db');
    try {
      const stat = fs.statSync(dbFile);
      if (!newest || stat.mtimeMs > newest.mtime) {
        newest = { path: dbFile, mtime: stat.mtimeMs };
      }
    } catch {
      // session dir without a session.db — skip
    }
  }

  return newest?.path ?? path.join(copilotHome, 'session-store.db');
}

export interface Todo {
  id: string;
  title: string;
  status: 'pending' | 'in_progress' | 'done' | 'blocked';
}

export interface TodoDep {
  todo_id: string;
  depends_on: string;
}

export function readGraph(dbPath: string): { todos: Todo[]; deps: TodoDep[] } {
  const db = new Database(dbPath, { readonly: true, fileMustExist: true });
  try {
    const todos = db.prepare('SELECT id, title, status FROM todos').all() as Todo[];
    const deps = db.prepare('SELECT todo_id, depends_on FROM todo_deps').all() as TodoDep[];
    return { todos, deps };
  } finally {
    db.close();
  }
}
