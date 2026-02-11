import React from "react"
import { PdfTranslator } from "@/components/pdf-translator";
import { ThemeToggle } from "@/components/theme-toggle";
import { FileText, Zap, Globe, Download } from "lucide-react";

export default function Page() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <FileText className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">PDF Translator</h1>
              <p className="text-xs text-muted-foreground">Traduce documentos con IA</p>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-10">
        {/* Hero */}
        <section className="mb-12 text-center">
          <h2 className="text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Traduce cualquier PDF al instante
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-pretty text-muted-foreground leading-relaxed">
            Arrastra tu documento, selecciona el idioma de destino y descarga tu PDF traducido.
            Potenciado por inteligencia artificial para traducciones precisas y naturales.
          </p>
        </section>

        {/* Features */}
        <section className="mb-12 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <FeatureCard
            icon={<Zap className="h-5 w-5 text-primary" />}
            title="Rápido"
            description="Traducciones en segundos gracias a modelos de IA avanzados"
          />
          <FeatureCard
            icon={<Globe className="h-5 w-5 text-primary" />}
            title="+15 Idiomas"
            description="Soporte para los idiomas más hablados del mundo"
          />
          <FeatureCard
            icon={<Download className="h-5 w-5 text-primary" />}
            title="Descarga PDF"
            description="Obtén tu documento traducido listo para usar"
          />
        </section>

        {/* Translator */}
        <PdfTranslator />
      </main>

      {/* Footer */}
      <footer className="border-t py-6">
        <p className="text-center text-sm text-muted-foreground">
          PDF Translator — Traducciones potenciadas por inteligencia artificial
        </p>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-card p-5">
      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-secondary">
        {icon}
      </div>
      <h3 className="font-semibold text-card-foreground">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}
