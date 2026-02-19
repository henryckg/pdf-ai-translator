import { generateText } from "ai";
import pdfParse from "pdf-parse";
import {
  EpubValidationError,
  extractEpubTextForDetection,
} from "@/lib/epub";
import { isRateLimited } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(req: Request) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "unknown";
    if (isRateLimited(ip, 10, 60000)) { // 10 requests per minute
      return Response.json(
        { error: "Has excedido el límite de peticiones. Por favor espera un momento." },
        { status: 429 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return Response.json({ error: "No se proporcionó un archivo" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return Response.json(
        { error: "El archivo es demasiado grande. El tamaño máximo es 10MB." },
        { status: 400 }
      );
    }

    const isPdf = file.type === "application/pdf";
    const isEpub =
      file.type === "application/epub+zip" || file.name.toLowerCase().endsWith(".epub");

    if (!isPdf && !isEpub) {
      return Response.json(
        { error: "El archivo debe ser un PDF o EPUB" },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let extractedText = "";
    let itemCount = 0;
    let fileType: "pdf" | "epub" = "pdf";

    if (isPdf) {
      const data = await pdfParse(buffer);
      extractedText = data.text.trim();
      itemCount = data.numpages;
      fileType = "pdf";
    } else {
      const epubExtraction = await extractEpubTextForDetection(buffer);
      extractedText = epubExtraction.text;
      itemCount = epubExtraction.chapterCount;
      fileType = "epub";
    }

    if (!extractedText) {
      return Response.json(
        { error: "No se pudo extraer texto del archivo. Asegúrate de que contiene texto legible." },
        { status: 400 }
      );
    }

    const sampleText = extractedText.substring(0, 1500);

    const { text: detectedLanguage } = await generateText({
      model: "openai/gpt-4o-mini",
      prompt: `Detect the language of the following text. Respond with ONLY the language name in Spanish (e.g., "Inglés", "Francés", "Alemán", "Portugués", "Italiano", "Chino", "Japonés", "Coreano", "Árabe", "Ruso", "Español"). Do not include any other text or explanation.\n\nText: "${sampleText}"`,
    });

    return Response.json({
      text: fileType === "pdf" ? extractedText : "",
      detectedLanguage: detectedLanguage.trim(),
      pageCount: itemCount,
      charCount: extractedText.length,
      fileType,
    });
  } catch (error) {
    if (error instanceof EpubValidationError) {
      return Response.json({ error: error.message }, { status: 400 });
    }

    console.error("Error extracting PDF:", error);
    return Response.json(
      { error: "Error al procesar el archivo. Inténtalo de nuevo." },
      { status: 500 }
    );
  }
}
