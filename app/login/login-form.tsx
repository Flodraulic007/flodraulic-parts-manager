"use client";

import { useActionState } from "react";
import { Loader2, Lock, User } from "lucide-react";
import { login } from "@/lib/actions";

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(login, {});
  return (
    <form action={action} className="mt-8 space-y-4">
      <input type="hidden" name="next" value={next} />
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-gray-700">Username</span>
        <div className="relative">
          <User className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
          <input key={state?.username ?? ""} name="username" defaultValue={state?.username ?? ""} autoComplete="username" autoFocus={!state?.username} required className="field h-11 pl-9" />
        </div>
      </label>
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-gray-700">Password</span>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
          <input name="password" type="password" autoComplete="current-password" autoFocus={!!state?.username} required className="field h-11 pl-9" />
        </div>
      </label>
      {state?.error && (
        <p role="alert" className="rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-700 ring-1 ring-inset ring-brand-600/20">
          {state.error}
        </p>
      )}
      <button
        disabled={pending}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-brand-600 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700 disabled:opacity-60"
      >
        {pending && <Loader2 className="size-4 animate-spin" />}
        Sign in
      </button>
    </form>
  );
}
