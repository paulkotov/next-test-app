import { errorResponse, json } from "@/server/http";
import { userFromRequest } from "@/server/request-user";
import { UNAUTHENTICATED } from "@/server/session";
import { parseUpdateUserPatch } from "@/server/user-input";
import { updateUserAccount } from "@/server/users";

const BAD_REQUEST = {
  status: 400,
  code: "BAD_REQUEST",
  message: "Request body is invalid.",
};

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const actor = userFromRequest(request);

  if (!actor) {
    return errorResponse({ status: 401, ...UNAUTHENTICATED });
  }

  const body: unknown = await request.json().catch(() => null);
  const patch = parseUpdateUserPatch(body);

  if (!patch) {
    return errorResponse(BAD_REQUEST);
  }

  const { id } = await params;
  const result = updateUserAccount(actor, id, patch);

  if (!result.ok) {
    return errorResponse(result);
  }

  return json({ user: result.user });
}
