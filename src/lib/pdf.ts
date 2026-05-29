import jsPDF from "jspdf";
import { supabase } from "@/integrations/supabase/client";
import { formatDateTime } from "./format";

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

  const ensure = (need: number) => {
    if (y + need > pageH - margin) {
      doc.addPage();
      y = margin;
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
      ensure(12);
      const valor =
        r.tipo_campo === "checkbox"
          ? r.valor === "true" ? "✓ OK" : "✗ Não realizado"
          : (r.valor ?? "—");
      const cat = r.categoria ? `[${r.categoria}] ` : "";
      const text = `${cat}${r.label}: ${valor}`;
      const split = doc.splitTextToSize(text, pageW - margin * 2 - 15);
      
      doc.setFont("helvetica", "normal").setFontSize(9);
      doc.text(split, margin + 2, y + 4);

      if (r.foto_url) {
        const itemFoto = await loadImage(r.foto_url);
        if (itemFoto) {
          try {
            // Add a small thumbnail next to the item
            doc.addImage(itemFoto, "JPEG", pageW - margin - 12, y, 10, 10);
          } catch { /* noop */ }
        }
      }
      
      y += Math.max(split.length * 5, r.foto_url ? 12 : 5);
    }
    y += 4;
  }

  // Assinaturas
  ensure(50);
  y += 4;
  doc.setFont("helvetica", "bold").setFontSize(11);
  doc.text("Assinaturas", margin, y);
  y += 4;
  const sigW = (pageW - margin * 2 - 8) / 2;
  let sigX = margin;
  let sigRowY = y;
  for (const sig of data.assinaturas) {
    const img = await loadImage(sig.imagem_url);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(sigX, sigRowY, sigW, 32, 2, 2, "S");
    if (img) {
      try { doc.addImage(img, "PNG", sigX + 2, sigRowY + 2, sigW - 4, 22); } catch { /* noop */ }
    }
    doc.setFont("helvetica", "normal").setFontSize(8);
    doc.text(`${sig.tipo === "tecnico" ? "Técnico" : "Cliente"}: ${sig.nome}`, sigX + 2, sigRowY + 30);
    sigX += sigW + 8;
    if (sigX + sigW > pageW - margin) { sigX = margin; sigRowY += 38; }
  }

  // Footer
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal").setFontSize(8).setTextColor(100, 116, 139);
    doc.text(
      `${data.company.nome} · CREA ${data.company.crea ?? "—"} · Resp. Téc.: ${data.company.responsavel_tecnico ?? "—"}`,
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
  const { data } = supabase.storage.from("pdfs").getPublicUrl(path);
  return data.publicUrl;
}
