import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };
export const maxDuration = 60;

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <main className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      {/* Brand panel */}
      <section className="relative hidden overflow-hidden bg-ink-950 lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        <div aria-hidden className="absolute -right-40 -top-40 size-[520px] rounded-full bg-brand-600/25 blur-3xl" />
        <div aria-hidden className="absolute -bottom-48 -left-24 size-[420px] rounded-full bg-brand-700/20 blur-3xl" />

        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/flodraulic-wordmark.png" alt="Flodraulic" className="h-9 w-auto" />
        </div>

        <div className="relative max-w-lg">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-brand-500">Electrical &amp; Controls</p>
          <h1 className="text-4xl font-semibold leading-tight tracking-tight text-white">
            From quote to shipped panel, in one place.
          </h1>
          <p className="mt-4 text-base leading-relaxed text-gray-400">
            Quotes, BOMs, revision control, build packages, QC and the part number ledger — replacing the spreadsheets
            the team runs on every day.
          </p>
          <dl className="mt-10 grid grid-cols-3 gap-6 border-t border-white/10 pt-6">
            {[
              ["Quote", "Auto-numbered with full revision history"],
              ["Build", "MTR package, F5 & QC checklist"],
              ["Parts", "Searchable PB ledger"],
            ].map(([t, d]) => (
              <div key={t}>
                <dt className="text-sm font-semibold text-white">{t}</dt>
                <dd className="mt-1 text-xs leading-relaxed text-gray-500">{d}</dd>
              </div>
            ))}
          </dl>
        </div>

        <p className="relative text-xs text-gray-600">FloDraulic Controls Ltd. · Georgetown, Ontario</p>
      </section>

      {/* Form */}
      <section className="flex items-center justify-center bg-white px-6 py-12">
        <div className="w-full max-w-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/flodraulic-mark.png" alt="" className="mb-8 h-12 w-auto lg:hidden" />
          <h2 className="text-2xl font-semibold tracking-tight text-gray-900">Sign in</h2>
          <p className="mt-1.5 text-sm text-gray-500">Welcome back. Use your Controls Hub account.</p>
          <LoginForm next={next ?? "/"} />
        </div>
      </section>
    </main>
  );
}
