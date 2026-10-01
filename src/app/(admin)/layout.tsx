import { AdminShell } from "@/components/admin-shell";
import { requireAuthenticatedUser } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

type AdminLayoutProps = Readonly<{ children: React.ReactNode }>;

export default async function AdminLayout({ children }: AdminLayoutProps) {
  await requireAuthenticatedUser();

  return <AdminShell>{children}</AdminShell>;
}
