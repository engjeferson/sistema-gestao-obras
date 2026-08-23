"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { assertRole } from "@/lib/permissions";
import { buscarLoteDistribuicao, buscarNFeCompletaPorChave } from "@/lib/sefaz/dist-dfe";
import { parseResNFe, parseProcNFeSummary, type ResNFeSummary } from "@/lib/sefaz/parse-res-nfe";

const MAX_LOTES_POR_SYNC = 10;
const SYNC_COOLDOWN_MINUTOS = 65;

export async function listIncomingNFes(page = 1, pageSize = 20) {
  const [items, totalCount] = await Promise.all([
    prisma.incomingNFe.findMany({
      orderBy: { dataEmissao: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { invoice: { include: { work: true } } },
    }),
    prisma.incomingNFe.count(),
  ]);

  return { items, totalCount, totalPages: Math.max(1, Math.ceil(totalCount / pageSize)), page, pageSize };
}

export async function countPendingIncomingNFes() {
  return prisma.incomingNFe.count({ where: { status: "PENDENTE" } });
}

type SyncResult =
  | { status: "ok"; novos: number }
  | { status: "skipped"; minutosRestantes: number }
  | { status: "error"; message: string };

/**
 * Busca lotes novos na SEFAZ a partir do último NSU processado, até esgotar
 * (ultNSU === maxNSU) ou atingir o limite de lotes por chamada — Distribuição
 * DFe devolve no máximo ~50 documentos por lote.
 *
 * Respeita um cooldown local (SYNC_COOLDOWN_MINUTOS) espelhando a janela de
 * 1h que a própria SEFAZ aplica por CNPJ quando não há documentos novos
 * (erro 656 — "Consumo Indevido"). Isso protege tanto o botão manual quanto
 * a sincronização automática de disparar consultas em excesso.
 */
async function runIncomingNFeSync(): Promise<SyncResult> {
  const company = await prisma.companySettings.findFirst();
  if (!company?.cnpj || !company?.uf) {
    return { status: "error", message: "Cadastre o CNPJ e a UF da empresa em Configurações antes de sincronizar." };
  }

  if (company.sefazUltimaTentativaEm) {
    const minutosDesdeUltima = (Date.now() - company.sefazUltimaTentativaEm.getTime()) / 60000;
    if (minutosDesdeUltima < SYNC_COOLDOWN_MINUTOS) {
      return { status: "skipped", minutosRestantes: Math.ceil(SYNC_COOLDOWN_MINUTOS - minutosDesdeUltima) };
    }
  }

  await prisma.companySettings.update({
    where: { id: company.id },
    data: { sefazUltimaTentativaEm: new Date() },
  });

  let ultNsu = company.sefazUltimoNsu ?? "0";
  let novos = 0;

  try {
    for (let i = 0; i < MAX_LOTES_POR_SYNC; i++) {
      const retorno = await buscarLoteDistribuicao({ cnpj: company.cnpj, uf: company.uf, ultNsu });

      if (retorno.cStat !== "138" && retorno.cStat !== "137") {
        return { status: "error", message: `SEFAZ retornou erro (${retorno.cStat}): ${retorno.xMotivo}` };
      }

      for (const doc of retorno.docs) {
        let resumo: ResNFeSummary | null = null;
        let xmlCompleto: string | null = null;

        if (doc.schema.startsWith("resNFe")) {
          resumo = parseResNFe(doc.xml);
        } else if (doc.schema.startsWith("procNFe") || doc.schema.startsWith("nfeProc")) {
          resumo = parseProcNFeSummary(doc.xml);
          xmlCompleto = doc.xml;
        } else {
          continue;
        }
        if (!resumo) continue;

        await prisma.incomingNFe.upsert({
          where: { chaveAcesso: resumo.chaveAcesso },
          update: xmlCompleto ? { xmlCompleto } : {},
          create: {
            chaveAcesso: resumo.chaveAcesso,
            nsu: doc.nsu,
            emitenteCnpj: resumo.emitenteCnpj,
            emitenteNome: resumo.emitenteNome,
            numero: resumo.numero,
            serie: resumo.serie,
            dataEmissao: resumo.dataEmissao ? new Date(resumo.dataEmissao) : null,
            valorTotal: resumo.valorTotal,
            status: resumo.cancelada ? "IGNORADA" : "PENDENTE",
            xmlCompleto,
          },
        });
        novos++;
      }

      const newUltNsu = retorno.ultNSU ?? ultNsu;
      await prisma.companySettings.update({
        where: { id: company.id },
        data: { sefazUltimoNsu: newUltNsu },
      });

      if (!retorno.maxNSU || newUltNsu === ultNsu || newUltNsu >= retorno.maxNSU) {
        break;
      }
      ultNsu = newUltNsu;
    }
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Não foi possível consultar a SEFAZ.",
    };
  }

  revalidatePath("/notas-fiscais/radar");
  return { status: "ok", novos };
}

export async function syncIncomingNFes(): Promise<string | undefined> {
  const session = await auth();
  assertRole(session, ["ADMINISTRADOR", "ENGENHEIRO", "FINANCEIRO"]);

  const result = await runIncomingNFeSync();
  if (result.status === "error") return result.message;
  if (result.status === "skipped") {
    return `Sincronizado recentemente — tente novamente em ${result.minutosRestantes} min.`;
  }
  return result.novos > 0 ? undefined : "Nenhuma nota nova encontrada.";
}

/**
 * Disparada automaticamente ao abrir a tela do Radar, para que a lista
 * fique em dia sem depender de clique manual. Silenciosa: erros e o
 * cooldown local são apenas ignorados, já que é uma tentativa de fundo.
 */
export async function autoSyncIncomingNFesIfDue(): Promise<void> {
  const session = await auth();
  if (!session?.user) return;
  await runIncomingNFeSync();
}

export async function ignoreIncomingNFe(id: string) {
  const session = await auth();
  assertRole(session, ["ADMINISTRADOR", "ENGENHEIRO", "FINANCEIRO"]);

  await prisma.incomingNFe.update({ where: { id }, data: { status: "IGNORADA" } });
  revalidatePath("/notas-fiscais/radar");
}

export async function restoreIncomingNFe(id: string) {
  const session = await auth();
  assertRole(session, ["ADMINISTRADOR", "ENGENHEIRO", "FINANCEIRO"]);

  await prisma.incomingNFe.update({ where: { id }, data: { status: "PENDENTE" } });
  revalidatePath("/notas-fiscais/radar");
}

export type IncomingNFeResumo = {
  numero: string | null;
  dataEmissao: string | null;
  fornecedorNome: string | null;
};

function toResumo(incoming: { numero: string | null; dataEmissao: Date | null; emitenteNome: string | null }): IncomingNFeResumo {
  return {
    numero: incoming.numero,
    dataEmissao: incoming.dataEmissao ? incoming.dataEmissao.toISOString().slice(0, 10) : null,
    fornecedorNome: incoming.emitenteNome,
  };
}

/**
 * Busca (ou usa em cache) o XML completo da NF-e, com itens — necessário
 * pra pré-preencher o formulário de lançamento. Sempre devolve o resumo
 * (fornecedor/número/data) junto, mesmo quando o XML completo falha — assim
 * o formulário ainda pode ser parcialmente preenchido.
 */
export async function getIncomingNFeXml(
  id: string,
): Promise<{ xml: string; resumo: IncomingNFeResumo } | { error: string; resumo: IncomingNFeResumo | null }> {
  const incoming = await prisma.incomingNFe.findUnique({ where: { id } });
  if (!incoming) return { error: "Nota não encontrada.", resumo: null };
  const resumo = toResumo(incoming);
  if (incoming.xmlCompleto) return { xml: incoming.xmlCompleto, resumo };

  const company = await prisma.companySettings.findFirst();
  if (!company?.cnpj || !company?.uf) {
    return { error: "Cadastre o CNPJ e a UF da empresa em Configurações.", resumo };
  }

  try {
    const retorno = await buscarNFeCompletaPorChave({
      cnpj: company.cnpj,
      uf: company.uf,
      chaveAcesso: incoming.chaveAcesso,
    });

    if (retorno.cStat === "632") {
      return {
        error:
          "Essa nota é antiga demais — a SEFAZ só disponibiliza o XML completo por um tempo limitado após a emissão. Fornecedor, número e data já foram preenchidos com os dados do resumo; adicione os itens manualmente.",
        resumo,
      };
    }
    const doc = retorno.docs[0];
    const documentoCompleto = doc && (doc.schema.startsWith("procNFe") || doc.schema.startsWith("nfeProc"));
    if (retorno.cStat !== "138" || !documentoCompleto) {
      return {
        error: documentoCompleto === false && doc
          ? "A SEFAZ ainda só disponibilizou o resumo desta nota, sem os itens. Tente novamente mais tarde."
          : `SEFAZ não retornou o documento completo (${retorno.cStat}: ${retorno.xMotivo}).`,
        resumo,
      };
    }

    const xml = doc.xml;
    await prisma.incomingNFe.update({ where: { id }, data: { xmlCompleto: xml } });
    return { xml, resumo };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Não foi possível buscar o XML completo.",
      resumo,
    };
  }
}

export async function markIncomingNFeLancada(id: string, invoiceId: string) {
  const session = await auth();
  assertRole(session, ["ADMINISTRADOR", "ENGENHEIRO", "FINANCEIRO"]);

  await prisma.incomingNFe.update({ where: { id }, data: { status: "LANCADA", invoiceId } });
  revalidatePath("/notas-fiscais/radar");
}
