import { ImageResponse } from "next/og";
import { currentStoreId, DEFAULT_STORE_ID } from "@/lib/db/stores";
import { getStore } from "@/lib/store";

// No static `alt` here: it would be the same text for every store.
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** The social preview card. The original shop keeps its two-tone lightning design; every other store gets its own name, tagline and colours. */
export default async function OgImage() {
  const store = await getStore();
  if ((await currentStoreId()) === DEFAULT_STORE_ID) {
    return new ImageResponse(
      (
        <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", fontFamily: "sans-serif", color: "#f4f2f8" }}>
          <div style={{ display: "flex", width: "50%", height: "100%", background: "#161b2b" }} />
          <div style={{ display: "flex", width: "50%", height: "100%", background: "#241018" }} />
          <svg width="1200" height="630" viewBox="0 0 1200 630" style={{ position: "absolute", left: 0, top: 0 }}>
            <polyline points="618,0 582,100 612,200 588,310 616,420 584,520 604,630" fill="none" stroke="#FFD400" strokeWidth="9" />
          </svg>
          <div style={{ position: "absolute", left: 70, bottom: 70, display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: 130, fontWeight: 800, lineHeight: 1, letterSpacing: -4 }}>Sparkthunder</div>
            <div style={{ display: "flex", fontSize: 50, color: "#FFD400", fontWeight: 700, marginTop: 14 }}>The official shop</div>
          </div>
        </div>
      ),
      size,
    );
  }
  const long = store.name.length > 14;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", fontFamily: "sans-serif", background: store.dark, color: "#ffffff" }}>
        <div style={{ position: "absolute", left: 0, top: 0, width: 24, height: 630, background: store.accent, display: "flex" }} />
        <div style={{ position: "absolute", left: 90, bottom: 80, right: 90, display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: long ? 100 : 140, fontWeight: 800, lineHeight: 1, letterSpacing: -4 }}>{store.name}</div>
          {store.tagline ? <div style={{ display: "flex", fontSize: 46, color: store.accent, fontWeight: 700, marginTop: 20 }}>{store.tagline}</div> : null}
        </div>
      </div>
    ),
    size,
  );
}
