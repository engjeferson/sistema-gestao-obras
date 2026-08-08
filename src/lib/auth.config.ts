import type { NextAuthConfig } from "next-auth";
import { NextResponse } from "next/server";

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
    jwt({ token, user }) {
      if (user?.id) {
        token.id = user.id;
        token.role = user.role;
      }
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

      if (pathname.startsWith("/login")) {
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
