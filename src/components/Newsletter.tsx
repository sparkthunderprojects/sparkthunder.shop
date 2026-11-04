"use client";

import { useState } from "react";

export function Newsletter() {
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = String(new FormData(e.currentTarget).get("email") ?? "");
    setState("sending");
    try {
      const res = await fetch("/api/subscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
      const data = await res.json().catch(() => ({}));
      if (res.ok) { setState("done"); setMessage("You’re on the list. We’ll email you when new merchandise drops."); }
      else { setState("error"); setMessage(data.error ?? "Something went wrong. Please try again."); }
    } catch {
      setState("error"); setMessage("Couldn’t reach the server. Please try again.");
    }
  }

  return (
    <section id="newsletter" aria-labelledby="nl-h" className="bg-bolt text-ink">
      <div className="grid gap-8 px-(--gutter) py-16 md:grid-cols-2 md:items-center">
        <div>
          <h2 id="nl-h" className="display text-[clamp(2.75rem,6vw,5.5rem)]">First access to every drop</h2>
          <p className="serif mt-4 max-w-md text-xl">New merchandise from Knightverge, Grim Gala and the rest of the universe, straight to your inbox.</p>
        </div>
        <div>
          {state === "done" ? (
            <p role="status" className="serif text-2xl font-semibold">{message}</p>
          ) : (
            <form onSubmit={onSubmit} className="flex max-w-xl flex-col gap-3 sm:flex-row" noValidate>
              <label htmlFor="nl-email" className="sr-only">Email address</label>
              <input id="nl-email" name="email" type="email" required autoComplete="email" placeholder="Your email address" className="flex-1 border-2 border-ink bg-paper px-4 py-3.5" />
              <button disabled={state === "sending"} className="btn btn-ink">{state === "sending" ? "Joining…" : "Join the list"}</button>
            </form>
          )}
          {state === "error" && <p role="alert" className="mt-3 font-bold">{message}</p>}
          <p className="mt-3 max-w-xl text-sm">We’ll only email you about new releases. Unsubscribe any time.</p>
        </div>
      </div>
    </section>
  );
}
