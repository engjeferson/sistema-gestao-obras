"use client";

import { useId, useState } from "react";
import { toast } from "sonner";
import { Sparkles, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { uploadFileToR2 } from "@/lib/upload-file";
import { extractPreLancamentoDraft, createPreLancamento } from "@/server/actions/pre-lancamentos";
import { PreLancamentoForm, type PreLancamentoFormDefaultValues } from "@/components/financeiro/pre-lancamento-form";

export function PreLancamentoIaFlow({
  works,
  categorias,
  stagesByWork,
  favorecidosOptions,
}: {
  works: { id: string; nome: string; codigo: string }[];
  categorias: { id: string; nome: string }[];
  stagesByWork: Record<string, { id: string; codigo: string | null; nome: string }[]>;
  favorecidosOptions: string[];
}) {
  const [text, setText] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [draft, setDraft] = useState<PreLancamentoFormDefaultValues | null>(null);
  const [rawInput, setRawInput] = useState("");
  const draftId = useId().replace(/[^a-zA-Z0-9]/g, "");

  async function handleExtract() {
    if (!text.trim() && !imageFile) {
      toast.error("Cole o texto da conversa ou anexe uma foto do comprovante.");
      return;
    }
    setExtracting(true);
    try {
      let imageKey: string | undefined;
      if (imageFile) {
        imageKey = await uploadFileToR2(imageFile, "comprovantes", null, draftId);
      }
      const extracted = await extractPreLancamentoDraft({ text: text.trim() || undefined, imageKey });
      setDraft({
        workId: extracted.workId || undefined,
        tipo: extracted.tipo,
        descricao: extracted.descricao,
        categoriaId: extracted.categoriaId || undefined,
        favorecidoNome: extracted.favorecidoNome || undefined,
        valor: extracted.valor,
        dataVencimento: extracted.dataVencimento || undefined,
        observacao: extracted.observacao || undefined,
        attachments: imageKey ? [{ url: imageKey, nome: imageFile!.name }] : [],
      });
      setRawInput(text.trim());
      toast.success("Dados extraídos — confira antes de salvar.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível extrair os dados.");
    } finally {
      setExtracting(false);
    }
  }

  if (draft) {
    return (
      <div className="flex flex-col gap-4">
        <Card>
          <CardContent className="flex items-start gap-2 pt-6 text-sm text-muted-foreground">
            <Sparkles className="mt-0.5 size-4 shrink-0 text-success" />
            Dados coletados pela IA — confira e complete antes de salvar. Nada foi gravado ainda.
          </CardContent>
        </Card>
        <PreLancamentoForm
          key={JSON.stringify(draft)}
          action={createPreLancamento}
          works={works}
          categorias={categorias}
          stagesByWork={stagesByWork}
          favorecidosOptions={favorecidosOptions}
          defaultValues={draft}
          submitLabel="Salvar pré-lançamento"
          origem="IA"
          rawInput={rawInput}
        />
      </div>
    );
  }

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="texto-ia">Cole o texto da conversa (WhatsApp, e-mail etc.)</Label>
        <Textarea
          id="texto-ia"
          rows={6}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Ex: Por favor, cadastre essa despesa da Materiais de Construção SJ no valor de R$ 1.250,00..."
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="foto-ia">Ou anexe a foto do comprovante/nota fiscal</Label>
        <Input
          id="foto-ia"
          type="file"
          accept="image/*"
          onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
        />
        {imageFile ? (
          <p className="flex items-center gap-1 text-xs text-success">
            <Paperclip className="size-3" /> {imageFile.name}
          </p>
        ) : null}
      </div>
      <div>
        <Button onClick={() => void handleExtract()} disabled={extracting}>
          <Sparkles /> {extracting ? "Analisando..." : "Extrair com IA"}
        </Button>
      </div>
    </div>
  );
}
