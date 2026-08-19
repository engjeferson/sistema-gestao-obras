"use client";

import { useActionState, useEffect, useId, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/ui/native-select";
import { InvoiceItemsEditor } from "@/components/notas-fiscais/invoice-items-editor";
import { InvoiceInstallmentsEditor } from "@/components/notas-fiscais/invoice-installments-editor";
import { XmlItemsReviewDialog } from "@/components/notas-fiscais/xml-items-review-dialog";
import { uploadFileToR2 } from "@/lib/upload-file";
import { parseNFeXml } from "@/lib/parse-nfe-xml";
import { ESTOQUE_GERAL_VALUE } from "@/lib/validations/notas-fiscais";
import type { InvoiceItemValues, InvoiceInstallmentValues } from "@/lib/validations/notas-fiscais";

type StageOption = { id: string; codigo: string | null; nome: string; tasks: { id: string; codigo: string | null; nome: string }[] };

type InvoiceFormProps = {
  action: (prevState: string | undefined, formData: FormData) => Promise<string | undefined>;
  works: { id: string; nome: string; codigo: string }[];
  categorias: { id: string; nome: string }[];
  bankAccounts: { id: string; nome: string }[];
  stagesByWork: Record<string, StageOption[]>;
  supplierNames: string[];
  materials: { nome: string; unidadePadrao: string | null }[];
  defaultWorkId?: string;
  initialXml?: string;
  initialSummary?: { numero: string | null; dataEmissao: string | null; fornecedorNome: string | null };
  radarId?: string;
};

export function InvoiceForm({
  action,
  works,
  categorias,
  bankAccounts,
  stagesByWork,
  supplierNames,
  materials,
  defaultWorkId,
  initialXml,
  initialSummary,
  radarId,
}: InvoiceFormProps) {
  const [errorMessage, formAction, isPending] = useActionState(action, undefined);
  const [items, setItems] = useState<InvoiceItemValues[]>([
    { material: "", quantidade: 1, unidade: "UN", valorUnitario: 0 },
  ]);
  const [gerarContaPagar, setGerarContaPagar] = useState(false);
  const [parcelar, setParcelar] = useState(false);
  const [parcelas, setParcelas] = useState<InvoiceInstallmentValues[]>([]);
  const totalValor = items.reduce((sum, item) => sum + item.quantidade * item.valorUnitario, 0);
  const [selectedWorkId, setSelectedWorkId] = useState(defaultWorkId ?? "");
  const [selectedStageId, setSelectedStageId] = useState("");
  const isEstoqueGeral = selectedWorkId === ESTOQUE_GERAL_VALUE;
  const stagesForWork = stagesByWork[selectedWorkId] ?? [];
  const tasksForStage = stagesForWork.find((s) => s.id === selectedStageId)?.tasks ?? [];
  const [arquivoUrl, setArquivoUrl] = useState<string | null>(null);
  const [arquivoXmlUrl, setArquivoXmlUrl] = useState<string | null>(null);
  const [comprovanteUrl, setComprovanteUrl] = useState<string | null>(null);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [uploadingXml, setUploadingXml] = useState(false);
  const [uploadingComprovante, setUploadingComprovante] = useState(false);
  const [contaPaga, setContaPaga] = useState(false);
  const [pendingVencimentoUnico, setPendingVencimentoUnico] = useState<string | null>(null);
  const [pendingXmlItems, setPendingXmlItems] = useState<InvoiceItemValues[] | null>(null);
  const draftId = useId().replace(/[^a-zA-Z0-9]/g, "");

  function applyParsedXml(text: string) {
    const parsed = parseNFeXml(text);

    if (parsed.numero) {
      const numeroInput = document.getElementById("numero") as HTMLInputElement | null;
      if (numeroInput) numeroInput.value = parsed.numero;
    }
    if (parsed.dataEmissao) {
      const dataInput = document.getElementById("dataEmissao") as HTMLInputElement | null;
      if (dataInput) dataInput.value = parsed.dataEmissao;
    }
    if (parsed.fornecedorNome) {
      const supplierInput = document.getElementById("supplierNome") as HTMLInputElement | null;
      if (supplierInput) supplierInput.value = parsed.fornecedorNome;
    }
    if (parsed.items.length > 0) {
      setPendingXmlItems(parsed.items);
    }
    if (parsed.duplicatas.length >= 2) {
      setGerarContaPagar(true);
      setParcelar(true);
      setParcelas(parsed.duplicatas.map((d) => ({ dataVencimento: d.vencimento, valor: d.valor })));
    } else if (parsed.duplicatas.length === 1) {
      setGerarContaPagar(true);
      setPendingVencimentoUnico(parsed.duplicatas[0].vencimento);
    }
    const parcelasMsg =
      parsed.duplicatas.length > 0
        ? ` e ${parsed.duplicatas.length} boleto${parsed.duplicatas.length === 1 ? "" : "s"} da fatura`
        : "";
    const itensMsg =
      parsed.items.length > 0
        ? `${parsed.items.length} ite${parsed.items.length === 1 ? "m" : "ns"} pra revisar`
        : "nenhum item";
    toast.success(`XML lido: ${itensMsg}${parcelasMsg}.`);
  }

  async function handleXmlImport(file: File) {
    try {
      const text = await file.text();
      applyParsedXml(text);
    } catch {
      toast.error("Não foi possível ler este XML como uma NF-e. Confira o arquivo ou preencha manualmente.");
    }
  }

  useEffect(() => {
    if (!initialXml) return;
    try {
      applyParsedXml(initialXml);
    } catch {
      toast.error("Não foi possível ler o XML desta nota. Preencha manualmente.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialXml]);

  useEffect(() => {
    if (initialXml || !initialSummary) return;
    if (initialSummary.numero) {
      const numeroInput = document.getElementById("numero") as HTMLInputElement | null;
      if (numeroInput) numeroInput.value = initialSummary.numero;
    }
    if (initialSummary.dataEmissao) {
      const dataInput = document.getElementById("dataEmissao") as HTMLInputElement | null;
      if (dataInput) dataInput.value = initialSummary.dataEmissao;
    }
    if (initialSummary.fornecedorNome) {
      const supplierInput = document.getElementById("supplierNome") as HTMLInputElement | null;
      if (supplierInput) supplierInput.value = initialSummary.fornecedorNome;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSummary, initialXml]);

  useEffect(() => {
    if (!pendingVencimentoUnico || parcelar) return;
    const el = document.getElementById("dataVencimento") as HTMLInputElement | null;
    if (el) el.value = pendingVencimentoUnico;
  }, [gerarContaPagar, parcelar, pendingVencimentoUnico]);

  async function handleFileChange(
    file: File | undefined,
    kind: "pdf" | "xml" | "comprovante",
    workId: string,
  ) {
    if (!file) return;
    if (kind === "xml") {
      void handleXmlImport(file);
    }
    if (!workId) return;
    const setUploading = kind === "pdf" ? setUploadingPdf : kind === "xml" ? setUploadingXml : setUploadingComprovante;
    const setUrl = kind === "pdf" ? setArquivoUrl : kind === "xml" ? setArquivoXmlUrl : setComprovanteUrl;
    setUploading(true);
    try {
      const key = await uploadFileToR2(file, "notas-fiscais", workId, draftId);
      setUrl(key);
      toast.success("Arquivo enviado.");
    } catch {
      toast.error("Não foi possível enviar o arquivo. Verifique a configuração de armazenamento.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <>
    <form action={formAction} className="flex flex-col gap-6">
      <input type="hidden" name="itemsJson" value={JSON.stringify(items)} readOnly />
      <input type="hidden" name="parcelasJson" value={JSON.stringify(parcelas)} readOnly />
      <input type="hidden" name="arquivoUrl" value={arquivoUrl ?? ""} readOnly />
      <input type="hidden" name="arquivoXmlUrl" value={arquivoXmlUrl ?? ""} readOnly />
      <input type="hidden" name="comprovanteUrl" value={comprovanteUrl ?? ""} readOnly />
      <input type="hidden" name="radarId" value={radarId ?? ""} readOnly />

      <div className="flex flex-col gap-2 rounded-lg border border-dashed p-4">
        <Label htmlFor="arquivoXml">Importar XML da NF (opcional)</Label>
        <Input
          id="arquivoXml"
          type="file"
          accept=".xml,text/xml"
          disabled={uploadingXml}
          onChange={(e) => {
            const workSelect = document.getElementById("workId") as HTMLSelectElement | null;
            void handleFileChange(e.target.files?.[0], "xml", workSelect?.value ?? "");
          }}
        />
        <p className="text-xs text-muted-foreground">
          Selecione o XML da nota fiscal para preencher fornecedor, número, data e itens automaticamente.
        </p>
        {uploadingXml ? <p className="text-xs text-muted-foreground">Enviando anexo...</p> : null}
        {arquivoXmlUrl ? <p className="text-xs text-success">Arquivo anexado.</p> : null}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="nome">Descrição do pedido (opcional)</Label>
        <Input id="nome" name="nome" placeholder="Ex: Aço, Madeiras tapume" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="workId">Obra</Label>
          <NativeSelect
            id="workId"
            name="workId"
            value={selectedWorkId}
            onChange={(e) => {
              setSelectedWorkId(e.target.value);
              setSelectedStageId("");
            }}
            required
          >
            <option value="" disabled>
              Selecione a obra ou o estoque
            </option>
            <option value={ESTOQUE_GERAL_VALUE}>Estoque da Empresa (sem obra)</option>
            {works.map((work) => (
              <option key={work.id} value={work.id}>
                {work.codigo} — {work.nome}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="supplierNome">Fornecedor</Label>
          <Input id="supplierNome" name="supplierNome" list="fornecedores-datalist" required />
          <datalist id="fornecedores-datalist">
            {supplierNames.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
        </div>
        {!isEstoqueGeral ? (
          <>
            <div className="flex flex-col gap-2">
              <Label htmlFor="stageId">Etapa</Label>
              <NativeSelect
                id="stageId"
                name="stageId"
                value={selectedStageId}
                onChange={(e) => setSelectedStageId(e.target.value)}
              >
                <option value="">—</option>
                {stagesForWork.map((stage) => (
                  <option key={stage.id} value={stage.id}>
                    {stage.codigo ? `${stage.codigo} — ` : ""}
                    {stage.nome}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="taskId">Atividade</Label>
              <NativeSelect id="taskId" name="taskId" key={selectedStageId} disabled={!selectedStageId}>
                <option value="">—</option>
                {tasksForStage.map((task) => (
                  <option key={task.id} value={task.id}>
                    {task.codigo ? `${task.codigo} — ` : ""}
                    {task.nome}
                  </option>
                ))}
              </NativeSelect>
            </div>
          </>
        ) : null}
        <div className="flex flex-col gap-2">
          <Label htmlFor="numero">Número da NF (opcional)</Label>
          <Input id="numero" name="numero" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="dataEmissao">Data</Label>
          <Input id="dataEmissao" name="dataEmissao" type="date" required />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="categoriaId">Categoria</Label>
          <NativeSelect id="categoriaId" name="categoriaId" defaultValue="" required>
            <option value="" disabled>
              Selecione a categoria
            </option>
            {categorias.map((categoria) => (
              <option key={categoria.id} value={categoria.id}>
                {categoria.nome}
              </option>
            ))}
          </NativeSelect>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label>Itens da nota</Label>
        <InvoiceItemsEditor items={items} onChange={setItems} materials={materials} />
      </div>

      <div className="flex flex-col gap-2 sm:max-w-sm">
        <Label htmlFor="arquivoPdf">Arquivo PDF</Label>
        <Input
          id="arquivoPdf"
          type="file"
          accept="application/pdf"
          disabled={uploadingPdf}
          onChange={(e) => {
            const workSelect = document.getElementById("workId") as HTMLSelectElement | null;
            void handleFileChange(e.target.files?.[0], "pdf", workSelect?.value ?? "");
          }}
        />
        {uploadingPdf ? <p className="text-xs text-muted-foreground">Enviando...</p> : null}
        {arquivoUrl ? <p className="text-xs text-success">Arquivo anexado.</p> : null}
      </div>

      <div className="flex flex-col gap-3 rounded-lg border p-4">
        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            name="gerarContaPagar"
            checked={gerarContaPagar}
            onChange={(e) => setGerarContaPagar(e.target.checked)}
            className="size-4"
          />
          Gerar conta a pagar automaticamente
        </label>
        {gerarContaPagar ? (
          <div className="flex flex-col gap-4">
            <div className="grid gap-4 sm:max-w-md sm:grid-cols-2">
              {!parcelar ? (
                <div className="flex flex-col gap-2">
                  <Label htmlFor="dataVencimento">Data de vencimento</Label>
                  <Input id="dataVencimento" name="dataVencimento" type="date" required={!parcelar} />
                </div>
              ) : null}
              <div className="flex flex-col gap-2">
                <Label htmlFor="bankAccountId">Conta bancária</Label>
                <NativeSelect id="bankAccountId" name="bankAccountId" defaultValue="">
                  <option value="">—</option>
                  {bankAccounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.nome}
                    </option>
                  ))}
                </NativeSelect>
              </div>
            </div>

            {!parcelar ? (
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    name="contaPaga"
                    checked={contaPaga}
                    onChange={(e) => {
                      setContaPaga(e.target.checked);
                      if (e.target.checked) setParcelar(false);
                    }}
                    className="size-4"
                  />
                  Já foi paga (à vista)
                </label>
                {contaPaga ? (
                  <div className="flex flex-col gap-2 sm:max-w-sm">
                    <Label htmlFor="comprovante">Comprovante de pagamento (opcional)</Label>
                    <Input
                      id="comprovante"
                      type="file"
                      disabled={uploadingComprovante}
                      onChange={(e) => {
                        const workSelect = document.getElementById("workId") as HTMLSelectElement | null;
                        void handleFileChange(e.target.files?.[0], "comprovante", workSelect?.value ?? "");
                      }}
                    />
                    {uploadingComprovante ? <p className="text-xs text-muted-foreground">Enviando...</p> : null}
                    {comprovanteUrl ? <p className="text-xs text-success">Comprovante anexado.</p> : null}
                  </div>
                ) : null}
              </div>
            ) : null}

            {!contaPaga ? (
              <label className="flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  name="parcelar"
                  checked={parcelar}
                  onChange={(e) => setParcelar(e.target.checked)}
                  className="size-4"
                />
                Parcelar esta conta a pagar
              </label>
            ) : null}

            {parcelar ? (
              <InvoiceInstallmentsEditor totalValor={totalValor} parcelas={parcelas} onChange={setParcelas} />
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="observacao">Observação</Label>
        <Textarea id="observacao" name="observacao" />
      </div>

      {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}

      <div>
        <Button type="submit" disabled={isPending || uploadingPdf || uploadingXml}>
          {isPending ? "Salvando..." : "Lançar nota fiscal"}
        </Button>
      </div>
    </form>
    <XmlItemsReviewDialog
      open={pendingXmlItems !== null}
      items={pendingXmlItems ?? []}
      materials={materials}
      onCancel={() => setPendingXmlItems(null)}
      onConfirm={(resolved) => {
        setItems(resolved);
        setPendingXmlItems(null);
      }}
    />
    </>
  );
}
