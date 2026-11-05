"use client";
import { useRef, useState } from "react";
import { deleteMediaAction, updateMediaAltAction } from "../../actions";
import { useAction } from "../../ui";
import { uploadImage } from "../../upload";
import type { MediaItem } from "@/lib/admin/repo";

export function MediaLibrary({ initial }: { initial: MediaItem[] }) {
  const [items, setItems] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const { run, toast } = useAction();

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true); setErr("");
    for (const f of Array.from(files)) {
      const r = await uploadImage(f, "");
      if (r.ok) setItems((x) => [r.item, ...x]); else setErr(r.error);
    }
    setBusy(false);
  }
  return (
    <>
      <div className="adm-h"><div><h1>Media library</h1><p>Images are resized to 2000px and converted to WebP in your browser before upload. Add alt text: it is used in search and by screen readers.</p></div>
        <div><input ref={input} type="file" accept="image/*" multiple hidden onChange={(e) => { upload(e.target.files); e.target.value = ""; }} />
          <button className="adm-btn adm-bolt" disabled={busy} onClick={() => input.current?.click()}>{busy ? "Uploading..." : "Upload images"}</button></div></div>
      {err ? <p className="adm-toast err">{err}</p> : null}{toast}
      {items.length === 0 ? <div className="adm-card"><p className="adm-hint">No images yet. Upload product photos to start.</p></div> : (
        <div className="adm-grid" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(230px,1fr))" }}>
          {items.map((m) => (
            <div key={m.id} className="adm-card" style={{ margin: 0, padding: 12 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={m.url} alt={m.alt} style={{ width: "100%", aspectRatio: "1", objectFit: "cover", borderRadius: 8, background: "#eceef2" }} loading="lazy" />
              <input className="adm-in" style={{ marginTop: 10 }} aria-label="Alt text" placeholder="Alt text" defaultValue={m.alt}
                onBlur={(e) => { const alt = e.target.value; if (alt !== m.alt) run(() => updateMediaAltAction(m.id, alt), "Alt text saved", () => setItems((x) => x.map((i) => (i.id === m.id ? { ...i, alt } : i)))); }} />
              <div className="adm-hint">{m.width && m.height ? `${m.width}×${m.height}` : ""}{m.bytes ? ` · ${Math.round(m.bytes / 1024)} KB` : ""}</div>
              <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                <button className="adm-btn" onClick={() => navigator.clipboard?.writeText(m.url)}>Copy URL</button>
                <button className="adm-btn adm-danger" onClick={() => { if (confirm("Delete this image? Products using it will show a broken image.")) run(() => deleteMediaAction(m.id), "Deleted", () => setItems((x) => x.filter((i) => i.id !== m.id))); }}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
