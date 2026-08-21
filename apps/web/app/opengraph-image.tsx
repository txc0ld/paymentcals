import { ImageResponse } from "next/og";

/**
 * Sitewide social card. STRATA: near-black canvas, a faint zinc hairline grid,
 * the mono wordmark, and exactly one accent element. System fonts only —
 * loading a custom face here would need a network fetch at build time.
 */
export const alt = "PaymentCalcs — Australian financial calculators that show their working";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#0a0a0a",
          backgroundImage:
            "linear-gradient(to right, #1c1c1f 1px, transparent 1px), linear-gradient(to bottom, #1c1c1f 1px, transparent 1px)",
          backgroundSize: "75px 75px",
          padding: "72px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center" }}>
          <div style={{ display: "flex", width: 22, height: 22, backgroundColor: "#ff1f5b" }} />
          <div
            style={{
              display: "flex",
              marginLeft: 20,
              color: "#ffffff",
              fontSize: 22,
              fontWeight: 500,
              letterSpacing: "0.24em",
            }}
          >
            PAYMENTCALCS
          </div>
        </div>

        <div
          style={{
            display: "flex",
            color: "#ffffff",
            fontSize: 78,
            fontWeight: 700,
            lineHeight: 1.08,
            letterSpacing: "-0.03em",
            maxWidth: 940,
          }}
        >
          Australian financial calculators that show their working
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: "1px solid #2a2a2e",
            paddingTop: 28,
            color: "#8a8a92",
            fontSize: 24,
            letterSpacing: "0.06em",
          }}
        >
          <div style={{ display: "flex" }}>Pay · Tax · Mortgage · Business</div>
          <div style={{ display: "flex", color: "#ff1f5b" }}>paymentcalcs.com.au</div>
        </div>
      </div>
    ),
    { ...size },
  );
}
