import Anthropic from "@anthropic-ai/sdk";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";

let client: Anthropic | null = null;
function getClient() {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY não está configurada.");
    }
    client = new Anthropic({ apiKey });
  }
  return client;
}

export type ParsedScheduleIntent =
  | {
      intent: "criar";
      titulo: string;
      descricao?: string;
      local?: string;
      inicio: string;
      fim?: string;
      diaTodo: boolean;
    }
  | { intent: "cancelar" }
  | {
      intent: "editar";
      titulo?: string;
      descricao?: string;
      local?: string;
      inicio?: string;
      fim?: string;
    }
  | { intent: "duvida"; pergunta: string };

const TOOL_NAME = "registrar_evento_agenda";

const tool: Anthropic.Tool = {
  name: TOOL_NAME,
  description:
    "Registra a interpretação estruturada de uma mensagem de WhatsApp sobre um compromisso/evento de agenda.",
  input_schema: {
    type: "object",
    properties: {
      intent: {
        type: "string",
        enum: ["criar", "cancelar", "editar", "duvida"],
        description:
          "'criar' para um novo compromisso, 'cancelar' quando o usuário pede para cancelar/desmarcar o evento referenciado, 'editar' quando pede para mudar horário/local/título de um evento referenciado, 'duvida' quando a mensagem não tem informação suficiente (ex: sem data/hora identificável) para agir.",
      },
      titulo: { type: "string", description: "Título curto do compromisso." },
      descricao: { type: "string", description: "Detalhes adicionais, se houver." },
      local: { type: "string", description: "Local do compromisso, se mencionado." },
      inicio: {
        type: "string",
        description:
          "Data e hora de início em ISO 8601 com offset (ex: 2026-08-27T14:00:00-03:00), já resolvendo termos relativos como 'amanhã' ou 'sexta que vem' com base na data/hora atual informada.",
      },
      fim: { type: "string", description: "Data e hora de término em ISO 8601 com offset, se houver duração explícita." },
      diaTodo: { type: "boolean", description: "true se o compromisso é o dia inteiro, sem horário específico." },
      pergunta: {
        type: "string",
        description: "Pergunta curta e objetiva a devolver ao usuário quando intent = 'duvida'.",
      },
    },
    required: ["intent"],
  },
};

function buildSystemPrompt(nowIso: string, hasReferencedEvent: boolean) {
  return [
    "Você interpreta mensagens de WhatsApp em português do Brasil para uma agenda pessoal, no estilo do app Dola.",
    `A data/hora atual é ${nowIso} (fuso America/Sao_Paulo).`,
    hasReferencedEvent
      ? "Esta mensagem é uma resposta (reply) a um evento já criado — considere 'cancelar', 'desmarca', 'não vou mais' como intent 'cancelar', e pedidos de mudança de horário/local como 'editar'."
      : "Esta mensagem não é uma resposta a um evento existente — normalmente será intent 'criar'.",
    "Se a mensagem não permitir identificar uma data/hora (ou o evento referenciado, quando aplicável) com razoável confiança, use intent 'duvida' e escreva uma pergunta curta pedindo a informação faltante.",
    "Nunca invente datas: se o usuário não deu dia nem horário, é 'duvida'.",
    "Sempre responda usando a ferramenta fornecida, preenchendo apenas os campos relevantes para o intent escolhido.",
  ].join(" ");
}

export async function parseScheduleMessage(params: {
  text: string;
  now: Date;
  hasReferencedEvent: boolean;
}): Promise<ParsedScheduleIntent> {
  const nowIso = params.now.toISOString();

  const response = await getClient().messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: buildSystemPrompt(nowIso, params.hasReferencedEvent),
    tools: [tool],
    tool_choice: { type: "tool", name: TOOL_NAME },
    messages: [{ role: "user", content: params.text }],
  });

  const toolUse = response.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use" && block.name === TOOL_NAME,
  );
  if (!toolUse) {
    return { intent: "duvida", pergunta: "Não consegui entender essa mensagem. Pode reformular com data e horário?" };
  }

  const input = toolUse.input as Record<string, unknown>;
  const intent = input.intent;

  if (intent === "criar") {
    if (typeof input.titulo !== "string" || typeof input.inicio !== "string") {
      return { intent: "duvida", pergunta: "Não entendi bem o compromisso. Pode dizer o que é e quando?" };
    }
    return {
      intent: "criar",
      titulo: input.titulo,
      descricao: typeof input.descricao === "string" ? input.descricao : undefined,
      local: typeof input.local === "string" ? input.local : undefined,
      inicio: input.inicio,
      fim: typeof input.fim === "string" ? input.fim : undefined,
      diaTodo: input.diaTodo === true,
    };
  }

  if (intent === "cancelar") {
    return { intent: "cancelar" };
  }

  if (intent === "editar") {
    return {
      intent: "editar",
      titulo: typeof input.titulo === "string" ? input.titulo : undefined,
      descricao: typeof input.descricao === "string" ? input.descricao : undefined,
      local: typeof input.local === "string" ? input.local : undefined,
      inicio: typeof input.inicio === "string" ? input.inicio : undefined,
      fim: typeof input.fim === "string" ? input.fim : undefined,
    };
  }

  return {
    intent: "duvida",
    pergunta: typeof input.pergunta === "string" ? input.pergunta : "Pode dar mais detalhes sobre o compromisso?",
  };
}
