import { getCompanySettings } from "@/server/actions/empresa";
import { CompanySettingsForm } from "@/components/configuracoes/company-settings-form";

export default async function EmpresaConfigPage() {
  const settings = await getCompanySettings();

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dados da empresa</h1>
        <p className="text-muted-foreground">Usados em relatórios/PDFs e no Radar de NF-e.</p>
      </div>
      <CompanySettingsForm settings={settings} />
    </div>
  );
}
