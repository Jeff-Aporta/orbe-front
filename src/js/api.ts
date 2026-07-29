/**
 * api.ts — cliente mínimo de la API de Orbe.
 *
 * El token JWT vive en localStorage y viaja en el header Authorization.
 * Todas las funciones devuelven el JSON de la API o lanzan Error con el
 * mensaje que devolvió el servidor ({ error: "..." }).
 */
import { API } from './config';
import type { Member, Permisos, Space, Tag, Task, User } from './types';

const TOKEN_KEY = 'orbe.token';
const USER_KEY = 'orbe.user';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getSavedUser(): User | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

export function saveSession(token: string, user: User): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

async function req<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const res = await fetch(`${API}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    /* respuesta vacía */
  }
  if (!res.ok) {
    const msg = (data as { error?: string } | null)?.error ?? `Error ${res.status}`;
    if (res.status === 401) clearSession();
    throw new ApiError(msg, res.status);
  }
  return data as T;
}

/* ---------- auth ---------- */

export async function register(nick: string, pass: string, confirmpass: string): Promise<{ token: string; user: User }> {
  return req('POST', '/auth/register', { nick, pass, confirmpass });
}

export async function login(nick: string, pass: string): Promise<{ token: string; user: User }> {
  return req('POST', '/auth/login', { nick, pass });
}

export async function me(): Promise<{ user: User }> {
  return req('GET', '/me');
}

/* ---------- spaces ---------- */

export async function listSpaces(): Promise<{ spaces: Space[] }> {
  return req('GET', '/spaces');
}

export async function createSpace(input: {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  privacy?: 'private' | 'public';
}): Promise<{ space: Space }> {
  return req('POST', '/spaces', input);
}

export async function getSpace(id: number): Promise<{ space: Space; members: Member[]; tags: Tag[] }> {
  return req('GET', `/spaces/${id}`);
}

export async function updateSpace(id: number, patch: Partial<Pick<Space, 'name' | 'description' | 'color' | 'icon' | 'privacy'>>): Promise<{ space: Space }> {
  return req('PATCH', `/spaces/${id}`, patch);
}

export async function deleteSpace(id: number): Promise<{ ok: true }> {
  return req('DELETE', `/spaces/${id}`);
}

export async function joinSpace(spaceId: number): Promise<{ space: Space }> {
  return req('POST', '/spaces/join', { space_id: spaceId });
}

/** Matriz de permisos del usuario actual en el space (modelo SEG). */
export async function getPermisos(spaceId: number): Promise<Permisos> {
  return req('GET', `/spaces/${spaceId}/permisos`);
}

/* ---------- miembros ---------- */

export async function addMember(spaceId: number, nick: string, role: string): Promise<{ ok: true }> {
  return req('POST', `/spaces/${spaceId}/members`, { nick, role });
}

export async function setMemberRole(spaceId: number, userId: number, role: string): Promise<{ ok: true }> {
  return req('PATCH', `/spaces/${spaceId}/members/${userId}`, { role });
}

export async function removeMember(spaceId: number, userId: number): Promise<{ ok: true }> {
  return req('DELETE', `/spaces/${spaceId}/members/${userId}`);
}

/* ---------- tareas ---------- */

export async function listTasks(spaceId: number): Promise<{ tasks: Task[] }> {
  return req('GET', `/spaces/${spaceId}/tasks`);
}

export async function createTask(spaceId: number, title: string): Promise<{ id: number }> {
  return req('POST', `/spaces/${spaceId}/tasks`, { title });
}

export interface TaskPatch {
  title?: string;
  notes?: string;
  priority?: string;
  status?: string;
  position?: number;
  archived?: boolean;
  due_date?: string | null;
  assignee_id?: number | null;
  tag_ids?: number[];
}

export async function updateTask(spaceId: number, taskId: number, patch: TaskPatch): Promise<{ ok: true }> {
  return req('PATCH', `/spaces/${spaceId}/tasks/${taskId}`, patch);
}

export async function deleteTask(spaceId: number, taskId: number): Promise<{ ok: true }> {
  return req('DELETE', `/spaces/${spaceId}/tasks/${taskId}`);
}

/* ---------- subtareas / comentarios / tags / imágenes ---------- */

export async function addSubtask(spaceId: number, taskId: number, title: string): Promise<{ id: number }> {
  return req('POST', `/spaces/${spaceId}/tasks/${taskId}/subtasks`, { title });
}

export async function updateSubtask(spaceId: number, subtaskId: number, patch: { done?: boolean; title?: string }): Promise<{ ok: true }> {
  return req('PATCH', `/spaces/${spaceId}/subtasks/${subtaskId}`, patch);
}

export async function deleteSubtask(spaceId: number, subtaskId: number): Promise<{ ok: true }> {
  return req('DELETE', `/spaces/${spaceId}/subtasks/${subtaskId}`);
}

export async function addComment(spaceId: number, taskId: number, body: string): Promise<{ id: number }> {
  return req('POST', `/spaces/${spaceId}/tasks/${taskId}/comments`, { body });
}

export async function createTag(spaceId: number, name: string, color: string): Promise<{ tag: Tag }> {
  return req('POST', `/spaces/${spaceId}/tags`, { name, color });
}

export async function deleteTag(spaceId: number, tagId: number): Promise<{ ok: true }> {
  return req('DELETE', `/spaces/${spaceId}/tags/${tagId}`);
}

export async function uploadImage(spaceId: number, taskId: number, file: File): Promise<{ id: number; url: string }> {
  const data = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
    reader.onerror = () => reject(new Error('No se pudo leer el archivo'));
    reader.readAsDataURL(file);
  });
  return req('POST', `/spaces/${spaceId}/tasks/${taskId}/image`, { data, type: file.type });
}

export async function deleteImage(spaceId: number, imageId: number): Promise<{ ok: true }> {
  return req('DELETE', `/spaces/${spaceId}/images/${imageId}`);
}
