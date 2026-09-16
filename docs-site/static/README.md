# Static assets

Everything here is copied verbatim into `assets/` by `build.py`.

`favicon.ico`, `favicon-32.png` and `apple-touch-icon.png` are generated from
`assets/logo-white.png` in the DeepSpeed design system (Claude Design project
`4229d643-2d9f-455b-ace0-1401aade4dcc`) — the lion mascot, white on the brand
black `#0A0A0B`.

The favicon is the one place the mascot is allowed below 64px; the design
system's rule is that the lion is a logo, not a UI icon, so it does not appear
in the header. The header carries the wordmark instead.

At 16-48px the hairline artwork averages away, so those sizes use a filled
mane with the linework knocked back out. The 180px home-screen icon uses the
original linework unchanged.

To regenerate after a logo change, re-export `logo-white.png` and re-run the
snippet recorded in the commit that added these files.
