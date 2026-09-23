import { useEffect, useMemo, useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react';
import type { Attachment, Note, Tag } from '../types';
import { debounce, formatDate } from '../utils';

interface Props {
  note: Note;
  tags: Tag[];
  allTags: Tag[];
  attachments: Attachment[];
  saveStatus: string;
  onSave: (id: string, input: { title: string; content: string }) => void;
  onTogglePin: () => void;
  onDelete: () => void;
  onRestore: () => void;
  onPermanentDelete: () => void;
  onAddTag: (name: string) => void;
  onRemoveTag: (tagId: string) => void;
  onUploadAttachment: (file: File) => void;
  onDeleteAttachment: (id: string) => void;
  attachmentError: string | null;
}

export default function Editor({
  note,
  tags,
  attachments,
  saveStatus,
  onSave,
  onTogglePin,
  onDelete,
  onRestore,
  onPermanentDelete,
  onAddTag,
  onRemoveTag,
  onUploadAttachment,
  onDeleteAttachment,
  attachmentError,
}: Props) {
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [tagInput, setTagInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset local editing state whenever a different note is selected.
  useEffect(() => {
    setTitle(note.title);
    setContent(note.content);
    setTagInput('');
  }, [note.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const debouncedSave = useMemo(
    () => debounce((id: string, t: string, c: string) => onSave(id, { title: t || 'Untitled', content: c }), 1200),
    [onSave]
  );

  function handleTitleChange(e: ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    setTitle(value);
    if (!note.isDeleted) debouncedSave(note.id, value, content);
  }

  function handleContentChange(e: ChangeEvent<HTMLTextAreaElement>) {
    const value = e.target.value;
    setContent(value);
    if (!note.isDeleted) debouncedSave(note.id, title, value);
  }

  function handleTagKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const name = tagInput.trim();
    if (!name) return;
    onAddTag(name);
    setTagInput('');
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) onUploadAttachment(file);
    e.target.value = '';
  }

  const isTrashed = note.isDeleted;

  return (
    <div className="editor">
      <div className="editor-toolbar">
        <span className="save-status">{saveStatus}</span>
        <div className="editor-actions">
          {!isTrashed && (
            <button
              type="button"
              className={`icon-btn${note.isPinned ? ' is-pinned' : ''}`}
              title="Pin note"
              onClick={onTogglePin}
            >
              {note.isPinned ? '\u2605' : '\u2606'}
            </button>
          )}
          {isTrashed && (
            <button type="button" className="btn btn-small" onClick={onRestore}>
              Restore
            </button>
          )}
          {!isTrashed && (
            <button type="button" className="btn btn-small btn-danger" onClick={onDelete}>
              Delete
            </button>
          )}
          {isTrashed && (
            <button type="button" className="btn btn-small btn-danger" onClick={onPermanentDelete}>
              Delete forever
            </button>
          )}
        </div>
      </div>

      <input
        className="note-title-input"
        placeholder="Untitled"
        value={title}
        onChange={handleTitleChange}
        readOnly={isTrashed}
      />

      <div className="tag-row">
        <ul className="tag-chips">
          {tags.map((tag) => (
            <li key={tag.id}>
              <span>{tag.name}</span>
              {!isTrashed && (
                <button type="button" title="Remove tag" onClick={() => onRemoveTag(tag.id)}>
                  &times;
                </button>
              )}
            </li>
          ))}
        </ul>
        {!isTrashed && (
          <input
            className="tag-input"
            placeholder="add a tag, press enter"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleTagKeyDown}
          />
        )}
      </div>

      <textarea
        className="note-content"
        placeholder="Start writing..."
        value={content}
        onChange={handleContentChange}
        readOnly={isTrashed}
      />

      {!isTrashed && (
        <div className="attachments-section">
          <div className="attachments-heading">
            <span>Attachments</span>
          </div>
          <div className="attachments-grid">
            {attachments.map((att) => (
              <div key={att.id} className="attachment-thumb">
                <img src={att.url} alt={att.originalName} />
                <button type="button" title="Remove attachment" onClick={() => onDeleteAttachment(att.id)}>
                  &times;
                </button>
              </div>
            ))}
            <label className="attachment-upload-label" title="Upload an image">
              +
              <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/gif,image/webp" hidden onChange={handleFileChange} />
            </label>
          </div>
          {attachmentError ? <p className="attachment-error">{attachmentError}</p> : null}
        </div>
      )}

      <p className="editor-meta">
        Created {formatDate(note.createdAt)} &middot; Updated {formatDate(note.updatedAt)}
        {isTrashed ? ' \u00b7 In trash' : ''}
      </p>
    </div>
  );
}
