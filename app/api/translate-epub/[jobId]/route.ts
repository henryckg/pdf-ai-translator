import { cancelEpubJob, getEpubJob } from "@/lib/epub-jobs";
import { isRateLimited } from "@/lib/rate-limit";

export const runtime = "nodejs";

interface Params {
  params: Promise<{ jobId: string }>;
}

export async function DELETE(req: Request, { params }: Params) {
  const ip = req.headers.get("x-forwarded-for") || "unknown";
  if (isRateLimited(ip, 20, 60000)) {
    return Response.json(
      { error: "Has excedido el límite de peticiones." },
      { status: 429 }
    );
  }

  const { jobId } = await params;
  const job = cancelEpubJob(jobId);

  if (!job) {
    return Response.json(
      { error: "No se encontró el trabajo de traducción EPUB" },
      { status: 404 },
    );
  }

  return Response.json(job, {
    status: 200,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function GET(req: Request, { params }: Params) {
  const ip = req.headers.get("x-forwarded-for") || "unknown";
  // Polling endpoint needs higher limit
  if (isRateLimited(ip, 120, 60000)) { // 120 requests per minute (2 per second avg)
    return Response.json(
      { error: "Has excedido el límite de peticiones." },
      { status: 429 }
    );
  }

  const { jobId } = await params;
  const job = getEpubJob(jobId);

  if (!job) {
    return Response.json(
      { error: "No se encontró el trabajo de traducción EPUB" },
      { status: 404 },
    );
  }

  return Response.json(job, {
    status: 200,
    headers: { "Cache-Control": "no-store" },
  });
}
