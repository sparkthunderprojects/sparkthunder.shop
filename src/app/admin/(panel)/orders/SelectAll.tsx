"use client";
export function SelectAll() {
  return <input type="checkbox" aria-label="Select all orders on this page" onChange={(e) => { e.currentTarget.form?.querySelectorAll<HTMLInputElement>('input[name="id"]').forEach((b) => { b.checked = e.currentTarget.checked; }); }} />;
}
