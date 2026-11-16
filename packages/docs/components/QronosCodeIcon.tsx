import React from "react"
import { Icon } from "./Icon"

interface QronosCodeIconProps {
  size?: string
}

export function QronosCodeIcon({ size = "1.2em" }: QronosCodeIconProps) {
  return <Icon src="/docs/img/qronos-v1.svg" srcDark="/docs/img/qronos-v1-white.svg" alt="Qronos Code Icon" size={size} />
}
