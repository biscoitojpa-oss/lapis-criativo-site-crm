import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const BRAND = {
  name: "Lápis Criativo",
  tagline: "Agência de Marketing Digital",
  primaryColor: [127, 62, 224] as [number, number, number], // purple
  darkColor: [30, 25, 50] as [number, number, number],
  grayColor: [120, 120, 140] as [number, number, number],
};

function addHeader(doc: jsPDF, title: string, numero: number) {
  doc.setFillColor(...BRAND.darkColor);
  doc.rect(0, 0, 210, 40, "F");

  doc.setFillColor(...BRAND.primaryColor);
  doc.rect(0, 38, 210, 3, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text(BRAND.name, 20, 20);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(BRAND.tagline, 20, 28);

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(`${title} #${numero}`, 190, 20, { align: "right" });

  doc.setTextColor(...BRAND.darkColor);
}

function addFooter(doc: jsPDF) {
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFillColor(...BRAND.primaryColor);
    doc.rect(0, 284, 210, 13, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.text(`${BRAND.name} — ${BRAND.tagline}`, 20, 291);
    doc.text(`Página ${i} de ${pageCount}`, 190, 291, { align: "right" });
  }
}

function addSection(doc: jsPDF, y: number, label: string, value: string) {
  doc.setTextColor(...BRAND.grayColor);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(label, 20, y);
  doc.setTextColor(...BRAND.darkColor);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(value, 70, y);
  return y + 7;
}

export function generatePropostaPDF(proposta: any, itens: any[], cliente: any) {
  const doc = new jsPDF();
  addHeader(doc, "Proposta", proposta.numero);

  let y = 55;

  // Client info
  doc.setFillColor(245, 243, 255);
  doc.roundedRect(15, y - 5, 180, 40, 3, 3, "F");

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND.primaryColor);
  doc.text("Dados do Cliente", 20, y + 3);
  y += 12;

  y = addSection(doc, y, "Cliente:", cliente?.nome || "—");
  if (cliente?.empresa) y = addSection(doc, y, "Empresa:", cliente.empresa);
  if (cliente?.email) y = addSection(doc, y, "Email:", cliente.email);
  if (cliente?.whatsapp) y = addSection(doc, y, "WhatsApp:", cliente.whatsapp);
  y += 8;

  // Proposal info
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND.primaryColor);
  doc.text("Detalhes da Proposta", 20, y);
  y += 8;

  y = addSection(doc, y, "Título:", proposta.titulo);
  y = addSection(doc, y, "Validade:", `${proposta.validade_dias} dias`);
  y = addSection(doc, y, "Data:", new Date(proposta.criado_em).toLocaleDateString("pt-BR"));
  if (proposta.descricao) {
    y += 3;
    doc.setTextColor(...BRAND.grayColor);
    doc.setFontSize(9);
    doc.text("Descrição:", 20, y);
    y += 5;
    doc.setTextColor(...BRAND.darkColor);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(proposta.descricao, 170);
    doc.text(lines, 20, y);
    y += lines.length * 5;
  }
  y += 8;

  // Items table
  autoTable(doc, {
    startY: y,
    head: [["Descrição", "Qtd", "Valor Unit.", "Total"]],
    body: itens.map((item) => [
      item.descricao,
      String(item.quantidade),
      `R$ ${Number(item.valor_unitario).toFixed(2)}`,
      `R$ ${Number(item.valor_total).toFixed(2)}`,
    ]),
    foot: [["", "", "TOTAL", `R$ ${Number(proposta.valor_total).toFixed(2)}`]],
    theme: "grid",
    headStyles: { fillColor: BRAND.primaryColor, textColor: [255, 255, 255], fontStyle: "bold" },
    footStyles: { fillColor: [245, 243, 255], textColor: BRAND.darkColor, fontStyle: "bold", fontSize: 11 },
    styles: { fontSize: 9, cellPadding: 4 },
    columnStyles: {
      0: { cellWidth: 85 },
      1: { halign: "center", cellWidth: 20 },
      2: { halign: "right", cellWidth: 35 },
      3: { halign: "right", cellWidth: 35 },
    },
    margin: { left: 15, right: 15 },
  });

  if (proposta.observacoes) {
    const finalY = (doc as any).lastAutoTable?.finalY || y + 50;
    doc.setFontSize(9);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(...BRAND.grayColor);
    doc.text("Observações: " + proposta.observacoes, 20, finalY + 12, { maxWidth: 170 });
  }

  addFooter(doc);
  doc.save(`Proposta_${proposta.numero}_${cliente?.nome || "cliente"}.pdf`);
}

export function generateContratoPDF(contrato: any, itens: any[], cliente: any) {
  const doc = new jsPDF();
  addHeader(doc, "Contrato", contrato.numero);

  let y = 55;

  // Client info
  doc.setFillColor(245, 243, 255);
  doc.roundedRect(15, y - 5, 180, 45, 3, 3, "F");

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND.primaryColor);
  doc.text("Contratante", 20, y + 3);
  y += 12;

  y = addSection(doc, y, "Cliente:", cliente?.nome || "—");
  if (cliente?.empresa) y = addSection(doc, y, "Empresa:", cliente.empresa);
  if (cliente?.cnpj_cpf) y = addSection(doc, y, "CNPJ/CPF:", cliente.cnpj_cpf);
  if (cliente?.email) y = addSection(doc, y, "Email:", cliente.email || "—");
  y += 10;

  // Contract details
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND.primaryColor);
  doc.text("Detalhes do Contrato", 20, y);
  y += 8;

  y = addSection(doc, y, "Título:", contrato.titulo);
  y = addSection(doc, y, "Tipo:", contrato.tipo_pagamento === "mensal" ? "Pagamento Mensal" : "Pagamento Único");
  y = addSection(doc, y, "Valor Total:", `R$ ${Number(contrato.valor_total).toFixed(2)}`);
  if (contrato.tipo_pagamento === "mensal") {
    y = addSection(doc, y, "Valor Mensal:", `R$ ${Number(contrato.valor_mensal).toFixed(2)}`);
    y = addSection(doc, y, "Duração:", `${contrato.duracao_meses} meses`);
  }
  y = addSection(doc, y, "Início:", new Date(contrato.data_inicio).toLocaleDateString("pt-BR"));
  if (contrato.data_fim) y = addSection(doc, y, "Fim:", new Date(contrato.data_fim).toLocaleDateString("pt-BR"));
  y += 8;

  // Items table
  autoTable(doc, {
    startY: y,
    head: [["Descrição", "Qtd", "Valor Unit.", "Total"]],
    body: itens.map((item) => [
      item.descricao,
      String(item.quantidade),
      `R$ ${Number(item.valor_unitario).toFixed(2)}`,
      `R$ ${Number(item.valor_total).toFixed(2)}`,
    ]),
    foot: [["", "", "TOTAL", `R$ ${Number(contrato.valor_total).toFixed(2)}`]],
    theme: "grid",
    headStyles: { fillColor: BRAND.primaryColor, textColor: [255, 255, 255], fontStyle: "bold" },
    footStyles: { fillColor: [245, 243, 255], textColor: BRAND.darkColor, fontStyle: "bold", fontSize: 11 },
    styles: { fontSize: 9, cellPadding: 4 },
    columnStyles: {
      0: { cellWidth: 85 },
      1: { halign: "center", cellWidth: 20 },
      2: { halign: "right", cellWidth: 35 },
      3: { halign: "right", cellWidth: 35 },
    },
    margin: { left: 15, right: 15 },
  });

  if (contrato.observacoes) {
    const finalY = (doc as any).lastAutoTable?.finalY || y + 50;
    doc.setFontSize(9);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(...BRAND.grayColor);
    doc.text("Observações: " + contrato.observacoes, 20, finalY + 12, { maxWidth: 170 });
  }

  addFooter(doc);
  doc.save(`Contrato_${contrato.numero}_${cliente?.nome || "cliente"}.pdf`);
}
