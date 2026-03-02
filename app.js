const STORAGE_KEY = 'orbit.v1';

const state = loadState();
const ui = {
  nodeList: document.getElementById('node-list'),
  addCompany: document.getElementById('add-company'),
  projectSelect: document.getElementById('project-select'),
  addProject: document.getElementById('add-project'),
  taskFilter: document.getElementById('task-filter'),
  gridView: document.getElementById('grid-view'),
  canvasView: document.getElementById('canvas-view'),
  toggleView: document.getElementById('toggle-view'),
  quickAdd: document.getElementById('quick-add'),
  dialog: document.getElementById('editor-dialog'),
  editor: document.getElementById('editor-title'),
  shareEmail: document.getElementById('share-email'),
  shareAdd: document.getElementById('share-add'),
  shareList: document.getElementById('share-list'),
  tpl: document.getElementById('task-row-template')
};

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  const personalId = crypto.randomUUID();
  return {
    view: 'grid',
    activeNodeId: personalId,
    activeProjectId: 'all',
    nodes: [{ id: personalId, name: 'Personal', type: 'personal', members: [] }],
    projects: [],
    tasks: []
  };
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

const activeNode = () => state.nodes.find(n => n.id === state.activeNodeId);

function render() {
  renderNodes();
  renderProjects();
  renderSharing();
  renderTasks();
  renderCanvas();
  ui.toggleView.textContent = state.view === 'grid' ? 'Canvas View' : 'Grid View';
  ui.gridView.classList.toggle('hidden', state.view !== 'grid');
  ui.canvasView.classList.toggle('hidden', state.view !== 'canvas');
  saveState();
}

function renderNodes() {
  ui.nodeList.innerHTML = '';
  for (const node of state.nodes) {
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.textContent = node.name;
    btn.className = node.id === state.activeNodeId ? 'active' : '';
    btn.onclick = () => { state.activeNodeId = node.id; state.activeProjectId = 'all'; render(); };
    li.append(btn);
    ui.nodeList.append(li);
  }
}

function renderProjects() {
  const node = activeNode();
  const projects = state.projects.filter(p => p.nodeId === node.id && !p.archived);
  ui.projectSelect.innerHTML = '<option value="all">All tasks</option>';
  for (const p of projects) {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = p.name;
    if (p.id === state.activeProjectId) opt.selected = true;
    ui.projectSelect.append(opt);
  }
}

function taskMatchesContext(task) {
  if (task.nodeId !== state.activeNodeId) return false;
  if (state.activeProjectId !== 'all' && task.projectId !== state.activeProjectId) return false;
  const q = ui.taskFilter.value.trim().toLowerCase();
  return !q || task.text.toLowerCase().includes(q);
}

function renderTasks() {
  ui.gridView.innerHTML = '';
  const tasks = state.tasks.filter(taskMatchesContext);
  const byParent = new Map();
  tasks.forEach(t => {
    const key = t.parentId || 'root';
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key).push(t);
  });

  const walk = (parentId, depth) => {
    for (const task of byParent.get(parentId || 'root') || []) {
      const row = ui.tpl.content.firstElementChild.cloneNode(true);
      row.dataset.id = task.id;
      row.style.marginLeft = `${depth * 20}px`;
      row.classList.toggle('done', !!task.done);
      row.querySelector('.task-title').innerHTML = renderMarkdown(task.text);
      row.querySelector('.task-done').checked = !!task.done;
      row.querySelector('.task-date').value = task.dueDate || '';
      row.querySelector('.task-mode').value = task.mode || '';
      const hasChildren = (byParent.get(task.id) || []).length > 0;
      const expandBtn = row.querySelector('.task-expand');
      expandBtn.style.visibility = hasChildren ? 'visible' : 'hidden';
      expandBtn.textContent = task.collapsed ? '▸' : '▾';

      row.querySelector('.task-done').onchange = e => { task.done = e.target.checked; render(); };
      row.querySelector('.task-date').onchange = e => { task.dueDate = e.target.value; saveState(); renderCanvas(); };
      row.querySelector('.task-mode').onchange = e => { task.mode = e.target.value; saveState(); renderCanvas(); };
      row.querySelector('.task-delete').onclick = () => { state.tasks = state.tasks.filter(t => t.id !== task.id && t.parentId !== task.id); render(); };
      row.querySelector('.task-edit').onclick = () => openEditor(task);
      row.querySelector('.task-subtask').onclick = () => addTask(task.id);
      row.querySelector('.task-expand').onclick = () => { task.collapsed = !task.collapsed; render(); };

      ui.gridView.append(row);
      if (!task.collapsed) walk(task.id, depth + 1);
    }
  };
  walk(null, 0);
}

function renderCanvas() {
  const node = activeNode();
  const projects = state.projects.filter(p => p.nodeId === node.id && !p.archived);
  const nodeLevelTasks = state.tasks.filter(t => t.nodeId === node.id && !t.projectId && !t.parentId);
  ui.canvasView.innerHTML = '';
  const grid = document.createElement('div');
  grid.className = 'canvas-grid';

  const companyCard = document.createElement('article');
  companyCard.className = 'canvas-card canvas-company-card';

  const nodeTasksList = nodeLevelTasks
    .map(t => `<li>${renderMarkdownInline(t.text)}${t.dueDate ? ` <small>(${t.dueDate})</small>` : ''}</li>`)
    .join('');

  const projectSections = projects.map((project) => {
    const projectTasks = state.tasks
      .filter(t => t.nodeId === node.id && t.projectId === project.id && !t.parentId)
      .map(t => `<li>${renderMarkdownInline(t.text)}${t.dueDate ? ` <small>(${t.dueDate})</small>` : ''}</li>`)
      .join('');

    return `
      <section class="project-container">
        <h5>${project.name}</h5>
        <ul>${projectTasks || '<li>No tasks yet</li>'}</ul>
      </section>
    `;
  }).join('');

  companyCard.innerHTML = `
    <h4>${node.name}</h4>
    <section class="company-tasks">
      <h5>Company tasks</h5>
      <ul>${nodeTasksList || '<li>No company-level tasks yet</li>'}</ul>
    </section>
    <section class="project-list">
      <h5>Projects</h5>
      ${projectSections || '<p class="empty-projects">No projects yet.</p>'}
    </section>
  `;

  grid.append(companyCard);
  ui.canvasView.innerHTML = '';
  const grid = document.createElement('div');
  grid.className = 'canvas-grid';
  for (const p of projects) {
    const card = document.createElement('article');
    card.className = 'canvas-card';
    const list = state.tasks.filter(t => t.nodeId === node.id && t.projectId === p.id && !t.parentId).slice(0, 7)
      .map(t => `<li>${renderMarkdownInline(t.text)}${t.dueDate ? ` <small>(${t.dueDate})</small>` : ''}</li>`)
      .join('');
    card.innerHTML = `<h4>${p.name}</h4><ul>${list || '<li>No tasks yet</li>'}</ul>`;
    grid.append(card);
  }
  if (!projects.length) {
    const card = document.createElement('article');
    card.className = 'canvas-card';
    card.innerHTML = '<h4>No projects</h4><p>Create a project to get started.</p>';
    grid.append(card);
  }
  ui.canvasView.append(grid);
}

function renderSharing() {
  const node = activeNode();
  ui.shareList.innerHTML = '';
  if (node.type === 'personal') {
    ui.shareList.innerHTML = '<li>Personal workspace is private.</li>';
    return;
  }
  for (const email of node.members || []) {
    const li = document.createElement('li');
    li.innerHTML = `<span>${email}</span>`;
    const remove = document.createElement('button');
    remove.textContent = 'Revoke';
    remove.onclick = () => {
      node.members = node.members.filter(m => m !== email);
      render();
    };
    li.append(remove);
    ui.shareList.append(li);
  }
}

function openEditor(task) {
  ui.editor.value = task.text;
  ui.dialog.showModal();
  ui.dialog.onclose = () => {
    if (ui.dialog.returnValue === 'default' && ui.editor.value.trim()) {
      task.text = ui.editor.value.trim();
      render();
    }
  };
}

function addTask(parentId = null) {
  const text = prompt('Task title (markdown supported)');
  if (!text?.trim()) return;
  state.tasks.push({
    id: crypto.randomUUID(),
    nodeId: state.activeNodeId,
    projectId: state.activeProjectId === 'all' ? null : state.activeProjectId,
    parentId,
    text: text.trim(),
    dueDate: '',
    mode: '',
    done: false,
    collapsed: false
  });
  render();
}

function renderMarkdownInline(s) {
  return s.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\*(.*?)\*/g, '<em>$1</em>');
}

function renderMarkdown(s) {
  return renderMarkdownInline(s)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank">$1</a>');
}

ui.addCompany.onclick = () => {
  const name = prompt('Company name');
  if (!name?.trim()) return;
  if (state.nodes.some(n => n.name.toLowerCase() === name.trim().toLowerCase())) {
    alert('Duplicate node name');
    return;
  }
  state.nodes.push({ id: crypto.randomUUID(), name: name.trim(), type: 'company', members: [] });
  render();
};
ui.addProject.onclick = () => {
  const name = prompt('Project name');
  if (!name?.trim()) return;
  const exists = state.projects.some(p => p.nodeId === state.activeNodeId && p.name.toLowerCase() === name.trim().toLowerCase() && !p.archived);
  if (exists) {
    alert('Duplicate project name in this context');
    return;
  }
  state.projects.push({ id: crypto.randomUUID(), nodeId: state.activeNodeId, name: name.trim(), archived: false });
  render();
};
ui.projectSelect.onchange = e => { state.activeProjectId = e.target.value; render(); };
ui.taskFilter.oninput = renderTasks;
ui.toggleView.onclick = () => { state.view = state.view === 'grid' ? 'canvas' : 'grid'; render(); };
ui.quickAdd.onclick = () => addTask();
ui.shareAdd.onclick = () => {
  const email = ui.shareEmail.value.trim().toLowerCase();
  if (!email) return;
  const node = activeNode();
  if (node.type === 'personal') return;
  if (!node.members.includes(email)) node.members.push(email);
  ui.shareEmail.value = '';
  render();
};

document.addEventListener('keydown', (e) => {
  const cmd = e.metaKey || e.ctrlKey;
  if (cmd && e.key.toLowerCase() === 'n') { e.preventDefault(); addTask(); }
  if (cmd && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    const options = state.nodes.map((n, i) => `${i + 1}. ${n.name}`).join('\n');
    const pick = Number(prompt(`Switch context:\n${options}`));
    if (pick > 0 && pick <= state.nodes.length) {
      state.activeNodeId = state.nodes[pick - 1].id;
      state.activeProjectId = 'all';
      render();
    }
  }
  if (e.key.toLowerCase() === 'v') { e.preventDefault(); state.view = state.view === 'grid' ? 'canvas' : 'grid'; render(); }
});

render();
