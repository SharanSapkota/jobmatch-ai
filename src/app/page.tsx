import Link from "next/link";
import { ButtonLink } from "@/components/ui";
import { auth } from "@/auth";

const STEPS = [
  {
    title: "Upload your CV",
    body: "Upload a PDF or Word file. We extract your experience, education and skills, and you can review and correct everything.",
  },
  {
    title: "Discover relevant jobs",
    body: "Tell us the roles, locations and working style you want. We look for jobs that fit those preferences.",
  },
  {
    title: "Understand your match",
    body: "For each job, see which requirements your CV shows evidence for, which it does not, and where information is missing.",
  },
  {
    title: "Improve your CV",
    body: "Get specific suggestions based on your real experience, and generate a tailored version you can compare line by line with the original.",
  },
  {
    title: "Track applications",
    body: "Keep saved jobs, applications, interviews and outcomes in one place, and see what has worked for you so far.",
  },
];

export default async function LandingPage() {
  const session = await auth();
  const signedIn = Boolean(session?.user);

  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <span className="font-semibold text-slate-900">JobMatch AI</span>
          <nav className="flex items-center gap-2 text-sm">
            {signedIn ? (
              <ButtonLink href="/dashboard" variant="secondary">
                Go to dashboard
              </ButtonLink>
            ) : (
              <>
                <Link href="/login" className="rounded-md px-3 py-2 font-medium text-slate-700 hover:bg-slate-100">
                  Sign in
                </Link>
                <ButtonLink href="/register" variant="secondary">
                  Create account
                </ButtonLink>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto max-w-5xl px-4 pb-12 pt-16 sm:pt-24">
          <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
            Find the jobs that actually fit you.
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-slate-600">
            Upload your CV, discover relevant jobs, understand your gaps, and tailor your application before you apply.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href={signedIn ? "/cv" : "/register"} className="px-5 py-2.5 text-base">
              Analyze my CV
            </ButtonLink>
          </div>
        </section>

        <section aria-labelledby="how-it-works" className="border-t border-slate-200 bg-white">
          <div className="mx-auto max-w-5xl px-4 py-14">
            <h2 id="how-it-works" className="text-lg font-semibold text-slate-900">
              How it works
            </h2>
            <ol className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {STEPS.map((step, i) => (
                <li key={step.title} className="rounded-lg border border-slate-200 p-5">
                  <span className="text-xs font-semibold uppercase tracking-wide text-blue-700">Step {i + 1}</span>
                  <h3 className="mt-1 font-semibold text-slate-900">{step.title}</h3>
                  <p className="mt-2 text-sm text-slate-600">{step.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 py-12">
          <h2 className="text-lg font-semibold text-slate-900">What we will and will not do</h2>
          <ul className="mt-4 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
            <li>We only use facts from your CV. We never invent skills, employers or results.</li>
            <li>If your CV does not show evidence for a requirement, we say so.</li>
            <li>The compatibility score is an internal estimate, not a prediction of being hired.</li>
            <li>We never apply to a job on your behalf. You decide.</li>
          </ul>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
        JobMatch AI. Your CV is private to your account and can be deleted at any time.
      </footer>
    </div>
  );
}
