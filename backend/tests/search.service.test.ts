import { store } from '../src/db/store';
import { NotebooksService } from '../src/modules/notebooks/notebooks.service';
import { NotesService } from '../src/modules/notes/notes.service';
import { TagsService } from '../src/modules/tags/tags.service';
import { SearchService } from '../src/modules/search/search.service';

describe('SearchService', () => {
  const notebooks = new NotebooksService();
  const notes = new NotesService();
  const tags = new TagsService();
  const service = new SearchService();
  const userId = 'user-1';
  let notebookId: string;

  beforeEach(() => {
    store.reset();
    notebookId = notebooks.create(userId, 'Inbox').id;
    notes.create(userId, { title: 'Project kickoff meeting', content: 'Key milestones for this project', notebookId });
    notes.create(userId, { title: 'Shopping list', content: 'Milk eggs', notebookId });
  });

  it('matches a keyword in the title and returns a highlighted snippet', () => {
    const results = service.search(userId, 'project');
    expect(results).toHaveLength(1);
    expect(results[0].title.toLowerCase()).toContain('<em>project</em>');
  });

  it('matches a keyword in the body', () => {
    const results = service.search(userId, 'milk');
    expect(results).toHaveLength(1);
  });

  it('returns an empty array for an empty query', () => {
    expect(service.search(userId, '')).toHaveLength(0);
    expect(service.search(userId, '   ')).toHaveLength(0);
  });

  it('only returns the current user\'s own notes', () => {
    expect(service.search('other-user', 'project')).toHaveLength(0);
  });

  it('excludes soft-deleted notes from results', () => {
    const [note] = [...store.notes.values()];
    note.isDeleted = true;
    const results = service.search(userId, note.title);
    expect(results.find((r) => r.noteId === note.id)).toBeUndefined();
  });

  it('can filter search results by notebookId', () => {
    const otherNotebook = notebooks.create(userId, 'Other notebook').id;
    notes.create(userId, { title: 'Project retro', content: '', notebookId: otherNotebook });

    const results = service.search(userId, 'project', { notebookId });
    expect(results).toHaveLength(1);
  });

  it('can filter search results by tagId', () => {
    const tag = tags.create(userId, 'Important');
    const [firstNote] = [...store.notes.values()].filter((n) => n.title.includes('Project'));
    tags.setNoteTags(userId, firstNote.id, [tag.id]);

    const results = service.search(userId, 'project', { tagId: tag.id });
    expect(results).toHaveLength(1);
    expect(results[0].noteId).toBe(firstNote.id);
  });
});
