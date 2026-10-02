import { getStockAppropriationTree } from "@/server/actions/estoque";
import { AppropriationView } from "@/components/estoque/appropriation-view";

export default async function ObraApropriacaoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const nodes = await getStockAppropriationTree(id);

  return <AppropriationView nodes={nodes} />;
}
