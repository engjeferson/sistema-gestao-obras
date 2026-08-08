import Link from "next/link";
import { Plus } from "lucide-react";
import { listSuppliers } from "@/server/actions/fornecedores";
import { Button } from "@/components/ui/button";
import { SuppliersTable } from "@/components/cadastros/suppliers-table";

export default async function FornecedoresPage() {
  const suppliers = await listSuppliers();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-end gap-2">
        <Button
          size="sm"
          variant="outline"
          render={<Link href="/relatorios/historico-custos" />}
          nativeButton={false}
        >
          Histórico de custos
        </Button>
        <Button size="sm" render={<Link href="/cadastros/fornecedores/novo" />} nativeButton={false}>
          <Plus /> Novo fornecedor
        </Button>
      </div>
      <SuppliersTable suppliers={suppliers} />
    </div>
  );
}
