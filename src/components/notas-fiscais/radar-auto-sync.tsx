"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { autoSyncIncomingNFesIfDue } from "@/server/actions/sefaz-radar";

// Dispara a sincronização automática depois que a página já está na tela,
// em vez de travar o carregamento nela — a consulta à SEFAZ é lenta e
// bloquear o render nisso podia estourar o tempo da função e derrubar a
// página inteira. Não renderiza nada.
export function RadarAutoSync() {
  const router = useRouter();

  useEffect(() => {
    autoSyncIncomingNFesIfDue().then((houveNovos) => {
      if (houveNovos) router.refresh();
    });
  }, [router]);

  return null;
}
