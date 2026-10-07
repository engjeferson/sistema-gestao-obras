import type { NextAuthConfig } from "next-auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const ADMIN_ENGENHEIRO_PREFIXES = ["/financeiro", "/notas-fiscais"];
const ADMIN_ONLY_PREFIXES = ["/configuracoes"];

export const authConfig = {
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    // Chamado a cada acesso à sessão (não só no login) — revalida `active`/`role` no banco pra
    // desativar/mudar permissão de um usuário já logado derrubar a sessão dele na próxima
    // requisição, em vez de só bloquear logins novos.
    async jwt({ token, user }) {
      if (user?.id) {
        token.id = user.id;
        token.role = user.role;
      }
      if (!token.id) {
        return token;
      }
      const dbUser = await prisma.user.findUnique({
        where: { id: token.id as string },
        select: { active: true, role: true },
      });
      if (!dbUser || !dbUser.active) {
        return null;
      }
      token.role = dbUser.role;
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id;
      session.user.role = token.role;
      return session;
    },
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const { pathname } = request.nextUrl;

      if (pathname.startsWith("/login") || pathname.startsWith("/portal") || pathname.startsWith("/instalar")) {
        return true;
      }
      if (!isLoggedIn) {
        return false;
      }

      const role = auth.user.role;

      if (pathname.startsWith("/campo")) {
        return true;
      }
      if (role === "OBRA") {
        return NextResponse.redirect(new URL("/campo/obras", request.url));
      }
      if (
        ADMIN_ENGENHEIRO_PREFIXES.some((prefix) => pathname.startsWith(prefix)) &&
        role !== "ADMINISTRADOR" &&
        role !== "ENGENHEIRO" &&
        role !== "FINANCEIRO"
      ) {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
      if (ADMIN_ONLY_PREFIXES.some((prefix) => pathname.startsWith(prefix)) && role !== "ADMINISTRADOR") {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
      return true;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
