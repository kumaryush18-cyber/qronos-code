import { BackgroundProcess } from "@/qronos/background-process"
import { SessionID } from "@/session/schema"
import { Effect } from "effect"

export namespace QronosTaskBackgroundProcess {
  export function finish(sessionID: SessionID) {
    return Effect.promise(() => BackgroundProcess.stopSession(sessionID)).pipe(Effect.ignore)
  }
}
