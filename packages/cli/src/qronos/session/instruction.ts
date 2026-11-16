import { QronosMarkdown } from "../config/markdown"

export namespace QronosInstruction {
  export function content(text: string, item: string, options: QronosMarkdown.Options) {
    return QronosMarkdown.substitute(text, item, options)
  }

  export async function read(item: string, options: QronosMarkdown.Options) {
    return content(await QronosMarkdown.read(item, options), item, options)
  }
}
