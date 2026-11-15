# Aula F75 Max Web

A browser-based configurator for the EpoMaker x Aula F75 Max keyboard — RGB lighting with a live animated preview and saved profiles, performance settings, key restrictions (disable Windows key / Alt+F4 / Alt+Tab), display image/GIF upload, clock sync, factory reset, and an offline Fn-shortcut guide, all from a web page. No install, no backend: it talks to the keyboard directly over USB using [WebHID](https://developer.mozilla.org/en-US/docs/Web/API/WebHID_API).

Ported from the native [Aula F75 Max Driver](https://github.com/VitalyArt/Aula-F75-Max-Driver) project (macOS/Linux/Android).

## Github Pages

If you just want to configure your keyboard, simply head over to https://antik79.github.io/Aula-F75-Max-Web.  Linux users must install udev rules or it will not work. Check below for more information.

## Features

- **RGB lighting** (2.4G receiver) — all 20 firmware effects with color, brightness, speed, and direction. An animated keyboard preview shows roughly what each effect looks like, and you can save, rename, and reload lighting **profiles**.
- **Performance** (2.4G receiver) — response level, sleep timeout, and key restrictions (Windows key, Alt+F4, Alt+Tab).
- **Battery** (2.4G receiver) — level indicator with a low-battery notification while the tab is open.
- **Display** (USB cable) — upload a PNG, JPEG, GIF (animated), BMP, or WebP to the 128×128 screen; sync the keyboard clock; factory reset.
- **Keyboard guide** — Fn shortcuts for pairing, backlight, media/F-row (Windows and Mac modes), and extra keys. Works without a keyboard connected, from the connect screen or the Guide tab.
- **Activity log** — what the page sent to the keyboard and how it went (timings, retries, errors). Open it from the sidebar or the connect screen and use **Copy log** to paste it into a bug report.

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
- `src/lib/lighting/` — effect renderer, F75 Max keyboard layout, and profile logic behind the RGB preview (ported from the native driver's `LightingEffectRenderer`, `KeyboardLayout`, and `LightingProfileStore`).
- `src/lib/activity/` — the in-memory activity log and the wrappers that log each device operation.
- `src/lib/guide/` — the keyboard guide's shortcut catalog (from the native driver's `docs/keyboard-guide/catalog.json`).
- `src/lib/display/` — image/GIF decoding (Canvas + [gifuct-js](https://github.com/matt-way/gifuct-js)) and RGB565 fit-mode scaling for the 128×128 display.
- `src/components/`, `src/state/` — the React UI and connection state.

## Deployment

Pushes to `main` build and publish to GitHub Pages via `.github/workflows/deploy.yml`. Enable Pages for the repo under Settings → Pages → Source: GitHub Actions.

## Known limitations vs. the native app

- **No background battery polling.** The native app polls every 5 minutes and notifies even when unfocused; this app only polls while its tab is open.
- **First connection needs a click.** Browsers require a user gesture to grant device access; reconnecting after a replug works automatically once granted.
- **Profiles live in this browser.** They're stored in localStorage (the keyboard has no profile slots), so they don't sync between browsers or machines, and clearing site data removes them.
- **The lighting preview is an approximation.** There's no command to read the keyboard's actual animation back.
- **Keep the tab in front during long wired operations.** Each wired command waits for the keyboard's ready signal; Chrome throttles timers in background tabs, which can make a factory reset take much longer if you switch away.
- **Nothing leaves your browser.** All communication is direct USB HID between your browser and the keyboard — there's no server component and no telemetry. The activity log is kept in memory only and is cleared on reload; it leaves the page only if you copy it.
