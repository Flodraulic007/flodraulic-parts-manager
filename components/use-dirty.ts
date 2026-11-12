"use client";

import { useEffect, useRef, useState } from "react";

/** Local editable copy of server data + dirty tracking, Ctrl/Cmd+S and unload warning. */
export function useEditable<T>(initial: T, onSave: (v: T) => Promise<boolean>) {
  const [value, setValue] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [saving, setSaving] = useState(false);
  const dirty = JSON.stringify(value) !== JSON.stringify(saved);
  const ref = useRef({ value, dirty, saving });
  ref.current = { value, dirty, saving };

  // Server data changed (e.g. after router.refresh) and we have no local edits → adopt it.
  const initialKey = JSON.stringify(initial);
  useEffect(() => {
    if (!ref.current.dirty) {
      setValue(initial);
      setSaved(initial);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialKey]);

  const save = async () => {
    if (!ref.current.dirty || ref.current.saving) return;
    setSaving(true);
    const v = ref.current.value;
    const ok = await onSave(v);
    setSaving(false);
    if (ok) setSaved(v);
  };
  const saveRef = useRef(save);
  saveRef.current = save;

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        saveRef.current();
      }
    };
    const unload = (e: BeforeUnloadEvent) => {
      if (ref.current.dirty) e.preventDefault();
    };
    window.addEventListener("keydown", key);
    window.addEventListener("beforeunload", unload);
    return () => {
      window.removeEventListener("keydown", key);
      window.removeEventListener("beforeunload", unload);
    };
  }, []);

  return { value, setValue, dirty, saving, save, reset: () => setValue(saved) };
}
