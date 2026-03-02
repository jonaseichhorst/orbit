# Orbit MVP

A lightweight browser-based multi-company task manager focused on fast solo execution.

## Features implemented

- Company and Personal top-level contexts.
- Projects under each context.
- Tasks + nested subtasks with markdown titles.
- Due date + operating mode (`lead`, `support`, `stay out of way`).
- Grid and canvas views with instant toggle (`V`).
- Keyboard shortcuts:
  - `Ctrl/Cmd+N`: quick add task
  - `Ctrl/Cmd+K`: quick switch context
  - `V`: toggle view
- Company-level sharing list (grant/revoke emails) and private personal node.
- LocalStorage persistence for offline-first usage.

## Run

```bash
python3 -m http.server 4173
```

Open <http://localhost:4173>.
