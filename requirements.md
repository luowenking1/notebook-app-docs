# Personal Notebook App — Product Requirements Document (PRD)

Version: v1.1　　Date: 2026-09-22　　Status: Draft

## 1. Product Overview

### 1.1 Positioning
A cloud-based note/journal application for individuals, similar to a lightweight Notion. Users can create, organize, and edit notes, with cloud sync across multiple devices so they can capture and revisit their thoughts anytime, anywhere.

### 1.2 Target Users
- Individuals who need to jot down ideas, to-dos, or journal entries
- Users who need their notes synced across devices (phone/computer/tablet)
- Light personal-knowledge-management users who want basic organization (folders/tags/search)

### 1.3 Product Goals
- Provide a simple, low-learning-curve note-taking experience
- Ensure data is stored securely in the cloud with access from multiple devices
- Support basic organizational features (folders/tags/search) to keep notes from becoming cluttered

### 1.4 Non-Goals (Out of Scope for This Phase)
- Real-time multi-user collaborative editing (e.g., Google Docs–style co-editing)
- Complex knowledge graphs / bidirectional links (e.g., Roam Research)
- A local-first, offline-first architecture (this phase assumes an online-first usage model)

---

## 2. User Stories

| ID | Role | Story | Priority |
|---|---|---|---|
| US-01 | New user | As a new user, I want to sign up and log in with my email so I have my own private note space | P0 |
| US-02 | Logged-in user | As a user, I want to create a new note and enter a title and body | P0 |
| US-03 | Logged-in user | As a user, I want my notes to auto-save so I don't lose content if I forget to save | P0 |
| US-04 | Logged-in user | As a user, I want to organize notes into different folders/notebooks | P0 |
| US-05 | Logged-in user | As a user, I want to tag notes so I can find them by topic | P1 |
| US-06 | Logged-in user | As a user, I want to full-text search my notes by keyword | P0 |
| US-07 | Logged-in user | As a user, I want notes to support basic rich-text formatting (headings, bold, lists, code blocks) | P0 |
| US-08 | Logged-in user | As a user, I want to delete notes, with a trash bin so I can recover them afterward | P1 |
| US-09 | Logged-in user | As a user, I want consistent, synced note content across my phone and computer | P0 |
| US-10 | Logged-in user | As a user, I want to see a note's creation time and last-edited time | P1 |
| US-11 | Logged-in user | As a user, I want to pin important notes | P2 |
| US-12 | Logged-in user | As a user, I want to export a note as a Markdown file | P2 |
| US-13 | Logged-in user | As a user, I want to change my password / recover a forgotten password | P1 |

---

## 3. Functional Requirements

### 3.1 Account & Login (P0)
- Email + password sign-up / login
- Forgot-password flow (email verification code / reset link)
- Profile settings (nickname, avatar)
- Log out

### 3.2 Notebook / Folder Management (P0)
- Create / rename / delete notebooks (folders)
- Notebooks support nesting (one level of sub-folders; unlimited nesting is out of scope for this phase)
- Note list view within a notebook (title, excerpt, last-updated time)

### 3.3 Note Editing (P0)
- Rich-text editor: headings (H1-H3), bold/italic/strikethrough, ordered/unordered lists, blockquotes, code blocks, dividers
- Auto-save (silently saves 1-2 seconds after the user stops typing, with a save-status indicator)
- Basic note metadata: title, body, parent notebook, tags, created time, updated time

### 3.4 Tag System (P1)
- Attach multiple tags to a note
- Filter notes by tag
- Tag management (rename, delete, merge)

### 3.5 Search (P0)
- Global search: full-text match across title + body
- Highlight matched keywords in search results
- Filter search results by notebook / tag / date range (P2)

### 3.6 Trash / Recycle Bin (P1)
- Deleted notes go to the trash and are retained for 30 days
- Notes in the trash can be restored or permanently deleted
- A scheduled job automatically purges expired trash items

### 3.7 Pinning & Sorting (P2)
- Pin notes
- Note list supports sorting by updated time / created time / title

### 3.8 Export (P2)
- Export a single note as a downloadable Markdown file

### 3.9 Multi-Device Sync (P0)
- Note data is stored in the cloud; the latest data is fetched automatically after login
- Conflict handling: last write wins based on save timestamp; complex conflict merging is out of scope for this phase

---

## 4. Non-Functional Requirements

| Category | Requirement |
|---|---|
| Performance | Note list first paint < 1.5s; editor input latency imperceptible (<50ms) |
| Availability | Service uptime ≥ 99.5% |
| Security | Passwords stored with an irreversible hash; strict per-account data isolation to prevent unauthorized access |
| Compatibility | Support the latest two versions of major browsers (Chrome/Safari/Edge/Firefox); responsive layout for phone/tablet/desktop |
| Data scale | Designed for up to 10,000 notes per user; each note body under 1MB |
| Privacy compliance | Users can request export or deletion of all their personal data |

---

## 5. Scope & Roadmap

### MVP (Phase 1, P0 features)
Account sign-up/login, notebook creation, note CRUD, auto-save, basic rich-text formatting, full-text search, multi-device sync

### Phase 2 (P1 features)
Tag system, trash bin, password recovery, updated-time display

### Phase 3 (P2 features)
Pinning, Markdown export, advanced search filters

---

## 6. Acceptance Criteria (Excerpt)

- A user can create their first note within 3 steps after registering
- Auto-save triggers within 2 seconds of the user stopping edits; content is not lost after a page refresh
- After editing and saving on Device A, Device B shows the latest content after re-login/refresh
- A search keyword matches all notes whose title or body contains that word, responding in < 500ms (for datasets up to ~1,000 notes)
- A deleted note can be recovered from the trash within 30 days; after 30 days it is automatically purged

---

## 7. Open Questions
- Whether image/attachment upload should be supported
- Whether dark mode is needed
- Whether a native mobile app is needed (this phase defaults to a responsive web app)
