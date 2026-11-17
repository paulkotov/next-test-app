import { redirect } from "next/navigation";

import { landingPathFor } from "@/domain/authz";
import { readSessionUser } from "@/server/current-user";

// Reads the session to route the visitor, so it blocks on the server.
export const instant = false;

export default async function Home() {
  const user = await readSessionUser();

  // Proxy already blocks anonymous visitors, but a cookie for a deactivated
  // account reaches here and resolves to `null`, so re-check before routing.
  redirect(user ? landingPathFor(user) : "/login");
}
