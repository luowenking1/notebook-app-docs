import type { NoteListView } from '../types';
import { formatDate } from '../utils';

export interface NoteListItem {
  id: string;
  titleHtml: string;
  snippetHtml?: string;
  updatedAt: string;
  isPinned: boolean;
}

interface Props {
  view: NoteListView | null;
  items: NoteListItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onNewNote: () => void;
}

function headerTitle(view: NoteListView | null): string {
  if (!view) return 'Select a notebook';
  if (view.type === 'notebook') return view.name;
  if (view.type === 'tag') return `#${view.name}`;
  if (view.type === 'trash') return 'Trash';
  return `Search: "${view.q}"`;
}

export default function NoteListPane({ view, items, selectedId, onSelect, onNewNote }: Props) {
  return (
    <section className="note-list-pane">
      <div className="pane-header">
        <h2>{headerTitle(view)}</h2>
        {view?.type === 'notebook' && (
          <button type="button" className="btn btn-small" onClick={onNewNote}>
            New note
          </button>
        )}
      </div>
      <ul className="note-list">
        {items.map((item) => (
          <li key={item.id} className={item.id === selectedId ? 'is-active' : ''} onClick={() => onSelect(item.id)}>
            <p className="note-item-title">
              {item.isPinned && <span className="pin-dot" />}
              <span dangerouslySetInnerHTML={{ __html: item.titleHtml }} />
            </p>
            {item.snippetHtml ? <p className="note-item-snippet" dangerouslySetInnerHTML={{ __html: item.snippetHtml }} /> : null}
            <p className="note-item-meta">{formatDate(item.updatedAt)}</p>
          </li>
        ))}
      </ul>
      {items.length === 0 && <p className="empty-hint">Nothing here yet.</p>}
    </section>
  );
}
