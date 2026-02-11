"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const LANGUAGES = [
  { value: "Español", label: "Español" },
  { value: "Inglés", label: "Inglés" },
  { value: "Francés", label: "Francés" },
  { value: "Alemán", label: "Alemán" },
  { value: "Italiano", label: "Italiano" },
  { value: "Portugués", label: "Portugués" },
  { value: "Chino", label: "Chino (Mandarín)" },
  { value: "Japonés", label: "Japonés" },
  { value: "Coreano", label: "Coreano" },
  { value: "Ruso", label: "Ruso" },
  { value: "Árabe", label: "Árabe" },
  { value: "Holandés", label: "Holandés" },
  { value: "Sueco", label: "Sueco" },
  { value: "Polaco", label: "Polaco" },
  { value: "Turco", label: "Turco" },
  { value: "Hindi", label: "Hindi" },
];

interface LanguageSelectorProps {
  value: string;
  onValueChange: (value: string) => void;
  excludeLanguage?: string;
  disabled?: boolean;
  label: string;
}

export function LanguageSelector({
  value,
  onValueChange,
  excludeLanguage,
  disabled,
  label,
}: LanguageSelectorProps) {
  const filteredLanguages = excludeLanguage
    ? LANGUAGES.filter((lang) => lang.value !== excludeLanguage)
    : LANGUAGES;

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-foreground">{label}</label>
      <Select value={value} onValueChange={onValueChange} disabled={disabled}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Selecciona un idioma" />
        </SelectTrigger>
        <SelectContent>
          {filteredLanguages.map((lang) => (
            <SelectItem key={lang.value} value={lang.value}>
              {lang.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
