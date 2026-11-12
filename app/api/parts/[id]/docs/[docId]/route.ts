import { NextResponse } from "next/server";
import { store } from "@/lib/store";
import type { Part } from "@/lib/types";

/** Open a part document in the browser (PDFs and images display inline). */
export async function GET(_: Request, { params }: { params: Promise<{ id: string; docId: string }> }) {
  const { id, docId } = await params;
  const part = await store().get<Part>("parts", id);
  const meta = part?.docs?.find((d) => d.id === docId);
  if (!meta) return NextResponse.json({ error: "Document not found" }, { status: 404 });
  const file = await store().getFile(docId);
  if (!file) return NextResponse.json({ error: "File missing" }, { status: 404 });
  return new NextResponse(new Uint8Array(file.data), {
    headers: {
      "Content-Type": file.type,
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(meta.name)}`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
