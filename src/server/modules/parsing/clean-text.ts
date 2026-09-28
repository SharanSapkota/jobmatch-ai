/** Normalises extracted CV text without changing its content. */
export function cleanText(raw: string): string {
  return (
    raw
      .normalize("NFKC")
      // Control characters except tab and newline.
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
      .replace(/\r\n?/g, "\n")
      .replace(/\u00A0/g, " ")
      .replace(/[\u200B-\u200D\uFEFF]/g, "")
      .split("\n")
      .map((line) => line.replace(/[ \t]+/g, " ").trim())
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim()
  );
}

const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const URL = /\b(?:https?:\/\/|www\.)\S+|\b(?:linkedin\.com|github\.com)\/\S+/gi;
// Phone-like sequences: optional +, 7+ digits with common separators. Year
// ranges such as "2019 - 2021" are too short to match.
const PHONE = /(?:\+\d{1,3}[\s.-]?)?(?:\(\d{1,4}\)[\s.-]?)?\d{2,4}(?:[\s.-]?\d{2,4}){2,4}\b/g;

/**
 * Removes contact details before text is sent to an LLM provider.
 * The stored extracted text keeps the original content.
 */
export function redactContactDetails(text: string): string {
  return text
    .replace(EMAIL, "[email]")
    .replace(URL, "[url]")
    .replace(PHONE, (match) => (match.replace(/\D/g, "").length >= 7 ? "[phone]" : match));
}
