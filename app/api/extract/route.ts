import { generateText } from "ai";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return Response.json({ error: "No se proporcionó un archivo" }, { status: 400 });
    }

    if (file.type !== "application/pdf") {
      return Response.json({ error: "El archivo debe ser un PDF" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
      // Polyfill DOMMatrix on serverless platforms (Vercel) where it's missing
      if (typeof globalThis.DOMMatrix === "undefined") {
        try {
          const dommatrix: any = await import("@thednp/dommatrix");
          // dommatrix may export the constructor as default or named
          globalThis.DOMMatrix = dommatrix.DOMMatrix ?? dommatrix.default ?? dommatrix;
        } catch (e) {
          console.warn("No se pudo cargar el polyfill 'dommatrix':", e);
        }
      }

    const pdfModule: any = await import("pdf-parse");
    // Detect possible export shapes: function, default function, or { PDFParse: constructor }
    let data: any;
    const maybeFunc = typeof pdfModule === "function" ? pdfModule : (pdfModule.default ?? pdfModule);

    if (typeof maybeFunc === "function") {
      data = await maybeFunc(uint8Array);
    } else if (maybeFunc && typeof maybeFunc.PDFParse === "function") {
      const PDFParseCtor = maybeFunc.PDFParse;
      let parser: any;
      try {
        parser = new PDFParseCtor(uint8Array);
      } catch (e) {
        parser = new PDFParseCtor({ data: uint8Array });
      }
      if (typeof parser.getText === "function") {
        data = await parser.getText();
      } else if (parser.text) {
        data = parser;
      } else {
        console.error("PDFParse instance has unexpected shape:", parser);
        return Response.json({ error: "No se pudo procesar el PDF con 'PDFParse'." }, { status: 500 });
      }
    } else {
      console.error("pdf-parse export shape:", pdfModule);
      return Response.json({ error: "La dependencia 'pdf-parse' no exporta una función o constructor esperado." }, { status: 500 });
    }

    // `data` is already computed above for both shapes (function or constructor)
    const extractedText = data && typeof data.text === "string" ? data.text.trim() : "";

    if (!extractedText) {
      return Response.json(
        { error: "No se pudo extraer texto del PDF. Asegúrate de que el PDF contiene texto legible." },
        { status: 400 }
      );
    }

    // Use AI to detect the language of the text
    const sampleText = extractedText.substring(0, 1500);

    const { text: detectedLanguage } = await generateText({
      model: "openai/gpt-4o-mini",
      prompt: `Detect the language of the following text. Respond with ONLY the language name in Spanish (e.g., "Inglés", "Francés", "Alemán", "Portugués", "Italiano", "Chino", "Japonés", "Coreano", "Árabe", "Ruso", "Español"). Do not include any other text or explanation.\n\nText: "${sampleText}"`,
    });

    return Response.json({
      text: extractedText,
      detectedLanguage: detectedLanguage.trim(),
      pageCount: data.numpages || 1,
      charCount: extractedText.length,
    });
  } catch (error) {
    console.error("Error extracting PDF:", error);
    return Response.json(
      { error: "Error al procesar el PDF. Inténtalo de nuevo." },
      { status: 500 }
    );
  }
}
