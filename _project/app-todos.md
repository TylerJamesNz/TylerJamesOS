# Todos App

## Goal

Replace Todoist with a task management system built exactly the way Tyler wants it. The killer feature: creating tasks by speaking, not typing. Claude processes the voice input and creates a properly structured task — no manual form-filling.

---

## Voice-to-task

### The concept
Tyler speaks naturally. Something like:

> "Remind me to call the accountant before Friday, it's high priority"
> "Add a task to finish the brand kit design this week"
> "I need to review the ANZ import code — put it in the Coding project"

Claude interprets the intent and creates a structured task with the right title, priority, due date, and project — without Tyler having to fill in any fields.

### Technical approach

**Step 1: Capture audio**
- Browser Web Speech API (free, built into Chrome/Safari) for V1
- Or: record audio → send to Whisper API (OpenAI) for transcription
- Web Speech API recommendation for V1 — no cost, no extra API, decent accuracy

**Step 2: Send transcript to Claude**
- Prompt Claude with the raw transcript
- Ask it to extract: title, description (if any), priority, due date, project
- Return structured JSON

```ts
// Example Claude output
{
  "title": "Call the accountant",
  "priority": "HIGH",
  "due_date": "2024-01-19",  // resolved from "before Friday"
  "project": null,
  "description": null,
  "confidence": "high"
}
```

**Step 3: Create task with preview**
- Show Tyler a preview card of the interpreted task
- Allow quick edits before confirming
- One tap/click to confirm → task created

### Fallback
If voice is unavailable or Tyler wants to type, a standard task creation form is available. Voice is enhancement, not requirement.

---

## Task management features

### Core features (V1)
- Create, edit, complete, delete tasks
- Title, description, priority, due date, project
- Inbox view (no project assigned)
- Project views
- Complete/uncomplete tasks
- Basic sorting: by due date, priority, created date

### Views
```
/todos
├── Inbox           — tasks with no project, due soon, or overdue
├── Today           — tasks due today
├── Upcoming        — next 7 days
└── [Project name]  — per-project view
```

### What Todoist has that we're NOT rebuilding (V1)
- Recurring tasks — skip for V1, add later
- Subtasks — skip for V1
- Comments / file attachments — skip for V1
- Collaboration / sharing — not needed, this is personal
- Labels/tags — maybe V2

---

## UI overview

The interface should feel lighter than Todoist. Less chrome, more focus on the task list itself.

**Key UI elements:**
- Large, tap-friendly task rows
- Swipe-to-complete (if mobile layout is considered)
- Priority shown as a subtle colour indicator, not a noisy badge
- Due dates shown in relative format: "Today", "Tomorrow", "Fri", not "Jan 19 2024"
- The voice capture button is prominent — it's the primary way to add tasks

**Voice button:**
- Always visible in the todos section
- Single tap to start listening
- Visual feedback while recording (animated ring or waveform)
- Auto-stops after silence or manual stop
- Shows interpreted task immediately for confirmation

---

## Speech-to-text options

| Option | Cost | Accuracy | Setup |
|---|---|---|---|
| Web Speech API | Free | Good (Chrome/Edge) | Zero — browser built-in |
| OpenAI Whisper API | ~$0.006/min | Excellent | API key needed |
| Whisper self-hosted | Free | Excellent | Server setup required |

**V1 recommendation:** Web Speech API. It's free, instant, and requires no backend changes. Upgrade to Whisper if accuracy is a problem.

---

## Claude prompt design (voice interpretation)

The quality of task creation depends heavily on the system prompt given to Claude. Key elements:

- Today's date must be included (so "Friday" resolves correctly)
- List of existing projects (so "put it in Coding" matches the right project)
- Instruction to extract structured fields, not just clean up the transcript
- Instruction to set confidence level so low-confidence results get a review flag

Full prompt design to be iterated on during implementation.

---

## Offline support (PWA)

Todos is the primary section that needs to work offline — this is a core requirement, not a nice-to-have. If Tyler is on the go without signal, he still needs to view and create tasks.

### What works offline
- View all tasks (loaded from local cache)
- Create new tasks (queued locally, synced when online)
- Complete / uncomplete tasks (queued locally, synced when online)
- Voice-to-task: **capture and transcript** work offline (Web Speech API runs on-device); **Claude interpretation** requires a network call — see fallback below

### What requires a connection
- Claude interpreting the voice transcript into a structured task
- Syncing changes back to the server
- Loading tasks for the first time (cache must be primed while online)

### Voice-to-task offline fallback
If voice is triggered while offline, Claude can't interpret the transcript. Two options:

**Option A (recommended for V1):** Save the raw transcript as the task title, flag it as "needs review", and re-process with Claude when online.
```
[offline] → transcript saved as title: "call accountant before friday high priority"
[online]  → Claude cleans it up → title: "Call accountant", due: Friday, priority: HIGH
```

**Option B:** Block voice capture when offline, show a "No connection — type your task instead" message. Simpler but worse UX.

### Sync behaviour
Tasks are stored in IndexedDB on the device using **Dexie.js**. Mutations made offline are added to a sync queue. When connectivity returns:
1. The sync queue is drained in order (oldest first)
2. Each queued item is sent to the API
3. The local cache is refreshed from the server response
4. Any sync failures are surfaced as a non-blocking toast notification

**Conflict rule (V1):** Server wins. If the server has a newer version of a task than the local offline edit, the server version is kept. This is acceptable for a single-user system.

### Offline UI signals
- A subtle "Offline" indicator in the nav/header when no connection
- Task rows created offline show a small sync-pending badge until confirmed
- "Last synced: 3 minutes ago" shown somewhere accessible in the todos section

---

## Open questions

- [ ] Web Speech API vs Whisper — decide during implementation based on accuracy testing
- [ ] Confirm Web Speech API works correctly in Safari iOS PWA standalone mode (test early)
- [ ] Recurring tasks — when does this become a priority?
- [ ] How should overdue tasks be handled — auto-reschedule or just flag?
- [ ] Keyboard shortcut to open voice capture (e.g., `V` or `Space` when not in a text field)?
- [ ] Offline voice fallback: save raw transcript (Option A) or block capture (Option B)?
