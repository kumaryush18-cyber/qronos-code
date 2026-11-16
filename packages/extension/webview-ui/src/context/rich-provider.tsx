import { createContext, onCleanup, onMount, useContext, type ParentComponent } from "solid-js"
import { MarkedProvider } from "@qronos-ai/ui-kit/context/marked"
import { CodeComponentProvider } from "@qronos-ai/ui-kit/context/code"
import { DiffComponentProvider } from "@qronos-ai/ui-kit/context/diff"
import { FileComponentProvider } from "@qronos-ai/ui-kit/context/file"
import { Code } from "@qronos-ai/ui-kit/code"
import { Diff } from "@qronos-ai/ui-kit/diff"
import { File } from "@qronos-ai/ui-kit/file"
import { useVSCode } from "./vscode"

const Context = createContext(false)

export const RichProvider: ParentComponent = (props) => {
  if (useContext(Context)) return props.children
  const vscode = useVSCode()
  onMount(() => {
    const save = (event: Event) => {
      const detail = (event as CustomEvent<{ dataUrl: string; filename: string }>).detail
      if (!detail?.dataUrl || !detail.filename) return
      event.preventDefault()
      vscode.postMessage({ type: "saveImage", dataUrl: detail.dataUrl, filename: detail.filename })
    }
    window.addEventListener("qronos:save-image", save)
    onCleanup(() => window.removeEventListener("qronos:save-image", save))
  })

  return (
    <Context.Provider value={true}>
      <MarkedProvider>
        <DiffComponentProvider component={Diff}>
          <CodeComponentProvider component={Code}>
            <FileComponentProvider component={File}>{props.children}</FileComponentProvider>
          </CodeComponentProvider>
        </DiffComponentProvider>
      </MarkedProvider>
    </Context.Provider>
  )
}
