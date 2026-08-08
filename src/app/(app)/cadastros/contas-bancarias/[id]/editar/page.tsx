import { notFound } from "next/navigation";
import { BankAccountForm } from "@/components/cadastros/bank-account-form";
import { getBankAccount, updateBankAccount } from "@/server/actions/contas-bancarias";

export default async function EditarContaBancariaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const bankAccount = await getBankAccount(id);
  if (!bankAccount) {
    notFound();
  }

  const updateBankAccountWithId = updateBankAccount.bind(null, bankAccount.id);

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <h2 className="text-lg font-semibold">Editar conta bancária</h2>
      <BankAccountForm
        action={updateBankAccountWithId}
        defaultValues={{ ...bankAccount, saldoInicial: bankAccount.saldoInicial ? Number(bankAccount.saldoInicial) : null }}
        submitLabel="Salvar alterações"
      />
    </div>
  );
}
