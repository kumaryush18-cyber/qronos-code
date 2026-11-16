export const Npm = {
  name: "@qronos-ai/cli",
  path: "@qronos%2fcli",
}

export const Brew = {
  name: "qronos",
  tap: "Qronos-Org/tap",
  formula: "Qronos-Org/tap/qronos",
  api: "https://formulae.brew.sh/api/formula/qronos.json",
}

export const Choco = {
  name: "qronos",
  api: "https://community.chocolatey.org/api/v2/Packages?$filter=Id%20eq%20%27qronos%27%20and%20IsLatestVersion&$select=Version",
}

export const Scoop = {
  name: "qronos",
  manifest: "https://raw.githubusercontent.com/ScoopInstaller/Main/master/bucket/qronos.json",
}

export const Release = {
  install: "https://qronos.me/cli/install",
}
