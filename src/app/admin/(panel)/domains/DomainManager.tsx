"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { addDomainAction, checkDomainsAction, makePrimaryDomainAction, removeDomainAction } from "../../domain-actions";
import { Field, useAction } from "../../ui";
import { counterpart, dnsInstructions, normaliseDomain, overall, type Check, type Targets } from "@/lib/domains";

const ICON = { ok: "✓", warn: "!", fail: "✗", unknown: "?" } as const;
const BADGE = { ok: "adm-ok", warn: "adm-warn", fail: "adm-bad", unknown: "" } as const;

export function DomainManager({ storeName, domains, targets }: { storeName: string; domains: string[]; targets: Targets }) {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [results, setResults] = useState<Record<string, Check[]>>({});
  const { pending, run, toast } = useAction();
  const typed = normaliseDomain(input);
  const configured = Boolean(targets.cname || targets.ips.length);

  return (
    <>
      <div className="adm-h"><div><h1>Domains for {storeName}</h1><p>Connect your own web addresses to this store. The first domain is the main one. A domain can only point at one store.</p></div></div>

      <section className="adm-card"><h2>Add a domain</h2>
        <form onSubmit={(e) => { e.preventDefault(); run(() => addDomainAction(input), "Domain added. Now follow the steps below.", () => { setInput(""); router.refresh(); }); }} style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 260px" }}><Field label="Domain" hint={input && !typed ? "That doesn't look like a domain yet." : typed && typed !== input.trim() ? `Will be saved as ${typed}` : "For example shop.example.com or example.com"}><input className="adm-in" value={input} onChange={(e) => setInput(e.target.value)} placeholder="shop.example.com" /></Field></div>
          <button className="adm-btn adm-pri" disabled={pending || !typed}>Add domain</button>
          {toast}
        </form>
      </section>

      {domains.length === 0 ? <section className="adm-card"><p className="adm-hint">No domains yet. Until one is added this store only answers on the platform&apos;s own addresses.</p></section> : (
        <>
          <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 12 }}>
            <button className="adm-btn adm-pri" disabled={pending} onClick={() => run(async () => { const r = await checkDomainsAction(); if (r.ok) setResults(r.results); return r; }, "Checked. See the results below.")}>{pending ? "Checking..." : "Check all domains"}</button>
            <span className="adm-hint">Looks up each domain&apos;s DNS and visits it over HTTPS.</span>
          </div>
          {domains.map((d, i) => {
            const checks = results[d];
            const state = checks ? overall(checks) : null;
            const records = dnsInstructions(d, targets);
            return (
              <section key={d} className="adm-card" data-domain={d}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                  <h2 style={{ margin: 0 }}>{d} {i === 0 ? <span className="adm-badge adm-ok">Main</span> : null} {state ? <span className={`adm-badge ${state === "live" ? "adm-ok" : state === "problem" ? "adm-bad" : "adm-warn"}`}>{state === "live" ? "Live" : state === "problem" ? "Problem" : "Waiting"}</span> : null}</h2>
                  <div style={{ display: "flex", gap: 8 }}>
                    {i > 0 ? <button className="adm-btn" disabled={pending} onClick={() => run(() => makePrimaryDomainAction(d), `${d} is now the main domain.`, () => router.refresh())}>Make main</button> : null}
                    <button className="adm-btn adm-danger" disabled={pending} onClick={() => { if (confirm(`Remove ${d} from this store? Visitors to it will see "Not found".`)) run(() => removeDomainAction(d), "Domain removed.", () => router.refresh()); }}>Remove</button>
                  </div>
                </div>

                <h3 style={{ margin: "14px 0 4px", fontSize: 14 }}>1. At your DNS provider</h3>
                {configured && records.length ? (
                  <table className="adm-table"><thead><tr><th>Type</th><th>Host / name</th><th>Value</th></tr></thead><tbody>
                    {records.map((r) => <tr key={r.type + r.host + r.value}><td><b>{r.type}</b></td><td><code>{r.host}</code></td><td><code>{r.value}</code><div className="adm-hint">{r.note}</div></td></tr>)}
                  </tbody></table>
                ) : <p className="adm-hint">Add the record your host gives you (in Bolt: Hosting, then Domains, then add <b>{d}</b>). To show the exact records here, set <code>PLATFORM_DNS_TARGET</code> (and <code>PLATFORM_DNS_IPS</code> for bare domains) in the app&apos;s settings.</p>}
                <p className="adm-hint">Tip: also add <b>{counterpart(d)}</b> and send one of them to the other, so both addresses work.</p>

                <h3 style={{ margin: "14px 0 4px", fontSize: 14 }}>2. At your host</h3>
                <p className="adm-hint" style={{ marginTop: 0 }}>Add <b>{d}</b> in your host&apos;s dashboard so it issues the HTTPS certificate. This platform only answers for domains listed here.</p>

                <h3 style={{ margin: "14px 0 4px", fontSize: 14 }}>3. Checklist</h3>
                {!checks ? <p className="adm-hint">Press &quot;Check all domains&quot; once the steps above are done.</p> : (
                  <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 6 }}>
                    {checks.map((c) => <li key={c.id} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}><span className={`adm-badge ${BADGE[c.status]}`} aria-label={c.status} style={{ minWidth: 24, textAlign: "center" }}>{ICON[c.status]}</span><span><b>{c.label}</b><div className="adm-hint" style={{ marginTop: 0 }}>{c.detail}</div></span></li>)}
                  </ul>
                )}
              </section>
            );
          })}
        </>
      )}
    </>
  );
}
