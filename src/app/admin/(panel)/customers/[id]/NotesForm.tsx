"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { saveCustomerNoteAction } from "../../../customer-actions";
import { Field, useAction } from "../../../ui";

export function NotesForm({ id, tags: t0, notes: n0 }: { id: string; tags: string; notes: string }) {
  const router = useRouter();
  const [tags, setTags] = useState(t0), [notes, setNotes] = useState(n0);
  const { pending, run, toast } = useAction();
  return (
    <form onSubmit={(e) => { e.preventDefault(); run(() => saveCustomerNoteAction(id, tags, notes), "Saved", () => router.refresh()); }}>
      <Field label="Tags" hint="Separate with commas."><input className="adm-in" value={tags} onChange={(e) => setTags(e.target.value)} /></Field>
      <Field label="Notes"><textarea className="adm-in" rows={5} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
      <div style={{ marginTop: 12, display: "flex", gap: 10, alignItems: "center" }}><button className="adm-btn adm-pri" disabled={pending}>{pending ? "Saving..." : "Save"}</button>{toast}</div>
    </form>
  );
}
