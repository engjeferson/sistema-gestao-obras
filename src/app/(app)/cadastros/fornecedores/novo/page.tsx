import { SupplierForm } from "@/components/cadastros/supplier-form";
import { createSupplier } from "@/server/actions/fornecedores";

export default function NovoFornecedorPage() {
  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <h2 className="text-lg font-semibold">Novo fornecedor</h2>
      <SupplierForm action={createSupplier} submitLabel="Criar fornecedor" />
    </div>
  );
}
