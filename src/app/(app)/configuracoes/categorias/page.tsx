import { listAllFinancialCategories } from "@/server/actions/financeiro";
import { CategoryForm } from "@/components/configuracoes/category-form";
import { CategoriesTable } from "@/components/configuracoes/categories-table";

export default async function CategoriasPage() {
  const categories = await listAllFinancialCategories();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Categorias financeiras</h1>
        <p className="text-muted-foreground">Usadas em Financeiro e Notas Fiscais.</p>
      </div>
      <CategoryForm />
      <CategoriesTable categories={categories} />
    </div>
  );
}
