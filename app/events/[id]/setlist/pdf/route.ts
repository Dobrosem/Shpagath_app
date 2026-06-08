import { readFileSync } from "fs";
import { createRequire } from "module";
import { join } from "path";
import { NextResponse } from "next/server";
import { translateEnum, translator } from "@/lib/i18n";
import {
  getLogoFilePath,
  getPrintableSetlistData,
  safeSetlistFilename,
} from "@/lib/print-setlist";
import { createClient } from "@/lib/supabase/server";
import type { Locale } from "@/lib/types";
import { formatDuration } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const require = createRequire(import.meta.url);
const PDFDocument = require("pdfkit/js/pdfkit.standalone.js") as typeof import("pdfkit");
const regularFont = readFileSync(join(process.cwd(), "node_modules", "dejavu-fonts-ttf", "ttf", "DejaVuSans.ttf"));
const boldFont = readFileSync(join(process.cwd(), "node_modules", "dejavu-fonts-ttf", "ttf", "DejaVuSans-Bold.ttf"));


function contentDisposition(filename: string) {
  const ascii = filename.replace(/[^\x20-\x7E]+/g, "").replace(/"/g, "") || "saphath-setlist.pdf";
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

function collectPdf(doc: PDFKit.PDFDocument) {
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });
}

function ensureSpace(doc: PDFKit.PDFDocument, neededHeight: number) {
  const bottom = doc.page.height - doc.page.margins.bottom;
  if (doc.y + neededHeight > bottom) doc.addPage();
}

function registerFonts(doc: PDFKit.PDFDocument) {
  doc.registerFont("SaphathRegular", regularFont);
  doc.registerFont("SaphathBold", boldFont);
  return {
    regular: "SaphathRegular",
    bold: "SaphathBold",
  };
}

function drawCenteredText(doc: PDFKit.PDFDocument, text: string, options: PDFKit.Mixins.TextOptions = {}) {
  doc.text(text, doc.page.margins.left, doc.y, {
    width: doc.page.width - doc.page.margins.left - doc.page.margins.right,
    align: "center",
    ...options,
  });
}

function toArrayBuffer(buffer: Buffer) {
  const arrayBuffer = new ArrayBuffer(buffer.byteLength);
  new Uint8Array(arrayBuffer).set(buffer);
  return arrayBuffer;
}

function drawPdf({
  doc,
  data,
  locale,
}: {
  doc: PDFKit.PDFDocument;
  data: NonNullable<Awaited<ReturnType<typeof getPrintableSetlistData>>>;
  locale: Locale;
}) {
  const t = translator(locale);
  const fonts = registerFonts(doc);
  const pageWidth = doc.page.width;
  const contentWidth = pageWidth - doc.page.margins.left - doc.page.margins.right;
  const logoPath = getLogoFilePath();

  if (logoPath) {
    const logoWidth = contentWidth * 0.58;
    const logoX = (pageWidth - logoWidth) / 2;
    const logoTop = doc.y;
    try {
      doc.image(toArrayBuffer(readFileSync(logoPath)), logoX, doc.y, { width: logoWidth });
      doc.y = logoTop + logoWidth * (1041 / 2048) + 22;
    } catch (error) {
      console.error("PDF logo render error:", error);
      doc.font(fonts.bold).fontSize(46).fillColor("#111111");
      drawCenteredText(doc, "SAPHATH", { characterSpacing: 6 });
      doc.moveDown(0.8);
    }
  } else {
    doc.font(fonts.bold).fontSize(46).fillColor("#111111");
    drawCenteredText(doc, "SAPHATH", { characterSpacing: 6 });
    doc.moveDown(0.8);
  }

  doc.font(fonts.bold).fontSize(8).fillColor("#666666");
  drawCenteredText(doc, t("printSetlist.setlist").toUpperCase(), { characterSpacing: 1.3 });
  doc.moveDown(0.3);
  doc.font(fonts.regular).fontSize(7).fillColor("#666666");
  drawCenteredText(doc, data.eventMeta.join(" • "), { characterSpacing: 0.5 });
  if (data.timingMeta.length) {
    doc.moveDown(0.2);
    doc.fontSize(6.5).fillColor("#777777");
    drawCenteredText(doc, data.timingMeta.join(" • "), { characterSpacing: 0.4 });
  }

  doc.moveDown(2.2);

  if (!data.setlistItems.length) {
    doc.font(fonts.regular).fontSize(12).fillColor("#555555");
    drawCenteredText(doc, t("printSetlist.empty"));
    return;
  }

  for (const [index, item] of data.setlistItems.entries()) {
    const song = item.song;
    const meta = [
      song?.album?.title ? `${t("printSetlist.album")}: ${song.album.title}` : null,
      song?.bpm ? `BPM: ${song.bpm}` : null,
      song?.key ? `Key: ${song.key}` : null,
      song?.tuning ? `Tuning: ${song.tuning}` : null,
      song?.duration ? `Duration: ${formatDuration(song.duration)}` : null,
    ].filter(Boolean).join(" • ");
    const title = (song?.title ?? t("battleSheet.notSpecified")).toUpperCase();
    const titleHeight = doc.heightOfString(title, { width: contentWidth - 50 });
    const detailHeight = [
      meta,
      item.live_version ? `${t("printSetlist.liveVersion")}: ${item.live_version}` : "",
      item.notes ? `${t("printSetlist.performanceNotes")}: ${item.notes}` : "",
    ].filter(Boolean).length * 14;

    ensureSpace(doc, Math.max(68, titleHeight + detailHeight + 22));
    const top = doc.y;
    doc.font(fonts.bold).fontSize(22).fillColor("#111111");
    doc.text(String(index + 1), doc.page.margins.left, top + 2, {
      width: 34,
      align: "right",
    });
    doc.font(fonts.bold).fontSize(24).fillColor("#111111");
    doc.text(title, doc.page.margins.left + 50, top, {
      width: contentWidth - 50,
      lineGap: 1,
    });
    if (meta) {
      doc.moveDown(0.15);
      doc.font(fonts.regular).fontSize(7).fillColor("#777777");
      doc.text(meta.toUpperCase(), doc.page.margins.left + 50, doc.y, {
        width: contentWidth - 50,
        characterSpacing: 0.4,
      });
    }
    if (item.live_version || item.notes) {
      doc.moveDown(0.25);
      doc.font(fonts.regular).fontSize(8.5).fillColor("#444444");
      if (item.live_version) {
        doc.text(`${t("printSetlist.liveVersion")}: ${item.live_version}`, doc.page.margins.left + 50, doc.y, {
          width: contentWidth - 50,
        });
      }
      if (item.notes) {
        doc.text(`${t("printSetlist.performanceNotes")}: ${item.notes}`, doc.page.margins.left + 50, doc.y, {
          width: contentWidth - 50,
        });
      }
    }
    doc.moveDown(1.15);
  }

  if (data.materials.length) {
    ensureSpace(doc, 90);
    doc.moveDown(0.5);
    doc.moveTo(doc.page.margins.left, doc.y)
      .lineTo(doc.page.width - doc.page.margins.right, doc.y)
      .strokeColor("#dddddd")
      .lineWidth(0.5)
      .stroke();
    doc.moveDown(0.7);
    doc.font(fonts.bold).fontSize(8).fillColor("#666666");
    doc.text(t("printSetlist.materials").toUpperCase(), { characterSpacing: 1.2 });
    doc.moveDown(0.5);
    doc.font(fonts.regular).fontSize(7).fillColor("#555555");

    for (const material of data.materials) {
      ensureSpace(doc, 28);
      const line = `${material.song?.title ?? t("battleSheet.notSpecified")} • ${translateEnum(locale, material.type)}: ${material.title}${material.version ? ` (${material.version})` : ""}`;
      doc.text(line, { width: contentWidth });
      if (material.url) {
        doc.fillColor("#777777").fontSize(6.5).text(material.url, { width: contentWidth });
        doc.fillColor("#555555").fontSize(7);
      }
      doc.moveDown(0.35);
    }
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  if (!supabase) return new NextResponse("Supabase is not configured", { status: 503 });

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) return new NextResponse("Unauthorized", { status: 401 });

  const profileResult = await supabase
    .from("profiles")
    .select("locale")
    .eq("id", user.id)
    .maybeSingle();
  const locale: Locale = profileResult.data?.locale === "en" ? "en" : "ru";
  const t = translator(locale);
  const data = await getPrintableSetlistData({
    supabase,
    eventId: id,
    locale,
    labels: {
      soundcheck: t("printSetlist.soundcheck"),
      doors: t("printSetlist.doors"),
      showStart: t("printSetlist.showStartShort"),
    },
  });

  if (!data) return new NextResponse("Event not found", { status: 404 });

  const doc = new PDFDocument({
    size: "A4",
    margin: 42,
    info: {
      Title: `${t("printSetlist.setlistPdf")} - ${data.event.title}`,
      Author: "Saphath",
      Subject: t("printSetlist.downloadPrintFile"),
    },
  });
  const pdfPromise = collectPdf(doc);
  drawPdf({ doc, data, locale });
  doc.end();
  const pdf = await pdfPromise;
  const filename = safeSetlistFilename(data.event);

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": contentDisposition(filename),
      "Cache-Control": "private, no-store",
    },
  });
}
