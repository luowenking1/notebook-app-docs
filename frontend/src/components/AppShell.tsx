import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import * as api from '../api/client';
import type { Attachment, Note, Notebook, NoteListView, SearchResultItem, Tag } from '../types';
import { buildSnippet, debounce, escapeHtml } from '../utils';
import Sidebar from './Sidebar';
import NoteListPane, { type NoteListItem } from './NoteListPane';
import Editor from './Editor';

export default function AppShell() {
  const { user, logout } = useAuth();

  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [view, setView] = useState<NoteListView | null>(null);
  const lastNonSearchView = useRef<NoteListView | null>(null);

  const [notes, setNotes] = useState<Note[]>([]);
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);

  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const [selectedAttachments, setSelectedAttachments] = useState<Attachment[]>([]);
  const [saveStatus, setSaveStatus] = useState('');
  const [attachmentError, setAttachmentError] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState('');

  // --- Initial load --------------------------------------------------
  useEffect(() => {
    (async () => {
      const [nbs, tagList] = await Promise.all([api.listNotebooks(), api.listTags()]);
      setNotebooks(nbs);
      setTags(tagList);
      if (nbs.length > 0) {
        const initialView: NoteListView = { type: 'notebook', id: nbs[0].id, name: nbs[0].name };
        lastNonSearchView.current = initialView;
        setView(initialView);
      }
    })();
  }, []);

  // --- Fetch the note list whenever the view changes ------------------
  const fetchListForView = useCallback(async (v: NoteListView | null) => {
    if (!v) {
      setNotes([]);
      setSearchResults([]);
      return;
    }
    if (v.type === 'search') {
      const { results } = await api.search(v.q);
      setSearchResults(results);
      setNotes([]);
    } else {
      const params =
        v.type === 'notebook'
          ? { notebookId: v.id }
          : v.type === 'tag'
            ? { tagId: v.id }
            : { includeDeleted: true };
      const list = await api.listNotes(params);
      setNotes(list);
      setSearchResults([]);
    }
  }, []);

  useEffect(() => {
    fetchListForView(view);
  }, [view, fetchListForView]);

  function selectView(v: NoteListView) {
    if (v.type !== 'search') lastNonSearchView.current = v;
    setView(v);
    setSelectedNote(null);
  }

  // --- Search box, debounced ------------------------------------------
  const debouncedSetSearchView = useMemo(
    () =>
      debounce((q: string) => {
        if (q) selectView({ type: 'search', q });
        else if (view?.type === 'search') selectView(lastNonSearchView.current ?? { type: 'notebook', id: notebooks[0]?.id ?? '', name: notebooks[0]?.name ?? '' });
      }, 350),
    [view, notebooks] // eslint-disable-line react-hooks/exhaustive-deps
  );

  function handleSearchChange(value: string) {
    setSearchInput(value);
    debouncedSetSearchView(value.trim());
  }

  // --- Selecting a note ------------------------------------------------
  async function selectNote(id: string) {
    const [note, noteTags, attachments] = await Promise.all([
      api.getNote(id),
      api.getNoteTags(id),
      api.listAttachments(id),
    ]);
    setSelectedNote(note);
    setSelectedTags(noteTags);
    setSelectedAttachments(attachments);
    setSaveStatus('');
    setAttachmentError(null);
  }

  // --- Actions -----------------------------------------------------------
  async function handleCreateNotebook(name: string) {
    const nb = await api.createNotebook(name);
    setNotebooks(await api.listNotebooks());
    selectView({ type: 'notebook', id: nb.id, name: nb.name });
  }

  async function handleNewNote() {
    if (!view || view.type !== 'notebook') return;
    const note = await api.createNote({ title: 'Untitled', content: '', notebookId: view.id });
    await fetchListForView(view);
    await selectNote(note.id);
  }

  async function handleSave(id: string, input: { title: string; content: string }) {
    setSaveStatus('Saving...');
    try {
      const updated = await api.updateNote(id, input);
      setSelectedNote(updated);
      setSaveStatus('Saved');
      fetchListForView(view);
    } catch (err) {
      setSaveStatus(`Could not save: ${err instanceof Error ? err.message : 'unknown error'}`);
    }
  }

  async function handleTogglePin() {
    if (!selectedNote) return;
    const updated = await api.setPinned(selectedNote.id, !selectedNote.isPinned);
    setSelectedNote(updated);
    fetchListForView(view);
  }

  async function handleDelete() {
    if (!selectedNote) return;
    if (!confirm('Move this note to Trash?')) return;
    await api.softDeleteNote(selectedNote.id);
    setSelectedNote(null);
    fetchListForView(view);
  }

  async function handleRestore() {
    if (!selectedNote) return;
    await api.restoreNote(selectedNote.id);
    setSelectedNote(null);
    fetchListForView(view);
  }

  async function handlePermanentDelete() {
    if (!selectedNote) return;
    if (!confirm('Delete this note forever? This cannot be undone.')) return;
    await api.permanentlyDeleteNote(selectedNote.id);
    setSelectedNote(null);
    fetchListForView(view);
  }

  async function handleAddTag(name: string) {
    if (!selectedNote) return;
    let tag = tags.find((t) => t.name.toLowerCase() === name.toLowerCase());
    if (!tag) {
      tag = await api.createTag(name);
      setTags(await api.listTags());
    }
    const currentIds = selectedTags.map((t) => t.id);
    const nextIds = currentIds.includes(tag.id) ? currentIds : [...currentIds, tag.id];
    const updated = await api.setNoteTags(selectedNote.id, nextIds);
    setSelectedTags(updated);
  }

  async function handleRemoveTag(tagId: string) {
    if (!selectedNote) return;
    const nextIds = selectedTags.filter((t) => t.id !== tagId).map((t) => t.id);
    const updated = await api.setNoteTags(selectedNote.id, nextIds);
    setSelectedTags(updated);
  }

  async function handleUploadAttachment(file: File) {
    if (!selectedNote) return;
    setAttachmentError(null);
    try {
      const attachment = await api.uploadAttachment(selectedNote.id, file);
      setSelectedAttachments((prev) => [...prev, attachment]);
    } catch (err) {
      setAttachmentError(err instanceof Error ? err.message : 'Upload failed');
    }
  }

  async function handleDeleteAttachment(id: string) {
    await api.deleteAttachment(id);
    setSelectedAttachments((prev) => prev.filter((a) => a.id !== id));
  }

  // --- Derived list items for NoteListPane --------------------------------
  const items: NoteListItem[] = useMemo(() => {
    if (view?.type === 'search') {
      return searchResults.map((r) => ({
        id: r.noteId,
        titleHtml: r.title,
        snippetHtml: r.snippet,
        updatedAt: r.updatedAt,
        isPinned: false,
      }));
    }
    return notes.map((n) => ({
      id: n.id,
      titleHtml: escapeHtml(n.title || 'Untitled'),
      snippetHtml: escapeHtml(buildSnippet(n.content)),
      updatedAt: n.updatedAt,
      isPinned: n.isPinned,
    }));
  }, [view, notes, searchResults]);

  return (
    <div className="app-shell">
      <header className="topbar">
        <span className="brand">Notebook</span>
        <div className="topbar-search">
          <input
            type="search"
            className="search-input"
            placeholder="Search your notes"
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </div>
        <div className="topbar-user">
          <span>{user?.email}</span>
          <button type="button" className="link-btn" onClick={logout}>
            Log out
          </button>
        </div>
      </header>

      <Sidebar notebooks={notebooks} tags={tags} view={view} onSelectView={selectView} onCreateNotebook={handleCreateNotebook} />

      <NoteListPane view={view} items={items} selectedId={selectedNote?.id ?? null} onSelect={selectNote} onNewNote={handleNewNote} />

      <section className="editor-pane">
        {selectedNote ? (
          <Editor
            note={selectedNote}
            tags={selectedTags}
            allTags={tags}
            attachments={selectedAttachments}
            saveStatus={saveStatus}
            onSave={handleSave}
            onTogglePin={handleTogglePin}
            onDelete={handleDelete}
            onRestore={handleRestore}
            onPermanentDelete={handlePermanentDelete}
            onAddTag={handleAddTag}
            onRemoveTag={handleRemoveTag}
            onUploadAttachment={handleUploadAttachment}
            onDeleteAttachment={handleDeleteAttachment}
            attachmentError={attachmentError}
          />
        ) : (
          <div className="editor-empty">
            <p>Select a note, or start a new one.</p>
          </div>
        )}
      </section>
    </div>
  );
}
