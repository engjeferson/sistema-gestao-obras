import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function RootPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  if (session.user.role === "OBRA") {
    redirect("/campo/obras");
  }
  redirect("/dashboard");
}
