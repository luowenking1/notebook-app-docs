import type { Attachment, Note, Notebook, SearchResultItem, Tag, User } from '../types';

const API_BASE = '/api/v1';

const ACCESS_TOKEN_KEY = 'nb_access_token';
const REFRESH_TOKEN_KEY = 'nb_refresh_token';

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

// --- Token storage -----------------------------------------------------
// A tiny module-level store, separate from React state, so the api client
// can read/write tokens without depending on AuthContext (and so it stays
// easy to unit test in isolation). AuthContext mirrors these into React
// state for rendering, and subscribes via onSessionExpired below.

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setTokens(accessToken: string, refreshToken: string): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export function clearTokens(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

type SessionExpiredHandler = () => void;
let sessionExpiredHandler: SessionExpiredHandler | null = null;

/** AuthContext registers itself here so the api client can tell it to log
 *  the user out when even a refreshed token is no longer accepted. */
export function onSessionExpired(handler: SessionExpiredHandler | null): void {
  sessionExpiredHandler = handler;
}

// --- Core request helper ------------------------------------------------

interface RequestOptions {
  method?: string;
  body?: unknown;
  isFormData?: boolean;
  /** Internal: prevents infinite retry loops after a refresh attempt. */
  _isRetry?: boolean;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {};
  const token = getAccessToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let body: BodyInit | undefined;
  if (options.body !== undefined) {
    if (options.isFormData) {
      body = options.body as FormData;
    } else {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(options.body);
    }
  }

  const res = await fetch(API_BASE + path, { method: options.method ?? 'GET', headers, body });

  // Access token expired mid-session: try one silent refresh-and-retry
  // before giving up, so a 30-minute access token doesn't force a manual
  // re-login every time it lapses.
  if (res.status === 401 && !options._isRetry && getRefreshToken() && path !== '/auth/refresh') {
    const refreshed = await tryRefresh();
    if (refreshed) return request<T>(path, { ...options, _isRetry: true });
    clearTokens();
    sessionExpiredHandler?.();
    throw new ApiError(401, 'Your session has expired. Please log in again.');
  }

  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!res.ok) {
    const message =
      data && typeof data === 'object' && 'message' in data ? String((data as { message: unknown }).message) : res.statusText;
    throw new ApiError(res.status, message || 'Request failed');
  }
  return data as T;
}

async function tryRefresh(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;
  try {
    const res = await fetch(API_BASE + '/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { accessToken: string; refreshToken: string };
    setTokens(data.accessToken, data.refreshToken);
    return true;
  } catch {
    return false;
  }
}

// --- Auth ---------------------------------------------------------------

export interface AuthResult {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export function register(email: string, password: string): Promise<AuthResult> {
  return request('/auth/register', { method: 'POST', body: { email, password } });
}

export function login(email: string, password: string): Promise<AuthResult> {
  return request('/auth/login', { method: 'POST', body: { email, password } });
}

export async function logout(): Promise<void> {
  const refreshToken = getRefreshToken();
  clearTokens();
  if (refreshToken) {
    // best-effort: the local session is already cleared either way
    await fetch(API_BASE + '/auth/logout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    }).catch(() => undefined);
  }
}

export function forgotPassword(email: string): Promise<{ message: string; devResetToken?: string }> {
  return request('/auth/password/forgot', { method: 'POST', body: { email } });
}

export function resetPassword(token: string, password: string): Promise<{ message: string }> {
  return request('/auth/password/reset', { method: 'POST', body: { token, password } });
}

// --- Notebooks ------------------------------------------------------------

export function listNotebooks(): Promise<Notebook[]> {
  return request('/notebooks');
}

export function createNotebook(name: string, parentId: string | null = null): Promise<Notebook> {
  return request('/notebooks', { method: 'POST', body: { name, parentId } });
}

export function renameNotebook(id: string, name: string): Promise<Notebook> {
  return request(`/notebooks/${id}`, { method: 'PATCH', body: { name } });
}

export function deleteNotebook(id: string): Promise<void> {
  return request(`/notebooks/${id}`, { method: 'DELETE' });
}

// --- Notes ------------------------------------------------------------

export interface ListNotesParams {
  notebookId?: string;
  tagId?: string;
  includeDeleted?: boolean;
}

export function listNotes(params: ListNotesParams = {}): Promise<Note[]> {
  const query = new URLSearchParams();
  if (params.notebookId) query.set('notebookId', params.notebookId);
  if (params.tagId) query.set('tagId', params.tagId);
  if (params.includeDeleted) query.set('includeDeleted', 'true');
  const qs = query.toString();
  return request(`/notes${qs ? `?${qs}` : ''}`);
}

export function getNote(id: string): Promise<Note> {
  return request(`/notes/${id}`);
}

export function createNote(input: { title: string; content?: string; notebookId: string }): Promise<Note> {
  return request('/notes', { method: 'POST', body: input });
}

export function updateNote(id: string, input: { title?: string; content?: string }): Promise<Note> {
  return request(`/notes/${id}`, { method: 'PATCH', body: input });
}

export function softDeleteNote(id: string): Promise<Note> {
  return request(`/notes/${id}`, { method: 'DELETE' });
}

export function restoreNote(id: string): Promise<Note> {
  return request(`/notes/${id}/restore`, { method: 'POST' });
}

export function permanentlyDeleteNote(id: string): Promise<void> {
  return request(`/notes/${id}/permanent`, { method: 'DELETE' });
}

export function setPinned(id: string, pinned: boolean): Promise<Note> {
  return request(`/notes/${id}/pin`, { method: 'PATCH', body: { pinned } });
}

// --- Tags ------------------------------------------------------------

export function listTags(): Promise<Tag[]> {
  return request('/tags');
}

export function createTag(name: string): Promise<Tag> {
  return request('/tags', { method: 'POST', body: { name } });
}

export function deleteTag(id: string): Promise<void> {
  return request(`/tags/${id}`, { method: 'DELETE' });
}

export function getNoteTags(noteId: string): Promise<Tag[]> {
  return request(`/notes/${noteId}/tags`);
}

export function setNoteTags(noteId: string, tagIds: string[]): Promise<Tag[]> {
  return request(`/notes/${noteId}/tags`, { method: 'PUT', body: { tagIds } });
}

// --- Search ------------------------------------------------------------

export function search(q: string, params: { notebookId?: string; tagId?: string } = {}): Promise<{ results: SearchResultItem[]; total: number }> {
  const query = new URLSearchParams({ q });
  if (params.notebookId) query.set('notebookId', params.notebookId);
  if (params.tagId) query.set('tagId', params.tagId);
  return request(`/search?${query.toString()}`);
}

// --- Attachments ------------------------------------------------------------

export function listAttachments(noteId: string): Promise<Attachment[]> {
  return request(`/notes/${noteId}/attachments`);
}

export function uploadAttachment(noteId: string, file: File): Promise<Attachment> {
  const formData = new FormData();
  formData.append('file', file);
  return request(`/notes/${noteId}/attachments`, { method: 'POST', body: formData, isFormData: true });
}

export function deleteAttachment(id: string): Promise<void> {
  return request(`/attachments/${id}`, { method: 'DELETE' });
}
