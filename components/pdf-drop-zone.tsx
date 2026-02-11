"use client";

import React from "react"

import { useCallback, useState } from "react";
import { Upload, FileText, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface PdfDropZoneProps {
  onFileAccepted: (file: File) => void;
  file: File | null;
  onClear: () => void;
  disabled?: boolean;
}

export function PdfDropZone({ onFileAccepted, file, onClear, disabled }: PdfDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragging(true);
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (disabled) return;

      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile?.type === "application/pdf") {
        onFileAccepted(droppedFile);
      }
    },
    [onFileAccepted, disabled]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0];
      if (selectedFile?.type === "application/pdf") {
        onFileAccepted(selectedFile);
      }
      e.target.value = "";
    },
    [onFileAccepted]
  );

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (file) {
    return (
      <div className="rounded-lg border-2 border-primary/30 bg-primary/5 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <FileText className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="font-medium text-foreground">{file.name}</p>
              <p className="text-sm text-muted-foreground">
                {formatFileSize(file.size)}
              </p>
            </div>
          </div>
          {!disabled && (
            <button
              onClick={onClear}
              className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              aria-label="Eliminar archivo"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        "relative flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 transition-all",
        isDragging
          ? "border-primary bg-primary/5"
          : "border-border hover:border-primary/50 hover:bg-secondary/50",
        disabled && "pointer-events-none opacity-50"
      )}
    >
      <input
        type="file"
        accept=".pdf,application/pdf"
        onChange={handleFileInput}
        className="absolute inset-0 cursor-pointer opacity-0"
        disabled={disabled}
        aria-label="Seleccionar archivo PDF"
      />
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary">
        <Upload className="h-7 w-7 text-muted-foreground" />
      </div>
      <p className="mt-4 text-base font-medium text-foreground">
        Arrastra tu PDF aquí
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        o haz clic para seleccionar un archivo
      </p>
      <p className="mt-3 text-xs text-muted-foreground">
        Solo archivos PDF
      </p>
    </div>
  );
}
