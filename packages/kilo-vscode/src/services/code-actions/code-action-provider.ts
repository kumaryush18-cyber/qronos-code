import * as vscode from "vscode"

export class KiloCodeActionProvider implements vscode.CodeActionProvider {
  static readonly metadata: vscode.CodeActionProviderMetadata = {
    providedCodeActionKinds: [vscode.CodeActionKind.QuickFix, vscode.CodeActionKind.RefactorRewrite],
  }

  provideCodeActions(
    document: vscode.TextDocument,
    range: vscode.Range | vscode.Selection,
    context: vscode.CodeActionContext,
  ): vscode.CodeAction[] {
    if (range.isEmpty) return []

    const actions: vscode.CodeAction[] = []

    const add = new vscode.CodeAction("Add to Qronos Code", vscode.CodeActionKind.RefactorRewrite)
    add.command = { command: "qronos-code.new.addToContext", title: "Add to Qronos Code" }
    actions.push(add)

    const hasDiagnostics = context.diagnostics.length > 0

    if (hasDiagnostics) {
      const fix = new vscode.CodeAction("Fix with Qronos Code", vscode.CodeActionKind.QuickFix)
      fix.command = { command: "qronos-code.new.fixCode", title: "Fix with Qronos Code" }
      fix.isPreferred = true
      actions.push(fix)
    }

    if (!hasDiagnostics) {
      const explain = new vscode.CodeAction("Explain with Qronos Code", vscode.CodeActionKind.RefactorRewrite)
      explain.command = { command: "qronos-code.new.explainCode", title: "Explain with Qronos Code" }
      actions.push(explain)

      const improve = new vscode.CodeAction("Improve with Qronos Code", vscode.CodeActionKind.RefactorRewrite)
      improve.command = { command: "qronos-code.new.improveCode", title: "Improve with Qronos Code" }
      actions.push(improve)
    }

    return actions
  }
}
