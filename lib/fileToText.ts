import * as mammoth from "mammoth";

const PDF_WORKER_CDN =
  "https://unpkg.com/pdfjs-dist@5.4.530/build/pdf.worker.mjs";
let pdfWorkerInitialized = false;

function getExtension(filename: string): string {
  const lastDot = filename.lastIndexOf(".");
  return lastDot === -1 ? "" : filename.slice(lastDot).toLowerCase();
}

/**
 * Extracts plain text from an uploaded file. Supports .md, .docx, and .pdf.
 * @param file - The File object from an input[type=file]
 * @returns Promise resolving to the extracted text, or rejects on unsupported type / parse error
 */
export async function extractTextFromFile(file: File): Promise<string> {
  const ext = getExtension(file.name);

  switch (ext) {
    case ".md": {
      return file.text();
    }

    case ".docx": {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      return result.value;
    }

    case ".pdf": {
      const pdfjsLib = await import("pdfjs-dist");
      if (!pdfWorkerInitialized && typeof window !== "undefined") {
        pdfjsLib.GlobalWorkerOptions.workerSrc = PDF_WORKER_CDN;
        pdfWorkerInitialized = true;
      }
      const arrayBuffer = await file.arrayBuffer();
      const doc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const numPages = doc.numPages;
      const parts: string[] = [];
      for (let i = 1; i <= numPages; i++) {
        const page = await doc.getPage(i);
        const content = await page.getTextContent();
        const pageText = content.items
          .map((item) => ("str" in item ? item.str : ""))
          .join(" ");
        parts.push(pageText);
      }
      return parts.join("\n\n").trim();
    }

    default:
      throw new Error(`Unsupported file type: ${ext || "unknown"}. Use .md, .docx, or .pdf.`);
  }
}
