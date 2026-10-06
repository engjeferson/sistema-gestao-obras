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
};

const EXTRACTION_TOOL = {
  name: "registrar_pre_lancamento",
  description: "Registra os dados extraídos de um lançamento financeiro a partir do texto/imagem fornecidos.",
  input_schema: {
    type: "object" as const,
    properties: {
      tipo: {
        type: "string",
        enum: ["PAGAR", "RECEBER"],
        description: "PAGAR se é uma despesa/conta a pagar, RECEBER se é uma receita/conta a receber. Na dúvida, use PAGAR.",
      },
      descricao: { type: "string", description: "Descrição curta do lançamento (ex: 'Compra de material elétrico')." },
      valor: { type: "number", description: "Valor em reais, sempre positivo." },
      favorecidoNome: { type: ["string", "null"], description: "Nome do fornecedor (despesa) ou cliente (receita), se identificável." },
      dataVencimento: { type: ["string", "null"], description: "Data de vencimento/pagamento no formato YYYY-MM-DD, se identificável." },
      categoriaNome: { type: ["string", "null"], description: "Categoria que melhor combina com a lista de categorias fornecida, exatamente como escrita na lista. Null se nenhuma combinar bem." },
      workNome: { type: ["string", "null"], description: "Nome da obra que melhor combina com a lista de obras fornecida, exatamente como escrita na lista. Null se nenhuma combinar bem." },
      observacao: { type: ["string", "null"], description: "Qualquer informação adicional relevante (ex: número da NF, forma de pagamento mencionada)." },
    },
    required: ["tipo", "descricao", "valor", "favorecidoNome", "dataVencimento", "categoriaNome", "workNome", "observacao"],
  },
};

function buildPrompt(works: string[], categorias: string[]) {
  return `Você é um assistente financeiro de uma construtora. Extraia os dados de um lançamento financeiro (despesa ou receita) a partir do texto de uma conversa de WhatsApp e/ou da foto de um comprovante/nota fiscal fornecidos.

Obras cadastradas (para tentar casar com "workNome", use o nome exatamente como está aqui): ${works.length > 0 ? works.join(", ") : "(nenhuma cadastrada)"}

Categorias cadastradas (para tentar casar com "categoriaNome", use o nome exatamente como está aqui): ${categorias.length > 0 ? categorias.join(", ") : "(nenhuma cadastrada)"}

Use a ferramenta "registrar_pre_lancamento" com os dados extraídos. Se não tiver certeza de um campo opcional, retorne null em vez de inventar.`;
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
  text?: string;
  imageBase64?: string;
  imageMediaType?: string;
  works: string[];
  categorias: string[];
}): Promise<PreLancamentoExtraction> {
  if (!input.text?.trim() && !input.imageBase64) {
    throw new Error("Cole o texto da conversa ou anexe uma foto do comprovante.");
  }

  const client = getClient();

  const content: Anthropic.MessageParam["content"] = [];
  if (input.imageBase64 && input.imageMediaType) {
    content.push({
      type: "image",
      source: { type: "base64", media_type: input.imageMediaType as "image/jpeg", data: input.imageBase64 },
    });
  }
  content.push({
    type: "text",
    text: input.text?.trim() || "Extraia os dados do comprovante/nota fiscal na imagem anexada.",
  });

  const message = await client.messages.create({
    model: "claude-sonnet-5",
    max_tokens: 1024,
    system: buildPrompt(input.works, input.categorias),
    tools: [EXTRACTION_TOOL],
    tool_choice: { type: "tool", name: EXTRACTION_TOOL.name },
    messages: [{ role: "user", content }],
  });

  const toolUse = message.content.find((block) => block.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("Não foi possível extrair os dados. Tente reformular ou anexar uma imagem mais nítida.");
  }

  return toolUse.input as PreLancamentoExtraction;
}
