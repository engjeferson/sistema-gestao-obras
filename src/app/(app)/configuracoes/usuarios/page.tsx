import { listUsers } from "@/server/actions/usuarios";
import { listAllFinancialCategories } from "@/server/actions/financeiro";
import { listWorks } from "@/server/actions/obras";
import { UserForm } from "@/components/configuracoes/user-form";
import { UsersTable } from "@/components/configuracoes/users-table";

export default async function UsuariosPage() {
  const [users, categorias, works] = await Promise.all([listUsers(), listAllFinancialCategories(), listWorks()]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Usuários</h1>
        <p className="text-muted-foreground">Crie e gerencie os usuários que acessam o sistema.</p>
      </div>
      <UserForm categorias={categorias} works={works.map((w) => ({ id: w.id, nome: w.nome, codigo: w.codigo }))} />
      <UsersTable users={users} />
    </div>
  );
}
