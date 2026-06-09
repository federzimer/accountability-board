"use client";

import { useState } from "react";

// Copies the given text to the clipboard with brief confirmation.
export default function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // clipboard blocked — no-op; the URL is still visible to select manually
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      className="bg-[#3d1c1c] hover:bg-[#5a3535] text-white rounded-lg px-4 py-2 text-sm font-semibold tracking-[0.5px] transition-colors cursor-pointer shrink-0"
    >
      {copied ? "Copied ✓" : label}
    </button>
  );
}
