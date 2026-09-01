# PDFAnnotationExtraction

An MCP (Model Context Protocol) server for reading PDFs — including their text, table of contents, and annotations (highlights, sticky notes, free text comments).

It's useful for feeding annotated PDFs (e.g. thesis drafts with reviewer comments, marked-up papers) to an AI assistant, so it can see not just the text but also what a reviewer highlighted or commented on.

## Tools

- **`get_pdf_outline`** — Returns the total page count and table of contents (if present) of a PDF.
- **`read_pdf_pages`** — Returns the full text of a page range, along with any extracted annotations found on those pages.
- **`get_pdf_comments`** — Returns only the annotations/comments (highlights, sticky notes, free text) for a page range, without the full page text. Cheaper than `read_pdf_pages` when you only need the comments.

### Annotation extraction

For **highlights**, the server locates the text on the same horizontal line as the highlight box (using PDF coordinate data) and reconstructs the highlighted sentence, plus any note attached to the highlight.

For **free text and sticky note comments**, it extracts the comment content directly from the PDF annotation data.

## Setup

```bash
npm install
npm run build
```

This compiles the TypeScript in `src/` to `dist/` via `tsc`.

## Usage

Run as an MCP server over stdio:

```bash
npm start
```

Then configure it as an MCP server in your client of choice (e.g. Claude Code, Claude Desktop), pointing at `dist/index.js`.

## Tech

- [`@modelcontextprotocol/sdk`](https://www.npmjs.com/package/@modelcontextprotocol/sdk) for the MCP server/transport
- [`pdfjs-dist`](https://www.npmjs.com/package/pdfjs-dist) for PDF parsing, text extraction, and annotation access
