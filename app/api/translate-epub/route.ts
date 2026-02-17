import { EpubValidationError } from "@/lib/epub";
import { startEpubJob } from "@/lib/epub-jobs";

export const runtime = "nodejs";
export const maxDuration = 300;

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

    const job = startEpubJob({
      file,
      sourceLanguage,
      targetLanguage,
    });

    return Response.json(
      {
        jobId: job.id,
        status: job.status,
        traceId: job.traceId,
      },
      { status: 202 },
    );
  } catch (error) {
    if (error instanceof EpubValidationError) {
      return Response.json({ error: error.message }, { status: 400 });
    }

    console.error("Error creating EPUB job:", error);
    return Response.json(
      { error: "No se pudo iniciar la traducción EPUB. Inténtalo de nuevo." },
      { status: 500 },
    );
  }
}
