export const AulaConstants = {
  wiredVendorId: 0x0c45,
  wiredProductId: 0x800a,
  dongleVendorId: 0x05ac,
  dongleProductId: 0x024f,

  wiredCommandUsagePage: 0xff13,
  wiredRawUsagePage: 0xff68,
  wirelessCommandUsagePage: 0xff59,
  wirelessRawUsagePage: 0xff60,
  vendorUsage: 0x61,

  commandLength: 64,
  ackLength: 128,
  displayWidth: 128,
  displayHeight: 128,
  headerLength: 256,
  frameBytes: 128 * 128 * 2,
  chunkLength: 4096,
  maxFrames: 255,
} as const
