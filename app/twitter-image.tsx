import { ImageResponse } from "next/og";

export const size = {
  width: 1200,
  height: 600,
};

export const contentType = "image/png";

export default function TwitterImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px",
          fontFamily: "'Space Grotesk', 'Inter', system-ui",
          background: "linear-gradient(135deg, #0f172a, #1e1b4b)",
          color: "#f8fafc",
          borderRadius: 32,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <span style={{ fontSize: 20, color: "#cbd5f5" }}>AI PDF Translator</span>
          <h1 style={{ fontSize: 52, margin: "12px 0", fontWeight: 700 }}>
            Traduce tus PDFs con inteligencia artificial
          </h1>
          <p style={{ fontSize: 22, color: "#cbd5f5", maxWidth: 700 }}>
            Arrastra tu documento, selecciona el idioma y obtén una traducción precisa en segundos.
          </p>
        </div>

        <div
          style={{
            display: "flex",
            gap: "16px",
            fontSize: 22,
            color: "#cbd5f5",
            flexWrap: "wrap",
          }}
        >
          <span>📄 PDF a PDF</span>
          <span>🌍 15+ idiomas</span>
          <span>⚡ Conversión instantánea</span>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", fontSize: 24, fontWeight: 600 }}>aipdftranslator.app</div>
          <div
            style={{
              display: "flex",
              padding: "12px 24px",
              borderRadius: 999,
              background: "#f8fafc",
              color: "#0f172a",
              fontWeight: 600,
            }}
          >
            Traducción instantánea
          </div>
        </div>
      </div>
    ),
    size
  );
}
