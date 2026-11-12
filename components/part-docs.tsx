"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { FileText, Loader2, Trash2, Upload } from "lucide-react";
import type { PartDoc } from "@/lib/types";
import { deletePartDoc } from "@/lib/actions";
import { date } from "@/lib/format";
import { run, toast } from "./toast";

const size = (n: number) => (n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

/** Datasheets, manuals and spec sheets attached to a part. */
export function PartDocs({ partId, docs: initial }: { partId: string; docs: PartDoc[] }) {
  const router = useRouter();
  const [docs, setDocs] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const upload = async (files: FileList | File[]) => {
    const list = [...files];
    if (!list.length) return;
    const big = list.find((f) => f.size > 4 * 1024 * 1024);
    if (big) return toast(`${big.name} is larger than 4 MB`, "error");
    setBusy(true);
    const fd = new FormData();
    list.forEach((f) => fd.append("file", f));
    try {
      const r = await fetch(`/api/parts/${encodeURIComponent(partId)}/docs`, { method: "POST", body: fd });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Upload failed");
      setDocs(j.docs);
      toast(`Uploaded ${list.length} file${list.length > 1 ? "s" : ""}`);
      router.refresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Upload failed", "error");
    }
    setBusy(false);
  };

  return (
    <div>
      <div className="mb-1.5 text-[13px] font-medium text-gray-700">Documents</div>
      {docs.length > 0 && (
        <ul className="mb-2 divide-y divide-gray-100 rounded-lg border border-gray-200">
          {docs.map((d) => (
            <li key={d.id} className="flex items-center gap-3 px-3 py-2 text-sm">
              <FileText className="size-4 shrink-0 text-sky-600" />
              <a href={`/api/parts/${encodeURIComponent(partId)}/docs/${d.id}`} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate font-medium text-gray-800 hover:text-brand-700">
                {d.name}
              </a>
              <span className="shrink-0 text-xs text-gray-400">
                {size(d.size)} · {d.uploadedBy} · {date(d.uploadedAt)}
              </span>
              <button
                type="button"
                className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
                aria-label={`Delete ${d.name}`}
                onClick={async () => {
                  if (!confirm(`Delete ${d.name}?`)) return;
                  const r = await run(deletePartDoc(partId, d.id), "Document deleted");
                  if (r.ok) {
                    setDocs((x) => x.filter((y) => y.id !== d.id));
                    router.refresh();
                  }
                }}
              >
                <Trash2 className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <button
        type="button"
        onClick={() => input.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          upload(e.dataTransfer.files);
        }}
        className={`flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed px-3 py-4 text-sm transition ${
          drag ? "border-brand-500 bg-brand-50 text-brand-700" : "border-gray-300 text-gray-500 hover:border-gray-400 hover:bg-gray-50"
        }`}
      >
        {busy ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
        {busy ? "Uploading…" : "Drop datasheets, manuals or spec sheets here, or click to choose (max 4 MB each)"}
      </button>
      <input ref={input} type="file" multiple hidden onChange={(e) => e.target.files && upload(e.target.files)} />
    </div>
  );
}
