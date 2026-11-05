"use client";
import { uploadMediaAction } from "./actions";
import type { MediaItem } from "@/lib/admin/repo";

/** Resize in the browser and re-encode as WebP before upload, so storage stays small and pages stay fast. */
async function toWebp(file: File, maxEdge = 2000): Promise<{ blob: Blob; width: number; height: number }> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, maxEdge / Math.max(bmp.width, bmp.height));
  const width = Math.round(bmp.width * scale), height = Math.round(bmp.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width; canvas.height = height;
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, width, height);
  const blob: Blob | null = await new Promise((r) => canvas.toBlob(r, "image/webp", 0.86));
  if (!blob) throw new Error("This browser could not convert the image.");
  return { blob, width, height };
}

export async function uploadImage(file: File, alt: string): Promise<{ ok: true; item: MediaItem } | { ok: false; error: string }> {
  try {
    const { blob, width, height } = await toWebp(file);
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
