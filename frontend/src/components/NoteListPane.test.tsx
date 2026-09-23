import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NoteListPane, { type NoteListItem } from './NoteListPane';

const items: NoteListItem[] = [
  { id: '1', titleHtml: 'Grocery list', snippetHtml: 'milk, eggs', updatedAt: '2026-01-01T00:00:00.000Z', isPinned: false },
  { id: '2', titleHtml: '<em>Project</em> plan', snippetHtml: 'kickoff notes', updatedAt: '2026-01-02T00:00:00.000Z', isPinned: true },
];

describe('NoteListPane', () => {
  it('shows the notebook name as the header and a "New note" button', () => {
    render(
      <NoteListPane
        view={{ type: 'notebook', id: 'nb1', name: 'Work' }}
        items={items}
        selectedId={null}
        onSelect={vi.fn()}
        onNewNote={vi.fn()}
      />
    );
    expect(screen.getByRole('heading', { name: 'Work' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'New note' })).toBeInTheDocument();
  });

  it('hides "New note" for a search view and shows the query in the header', () => {
    render(
      <NoteListPane view={{ type: 'search', q: 'milk' }} items={items} selectedId={null} onSelect={vi.fn()} onNewNote={vi.fn()} />
    );
    expect(screen.getByRole('heading', { name: 'Search: "milk"' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'New note' })).not.toBeInTheDocument();
  });

  it('renders server-provided <em> highlight markup as real markup, not escaped text', () => {
    render(
      <NoteListPane view={{ type: 'search', q: 'project' }} items={items} selectedId={null} onSelect={vi.fn()} onNewNote={vi.fn()} />
    );
    const em = document.querySelector('.note-item-title em');
    expect(em).not.toBeNull();
    expect(em?.textContent).toBe('Project');
  });

  it('calls onSelect with the clicked note id', async () => {
    const onSelect = vi.fn();
    render(<NoteListPane view={{ type: 'notebook', id: 'nb1', name: 'Work' }} items={items} selectedId={null} onSelect={onSelect} onNewNote={vi.fn()} />);
    const user = userEvent.setup();
    await user.click(screen.getByText('Grocery list'));
    expect(onSelect).toHaveBeenCalledWith('1');
  });

  it('shows the empty-state hint when there are no items', () => {
    render(<NoteListPane view={{ type: 'trash' }} items={[]} selectedId={null} onSelect={vi.fn()} onNewNote={vi.fn()} />);
    expect(screen.getByText('Nothing here yet.')).toBeInTheDocument();
  });
});
