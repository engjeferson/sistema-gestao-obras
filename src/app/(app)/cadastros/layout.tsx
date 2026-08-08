import { CadastrosTabsNav } from "@/components/cadastros/cadastros-tabs-nav";

export default function CadastrosLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Cadastros</h1>
        <p className="text-muted-foreground">Clientes, fornecedores, materiais e profissionais.</p>
      </div>
      <CadastrosTabsNav />
      {children}
    </div>
  );
}
