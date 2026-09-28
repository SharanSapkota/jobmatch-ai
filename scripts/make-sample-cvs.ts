/** Writes sample CVs (PDF + DOCX) to samples/ for manual upload testing. */
import { mkdir, writeFile } from "node:fs/promises";
import { CANDIDATE_A_CV, CANDIDATE_B_CV, CANDIDATE_C_CV } from "../tests/fixtures/candidates";
import { makeDocx, makePdf } from "../tests/helpers/make-docs";

async function main() {
  await mkdir("samples", { recursive: true });
  await writeFile("samples/candidate-a-backend.pdf", makePdf(CANDIDATE_A_CV));
  await writeFile("samples/candidate-b-frontend.docx", makeDocx(CANDIDATE_B_CV));
  await writeFile("samples/candidate-c-data-scientist.pdf", makePdf(CANDIDATE_C_CV));
  await writeFile("samples/candidate-c-data-scientist.docx", makeDocx(CANDIDATE_C_CV));
  console.log("Wrote sample CVs to samples/");
}

void main();
