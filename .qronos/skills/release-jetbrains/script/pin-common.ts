import { $ } from "bun"
import semver from "semver"

export const assets = [
  "qronos-darwin-arm64.zip",
  "qronos-darwin-x64.zip",
  "qronos-linux-arm64.tar.gz",
  "qronos-linux-x64.tar.gz",
  "qronos-windows-arm64.zip",
  "qronos-windows-x64.zip",
]

export async function latest(repo: string) {
  const list = (await $`gh release list --repo ${repo} --limit 100 --json tagName,isDraft,isPrerelease`.json()) as {
    tagName: string
    isDraft: boolean
    isPrerelease: boolean
  }[]
  return list
    .filter((item) => /^v\d+\.\d+\.\d+$/.test(item.tagName) && !item.isDraft && !item.isPrerelease)
    .map((item) => item.tagName.slice(1))
    .sort(semver.rcompare)[0] ?? null
}

export async function missing(repo: string, version: string) {
  const res = await $`gh release view ${`v${version}`} --repo ${repo} --json assets --jq ${".assets[].name"}`.quiet().nothrow()
  if (res.exitCode !== 0) return assets
  const names = res.stdout.toString().split(/\r?\n/).map((item) => item.trim()).filter(Boolean)
  return assets.filter((item) => !names.includes(item))
}
