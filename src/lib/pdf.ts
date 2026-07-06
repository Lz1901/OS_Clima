import jsPDF from "jspdf";
import { supabase } from "@/integrations/supabase/client";
import { formatDateTime } from "./format";
import { getSignedUrl } from "./storage";

async function resolveAssetUrl(bucket: string, urlOrPath?: string | null): Promise<string | null> {
  if (!urlOrPath) return null;
  // Try to sign (works for paths and legacy public URLs); fall back to raw if signing fails
  const signed = await getSignedUrl(bucket, urlOrPath, 3600);
  return signed ?? urlOrPath;
}

type Company = {
  nome: string;
  cnpj?: string | null;
  endereco?: string | null;
  telefone?: string | null;
  email?: string | null;
  crea?: string | null;
  responsavel_tecnico?: string | null;
  logo_url?: string | null;
  cor_primaria?: string | null;
};

export type PmocPdfData = {
  company: Company;
  pmoc: {
    id: string;
    numero?: string | null;
    data_inicio?: string | null;
    data_finalizacao?: string | null;
    observacoes?: string | null;
  };
  cliente: { razao_social: string; cnpj?: string | null; endereco?: string | null };
  unidade: { nome: string; endereco?: string | null };
  tecnico: { nome: string; email: string };
  equipamentos: {
    id: string;
    marca?: string | null;
    modelo?: string | null;
    tipo: string;
    numero_serie?: string | null;
    localizacao?: string | null;
    respostas: { label: string; categoria?: string | null; valor: string | null; tipo_campo: string; foto_url?: string | null }[];
  }[];
  assinaturas: { tipo: string; nome: string; imagem_url: string }[];
};

const colorHex = (hex: string): [number, number, number] => {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
};

async function loadImage(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const r = new FileReader();
      r.onloadend = () => resolve(r.result as string);
      r.onerror = () => resolve(null);
      r.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function generatePmocPdf(data: PmocPdfData): Promise<Blob> {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 14;
  let y = margin;

  const primary = colorHex(data.company.cor_primaria || "#2563eb");

  const footerReserve = 12; // space reserved for footer at bottom
  const ensure = (need: number) => {
    if (y + need > pageH - margin - footerReserve) {
      doc.addPage();
      y = margin;
    }
  };

  const writableBottom = () => pageH - margin - footerReserve;

  const sanitizePdfText = (text: string) =>
    text
      .replace(/\s+/g, " ")
      .replace(/✓/g, "OK")
      .replace(/✗/g, "Nao realizado")
      .trim();

  const drawWrappedText = (text: string, x: number, maxWidth: number, lineHeight = 5) => {
    const lines = doc.splitTextToSize(sanitizePdfText(text), maxWidth) as string[];
    for (const line of lines) {
      ensure(lineHeight + 1);
      doc.text(line, x, y + lineHeight - 1, { maxWidth });
      y += lineHeight;
    }
  };

  // Header bar
  doc.setFillColor(...primary);
  doc.rect(0, 0, pageW, 28, "F");

  if (data.company.logo_url) {
    const logo = await loadImage(data.company.logo_url);
    if (logo) {
      try { doc.addImage(logo, "PNG", margin, 6, 16, 16); } catch { /* noop */ }
    }
  }
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold").setFontSize(16);
  doc.text(data.company.nome, margin + 20, 14);
  doc.setFont("helvetica", "normal").setFontSize(9);
  doc.text(
    [data.company.cnpj, data.company.telefone, data.company.email].filter(Boolean).join(" · "),
    margin + 20,
    20
  );
  doc.text("PMOC — Plano de Manutenção, Operação e Controle", margin + 20, 25);

  y = 36;
  doc.setTextColor(15, 23, 42);

  // PMOC info
  doc.setFont("helvetica", "bold").setFontSize(13);
  doc.text(`PMOC ${data.pmoc.numero ? "#" + data.pmoc.numero : ""}`, margin, y);
  y += 6;
  doc.setFont("helvetica", "normal").setFontSize(10);
  doc.text(`Início: ${formatDateTime(data.pmoc.data_inicio)}`, margin, y);
  doc.text(`Conclusão: ${formatDateTime(data.pmoc.data_finalizacao)}`, margin + 90, y);
  y += 8;

  // Cliente / Unidade
  const box = (title: string, lines: string[]) => {
    ensure(8 + lines.length * 5 + 4);
    doc.setDrawColor(226, 232, 240);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(margin, y, pageW - margin * 2, 6 + lines.length * 5, 2, 2, "FD");
    doc.setFont("helvetica", "bold").setFontSize(10);
    doc.text(title, margin + 3, y + 5);
    doc.setFont("helvetica", "normal").setFontSize(9);
    lines.forEach((l, i) => doc.text(l, margin + 3, y + 10 + i * 5));
    y += 6 + lines.length * 5 + 3;
  };

  box("Cliente", [
    data.cliente.razao_social,
    [data.cliente.cnpj, data.cliente.endereco].filter(Boolean).join(" · ") || "—",
  ]);
  box("Unidade", [data.unidade.nome, data.unidade.endereco || "—"]);
  box("Técnico responsável", [`${data.tecnico.nome} · ${data.tecnico.email}`]);

  // Equipamentos
  for (const eq of data.equipamentos) {
    ensure(20);
    doc.setFillColor(...primary);
    doc.rect(margin, y, pageW - margin * 2, 7, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold").setFontSize(10);
    doc.text(
      `${eq.marca ?? ""} ${eq.modelo ?? ""} · ${eq.tipo}${eq.numero_serie ? " · S/N " + eq.numero_serie : ""}`,
      margin + 2,
      y + 5
    );
    y += 7;
    doc.setTextColor(15, 23, 42);
    if (eq.localizacao) {
      doc.setFont("helvetica", "italic").setFontSize(9);
      doc.text(`Local: ${eq.localizacao}`, margin + 2, y + 4);
      y += 5;
    }
    y += 2;

    doc.setFont("helvetica", "normal").setFontSize(9);
    for (const r of eq.respostas) {
      const valor =
        r.tipo_campo === "checkbox"
          ? r.valor === "true" ? "OK" : "Não realizado"
          : (r.valor ?? "—");
      const cat = r.categoria ? `[${r.categoria}] ` : "";
      const text = `${cat}${r.label}: ${valor}`;
      const textX = margin + 2;
      const textWidth = r.foto_url ? pageW - margin * 2 - 20 : pageW - margin * 2 - 4;
      const rowStartY = y;
      const imageY = y;

      doc.setFont("helvetica", "normal").setFontSize(9);
      drawWrappedText(text, textX, textWidth, 5);

      if (r.foto_url) {
        const fotoUrl = await resolveAssetUrl("pmoc-fotos", r.foto_url);
        const itemFoto = fotoUrl ? await loadImage(fotoUrl) : null;
        if (itemFoto) {
          try {
            const imageFitsCurrentPage = imageY + 10 <= writableBottom();
            if (imageFitsCurrentPage && imageY >= rowStartY) {
              doc.addImage(itemFoto, "JPEG", pageW - margin - 12, imageY, 10, 10);
              y = Math.max(y, rowStartY + 12);
            }
          } catch { /* noop */ }
        }
      }

      y += 1;
    }
    y += 4;
  }


  // Assinaturas
  ensure(12);
  y += 4;
  doc.setFont("helvetica", "bold").setFontSize(11);
  doc.text("Assinaturas", margin, y);
  y += 4;
  const sigW = (pageW - margin * 2 - 8) / 2;
  const sigH = 32;
  let sigX = margin;
  for (const sig of data.assinaturas) {
    if (sigX === margin) ensure(sigH + 4);
    const sigUrl = await resolveAssetUrl("assinaturas", sig.imagem_url);
    const img = sigUrl ? await loadImage(sigUrl) : null;
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(sigX, y, sigW, sigH, 2, 2, "S");
    if (img) {
      try { doc.addImage(img, "PNG", sigX + 2, y + 2, sigW - 4, 22); } catch { /* noop */ }
    }
    doc.setFont("helvetica", "normal").setFontSize(8);
    doc.text(`${sig.tipo === "tecnico" ? "Técnico" : "Cliente"}: ${sig.nome}`, sigX + 2, y + 30);
    sigX += sigW + 8;
    if (sigX + sigW > pageW - margin) { sigX = margin; y += sigH + 6; }
  }


  // Footer
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal").setFontSize(8).setTextColor(100, 116, 139);
    doc.text(
      `${data.company.nome} · CRT ${data.company.crea ?? "—"} · Resp. Téc.: ${data.company.responsavel_tecnico ?? "—"}`,
      margin,
      pageH - 6
    );
    doc.text(`Página ${i}/${pages}`, pageW - margin, pageH - 6, { align: "right" });
  }

  return doc.output("blob");
}

export async function uploadPmocPdf(pmocId: string, companyId: string, blob: Blob): Promise<string> {
  const path = `${companyId}/${pmocId}.pdf`;
  const { error } = await supabase.storage.from("pdfs").upload(path, blob, {
    contentType: "application/pdf",
    upsert: true,
  });
  if (error) throw error;
  // Return the storage path; consumers must mint a signed URL when displaying.
  return path;
}