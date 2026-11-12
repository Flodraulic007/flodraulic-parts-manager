import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { store } from "@/lib/store";
import { requireUser } from "@/lib/auth";
import { uid } from "@/lib/format";
import type { Part } from "@/lib/types";

// Vercel functions accept request bodies up to ~4.5 MB.
const MAX_BYTES = 4 * 1024 * 1024;

/** Upload one or more documents (datasheets, manuals, spec sheets) to a part. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const part = await store().get<Part>("parts", id);
  if (!part) return NextResponse.json({ error: "Part not found" }, { status: 404 });

  const form = await request.formData();
  const files = form.getAll("file").filter((f): f is File => f instanceof File && f.size > 0);
  if (!files.length) return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  const tooBig = files.find((f) => f.size > MAX_BYTES);
  if (tooBig) return NextResponse.json({ error: `${tooBig.name} is larger than 4 MB` }, { status: 413 });

  part.docs ??= [];
  for (const f of files) {
    const docId = uid();
    await store().putFile(docId, Buffer.from(await f.arrayBuffer()), f.type || "application/octet-stream");
    part.docs.push({ id: docId, name: f.name, size: f.size, type: f.type, uploadedAt: new Date().toISOString(), uploadedBy: user.name });
  }
  await store().put("parts", part);
  revalidatePath("/parts");
  return NextResponse.json({ docs: part.docs });
}
