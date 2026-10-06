export function hasAdminRole(user: unknown): boolean {
  if (!user || typeof user !== "object" || !("role" in user)) {
    return false;
  }

  const { role } = user;

  return (
    typeof role === "string" &&
    role.split(",").some((value) => value.trim() === "admin")
  );
}
