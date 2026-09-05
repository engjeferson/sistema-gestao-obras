import Link from "next/link";
import { ArrowLeft, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";

function defaultInicio() {
  const hoje = new Date();
  return new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), 1)).toISOString().slice(0, 10);
}

function defaultFim() {
  return new Date().toISOString().slice(0, 10);
}

export default function DownloadNotasFiscaisPage() {
  return (
    <div className="flex max-w-lg flex-col gap-4 p-4 md:p-6">
      <div>
        <Link
          href="/notas-fiscais"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary hover:underline"
        >
          <ArrowLeft className="size-4" /> Voltar para notas fiscais
        </Link>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Baixar notas fiscais em massa</h1>
        <p className="text-muted-foreground">
          Escolha o período e o formato — as notas fiscais lançadas nesse intervalo são reunidas em um único .zip.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Período e formato</CardTitle>
        </CardHeader>
        <CardContent>
          <form action="/api/notas-fiscais/download-zip" className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="dataInicio">Data de emissão — de</Label>
                <Input id="dataInicio" name="dataInicio" type="date" defaultValue={defaultInicio()} required />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="dataFim">Data de emissão — até</Label>
                <Input id="dataFim" name="dataFim" type="date" defaultValue={defaultFim()} required />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="formato">Formato dos arquivos</Label>
              <NativeSelect id="formato" name="formato" defaultValue="pdf">
                <option value="pdf">PDF</option>
                <option value="xml">XML</option>
              </NativeSelect>
              <p className="text-xs text-muted-foreground">
                Notas sem arquivo disponível no formato escolhido são ignoradas — o zip traz só o que existir.
              </p>
            </div>
            <div>
              <Button type="submit">
                <Download /> Baixar .zip
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
