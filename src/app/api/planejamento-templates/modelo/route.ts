import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { auth } from "@/lib/auth";

export const runtime = "nodejs";

const EXEMPLO_LINHAS: [string, string, string, number | string][] = [
  ["1", "Serviços preliminares", "", ""],
  ["1.1", "Instalação do canteiro", "", 5],
  ["2", "Fundação", "", ""],
  ["2.1", "Escavação", "1.1", 4],
  ["2.2", "Concretagem", "2.1", 6],
  ["3", "Estrutura", "", ""],
  ["3.1", "Alvenaria", "2", 8],
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
    { header: "Duração (dias)", key: "duracao", width: 16 },
    { header: "Data Início", key: "dataInicio", width: 14 },
    { header: "Data Final", key: "dataFinal", width: 14 },
    { header: "Custo", key: "custo", width: 14 },
    { header: "Total", key: "total", width: 14 },
  ];
  planejamento.getRow(1).font = { bold: true };

  for (const [item, descricao, predecessora, duracao] of EXEMPLO_LINHAS) {
    const row = planejamento.addRow({ item, descricao, predecessora, duracao });
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
    "Duração (dias): duração da atividade em dias corridos. Etapas não têm duração (a duração delas é a soma das atividades).",
    "Data Início, Data Final, Custo, Total: apenas para sua referência — o sistema NÃO importa essas colunas. O dia de início de cada atividade é calculado automaticamente a partir das predecessoras (dia 0 = início da obra).",
    "",
    "As linhas de exemplo (em itálico cinza) mostram o formato — apague e preencha com o seu planejamento real.",
    "",
    "Depois de preencher: selecione da coluna Item até a última coluna preenchida (incluindo o cabeçalho), copie (Ctrl+C) e cole no campo \"Importar planilha\" da tela de templates de planejamento.",
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
      "Content-Disposition": `attachment; filename="modelo-planejamento.xlsx"`,
    },
  });
}
