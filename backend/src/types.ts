export interface User {
  id: string;
  email: string;
  passwordHash: string;
  nickname?: string;
  createdAt: string;
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

export interface NoteTag {
  noteId: string;
  tagId: string;
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
