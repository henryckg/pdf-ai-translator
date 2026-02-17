import { getEpubJobDownload } from "@/lib/epub-jobs";

export const runtime = "nodejs";

interface Params {
  params: Promise<{ jobId: string }>;
}

export async function GET(_: Request, { params }: Params) {
  const { jobId } = await params;
  const download = getEpubJobDownload(jobId);

  if (!download) {
    return Response.json(
      { error: "El EPUB traducido no está disponible para descarga" },
      { status: 404 },
    );
  }

  return new Response(new Uint8Array(download.buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/epub+zip",
      "Content-Disposition": `attachment; filename="${download.fileName}"`,
      "Cache-Control": "no-store",
    },
  });
}
