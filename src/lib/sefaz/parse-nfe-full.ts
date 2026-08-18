// Parser server-side (regex, sem DOMParser) do XML completo da NF-e —
// usado pra gerar o DANFE completo a partir do XML da distribuição.

export type NFeEndereco = {
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  municipio: string | null;
  uf: string | null;
  cep: string | null;
};

export type NFePessoa = {
  nome: string | null;
  cnpj: string | null;
  ie: string | null;
  fone: string | null;
  endereco: NFeEndereco;
};

export type NFeItem = {
  codigo: string | null;
  nome: string | null;
  ncm: string | null;
  cfop: string | null;
  unidade: string | null;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
  cstIcms: string | null;
  baseCalculoIcms: number | null;
  valorIcms: number | null;
  aliquotaIcms: number | null;
  valorIpi: number | null;
  aliquotaIpi: number | null;
};

export type NFeDuplicata = {
  numero: string | null;
  vencimento: string | null;
  valor: number;
};

export type NFeVolumes = {
  quantidade: string | null;
  especie: string | null;
  marca: string | null;
  numeracao: string | null;
  pesoLiquido: string | null;
  pesoBruto: string | null;
};

export type NFeTransporte = {
  modalidadeFrete: string | null;
  transportadorNome: string | null;
  transportadorCnpj: string | null;
  transportadorEndereco: string | null;
  transportadorMunicipio: string | null;
  transportadorUf: string | null;
  veiculoPlaca: string | null;
  veiculoUf: string | null;
  volumes: NFeVolumes | null;
};

export type NFeCompleta = {
  chaveAcesso: string | null;
  numero: string | null;
  serie: string | null;
  tipoOperacao: "0" | "1" | null;
  dataEmissao: string | null;
  dataSaidaEntrada: string | null;
  naturezaOperacao: string | null;
  protocolo: string | null;
  dataAutorizacao: string | null;
  emitente: NFePessoa;
  destinatario: NFePessoa;
  itens: NFeItem[];
  valorProdutos: number | null;
  valorFrete: number | null;
  valorSeguro: number | null;
  valorDesconto: number | null;
  valorOutrasDespesas: number | null;
  valorBaseCalculoIcms: number | null;
  valorIcms: number | null;
  valorBaseCalculoIcmsSt: number | null;
  valorIcmsSt: number | null;
  valorIpi: number | null;
  valorTotalTributos: number | null;
  valorTotal: number | null;
  duplicatas: NFeDuplicata[];
  transporte: NFeTransporte | null;
  informacoesComplementares: string | null;
};

function tag(xml: string, name: string): string | null {
  const match = xml.match(new RegExp(`<${name}[^>]*>([^<]*)</${name}>`));
  return match ? match[1] : null;
}

function section(xml: string, name: string): string {
  const match = xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`));
  return match ? match[1] : "";
}

function num(value: string | null): number | null {
  if (value === null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function parseEndereco(xml: string): NFeEndereco {
  return {
    logradouro: tag(xml, "xLgr"),
    numero: tag(xml, "nro"),
    complemento: tag(xml, "xCpl"),
    bairro: tag(xml, "xBairro"),
    municipio: tag(xml, "xMun"),
    uf: tag(xml, "UF"),
    cep: tag(xml, "CEP"),
  };
}

function parsePessoa(xml: string): NFePessoa {
  return {
    nome: tag(xml, "xNome"),
    cnpj: tag(xml, "CNPJ") ?? tag(xml, "CPF"),
    ie: tag(xml, "IE"),
    fone: tag(xml, "fone"),
    endereco: parseEndereco(section(xml, "enderEmit") || section(xml, "enderDest")),
  };
}

function parseTransporte(xml: string): NFeTransporte | null {
  const transp = section(xml, "transp");
  if (!transp) return null;

  const transporta = section(transp, "transporta");
  const veiculo = section(transp, "veicTransp");
  const volSection = section(transp, "vol");

  const volumes: NFeVolumes | null = volSection
    ? {
        quantidade: tag(volSection, "qVol"),
        especie: tag(volSection, "esp"),
        marca: tag(volSection, "marca"),
        numeracao: tag(volSection, "nVol"),
        pesoLiquido: tag(volSection, "pesoL"),
        pesoBruto: tag(volSection, "pesoB"),
      }
    : null;

  return {
    modalidadeFrete: tag(transp, "modFrete"),
    transportadorNome: tag(transporta, "xNome"),
    transportadorCnpj: tag(transporta, "CNPJ") ?? tag(transporta, "CPF"),
    transportadorEndereco: tag(transporta, "xEnder"),
    transportadorMunicipio: tag(transporta, "xMun"),
    transportadorUf: tag(transporta, "UF"),
    veiculoPlaca: tag(veiculo, "placa"),
    veiculoUf: tag(veiculo, "UF"),
    volumes,
  };
}

export function parseNFeCompleta(xml: string): NFeCompleta {
  const idMatch = xml.match(/infNFe[^>]*\bId="NFe(\d{44})"/);
  const chaveAcesso = idMatch ? idMatch[1] : null;

  const ide = section(xml, "ide");
  const emit = section(xml, "emit");
  const dest = section(xml, "dest");
  const total = section(section(xml, "total"), "ICMSTot");
  const infProt = section(xml, "infProt");
  const cobr = section(xml, "cobr");
  const infAdic = section(xml, "infAdic");

  const tipoOperacao = tag(ide, "tpNF");

  const duplicatas: NFeDuplicata[] = Array.from(cobr.matchAll(/<dup[^>]*>([\s\S]*?)<\/dup>/g)).map((match) => {
    const dup = match[1];
    return {
      numero: tag(dup, "nDup"),
      vencimento: tag(dup, "dVenc"),
      valor: num(tag(dup, "vDup")) ?? 0,
    };
  });

  const items: NFeItem[] = Array.from(xml.matchAll(/<det[^>]*>([\s\S]*?)<\/det>/g)).map((match) => {
    const det = match[1];
    const prod = section(det, "prod");
    const imposto = section(det, "imposto");
    const icms = section(imposto, "ICMS");
    const ipi = section(imposto, "IPI");

    return {
      codigo: tag(prod, "cProd"),
      nome: tag(prod, "xProd"),
      ncm: tag(prod, "NCM"),
      cfop: tag(prod, "CFOP"),
      unidade: tag(prod, "uCom"),
      quantidade: num(tag(prod, "qCom")) ?? 0,
      valorUnitario: num(tag(prod, "vUnCom")) ?? 0,
      valorTotal: num(tag(prod, "vProd")) ?? 0,
      cstIcms: tag(icms, "CST") ?? tag(icms, "CSOSN"),
      baseCalculoIcms: num(tag(icms, "vBC")),
      valorIcms: num(tag(icms, "vICMS")),
      aliquotaIcms: num(tag(icms, "pICMS")),
      valorIpi: num(tag(ipi, "vIPI")),
      aliquotaIpi: num(tag(ipi, "pIPI")),
    };
  });

  return {
    chaveAcesso,
    numero: tag(ide, "nNF"),
    serie: tag(ide, "serie"),
    tipoOperacao: tipoOperacao === "0" || tipoOperacao === "1" ? tipoOperacao : null,
    dataEmissao: (tag(ide, "dhEmi") ?? tag(ide, "dEmi"))?.slice(0, 10) ?? null,
    dataSaidaEntrada: (tag(ide, "dhSaiEnt") ?? tag(ide, "dSaiEnt"))?.slice(0, 10) ?? null,
    naturezaOperacao: tag(ide, "natOp"),
    protocolo: tag(infProt, "nProt"),
    dataAutorizacao: tag(infProt, "dhRecbto")?.slice(0, 19).replace("T", " ") ?? null,
    emitente: parsePessoa(emit),
    destinatario: parsePessoa(dest),
    itens: items,
    valorProdutos: num(tag(total, "vProd")),
    valorFrete: num(tag(total, "vFrete")),
    valorSeguro: num(tag(total, "vSeg")),
    valorDesconto: num(tag(total, "vDesc")),
    valorOutrasDespesas: num(tag(total, "vOutro")),
    valorBaseCalculoIcms: num(tag(total, "vBC")),
    valorIcms: num(tag(total, "vICMS")),
    valorBaseCalculoIcmsSt: num(tag(total, "vBCST")),
    valorIcmsSt: num(tag(total, "vICMSST")),
    valorIpi: num(tag(total, "vIPI")),
    valorTotalTributos: num(tag(total, "vTotTrib")),
    valorTotal: num(tag(total, "vNF")),
    duplicatas,
    transporte: parseTransporte(xml),
    informacoesComplementares: tag(infAdic, "infCpl"),
  };
}
