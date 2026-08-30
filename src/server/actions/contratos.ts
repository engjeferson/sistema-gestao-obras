"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { assertRole } from "@/lib/permissions";
import { contractFormSchema, measurementFormSchema, contractAddendumFormSchema } from "@/lib/validations/contratos";
import { getCompanySettings } from "@/server/actions/empresa";

function parseContractForm(formData: FormData) {
  return contractFormSchema.safeParse({
    workId: formData.get("workId"),
    nome: formData.get("nome"),
    tipo: formData.get("tipo"),
    direcao: formData.get("direcao"),
    contratadoNome: formData.get("contratadoNome"),
    valor: formData.get("valor") ?? "",
    data: formData.get("data"),
    observacoes: formData.get("observacoes") ?? undefined,
  });
}

// Resolve pelo nome — se já existe um fornecedor com esse nome, reaproveita; senão cria um novo
// já classificado como "Serviços" (mesma ideia de `findOrCreateSupplierId` da Nota Fiscal, mas
// essa tela lida majoritariamente com prestadores de serviço, não material).
async function findOrCreateSupplierId(nome: string) {
  const trimmed = nome.trim();
  const existing = await prisma.supplier.findFirst({ where: { nome: trimmed } });
  if (existing) return existing.id;
  const created = await prisma.supplier.create({ data: { nome: trimmed, categoria: "SERVICOS" } });
  return created.id;
}

export async function listContracts(workId: string) {
  const contracts = await prisma.contract.findMany({
    where: { workId },
    orderBy: { data: "desc" },
    include: { measurements: { include: { financialTransaction: true } }, addendums: true },
  });

  return contracts.map((contract) => {
    const valorPago = contract.measurements.reduce((sum, m) => {
      const paid = m.financialTransaction?.status === "PAGO" ? Number(m.financialTransaction.valor) : 0;
      return sum + paid;
    }, 0);
    const valorAditivos = contract.addendums.reduce((sum, a) => sum + Number(a.valor), 0);
    const valorTotal = contract.valor !== null ? Number(contract.valor) + valorAditivos : null;
    const saldo = valorTotal !== null ? valorTotal - valorPago : null;
    const percentual = valorTotal !== null && valorTotal > 0 ? (valorPago / valorTotal) * 100 : 0;

    return { ...contract, valor: valorTotal, valorPago, saldo, percentual };
  });
}

export async function getContract(contractId: string) {
  return prisma.contract.findUnique({
    where: { id: contractId },
    include: {
      measurements: { include: { financialTransaction: true }, orderBy: { numero: "desc" } },
      addendums: { orderBy: { data: "desc" } },
    },
  });
}

export async function createContract(_prevState: string | undefined, formData: FormData) {
  const session = await auth();
  assertRole(session, ["ADMINISTRADOR", "ENGENHEIRO"]);

  const parsed = parseContractForm(formData);
  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Dados inválidos.";
  }
  const data = parsed.data;
  const arquivoUrl = (formData.get("arquivoUrl") as string) || null;

  const [companySettings, contratadoSupplierId] = await Promise.all([
    getCompanySettings(),
    findOrCreateSupplierId(data.contratadoNome),
  ]);

  await prisma.contract.create({
    data: {
      workId: data.workId,
      nome: data.nome,
      tipo: data.tipo,
      direcao: data.direcao,
      contratante: companySettings.nome,
      contratado: data.contratadoNome.trim(),
      contratadoSupplierId,
      valor: data.valor ?? null,
      data: new Date(data.data),
      observacoes: data.observacoes || null,
      arquivoUrl,
    },
  });

  revalidatePath(`/obras/${data.workId}/contratos`);
  redirect(`/obras/${data.workId}/contratos`);
}

export async function deleteContract(contractId: string, workId: string) {
  const session = await auth();
  assertRole(session, ["ADMINISTRADOR"]);

  await prisma.contract.delete({ where: { id: contractId } });
  revalidatePath(`/obras/${workId}/contratos`);
}

function parseMeasurementForm(formData: FormData) {
  return measurementFormSchema.safeParse({
    contractId: formData.get("contractId"),
    workId: formData.get("workId"),
    data: formData.get("data"),
    dataVencimento: formData.get("dataVencimento"),
    valor: formData.get("valor"),
    categoriaId: formData.get("categoriaId"),
    bankAccountId: formData.get("bankAccountId") ?? undefined,
    descricao: formData.get("descricao") ?? undefined,
    observacoes: formData.get("observacoes") ?? undefined,
    arquivoUrl: formData.get("arquivoUrl") ?? undefined,
    confirmar: formData.get("confirmar") === "on",
    formaPagamento: formData.get("formaPagamento") ?? undefined,
  });
}

export async function createMeasurement(_prevState: string | undefined, formData: FormData) {
  const session = await auth();
  assertRole(session, ["ADMINISTRADOR", "ENGENHEIRO"]);

  const parsed = parseMeasurementForm(formData);
  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Dados inválidos.";
  }
  const data = parsed.data;

  const contract = await prisma.contract.findUnique({ where: { id: data.contractId } });
  if (!contract) {
    return "Contrato não encontrado.";
  }

  const favorecidoNome = contract.direcao === "PAGAR" ? contract.contratado : contract.contratante;

  await prisma.$transaction(async (tx) => {
    const lastMeasurement = await tx.contractMeasurement.findFirst({
      where: { contractId: data.contractId },
      orderBy: { numero: "desc" },
      select: { numero: true },
    });
    const numero = (lastMeasurement?.numero ?? 0) + 1;

    const measurement = await tx.contractMeasurement.create({
      data: {
        contractId: data.contractId,
        numero,
        data: new Date(data.data),
        descricao: data.descricao || null,
        valor: data.valor,
        observacoes: data.observacoes || null,
        arquivoUrl: data.arquivoUrl || null,
      },
    });

    const confirmado = Boolean(data.confirmar);

    await tx.financialTransaction.create({
      data: {
        workId: data.workId,
        tipo: contract.direcao,
        descricao: `Medição #${numero} — ${contract.nome}`,
        categoriaId: data.categoriaId,
        favorecidoNome,
        bankAccountId: data.bankAccountId || null,
        valor: data.valor,
        dataEmissao: new Date(data.data),
        dataVencimento: new Date(data.dataVencimento),
        dataPagamento: confirmado ? new Date(data.data) : null,
        formaPagamento: data.formaPagamento,
        status: confirmado ? "PAGO" : "PENDENTE",
        contractMeasurementId: measurement.id,
        createdById: session.user.id,
      },
    });
  });

  revalidatePath(`/obras/${data.workId}/contratos`);
  revalidatePath(`/obras/${data.workId}/contratos/${data.contractId}`);
  revalidatePath(`/obras/${data.workId}/financeiro`);
  redirect(`/obras/${data.workId}/contratos/${data.contractId}`);
}

export async function getMeasurement(measurementId: string) {
  return prisma.contractMeasurement.findUnique({
    where: { id: measurementId },
    include: { financialTransaction: true, contract: true },
  });
}

export async function updateMeasurement(
  measurementId: string,
  _prevState: string | undefined,
  formData: FormData,
) {
  const session = await auth();
  assertRole(session, ["ADMINISTRADOR", "ENGENHEIRO"]);

  const parsed = parseMeasurementForm(formData);
  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Dados inválidos.";
  }
  const data = parsed.data;

  const measurement = await prisma.contractMeasurement.findUnique({
    where: { id: measurementId },
    include: { financialTransaction: true },
  });
  if (!measurement) {
    return "Medição não encontrada.";
  }

  await prisma.$transaction(async (tx) => {
    await tx.contractMeasurement.update({
      where: { id: measurementId },
      data: {
        data: new Date(data.data),
        descricao: data.descricao || null,
        valor: data.valor,
        observacoes: data.observacoes || null,
        arquivoUrl: data.arquivoUrl || null,
      },
    });

    if (measurement.financialTransaction) {
      await tx.financialTransaction.update({
        where: { id: measurement.financialTransaction.id },
        data: {
          categoriaId: data.categoriaId,
          bankAccountId: data.bankAccountId || null,
          valor: data.valor,
          dataEmissao: new Date(data.data),
          dataVencimento: new Date(data.dataVencimento),
        },
      });
    }
  });

  revalidatePath(`/obras/${data.workId}/contratos`);
  revalidatePath(`/obras/${data.workId}/contratos/${data.contractId}`);
  revalidatePath(`/obras/${data.workId}/financeiro`);
  redirect(`/obras/${data.workId}/contratos/${data.contractId}`);
}

export async function deleteMeasurement(measurementId: string, workId: string, contractId: string) {
  const session = await auth();
  assertRole(session, ["ADMINISTRADOR"]);

  const measurement = await prisma.contractMeasurement.findUnique({
    where: { id: measurementId },
    include: { financialTransaction: true },
  });

  if (measurement?.financialTransaction?.status === "PAGO") {
    throw new Error("Esta medição está vinculada a um pagamento já efetuado. Trate a conta manualmente antes de excluir.");
  }

  await prisma.$transaction(async (tx) => {
    if (measurement?.financialTransaction) {
      await tx.financialTransaction.delete({ where: { id: measurement.financialTransaction.id } });
    }
    await tx.contractMeasurement.delete({ where: { id: measurementId } });
  });

  revalidatePath(`/obras/${workId}/contratos`);
  revalidatePath(`/obras/${workId}/contratos/${contractId}`);
  revalidatePath(`/obras/${workId}/financeiro`);
}

function parseContractAddendumForm(formData: FormData) {
  return contractAddendumFormSchema.safeParse({
    contractId: formData.get("contractId"),
    workId: formData.get("workId"),
    data: formData.get("data"),
    valor: formData.get("valor"),
    descricao: formData.get("descricao") ?? undefined,
    observacoes: formData.get("observacoes") ?? undefined,
    arquivoUrl: formData.get("arquivoUrl") ?? undefined,
  });
}

export async function createContractAddendum(_prevState: string | undefined, formData: FormData) {
  const session = await auth();
  assertRole(session, ["ADMINISTRADOR", "ENGENHEIRO"]);

  const parsed = parseContractAddendumForm(formData);
  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Dados inválidos.";
  }
  const data = parsed.data;

  await prisma.contractAddendum.create({
    data: {
      contractId: data.contractId,
      data: new Date(data.data),
      descricao: data.descricao || null,
      valor: data.valor,
      observacoes: data.observacoes || null,
      arquivoUrl: data.arquivoUrl || null,
    },
  });

  revalidatePath(`/obras/${data.workId}/contratos`);
  revalidatePath(`/obras/${data.workId}/contratos/${data.contractId}`);
  return undefined;
}

export async function deleteContractAddendum(addendumId: string, workId: string, contractId: string) {
  const session = await auth();
  assertRole(session, ["ADMINISTRADOR"]);

  await prisma.contractAddendum.delete({ where: { id: addendumId } });

  revalidatePath(`/obras/${workId}/contratos`);
  revalidatePath(`/obras/${workId}/contratos/${contractId}`);
}
