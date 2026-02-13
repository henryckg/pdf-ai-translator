import { generateText } from "ai";
import pdfParse from "pdf-parse";

export const runtime = "nodejs";
export const maxDuration = 60;

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
    const buffer = Buffer.from(arrayBuffer);

    const data = await pdfParse(buffer);
    const extractedText = data.text.trim();

    if (!extractedText) {
      return Response.json(
        { error: "No se pudo extraer texto del PDF. Asegúrate de que el PDF contiene texto legible." },
        { status: 400 }
      );
    }

    const sampleText = extractedText.substring(0, 1500);

    const { text: detectedLanguage } = await generateText({
      model: "openai/gpt-4o-mini",
      prompt: `Detect the language of the following text. Respond with ONLY the language name in Spanish (e.g., "Inglés", "Francés", "Alemán", "Portugués", "Italiano", "Chino", "Japonés", "Coreano", "Árabe", "Ruso", "Español"). Do not include any other text or explanation.\n\nText: "${sampleText}"`,
    });

    return Response.json({
      text: extractedText,
      detectedLanguage: detectedLanguage.trim(),
      pageCount: data.numpages,
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
