import { cancelEpubJob, getEpubJob } from "@/lib/epub-jobs";

export const runtime = "nodejs";

interface Params {
  params: Promise<{ jobId: string }>;
}

export async function DELETE(_: Request, { params }: Params) {
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

export async function GET(_: Request, { params }: Params) {
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
