import { getClientFor } from "@/server/clients";
import { errorResponse, json } from "@/server/http";
import { userFromRequest } from "@/server/request-user";
import { UNAUTHENTICATED } from "@/server/session";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const actor = userFromRequest(request);

  if (!actor) {
    return errorResponse({ status: 401, ...UNAUTHENTICATED });
  }

  const { id } = await params;
  const result = getClientFor(actor, id);

  if (!result.ok) {
    return errorResponse(result);
  }

  return json({ client: result.client });
}
