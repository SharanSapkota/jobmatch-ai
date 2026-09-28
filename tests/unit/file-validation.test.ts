import { describe, expect, it } from "vitest";
import { detectFileType, validateCvFile } from "@/server/modules/parsing/file-validation";
import { extractRawText } from "@/server/modules/parsing/text-extraction";
import { cleanText } from "@/server/modules/parsing/clean-text";
import { parseCvHeuristically } from "@/server/modules/parsing/heuristic-cv-parser";
import { makeDocx, makePdf, makeZip } from "../helpers/make-docs";
import { CANDIDATE_A_CV } from "../fixtures/candidates";

const pdf = makePdf(CANDIDATE_A_CV);
const docx = makeDocx(CANDIDATE_A_CV);
const file = (name: string, bytes: Buffer) => ({ name, size: bytes.length, bytes });

describe("CV file validation", () => {
  it("accepts real PDF and DOCX files", () => {
    expect(validateCvFile(file("cv.pdf", pdf))).toEqual({ ok: true, fileType: "PDF" });
    expect(validateCvFile(file("CV Final.DOCX", docx))).toEqual({ ok: true, fileType: "DOCX" });
  });

  it("rejects unsupported file types", () => {
    const txt = Buffer.from("plain text resume");
    expect(validateCvFile(file("cv.txt", txt))).toMatchObject({ ok: false });
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0]);
    expect(validateCvFile(file("cv.png", png))).toMatchObject({ ok: false });
  });

  it("rejects spoofed extensions", () => {
    const html = Buffer.from("<html><script>alert(1)</script></html>");
    expect(validateCvFile(file("cv.pdf", html))).toMatchObject({ ok: false, error: expect.stringMatching(/not a valid PDF or DOCX/) });
    expect(validateCvFile(file("cv.docx", pdf))).toMatchObject({ ok: false, error: expect.stringMatching(/content is PDF/) });
    expect(validateCvFile(file("cv.pdf", docx))).toMatchObject({ ok: false, error: expect.stringMatching(/content is DOCX/) });
    // A ZIP that is not a Word document (e.g. an .xlsx or arbitrary archive).
    const zip = makeZip([{ name: "xl/workbook.xml", data: Buffer.from("<x/>") }]);
    expect(validateCvFile(file("cv.docx", zip))).toMatchObject({ ok: false });
  });

  it("rejects oversize and empty files", () => {
    const big = Buffer.concat([Buffer.from("%PDF-1.4\n"), Buffer.alloc(5 * 1024 * 1024)]);
    expect(validateCvFile(file("cv.pdf", big))).toMatchObject({ ok: false, error: expect.stringMatching(/too large/) });
    expect(validateCvFile(file("cv.pdf", pdf), 100)).toMatchObject({ ok: false });
    expect(validateCvFile(file("cv.pdf", Buffer.alloc(0)))).toMatchObject({ ok: false, error: "The file is empty." });
  });

  it("detects type from content only", () => {
    expect(detectFileType(pdf)).toBe("PDF");
    expect(detectFileType(docx)).toBe("DOCX");
    expect(detectFileType(Buffer.from("PK"))).toBeNull();
  });
});

describe("text extraction", () => {
  it.each([
    ["PDF", pdf],
    ["DOCX", docx],
  ] as const)("extracts line-structured text from %s that the parser can read", async (type, bytes) => {
    const text = cleanText(await extractRawText(bytes, type));
    expect(text).toMatch(/Senior Backend Engineer at Nordpay/);
    const cv = parseCvHeuristically(text);
    expect(cv.experience.map((e) => e.company)).toEqual(["Nordpay", "Softa Oy"]);
    expect(cv.education[0]?.institution).toBe("Aalto University");
  });

  it("fails cleanly on a corrupt PDF", async () => {
    await expect(extractRawText(Buffer.from("%PDF-1.4 garbage"), "PDF")).rejects.toThrow(/could not read text/);
  });
});
