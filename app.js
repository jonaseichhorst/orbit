import { encodingForModel } from 'https://esm.sh/js-tiktoken@1.0.21/lite';
import { load } from 'https://esm.sh/js-tiktoken@1.0.21/ranks/cl100k_base';
import * as XLSX from 'https://cdn.sheetjs.com/xlsx-0.20.3/package/xlsx.mjs';

const ui = {
  input: document.getElementById('file-input'),
  model: document.getElementById('model-select'),
  countBtn: document.getElementById('count-btn'),
  status: document.getElementById('status'),
  result: document.getElementById('result'),
  name: document.getElementById('result-name'),
  type: document.getElementById('result-type'),
  chars: document.getElementById('result-chars'),
  tokens: document.getElementById('result-tokens')
};

let encoder;

async function ensureEncoder(modelName) {
  if (!encoder) {
    const ranks = await load();
    encoder = encodingForModel(modelName, ranks);
  }
}

function getType(file) {
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  if (ext === 'xlsx') return 'xlsx';
  if (['md', 'markdown'].includes(ext)) return 'markdown';
  if (['html', 'htm'].includes(ext)) return 'html';
  return 'text';
}

async function fileToString(file, type) {
  if (type === 'xlsx') {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    return workbook.SheetNames.map((name) => {
      const sheet = workbook.Sheets[name];
      const rows = XLSX.utils.sheet_to_csv(sheet);
      return `# Sheet: ${name}\n${rows}`;
    }).join('\n\n');
  }
  return file.text();
}

ui.countBtn.addEventListener('click', async () => {
  const file = ui.input.files?.[0];
  if (!file) {
    ui.status.textContent = 'Select a file first.';
    return;
  }

  ui.status.textContent = 'Reading and tokenizing...';
  ui.result.classList.add('hidden');

  try {
    const type = getType(file);
    const content = await fileToString(file, type);
    await ensureEncoder(ui.model.value);

    const tokenCount = encoder.encode(content).length;

    ui.name.textContent = file.name;
    ui.type.textContent = type;
    ui.chars.textContent = content.length.toLocaleString();
    ui.tokens.textContent = tokenCount.toLocaleString();
    ui.result.classList.remove('hidden');
    ui.status.textContent = 'Done.';
  } catch (error) {
    console.error(error);
    ui.status.textContent = `Failed to process file: ${error.message}`;
  }
});
