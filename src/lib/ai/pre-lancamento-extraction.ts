import Anthropic from "@anthropic-ai/sdk";

export type PreLancamentoExtraction = {
  tipo: "PAGAR" | "RECEBER";
  descricao: string;
  valor: number;
  favorecidoNome: string | null;
  dataVencimento: string | null;
  categoriaNome: string | null;
  workNome: string | null;
  observacao: string | null;
  numeroDocumento: string | null;
  itens: { material: string; quantidade: number; unidade: string; valorUnitario: number }[] | null;
};

const BASE_PROPERTIES = {
  tipo: {
    type: "string",
    enum: ["PAGAR", "RECEBER"],
    description: "PAGAR se é uma despesa/conta a pagar, RECEBER se é uma receita/conta a receber. Na dúvida, use PAGAR.",
  },
  descricao: { type: "string", description: "Descrição curta do lançamento (ex: 'Compra de material elétrico')." },
  favorecidoNome: { type: ["string", "null"], description: "Nome do fornecedor (despesa) ou cliente (receita), se identificável." },
  dataVencimento: { type: ["string", "null"], description: "Data de vencimento/pagamento no formato YYYY-MM-DD, se identificável." },
  categoriaNome: { type: ["string", "null"], description: "Categoria que melhor combina com a lista de categorias fornecida, exatamente como escrita na lista. Null se nenhuma combinar bem." },
  workNome: { type: ["string", "null"], description: "Nome da obra que melhor combina com a lista de obras fornecida, exatamente como escrita na lista. Null se nenhuma combinar bem." },
  observacao: { type: ["string", "null"], description: "Qualquer informação adicional relevante (ex: forma de pagamento mencionada)." },
} as const;

const SIMPLE_TOOL = {
  name: "registrar_pre_lancamento",
  description: "Registra os dados extraídos de um lançamento financeiro simples a partir do texto/imagem fornecidos.",
  input_schema: {
    type: "object" as const,
    properties: { ...BASE_PROPERTIES, valor: { type: "number", description: "Valor em reais, sempre positivo." } },
    required: ["tipo", "descricao", "valor", "favorecidoNome", "dataVencimento", "categoriaNome", "workNome", "observacao"],
  },
};

const PEDIDO_TOOL = {
  name: "registrar_pedido_nf",
  description: "Registra os dados extraídos de um pedido/nota fiscal de compra de material, item a item.",
  input_schema: {
    type: "object" as const,
    properties: {
      ...BASE_PROPERTIES,
      numeroDocumento: { type: ["string", "null"], description: "Número do pedido/orçamento/NF, se identificável." },
      itens: {
        type: "array",
        description: "Cada item/material da lista, um por linha do documento. Não inclua frete como item de material — some o frete (se houver) proporcionalmente ao valor unitário de cada item, ou, se não der pra ratear, crie um item extra com material \"Frete\".",
        items: {
          type: "object",
          properties: {
            material: { type: "string", description: "Nome do material/item, exatamente como escrito no documento." },
            quantidade: { type: "number", description: "Quantidade comprada." },
            unidade: { type: "string", description: "Unidade (ex: un, kg, m, m2, m3, saco, caixa, litro) — use a sigla da lista de unidades fornecida, a mais parecida com a do documento." },
            valorUnitario: { type: "number", description: "Valor unitário em reais." },
          },
          required: ["material", "quantidade", "unidade", "valorUnitario"],
        },
      },
    },
    required: ["tipo", "descricao", "favorecidoNome", "dataVencimento", "categoriaNome", "workNome", "observacao", "numeroDocumento", "itens"],
  },
};

function buildPrompt(mode: "simples" | "pedido_nf", works: string[], categorias: string[], units: string[], materials: string[]) {
  const base = `Você é um assistente financeiro de uma construtora. Extraia os dados de um ${mode === "pedido_nf" ? "pedido/nota fiscal de compra de material" : "lançamento financeiro (despesa ou receita)"} a partir do texto de uma conversa de WhatsApp e/ou da foto de um comprovante/nota fiscal fornecidos.

Obras cadastradas (para tentar casar com "workNome", use o nome exatamente como está aqui): ${works.length > 0 ? works.join(", ") : "(nenhuma cadastrada)"}

Categorias cadastradas (para tentar casar com "categoriaNome", use o nome exatamente como está aqui): ${categorias.length > 0 ? categorias.join(", ") : "(nenhuma cadastrada)"}`;

  if (mode !== "pedido_nf") {
    return `${base}\n\nUse a ferramenta "registrar_pre_lancamento" com os dados extraídos. Se não tiver certeza de um campo opcional, retorne null em vez de inventar.`;
  }

  return `${base}

Unidades cadastradas (para "itens[].unidade", prefira uma sigla desta lista): ${units.length > 0 ? units.join(", ") : "(nenhuma cadastrada)"}

Materiais já cadastrados (quando um item do documento corresponder a um destes, use exatamente este nome em "itens[].material" em vez de reescrever): ${materials.length > 0 ? materials.join(", ") : "(nenhum cadastrado)"}

Use a ferramenta "registrar_pedido_nf" com os dados extraídos, listando cada item/material separadamente em "itens". O campo "valor" não existe aqui — o valor total é calculado a partir da soma dos itens. Se não tiver certeza de um campo opcional, retorne null em vez de inventar.`;
}

function getClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "A chave da IA (ANTHROPIC_API_KEY) não está configurada. Peça para um administrador configurá-la nas variáveis de ambiente do projeto.",
    );
  }
  return new Anthropic({ apiKey });
}

export async function extractPreLancamento(input: {
  mode: "simples" | "pedido_nf";
  text?: string;
  imageBase64?: string;
  imageMediaType?: string;
  works: string[];
  categorias: string[];
  units?: string[];
  materials?: string[];
}): Promise<PreLancamentoExtraction> {
  if (!input.text?.trim() && !input.imageBase64) {
    throw new Error("Cole o texto da conversa ou anexe uma foto do comprovante/pedido.");
  }

  const client = getClient();
  const tool = input.mode === "pedido_nf" ? PEDIDO_TOOL : SIMPLE_TOOL;

  const content: Anthropic.MessageParam["content"] = [];
  if (input.imageBase64 && input.imageMediaType) {
    content.push({
      type: "image",
      source: { type: "base64", media_type: input.imageMediaType as "image/jpeg", data: input.imageBase64 },
    });
  }
  content.push({
    type: "text",
    text: input.text?.trim() || "Extraia os dados do comprovante/pedido/nota fiscal na imagem anexada.",
  });

  const message = await client.messages.create({
    model: "claude-sonnet-5",
    max_tokens: 2048,
    system: buildPrompt(input.mode, input.works, input.categorias, input.units ?? [], input.materials ?? []),
    tools: [tool],
    tool_choice: { type: "tool", name: tool.name },
    messages: [{ role: "user", content }],
  });

  const toolUse = message.content.find((block) => block.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("Não foi possível extrair os dados. Tente reformular ou anexar uma imagem mais nítida.");
  }

  const raw = toolUse.input as Record<string, unknown>;
  const itens = Array.isArray(raw.itens)
    ? (raw.itens as PreLancamentoExtraction["itens"])
    : null;
  const valor = input.mode === "pedido_nf"
    ? (itens ?? []).reduce((sum, item) => sum + item.quantidade * item.valorUnitario, 0)
    : Number(raw.valor ?? 0);

  return {
    tipo: raw.tipo as PreLancamentoExtraction["tipo"],
    descricao: raw.descricao as string,
    valor,
    favorecidoNome: (raw.favorecidoNome as string | null) ?? null,
    dataVencimento: (raw.dataVencimento as string | null) ?? null,
    categoriaNome: (raw.categoriaNome as string | null) ?? null,
    workNome: (raw.workNome as string | null) ?? null,
    observacao: (raw.observacao as string | null) ?? null,
    numeroDocumento: (raw.numeroDocumento as string | null) ?? null,
    itens,
  };
}
