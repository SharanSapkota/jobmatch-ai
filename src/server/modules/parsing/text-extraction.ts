import mammoth from "mammoth";
import { extractText, getDocumentProxy } from "unpdf";
import type { CvFileType } from "./file-validation";

export class TextExtractionError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "TextExtractionError";
  }
}

export async function extractRawText(bytes: Buffer, fileType: CvFileType): Promise<string> {
  try {
    if (fileType === "PDF") {
      const pdf = await getDocumentProxy(new Uint8Array(bytes));
      const { text } = await extractText(pdf, { mergePages: false });
      return text.join("\n\n");
    }
    const { value } = await mammoth.extractRawText({ buffer: bytes });
    return value;
  } catch (error) {
    throw new TextExtractionError("We could not read text from this file. It may be damaged or password protected.", {
      cause: error,
    });
  }
}
