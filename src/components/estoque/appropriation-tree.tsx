"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrencyBRL, UNIT_LABELS } from "@/lib/status-labels";
import type { AppropriationMaterial, AppropriationNode } from "@/server/actions/estoque";
import type { AppropriationViewMode } from "@/components/estoque/appropriation-filters";

function filterByResource(nodes: AppropriationNode[], materialId: string): AppropriationNode[] {
  if (!materialId) return nodes;
  const result: AppropriationNode[] = [];
  for (const node of nodes) {
    const materiaisDiretos = node.materiaisDiretos.filter((m) => m.materialId === materialId);
    const children = filterByResource(node.children, materialId);
    if (materiaisDiretos.length === 0 && children.length === 0) continue;
    const valor = materiaisDiretos.reduce((s, m) => s + m.valor, 0) + children.reduce((s, c) => s + c.valor, 0);
    result.push({ ...node, materiaisDiretos, children, valor });
  }
  return result;
}

function filterBySearch(nodes: AppropriationNode[], search: string): AppropriationNode[] {
  const q = search.trim().toLowerCase();
  if (!q) return nodes;
  const result: AppropriationNode[] = [];
  for (const node of nodes) {
    const nameMatches = node.nome.toLowerCase().includes(q) || (node.codigo ?? "").toLowerCase().includes(q);
    if (nameMatches) {
      result.push(node);
      continue;
    }
    const materialMatches = node.materiaisDiretos.some((m) => m.nome.toLowerCase().includes(q));
    const children = filterBySearch(node.children, q);
    if (materialMatches || children.length > 0) {
      result.push({ ...node, children: children.length > 0 ? children : node.children });
    }
  }
  return result;
}

function flattenTasks(nodes: AppropriationNode[], path: string[] = []): { node: AppropriationNode; path: string[] }[] {
  const result: { node: AppropriationNode; path: string[] }[] = [];
  for (const node of nodes) {
    if (node.tipo === "task") {
      result.push({ node, path });
    } else {
      result.push(...flattenTasks(node.children, [...path, node.nome]));
    }
  }
  return result;
}

function flattenMateriais(nodes: AppropriationNode[]): AppropriationMaterial[] {
  const byMaterial = new Map<string, AppropriationMaterial>();
  function walk(list: AppropriationNode[]) {
    for (const node of list) {
      for (const m of node.materiaisDiretos) {
        const existing = byMaterial.get(m.materialId) ?? { ...m, quantidade: 0, valor: 0 };
        existing.quantidade += m.quantidade;
        existing.valor += m.valor;
        byMaterial.set(m.materialId, existing);
      }
      walk(node.children);
    }
  }
  walk(nodes);
  return Array.from(byMaterial.values()).sort((a, b) => b.valor - a.valor);
}

export function AppropriationTree({
  nodes,
  search,
  materialId,
  viewMode,
}: {
  nodes: AppropriationNode[];
  search: string;
  materialId: string;
  viewMode: AppropriationViewMode;
}) {
  const filtered = useMemo(
    () => filterBySearch(filterByResource(nodes, materialId), search),
    [nodes, materialId, search],
  );
  const materiais = useMemo(() => flattenMateriais(filtered), [filtered]);
  const tasks = useMemo(() => flattenTasks(filtered), [filtered]);

  if (filtered.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
        Nenhum resultado encontrado.
      </p>
    );
  }

  if (viewMode === "recursos") return <MaterialsFlatTable materiais={materiais} />;
  if (viewMode === "atividades") return <TasksFlatList tasks={tasks} />;

  const autoOpen = Boolean(search.trim() || materialId);
  return (
    <div className="rounded-lg border p-2">
      <TreeNodes nodes={filtered} depth={0} defaultOpen={autoOpen} />
    </div>
  );
}

function TreeNodes({ nodes, depth, defaultOpen }: { nodes: AppropriationNode[]; depth: number; defaultOpen: boolean }) {
  return (
    <div className="flex flex-col">
      {nodes.map((node) => (
        <TreeNode key={node.id} node={node} depth={depth} defaultOpen={defaultOpen} />
      ))}
    </div>
  );
}

function TreeNode({ node, depth, defaultOpen }: { node: AppropriationNode; depth: number; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const hasContent = node.children.length > 0 || node.materiaisDiretos.length > 0;

  return (
    <div>
      <button
        type="button"
        onClick={() => hasContent && setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 rounded px-2 py-1.5 text-left hover:bg-muted/50"
        style={{ paddingLeft: `${depth * 1.25 + 0.25}rem` }}
      >
        <span className="flex min-w-0 items-center gap-1.5 truncate text-sm">
          {hasContent ? (
            open ? (
              <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
            ) : (
              <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
            )
          ) : (
            <span className="inline-block size-3.5 shrink-0" />
          )}
          <span className={`truncate ${node.tipo === "task" ? "text-muted-foreground" : "font-medium"}`}>
            {node.codigo ? `${node.codigo} — ` : ""}
            {node.nome}
          </span>
        </span>
        <span className="shrink-0 text-sm tabular-nums text-muted-foreground">{formatCurrencyBRL(node.valor)}</span>
      </button>
      {open ? (
        <div>
          {node.materiaisDiretos.map((m) => (
            <MaterialRow key={m.materialId} material={m} depth={depth + 1} />
          ))}
          <TreeNodes nodes={node.children} depth={depth + 1} defaultOpen={defaultOpen} />
        </div>
      ) : null}
    </div>
  );
}

function MaterialRow({ material, depth }: { material: AppropriationMaterial; depth: number }) {
  return (
    <div
      className="flex items-center justify-between gap-2 px-2 py-1 text-sm text-muted-foreground"
      style={{ paddingLeft: `${depth * 1.25 + 1.75}rem` }}
    >
      <span className="truncate">{material.nome}</span>
      <span className="shrink-0 tabular-nums">
        {material.quantidade} {UNIT_LABELS[material.unidade ?? ""] ?? material.unidade} · {formatCurrencyBRL(material.valor)}
      </span>
    </div>
  );
}

function TasksFlatList({ tasks }: { tasks: { node: AppropriationNode; path: string[] }[] }) {
  if (tasks.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
        Nenhuma atividade com material apropriado.
      </p>
    );
  }
  return (
    <div className="divide-y rounded-lg border">
      {tasks.map(({ node, path }) => (
        <div key={node.id} className="p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              {path.length > 0 ? <p className="truncate text-xs text-muted-foreground">{path.join(" › ")}</p> : null}
              <p className="truncate text-sm font-medium">
                {node.codigo ? `${node.codigo} — ` : ""}
                {node.nome}
              </p>
            </div>
            <p className="shrink-0 text-sm font-medium tabular-nums">{formatCurrencyBRL(node.valor)}</p>
          </div>
          {node.materiaisDiretos.length > 0 ? (
            <div className="mt-2 flex flex-col border-t pt-2">
              {node.materiaisDiretos.map((m) => (
                <MaterialRow key={m.materialId} material={m} depth={0} />
              ))}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function MaterialsFlatTable({ materiais }: { materiais: AppropriationMaterial[] }) {
  if (materiais.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
        Nenhum material apropriado encontrado.
      </p>
    );
  }
  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Material</TableHead>
            <TableHead>Categoria</TableHead>
            <TableHead>Quantidade</TableHead>
            <TableHead className="text-right">Valor</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {materiais.map((m) => (
            <TableRow key={m.materialId}>
              <TableCell className="font-medium">{m.nome}</TableCell>
              <TableCell className="text-muted-foreground">{m.categoria ?? "—"}</TableCell>
              <TableCell>
                {m.quantidade} {UNIT_LABELS[m.unidade ?? ""] ?? m.unidade}
              </TableCell>
              <TableCell className="text-right">{formatCurrencyBRL(m.valor)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
