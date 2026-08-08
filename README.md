# Aula F75 Max Web

A browser-based configurator for the EpoMaker x Aula F75 Max keyboard — RGB lighting, performance settings, key restrictions (disable Windows key / Alt+F4 / Alt+Tab), display image/GIF upload, clock sync, and factory reset, all from a web page. No install, no backend: it talks to the keyboard directly over USB using [WebHID](https://developer.mozilla.org/en-US/docs/Web/API/WebHID_API).

Ported from the native [Aula F75 Max Driver](https://github.com/VitalyArt/Aula-F75-Max-Driver) project (macOS/Linux/Android).

## Requirements

- A Chromium-based browser: Chrome, Edge, Opera, or Brave on desktop. WebHID isn't available in Firefox or Safari yet.
- The Aula F75 Max keyboard, its 2.4G receiver, or both.

### Linux

The browser needs OS-level permission to open the keyboard's raw HID device. Install this udev rule, then unplug and replug the keyboard/receiver:

```sh
sudo tee /etc/udev/rules.d/60-aula-f75-max.rules <<'EOF'
SUBSYSTEM=="hidraw", ATTRS{idVendor}=="0c45", ATTRS{idProduct}=="800a", MODE="0666", TAG+="uaccess"
SUBSYSTEM=="hidraw", ATTRS{idVendor}=="05ac", ATTRS{idProduct}=="024f", MODE="0666", TAG+="uaccess"
EOF
sudo udevadm control --reload-rules
sudo udevadm trigger
```

## Development

```sh
npm install
npm run dev      # dev server
npm run test     # protocol-layer unit tests
npm run build    # production build to dist/
npm run lint     # oxlint
```

No physical keyboard required for UI development — click "Try demo mode" on the connect screen to use a simulated device.

## Architecture

- `src/lib/protocol/` — hardware-free port of the native driver's packet builders and checksum logic, unit tested against the Swift source's known byte layouts.
- `src/lib/webhid/` — `navigator.hid` transport: device selection, the wired keyboard's Feature-report command exchange, the receiver's Output-report + ack pattern, and the chunked display-upload state machine.
- `src/lib/mock/` — simulated devices satisfying the same interface as `lib/webhid`, powering demo mode.
- `src/lib/display/` — image/GIF decoding (Canvas + [gifuct-js](https://github.com/matt-way/gifuct-js)) and RGB565 fit-mode scaling for the 128×128 display.
- `src/components/`, `src/state/` — the React UI and connection state.

## Deployment

Pushes to `main` build and publish to GitHub Pages via `.github/workflows/deploy.yml`. Enable Pages for the repo under Settings → Pages → Source: GitHub Actions.

## Known limitations vs. the native app

- **No background battery polling.** The native app polls every 5 minutes and notifies even when unfocused; this app only polls while its tab is open.
- **First connection needs a click.** Browsers require a user gesture to grant device access; reconnecting after a replug works automatically once granted.
- **Nothing leaves your browser.** All communication is direct USB HID between your browser and the keyboard — there's no server component and no telemetry.
