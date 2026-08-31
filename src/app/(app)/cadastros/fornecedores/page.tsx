import Link from "next/link";
import { Plus } from "lucide-react";
import { listSuppliers } from "@/server/actions/fornecedores";
import { getCurrentModulePermissions } from "@/server/actions/permissions";
import { Button } from "@/components/ui/button";
import { SuppliersSearchList } from "@/components/cadastros/suppliers-search-list";

export default async function FornecedoresPage() {
  const [suppliers, modulePermissions] = await Promise.all([listSuppliers(), getCurrentModulePermissions()]);

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
        {!modulePermissions.cadastrosSomenteLeitura ? (
          <Button size="sm" render={<Link href="/cadastros/fornecedores/novo" />} nativeButton={false}>
            <Plus /> Novo fornecedor
          </Button>
        ) : null}
      </div>
      <SuppliersSearchList suppliers={suppliers} />
    </div>
  );
}
