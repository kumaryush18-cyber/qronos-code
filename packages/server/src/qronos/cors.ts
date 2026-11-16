const origin = /^https:\/\/([a-z0-9-]+\.)*qronos\.ai$/

export function corsOrigin(input: string) {
  return origin.test(input)
}
