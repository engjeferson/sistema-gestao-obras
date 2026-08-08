import { BankAccountForm } from "@/components/cadastros/bank-account-form";
import { createBankAccount } from "@/server/actions/contas-bancarias";

export default function NovaContaBancariaPage() {
  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <h2 className="text-lg font-semibold">Nova conta bancária</h2>
      <BankAccountForm action={createBankAccount} submitLabel="Criar conta" />
    </div>
  );
}
