import { redirect } from "next/navigation";

export default async function ObraRootPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/obras/${id}/visao-geral`);
}
