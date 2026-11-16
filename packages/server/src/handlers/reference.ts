import { Reference } from "@qronos-ai/core/reference"
import { HttpApiBuilder } from "effect/unstable/httpapi"
import { Api } from "../api"
import { response } from "../location"
import { reconcile } from "../qronos/reference-reconciler" // qronos_change

export const ReferenceHandler = HttpApiBuilder.group(Api, "server.reference", (handlers) =>
  handlers.handle("reference.list", () =>
    response(reconcile(Reference.Service.use((reference) => reference.list()))), // qronos_change
  ),
)
