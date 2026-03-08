import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const BRAND = {
  name: "Lápis Criativo",
  tagline: "Agência de Marketing Digital",
  primaryColor: [127, 62, 224] as [number, number, number],
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

function checkPageBreak(doc: jsPDF, y: number, needed: number): number {
  if (y + needed > 275) { doc.addPage(); return 20; }
  return y;
}

const complexidadeLabel: Record<string, string> = { baixo: "Baixo", medio: "Médio", alto: "Alto" };

export function generatePropostaPDF(proposta: any, itens: any[], cliente: any, configPag?: any) {
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

  // Serviços Contratados section
  const servicosComDetalhes = itens.filter((item) => item.servicos);
  if (servicosComDetalhes.length > 0) {
    y = checkPageBreak(doc, y, 20);
    doc.setFillColor(245, 243, 255);
    doc.roundedRect(15, y - 4, 180, 10, 2, 2, "F");
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...BRAND.primaryColor);
    doc.text("SERVIÇOS CONTRATADOS", 20, y + 3);
    y += 14;

    for (const item of servicosComDetalhes) {
      const s = item.servicos;
      const entregaveis = s.entregaveis ? s.entregaveis.split("\n").filter((e: string) => e.trim()) : [];
      const neededH = 30 + entregaveis.length * 5;
      y = checkPageBreak(doc, y, neededH);

      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...BRAND.darkColor);
      doc.text(`• ${s.nome}`, 22, y);
      y += 6;

      if (s.descricao) {
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...BRAND.grayColor);
        const descLines = doc.splitTextToSize(s.descricao, 160);
        doc.text(descLines, 26, y);
        y += descLines.length * 4 + 2;
      }

      if (s.prazo_entrega) y = addSection(doc, y, "  Prazo:", `${s.prazo_entrega} dias`);
      if (s.nivel_complexidade) y = addSection(doc, y, "  Complexidade:", complexidadeLabel[s.nivel_complexidade] || s.nivel_complexidade);

      const implVal = Number(s.valor_implantacao || 0);
      const mensVal = Number(s.valor_mensal || 0);
      if (implVal > 0) y = addSection(doc, y, "  Implantação:", `R$ ${implVal.toFixed(2)}`);
      if (mensVal > 0) y = addSection(doc, y, "  Mensal:", `R$ ${mensVal.toFixed(2)}`);

      if (entregaveis.length > 0) {
        doc.setTextColor(...BRAND.grayColor);
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.text("  Entregáveis:", 22, y);
        y += 5;
        doc.setTextColor(...BRAND.darkColor);
        for (const ent of entregaveis) {
          y = checkPageBreak(doc, y, 6);
          doc.text(`    → ${ent.trim()}`, 24, y);
          y += 5;
        }
      }
      y += 5;
    }
  }

  // Items table
  y = checkPageBreak(doc, y, 30);
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
    columnStyles: { 0: { cellWidth: 85 }, 1: { halign: "center", cellWidth: 20 }, 2: { halign: "right", cellWidth: 35 }, 3: { halign: "right", cellWidth: 35 } },
    margin: { left: 15, right: 15 },
  });

  let finalY = (doc as any).lastAutoTable?.finalY || y + 50;
  finalY += 10;

  // Financial summary
  const totalImpl = servicosComDetalhes.reduce((s, i) => s + Number(i.servicos?.valor_implantacao || 0), 0);
  const totalMens = servicosComDetalhes.reduce((s, i) => s + Number(i.servicos?.valor_mensal || 0), 0);
  if (totalImpl > 0 || totalMens > 0) {
    finalY = checkPageBreak(doc, finalY, 40);
    doc.setFillColor(245, 243, 255);
    doc.roundedRect(15, finalY - 4, 180, 10, 2, 2, "F");
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...BRAND.primaryColor);
    doc.text("RESUMO FINANCEIRO", 20, finalY + 3);
    finalY += 14;
    if (totalImpl > 0) finalY = addSection(doc, finalY, "Implantação:", `R$ ${totalImpl.toFixed(2)}`);
    if (totalMens > 0) finalY = addSection(doc, finalY, "Mensalidade:", `R$ ${totalMens.toFixed(2)}`);
    finalY = addSection(doc, finalY, "Total Geral:", `R$ ${Number(proposta.valor_total).toFixed(2)}`);
    finalY += 5;
  }

  if (proposta.observacoes) {
    finalY = checkPageBreak(doc, finalY, 15);
    doc.setFontSize(9);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(...BRAND.grayColor);
    doc.text("Observações: " + proposta.observacoes, 20, finalY, { maxWidth: 170 });
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
      item.descricao, String(item.quantidade),
      `R$ ${Number(item.valor_unitario).toFixed(2)}`, `R$ ${Number(item.valor_total).toFixed(2)}`,
    ]),
    foot: [["", "", "TOTAL", `R$ ${Number(contrato.valor_total).toFixed(2)}`]],
    theme: "grid",
    headStyles: { fillColor: BRAND.primaryColor, textColor: [255, 255, 255], fontStyle: "bold" },
    footStyles: { fillColor: [245, 243, 255], textColor: BRAND.darkColor, fontStyle: "bold", fontSize: 11 },
    styles: { fontSize: 9, cellPadding: 4 },
    columnStyles: { 0: { cellWidth: 85 }, 1: { halign: "center", cellWidth: 20 }, 2: { halign: "right", cellWidth: 35 }, 3: { halign: "right", cellWidth: 35 } },
    margin: { left: 15, right: 15 },
  });

  let finalY = (doc as any).lastAutoTable?.finalY || y + 50;
  finalY += 10;

  // CLÁUSULA DE SERVIÇOS
  const servicosComDetalhes = itens.filter((item) => item.servicos);
  if (servicosComDetalhes.length > 0) {
    finalY = checkPageBreak(doc, finalY, 30);
    doc.setFillColor(245, 243, 255);
    doc.roundedRect(15, finalY - 4, 180, 10, 2, 2, "F");
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...BRAND.primaryColor);
    doc.text("CLÁUSULA DE SERVIÇOS", 20, finalY + 3);
    finalY += 14;

    let hasReuniao = false;
    for (const item of servicosComDetalhes) {
      const s = item.servicos;
      const entregaveis = s.entregaveis ? s.entregaveis.split("\n").filter((e: string) => e.trim()) : [];
      const neededH = 20 + entregaveis.length * 5;
      finalY = checkPageBreak(doc, finalY, neededH);

      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...BRAND.darkColor);
      doc.text(`• ${s.nome}`, 22, finalY);
      finalY += 6;

      if (s.descricao) {
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...BRAND.grayColor);
        const dLines = doc.splitTextToSize(s.descricao, 160);
        doc.text(dLines, 26, finalY);
        finalY += dLines.length * 4 + 2;
      }
      if (s.prazo_entrega) finalY = addSection(doc, finalY, "  Prazo:", `${s.prazo_entrega} dias`);
      if (entregaveis.length > 0) {
        doc.setTextColor(...BRAND.grayColor);
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.text("  Entregáveis:", 22, finalY);
        finalY += 5;
        doc.setTextColor(...BRAND.darkColor);
        for (const ent of entregaveis) {
          finalY = checkPageBreak(doc, finalY, 6);
          doc.text(`    → ${ent.trim()}`, 24, finalY);
          finalY += 5;
        }
      }
      if (s.requer_reuniao) hasReuniao = true;
      finalY += 4;
    }

    // Reunião clause
    if (hasReuniao) {
      finalY = checkPageBreak(doc, finalY, 15);
      finalY += 4;
      doc.setFillColor(255, 248, 230);
      doc.roundedRect(15, finalY - 4, 180, 12, 2, 2, "F");
      doc.setFontSize(9);
      doc.setFont("helvetica", "bolditalic");
      doc.setTextColor(140, 100, 20);
      doc.text("O projeto terá início após reunião inicial de alinhamento entre as partes.", 20, finalY + 3);
      finalY += 16;
    }

    // CLÁUSULA DE PAGAMENTO
    const totalImpl = servicosComDetalhes.reduce((s, i) => s + Number(i.servicos?.valor_implantacao || 0), 0);
    const totalMens = servicosComDetalhes.reduce((s, i) => s + Number(i.servicos?.valor_mensal || 0), 0);
    if (totalImpl > 0 || totalMens > 0) {
      finalY = checkPageBreak(doc, finalY, 40);
      doc.setFillColor(245, 243, 255);
      doc.roundedRect(15, finalY - 4, 180, 10, 2, 2, "F");
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...BRAND.primaryColor);
      doc.text("CLÁUSULA DE PAGAMENTO", 20, finalY + 3);
      finalY += 14;
      if (totalImpl > 0) finalY = addSection(doc, finalY, "Implantação:", `R$ ${totalImpl.toFixed(2)}`);
      if (totalMens > 0) finalY = addSection(doc, finalY, "Mensal recorrente:", `R$ ${totalMens.toFixed(2)}`);
      finalY = addSection(doc, finalY, "Forma:", contrato.tipo_pagamento === "mensal" ? "Pagamento Mensal Recorrente" : "Pagamento Único");
      finalY = addSection(doc, finalY, "Total:", `R$ ${Number(contrato.valor_total).toFixed(2)}`);
      finalY += 5;
    }
  }

  if (contrato.observacoes) {
    finalY = checkPageBreak(doc, finalY, 15);
    doc.setFontSize(9);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(...BRAND.grayColor);
    doc.text("Observações: " + contrato.observacoes, 20, finalY, { maxWidth: 170 });
  }

  addFooter(doc);
  doc.save(`Contrato_${contrato.numero}_${cliente?.nome || "cliente"}.pdf`);
}
