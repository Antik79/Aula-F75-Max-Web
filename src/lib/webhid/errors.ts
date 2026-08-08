export const LINUX_UDEV_RULE = `SUBSYSTEM=="hidraw", ATTRS{idVendor}=="0c45", ATTRS{idProduct}=="800a", MODE="0666", TAG+="uaccess"
SUBSYSTEM=="hidraw", ATTRS{idVendor}=="05ac", ATTRS{idProduct}=="024f", MODE="0666", TAG+="uaccess"`

export type AulaHidErrorKind = 'unsupported-browser' | 'no-device-selected' | 'endpoint-not-found' | 'open-failed'

export class AulaHidError extends Error {
  readonly kind: AulaHidErrorKind

  constructor(kind: AulaHidErrorKind, message: string, options?: { cause?: unknown }) {
    super(message, options)
    this.name = 'AulaHidError'
    this.kind = kind
  }
}
