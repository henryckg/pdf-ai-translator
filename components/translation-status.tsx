"use client";

import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export type TranslationStep = "idle" | "extracting" | "translating" | "generating" | "done" | "error";

interface TranslationStatusProps {
  step: TranslationStep;
  progress: number;
  errorMessage?: string;
}

const STEP_LABELS: Record<TranslationStep, string> = {
  idle: "",
  extracting: "Extrayendo texto del PDF...",
  translating: "Traduciendo el documento...",
  generating: "Generando PDF traducido...",
  done: "Traducción completada",
  error: "Ha ocurrido un error",
};

export function TranslationStatus({ step, progress, errorMessage }: TranslationStatusProps) {
  if (step === "idle") return null;

  const isProcessing = step === "extracting" || step === "translating" || step === "generating";

  return (
    <div className="flex flex-col gap-4 rounded-lg border bg-card p-6">
      <div className="flex items-center gap-3">
        {isProcessing && (
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        )}
        {step === "done" && (
          <CheckCircle2 className="h-5 w-5 text-accent" />
        )}
        {step === "error" && (
          <AlertCircle className="h-5 w-5 text-destructive" />
        )}
        <span className="font-medium text-foreground">
          {STEP_LABELS[step]}
        </span>
      </div>

      {isProcessing && (
        <Progress value={progress} className="h-2" />
      )}

      {step === "error" && errorMessage && (
        <p className="text-sm text-destructive">{errorMessage}</p>
      )}
    </div>
  );
}
