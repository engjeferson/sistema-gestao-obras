import { notFound } from "next/navigation";
import { getCurrentContratosVisibility } from "@/server/actions/permissions";

export default async function ContratosLayout({ children }: { children: React.ReactNode }) {
  const verContratos = await getCurrentContratosVisibility();
  if (!verContratos) {
    notFound();
  }

  return children;
}
