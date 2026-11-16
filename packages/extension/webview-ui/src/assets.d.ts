declare module "*.svg" {
  const src: string
  export default src
}

declare module "*.css"
declare module "@qronos-ai/ui-kit/styles"

declare module "*?worker&url" {
  const src: string
  export default src
}
