// Service worker mínimo — sem cache, tudo segue direto pra rede. Existe só
// porque o Chrome/Android exige um service worker registrado com handler de
// fetch para considerar o site instalável como app (ícone próprio, tela
// cheia), senão "Adicionar à tela inicial" cria um atalho comum do navegador.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", () => {});
