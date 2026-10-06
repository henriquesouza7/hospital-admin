import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin-shell";
import { hasAdminRole } from "@/lib/auth/roles";
import { getNeonAuth } from "@/lib/neon/auth-server";

export const dynamic = "force-dynamic";

type AdminLayoutProps = Readonly<{ children: React.ReactNode }>;

export default async function AdminLayout({ children }: AdminLayoutProps) {
  let session: { user?: unknown } | null | undefined;

  try {
    ({ data: session } = await getNeonAuth().getSession());
  } catch {
    redirect("/login?error=configuration");
  }

  if (!session?.user) {
    redirect("/login");
  }

  if (!hasAdminRole(session.user)) {
    redirect("/login?error=forbidden");
  }

  return <AdminShell>{children}</AdminShell>;
}
