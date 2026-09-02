// @ts-ignore
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import { readFile } from 'fs/promises';

async function extractPageAnnotations(page: any, textItems: any[]): Promise<string[]> {
  const annotations = await page.getAnnotations();
  const extractedAnnotations: string[] = [];

  for (const annot of annotations) {
    // Each annotation becomes ONE block, so that multi-line blocks
    // (e.g. a highlight's location + note) stay visibly grouped
    // even when the surrounding text itself contains newlines.
    const blockLines: string[] = [];

    // HANDLE HIGHLIGHTS
    if (annot.subtype === 'Highlight') {
      const rect = annot.rect; // [xMin, yMin, xMax, yMax]

      if (rect) {
        // Find the vertical center of the highlight box
        const midY = (rect[1] + rect[3]) / 2;

        // Grab all text items that sit roughly on this same horizontal line
        const lineItems = textItems.filter((item: any) => {
          const y = item.transform[5]; // Y-coordinate baseline
          // If the text is within 10 points of the highlight's center, it's on the same line
          return Math.abs(y - midY) < 10;
        });

        // Sort horizontally (by X coordinate) to ensure the sentence is in order
        lineItems.sort((a: any, b: any) => a.transform[4] - b.transform[4]);

        const highlightedContext = lineItems.map((item: any) => item.str).join(' ');

        if (highlightedContext) {
           blockLines.push(`[HIGHLIGHT LOCATION]: "...${highlightedContext.trim()}..."`);
        }
      }

      if (annot.contentsObj?.str || annot.contents) {
        const note = annot.contentsObj?.str || annot.contents;
        blockLines.push(`[HIGHLIGHT NOTE]: ${note.trim()}`);
      }
    }

    // HANDLE RED TEXT (FreeText) & STICKY NOTES (Text)
    else if (annot.subtype === 'FreeText' || annot.subtype === 'Text') {
      let commentText =
        annot.contentsObj?.str ||
        (annot.textContent ? annot.textContent.join(' ') : null) ||
        annot.contents ||
        annot.richText ||
        annot.title ||
        "(Text drawn without standard contents tag)";

      commentText = commentText.replace(/\n/g, ' ').trim();
      blockLines.push(`[TEACHER COMMENT]: ${commentText}`);
    }

    if (blockLines.length > 0) {
      extractedAnnotations.push(blockLines.join('\n'));
    }
  }

  return extractedAnnotations;
}

// Joins annotation blocks with a short divider so it's unambiguous
// where one highlight/comment ends and the next begins, even if a
// block itself spans multiple lines.
function joinAnnotationBlocks(blocks: string[]): string {
  return blocks.join('\n---\n');
}

export async function getPdfContent(pdfPath: string, startPage: number, endPage: number) {
  const data = new Uint8Array(await readFile(pdfPath));
  const loadingTask = pdfjs.getDocument({ data });
  const pdf = await loadingTask.promise;

  let result = `--- Document: ${pdfPath} (Pages ${startPage}-${endPage}) ---\n\n`;
  const actualEnd = Math.min(endPage, pdf.numPages);

  for (let i = startPage; i <= actualEnd; i++) {
    const page = await pdf.getPage(i);

    // Get raw text and its coordinates
    const textContent = await page.getTextContent();
    const textItems = textContent.items;
    const fullText = textItems.map((item: any) => item.str).join(' ');

    const extractedAnnotations = await extractPageAnnotations(page, textItems);

    // Assemble the page output
    result += `PAGE ${i} TEXT:\n${fullText}\n\n`;
    if (extractedAnnotations.length > 0) {
      result += `--- EXTRACTED ANNOTATIONS & HIGHLIGHTS ---\n${joinAnnotationBlocks(extractedAnnotations)}\n\n`;
    }
  }

  return result;
}

export async function getPdfComments(pdfPath: string, startPage: number, endPage: number) {
  const data = new Uint8Array(await readFile(pdfPath));
  const loadingTask = pdfjs.getDocument({ data });
  const pdf = await loadingTask.promise;

  let result = `--- Document: ${pdfPath} (Pages ${startPage}-${endPage}) -- Comments Only ---\n\n`;
  const actualEnd = Math.min(endPage, pdf.numPages);
  let anyFound = false;

  for (let i = startPage; i <= actualEnd; i++) {
    const page = await pdf.getPage(i);

    // Highlight context still needs the text layer, but we never include the full page text in the output.
    const textContent = await page.getTextContent();
    const textItems = textContent.items;

    const extractedAnnotations = await extractPageAnnotations(page, textItems);

    if (extractedAnnotations.length > 0) {
      anyFound = true;
      result += `PAGE ${i}:\n${joinAnnotationBlocks(extractedAnnotations)}\n\n`;
    }
  }

  if (!anyFound) {
    result += "(No annotations or comments found in this page range.)\n";
  }

  return result;
}

export async function getPdfOutline(pdfPath: string) {
  const data = new Uint8Array(await readFile(pdfPath));
  const loadingTask = pdfjs.getDocument({ data });
  const pdf = await loadingTask.promise;
  const outline = await pdf.getOutline();
  return {
    totalPages: pdf.numPages,
    outline: outline || "No formal TOC found in PDF metadata."
  };
}