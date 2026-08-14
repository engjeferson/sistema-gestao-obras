// Parser server-side (regex, sem DOMParser) do XML completo da NF-e —
// usado pra gerar o PDF (DANFE simplificado) a partir do XML da distribuição.

export type NFeEndereco = {
  logradouro: string | null;
  numero: string | null;
  bairro: string | null;
  municipio: string | null;
  uf: string | null;
  cep: string | null;
};

export type NFePessoa = {
  nome: string | null;
  cnpj: string | null;
  ie: string | null;
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
};

export type NFeDuplicata = {
  numero: string | null;
  vencimento: string | null;
  valor: number;
};

export type NFeCompleta = {
  chaveAcesso: string | null;
  numero: string | null;
  serie: string | null;
  dataEmissao: string | null;
  naturezaOperacao: string | null;
  protocolo: string | null;
  dataAutorizacao: string | null;
  emitente: NFePessoa;
  destinatario: NFePessoa;
  itens: NFeItem[];
  valorProdutos: number | null;
  valorFrete: number | null;
  valorDesconto: number | null;
  valorTotal: number | null;
  duplicatas: NFeDuplicata[];
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
    endereco: parseEndereco(section(xml, "enderEmit") || section(xml, "enderDest")),
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
    return {
      codigo: tag(prod, "cProd"),
      nome: tag(prod, "xProd"),
      ncm: tag(prod, "NCM"),
      cfop: tag(prod, "CFOP"),
      unidade: tag(prod, "uCom"),
      quantidade: num(tag(prod, "qCom")) ?? 0,
      valorUnitario: num(tag(prod, "vUnCom")) ?? 0,
      valorTotal: num(tag(prod, "vProd")) ?? 0,
    };
  });

  return {
    chaveAcesso,
    numero: tag(ide, "nNF"),
    serie: tag(ide, "serie"),
    dataEmissao: (tag(ide, "dhEmi") ?? tag(ide, "dEmi"))?.slice(0, 10) ?? null,
    naturezaOperacao: tag(ide, "natOp"),
    protocolo: tag(infProt, "nProt"),
    dataAutorizacao: tag(infProt, "dhRecbto")?.slice(0, 19).replace("T", " ") ?? null,
    emitente: parsePessoa(emit),
    destinatario: parsePessoa(dest),
    itens: items,
    valorProdutos: num(tag(total, "vProd")),
    valorFrete: num(tag(total, "vFrete")),
    valorDesconto: num(tag(total, "vDesc")),
    valorTotal: num(tag(total, "vNF")),
    duplicatas,
  };
}
