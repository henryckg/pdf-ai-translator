import { streamText } from "ai";

export async function POST(req: Request) {
  try {
    const { text, sourceLanguage, targetLanguage } = await req.json();

    if (!text || !targetLanguage) {
      return Response.json(
        { error: "Faltan parámetros requeridos" },
        { status: 400 }
      );
    }

    const result = streamText({
      model: "openai/gpt-4o-mini",
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
