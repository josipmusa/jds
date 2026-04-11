import type { Todo, TodoDep } from './db.js';

export interface GraphNode {
  id: string;
  title: string;
  status: string;
}

export interface GraphEdge {
  source: string;
  target: string;
}

export interface GraphPayload {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export function buildGraph(todos: Todo[], deps: TodoDep[]): GraphPayload {
  const nodes: GraphNode[] = todos.map(t => ({
    id: t.id,
    title: t.title,
    status: t.status,
  }));

  // source → target means target depends on source
  const edges: GraphEdge[] = deps.map(d => ({
    source: d.depends_on,
    target: d.todo_id,
  }));

  return { nodes, edges };
}
