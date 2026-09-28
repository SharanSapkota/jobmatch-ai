export type CvFileType = "PDF" | "DOCX";

export type FileValidationResult =
  | { ok: true; fileType: CvFileType }
  | { ok: false; error: string };

export const DEFAULT_MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

const PDF_MAGIC = Buffer.from("%PDF-");
const ZIP_MAGIC = Buffer.from([0x50, 0x4b, 0x03, 0x04]);
// ZIP local file headers store entry names uncompressed, so a DOCX always
// contains this byte sequence.
const DOCX_MARKER = Buffer.from("word/document.xml");

export function detectFileType(bytes: Buffer): CvFileType | null {
  if (bytes.subarray(0, PDF_MAGIC.length).equals(PDF_MAGIC)) return "PDF";
  if (bytes.subarray(0, ZIP_MAGIC.length).equals(ZIP_MAGIC) && bytes.includes(DOCX_MARKER)) return "DOCX";
  return null;
}

function typeFromExtension(filename: string): CvFileType | null {
  const ext = filename.toLowerCase().split(".").pop();
  if (ext === "pdf") return "PDF";
  if (ext === "docx") return "DOCX";
  return null;
}

/**
 * Validates an uploaded CV by content, not by name or client MIME type.
 * The extension must also agree with the detected content, so a renamed file
 * (e.g. an HTML page saved as .pdf) is rejected.
 */
export function validateCvFile(
  file: { name: string; size: number; bytes: Buffer },
  maxBytes: number = DEFAULT_MAX_UPLOAD_BYTES,
): FileValidationResult {
  if (file.size === 0 || file.bytes.length === 0) return { ok: false, error: "The file is empty." };
  if (file.size > maxBytes || file.bytes.length > maxBytes) {
    return { ok: false, error: `The file is too large. The maximum size is ${Math.round(maxBytes / 1024 / 1024)} MB.` };
  }
  const declared = typeFromExtension(file.name);
  if (!declared) return { ok: false, error: "Only PDF and DOCX files are supported." };
  const detected = detectFileType(file.bytes);
  if (!detected) return { ok: false, error: "The file content is not a valid PDF or DOCX document." };
  if (detected !== declared) {
    return { ok: false, error: `The file extension says ${declared} but the content is ${detected}. Please upload the original file.` };
  }
  return { ok: true, fileType: detected };
}
