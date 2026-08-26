This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Agenda via WhatsApp

O módulo **Agenda** (`/agenda`) permite criar compromissos manualmente pela interface ou
mandando mensagens de texto pro seu WhatsApp comercial (ex: "reunião com o cliente sexta às
14h na obra"). Uma IA (Claude, via Anthropic API) interpreta a mensagem, cria o evento e
responde confirmando; responder a essa confirmação permite cancelar ou remarcar o compromisso.
30 minutos antes de cada compromisso com horário definido, um lembrete é enviado pelo WhatsApp
(cron em `vercel.json` chamando `/api/cron/lembretes-agenda` a cada 10 minutos).

### Variáveis de ambiente necessárias

| Variável | Descrição |
| --- | --- |
| `ANTHROPIC_API_KEY` | Chave da API da Anthropic, usada para interpretar as mensagens. |
| `WHATSAPP_TOKEN` | Token de acesso permanente do app no Meta Cloud API (WhatsApp Business). |
| `WHATSAPP_PHONE_NUMBER_ID` | ID do número de telefone configurado no app da Meta. |
| `WHATSAPP_VERIFY_TOKEN` | String arbitrária que você escolhe, usada na verificação do webhook. |
| `WHATSAPP_APP_SECRET` | App Secret do app da Meta, usado para validar a assinatura do webhook. |
| `WHATSAPP_API_VERSION` | Opcional — versão da Graph API (padrão `v22.0`). |
| `CRON_SECRET` | Segredo usado para proteger `/api/cron/lembretes-agenda` (Vercel Cron envia `Authorization: Bearer <CRON_SECRET>` automaticamente quando essa variável está definida). |

### Configurando o Meta Cloud API

1. Crie um app do tipo "Business" no [Meta for Developers](https://developers.facebook.com/) e
   adicione o produto **WhatsApp**.
2. Em WhatsApp > Configuração da API, gere um número de teste (ou conecte um número comercial
   real) e copie o `Phone number ID` para `WHATSAPP_PHONE_NUMBER_ID`.
3. Gere um token de acesso permanente (via System User, em Business Settings) e coloque em
   `WHATSAPP_TOKEN`.
4. Em WhatsApp > Configuração > Webhook, cadastre a URL
   `https://SEU_DOMINIO/api/whatsapp/webhook`, defina um `Verify token` (o mesmo valor de
   `WHATSAPP_VERIFY_TOKEN`) e inscreva-se no campo `messages`.
5. Copie o App Secret (em Configurações do app > Básico) para `WHATSAPP_APP_SECRET`.
6. Cada usuário vincula o próprio número de WhatsApp em `/agenda` ("Agendar pelo WhatsApp") —
   só números vinculados a um usuário conseguem criar compromissos pelo bot.

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
