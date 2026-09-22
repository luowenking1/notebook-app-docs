(function () {
  'use strict';

  var API = '/api/v1';

  var state = {
    token: localStorage.getItem('nb_token') || null,
    email: localStorage.getItem('nb_email') || null,
    notebooks: [],
    tags: [],
    view: null,            // {type:'notebook', id, name} | {type:'tag', id, name} | {type:'trash'} | {type:'search', q}
    notes: [],              // raw items for the current list (shape depends on view type)
    selected: null,         // full note object currently open in the editor
    selectedTags: [],
    saveTimer: null,
    isRegisterMode: false,
  };

  // ---------------------------------------------------------------------
  // DOM references
  // ---------------------------------------------------------------------
  var el = {
    authScreen: document.getElementById('auth-screen'),
    authForm: document.getElementById('auth-form'),
    authEmail: document.getElementById('auth-email'),
    authPassword: document.getElementById('auth-password'),
    authError: document.getElementById('auth-error'),
    authSubmit: document.getElementById('auth-submit'),
    authToggleText: document.getElementById('auth-toggle-text'),
    authToggleBtn: document.getElementById('auth-toggle-btn'),

    appShell: document.getElementById('app-shell'),
    userEmail: document.getElementById('user-email'),
    logoutBtn: document.getElementById('logout-btn'),
    searchInput: document.getElementById('search-input'),

    newNotebookBtn: document.getElementById('new-notebook-btn'),
    newNotebookForm: document.getElementById('new-notebook-form'),
    newNotebookInput: document.getElementById('new-notebook-input'),
    notebookList: document.getElementById('notebook-list'),
    tagFilterList: document.getElementById('tag-filter-list'),
    trashBtn: document.getElementById('trash-btn'),

    noteListTitle: document.getElementById('note-list-title'),
    newNoteBtn: document.getElementById('new-note-btn'),
    noteList: document.getElementById('note-list'),
    noteListEmpty: document.getElementById('note-list-empty'),

    editorEmpty: document.getElementById('editor-empty'),
    editor: document.getElementById('editor'),
    saveStatus: document.getElementById('save-status'),
    pinBtn: document.getElementById('pin-btn'),
    restoreBtn: document.getElementById('restore-btn'),
    deleteBtn: document.getElementById('delete-btn'),
    permanentDeleteBtn: document.getElementById('permanent-delete-btn'),
    noteTitle: document.getElementById('note-title'),
    noteTags: document.getElementById('note-tags'),
    tagInput: document.getElementById('tag-input'),
    noteContent: document.getElementById('note-content'),
    editorMeta: document.getElementById('editor-meta'),
  };

  // ---------------------------------------------------------------------
  // Small helpers
  // ---------------------------------------------------------------------
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function formatDate(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) +
      ' ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  }

  function debounce(fn, wait) {
    var t = null;
    return function () {
      var args = arguments;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(null, args); }, wait);
    };
  }

  async function api(path, opts) {
    opts = opts || {};
    var headers = Object.assign({ 'Content-Type': 'application/json' }, opts.headers || {});
    if (state.token) headers['Authorization'] = 'Bearer ' + state.token;
    var res = await fetch(API + path, Object.assign({}, opts, { headers: headers }));
    var text = await res.text();
    var body = null;
    if (text) {
      try { body = JSON.parse(text); } catch (e) { body = text; }
    }
    if (!res.ok) {
      var msg = (body && body.message) || res.statusText || 'Request failed';
      throw new Error(msg);
    }
    return body;
  }

  // ---------------------------------------------------------------------
  // Auth
  // ---------------------------------------------------------------------
  el.authToggleBtn.addEventListener('click', function () {
    state.isRegisterMode = !state.isRegisterMode;
    el.authSubmit.textContent = state.isRegisterMode ? 'Sign up' : 'Log in';
    el.authToggleText.textContent = state.isRegisterMode ? 'Already have an account?' : "Don't have an account?";
    el.authToggleBtn.textContent = state.isRegisterMode ? 'Log in' : 'Sign up';
    el.authError.hidden = true;
  });

  el.authForm.addEventListener('submit', async function (e) {
    e.preventDefault();
    el.authError.hidden = true;
    var email = el.authEmail.value.trim();
    var password = el.authPassword.value;
    var path = state.isRegisterMode ? '/auth/register' : '/auth/login';
    try {
      var result = await api(path, { method: 'POST', body: JSON.stringify({ email: email, password: password }) });
      state.token = result.accessToken;
      state.email = result.user.email;
      localStorage.setItem('nb_token', state.token);
      localStorage.setItem('nb_email', state.email);
      await boot();
    } catch (err) {
      el.authError.textContent = err.message;
      el.authError.hidden = false;
    }
  });

  el.logoutBtn.addEventListener('click', function () {
    state.token = null;
    state.email = null;
    state.notebooks = [];
    state.tags = [];
    state.view = null;
    state.selected = null;
    localStorage.removeItem('nb_token');
    localStorage.removeItem('nb_email');
    el.appShell.hidden = true;
    el.authScreen.hidden = false;
    el.authForm.reset();
  });

  // ---------------------------------------------------------------------
  // Boot / initial load
  // ---------------------------------------------------------------------
  async function boot() {
    try {
      state.notebooks = await api('/notebooks');
    } catch (err) {
      // token invalid/expired
      state.token = null;
      localStorage.removeItem('nb_token');
      el.authScreen.hidden = false;
      el.appShell.hidden = true;
      return;
    }
    el.authScreen.hidden = true;
    el.appShell.hidden = false;
    el.userEmail.textContent = state.email || '';

    renderNotebookList();
    state.tags = await api('/tags');
    renderTagFilterList();

    if (state.notebooks.length > 0) {
      selectView({ type: 'notebook', id: state.notebooks[0].id, name: state.notebooks[0].name });
    } else {
      updateNoteListHeader();
      renderNoteListItems([]);
    }
  }

  // ---------------------------------------------------------------------
  // Notebooks
  // ---------------------------------------------------------------------
  el.newNotebookBtn.addEventListener('click', function () {
    el.newNotebookForm.hidden = !el.newNotebookForm.hidden;
    if (!el.newNotebookForm.hidden) el.newNotebookInput.focus();
  });

  el.newNotebookInput.addEventListener('keydown', async function (e) {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    var name = el.newNotebookInput.value.trim();
    if (!name) return;
    var nb = await api('/notebooks', { method: 'POST', body: JSON.stringify({ name: name }) });
    el.newNotebookInput.value = '';
    el.newNotebookForm.hidden = true;
    state.notebooks = await api('/notebooks');
    renderNotebookList();
    selectView({ type: 'notebook', id: nb.id, name: nb.name });
  });

  function renderNotebookList() {
    el.notebookList.innerHTML = '';
    state.notebooks.forEach(function (nb) {
      var li = document.createElement('li');
      li.textContent = nb.name;
      if (state.view && state.view.type === 'notebook' && state.view.id === nb.id) li.classList.add('is-active');
      li.addEventListener('click', function () {
        selectView({ type: 'notebook', id: nb.id, name: nb.name });
      });
      el.notebookList.appendChild(li);
    });
  }

  function renderTagFilterList() {
    el.tagFilterList.innerHTML = '';
    state.tags.forEach(function (tag) {
      var li = document.createElement('li');
      li.textContent = '#' + tag.name;
      if (state.view && state.view.type === 'tag' && state.view.id === tag.id) li.classList.add('is-active');
      li.addEventListener('click', function () {
        selectView({ type: 'tag', id: tag.id, name: tag.name });
      });
      el.tagFilterList.appendChild(li);
    });
  }

  el.trashBtn.addEventListener('click', function () {
    selectView({ type: 'trash' });
  });

  // ---------------------------------------------------------------------
  // Search
  // ---------------------------------------------------------------------
  var lastNonSearchView = null;

  el.searchInput.addEventListener('input', debounce(function () {
    var q = el.searchInput.value.trim();
    if (q) {
      selectView({ type: 'search', q: q });
    } else if (state.view && state.view.type === 'search') {
      selectView(lastNonSearchView || (state.notebooks[0] && { type: 'notebook', id: state.notebooks[0].id, name: state.notebooks[0].name }));
    }
  }, 350));

  // ---------------------------------------------------------------------
  // View switching + note list
  // ---------------------------------------------------------------------
  function selectView(view) {
    if (!view) return;
    if (view.type !== 'search') lastNonSearchView = view;
    state.view = view;
    closeEditor();
    renderNotebookList();
    renderTagFilterList();
    el.trashBtn.classList.toggle('is-active', view.type === 'trash');
    updateNoteListHeader();
    loadNoteList();
  }

  function updateNoteListHeader() {
    var view = state.view;
    if (!view) {
      el.noteListTitle.textContent = 'Select a notebook';
      el.newNoteBtn.hidden = true;
      return;
    }
    if (view.type === 'notebook') { el.noteListTitle.textContent = view.name; el.newNoteBtn.hidden = false; }
    else if (view.type === 'tag') { el.noteListTitle.textContent = '#' + view.name; el.newNoteBtn.hidden = true; }
    else if (view.type === 'trash') { el.noteListTitle.textContent = 'Trash'; el.newNoteBtn.hidden = true; }
    else if (view.type === 'search') { el.noteListTitle.textContent = 'Search: "' + view.q + '"'; el.newNoteBtn.hidden = true; }
  }

  async function loadNoteList() {
    var view = state.view;
    if (!view) { renderNoteListItems([]); return; }

    if (view.type === 'search') {
      var result = await api('/search?q=' + encodeURIComponent(view.q));
      var items = result.results.map(function (r) {
        return { id: r.noteId, titleHtml: r.title, snippetHtml: r.snippet, updatedAt: r.updatedAt, isPinned: false, isDeleted: false };
      });
      renderNoteListItems(items, true);
      return;
    }

    var query = '';
    if (view.type === 'notebook') query = '?notebookId=' + encodeURIComponent(view.id);
    else if (view.type === 'tag') query = '?tagId=' + encodeURIComponent(view.id);
    else if (view.type === 'trash') query = '?includeDeleted=true';

    var notes = await api('/notes' + query);
    var items = notes.map(function (n) {
      var snippet = (n.content || '').replace(/\s+/g, ' ').trim();
      if (snippet.length > 90) snippet = snippet.slice(0, 90) + '...';
      return {
        id: n.id,
        titleHtml: escapeHtml(n.title || 'Untitled'),
        snippetHtml: escapeHtml(snippet),
        updatedAt: n.updatedAt,
        isPinned: n.isPinned,
        isDeleted: n.isDeleted,
      };
    });
    renderNoteListItems(items, false);
  }

  function renderNoteListItems(items, isTrashOrSearch) {
    state.notes = items;
    el.noteList.innerHTML = '';
    el.noteListEmpty.hidden = items.length > 0;
    items.forEach(function (item) {
      var li = document.createElement('li');
      if (state.selected && state.selected.id === item.id) li.classList.add('is-active');

      var titleP = document.createElement('p');
      titleP.className = 'note-item-title';
      if (item.isPinned) {
        var dot = document.createElement('span');
        dot.className = 'pin-dot';
        titleP.appendChild(dot);
      }
      var titleSpan = document.createElement('span');
      titleSpan.innerHTML = item.titleHtml || 'Untitled';
      titleP.appendChild(titleSpan);
      li.appendChild(titleP);

      if (item.snippetHtml) {
        var snippetP = document.createElement('p');
        snippetP.className = 'note-item-snippet';
        snippetP.innerHTML = item.snippetHtml;
        li.appendChild(snippetP);
      }

      var metaP = document.createElement('p');
      metaP.className = 'note-item-meta';
      metaP.textContent = formatDate(item.updatedAt);
      li.appendChild(metaP);

      li.addEventListener('click', function () { selectNote(item.id); });
      el.noteList.appendChild(li);
    });
  }

  async function refreshNoteListKeepingSelection() {
    var selectedId = state.selected && state.selected.id;
    await loadNoteList();
    if (selectedId) {
      var items = Array.prototype.slice.call(el.noteList.children);
      state.notes.forEach(function (item, i) {
        if (item.id === selectedId) items[i].classList.add('is-active');
      });
    }
  }

  // ---------------------------------------------------------------------
  // Editor
  // ---------------------------------------------------------------------
  el.newNoteBtn.addEventListener('click', async function () {
    if (!state.view || state.view.type !== 'notebook') return;
    var note = await api('/notes', {
      method: 'POST',
      body: JSON.stringify({ title: 'Untitled', content: '', notebookId: state.view.id }),
    });
    await loadNoteList();
    selectNote(note.id);
  });

  async function selectNote(id) {
    var note = await api('/notes/' + id);
    var tags = await api('/notes/' + id + '/tags');
    state.selected = note;
    state.selectedTags = tags;
    renderEditor();
    highlightSelectedInList();
  }

  function highlightSelectedInList() {
    var children = Array.prototype.slice.call(el.noteList.children);
    children.forEach(function (li, i) {
      var item = state.notes[i];
      li.classList.toggle('is-active', !!(item && state.selected && item.id === state.selected.id));
    });
  }

  function closeEditor() {
    state.selected = null;
    state.selectedTags = [];
    el.editor.hidden = true;
    el.editorEmpty.hidden = false;
  }

  function renderEditor() {
    var note = state.selected;
    el.editorEmpty.hidden = true;
    el.editor.hidden = false;

    el.noteTitle.value = note.title;
    el.noteContent.value = note.content;
    el.saveStatus.textContent = '';

    var isTrashed = note.isDeleted;
    el.noteTitle.readOnly = isTrashed;
    el.noteContent.readOnly = isTrashed;
    el.tagInput.style.display = isTrashed ? 'none' : '';

    el.pinBtn.hidden = isTrashed;
    el.pinBtn.classList.toggle('is-pinned', !!note.isPinned);
    el.pinBtn.textContent = note.isPinned ? '★' : '☆';

    el.deleteBtn.hidden = isTrashed;
    el.restoreBtn.hidden = !isTrashed;
    el.permanentDeleteBtn.hidden = !isTrashed;

    renderTagChips();

    el.editorMeta.textContent = 'Created ' + formatDate(note.createdAt) + ' · Updated ' + formatDate(note.updatedAt) +
      (isTrashed ? ' · In trash' : '');
  }

  function renderTagChips() {
    el.noteTags.innerHTML = '';
    state.selectedTags.forEach(function (tag) {
      var li = document.createElement('li');
      var span = document.createElement('span');
      span.textContent = tag.name;
      li.appendChild(span);
      if (!state.selected.isDeleted) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = '\u00d7';
        btn.title = 'Remove tag';
        btn.addEventListener('click', function () { removeTag(tag.id); });
        li.appendChild(btn);
      }
      el.noteTags.appendChild(li);
    });
  }

  // --- Autosave ---
  var scheduleSave = debounce(doSave, 1200);

  el.noteTitle.addEventListener('input', function () {
    if (!state.selected || state.selected.isDeleted) return;
    el.saveStatus.textContent = 'Saving...';
    scheduleSave();
  });
  el.noteContent.addEventListener('input', function () {
    if (!state.selected || state.selected.isDeleted) return;
    el.saveStatus.textContent = 'Saving...';
    scheduleSave();
  });

  async function doSave() {
    if (!state.selected) return;
    var id = state.selected.id;
    var title = el.noteTitle.value.trim() || 'Untitled';
    var content = el.noteContent.value;
    try {
      var updated = await api('/notes/' + id, { method: 'PATCH', body: JSON.stringify({ title: title, content: content }) });
      state.selected = updated;
      el.saveStatus.textContent = 'Saved';
      el.editorMeta.textContent = 'Created ' + formatDate(updated.createdAt) + ' · Updated ' + formatDate(updated.updatedAt);
      refreshNoteListKeepingSelection();
    } catch (err) {
      el.saveStatus.textContent = 'Could not save: ' + err.message;
    }
  }

  // --- Pin ---
  el.pinBtn.addEventListener('click', async function () {
    if (!state.selected) return;
    var updated = await api('/notes/' + state.selected.id + '/pin', {
      method: 'PATCH',
      body: JSON.stringify({ pinned: !state.selected.isPinned }),
    });
    state.selected = updated;
    el.pinBtn.classList.toggle('is-pinned', !!updated.isPinned);
    el.pinBtn.textContent = updated.isPinned ? '★' : '☆';
    refreshNoteListKeepingSelection();
  });

  // --- Delete / restore / permanent delete ---
  el.deleteBtn.addEventListener('click', async function () {
    if (!state.selected) return;
    if (!confirm('Move this note to Trash?')) return;
    await api('/notes/' + state.selected.id, { method: 'DELETE' });
    closeEditor();
    loadNoteList();
  });

  el.restoreBtn.addEventListener('click', async function () {
    if (!state.selected) return;
    await api('/notes/' + state.selected.id + '/restore', { method: 'POST' });
    closeEditor();
    loadNoteList();
  });

  el.permanentDeleteBtn.addEventListener('click', async function () {
    if (!state.selected) return;
    if (!confirm('Delete this note forever? This cannot be undone.')) return;
    await api('/notes/' + state.selected.id + '/permanent', { method: 'DELETE' });
    closeEditor();
    loadNoteList();
  });

  // --- Tags ---
  el.tagInput.addEventListener('keydown', async function (e) {
    if (e.key !== 'Enter' || !state.selected) return;
    e.preventDefault();
    var name = el.tagInput.value.trim();
    if (!name) return;

    var existing = state.tags.find(function (t) { return t.name.toLowerCase() === name.toLowerCase(); });
    var tagId;
    if (existing) {
      tagId = existing.id;
    } else {
      var created = await api('/tags', { method: 'POST', body: JSON.stringify({ name: name }) });
      tagId = created.id;
      state.tags = await api('/tags');
      renderTagFilterList();
    }

    var currentIds = state.selectedTags.map(function (t) { return t.id; });
    if (currentIds.indexOf(tagId) === -1) currentIds.push(tagId);

    var updatedTags = await api('/notes/' + state.selected.id + '/tags', {
      method: 'PUT',
      body: JSON.stringify({ tagIds: currentIds }),
    });
    state.selectedTags = updatedTags;
    renderTagChips();
    el.tagInput.value = '';
  });

  async function removeTag(tagId) {
    var currentIds = state.selectedTags.map(function (t) { return t.id; }).filter(function (id) { return id !== tagId; });
    var updatedTags = await api('/notes/' + state.selected.id + '/tags', {
      method: 'PUT',
      body: JSON.stringify({ tagIds: currentIds }),
    });
    state.selectedTags = updatedTags;
    renderTagChips();
  }

  // ---------------------------------------------------------------------
  // Startup
  // ---------------------------------------------------------------------
  if (state.token) {
    boot();
  } else {
    el.authScreen.hidden = false;
    el.appShell.hidden = true;
  }
})();
