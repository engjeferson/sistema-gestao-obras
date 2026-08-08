import { notFound } from "next/navigation";
import { SupplierForm } from "@/components/cadastros/supplier-form";
import { getSupplier, updateSupplier } from "@/server/actions/fornecedores";

export default async function EditarFornecedorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supplier = await getSupplier(id);
  if (!supplier) {
    notFound();
  }

  const updateSupplierWithId = updateSupplier.bind(null, supplier.id);

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <h2 className="text-lg font-semibold">Editar fornecedor</h2>
      <SupplierForm action={updateSupplierWithId} defaultValues={supplier} submitLabel="Salvar alterações" />
    </div>
  );
}
