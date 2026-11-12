import { describe, expect, it } from "vitest";
import { checkDomain, counterpart, dnsInstructions, normaliseDomain, overall, readTargets, type Resolver } from "@/lib/domains";

describe("domain helper", () => {
  it("cleans and validates domains", () => {
    expect(normaliseDomain(" https://Shop.Example.COM/path?x=1 ")).toBe("shop.example.com");
    expect(normaliseDomain("example.co.uk:8080")).toBe("example.co.uk");
    for (const bad of ["", "localhost", "nodots", "a b.com", "-x.com", "x..com", "1.2.3.4", "foo.test", "foo.localhost", "a".repeat(64) + ".com"]) expect(normaliseDomain(bad), bad).toBeNull();
  });
  it("finds the other form", () => { expect(counterpart("example.com")).toBe("www.example.com"); expect(counterpart("www.example.com")).toBe("example.com"); });
  it("reads targets from settings", () => {
    expect(readTargets({ PLATFORM_DNS_TARGET: "Edge.Host.com.", PLATFORM_DNS_IPS: "1.1.1.1, 2.2.2.2" })).toEqual({ cname: "edge.host.com", ips: ["1.1.1.1", "2.2.2.2"] });
    expect(readTargets({})).toEqual({ cname: "", ips: [] });
  });
  it("lists the records to add", () => {
    const t = { cname: "edge.host.com", ips: ["1.1.1.1"] };
    expect(dnsInstructions("example.com", t)).toEqual([{ type: "A", host: "@", value: "1.1.1.1", note: expect.any(String) }]);
    expect(dnsInstructions("www.example.com", t)[0]).toMatchObject({ type: "CNAME", host: "www", value: "edge.host.com" });
    expect(dnsInstructions("shop.example.com", t)[0]).toMatchObject({ type: "CNAME", host: "shop" });
    expect(dnsInstructions("shop.example.com", { cname: "", ips: [] })).toEqual([]);
  });

  const res = (o: Partial<Resolver>): Resolver => ({ cname: async () => [], a: async () => [], aaaa: async () => [], ping: async () => { throw Object.assign(new Error("x"), { code: "ECONNREFUSED" }); }, ...o });
  const t = { cname: "edge.host.com", ips: [] as string[] };
  it("reports a domain that is not set up yet", async () => {
    const c = await checkDomain("shop.example.com", "s1", t, res({}));
    expect(c.find((x) => x.id === "dns")!.status).toBe("fail"); expect(c.find((x) => x.id === "https")!.status).toBe("fail"); expect(overall(c)).toBe("pending");
  });
  it("reports a live domain", async () => {
    const c = await checkDomain("shop.example.com", "s1", t, res({ cname: async () => ["edge.host.com."], ping: async () => ({ store: "s1" }) }));
    expect(c.map((x) => x.status)).toEqual(["ok", "ok", "ok", "ok"]); expect(overall(c)).toBe("live");
  });
  it("flags a domain that belongs to another store", async () => {
    const c = await checkDomain("shop.example.com", "s1", t, res({ cname: async () => ["edge.host.com"], ping: async () => ({ store: "other" }) }));
    expect(c.find((x) => x.id === "store")!.status).toBe("fail"); expect(overall(c)).toBe("problem");
  });
  it("explains certificate problems and tolerates proxies", async () => {
    const c = await checkDomain("shop.example.com", "s1", t, res({ a: async () => ["9.9.9.9"], ping: async () => { throw Object.assign(new Error("x"), { code: "ERR_TLS_CERT_ALTNAME_INVALID" }); } }));
    expect(c.find((x) => x.id === "target")!.status).toBe("warn"); expect(c.find((x) => x.id === "https")!.detail).toMatch(/certificate/);
  });
  it("says so when the platform address is not configured", async () => {
    const c = await checkDomain("shop.example.com", "s1", { cname: "", ips: [] }, res({ a: async () => ["9.9.9.9"], ping: async () => ({ store: "s1" }) }));
    expect(c.find((x) => x.id === "target")!.status).toBe("unknown"); expect(overall(c)).toBe("live");
  });
  it("a resolver that throws is just 'no records'", async () => {
    const c = await checkDomain("x.example.com", "s1", t, res({ cname: async () => { throw new Error("ENOTFOUND"); } }));
    expect(c[0].status).toBe("fail");
  });
});
