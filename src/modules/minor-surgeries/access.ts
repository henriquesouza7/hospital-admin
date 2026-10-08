import "server-only";

import { redirect } from "next/navigation";
import { hasAdminRole } from "@/lib/auth/roles";
import { getNeonAuth } from "@/lib/neon/auth-server";

export async function requireMinorSurgeriesAdmin() {
  try {
    const { data } = await getNeonAuth().getSession();
    if (data?.user && hasAdminRole(data.user)) return data.user;
  } catch {
    redirect("/login?error=configuration");
  }
  redirect("/login?error=forbidden");
}
