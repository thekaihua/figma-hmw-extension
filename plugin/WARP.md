# Plugin guidance

The plugin is a renderer for agent-produced HMW idea specs. It runs in Figma Design only.

```bash
# Install once from the repository root, then in plugin/:
npm test
npm run typecheck
npm run build
npm run watch
```

`src/code.ts` runs in the Figma sandbox. It validates messages through the injectable shared validator, serializes renders to prevent placement races, and sends a reply even after failure. `render_ideas` and local `paste_json` go through the same rendering path. `status` returns file and page names. Never access browser/network APIs here.

`src/core/plan.ts` converts the spec into plain frame/text/rectangle primitives. Wireframe paints must be greyscale. `src/core/grid.ts` places at most four idea columns per row and places a batch to the right of existing page bounds. Keep these modules pure and Node-testable.

`src/render/apply.ts` loads Inter Regular and Bold before setting characters, then applies width-constrained auto layout with automatic text height. `ideaCard.ts` preserves the original colored approach tags; that palette is separate from wireframes. `section.ts` creates one Section per HMW, measures actual rendered columns before placement, cleans up partial output on failure, and scrolls to the Section. Reparent newly created nodes immediately so cleanup removes the entire batch. Keep existing content intact.

`src/ui/connection.ts` owns the WebSocket factory port, reconnect backoff, pairing form, UI statuses, run log, and clipboard/Paste JSON controls. Require a user-entered token before opening a socket; send it only as the first `{type:'pair',token}` message and wait for `{type:'paired'}` before forwarding commands or showing connected. Keep the token only in the open connection's memory, clear the input after submission, and never persist it, put it in URLs, send it to the sandbox, or include it in run logs. Pairing rejection clears a stale token and pauses reconnects until the user enters a new one. Socket replies must retain the request ID and return only to the socket that originated the request. Local Paste JSON replies must never leak into the bridge. Listen only to `parent` window messages. User content must be inserted with `textContent`, never interpolated into HTML.

`src/ui/ui.html` is presentation only. Keep status, setup commands, the password-style pairing input, Paste JSON and recent runs accessible in Figma's light/dark themes. No remote assets, analytics, or AI-provider calls.

`build.js` uses esbuild to bundle `connection.ts`, inline the script into `ui.html`, and inject that HTML into `code.ts`. Both `dist/code.js` and `dist/ui.html` are generated. All sandbox dependencies must be bundled. Zod uses interpreted validation; do not enable dynamic evaluation. The build smoke test runs the actual bundle with dynamic code generation disabled.

Import `manifest.json` through Figma Desktop's development-plugin menu after building. Network access is restricted to `ws://localhost:3055`; the bridge listens on IPv4 loopback. Actual Figma checks are listed in [../docs/manual-verification.md](../docs/manual-verification.md).
