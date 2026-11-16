import { Auth } from "@/auth"
import { CloudAuth } from "@/qronos/cloud/auth"
import { createBearerHttpClient } from "@/qronos/cloud/http"
import { resolveQronosApiOrigin } from "@/qronos/cloud/origin"
import { readBoundedJson } from "@/qronos/cloud/response-json"
import { Effect, Redacted, Schema } from "effect"
import z from "zod"

/**
 * The authenticated principal behind the same bearer the Cloud dispatch uses.
 *
 * `GET /api/profile` returns a Qronos `user.id` that is not a UUID (OAuth ids
 * look like `oauth/...`). The auth type (`api`, `oauth`, `wellknown`) and the
 * OAuth `accountId` are not the identity: `accountId` is an organization.
 *
 * Every failure mode — no credentials, an unreachable API, a non-2xx, a body
 * without a usable `user.id` — fails closed so an intent is never bound to a
 * guessed principal.
 */
export namespace ProfileIdentity {
  export class Failure extends Schema.TaggedErrorClass<Failure>()("ProfileIdentityError", {
    kind: Schema.Literals(["signed_out", "unavailable", "invalid"]),
    message: Schema.String,
  }) {}

  const Body = z.object({ user: z.object({ id: z.string().min(1) }) })

  const fail = (kind: Failure["kind"], message: string) => new Failure({ kind, message })

  export const read = Effect.fn("ProfileIdentity.read")(function* (
    env: CloudAuth.Environment = process.env,
    pinned?: Redacted.Redacted,
  ) {
    // Use the caller's bearer when supplied so the principal is read with the
    // exact credential the Cloud dispatch will use.
    const token =
      pinned ??
      (yield* CloudAuth.token(env).pipe(
        Effect.catchTag("CloudAuthResolutionError", (error) =>
          Effect.fail(
            error.kind === "missing"
              ? fail("signed_out", error.message)
              : fail("unavailable", "Qronos credentials could not be read"),
          ),
        ),
      ))
    const origin = yield* Effect.try({
      try: () => resolveQronosApiOrigin(env),
      catch: () => fail("invalid", "Qronos API base URL is invalid"),
    })
    const response = yield* Effect.tryPromise({
      try: () =>
        createBearerHttpClient({ origin, apiKey: Redacted.value(token) }).request({
          method: "GET",
          path: "/api/profile",
          headers: { accept: "application/json" },
        }),
      catch: () => fail("unavailable", "Qronos profile is unreachable"),
    })
    if (!response.ok) {
      yield* Effect.promise(() => response.body?.cancel().catch(() => undefined) ?? Promise.resolve())
      return yield* Effect.fail(
        response.status === 401 || response.status === 403
          ? fail("signed_out", "Qronos rejected these credentials")
          : fail("unavailable", "Qronos profile could not be read"),
      )
    }
    const body = yield* Effect.tryPromise({
      try: () => readBoundedJson(response),
      catch: () => fail("invalid", "Qronos profile response is invalid"),
    })
    const parsed = Body.safeParse(body)
    if (!parsed.success) return yield* Effect.fail(fail("invalid", "Qronos profile response is invalid"))
    return parsed.data.user.id
  })
}
