/**
 * Application-wide constants.
 *
 * Keep every tunable "magic" value here so seeding stays deterministic and the
 * numbers that tests and runtime share have a single source of truth.
 */

/** Fixed `createdAt` for every seeded user — keeps the seed reproducible. */
export const USER_SEEDED_AT = "2026-01-15T09:00:00.000Z";

/** Faker seed so generated clients are identical on every boot. */
export const CLIENT_SEED = 20261117;

/** How many clients to generate at startup (the spec requires > 1000). */
export const CLIENT_COUNT = 1200;

/** Share of generated clients flagged as churned (0..1). */
export const CLIENT_CHURNED_SHARE = 0.3;

/** Name of the httpOnly cookie that carries the opaque session id. */
export const SESSION_COOKIE = "session";
