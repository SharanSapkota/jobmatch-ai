"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Alert, Badge, Button, Card, CardHeader, Field, Input, Textarea } from "@/components/ui";
import type {
  ParsedCv,
  ParsedEducation,
  ParsedExperience,
  ParsedProject,
  ParsedSkill,
} from "@/server/modules/parsing/cv-schema";
import type { GroundingWarning } from "@/server/modules/parsing/grounding";

type Keyed<T> = T & { _key: number };
type Language = ParsedCv["languages"][number];

interface EditorState {
  headline: string;
  summary: string;
  experience: Keyed<ParsedExperience>[];
  education: Keyed<ParsedEducation>[];
  skills: Keyed<ParsedSkill>[];
  projects: Keyed<ParsedProject>[];
  achievements: string[];
  languages: Keyed<Language>[];
}

let nextKey = 1;
const withKey = <T,>(item: T): Keyed<T> => ({ ...item, _key: nextKey++ });

function toState(cv: ParsedCv): EditorState {
  return {
    headline: cv.headline ?? "",
    summary: cv.summary ?? "",
    experience: cv.experience.map(withKey),
    education: cv.education.map(withKey),
    skills: cv.skills.map(withKey),
    projects: cv.projects.map(withKey),
    achievements: cv.achievements,
    languages: cv.languages.map(withKey),
  };
}

const nullIfBlank = (v: string | null) => (v && v.trim() ? v.trim() : null);
const cleanList = (items: string[]) => items.map((s) => s.trim()).filter(Boolean);
function strip<T extends { _key: number }>(item: T): Omit<T, "_key"> {
  const { _key: _unused, ...rest } = item;
  void _unused;
  return rest;
}

function toParsedCv(s: EditorState): ParsedCv {
  return {
    headline: nullIfBlank(s.headline),
    summary: nullIfBlank(s.summary),
    experience: s.experience.map((e) => ({
      ...strip(e),
      company: e.company.trim(),
      title: e.title.trim(),
      location: nullIfBlank(e.location),
      startDate: nullIfBlank(e.startDate),
      endDate: nullIfBlank(e.endDate),
      description: nullIfBlank(e.description),
      achievements: cleanList(e.achievements),
      technologies: cleanList(e.technologies),
    })),
    education: s.education.map((e) => ({
      ...strip(e),
      institution: e.institution.trim(),
      degree: nullIfBlank(e.degree),
      field: nullIfBlank(e.field),
      startDate: nullIfBlank(e.startDate),
      endDate: nullIfBlank(e.endDate),
      description: nullIfBlank(e.description),
    })),
    skills: s.skills.map((k) => ({ ...strip(k), name: k.name.trim(), category: nullIfBlank(k.category), proficiency: nullIfBlank(k.proficiency) })),
    projects: s.projects.map((p) => ({ ...strip(p), name: p.name.trim(), description: nullIfBlank(p.description), technologies: cleanList(p.technologies) })),
    achievements: cleanList(s.achievements),
    languages: s.languages.map((l) => ({ ...strip(l), name: l.name.trim(), proficiency: nullIfBlank(l.proficiency) })),
  };
}

function findMissingRequired(cv: ParsedCv): string[] {
  const problems: string[] = [];
  cv.experience.forEach((e, i) => {
    if (!e.company || !e.title) problems.push(`Experience ${i + 1} needs a job title and an employer.`);
  });
  cv.education.forEach((e, i) => {
    if (!e.institution) problems.push(`Education ${i + 1} needs an institution.`);
  });
  cv.skills.forEach((k, i) => {
    if (!k.name) problems.push(`Skill ${i + 1} needs a name.`);
  });
  cv.projects.forEach((p, i) => {
    if (!p.name) problems.push(`Project ${i + 1} needs a name.`);
  });
  cv.languages.forEach((l, i) => {
    if (!l.name) problems.push(`Language ${i + 1} needs a name.`);
  });
  return problems;
}

function move<T>(list: T[], index: number, delta: number): T[] {
  const target = index + delta;
  if (target < 0 || target >= list.length) return list;
  const copy = [...list];
  [copy[index], copy[target]] = [copy[target], copy[index]];
  return copy;
}

/** Textarea editing a string[] one item per line; keeps raw text while typing. */
function LinesField({ id, label, hint, value, onChange }: { id: string; label: string; hint?: string; value: string[]; onChange: (v: string[]) => void }) {
  const [text, setText] = useState(value.join("\n"));
  return (
    <Field label={label} htmlFor={id} hint={hint ?? "One per line."}>
      <Textarea
        id={id}
        rows={Math.min(8, Math.max(2, value.length + 1))}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          onChange(e.target.value.split("\n"));
        }}
      />
    </Field>
  );
}

/** Input editing a string[] as comma-separated text. */
function CommaField({ id, label, value, onChange }: { id: string; label: string; value: string[]; onChange: (v: string[]) => void }) {
  const [text, setText] = useState(value.join(", "));
  return (
    <Field label={label} htmlFor={id} hint="Separate with commas.">
      <Input
        id={id}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          onChange(e.target.value.split(","));
        }}
      />
    </Field>
  );
}

function ItemControls({ index, count, label, onMove, onRemove }: { index: number; count: number; label: string; onMove: (d: number) => void; onRemove: () => void }) {
  return (
    <div className="flex gap-1">
      <Button size="sm" variant="ghost" aria-label={`Move ${label} up`} disabled={index === 0} onClick={() => onMove(-1)}>
        ↑
      </Button>
      <Button size="sm" variant="ghost" aria-label={`Move ${label} down`} disabled={index === count - 1} onClick={() => onMove(1)}>
        ↓
      </Button>
      <Button size="sm" variant="ghost" className="text-red-700" onClick={onRemove}>
        Remove
      </Button>
    </div>
  );
}

function Section({ title, description, onAdd, addLabel, empty, children }: { title: string; description?: string; onAdd?: () => void; addLabel?: string; empty?: boolean; children: ReactNode }) {
  return (
    <Card>
      <CardHeader
        title={title}
        description={description}
        action={onAdd ? (
          <Button size="sm" variant="secondary" onClick={onAdd}>
            + {addLabel}
          </Button>
        ) : undefined}
      />
      {empty ? <p className="text-sm text-slate-500">Nothing here yet. Not found in your CV, or not added.</p> : children}
    </Card>
  );
}

export function CvEditor({ resumeId, initial, warnings }: { resumeId: string; initial: ParsedCv; warnings: GroundingWarning[] }) {
  const router = useRouter();
  const [state, setState] = useState<EditorState>(() => toState(initial));
  const [generation, setGeneration] = useState(0);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "danger"; text: string; list?: string[] } | null>(null);
  const [baseline, setBaseline] = useState(() => JSON.stringify(toParsedCv(toState(initial))));
  const current = useMemo(() => toParsedCv(state), [state]);
  const dirty = JSON.stringify(current) !== baseline;

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const update = <K extends keyof EditorState>(key: K, value: EditorState[K]) => setState((s) => ({ ...s, [key]: value }));
  function patchAt<K extends "experience" | "education" | "skills" | "projects" | "languages">(key: K, index: number, patch: Partial<EditorState[K][number]>) {
    setState((s) => ({ ...s, [key]: (s[key] as EditorState[K][number][]).map((item, i) => (i === index ? { ...item, ...patch } : item)) }));
  }

  async function save() {
    setMessage(null);
    const problems = findMissingRequired(current);
    if (problems.length) {
      setMessage({ tone: "danger", text: "Please fix these before saving:", list: problems });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/resumes/${resumeId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(current),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setMessage({ tone: "danger", text: data.error ?? "Could not save. Please try again." });
        return;
      }
      setBaseline(JSON.stringify(current));
      setMessage({ tone: "success", text: "Changes saved." });
      router.refresh();
    } catch {
      setMessage({ tone: "danger", text: "Could not save. Check your connection and try again." });
    } finally {
      setSaving(false);
    }
  }

  const warningFor = (path: string) => warnings.find((w) => w.path === path);

  return (
    <div className="space-y-6">
      {warnings.length > 0 ? (
        <Alert tone="warning" title="Please check these items">
          <ul className="list-disc space-y-0.5 pl-5">
            {warnings.map((w) => (
              <li key={w.path}>{w.message}</li>
            ))}
          </ul>
        </Alert>
      ) : null}

      <Section title="Headline and summary">
        <div className="space-y-4">
          <Field label="Headline" htmlFor="cv-headline">
            <Input id="cv-headline" value={state.headline} maxLength={200} onChange={(e) => update("headline", e.target.value)} />
          </Field>
          <Field label="Summary" htmlFor="cv-summary">
            <Textarea id="cv-summary" rows={4} maxLength={4000} value={state.summary} onChange={(e) => update("summary", e.target.value)} />
          </Field>
        </div>
      </Section>

      <Section
        title="Employment"
        description="Most recent first. Use the arrows to change the order."
        addLabel="Add position"
        onAdd={() => update("experience", [...state.experience, withKey<ParsedExperience>({ company: "", title: "", location: null, startDate: null, endDate: null, description: null, achievements: [], technologies: [] })])}
        empty={state.experience.length === 0}
      >
        <ol className="space-y-6">
          {state.experience.map((e, i) => (
            <li key={e._key} className="rounded-md border border-slate-200 p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-slate-900">
                  {e.title || "New position"}
                  {e.company ? <span className="text-slate-500"> · {e.company}</span> : null}
                </p>
                <ItemControls
                  index={i}
                  count={state.experience.length}
                  label={e.title || "position"}
                  onMove={(d) => update("experience", move(state.experience, i, d))}
                  onRemove={() => update("experience", state.experience.filter((_, j) => j !== i))}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Job title" htmlFor={`exp-${e._key}-title`}>
                  <Input id={`exp-${e._key}-title`} required value={e.title} onChange={(ev) => patchAt("experience", i, { title: ev.target.value })} />
                </Field>
                <Field label="Employer" htmlFor={`exp-${e._key}-company`}>
                  <Input id={`exp-${e._key}-company`} required value={e.company} onChange={(ev) => patchAt("experience", i, { company: ev.target.value })} />
                </Field>
                <Field label="Location" htmlFor={`exp-${e._key}-location`}>
                  <Input id={`exp-${e._key}-location`} value={e.location ?? ""} onChange={(ev) => patchAt("experience", i, { location: ev.target.value })} />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Start" htmlFor={`exp-${e._key}-start`}>
                    <Input id={`exp-${e._key}-start`} placeholder="e.g. 2020-03" value={e.startDate ?? ""} onChange={(ev) => patchAt("experience", i, { startDate: ev.target.value })} />
                  </Field>
                  <Field label="End" htmlFor={`exp-${e._key}-end`}>
                    <Input id={`exp-${e._key}-end`} placeholder="e.g. Present" value={e.endDate ?? ""} onChange={(ev) => patchAt("experience", i, { endDate: ev.target.value })} />
                  </Field>
                </div>
                <div className="sm:col-span-2">
                  <Field label="Description" htmlFor={`exp-${e._key}-desc`}>
                    <Textarea id={`exp-${e._key}-desc`} rows={2} value={e.description ?? ""} onChange={(ev) => patchAt("experience", i, { description: ev.target.value })} />
                  </Field>
                </div>
                <div className="sm:col-span-2">
                  <LinesField id={`exp-${e._key}-ach`} label="Achievements and responsibilities" value={e.achievements} onChange={(v) => patchAt("experience", i, { achievements: v })} />
                </div>
                <div className="sm:col-span-2">
                  <CommaField id={`exp-${e._key}-tech`} label="Tools and technologies used" value={e.technologies} onChange={(v) => patchAt("experience", i, { technologies: v })} />
                </div>
              </div>
              {[warningFor(`experience.${i}.company`), warningFor(`experience.${i}.title`)].filter(Boolean).map((w) => (
                <p key={w!.path} className="mt-2 text-xs text-amber-800">{w!.message}</p>
              ))}
            </li>
          ))}
        </ol>
      </Section>

      <Section
        title="Education"
        addLabel="Add education"
        onAdd={() => update("education", [...state.education, withKey<ParsedEducation>({ institution: "", degree: null, field: null, startDate: null, endDate: null, description: null })])}
        empty={state.education.length === 0}
      >
        <ol className="space-y-4">
          {state.education.map((e, i) => (
            <li key={e._key} className="rounded-md border border-slate-200 p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-slate-900">{e.institution || "New education"}</p>
                <ItemControls
                  index={i}
                  count={state.education.length}
                  label={e.institution || "education"}
                  onMove={(d) => update("education", move(state.education, i, d))}
                  onRemove={() => update("education", state.education.filter((_, j) => j !== i))}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Institution" htmlFor={`edu-${e._key}-inst`}>
                  <Input id={`edu-${e._key}-inst`} required value={e.institution} onChange={(ev) => patchAt("education", i, { institution: ev.target.value })} />
                </Field>
                <Field label="Degree or qualification" htmlFor={`edu-${e._key}-degree`}>
                  <Input id={`edu-${e._key}-degree`} value={e.degree ?? ""} onChange={(ev) => patchAt("education", i, { degree: ev.target.value })} />
                </Field>
                <Field label="Field of study" htmlFor={`edu-${e._key}-field`}>
                  <Input id={`edu-${e._key}-field`} value={e.field ?? ""} onChange={(ev) => patchAt("education", i, { field: ev.target.value })} />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Start" htmlFor={`edu-${e._key}-start`}>
                    <Input id={`edu-${e._key}-start`} value={e.startDate ?? ""} onChange={(ev) => patchAt("education", i, { startDate: ev.target.value })} />
                  </Field>
                  <Field label="End" htmlFor={`edu-${e._key}-end`}>
                    <Input id={`edu-${e._key}-end`} value={e.endDate ?? ""} onChange={(ev) => patchAt("education", i, { endDate: ev.target.value })} />
                  </Field>
                </div>
                <div className="sm:col-span-2">
                  <Field label="Details" htmlFor={`edu-${e._key}-desc`}>
                    <Textarea id={`edu-${e._key}-desc`} rows={2} value={e.description ?? ""} onChange={(ev) => patchAt("education", i, { description: ev.target.value })} />
                  </Field>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </Section>

      <Section
        title="Skills"
        addLabel="Add skill"
        onAdd={() => update("skills", [...state.skills, withKey<ParsedSkill>({ name: "", category: null, proficiency: null })])}
        empty={state.skills.length === 0}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="pb-2 pr-2 font-medium">Skill</th>
                <th className="pb-2 pr-2 font-medium">Category</th>
                <th className="pb-2 pr-2 font-medium">Proficiency</th>
                <th className="pb-2 font-medium"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {state.skills.map((k, i) => (
                <tr key={k._key} className="border-t border-slate-100 align-top">
                  <td className="py-2 pr-2">
                    <Input aria-label={`Skill ${i + 1} name`} value={k.name} onChange={(ev) => patchAt("skills", i, { name: ev.target.value })} />
                    {warningFor(`skills.${i}.name`) ? <Badge tone="warning">Not found in original CV</Badge> : null}
                  </td>
                  <td className="py-2 pr-2">
                    <Input aria-label={`Skill ${i + 1} category`} value={k.category ?? ""} onChange={(ev) => patchAt("skills", i, { category: ev.target.value })} />
                  </td>
                  <td className="py-2 pr-2">
                    <Input aria-label={`Skill ${i + 1} proficiency`} placeholder="Optional" value={k.proficiency ?? ""} onChange={(ev) => patchAt("skills", i, { proficiency: ev.target.value })} />
                  </td>
                  <td className="py-2">
                    <ItemControls
                      index={i}
                      count={state.skills.length}
                      label={k.name || "skill"}
                      onMove={(d) => update("skills", move(state.skills, i, d))}
                      onRemove={() => update("skills", state.skills.filter((_, j) => j !== i))}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section
        title="Projects"
        addLabel="Add project"
        onAdd={() => update("projects", [...state.projects, withKey<ParsedProject>({ name: "", description: null, technologies: [] })])}
        empty={state.projects.length === 0}
      >
        <ol className="space-y-4">
          {state.projects.map((p, i) => (
            <li key={p._key} className="rounded-md border border-slate-200 p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-slate-900">{p.name || "New project"}</p>
                <ItemControls
                  index={i}
                  count={state.projects.length}
                  label={p.name || "project"}
                  onMove={(d) => update("projects", move(state.projects, i, d))}
                  onRemove={() => update("projects", state.projects.filter((_, j) => j !== i))}
                />
              </div>
              <div className="space-y-3">
                <Field label="Name" htmlFor={`proj-${p._key}-name`}>
                  <Input id={`proj-${p._key}-name`} value={p.name} onChange={(ev) => patchAt("projects", i, { name: ev.target.value })} />
                </Field>
                <Field label="Description" htmlFor={`proj-${p._key}-desc`}>
                  <Textarea id={`proj-${p._key}-desc`} rows={2} value={p.description ?? ""} onChange={(ev) => patchAt("projects", i, { description: ev.target.value })} />
                </Field>
                <CommaField id={`proj-${p._key}-tech`} label="Tools and technologies" value={p.technologies} onChange={(v) => patchAt("projects", i, { technologies: v })} />
              </div>
            </li>
          ))}
        </ol>
      </Section>

      <Section title="Achievements" description="Awards, recognition and other results not tied to one job.">
        <LinesField key={generation} id="cv-achievements" label="Achievements" value={state.achievements} onChange={(v) => update("achievements", v)} />
      </Section>

      <Section
        title="Languages"
        addLabel="Add language"
        onAdd={() => update("languages", [...state.languages, withKey<Language>({ name: "", proficiency: null })])}
        empty={state.languages.length === 0}
      >
        <ul className="space-y-2">
          {state.languages.map((l, i) => (
            <li key={l._key} className="flex flex-wrap items-center gap-2">
              <Input aria-label={`Language ${i + 1}`} className="max-w-48" value={l.name} onChange={(ev) => patchAt("languages", i, { name: ev.target.value })} />
              <Input aria-label={`Language ${i + 1} level`} className="max-w-48" placeholder="Level, e.g. Fluent" value={l.proficiency ?? ""} onChange={(ev) => patchAt("languages", i, { proficiency: ev.target.value })} />
              <ItemControls
                index={i}
                count={state.languages.length}
                label={l.name || "language"}
                onMove={(d) => update("languages", move(state.languages, i, d))}
                onRemove={() => update("languages", state.languages.filter((_, j) => j !== i))}
              />
            </li>
          ))}
        </ul>
      </Section>

      <div className="sticky bottom-0 -mx-4 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0 flex-1 text-sm" aria-live="polite">
            {message ? (
              <div className={message.tone === "danger" ? "text-red-700" : "text-green-700"}>
                <p>{message.text}</p>
                {message.list ? (
                  <ul className="list-disc pl-5">
                    {message.list.map((m) => (
                      <li key={m}>{m}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : dirty ? (
              <span className="text-slate-600">You have unsaved changes.</span>
            ) : (
              <span className="text-slate-500">All changes saved.</span>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" disabled={!dirty || saving} onClick={() => {
                // Fresh item keys remount every field, including local text state.
                setState(toState(JSON.parse(baseline) as ParsedCv));
                setGeneration((g) => g + 1);
                setMessage(null);
              }}>
              Discard changes
            </Button>
            <Button disabled={!dirty || saving} onClick={() => void save()}>
              {saving ? "Saving..." : "Save changes"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
