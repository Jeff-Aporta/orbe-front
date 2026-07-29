/**
 * types.ts — las formas que viajan entre Orbe y su API.
 * Espejo de las tablas de sql/schema.sql (con los JOINs ya resueltos).
 */

export type Role = 'admin' | 'editor' | 'reader';
export type Priority = 'baja' | 'media' | 'alta' | 'urgente';
export type Status = 'pendiente' | 'en_progreso' | 'hecha';

export interface User {
  id: number;
  nick: string;
  created_at: string;
}

export interface Space {
  id: number;
  owner_id: number;
  name: string;
  description: string;
  color: string;
  icon: string;
  privacy: 'private' | 'public';
  created_at: string;
  role: Role;
  task_count?: number;
  done_count?: number;
  member_count?: number;
}

export interface Member {
  id: number;
  nick: string;
  role: Role;
  created_at: string;
}

export interface Tag {
  id: number;
  name: string;
  color: string;
}

export interface Subtask {
  id: number;
  title: string;
  done: boolean;
}

export interface Comment {
  id: number;
  body: string;
  nick: string;
  created_at: string;
}

export interface TaskImage {
  id: number;
  url: string;
}

export interface Task {
  id: number;
  title: string;
  notes: string;
  priority: Priority;
  status: Status;
  position: number;
  archived: boolean;
  due_date: string | null;
  created_at: string;
  updated_at: string;
  creator_nick: string;
  assignee_id: number | null;
  assignee_nick: string | null;
  subtasks: Subtask[];
  tags: Tag[];
  images: TaskImage[];
  comments: Comment[];
}

/** Eventos que llegan por el WebSocket del space. */
export type WsEvent =
  | { type: 'presence'; online: string[] }
  | { type: 'tasks_changed' | 'members_changed' | 'space_changed'; space_id: number };

/** Matriz de permisos del usuario actual en un space (modelo SEG). */
export interface Permisos {
  role: Role;
  irol: string; // ADMIN | EDITOR | LECTOR
  permisos: Record<string, boolean>; // "recurso:accion" → permitido
}
