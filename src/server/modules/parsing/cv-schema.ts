import { z } from "zod";

// Strict objects: any field the schema does not define (e.g. a hallucinated
// "certifications" or "salary" key) makes validation fail.

const text = (max: number) => z.string().trim().min(1).max(max);
const optionalText = (max: number) => z.string().trim().max(max).nullable();
const list = (max: number) => z.array(text(300)).max(max);

export const ExperienceSchema = z.strictObject({
  company: text(200),
  title: text(200),
  location: optionalText(200),
  startDate: optionalText(40),
  endDate: optionalText(40),
  description: optionalText(4000),
  achievements: z.array(text(1000)).max(50),
  technologies: list(100),
});

export const EducationSchema = z.strictObject({
  institution: text(300),
  degree: optionalText(200),
  field: optionalText(200),
  startDate: optionalText(40),
  endDate: optionalText(40),
  description: optionalText(2000),
});

export const SkillSchema = z.strictObject({
  name: text(100),
  category: optionalText(100),
  proficiency: optionalText(50),
});

export const ProjectSchema = z.strictObject({
  name: text(200),
  description: optionalText(2000),
  technologies: list(50),
});

export const LanguageSchema = z.strictObject({
  name: text(60),
  proficiency: optionalText(60),
});

export const ParsedCvSchema = z.strictObject({
  headline: optionalText(200),
  summary: optionalText(4000),
  experience: z.array(ExperienceSchema).max(50),
  education: z.array(EducationSchema).max(20),
  skills: z.array(SkillSchema).max(200),
  projects: z.array(ProjectSchema).max(50),
  achievements: z.array(text(1000)).max(50),
  languages: z.array(LanguageSchema).max(30),
});

export type ParsedCv = z.infer<typeof ParsedCvSchema>;
export type ParsedExperience = z.infer<typeof ExperienceSchema>;
export type ParsedEducation = z.infer<typeof EducationSchema>;
export type ParsedSkill = z.infer<typeof SkillSchema>;
export type ParsedProject = z.infer<typeof ProjectSchema>;

export const EMPTY_PARSED_CV: ParsedCv = {
  headline: null,
  summary: null,
  experience: [],
  education: [],
  skills: [],
  projects: [],
  achievements: [],
  languages: [],
};
