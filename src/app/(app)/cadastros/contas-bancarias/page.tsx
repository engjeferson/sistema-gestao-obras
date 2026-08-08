import Link from "next/link";
import { Plus } from "lucide-react";
import { listBankAccounts } from "@/server/actions/contas-bancarias";
import { Button } from "@/components/ui/button";
import { BankAccountsTable } from "@/components/cadastros/bank-accounts-table";

export default async function ContasBancariasPage() {
  const bankAccounts = await listBankAccounts();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-end">
        <Button size="sm" render={<Link href="/cadastros/contas-bancarias/novo" />} nativeButton={false}>
          <Plus /> Nova conta
        </Button>
      </div>
      <BankAccountsTable bankAccounts={bankAccounts} />
    </div>
  );
}
