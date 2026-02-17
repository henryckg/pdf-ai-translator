import { EpubValidationError, translateEpubBuffer } from "@/lib/epub";

const MAX_EPUB_SIZE_BYTES = 10 * 1024 * 1024;
const JOB_TTL_MS = 30 * 60 * 1000;

type EpubJobStatus = "queued" | "processing" | "done" | "error" | "canceled";

export interface EpubJobSnapshot {
  id: string;
  status: EpubJobStatus;
  createdAt: string;
  updatedAt: string;
  fileName: string;
  targetLanguage: string;
  sourceLanguage: string;
  traceId: string;
  chapter?: number;
  totalChapters?: number;
  progress: number;
  error?: string;
}

interface EpubJobInternal {
  id: string;
  status: EpubJobStatus;
  createdAt: Date;
  updatedAt: Date;
  fileName: string;
  targetLanguage: string;
  sourceLanguage: string;
  traceId: string;
  chapter?: number;
  totalChapters?: number;
  progress: number;
  canceled: boolean;
  outputName?: string;
  outputBuffer?: Buffer;
  error?: string;
}

const jobStore = new Map<string, EpubJobInternal>();

function toSnapshot(job: EpubJobInternal): EpubJobSnapshot {
  return {
    id: job.id,
    status: job.status,
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
    fileName: job.fileName,
    targetLanguage: job.targetLanguage,
    sourceLanguage: job.sourceLanguage,
    traceId: job.traceId,
    chapter: job.chapter,
    totalChapters: job.totalChapters,
    progress: job.progress,
    error: job.error,
  };
}

function touch(job: EpubJobInternal): void {
  job.updatedAt = new Date();
}

function cleanupJobs(): void {
  const now = Date.now();
  for (const [id, job] of jobStore.entries()) {
    if (now - job.updatedAt.getTime() > JOB_TTL_MS) {
      jobStore.delete(id);
    }
  }
}

export function getEpubJob(jobId: string): EpubJobSnapshot | null {
  cleanupJobs();
  const job = jobStore.get(jobId);
  if (!job) return null;
  return toSnapshot(job);
}

export function getEpubJobDownload(jobId: string): { fileName: string; buffer: Buffer } | null {
  cleanupJobs();
  const job = jobStore.get(jobId);
  if (!job || job.status !== "done" || !job.outputBuffer || !job.outputName) {
    return null;
  }

  touch(job);
  return { fileName: job.outputName, buffer: job.outputBuffer };
}

export function cancelEpubJob(jobId: string): EpubJobSnapshot | null {
  cleanupJobs();
  const job = jobStore.get(jobId);
  if (!job) return null;

  if (job.status === "done" || job.status === "error" || job.status === "canceled") {
    return toSnapshot(job);
  }

  job.canceled = true;
  job.status = "canceled";
  job.error = `Traducción EPUB cancelada por el usuario. (ref: ${job.traceId})`;
  job.progress = Math.max(job.progress, 100);
  touch(job);
  return toSnapshot(job);
}

interface StartEpubJobInput {
  file: File;
  sourceLanguage: string;
  targetLanguage: string;
}

export function startEpubJob({ file, sourceLanguage, targetLanguage }: StartEpubJobInput): EpubJobSnapshot {
  cleanupJobs();

  const isEpub =
    file.type === "application/epub+zip" || file.name.toLowerCase().endsWith(".epub");
  if (!isEpub) {
    throw new EpubValidationError("El archivo debe ser un EPUB");
  }

  if (file.size > MAX_EPUB_SIZE_BYTES) {
    throw new EpubValidationError("El EPUB supera el límite de 10 MB");
  }

  const traceId = crypto.randomUUID();
  const jobId = crypto.randomUUID();
  const normalizedSource = sourceLanguage || "Auto";
  const job: EpubJobInternal = {
    id: jobId,
    status: "queued",
    createdAt: new Date(),
    updatedAt: new Date(),
    fileName: file.name,
    sourceLanguage: normalizedSource,
    targetLanguage,
    traceId,
    progress: 5,
    canceled: false,
  };

  jobStore.set(jobId, job);

  void (async () => {
    try {
      if (job.canceled) {
        touch(job);
        return;
      }

      job.status = "processing";
      job.progress = 12;
      touch(job);

      const arrayBuffer = await file.arrayBuffer();
      if (job.canceled) {
        touch(job);
        return;
      }

      const inputBuffer = Buffer.from(arrayBuffer);

      const translatedBuffer = await translateEpubBuffer(inputBuffer, {
        sourceLanguage: normalizedSource,
        targetLanguage,
        traceId,
        onLog: (message, meta) => {
          console.log(`[EPUB:${traceId}] ${message}`, meta ?? "");
        },
        onChapterProgress: ({ chapter, totalChapters, phase }) => {
          if (job.canceled) {
            return;
          }

          job.chapter = chapter;
          job.totalChapters = totalChapters;
          if (phase === "start") {
            const ratio = totalChapters > 0 ? (chapter - 1) / totalChapters : 0;
            job.progress = Math.max(job.progress, Math.min(90, 20 + Math.round(ratio * 65)));
          } else {
            const ratio = totalChapters > 0 ? chapter / totalChapters : 0;
            job.progress = Math.max(job.progress, Math.min(92, 20 + Math.round(ratio * 70)));
          }
          touch(job);
        },
        checkCanceled: () => job.canceled,
      });

      const originalName = file.name.replace(/\.epub$/i, "") || "documento";
      const outputName = `${originalName}.${targetLanguage.toLowerCase()}.epub`;

      if (job.canceled) {
        touch(job);
        return;
      }

      job.status = "done";
      job.progress = 100;
      job.outputBuffer = translatedBuffer;
      job.outputName = outputName;
      touch(job);

      console.log(`[EPUB:${traceId}] Trabajo completado`, {
        jobId,
        outputBytes: translatedBuffer.byteLength,
      });
    } catch (error) {
      if (job.canceled) {
        touch(job);
        return;
      }

      job.status = "error";
      job.progress = 100;
      if (error instanceof EpubValidationError) {
        job.error = `${error.message} (ref: ${traceId})`;
      } else {
        job.error = `Error al traducir el EPUB. Inténtalo de nuevo. (ref: ${traceId})`;
      }
      touch(job);
      console.error(`[EPUB:${traceId}] Error en trabajo`, error);
    }
  })();

  return toSnapshot(job);
}
