"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { assertRole } from "@/lib/permissions";
import { buscarLoteDistribuicao, buscarNFeCompletaPorChave } from "@/lib/sefaz/dist-dfe";
import { parseResNFe } from "@/lib/sefaz/parse-res-nfe";

const MAX_LOTES_POR_SYNC = 10;

export async function listIncomingNFes() {
  return prisma.incomingNFe.findMany({
    orderBy: { dataEmissao: "desc" },
    take: 200,
  });
}

/**
 * Busca lotes novos na SEFAZ a partir do último NSU processado, até esgotar
 * (ultNSU === maxNSU) ou atingir o limite de lotes por chamada — Distribuição
 * DFe devolve no máximo ~50 documentos por lote.
 */
export async function syncIncomingNFes(): Promise<string | undefined> {
  const session = await auth();
  assertRole(session, ["ADMINISTRADOR", "ENGENHEIRO", "FINANCEIRO"]);

  const company = await prisma.companySettings.findFirst();
  if (!company?.cnpj || !company?.uf) {
    return "Cadastre o CNPJ e a UF da empresa em Configurações antes de sincronizar.";
  }

  let ultNsu = company.sefazUltimoNsu ?? "0";
  let novos = 0;

  try {
    for (let i = 0; i < MAX_LOTES_POR_SYNC; i++) {
      const retorno = await buscarLoteDistribuicao({ cnpj: company.cnpj, uf: company.uf, ultNsu });

      if (retorno.cStat !== "138" && retorno.cStat !== "137") {
        return `SEFAZ retornou erro (${retorno.cStat}): ${retorno.xMotivo}`;
      }

      for (const doc of retorno.docs) {
        if (!doc.schema.startsWith("resNFe")) continue;
        const resumo = parseResNFe(doc.xml);
        if (!resumo) continue;

        await prisma.incomingNFe.upsert({
          where: { chaveAcesso: resumo.chaveAcesso },
          update: {},
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
    return error instanceof Error ? error.message : "Não foi possível consultar a SEFAZ.";
  }

  revalidatePath("/notas-fiscais/radar");
  return novos > 0 ? undefined : "Nenhuma nota nova encontrada.";
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

/**
 * Busca (ou usa em cache) o XML completo da NF-e, com itens — necessário
 * pra pré-preencher o formulário de lançamento.
 */
export async function getIncomingNFeXml(id: string): Promise<{ xml: string } | { error: string }> {
  const incoming = await prisma.incomingNFe.findUnique({ where: { id } });
  if (!incoming) return { error: "Nota não encontrada." };
  if (incoming.xmlCompleto) return { xml: incoming.xmlCompleto };

  const company = await prisma.companySettings.findFirst();
  if (!company?.cnpj || !company?.uf) {
    return { error: "Cadastre o CNPJ e a UF da empresa em Configurações." };
  }

  try {
    const retorno = await buscarNFeCompletaPorChave({
      cnpj: company.cnpj,
      uf: company.uf,
      chaveAcesso: incoming.chaveAcesso,
    });

    if (retorno.cStat !== "138" || retorno.docs.length === 0) {
      return { error: `SEFAZ não retornou o documento completo (${retorno.cStat}: ${retorno.xMotivo}).` };
    }

    const xml = retorno.docs[0].xml;
    await prisma.incomingNFe.update({ where: { id }, data: { xmlCompleto: xml } });
    return { xml };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Não foi possível buscar o XML completo." };
  }
}

export async function markIncomingNFeLancada(id: string, invoiceId: string) {
  const session = await auth();
  assertRole(session, ["ADMINISTRADOR", "ENGENHEIRO", "FINANCEIRO"]);

  await prisma.incomingNFe.update({ where: { id }, data: { status: "LANCADA", invoiceId } });
  revalidatePath("/notas-fiscais/radar");
}
