import type {
  ParsedCv,
  ParsedEducation,
  ParsedExperience,
  ParsedProject,
  ParsedSkill,
} from "./cv-schema";

/**
 * Deterministic, rule-based CV parser. Backs the MockProvider so the app and
 * tests run without an API key. It only copies text that is present; anything
 * it cannot recognise is left out rather than guessed.
 */

type SectionKey = "summary" | "experience" | "education" | "skills" | "projects" | "achievements" | "languages" | "ignored";

const HEADINGS: Array<[SectionKey, RegExp]> = [
  ["summary", /^(professional\s+)?(summary|profile|about(\s+me)?|objective)$/i],
  ["experience", /^((work|professional|employment)\s+)?(experience|history|employment)(\s+history)?$/i],
  ["education", /^education(\s+(and|&)\s+training)?$/i],
  ["skills", /^((technical|core|key)\s+)?skills(\s+(and|&)\s+tools)?$/i],
  ["projects", /^(selected\s+|personal\s+)?projects$/i],
  ["achievements", /^(achievements|awards|accomplishments|honou?rs)$/i],
  ["languages", /^languages?$/i],
  ["ignored", /^(certifications?|references|interests|hobbies|contact(\s+details)?|publications|volunteering)$/i],
];

const MONTH = "(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\\.?";
const DATE = `(?:${MONTH}\\s+\\d{4}|\\d{4}-\\d{2}|\\d{1,2}/\\d{4}|\\d{4})`;
const DATE_RANGE = new RegExp(
  `\\(?\\s*(${DATE})\\s*(?:–|—|-|to)\\s*(${DATE}|present|current|now|ongoing)\\s*\\)?`,
  "i",
);
const SINGLE_DATE = new RegExp(`\\(?\\b(${DATE})\\)?\\s*$`, "i");
const BULLET = /^\s*(?:[-•*▪◦·]|\d+[.)])\s+/;
const TECH_LINE = /^(technologies|tech(\s+stack)?|stack|tools|environment)\s*:\s*/i;
const INSTITUTION_HINT = /(universit|college|school|institut|academy|polytechnic|hochschule|ammattikorkeakoulu|yliopisto)/i;

function headingOf(line: string): SectionKey | null {
  const cleaned = line.replace(/[:\s]+$/, "").trim();
  if (cleaned.length > 40) return null;
  for (const [key, re] of HEADINGS) if (re.test(cleaned)) return key;
  return null;
}

function splitList(value: string): string[] {
  return value
    .split(/[,;•|]/)
    .map((s) => s.trim().replace(/\.$/, ""))
    .filter((s) => s.length > 0 && s.length <= 100);
}

function stripBullet(line: string): string {
  return line.replace(BULLET, "").trim();
}

function splitHeader(text: string): [string, string | null] {
  const seps = [" at ", " — ", " – ", " - ", " | ", ", "];
  for (const sep of seps) {
    const idx = text.indexOf(sep);
    if (idx > 0) return [text.slice(0, idx).trim(), text.slice(idx + sep.length).trim()];
  }
  return [text.trim(), null];
}

function extractLocation(text: string): [string, string | null] {
  const m = text.match(/\(([^()]+)\)\s*$/);
  if (!m) return [text, null];
  return [text.slice(0, m.index).trim(), m[1].trim()];
}

function cleanHeaderRest(text: string): string {
  return text.replace(/[\s|,–—-]+$/, "").replace(/^[\s|,–—-]+/, "").trim();
}

function parseExperience(lines: string[]): ParsedExperience[] {
  const out: ParsedExperience[] = [];
  let current: ParsedExperience | null = null;
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const range = BULLET.test(line) ? null : line.match(DATE_RANGE);
    if (range) {
      const rest = cleanHeaderRest(line.replace(range[0], ""));
      const [head, location] = extractLocation(rest);
      const [title, company] = splitHeader(head);
      if (title && company) {
        current = {
          company: company.slice(0, 200),
          title: title.slice(0, 200),
          location,
          startDate: range[1],
          endDate: range[2],
          description: null,
          achievements: [],
          technologies: [],
        };
        out.push(current);
        continue;
      }
    }
    if (!current) continue;
    if (TECH_LINE.test(line)) {
      current.technologies.push(...splitList(line.replace(TECH_LINE, "")));
    } else if (BULLET.test(line)) {
      current.achievements.push(stripBullet(line).slice(0, 1000));
    } else {
      current.description = current.description ? `${current.description} ${line}` : line;
    }
  }
  return out;
}

function parseEducation(lines: string[]): ParsedEducation[] {
  const out: ParsedEducation[] = [];
  let current: ParsedEducation | null = null;
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (BULLET.test(line)) {
      if (current) current.description = current.description ? `${current.description} ${stripBullet(line)}` : stripBullet(line);
      continue;
    }
    let rest = line;
    let startDate: string | null = null;
    let endDate: string | null = null;
    const range = rest.match(DATE_RANGE);
    if (range) {
      startDate = range[1];
      endDate = range[2];
      rest = rest.replace(range[0], "");
    } else {
      const single = rest.match(SINGLE_DATE);
      if (single) {
        endDate = single[1];
        rest = rest.replace(single[0], "");
      }
    }
    rest = cleanHeaderRest(rest);
    const [a, b] = splitHeader(rest);
    const parts = [a, b].filter((p): p is string => !!p);
    const institution = parts.find((p) => INSTITUTION_HINT.test(p)) ?? (parts.length === 2 ? parts[1] : null);
    if (!institution) {
      if (current) current.description = current.description ? `${current.description} ${line}` : line;
      continue;
    }
    const degreeText = parts.find((p) => p !== institution) ?? null;
    let degree = degreeText;
    let field: string | null = null;
    if (degreeText) {
      // "Bachelor of Science in X": only " in " separates degree from field.
      const m = degreeText.match(/^(.*)\s+in\s+(.+)$/i);
      if (m && /(bachelor|master|b\.?sc|m\.?sc|b\.?a|m\.?a|phd|doctor|diploma|degree|mba|associate|certificate)/i.test(m[1])) {
        degree = m[1].trim();
        field = m[2].trim();
      }
    }
    current = { institution, degree, field, startDate, endDate, description: null };
    out.push(current);
  }
  return out;
}

function parseSkills(lines: string[]): ParsedSkill[] {
  const out: ParsedSkill[] = [];
  const seen = new Set<string>();
  for (const raw of lines) {
    const line = stripBullet(raw.trim());
    if (!line) continue;
    const m = line.match(/^([^:]{1,60}):\s*(.+)$/);
    const category = m ? m[1].trim() : null;
    for (const name of splitList(m ? m[2] : line)) {
      const key = name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ name, category, proficiency: null });
    }
  }
  return out;
}

function parseProjects(lines: string[]): ParsedProject[] {
  const out: ParsedProject[] = [];
  let current: ParsedProject | null = null;
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (TECH_LINE.test(line) && current) {
      current.technologies.push(...splitList(line.replace(TECH_LINE, "")));
      continue;
    }
    if (BULLET.test(line) && current) {
      const t = stripBullet(line);
      current.description = current.description ? `${current.description} ${t}` : t;
      continue;
    }
    const text = stripBullet(line);
    const m = text.match(/^(.{1,120}?)\s*(?:—|–|:| - )\s*(.+)$/);
    current = { name: (m ? m[1] : text).slice(0, 200), description: m ? m[2] : null, technologies: [] };
    out.push(current);
  }
  return out;
}

function parseLanguages(lines: string[]): ParsedCv["languages"] {
  const out: ParsedCv["languages"] = [];
  for (const item of lines.flatMap((l) => splitList(stripBullet(l.trim())))) {
    const m = item.match(/^([^(:–—-]+?)\s*(?:\(([^)]+)\)|[:–—-]\s*(.+))?$/);
    if (!m) continue;
    out.push({ name: m[1].trim(), proficiency: (m[2] ?? m[3] ?? null)?.trim() ?? null });
  }
  return out;
}

export function parseCvHeuristically(text: string): ParsedCv {
  const lines = text.split("\n");
  const sections: Record<SectionKey | "preamble", string[]> = {
    preamble: [], summary: [], experience: [], education: [], skills: [], projects: [], achievements: [], languages: [], ignored: [],
  };
  let current: SectionKey | "preamble" = "preamble";
  for (const line of lines) {
    const heading = headingOf(line.trim());
    if (heading) {
      current = heading;
      continue;
    }
    sections[current].push(line);
  }

  // Line 1 of the preamble is usually the name; a short line 2 is the headline.
  const preamble = sections.preamble.map((l) => l.trim()).filter(Boolean);
  const headlineCandidate = preamble[1];
  const headline =
    headlineCandidate && headlineCandidate.length <= 120 && !/\[(email|phone|url)\]|@|\d{4,}/i.test(headlineCandidate)
      ? headlineCandidate
      : null;

  const summary = sections.summary.map((l) => l.trim()).filter(Boolean).join(" ") || null;

  return {
    headline,
    summary: summary ? summary.slice(0, 4000) : null,
    experience: parseExperience(sections.experience),
    education: parseEducation(sections.education),
    skills: parseSkills(sections.skills),
    projects: parseProjects(sections.projects),
    achievements: sections.achievements.map((l) => stripBullet(l.trim())).filter(Boolean).map((s) => s.slice(0, 1000)),
    languages: parseLanguages(sections.languages),
  };
}
