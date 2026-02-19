import { streamText } from "ai";
import { isRateLimited } from "@/lib/rate-limit";

const MAX_TEXT_LENGTH = 10000; // 10k characters per request

export async function POST(req: Request) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "unknown";
    if (isRateLimited(ip, 20, 60000)) { // 20 requests per minute (higher due to streaming chunks)
      return Response.json(
        { error: "Has excedido el límite de peticiones. Por favor espera un momento." },
        { status: 429 }
      );
    }

    const { text, sourceLanguage, targetLanguage } = await req.json();

    if (!text || !targetLanguage) {
      return Response.json(
        { error: "Faltan parámetros requeridos" },
        { status: 400 }
      );
    }

    if (typeof text !== "string" || text.length > MAX_TEXT_LENGTH) {
      return Response.json(
        { error: `El texto excede el límite de ${MAX_TEXT_LENGTH} caracteres.` },
        { status: 400 }
      );
    }

    const result = streamText({
      model: process.env.AI_GATEWAY_MODEL || "openai/gpt-5-nano",
      system: `You are a professional document translator. Translate the given text from ${sourceLanguage} to ${targetLanguage}. 
      
Rules:
- Maintain the original formatting, paragraph breaks, and structure as closely as possible
- Preserve any numbers, dates, proper nouns, and technical terms appropriately
- Ensure the translation sounds natural and fluent in the target language
- Do NOT add any explanations, notes, or commentary - output ONLY the translated text
- Preserve line breaks where they appear in the source text`,
      prompt: text,
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error("Error translating:", error);
    return Response.json(
      { error: "Error al traducir el documento" },
      { status: 500 }
    );
  }
}
