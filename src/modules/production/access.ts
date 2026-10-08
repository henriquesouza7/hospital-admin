import "server-only";

import { redirect } from "next/navigation";
import { hasAdminRole } from "@/lib/auth/roles";
import { getNeonAuth } from "@/lib/neon/auth-server";

export async function requireProductionAdmin() {
  let user: unknown;
  try {
    const { data } = await getNeonAuth().getSession();
    user = data?.user;
  } catch {
    redirect("/login?error=configuration");
  }

  if (!user || !hasAdminRole(user)) {
    redirect("/login?error=forbidden");
  }

  return user;
}
