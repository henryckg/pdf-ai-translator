"use client";

import { useState, useCallback, useRef } from "react";
import { Download, Languages, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PdfDropZone } from "@/components/pdf-drop-zone";
import { LanguageSelector } from "@/components/language-selector";
import {
  TranslationStatus,
  type TranslationStep,
} from "@/components/translation-status";
import { jsPDF } from "jspdf";

interface ExtractionResult {
  text: string;
  detectedLanguage: string;
  pageCount: number;
  charCount: number;
  fileType: "pdf" | "epub";
}

interface EpubJobCreateResponse {
  jobId: string;
  status: "queued" | "processing" | "done" | "error";
  traceId: string;
}

interface EpubJobStatusResponse {
  id: string;
  status: "queued" | "processing" | "done" | "error" | "canceled";
  traceId: string;
  chapter?: number;
  totalChapters?: number;
  progress: number;
  error?: string;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export function PdfTranslator() {
  const [file, setFile] = useState<File | null>(null);
  const [extractionResult, setExtractionResult] =
    useState<ExtractionResult | null>(null);
  const [targetLanguage, setTargetLanguage] = useState("");
  const [translatedText, setTranslatedText] = useState("");
  const [translatedEpubBlob, setTranslatedEpubBlob] = useState<Blob | null>(null);
  const [translatedEpubFilename, setTranslatedEpubFilename] = useState("");
  const [step, setStep] = useState<TranslationStep>("idle");
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const [detailMessage, setDetailMessage] = useState("");
  const [currentEpubJobId, setCurrentEpubJobId] = useState<string | null>(null);
  const [isCancellingEpubJob, setIsCancellingEpubJob] = useState(false);
  const shouldStopEpubPollingRef = useRef(false);

  const handleFileAccepted = useCallback(async (acceptedFile: File) => {
    setFile(acceptedFile);
    setExtractionResult(null);
    setTargetLanguage("");
    setTranslatedText("");
    setTranslatedEpubBlob(null);
    setTranslatedEpubFilename("");
    setStep("extracting");
    setProgress(15);
    setErrorMessage("");
    setDetailMessage("");

    try {
      const formData = new FormData();
      formData.append("file", acceptedFile);

      const response = await fetch("/api/extract", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Error al extraer el texto");
      }

      setProgress(100);
      const data = await response.json();
      setExtractionResult(data);
      setStep("idle");
      setProgress(0);
    } catch (err) {
      setStep("error");
      setErrorMessage(
        err instanceof Error ? err.message : "Error al procesar el PDF"
      );
    }
  }, []);

  const handleClear = useCallback(() => {
    setFile(null);
    setExtractionResult(null);
    setTargetLanguage("");
    setTranslatedText("");
    setTranslatedEpubBlob(null);
    setTranslatedEpubFilename("");
    setStep("idle");
    setProgress(0);
    setErrorMessage("");
    setDetailMessage("");
    setCurrentEpubJobId(null);
    setIsCancellingEpubJob(false);
    shouldStopEpubPollingRef.current = false;
  }, []);

  const handleCancelEpubTranslation = useCallback(async () => {
    if (!currentEpubJobId || isCancellingEpubJob) return;

    setIsCancellingEpubJob(true);
    shouldStopEpubPollingRef.current = true;

    try {
      await fetch(`/api/translate-epub/${currentEpubJobId}`, {
        method: "DELETE",
        cache: "no-store",
      });
    } catch {
      // Ignore network errors here; local UI is still reset.
    } finally {
      setCurrentEpubJobId(null);
      setIsCancellingEpubJob(false);
      setTranslatedEpubBlob(null);
      setTranslatedEpubFilename("");
      setStep("idle");
      setProgress(0);
      setErrorMessage("");
      setDetailMessage("");
    }
  }, [currentEpubJobId, isCancellingEpubJob]);

  const handleTranslate = useCallback(async () => {
    if (!extractionResult || !targetLanguage || !file) return;

    setStep("translating");
    setProgress(10);
    setTranslatedText("");
    setTranslatedEpubBlob(null);
    setTranslatedEpubFilename("");
    setErrorMessage("");
    setDetailMessage("");

    try {
      if (extractionResult.fileType === "epub") {
        setStep("extracting");
        setProgress(12);
        setDetailMessage("Preparando trabajo EPUB...");

        const formData = new FormData();
        formData.append("file", file);
        formData.append("sourceLanguage", extractionResult.detectedLanguage);
        formData.append("targetLanguage", targetLanguage);

        const createResponse = await fetch("/api/translate-epub", {
          method: "POST",
          body: formData,
        });

        if (!createResponse.ok) {
          const data = await createResponse.json().catch(() => ({}));
          throw new Error(data.error || "No se pudo iniciar la traducción EPUB");
        }

        const createData = (await createResponse.json()) as EpubJobCreateResponse;
        const { jobId, traceId } = createData;
        shouldStopEpubPollingRef.current = false;
        setCurrentEpubJobId(jobId);
        setIsCancellingEpubJob(false);

        setStep("translating");
        setProgress(20);
        setDetailMessage("Traduciendo capítulos...");

        let pollAttempt = 0;

        while (true) {
          if (shouldStopEpubPollingRef.current) {
            break;
          }

          const statusResponse = await fetch(`/api/translate-epub/${jobId}`, {
            method: "GET",
            cache: "no-store",
          });

          if (!statusResponse.ok) {
            const data = await statusResponse.json().catch(() => ({}));
            throw new Error(data.error || `No se pudo consultar el estado del trabajo (ref: ${traceId})`);
          }

          const statusData = (await statusResponse.json()) as EpubJobStatusResponse;
          setProgress(Math.min(96, Math.max(15, statusData.progress || 0)));

          if (statusData.chapter && statusData.totalChapters) {
            setDetailMessage(
              `Capítulo ${statusData.chapter} de ${statusData.totalChapters} (ref: ${statusData.traceId})`
            );
          } else {
            setDetailMessage(`Preparando capítulos... (ref: ${statusData.traceId})`);
          }

          if (statusData.status === "error") {
            throw new Error(statusData.error || `La traducción EPUB falló. (ref: ${statusData.traceId})`);
          }

          if (statusData.status === "canceled") {
            throw new Error(statusData.error || `La traducción EPUB fue cancelada. (ref: ${statusData.traceId})`);
          }

          if (statusData.status === "done") {
            break;
          }

          pollAttempt += 1;
          const pollDelayMs = pollAttempt < 8 ? 1500 : pollAttempt < 24 ? 3000 : 5000;
          await sleep(pollDelayMs);
        }

        if (shouldStopEpubPollingRef.current) {
          return;
        }

        setStep("generating");
        setProgress(97);
        setDetailMessage("Generando descarga...");

        const downloadResponse = await fetch(`/api/translate-epub/${jobId}/download`, {
          method: "GET",
          cache: "no-store",
        });

        if (!downloadResponse.ok) {
          const data = await downloadResponse.json().catch(() => ({}));
          throw new Error(data.error || `No se pudo descargar el EPUB traducido (ref: ${traceId})`);
        }

        const blob = await downloadResponse.blob();
        const contentDisposition = downloadResponse.headers.get("Content-Disposition") ?? "";
        const filenameMatch = contentDisposition.match(/filename=\"?([^\"]+)\"?/i);
        const fallbackName = `${file.name.replace(/\.epub$/i, "")}.${targetLanguage.toLowerCase()}.epub`;

        setTranslatedEpubBlob(blob);
        setTranslatedEpubFilename(filenameMatch?.[1] || fallbackName);
        setDetailMessage("");
        setCurrentEpubJobId(null);
      } else {
        const response = await fetch("/api/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: extractionResult.text,
            sourceLanguage: extractionResult.detectedLanguage,
            targetLanguage,
          }),
        });

        if (!response.ok) {
          throw new Error("Error al traducir el documento");
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error("No se pudo leer la respuesta");

        const decoder = new TextDecoder();
        let fullText = "";
        const totalChars = extractionResult.charCount;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          fullText += chunk;
          setTranslatedText(fullText);

          const estimatedProgress = Math.min(
            95,
            10 + (fullText.length / totalChars) * 85
          );
          setProgress(estimatedProgress);
        }
      }

      setProgress(100);
      setStep("done");
      setDetailMessage("");
      setCurrentEpubJobId(null);
      setIsCancellingEpubJob(false);
      shouldStopEpubPollingRef.current = false;
    } catch (err) {
      setStep("error");
      setDetailMessage("");
      setCurrentEpubJobId(null);
      setIsCancellingEpubJob(false);
      shouldStopEpubPollingRef.current = false;

      const isAbortError =
        err instanceof DOMException
          ? err.name === "AbortError"
          : err instanceof Error && /aborted|abort/i.test(err.message);

      if (isAbortError) {
        setErrorMessage(
          "La traducción tardó demasiado y fue cancelada automáticamente. Intenta con un EPUB más pequeño o divídelo en partes."
        );
        return;
      }

      const isNetworkFetchError =
        err instanceof TypeError && /failed to fetch|networkerror/i.test(err.message);

      if (isNetworkFetchError) {
        setErrorMessage(
          "La traducción terminó, pero se perdió la conexión antes de descargar el archivo. Intenta de nuevo y revisa el log del servidor para el ref EPUB."
        );
        return;
      }

      setErrorMessage(
        err instanceof Error ? err.message : "Error al traducir"
      );
    }
  }, [extractionResult, targetLanguage, file]);

  const handleDownload = useCallback(() => {
    if (translatedEpubBlob) {
      const url = URL.createObjectURL(translatedEpubBlob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = translatedEpubFilename || "documento.traducido.epub";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      return;
    }

    if (!translatedText) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const maxWidth = pageWidth - margin * 2;
    const lineHeight = 7;
    const pageHeight = doc.internal.pageSize.getHeight();
    const maxY = pageHeight - margin;

    doc.setFont("helvetica");
    doc.setFontSize(11);

    const lines = doc.splitTextToSize(translatedText, maxWidth);
    let y = margin;

    for (const line of lines) {
      if (y + lineHeight > maxY) {
        doc.addPage();
        y = margin;
      }
      doc.text(line, margin, y);
      y += lineHeight;
    }

    const originalName = file?.name?.replace(/\.pdf$/i, "") || "documento";
    doc.save(`${originalName}_${targetLanguage.toLowerCase()}.pdf`);
  }, [translatedText, translatedEpubBlob, translatedEpubFilename, file, targetLanguage]);

  const canTranslate =
    extractionResult && targetLanguage && step !== "translating" && step !== "extracting";

  return (
    <div className="flex flex-col gap-8">
      {/* Step 1: Upload */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
            1
          </span>
          <h2 className="text-lg font-semibold text-foreground">
            Sube tu documento
          </h2>
        </div>
        <PdfDropZone
          onFileAccepted={handleFileAccepted}
          file={file}
          onClear={handleClear}
          disabled={step === "extracting" || step === "translating"}
        />
      </section>

      {/* Extraction info */}
      {extractionResult && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-card px-5 py-4">
          <Badge variant="secondary">
            {extractionResult.pageCount}{" "}
            {extractionResult.fileType === "pdf"
              ? extractionResult.pageCount === 1
                ? "página"
                : "páginas"
              : extractionResult.pageCount === 1
                ? "capítulo"
                : "capítulos"}
          </Badge>
          <Badge variant="secondary">
            {extractionResult.charCount.toLocaleString("es-ES")} caracteres
          </Badge>
          <Badge variant="secondary">
            Tipo: {extractionResult.fileType.toUpperCase()}
          </Badge>
          <Badge className="bg-primary/15 text-primary border-primary/20">
            Idioma detectado: {extractionResult.detectedLanguage}
          </Badge>
        </div>
      )}

      {/* Step 2: Choose language */}
      {extractionResult && (
        <section className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
              2
            </span>
            <h2 className="text-lg font-semibold text-foreground">
              Selecciona el idioma de destino
            </h2>
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex-1">
              <LanguageSelector
                value={targetLanguage}
                onValueChange={setTargetLanguage}
                excludeLanguage={extractionResult.detectedLanguage}
                disabled={step === "translating"}
                label="Traducir a"
              />
            </div>
            <Button
              onClick={handleTranslate}
              disabled={!canTranslate}
              size="lg"
              className="gap-2"
            >
              <Languages className="h-4 w-4" />
              Traducir
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </section>
      )}

      {/* Translation Status */}
      <TranslationStatus
        step={step}
        progress={progress}
        errorMessage={errorMessage}
        detailMessage={detailMessage}
      />

      {currentEpubJobId && (step === "extracting" || step === "translating" || step === "generating") && (
        <div className="-mt-4">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancelEpubTranslation}
            disabled={isCancellingEpubJob}
          >
            {isCancellingEpubJob ? "Cancelando..." : "Cancelar traducción EPUB"}
          </Button>
        </div>
      )}

      {/* Preview */}
      {(translatedText || translatedEpubBlob) && (
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-sm font-bold text-accent-foreground">
                3
              </span>
              <h2 className="text-lg font-semibold text-foreground">
                Vista previa y descarga
              </h2>
            </div>
            {step === "done" && (
              <Button onClick={handleDownload} size="lg" className="gap-2">
                <Download className="h-4 w-4" />
                {translatedEpubBlob ? "Descargar EPUB" : "Descargar PDF"}
              </Button>
            )}
          </div>

          {translatedText ? (
            <div className="max-h-80 overflow-y-auto rounded-lg border bg-card p-6">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-card-foreground">
                {translatedText}
              </p>
            </div>
          ) : (
            <div className="rounded-lg border bg-card p-6">
              <p className="text-sm leading-relaxed text-card-foreground">
                EPUB traducido correctamente. Ya puedes descargar el archivo manteniendo el formato original.
              </p>
            </div>
          )}

          {step === "done" && (
            <div className="flex sm:hidden">
              <Button
                onClick={handleDownload}
                size="lg"
                className="w-full gap-2"
              >
                <Download className="h-4 w-4" />
                {translatedEpubBlob ? "Descargar EPUB traducido" : "Descargar PDF traducido"}
              </Button>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
