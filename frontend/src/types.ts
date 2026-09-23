// Mirrors backend/src/types.ts (the subset the frontend needs).

export interface User {
  id: string;
  email: string;
  nickname?: string;
}

export interface Notebook {
  id: string;
  userId: string;
  parentId: string | null;
  name: string;
  sortOrder: number;
  createdAt: string;
}

export interface Note {
  id: string;
  userId: string;
  notebookId: string | null;
  title: string;
  content: string;
  isPinned: boolean;
  isDeleted: boolean;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Tag {
  id: string;
  userId: string;
  name: string;
}

export interface Attachment {
  id: string;
  userId: string;
  noteId: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  url: string;
  createdAt: string;
}

export interface SearchResultItem {
  noteId: string;
  title: string; // may contain <em> highlight markers from the backend
  snippet: string; // may contain <em> highlight markers from the backend
  notebookId: string | null;
  updatedAt: string;
}

export type NoteListView =
  | { type: 'notebook'; id: string; name: string }
  | { type: 'tag'; id: string; name: string }
  | { type: 'trash' }
  | { type: 'search'; q: string };
