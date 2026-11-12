"use client";
import { useRef, useState } from "react";
import type { MediaItem } from "@/lib/admin/repo";
import { uploadImage } from "./upload";

/** Modal to choose from the library or upload a new image. Calls onPick with the chosen item. */
export function MediaPicker({ media, onPick, onClose, trim = false }: { media: MediaItem[]; onPick: (m: MediaItem) => void; onClose: () => void; /** Crop uploads to the visible figure (for cut-out portraits on transparent backgrounds). */ trim?: boolean }) {
  const [items, setItems] = useState(media);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const file = useRef<HTMLInputElement>(null);
  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true); setErr("");
    for (const f of Array.from(files)) {
      const r = await uploadImage(f, "", { trim });
      if (r.ok) setItems((x) => [r.item, ...x]); else setErr(r.error);
    }
    setBusy(false);
  }
  return (
    <div className="adm-modal" role="dialog" aria-modal="true" aria-label="Choose an image" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 14, alignItems: "center" }}>
          <b style={{ fontSize: 16 }}>Image library</b>
          <span style={{ display: "flex", gap: 8 }}>
            <input ref={file} type="file" accept="image/*" multiple hidden onChange={(e) => upload(e.target.files)} />
            <button type="button" className="adm-btn adm-bolt" disabled={busy} onClick={() => file.current?.click()}>{busy ? "Uploading..." : "Upload images"}</button>
            <button type="button" className="adm-btn" onClick={onClose}>Close</button>
          </span>
        </div>
        {err ? <p className="adm-toast err">{err}</p> : null}
        {items.length === 0 ? <p className="adm-hint">No images yet. Upload your first photo.</p> : (
          <div className="adm-mgrid">
            {items.map((m) => (
              <button key={m.id} type="button" className="adm-mitem" aria-pressed="false" onClick={() => onPick(m)}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={m.url} alt={m.alt || ""} loading="lazy" />
                <span style={{ display: "block", padding: "6px 8px", fontSize: 11, color: "#6b6f7b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.alt || "No alt text"}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
