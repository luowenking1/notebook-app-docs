import { User, Notebook, Note, Tag, NoteTag } from '../types';

/**
 * In-memory data repository.
 *
 * To let local development and automated tests run without installing or
 * configuring a real database, this version uses in-memory Maps to model
 * the data tables designed in the technical doc (users / notebooks / notes /
 * tags / note_tags). The *Service classes above only depend on the
 * collections exposed here and don't care about the underlying storage
 * implementation, so when PostgreSQL is wired up later, only this file (or
 * a Repository class implementing the same interface) needs to be replaced —
 * no business logic code needs to change.
 */
class InMemoryStore {
  users: Map<string, User> = new Map();
  notebooks: Map<string, Notebook> = new Map();
  notes: Map<string, Note> = new Map();
  tags: Map<string, Tag> = new Map();
  noteTags: NoteTag[] = [];

  reset(): void {
    this.users.clear();
    this.notebooks.clear();
    this.notes.clear();
    this.tags.clear();
    this.noteTags = [];
  }
}

export const store = new InMemoryStore();
