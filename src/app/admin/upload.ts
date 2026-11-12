"use client";
import { uploadMediaAction } from "./actions";
import type { MediaItem } from "@/lib/admin/repo";

/** Resize in the browser and re-encode as WebP before upload, so storage stays small and pages stay fast. */
/** Where the visible (non-transparent) pixels are, found on a small copy so huge canvases stay cheap. Null when the image is fully opaque or empty. */
function visibleBox(bmp: ImageBitmap): { x: number; y: number; w: number; h: number } | null {
  const s = Math.min(1, 800 / Math.max(bmp.width, bmp.height));
  const tw = Math.max(1, Math.round(bmp.width * s)), th = Math.max(1, Math.round(bmp.height * s));
  const c = document.createElement("canvas"); c.width = tw; c.height = th;
  const g = c.getContext("2d", { willReadFrequently: true })!; g.drawImage(bmp, 0, 0, tw, th);
  const d = g.getImageData(0, 0, tw, th).data;
  let x0 = tw, y0 = th, x1 = -1, y1 = -1;
  for (let y = 0; y < th; y++) for (let x = 0; x < tw; x++) if (d[(y * tw + x) * 4 + 3] > 12) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  if (x1 < 0 || (x0 === 0 && y0 === 0 && x1 === tw - 1 && y1 === th - 1)) return null;
  const pad = 2; // a hair of margin at the thumbnail scale
  const nx = Math.max(0, x0 - pad), ny = Math.max(0, y0 - pad), mx = Math.min(tw - 1, x1 + pad), my = Math.min(th - 1, y1 + pad);
  return { x: Math.round(nx / s), y: Math.round(ny / s), w: Math.min(bmp.width, Math.round((mx - nx + 1) / s)), h: Math.min(bmp.height, Math.round((my - ny + 1) / s)) };
}

async function toWebp(file: File, maxEdge = 2000, trim = false): Promise<{ blob: Blob; width: number; height: number }> {
  const bmp = await createImageBitmap(file);
  const box = (trim ? visibleBox(bmp) : null) ?? { x: 0, y: 0, w: bmp.width, h: bmp.height };
  const scale = Math.min(1, maxEdge / Math.max(box.w, box.h));
  const width = Math.max(1, Math.round(box.w * scale)), height = Math.max(1, Math.round(box.h * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width; canvas.height = height;
  canvas.getContext("2d")!.drawImage(bmp, box.x, box.y, box.w, box.h, 0, 0, width, height);
  const blob: Blob | null = await new Promise((r) => canvas.toBlob(r, "image/webp", 0.86));
  if (!blob) throw new Error("This browser could not convert the image.");
  return { blob, width, height };
}

export async function uploadImage(file: File, alt: string, opts: { trim?: boolean } = {}): Promise<{ ok: true; item: MediaItem } | { ok: false; error: string }> {
  try {
    const { blob, width, height } = await toWebp(file, 2000, opts.trim === true);
    const form = new FormData();
    form.set("file", new File([blob], file.name.replace(/\.[a-z0-9]+$/i, "") + ".webp", { type: "image/webp" }));
    form.set("name", file.name);
    form.set("alt", alt);
    form.set("width", String(width));
    form.set("height", String(height));
    return await uploadMediaAction(form);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Upload failed." };
  }
}
