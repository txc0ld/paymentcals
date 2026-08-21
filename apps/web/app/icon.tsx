import { ImageResponse } from "next/og";

/** Favicon: the nav logo mark — a hairline square with a filled centre dot. */
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0a0a0a",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 24,
            height: 24,
            border: "3px solid #ffffff",
          }}
        >
          <div style={{ display: "flex", width: 10, height: 10, backgroundColor: "#ff1f5b" }} />
        </div>
      </div>
    ),
    { ...size },
  );
}
