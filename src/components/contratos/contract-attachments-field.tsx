"use client";

import { Trash2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type ContractAttachmentValue = { url: string; nome: string };

export function ContractAttachmentsField({
  attachments,
  uploading,
  onFilesChange,
  onRemove,
}: {
  attachments: ContractAttachmentValue[];
  uploading: boolean;
  onFilesChange: (files: FileList | null) => void;
  onRemove: (url: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2 sm:col-span-2">
      <input type="hidden" name="attachmentsJson" value={JSON.stringify(attachments)} readOnly />
      <Label htmlFor="anexos">Arquivos (PDF)</Label>
      <Input
        id="anexos"
        type="file"
        accept="application/pdf"
        multiple
        disabled={uploading}
        onChange={(e) => {
          onFilesChange(e.target.files);
          e.target.value = "";
        }}
      />
      {uploading ? <p className="text-xs text-muted-foreground">Enviando...</p> : null}
      {attachments.length > 0 ? (
        <ul className="flex flex-col gap-1">
          {attachments.map((att) => (
            <li key={att.url} className="flex items-center justify-between gap-2 rounded border px-3 py-1.5 text-sm">
              <a
                href={`/api/files?key=${encodeURIComponent(att.url)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-w-0 items-center gap-2 text-foreground hover:underline"
              >
                <FileText className="size-4 shrink-0 text-muted-foreground" />
                <span className="truncate">{att.nome}</span>
              </a>
              <Button type="button" variant="ghost" size="icon" onClick={() => onRemove(att.url)} title="Remover arquivo">
                <Trash2 className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
