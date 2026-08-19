import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

// Fonte variável oficial do Google (fonts.google.com/specimen/Google+Sans+Flex,
// licença Open Font License) — baixada e hospedada localmente (não está no
// catálogo embutido do next/font/google ainda, é recente demais).
const googleSansFlex = localFont({
  src: "./fonts/GoogleSansFlex-Variable.woff2",
  variable: "--font-google-sans-flex",
  weight: "100 900",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Reis Engenharia — Gestão de Obras",
  description: "Gestão de obras, financeiro, notas fiscais, planejamento e RDO da Reis Engenharia & Construções.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "RDO Obras",
  },
  icons: {
    apple: "/icon.png",
  },
  other: {
    "apple-mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0e1a2a",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="pt-BR"
      className={`${googleSansFlex.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
