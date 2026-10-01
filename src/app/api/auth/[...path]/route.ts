import { getNeonAuth } from "@/lib/neon/auth-server";

type AuthHandler = ReturnType<ReturnType<typeof getNeonAuth>["handler"]>;

const getAuthHandler = () => getNeonAuth().handler();

export const GET: AuthHandler["GET"] = (...args) =>
  getAuthHandler().GET(...args);

export const POST: AuthHandler["POST"] = (...args) =>
  getAuthHandler().POST(...args);
