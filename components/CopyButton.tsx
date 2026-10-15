"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "./ui/Button";

/** Copies `text` exactly; shows "Copied" (role=status) for 2 s (R7.8). */
export function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setState("copied");
    } catch {
      setState("failed");
    }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setState("idle"), 2000);
  };

  return (
    <div className="flex items-center gap-2">
      <Button onClick={copy} className="px-2.5 py-1 text-xs">
        {state === "copied" ? <Check className="size-3.5" aria-hidden /> : <Copy className="size-3.5" aria-hidden />}
        {label}
      </Button>
      <span role="status" className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
        {state === "copied" ? "Copied" : state === "failed" ? "Copy failed. Select the text manually." : ""}
      </span>
    </div>
  );
}
