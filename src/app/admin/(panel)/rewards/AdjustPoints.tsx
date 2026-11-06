"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { adjustPointsAction } from "../../reward-actions";
import { Field, useAction } from "../../ui";

export function AdjustPoints() {
  const router = useRouter();
  const [email, setEmail] = useState(""), [points, setPoints] = useState(""), [note, setNote] = useState("");
  const { pending, run, toast } = useAction();
  return (
    <section className="adm-card">
      <h2>Add or remove points</h2>
      <form onSubmit={(e) => { e.preventDefault(); run(() => adjustPointsAction(email, Number(points), note), "Points updated", () => { setEmail(""); setPoints(""); setNote(""); router.refresh(); }); }}>
        <div className="adm-grid adm-g3">
          <Field label="Fan's email"><input className="adm-in" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></Field>
          <Field label="Points" hint="Use a minus sign to take points away."><input className="adm-in" type="number" value={points} onChange={(e) => setPoints(e.target.value)} required /></Field>
          <Field label="Reason (shown to the fan)"><input className="adm-in" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Convention bonus" /></Field>
        </div>
        <div style={{ marginTop: 14, display: "flex", gap: 10, alignItems: "center" }}><button className="adm-btn adm-pri" disabled={pending}>{pending ? "Saving..." : "Update points"}</button>{toast}</div>
      </form>
    </section>
  );
}
