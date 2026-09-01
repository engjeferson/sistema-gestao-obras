import Image from "next/image";
import { headers } from "next/headers";
import bwipjs from "bwip-js/node";
import { Menu, Share, SquarePlus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InstalarBotao } from "@/components/instalar/instalar-botao";

export const metadata = {
  title: "Instalar app do RDO — Reis Engenharia",
};

async function gerarQrCodeBase64(texto: string): Promise<string | null> {
  try {
    const buffer = await bwipjs.toBuffer({
      bcid: "qrcode",
      text: texto,
      scale: 6,
      includetext: false,
    });
    return `data:image/png;base64,${buffer.toString("base64")}`;
  } catch {
    return null;
  }
}

export default async function InstalarPage() {
  const headersList = await headers();
  const host = headersList.get("host") ?? "";
  const protocol = host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https";
  const url = `${protocol}://${host}/instalar`;
  const qrCode = await gerarQrCodeBase64(url);

  return (
    <div className="min-h-svh bg-muted/30">
      <header className="flex h-16 items-center justify-center bg-brand-navy px-4">
        <Image src="/brand/reis-logo-white.png" alt="Reis Engenharia" width={140} height={65} className="h-8 w-auto" priority />
      </header>

      <main className="mx-auto flex max-w-md flex-col gap-5 px-4 py-8">
        <div className="text-center">
          <h1 className="font-heading text-xl font-semibold text-foreground">Instale o app do RDO</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Tenha acesso rápido ao preenchimento do RDO direto da tela inicial do seu celular, sem precisar abrir o
            navegador toda vez.
          </p>
        </div>

        <InstalarBotao />

        {qrCode ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-center">Abra esta página no celular</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element -- data URI gerada no servidor, sem otimização de imagem aplicável */}
              <img src={qrCode} alt="QR code para abrir esta página no celular" width={200} height={200} className="rounded-lg" />
              <p className="text-center text-xs text-muted-foreground">
                Aponte a câmera do celular para o código acima.
              </p>
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>No Android (Chrome)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>Toque no botão &quot;Instalar app agora&quot; acima. Se ele não aparecer:</p>
            <p>
              1. Toque no menu <Menu className="inline size-3.5 align-text-bottom" /> do navegador.
            </p>
            <p>2. Toque em &quot;Instalar aplicativo&quot; ou &quot;Adicionar à tela inicial&quot;.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>No iPhone (Safari)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              1. Toque no botão <Share className="inline size-3.5 align-text-bottom" /> Compartilhar, na barra do
              navegador.
            </p>
            <p>
              2. Role para baixo e toque em <SquarePlus className="inline size-3.5 align-text-bottom" /> &quot;Adicionar
              à Tela de Início&quot;.
            </p>
            <p>3. Toque em &quot;Adicionar&quot; no canto superior direito.</p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
