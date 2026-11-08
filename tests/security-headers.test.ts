import { describe, expect, it } from "vitest";
import { contentSecurityPolicy, securityHeaders } from "@/lib/security-headers";

const get = (h: { key: string; value: string }[], k: string) => h.find((x) => x.key === k)?.value;

describe("security headers", () => {
  it("locks down plugins, base tags, forms and framing", () => {
    const csp = contentSecurityPolicy();
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).toContain("form-action 'self'");
    expect(csp).toContain("frame-ancestors 'self'");
    expect(csp).toContain("default-src 'self'");
  });
  it("only allows scripts from the site and the two consent-gated analytics hosts", () => {
    const script = contentSecurityPolicy().split("; ").find((d) => d.startsWith("script-src"))!;
    const hosts = script.split(" ").filter((t) => t.startsWith("http"));
    expect(hosts.sort()).toEqual(["https://connect.facebook.net", "https://www.googletagmanager.com"]);
    expect(script).not.toMatch(/\*/);
  });
  it("never lets the admin be framed", () => {
    const h = securityHeaders({ admin: true });
    expect(get(h, "X-Frame-Options")).toBe("DENY");
    expect(get(h, "Content-Security-Policy")).toContain("frame-ancestors 'none'");
  });
  it("sends the basics on every response", () => {
    const h = securityHeaders();
    expect(get(h, "X-Content-Type-Options")).toBe("nosniff");
    expect(get(h, "Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    expect(get(h, "Permissions-Policy")).toContain("camera=()");
  });
  it("can be switched to report-only or off without a redeploy of code", () => {
    process.env.SPARK_CSP = "report-only";
    expect(get(securityHeaders(), "Content-Security-Policy-Report-Only")).toBeTruthy();
    expect(get(securityHeaders(), "Content-Security-Policy")).toBeUndefined();
    process.env.SPARK_CSP = "off";
    expect(securityHeaders().some((h) => h.key.startsWith("Content-Security-Policy"))).toBe(false);
    delete process.env.SPARK_CSP;
  });
});
