"use client";

import { useState, useCallback } from "react";
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
}

export function PdfTranslator() {
  const [file, setFile] = useState<File | null>(null);
  const [extractionResult, setExtractionResult] =
    useState<ExtractionResult | null>(null);
  const [targetLanguage, setTargetLanguage] = useState("");
  const [translatedText, setTranslatedText] = useState("");
  const [step, setStep] = useState<TranslationStep>("idle");
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");

  const handleFileAccepted = useCallback(async (acceptedFile: File) => {
    setFile(acceptedFile);
    setExtractionResult(null);
    setTargetLanguage("");
    setTranslatedText("");
    setStep("extracting");
    setProgress(15);
    setErrorMessage("");

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
    setStep("idle");
    setProgress(0);
    setErrorMessage("");
  }, []);

  const handleTranslate = useCallback(async () => {
    if (!extractionResult || !targetLanguage) return;

    setStep("translating");
    setProgress(10);
    setTranslatedText("");
    setErrorMessage("");

    try {
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

      setProgress(100);
      setStep("done");
    } catch (err) {
      setStep("error");
      setErrorMessage(
        err instanceof Error ? err.message : "Error al traducir"
      );
    }
  }, [extractionResult, targetLanguage]);

  const handleDownload = useCallback(() => {
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
  }, [translatedText, file, targetLanguage]);

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
            {extractionResult.pageCount === 1 ? "página" : "páginas"}
          </Badge>
          <Badge variant="secondary">
            {extractionResult.charCount.toLocaleString("es-ES")} caracteres
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
      />

      {/* Preview */}
      {translatedText && (
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
                Descargar PDF
              </Button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto rounded-lg border bg-card p-6">
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-card-foreground">
              {translatedText}
            </p>
          </div>

          {step === "done" && (
            <div className="flex sm:hidden">
              <Button
                onClick={handleDownload}
                size="lg"
                className="w-full gap-2"
              >
                <Download className="h-4 w-4" />
                Descargar PDF traducido
              </Button>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
