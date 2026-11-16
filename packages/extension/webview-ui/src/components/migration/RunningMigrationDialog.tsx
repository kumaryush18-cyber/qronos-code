import type { Component } from "solid-js"
import { Dialog } from "@qronos-ai/ui-kit/dialog"
import { Button } from "@qronos-ai/ui-kit/button"
import { useDialog } from "@qronos-ai/ui-kit/context/dialog"
import { useLanguage } from "../../context/language"

interface RunningMigrationDialogProps {
  onConfirm: () => void
}

const RunningMigrationDialog: Component<RunningMigrationDialogProps> = (props) => {
  const dialog = useDialog()
  const language = useLanguage()

  return (
    <Dialog title={language.t("migration.running.title")} fit>
      <div class="dialog-confirm-body">
        <p>{language.t("migration.running.description.line1")}</p>
        <p>{language.t("migration.running.description.line2")}</p>
        <div class="dialog-confirm-actions">
          <Button variant="secondary" size="large" onClick={() => dialog.close()}>
            {language.t("migration.running.stay")}
          </Button>
          <Button
            variant="primary"
            size="large"
            onClick={() => {
              props.onConfirm()
              dialog.close()
            }}
          >
            {language.t("migration.running.proceed")}
          </Button>
        </div>
      </div>
    </Dialog>
  )
}

export default RunningMigrationDialog
