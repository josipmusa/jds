import Database from 'better-sqlite3';
import * as os from 'node:os';
import * as path from 'node:path';

export function resolveDbPath(): string {
  const copilotHome = process.env.COPILOT_HOME ?? path.join(os.homedir(), '.copilot');
  return path.join(copilotHome, 'session-store.db');
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
