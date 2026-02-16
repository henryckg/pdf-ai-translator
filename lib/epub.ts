import { generateText } from "ai";
import * as cheerio from "cheerio";
import { XMLParser } from "fast-xml-parser";
import JSZip from "jszip";
import path from "node:path";

const EPUB_MIME_TYPE = "application/epub+zip";
const TRANSLATION_BATCH_SIZE = 20;

export class EpubValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EpubValidationError";
  }
}

interface SpineDocument {
  zipPath: string;
  isNav: boolean;
}

interface EpubStructure {
  rootfilePath: string;
  spineDocuments: SpineDocument[];
}

interface ExtractedEpubText {
  text: string;
  charCount: number;
  chapterCount: number;
}

interface TranslateEpubOptions {
  sourceLanguage: string;
  targetLanguage: string;
}

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
});

function normalizeZipPath(inputPath: string): string {
  return inputPath.replace(/\\/g, "/");
}

function resolveZipPath(basePath: string, relativePath: string): string {
  return normalizeZipPath(path.posix.normalize(path.posix.join(basePath, relativePath)));
}

function sanitizeJsonResponse(rawText: string): string {
  const trimmed = rawText.trim();
  if (trimmed.startsWith("```") && trimmed.endsWith("```")) {
    return trimmed.replace(/^```(?:json)?\n?/i, "").replace(/```$/, "").trim();
  }
  return trimmed;
}

async function translateTextBatch(
  entries: string[],
  sourceLanguage: string,
  targetLanguage: string,
): Promise<string[]> {
  const payload = JSON.stringify(entries);
  const { text } = await generateText({
    model: "openai/gpt-4o-mini",
    system: `You are a professional document translator. Translate from ${sourceLanguage} to ${targetLanguage}.

Rules:
- Keep meaning and tone natural.
- Do not add or remove entries.
- Return ONLY a valid JSON array of translated strings.
- Keep array length and order identical to the input.
- Do not include markdown, explanations, or extra keys.`,
    prompt: `Translate this JSON array:\n${payload}`,
  });

  const parsed = JSON.parse(sanitizeJsonResponse(text));
  if (!Array.isArray(parsed) || parsed.length !== entries.length) {
    throw new Error("La traducción por lotes devolvió un formato inválido");
  }

  return parsed.map((item) => String(item));
}

async function translateSingleText(
  text: string,
  sourceLanguage: string,
  targetLanguage: string,
): Promise<string> {
  const { text: translated } = await generateText({
    model: "openai/gpt-4o-mini",
    system: `You are a professional document translator. Translate from ${sourceLanguage} to ${targetLanguage}.

Rules:
- Output ONLY the translated text.
- Keep original meaning and punctuation.
- Do not add commentary.`,
    prompt: text,
  });

  return translated.trim();
}

async function translateEntriesSafely(
  entries: string[],
  sourceLanguage: string,
  targetLanguage: string,
): Promise<string[]> {
  try {
    return await translateTextBatch(entries, sourceLanguage, targetLanguage);
  } catch {
    const translated: string[] = [];
    for (const entry of entries) {
      translated.push(await translateSingleText(entry, sourceLanguage, targetLanguage));
    }
    return translated;
  }
}

function getTrimmedTextBoundaries(original: string): {
  leading: string;
  core: string;
  trailing: string;
} {
  const leading = original.match(/^\s*/)?.[0] ?? "";
  const trailing = original.match(/\s*$/)?.[0] ?? "";
  const core = original.slice(leading.length, original.length - trailing.length);
  return { leading, core, trailing };
}

function collectTextNodes(node: unknown, nodes: Array<{ data: string }>): void {
  if (!node || typeof node !== "object") return;

  const domNode = node as {
    type?: string;
    data?: string;
    name?: string;
    children?: unknown[];
  };

  if (domNode.type === "comment") return;

  if (domNode.type === "text" && typeof domNode.data === "string" && domNode.data.trim()) {
    nodes.push(domNode as { data: string });
    return;
  }

  if (domNode.type === "script" || domNode.type === "style") return;

  if (domNode.name) {
    const tag = domNode.name.toLowerCase();
    if (tag === "script" || tag === "style" || tag === "noscript") {
      return;
    }
  }

  if (Array.isArray(domNode.children)) {
    for (const child of domNode.children) {
      collectTextNodes(child, nodes);
    }
  }
}

function isTocDocumentPath(documentPath: string): boolean {
  const normalized = documentPath.toLowerCase();
  return normalized.endsWith("nav.xhtml") || normalized.endsWith("toc.ncx");
}

async function readZipFileAsText(zip: JSZip, zipPath: string): Promise<string> {
  const file = zip.file(zipPath);
  if (!file) {
    throw new EpubValidationError(`No se encontró el archivo requerido en EPUB: ${zipPath}`);
  }
  return file.async("text");
}

async function parseEpubStructure(zip: JSZip): Promise<EpubStructure> {
  const containerXml = await readZipFileAsText(zip, "META-INF/container.xml");
  const parsedContainer = xmlParser.parse(containerXml);

  const rootfilePath =
    parsedContainer?.container?.rootfiles?.rootfile?.["@_full-path"] ||
    parsedContainer?.container?.rootfiles?.rootfile?.[0]?.["@_full-path"];

  if (!rootfilePath || typeof rootfilePath !== "string") {
    throw new EpubValidationError("EPUB inválido: no se pudo localizar el archivo OPF principal");
  }

  const opfPath = normalizeZipPath(rootfilePath);
  const opfDir = path.posix.dirname(opfPath);
  const opfContent = await readZipFileAsText(zip, opfPath);
  const opf = cheerio.load(opfContent, { xmlMode: true });

  const manifestById = new Map<string, { href: string; mediaType: string; properties: string }>();
  opf("manifest > item").each((_, element) => {
    const item = opf(element);
    const id = item.attr("id") ?? "";
    const href = item.attr("href") ?? "";
    const mediaType = item.attr("media-type") ?? "";
    const properties = item.attr("properties") ?? "";

    if (id && href && mediaType) {
      manifestById.set(id, { href, mediaType, properties });
    }
  });

  const spineDocuments: SpineDocument[] = [];
  opf("spine > itemref").each((_, element) => {
    const idref = opf(element).attr("idref") ?? "";
    const manifestEntry = manifestById.get(idref);
    if (!manifestEntry) return;

    const mediaType = manifestEntry.mediaType.toLowerCase();
    if (mediaType !== "application/xhtml+xml" && mediaType !== "text/html") {
      return;
    }

    const zipPath = resolveZipPath(opfDir, manifestEntry.href);
    const isNav = manifestEntry.properties.toLowerCase().includes("nav");
    spineDocuments.push({ zipPath, isNav });
  });

  if (spineDocuments.length === 0) {
    throw new EpubValidationError("EPUB inválido: no se encontraron capítulos XHTML en el spine");
  }

  return {
    rootfilePath: opfPath,
    spineDocuments,
  };
}

async function extractVisibleTextFromDocument(content: string): Promise<string[]> {
  const $ = cheerio.load(content, { xmlMode: true });
  const roots = $.root().children().toArray();

  const nodes: Array<{ data: string }> = [];
  for (const root of roots) {
    collectTextNodes(root, nodes);
  }

  const values: string[] = [];
  for (const node of nodes) {
    const { core } = getTrimmedTextBoundaries(node.data);
    if (core) values.push(core);
  }

  return values;
}

async function translateXhtmlDocument(
  content: string,
  sourceLanguage: string,
  targetLanguage: string,
): Promise<string> {
  const $ = cheerio.load(content, { xmlMode: true });
  const roots = $.root().children().toArray();

  const nodes: Array<{ data: string }> = [];
  for (const root of roots) {
    collectTextNodes(root, nodes);
  }

  const workItems = nodes
    .map((node) => {
      const bounds = getTrimmedTextBoundaries(node.data);
      return {
        node,
        leading: bounds.leading,
        trailing: bounds.trailing,
        core: bounds.core,
      };
    })
    .filter((item) => item.core);

  for (let i = 0; i < workItems.length; i += TRANSLATION_BATCH_SIZE) {
    const batch = workItems.slice(i, i + TRANSLATION_BATCH_SIZE);
    const translated = await translateEntriesSafely(
      batch.map((item) => item.core),
      sourceLanguage,
      targetLanguage,
    );

    translated.forEach((translatedText, index) => {
      const item = batch[index];
      item.node.data = `${item.leading}${translatedText}${item.trailing}`;
    });
  }

  const html = $("html");
  if (html.length) {
    html.attr("lang", targetLanguage);
    html.attr("xml:lang", targetLanguage);
  }

  return $.xml();
}

async function translateOpfMetadata(
  opfContent: string,
  sourceLanguage: string,
  targetLanguage: string,
): Promise<string> {
  const $ = cheerio.load(opfContent, { xmlMode: true });

  const metadataTargets = ["metadata > dc\\:title", "metadata > dc\\:description"];
  for (const selector of metadataTargets) {
    const elements = $(selector).toArray();
    for (const element of elements) {
      const entry = $(element);
      const original = entry.text().trim();
      if (!original) continue;
      const translated = await translateSingleText(original, sourceLanguage, targetLanguage);
      entry.text(translated);
    }
  }

  const languageTags = $("metadata > dc\\:language");
  if (languageTags.length > 0) {
    languageTags.first().text(targetLanguage);
  }

  const packageNode = $("package");
  if (packageNode.length) {
    packageNode.attr("lang", targetLanguage);
    packageNode.attr("xml:lang", targetLanguage);
  }

  return $.xml();
}

async function validateEpubFile(zip: JSZip): Promise<void> {
  const mimetype = await readZipFileAsText(zip, "mimetype");
  if (mimetype.trim() !== EPUB_MIME_TYPE) {
    throw new EpubValidationError("Archivo EPUB inválido: mimetype incorrecto");
  }

  if (zip.file("META-INF/encryption.xml")) {
    throw new EpubValidationError("Este EPUB está cifrado o protegido (DRM) y no es compatible");
  }
}

export async function extractEpubTextForDetection(buffer: Buffer): Promise<ExtractedEpubText> {
  const zip = await JSZip.loadAsync(buffer);
  await validateEpubFile(zip);

  const structure = await parseEpubStructure(zip);

  const extractedParts: string[] = [];
  let chapterCount = 0;

  for (const spineDoc of structure.spineDocuments) {
    if (spineDoc.isNav || isTocDocumentPath(spineDoc.zipPath)) continue;

    const xhtml = await readZipFileAsText(zip, spineDoc.zipPath);
    const visibleTextNodes = await extractVisibleTextFromDocument(xhtml);
    if (visibleTextNodes.length === 0) continue;

    extractedParts.push(visibleTextNodes.join("\n"));
    chapterCount += 1;
  }

  const text = extractedParts.join("\n\n").trim();
  if (!text) {
    throw new EpubValidationError("No se encontró texto visible en el EPUB");
  }

  return {
    text,
    charCount: text.length,
    chapterCount,
  };
}

export async function translateEpubBuffer(
  buffer: Buffer,
  options: TranslateEpubOptions,
): Promise<Buffer> {
  const zip = await JSZip.loadAsync(buffer);
  await validateEpubFile(zip);

  const { sourceLanguage, targetLanguage } = options;
  const structure = await parseEpubStructure(zip);

  for (const spineDoc of structure.spineDocuments) {
    if (spineDoc.isNav || isTocDocumentPath(spineDoc.zipPath)) continue;

    const original = await readZipFileAsText(zip, spineDoc.zipPath);
    const translated = await translateXhtmlDocument(original, sourceLanguage, targetLanguage);
    zip.file(spineDoc.zipPath, translated);
  }

  const opfContent = await readZipFileAsText(zip, structure.rootfilePath);
  const translatedOpf = await translateOpfMetadata(opfContent, sourceLanguage, targetLanguage);
  zip.file(structure.rootfilePath, translatedOpf);

  return zip.generateAsync({ type: "nodebuffer" });
}
