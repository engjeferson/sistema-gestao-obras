import { notFound } from "next/navigation";
import { getUser, updateUser } from "@/server/actions/usuarios";
import { listAllFinancialCategories } from "@/server/actions/financeiro";
import { listWorks } from "@/server/actions/obras";
import { UserEditForm } from "@/components/configuracoes/user-edit-form";
import { resolveFinancePermissions } from "@/lib/finance-permissions";
import { resolveModulePermissions } from "@/lib/module-permissions";
import { resolveReportPermissions } from "@/lib/report-permissions";
import { canSeeSensitiveValues, canViewContratos } from "@/lib/sensitive-values";

export default async function EditarUsuarioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [user, categorias, works] = await Promise.all([getUser(id), listAllFinancialCategories(), listWorks()]);
  if (!user) {
    notFound();
  }

  const updateUserWithId = updateUser.bind(null, user.id);
  const financePermissions = resolveFinancePermissions(user.role, user.financePermissions);
  const workAccess = {
    restringirObras: user.restringirObras,
    assignedWorkIds: user.assignedWorks.map((a) => a.workId),
  };
  const modulePermissions = resolveModulePermissions(user.role, user.modulePermissions);
  const reportPermissions = resolveReportPermissions(user.role, user.reportPermissions);
  const verValoresSensiveis = canSeeSensitiveValues(user.role, user.verValoresSensiveis);
  const verContratos = canViewContratos(user.role, user.verContratos);

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <h2 className="text-lg font-semibold">Editar usuário</h2>
      <UserEditForm
        action={updateUserWithId}
        defaultValues={user}
        categorias={categorias}
        financePermissions={financePermissions}
        works={works.map((w) => ({ id: w.id, nome: w.nome, codigo: w.codigo }))}
        workAccess={workAccess}
        modulePermissions={modulePermissions}
        verValoresSensiveis={verValoresSensiveis}
        verContratos={verContratos}
        reportPermissions={reportPermissions}
      />
    </div>
  );
}
