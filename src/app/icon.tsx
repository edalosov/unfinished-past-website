import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

// Matches the site's single palette (globals.css) — the same deep
// blue-teal background, with a solid circle in the warm amber accent.
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
          background: "#10181c",
        }}
      >
        <div
          style={{
            width: "62%",
            height: "62%",
            borderRadius: "50%",
            background: "#c98a4b",
          }}
        />
      </div>
    ),
    size,
  );
}
