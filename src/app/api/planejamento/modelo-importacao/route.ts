import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { auth } from "@/lib/auth";

export const runtime = "nodejs";

const EXEMPLO_LINHAS: [string, string, string, string, string, number | string, string, number | string][] = [
  ["1", "Serviços preliminares", "", "", "", "", "", ""],
  ["1.1", "Instalação do canteiro", "", "2026-09-01", "2026-09-05", 5, "Serviço terceirizado", 2500],
  ["2", "Fundação", "", "", "", "", "", ""],
  ["2.1", "Escavação", "1.1", "2026-09-08", "2026-09-11", 4, "Equipamento", 1800],
  ["2.2", "Concretagem", "2.1", "2026-09-12", "2026-09-17", 6, "Material", 9500],
  ["3", "Estrutura", "", "", "", "", "", ""],
  ["3.1", "Alvenaria", "2", "2026-09-18", "2026-09-25", 8, "Mão de obra", 4200],
];

export async function GET() {
  const session = await auth();
  if (!session?.user || !["ADMINISTRADOR", "ENGENHEIRO"].includes(session.user.role)) {
    return NextResponse.json({ error: "Acesso não autorizado." }, { status: 403 });
  }

  const workbook = new ExcelJS.Workbook();

  const planejamento = workbook.addWorksheet("Planejamento");
  planejamento.columns = [
    { header: "Item", key: "item", width: 10 },
    { header: "Descrição", key: "descricao", width: 36 },
    { header: "Predecessora", key: "predecessora", width: 16 },
    { header: "Data Início", key: "dataInicio", width: 14 },
    { header: "Data Final", key: "dataFinal", width: 14 },
    { header: "Duração (dias)", key: "duracao", width: 16 },
    { header: "Tipo de Custo", key: "tipoCusto", width: 20 },
    { header: "Custo Previsto", key: "custoPrevisto", width: 16 },
  ];
  planejamento.getRow(1).font = { bold: true };

  for (const [item, descricao, predecessora, dataInicio, dataFinal, duracao, tipoCusto, custoPrevisto] of EXEMPLO_LINHAS) {
    const row = planejamento.addRow({ item, descricao, predecessora, dataInicio, dataFinal, duracao, tipoCusto, custoPrevisto });
    row.font = { italic: true, color: { argb: "FF888888" } };
  }

  const instrucoes = workbook.addWorksheet("Instruções");
  instrucoes.columns = [{ key: "texto", width: 100 }];
  const linhasInstrucoes = [
    "Como preencher a planilha \"Planejamento\":",
    "",
    "Item: numeração hierárquica. Um número sem ponto (1, 2, 3...) é uma ETAPA. Um número com ponto (1.1, 2.1...) é uma ATIVIDADE dentro da etapa indicada pelo primeiro número (2.1 pertence à etapa 2).",
    "Descrição: nome da etapa ou atividade.",
    "Predecessora: número do item que precisa terminar antes desta atividade começar. Pode ter mais de um item, separados por vírgula. Se apontar para uma etapa inteira (ex: \"2\"), o sistema usa automaticamente a última atividade daquela etapa. Etapas não têm predecessora.",
    "Data Início e Data Final: datas reais da atividade (AAAA-MM-DD ou DD/MM/AAAA). Etapas não têm data — são calculadas automaticamente a partir das atividades dentro delas.",
    "Duração (dias): só para sua referência — o sistema NÃO importa essa coluna, ela não muda o resultado (quem manda é Data Início/Data Final).",
    "Tipo de Custo: opcional — Material, Mão de obra, Serviço terceirizado, Equipamento, Transporte ou Outros. Se deixar em branco ou não reconhecer o texto, entra como \"Outros\".",
    "Custo Previsto: opcional — valor total previsto da atividade (em R$). Se preenchido, o sistema já cria o item de orçamento dessa atividade automaticamente. Deixe em branco se não quiser lançar custo agora (dá pra fazer isso depois na tela de Orçamento).",
    "",
    "As linhas de exemplo (em itálico cinza) mostram o formato — apague e preencha com o seu planejamento real.",
    "",
    "Depois de preencher: selecione da coluna Item até a última coluna preenchida (incluindo o cabeçalho), copie (Ctrl+C) e cole no campo \"Importar planilha\" da tela de Lançamento em bloco.",
  ];
  for (const texto of linhasInstrucoes) {
    instrucoes.addRow({ texto });
  }
  instrucoes.getRow(1).font = { bold: true };

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  const buffer = Buffer.from(arrayBuffer);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="modelo-lancamento-em-bloco.xlsx"`,
    },
  });
}
