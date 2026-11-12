import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, verifySession } from "./session";
import { resolveUser } from "./data";
import type { Role, SessionUser } from "./types";

export async function getSession() {
  const jar = await cookies();
  return verifySession(jar.get(SESSION_COOKIE)?.value);
}

/** Signed-in user, with their current role from the database. */
export async function requireUser(): Promise<SessionUser> {
  const s = await getSession();
  if (!s) redirect("/login");
  return resolveUser(s.u, s.n);
}

/** For pages: send users without the role back to the overview. */
export async function requireRole(...roles: Role[]) {
  const u = await requireUser();
  if (!roles.includes(u.role)) redirect("/");
  return u;
}
