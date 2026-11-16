import { Effect } from "effect"
import type { DatabaseMigration } from "../migration"

export default {
  id: "20260903104806_qronos_board_reset",
  up(tx) {
    return Effect.gen(function* () {
      // qronos_change start
      yield* tx.run(`ALTER TABLE \`qronos_board\` ADD \`cleared_seq\` integer DEFAULT 0 NOT NULL;`)
      // qronos_change end
    })
  },
} satisfies DatabaseMigration.Migration
