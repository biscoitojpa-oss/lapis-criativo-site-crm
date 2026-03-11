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

const CONTACT = {
  phone: "(21) 96598-2906",
  email: "contato@agencialapiscriativo.com.br",
  website: "www.agencialapiscriativo.com.br",
  instagram: "@lapiscriativo",
};

function addPageLogo(doc: jsPDF) {
  // Simple centered "Lápis Criativo" text as logo placeholder at top of each page
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND.primaryColor);
  doc.text(BRAND.name, 105, 20, { align: "center" });
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...BRAND.grayColor);
  doc.text(BRAND.tagline, 105, 26, { align: "center" });
}

function addSeparator(doc: jsPDF, y: number): number {
  doc.setDrawColor(200, 200, 210);
  doc.setLineWidth(0.5);
  doc.line(20, y, 190, y);
  return y + 8;
}

function addSectionTitle(doc: jsPDF, y: number, title: string): number {
  y = checkPageBreak(doc, y, 15);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND.darkColor);
  doc.text(title, 20, y);
  return y + 8;
}

function addParagraph(doc: jsPDF, y: number, text: string, opts?: { bold?: boolean; italic?: boolean; fontSize?: number; color?: [number, number, number] }): number {
  const fontSize = opts?.fontSize || 10;
  const color = opts?.color || BRAND.darkColor;
  doc.setFontSize(fontSize);
  const style = opts?.bold && opts?.italic ? "bolditalic" : opts?.bold ? "bold" : opts?.italic ? "italic" : "normal";
  doc.setFont("helvetica", style);
  doc.setTextColor(...color);
  const lines = doc.splitTextToSize(text, 170);
  for (let i = 0; i < lines.length; i++) {
    y = checkPageBreak(doc, y, 6);
    doc.text(lines[i], 20, y);
    y += 5;
  }
  return y + 2;
}

function addBulletList(doc: jsPDF, y: number, items: string[]): number {
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...BRAND.darkColor);
  for (const item of items) {
    y = checkPageBreak(doc, y, 8);
    const lines = doc.splitTextToSize(item, 155);
    doc.text("•", 24, y);
    doc.text(lines, 30, y);
    y += lines.length * 5 + 3;
  }
  return y;
}

export function generatePropostaPDF(proposta: any, itens: any[], cliente: any, configPag?: any) {
  const doc = new jsPDF();
  const servicosComDetalhes = itens.filter((item) => item.servicos);

  // ========== PAGE 1: Apresentação + Propósito + Proposta de Valor + Serviços ==========
  addPageLogo(doc);
  let y = 35;

  // Title
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND.darkColor);
  doc.text(`PROPOSTA COMERCIAL — ${BRAND.name.toUpperCase()}`, 105, y, { align: "center" });
  y += 4;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...BRAND.grayColor);
  doc.text(`Proposta #${proposta.numero} • ${new Date(proposta.criado_em).toLocaleDateString("pt-BR")}`, 105, y + 5, { align: "center" });
  y += 14;

  // Dados do Cliente
  y = addSeparator(doc, y);
  y = addSectionTitle(doc, y, "Cliente");
  y = addParagraph(doc, y, `${cliente?.nome || "—"}${cliente?.empresa ? " — " + cliente.empresa : ""}`, { bold: true });
  if (cliente?.email) y = addParagraph(doc, y, `Email: ${cliente.email}`, { fontSize: 9, color: BRAND.grayColor });
  if (cliente?.whatsapp) y = addParagraph(doc, y, `WhatsApp: ${cliente.whatsapp}`, { fontSize: 9, color: BRAND.grayColor });
  if (cliente?.cnpj_cpf) y = addParagraph(doc, y, `CNPJ/CPF: ${cliente.cnpj_cpf}`, { fontSize: 9, color: BRAND.grayColor });
  y += 4;

  // Apresentação
  y = addSeparator(doc, y);
  y = addSectionTitle(doc, y, "Apresentação");
  y = addParagraph(doc, y, "Prazer, sou Igor Souto, fundador da Agência Lápis Criativo, especialista em Marketing Digital, Tráfego Pago, Web Design e Inteligência Artificial. Nossa missão é transformar ideias em resultados reais, combinando estratégia, tecnologia e criatividade para impulsionar marcas em todas as etapas da jornada digital.");
  y = addParagraph(doc, y, "A Lápis Criativo nasceu da união entre publicidade, marketing e tecnologia, oferecendo soluções completas que unem performance e estética, com foco em crescimento previsível e mensurável.");
  y += 2;

  // Propósito
  y = addSeparator(doc, y);
  y = addSectionTitle(doc, y, "Propósito");
  y = addParagraph(doc, y, "Impulsionar negócios por meio de marketing estratégico, automação e inteligência criativa.", { bold: true, color: BRAND.primaryColor });
  y += 2;
  y = addParagraph(doc, y, "Visão: Ser referência nacional em performance digital e inovação.", { fontSize: 9 });
  y = addParagraph(doc, y, "Valores: Ética, inovação, comprometimento, transparência e resultado.", { fontSize: 9 });
  y += 2;

  // Proposta de Valor
  y = addSeparator(doc, y);
  y = addSectionTitle(doc, y, "Proposta de Valor");
  y = addParagraph(doc, y, "Transformamos empresas que vivem de indicações e instabilidade em máquinas previsíveis de geração de clientes, por meio de posicionamento digital estratégico e campanhas orientadas por dados.");
  y += 4;

  // Descrição da proposta (se houver)
  if (proposta.descricao) {
    y = addSeparator(doc, y);
    y = addSectionTitle(doc, y, "Sobre esta Proposta");
    y = addParagraph(doc, y, proposta.descricao);
    y += 2;
  }

  // ========== SERVIÇOS CONTRATADOS ==========
  y = addSeparator(doc, y);
  y = addSectionTitle(doc, y, "Empacotamento dos Serviços");

  if (servicosComDetalhes.length > 0) {
    for (let idx = 0; idx < servicosComDetalhes.length; idx++) {
      const item = servicosComDetalhes[idx];
      const s = item.servicos;
      const entregaveis = s.entregaveis ? s.entregaveis.split("\n").filter((e: string) => e.trim()) : [];
      const neededH = 30 + entregaveis.length * 6;
      y = checkPageBreak(doc, y, neededH);

      // Service title with price
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...BRAND.darkColor);
      const implVal = Number(s.valor_implantacao || 0);
      const mensVal = Number(s.valor_mensal || 0);
      let priceLabel = "";
      if (mensVal > 0) priceLabel = ` — R$ ${mensVal.toFixed(2)}/mês`;
      else if (implVal > 0) priceLabel = ` — R$ ${implVal.toFixed(2)} (Pagamento único)`;
      doc.text(`${idx + 1}. ${s.nome}${priceLabel}`, 20, y);
      y += 7;

      // Description
      if (s.descricao) {
        y = addParagraph(doc, y, s.descricao, { fontSize: 9, color: BRAND.grayColor });
      }

      // Includes list
      if (entregaveis.length > 0) {
        y = addParagraph(doc, y, "Inclui:", { fontSize: 9, color: BRAND.grayColor });
        y = addBulletList(doc, y, entregaveis.map((e: string) => e.trim()));
      }

      // Prazo
      if (s.prazo_entrega) {
        y = addParagraph(doc, y, `Prazo de implantação: até ${s.prazo_entrega} dias úteis.`, { fontSize: 9, italic: true, color: BRAND.grayColor });
      }

      y += 4;
    }
  } else {
    // Fallback: show items table if no service details
    for (const item of itens) {
      y = checkPageBreak(doc, y, 10);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...BRAND.darkColor);
      doc.text(`• ${item.descricao}`, 22, y);
      doc.setFont("helvetica", "normal");
      doc.text(`R$ ${Number(item.valor_total).toFixed(2)}`, 190, y, { align: "right" });
      y += 7;
    }
  }

  // Serviços Adicionais
  y = checkPageBreak(doc, y, 30);
  y = addSeparator(doc, y);
  y = addSectionTitle(doc, y, "Serviços Adicionais (Sob Demanda)");
  y = addBulletList(doc, y, [
    "Criação de Sites e Landing Pages Extras",
    "Edição de Vídeos e Motion Graphics",
    "Campanhas de Lançamento e Remarketing",
    "Sistemas Web sob medida (CRM, Painel de Gestão, eCommerce)",
    "Mentoria e Treinamentos em Tráfego Pago e IA",
    "Consultoria de Branding e Posicionamento",
  ]);
  y += 2;

  // Ancoragem de Valor
  y = checkPageBreak(doc, y, 30);
  y = addSeparator(doc, y);
  y = addSectionTitle(doc, y, "Ancoragem de Valor");
  y = addParagraph(doc, y, "Um profissional interno de marketing custaria em média R$ 6.000/mês, além de encargos e ferramentas.");
  y = addParagraph(doc, y, "Com a Lápis Criativo, sua empresa tem uma equipe completa de especialistas por menos da metade desse investimento — com performance comprovada e suporte personalizado.");
  y += 2;

  // Oferta Exclusiva
  y = checkPageBreak(doc, y, 30);
  y = addSeparator(doc, y);
  y = addSectionTitle(doc, y, "Oferta Exclusiva");
  y = addParagraph(doc, y, "Clientes que fecharem parceria até a data de emissão desta proposta garantem:");
  y = addBulletList(doc, y, [
    "Congelamento do valor por 12 meses (sem reajuste);",
    "Setup gratuito de integração inicial (valor de R$ 800,00);",
    "Consultoria de Posicionamento Digital como bônus.",
  ]);
  y += 2;

  // Condições de Pagamento
  y = checkPageBreak(doc, y, 30);
  y = addSeparator(doc, y);
  y = addSectionTitle(doc, y, "Condições de Pagamento");
  y = addBulletList(doc, y, [
    "Pagamento via PIX, boleto ou transferência bancária;",
    "Vencimento no ato da assinatura do contrato;",
    "Contrato mensal (renovável automaticamente);",
    "Cancelamento mediante aviso prévio de 15 dias.",
  ]);

  // Payment info from config
  if (configPag && (configPag.chave_pix || configPag.link_pagamento_cartao)) {
    y += 4;
    if (configPag.chave_pix) {
      y = addParagraph(doc, y, `PIX: ${configPag.chave_pix}`, { fontSize: 9, bold: true });
      if (configPag.nome_recebedor) y = addParagraph(doc, y, `Recebedor: ${configPag.nome_recebedor}`, { fontSize: 9, color: BRAND.grayColor });
      if (configPag.banco) y = addParagraph(doc, y, `Banco: ${configPag.banco}`, { fontSize: 9, color: BRAND.grayColor });
    }
    if (configPag.link_pagamento_cartao) {
      y = addParagraph(doc, y, `Pagamento por cartão: ${configPag.link_pagamento_cartao}`, { fontSize: 9, bold: true });
    }
  }
  y += 2;

  // Resumo Financeiro
  y = checkPageBreak(doc, y, 30);
  y = addSeparator(doc, y);
  y = addSectionTitle(doc, y, "Resumo Financeiro");
  const totalImpl = servicosComDetalhes.reduce((s, i) => s + Number(i.servicos?.valor_implantacao || 0), 0);
  const totalMens = servicosComDetalhes.reduce((s, i) => s + Number(i.servicos?.valor_mensal || 0), 0);
  if (totalImpl > 0) y = addParagraph(doc, y, `Implantação: R$ ${totalImpl.toFixed(2)}`, { bold: true });
  if (totalMens > 0) y = addParagraph(doc, y, `Mensalidade: R$ ${totalMens.toFixed(2)}`, { bold: true });
  y = addParagraph(doc, y, `Valor Total: R$ ${Number(proposta.valor_total).toFixed(2)}`, { bold: true, fontSize: 12, color: BRAND.primaryColor });
  y += 2;

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

  // Prazos
  finalY = checkPageBreak(doc, finalY, 25);
  finalY = addSeparator(doc, finalY);
  finalY = addSectionTitle(doc, finalY, "Prazos");
  finalY = addParagraph(doc, finalY, "Após assinatura, o projeto é iniciado em até 7 dias úteis, com reunião de alinhamento e acesso à área exclusiva do cliente.");

  // Validade
  const validadeDate = new Date(proposta.criado_em);
  validadeDate.setDate(validadeDate.getDate() + (proposta.validade_dias || 30));
  finalY = addParagraph(doc, finalY, `Proposta válida até o dia ${validadeDate.toLocaleDateString("pt-BR")}`, { bold: true });
  finalY += 4;

  // Observações
  if (proposta.observacoes) {
    finalY = checkPageBreak(doc, finalY, 15);
    finalY = addSeparator(doc, finalY);
    finalY = addSectionTitle(doc, finalY, "Observações");
    finalY = addParagraph(doc, finalY, proposta.observacoes, { italic: true, color: BRAND.grayColor });
    finalY += 2;
  }

  // Contato
  finalY = checkPageBreak(doc, finalY, 40);
  finalY = addSeparator(doc, finalY);
  finalY = addSectionTitle(doc, finalY, "Contato");
  finalY = addParagraph(doc, finalY, "Agência Lápis Criativo", { bold: true });
  finalY = addParagraph(doc, finalY, CONTACT.phone, { fontSize: 9 });
  finalY = addParagraph(doc, finalY, CONTACT.email, { fontSize: 9 });
  finalY = addParagraph(doc, finalY, CONTACT.website, { fontSize: 9 });
  finalY = addParagraph(doc, finalY, `Instagram: ${CONTACT.instagram}`, { fontSize: 9 });

  // Footer with page numbers
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    // Add logo to every page header (except first which already has it)
    if (i > 1) {
      addPageLogo(doc);
    }
    // Page number footer
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...BRAND.grayColor);
    doc.text(`${BRAND.name} — ${BRAND.tagline} • Página ${i} de ${pageCount}`, 105, 290, { align: "center" });
  }

  doc.save(`Proposta_${proposta.numero}_${cliente?.nome || "cliente"}.pdf`);
}

export function generateContratoPDF(contrato: any, itens: any[], cliente: any, configPag?: any) {
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

  // Payment section
  if (configPag && (configPag.chave_pix || configPag.link_pagamento_cartao)) {
    finalY = checkPageBreak(doc, finalY, 40);
    doc.setFillColor(245, 243, 255);
    doc.roundedRect(15, finalY - 4, 180, 10, 2, 2, "F");
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...BRAND.primaryColor);
    doc.text("FORMA DE PAGAMENTO", 20, finalY + 3);
    finalY += 14;

    if (configPag.chave_pix) {
      finalY = addSection(doc, finalY, "PIX:", configPag.chave_pix);
      if (configPag.nome_recebedor) finalY = addSection(doc, finalY, "Recebedor:", configPag.nome_recebedor);
      if (configPag.banco) finalY = addSection(doc, finalY, "Banco:", configPag.banco);
      finalY += 3;
    }
    if (configPag.link_pagamento_cartao) {
      finalY = addSection(doc, finalY, "Cartão:", configPag.link_pagamento_cartao);
    }
    finalY += 5;
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
