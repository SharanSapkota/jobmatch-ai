"use client";

import { useActionState } from "react";
import { Alert, Button, Card, CardHeader, Field, Input, Select, Textarea } from "@/components/ui";
import { updateProfileAction, type ProfileFormState } from "./actions";

export interface ProfileValues {
  headline: string;
  summary: string;
  yearsExperience: string;
  location: string;
  desiredRoles: string;
  preferredLocations: string;
  workMode: string;
  salaryExpectation: string;
  workAuthorization: string;
  languages: string;
  industries: string;
}

export function ProfileForm({ values }: { values: ProfileValues }) {
  const [state, action, pending] = useActionState<ProfileFormState, FormData>(updateProfileAction, { status: "idle" });
  return (
    <form action={action} className="space-y-6">
      {state.status === "error" ? <Alert tone="danger">{state.message}</Alert> : null}
      {state.status === "saved" ? <Alert tone="success">{state.message}</Alert> : null}

      <Card>
        <CardHeader title="About you" description="How you describe yourself professionally." />
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="Headline" htmlFor="headline" hint="For example: Registered nurse, Backend engineer, Sales manager.">
              <Input id="headline" name="headline" maxLength={200} defaultValue={values.headline} />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Summary" htmlFor="summary">
              <Textarea id="summary" name="summary" rows={4} maxLength={4000} defaultValue={values.summary} />
            </Field>
          </div>
          <Field label="Years of professional experience" htmlFor="yearsExperience">
            <Input id="yearsExperience" name="yearsExperience" type="number" min={0} max={70} defaultValue={values.yearsExperience} />
          </Field>
          <Field label="Current location" htmlFor="location">
            <Input id="location" name="location" maxLength={200} defaultValue={values.location} />
          </Field>
        </div>
      </Card>

      <Card>
        <CardHeader title="Job preferences" description="Used to find and rank jobs for you. Separate multiple values with commas." />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Target roles" htmlFor="desiredRoles" hint="For example: Product Designer, UX Designer">
            <Input id="desiredRoles" name="desiredRoles" defaultValue={values.desiredRoles} />
          </Field>
          <Field label="Preferred locations" htmlFor="preferredLocations">
            <Input id="preferredLocations" name="preferredLocations" defaultValue={values.preferredLocations} />
          </Field>
          <Field label="Work mode" htmlFor="workMode">
            <Select id="workMode" name="workMode" defaultValue={values.workMode}>
              <option value="ANY">No preference</option>
              <option value="REMOTE">Remote</option>
              <option value="HYBRID">Hybrid</option>
              <option value="ONSITE">On-site</option>
            </Select>
          </Field>
          <Field label="Salary expectation" htmlFor="salaryExpectation" hint="Free text, e.g. 55,000-65,000 EUR per year">
            <Input id="salaryExpectation" name="salaryExpectation" maxLength={200} defaultValue={values.salaryExpectation} />
          </Field>
          <Field label="Work authorization" htmlFor="workAuthorization" hint="For example: EU citizen, needs visa sponsorship">
            <Input id="workAuthorization" name="workAuthorization" maxLength={500} defaultValue={values.workAuthorization} />
          </Field>
          <Field label="Languages" htmlFor="languages" hint="For example: English (fluent), Spanish (basic)">
            <Input id="languages" name="languages" defaultValue={values.languages} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Industries" htmlFor="industries">
              <Input id="industries" name="industries" defaultValue={values.industries} />
            </Field>
          </div>
        </div>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving..." : "Save profile"}
        </Button>
      </div>
    </form>
  );
}
