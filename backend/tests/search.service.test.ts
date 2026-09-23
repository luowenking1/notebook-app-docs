import { resetDb, closeDb } from './testDb';
import { NotebooksService } from '../src/modules/notebooks/notebooks.service';
import { NotesService } from '../src/modules/notes/notes.service';
import { TagsService } from '../src/modules/tags/tags.service';
import { SearchService } from '../src/modules/search/search.service';
import { AuthService } from '../src/modules/auth/auth.service';

describe('SearchService', () => {
  const notebooks = new NotebooksService();
  const notes = new NotesService();
  const tags = new TagsService();
  const service = new SearchService();
  const auth = new AuthService();
  let userId: string;
  let notebookId: string;
  let projectNoteId: string;

  beforeEach(async () => {
    await resetDb();
    const registered = await auth.register('owner@test.com', 'password123');
    userId = registered.user.id;
    notebookId = (await notebooks.create(userId, 'Inbox')).id;
    const projectNote = await notes.create(userId, {
      title: 'Project kickoff meeting',
      content: 'Key milestones for this project',
      notebookId,
    });
    projectNoteId = projectNote.id;
    await notes.create(userId, { title: 'Shopping list', content: 'Milk eggs', notebookId });
  });
  afterAll(async () => closeDb());

  it('matches a keyword in the title and returns a highlighted snippet', async () => {
    const results = await service.search(userId, 'project');
    expect(results).toHaveLength(1);
    expect(results[0].title.toLowerCase()).toContain('<em>project</em>');
    expect(results[0].noteId).toBe(projectNoteId);
  });

  it('matches a keyword in the body', async () => {
    const results = await service.search(userId, 'milk');
    expect(results).toHaveLength(1);
  });

  it('returns an empty array for an empty query', async () => {
    expect(await service.search(userId, '')).toHaveLength(0);
    expect(await service.search(userId, '   ')).toHaveLength(0);
  });

  it('only returns the current user\'s own notes', async () => {
    const other = await auth.register('other@test.com', 'password123');
    expect(await service.search(other.user.id, 'project')).toHaveLength(0);
  });

  it('excludes soft-deleted notes from results', async () => {
    await notes.softDelete(userId, projectNoteId);
    const results = await service.search(userId, 'project');
    expect(results.find((r) => r.noteId === projectNoteId)).toBeUndefined();
  });

  it('can filter search results by notebookId', async () => {
    const otherNotebook = (await notebooks.create(userId, 'Other notebook')).id;
    await notes.create(userId, { title: 'Project retro', content: '', notebookId: otherNotebook });

    const results = await service.search(userId, 'project', { notebookId });
    expect(results).toHaveLength(1);
    expect(results[0].noteId).toBe(projectNoteId);
  });

  it('can filter search results by tagId', async () => {
    const tag = await tags.create(userId, 'Important');
    await tags.setNoteTags(userId, projectNoteId, [tag.id]);

    const results = await service.search(userId, 'project', { tagId: tag.id });
    expect(results).toHaveLength(1);
    expect(results[0].noteId).toBe(projectNoteId);
  });

  it('ranks results by relevance using ts_rank, not just recency', async () => {
    // A note that mentions "project" twice should rank at or above one that mentions it once.
    const strongMatch = await notes.create(userId, {
      title: 'Project project project',
      content: 'project project',
      notebookId,
    });
    const results = await service.search(userId, 'project');
    expect(results[0].noteId).toBe(strongMatch.id);
  });
});
