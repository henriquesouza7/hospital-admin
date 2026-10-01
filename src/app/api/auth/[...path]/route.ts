import { getNeonAuth } from "@/lib/neon/auth-server";

type AuthRouteContext = Readonly<{
  params: Promise<{ path: string[] }>;
}>;

export async function GET(request: Request, context: AuthRouteContext) {
  return getNeonAuth().handler().GET(request, context);
}

export async function POST(request: Request, context: AuthRouteContext) {
  return getNeonAuth().handler().POST(request, context);
}

export async function PUT(request: Request, context: AuthRouteContext) {
  return getNeonAuth().handler().PUT(request, context);
}

export async function DELETE(request: Request, context: AuthRouteContext) {
  return getNeonAuth().handler().DELETE(request, context);
}

export async function PATCH(request: Request, context: AuthRouteContext) {
  return getNeonAuth().handler().PATCH(request, context);
}
