import Image from "next/image";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-svh items-center justify-center bg-brand-navy p-4">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <Image
          src="/brand/reis-logo-white.png"
          alt="Reis Engenharia"
          width={280}
          height={130}
          className="mx-auto h-16 w-auto"
          priority
        />
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="text-xl">Sistema de Gestão de Obras</CardTitle>
            <CardDescription>Entre com seu e-mail e senha para continuar.</CardDescription>
          </CardHeader>
          <CardContent>
            <LoginForm />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
