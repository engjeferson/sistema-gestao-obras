import { notFound } from "next/navigation";
import { getUser, updateUser } from "@/server/actions/usuarios";
import { UserEditForm } from "@/components/configuracoes/user-edit-form";

export default async function EditarUsuarioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getUser(id);
  if (!user) {
    notFound();
  }

  const updateUserWithId = updateUser.bind(null, user.id);

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <h2 className="text-lg font-semibold">Editar usuário</h2>
      <UserEditForm action={updateUserWithId} defaultValues={user} />
    </div>
  );
}
