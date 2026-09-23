import { useState, type KeyboardEvent } from 'react';
import type { Notebook, NoteListView, Tag } from '../types';

interface Props {
  notebooks: Notebook[];
  tags: Tag[];
  view: NoteListView | null;
  onSelectView: (view: NoteListView) => void;
  onCreateNotebook: (name: string) => void;
}

export default function Sidebar({ notebooks, tags, view, onSelectView, onCreateNotebook }: Props) {
  const [showNewNotebookForm, setShowNewNotebookForm] = useState(false);
  const [newNotebookName, setNewNotebookName] = useState('');

  function handleNewNotebookKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const name = newNotebookName.trim();
    if (!name) return;
    onCreateNotebook(name);
    setNewNotebookName('');
    setShowNewNotebookForm(false);
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-section">
        <div className="sidebar-heading">
          <span>Notebooks</span>
          <button
            type="button"
            className="icon-btn"
            title="New notebook"
            aria-label="New notebook"
            onClick={() => setShowNewNotebookForm((v) => !v)}
          >
            +
          </button>
        </div>
        {showNewNotebookForm && (
          <div className="inline-form">
            <input
              type="text"
              placeholder="Notebook name"
              value={newNotebookName}
              onChange={(e) => setNewNotebookName(e.target.value)}
              onKeyDown={handleNewNotebookKeyDown}
              autoFocus
            />
          </div>
        )}
        <ul className="nav-list">
          {notebooks.map((nb) => (
            <li
              key={nb.id}
              className={view?.type === 'notebook' && view.id === nb.id ? 'is-active' : ''}
              onClick={() => onSelectView({ type: 'notebook', id: nb.id, name: nb.name })}
            >
              {nb.name}
            </li>
          ))}
        </ul>
      </div>

      <div className="sidebar-section sidebar-tags">
        <div className="sidebar-heading">
          <span>Tags</span>
        </div>
        <ul className="nav-list nav-list-tags">
          {tags.map((tag) => (
            <li
              key={tag.id}
              className={view?.type === 'tag' && view.id === tag.id ? 'is-active' : ''}
              onClick={() => onSelectView({ type: 'tag', id: tag.id, name: tag.name })}
            >
              #{tag.name}
            </li>
          ))}
        </ul>
      </div>

      <button
        type="button"
        className={`sidebar-trash${view?.type === 'trash' ? ' is-active' : ''}`}
        onClick={() => onSelectView({ type: 'trash' })}
      >
        Trash
      </button>
    </aside>
  );
}
