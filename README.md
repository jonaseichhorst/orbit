# File Token Counter

A small browser tool to upload a file and estimate GPT token usage.

## Supported file types

- Markdown (`.md`, `.markdown`)
- HTML (`.html`, `.htm`)
- Plain text (`.txt`)
- Excel workbooks (`.xlsx`)

For XLSX files, each sheet is converted to CSV-like text before tokenization.

## Run

```bash
python3 -m http.server 4173
```

Then open <http://localhost:4173>.

## Notes

- Uses `js-tiktoken` in the browser for token counting.
- Uses SheetJS to parse XLSX files client-side.
- No file content is uploaded to a backend.
