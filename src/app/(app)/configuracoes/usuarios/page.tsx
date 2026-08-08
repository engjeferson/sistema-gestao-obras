import { listUsers } from "@/server/actions/usuarios";
import { UserForm } from "@/components/configuracoes/user-form";
import { UsersTable } from "@/components/configuracoes/users-table";

export default async function UsuariosPage() {
  const users = await listUsers();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Usuários</h1>
        <p className="text-muted-foreground">Crie e gerencie os usuários que acessam o sistema.</p>
      </div>
      <UserForm />
      <UsersTable users={users} />
    </div>
  );
}
