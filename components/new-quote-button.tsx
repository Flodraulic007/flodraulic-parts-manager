"use client";

import { Plus } from "lucide-react";
import { Button } from "./ui";

export function NewQuoteButton({ label = "New Quote" }: { label?: string }) {
  return (
    <Button variant="primary" icon={<Plus className="size-4" />} onClick={() => window.dispatchEvent(new Event("fd:new-quote"))}>
      {label}
    </Button>
  );
}
