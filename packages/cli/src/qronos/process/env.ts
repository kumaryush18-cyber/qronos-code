export function model(extra?: NodeJS.ProcessEnv | null): Record<string, string> {
  const env = Object.fromEntries(
    Object.entries({ ...process.env, ...(extra ?? {}) }).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string",
    ),
  )
  delete env.QRONOS_SERVER_PASSWORD
  delete env.QRONOS_SERVER_USERNAME
  delete env.QRONOS_BROWSER_BROKER_URL
  delete env.QRONOS_BROWSER_BROKER_TOKEN
  delete env.QRONOS_CONFIG
  delete env.QRONOS_CONFIG_CONTENT
  delete env.QRONOS_CONFIG_DIR
  return env
}
