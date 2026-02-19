import { getEpubJobDownload } from "@/lib/epub-jobs";
import { isRateLimited } from "@/lib/rate-limit";

export const runtime = "nodejs";

interface Params {
  params: Promise<{ jobId: string }>;
}

export async function GET(req: Request, { params }: Params) {
  const ip = req.headers.get("x-forwarded-for") || "unknown";
  if (isRateLimited(ip, 10, 60000)) { // 10 downloads per minute
    return Response.json(
      { error: "Has excedido el límite de descargas." },
      { status: 429 }
    );
  }

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
