import { notFound } from "next/navigation";
import { getUser, updateUser } from "@/server/actions/usuarios";
import { listAllFinancialCategories } from "@/server/actions/financeiro";
import { UserEditForm } from "@/components/configuracoes/user-edit-form";
import { resolveFinancePermissions } from "@/lib/finance-permissions";

export default async function EditarUsuarioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [user, categorias] = await Promise.all([getUser(id), listAllFinancialCategories()]);
  if (!user) {
    notFound();
  }

  const updateUserWithId = updateUser.bind(null, user.id);
  const financePermissions = resolveFinancePermissions(user.role, user.financePermissions);

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <h2 className="text-lg font-semibold">Editar usuário</h2>
      <UserEditForm
        action={updateUserWithId}
        defaultValues={user}
        categorias={categorias}
        financePermissions={financePermissions}
      />
    </div>
  );
}
