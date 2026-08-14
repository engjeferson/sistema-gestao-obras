import Link from "next/link";
import { Users, Tags, Building2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ConfiguracoesPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Configurações</h1>
      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/configuracoes/usuarios">
          <Card className="transition-colors hover:bg-accent/50">
            <CardHeader className="flex flex-row items-center gap-3">
              <Users className="size-5" />
              <div>
                <CardTitle>Usuários</CardTitle>
                <CardDescription>Criar e gerenciar usuários</CardDescription>
              </div>
            </CardHeader>
          </Card>
        </Link>
        <Link href="/configuracoes/categorias">
          <Card className="transition-colors hover:bg-accent/50">
            <CardHeader className="flex flex-row items-center gap-3">
              <Tags className="size-5" />
              <div>
                <CardTitle>Categorias financeiras</CardTitle>
                <CardDescription>Gerenciar categorias de lançamentos</CardDescription>
              </div>
            </CardHeader>
          </Card>
        </Link>
        <Link href="/configuracoes/empresa">
          <Card className="transition-colors hover:bg-accent/50">
            <CardHeader className="flex flex-row items-center gap-3">
              <Building2 className="size-5" />
              <div>
                <CardTitle>Dados da empresa</CardTitle>
                <CardDescription>CNPJ, UF e dados usados no Radar de NF-e</CardDescription>
              </div>
            </CardHeader>
          </Card>
        </Link>
      </div>
    </div>
  );
}
