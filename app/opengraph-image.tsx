import { ImageResponse } from "next/og";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "80px",
          fontFamily: "'Space Grotesk', 'Inter', system-ui",
          background: "linear-gradient(135deg, #020617, #0f172a)",
          color: "#f8fafc",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 16,
              background: "linear-gradient(135deg, #6366f1, #a855f7)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 28,
              fontWeight: 700,
            }}
          >
            PDF
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <p style={{ fontSize: 18, color: "#cbd5f5", margin: 0 }}>AI PDF Translator</p>
            <h1 style={{ fontSize: 54, margin: 0, fontWeight: 700 }}>Traduce documentos al instante</h1>
          </div>
        </div>

        <div style={{ display: "flex", gap: "24px", fontSize: 24, color: "#cbd5f5" }}>
          <span>Arrastra tu PDF</span>
          <span>Selecciona el idioma</span>
          <span>Descarga el resultado</span>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div style={{ display: "flex", fontSize: 26, color: "#94a3b8" }}>
            Traducciones precisas con IA • Compatible con múltiples idiomas
          </div>
          <div style={{ display: "flex", fontSize: 24, fontWeight: 600 }}>aipdftranslator.app</div>
        </div>
      </div>
    ),
    size
  );
}
