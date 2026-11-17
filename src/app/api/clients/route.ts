import { listClients } from "@/server/clients";
import { errorResponse, json } from "@/server/http";
import { userFromRequest } from "@/server/request-user";
import { UNAUTHENTICATED } from "@/server/session";

// Clients are read-only business data: the task never asks to create, edit or
// deactivate them, so this route exposes only GET (one server-side page).
export async function GET(request: Request): Promise<Response> {
  const actor = userFromRequest(request);

  if (!actor) {
    return errorResponse({ status: 401, ...UNAUTHENTICATED });
  }

  const params = new URL(request.url).searchParams;
  const result = listClients(
    actor,
    Number(params.get("page")),
    Number(params.get("limit")),
  );

  if (!result.ok) {
    return errorResponse(result);
  }

  return json(result.page);
}
