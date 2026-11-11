# hmw-diverger-mcp

Local stdio MCP server connecting Claude Code or Codex to the **HMW Diverger** Figma plugin. Your agent generates the ideas; this bridge relays one batch to the plugin over a loopback WebSocket. No API key or Figma official MCP is required.

Requires Node.js 22.12+, Figma Desktop with the plugin open, and an agent account with access. The source and plugin setup are in the [project README](https://github.com/thekaihua/figma-hmw-extension#readme).

After this package is published, register it with one agent:

```bash
claude mcp add hmw-diverger -- npx -y hmw-diverger-mcp
# Or:
codex mcp add hmw-diverger -- npx -y hmw-diverger-mcp
```

For an unpublished source build, replace `npx -y hmw-diverger-mcp` with `node /absolute/path/bridge/dist/index.js`. Restart the agent after registration. Do not run a second standalone bridge.

To pair, ask your agent to call `figma_status({includePairingToken:true})` and show the private token. Enter it in the plugin's **Pair this bridge** form. A normal `figma_status` reports the paired file/page and omits the token; `render_ideas({hmw, ideas})` renders 1–15 ideas, each with 1–3 editable wireframe screens, and returns Section/card/screen IDs. The `diverge(hmw, count)` prompt asks for distinct concepts and one render call for the whole batch, after pairing.

The server binds to `127.0.0.1:3055`. Ordinary website Origins are refused; absent or `null` Origins are allowed to attempt pairing. Origin is not authentication. Every socket must prove possession of the random 256-bit session token in its first message before it can receive requests, return replies, or replace a live plugin. Invalid or silent candidates are closed. The token is returned only by an explicit request over stdio MCP, never over WebSocket. It changes on bridge restart and stays only in memory in the bridge and open plugin UI; pair again after restarting the bridge or reopening the UI. Keep it out of specs, files, URLs and run logs.

Only one agent session can own the port. A newly paired plugin replaces the old one. Rendering errors, disconnects and timeouts are reported as tool errors. Check the canvas before retrying a timeout; the original render may have completed.

Neither bridge nor plugin stores prompts on disk or adds analytics. Status replies expose file/page names and render replies expose node IDs/counts to your agent. Your AI conversation is handled by the agent/provider, and rendered content is stored in the Figma file. MIT licensed.
