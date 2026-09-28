import { describe, expect, it } from "vitest";
import { EMPTY_PARSED_CV, ParsedCvSchema } from "@/server/modules/parsing/cv-schema";
import { parseCvHeuristically } from "@/server/modules/parsing/heuristic-cv-parser";
import { checkGrounding } from "@/server/modules/parsing/grounding";
import { cleanText, redactContactDetails } from "@/server/modules/parsing/clean-text";
import { CANDIDATE_A_CV, CANDIDATE_B_CV, CANDIDATE_C_CV } from "../fixtures/candidates";

const validCv = {
  ...EMPTY_PARSED_CV,
  headline: "Senior Backend Engineer",
  experience: [
    {
      company: "Nordpay",
      title: "Senior Backend Engineer",
      location: "Helsinki",
      startDate: "2020-03",
      endDate: "Present",
      description: null,
      achievements: ["Built BullMQ-based distributed processing pipeline"],
      technologies: ["BullMQ", "PostgreSQL"],
    },
  ],
  skills: [{ name: "TypeScript", category: null, proficiency: null }],
};

describe("ParsedCvSchema (LLM output validation)", () => {
  it("accepts valid output", () => {
    expect(ParsedCvSchema.safeParse(validCv).success).toBe(true);
  });

  it("rejects malformed output", () => {
    expect(ParsedCvSchema.safeParse({ ...validCv, experience: [{ company: "Nordpay" }] }).success).toBe(false);
    expect(ParsedCvSchema.safeParse({ ...validCv, skills: "TypeScript, Go" }).success).toBe(false);
    expect(ParsedCvSchema.safeParse({ ...validCv, experience: [{ ...validCv.experience[0], company: "" }] }).success).toBe(false);
    expect(ParsedCvSchema.safeParse("not json").success).toBe(false);
    const missingKey: Record<string, unknown> = { ...validCv };
    delete missingKey.summary;
    expect(ParsedCvSchema.safeParse(missingKey).success).toBe(false);
  });

  it("rejects hallucinated fields that are not in the schema", () => {
    expect(ParsedCvSchema.safeParse({ ...validCv, certifications: ["AWS Solutions Architect"] }).success).toBe(false);
    const exp = { ...validCv.experience[0], teamSize: 12 };
    expect(ParsedCvSchema.safeParse({ ...validCv, experience: [exp] }).success).toBe(false);
    const skill = { ...validCv.skills[0], yearsUsed: 10 };
    expect(ParsedCvSchema.safeParse({ ...validCv, skills: [skill] }).success).toBe(false);
  });
});

describe("heuristic CV parser (mock provider)", () => {
  it("parses candidate A (backend)", () => {
    const cv = parseCvHeuristically(redactContactDetails(CANDIDATE_A_CV));
    expect(ParsedCvSchema.safeParse(cv).success).toBe(true);
    expect(cv.headline).toBe("Senior Backend Engineer");
    expect(cv.experience).toHaveLength(2);
    expect(cv.experience[0]).toMatchObject({
      company: "Nordpay",
      title: "Senior Backend Engineer",
      location: "Helsinki",
      startDate: "2020-03",
      endDate: "Present",
    });
    expect(cv.experience[0].technologies).toContain("BullMQ");
    expect(cv.experience[0].achievements[0]).toMatch(/BullMQ-based distributed processing pipeline/);
    expect(cv.experience[1].description).toBe("Maintained billing services for enterprise clients.");
    expect(cv.education[0]).toMatchObject({ institution: "Aalto University", degree: "MSc", field: "Computer Science" });
    expect(cv.skills.map((s) => s.name)).toEqual(["TypeScript", "Go", "SQL", "AWS", "Docker", "Redis"]);
    expect(cv.skills[0].category).toBe("Programming");
    expect(cv.languages).toEqual([
      { name: "Finnish", proficiency: "Native" },
      { name: "English", proficiency: "Fluent" },
    ]);
  });

  it("parses candidate B (frontend) including month dates and projects", () => {
    const cv = parseCvHeuristically(CANDIDATE_B_CV);
    expect(ParsedCvSchema.safeParse(cv).success).toBe(true);
    expect(cv.summary).toMatch(/accessible/);
    expect(cv.experience.map((e) => e.company)).toEqual(["Brightcart", "Studio Lumen"]);
    expect(cv.experience[0].startDate).toBe("Jan 2021");
    expect(cv.education[0]).toMatchObject({ degree: "Bachelor of Science", field: "Web Development" });
    expect(cv.projects[0]).toMatchObject({ name: "Palette Kit", technologies: ["TypeScript", "React"] });
  });

  it("parses candidate C (data scientist) with multiple degrees and achievements", () => {
    const cv = parseCvHeuristically(CANDIDATE_C_CV);
    expect(ParsedCvSchema.safeParse(cv).success).toBe(true);
    expect(cv.experience.map((e) => e.title)).toEqual(["Data Scientist", "Research Assistant"]);
    expect(cv.education.map((e) => e.institution)).toEqual(["University of Manchester", "University of Leeds"]);
    expect(cv.achievements).toEqual(["Kaggle competition top 5% (2020)"]);
  });

  it("returns empty sections instead of guessing when text has no structure", () => {
    const cv = parseCvHeuristically("Just a paragraph of text about someone.");
    expect(cv.experience).toEqual([]);
    expect(cv.education).toEqual([]);
    expect(cv.skills).toEqual([]);
  });
});

describe("text cleaning and redaction", () => {
  it("normalises whitespace and control characters", () => {
    expect(cleanText("  Hello\u0000   world \r\n\r\n\r\n\r\nNext\u00A0line ")).toBe("Hello world\n\nNext line");
  });

  it("removes contact details but keeps dates", () => {
    const out = redactContactDetails(CANDIDATE_A_CV);
    expect(out).not.toMatch(/aino\.virtanen@example\.com/);
    expect(out).not.toMatch(/123 4567/);
    expect(out).not.toMatch(/linkedin\.com/);
    expect(out).toMatch(/2020-03 - Present/);
    expect(out).toMatch(/2015 - 2017/);
  });
});

describe("grounding check", () => {
  it("passes facts copied from the CV", () => {
    const cv = parseCvHeuristically(CANDIDATE_A_CV);
    expect(checkGrounding(cv, CANDIDATE_A_CV)).toEqual([]);
  });

  it("flags employers, titles and skills that do not appear in the CV", () => {
    const cv = parseCvHeuristically(CANDIDATE_A_CV);
    cv.experience[0].company = "Google";
    cv.skills.push({ name: "Kubernetes", category: null, proficiency: null });
    const warnings = checkGrounding(cv, CANDIDATE_A_CV);
    expect(warnings.map((w) => w.value)).toEqual(["Google", "Kubernetes"]);
  });
});
