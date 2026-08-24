"use client";

import { useMemo, useState } from "react";
import { Wallet, HardHat } from "lucide-react";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { AppropriationFilters, type AppropriationViewMode } from "@/components/estoque/appropriation-filters";
import { AppropriationTree } from "@/components/estoque/appropriation-tree";
import { formatCurrencyBRL } from "@/lib/status-labels";
import type { AppropriationNode } from "@/server/actions/estoque";

function collectMateriais(nodes: AppropriationNode[]): { id: string; nome: string }[] {
  const byId = new Map<string, string>();
  function walk(list: AppropriationNode[]) {
    for (const node of list) {
      for (const m of node.materiaisDiretos) byId.set(m.materialId, m.nome);
      walk(node.children);
    }
  }
  walk(nodes);
  return Array.from(byId.entries())
    .map(([id, nome]) => ({ id, nome }))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

export function AppropriationView({ nodes }: { nodes: AppropriationNode[] }) {
  const [search, setSearch] = useState("");
  const [materialId, setMaterialId] = useState("");
  const [viewMode, setViewMode] = useState<AppropriationViewMode>("arvore");

  const materials = useMemo(() => collectMateriais(nodes), [nodes]);
  const valorTotal = useMemo(() => nodes.reduce((sum, node) => sum + node.valor, 0), [nodes]);
  const maoDeObraTotal = useMemo(() => nodes.reduce((sum, node) => sum + node.maoDeObra, 0), [nodes]);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <KpiCard icon={Wallet} label="Valor total em material apropriado" value={formatCurrencyBRL(valorTotal)} />
        <KpiCard icon={HardHat} label="Valor total em mão de obra" value={formatCurrencyBRL(maoDeObraTotal)} />
      </div>
      <AppropriationFilters
        materials={materials}
        search={search}
        onSearchChange={setSearch}
        materialId={materialId}
        onMaterialChange={setMaterialId}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />
      <AppropriationTree nodes={nodes} search={search} materialId={materialId} viewMode={viewMode} />
    </div>
  );
}
