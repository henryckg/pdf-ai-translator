import { EpubValidationError, translateEpubBuffer } from "@/lib/epub";

export const runtime = "nodejs";
export const maxDuration = 120;

const MAX_EPUB_SIZE_BYTES = 10 * 1024 * 1024;

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const sourceLanguage = String(formData.get("sourceLanguage") ?? "").trim();
    const targetLanguage = String(formData.get("targetLanguage") ?? "").trim();

    if (!file || !targetLanguage) {
      return Response.json(
        { error: "Faltan parámetros requeridos para traducir el EPUB" },
        { status: 400 },
      );
    }

    const isEpub =
      file.type === "application/epub+zip" || file.name.toLowerCase().endsWith(".epub");

    if (!isEpub) {
      return Response.json({ error: "El archivo debe ser un EPUB" }, { status: 400 });
    }

    if (file.size > MAX_EPUB_SIZE_BYTES) {
      return Response.json(
        { error: "El EPUB supera el límite de 10 MB" },
        { status: 400 },
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const inputBuffer = Buffer.from(arrayBuffer);

    const translatedBuffer = await translateEpubBuffer(inputBuffer, {
      sourceLanguage: sourceLanguage || "Auto",
      targetLanguage,
    });

    const originalName = file.name.replace(/\.epub$/i, "") || "documento";
    const targetSuffix = targetLanguage.toLowerCase();
    const outputName = `${originalName}.${targetSuffix}.epub`;

    return new Response(new Uint8Array(translatedBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/epub+zip",
        "Content-Disposition": `attachment; filename="${outputName}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (error instanceof EpubValidationError) {
      return Response.json({ error: error.message }, { status: 400 });
    }

    console.error("Error translating EPUB:", error);
    return Response.json(
      { error: "Error al traducir el EPUB. Inténtalo de nuevo." },
      { status: 500 },
    );
  }
}
