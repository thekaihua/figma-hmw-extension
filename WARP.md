# Repository guidance

HMW Diverger is an npm workspace with `bridge/` (a local stdio MCP server), `plugin/` (Figma Design renderer), and `shared/` (spec and protocol). The former Express/LangChain backend has been removed. Do not reintroduce hosted AI calls or API keys; ideation happens in the user's existing Claude Code or Codex session.

From the repository root, use Node.js 22.12+ and run:

```bash
npm install
npm test
npm run typecheck
npm run build
```

Tests use Vitest in each package. Follow tests-first changes for behavior. Keep spec validation, primitive planning and placement independent of `figma`; apply nodes through the thin applier. `plugin/test/fakeFigma.ts` models only the API surface used here. Do not turn it into a general Figma implementation.

`shared/spec.ts` is imported by both packages and bundled into each production artifact. It uses Zod 4 with JIT disabled for Figma's sandbox. The bridge exports JSON Schema from the input side of that schema; validate inside the tool handler to preserve path-based `isError` messages. Unknown node types must remain valid and render placeholders.

`shared/protocol.ts` defines the first-message `{type:'pair',token}` handshake and `{type:'paired'}` acknowledgment, followed by `{id,type,payload?}` requests and `{id,ok,result|errors}` replies. Correlate replies by ID, including simultaneous requests. The bridge binds only to IPv4 loopback on 3055. Reject normal browser Origins; opaque/null and absent Origins are supported for the Figma iframe and local clients, but do not authenticate them. Require the random per-session token before activating a socket, forwarding requests/replies, or replacing a paired plugin. Close invalid and silent pairing attempts. Expose the token only through an explicit `figma_status({includePairingToken:true})` stdio call; never return it through WebSocket, put it in a URL, or persist/log it. One paired plugin replaces another; one agent session owns the port.

The bridge ships as `hmw-diverger-mcp`, with `dist/index.js` as its executable. `bridge/build.js` bundles local shared code and leaves npm dependencies external. stdout belongs exclusively to MCP; diagnostics go to stderr. `npm pack --workspace bridge --dry-run` checks the package contents. Do not publish as part of routine development.

The plugin build bundles the connection/UI script, injects it into the HTML, then bundles the sandbox code with that HTML in `__html__`. `npm run watch --workspace plugin` watches `src/` and `shared/`. Read [plugin/WARP.md](plugin/WARP.md) for rendering details.

From a source checkout, register one of:

```bash
claude mcp add hmw-diverger-dev -- node "$(pwd)/bridge/dist/index.js"
codex mcp add hmw-diverger-dev -- node "$(pwd)/bridge/dist/index.js"
```

Release commands (require npm publication):

```bash
claude mcp add hmw-diverger -- npx -y hmw-diverger-mcp
codex mcp add hmw-diverger -- npx -y hmw-diverger-mcp
```

Restart the agent after bridge changes, and rebuild/reopen the plugin after plugin changes. Ask the agent for the pairing token and enter it in the plugin. Pair again after a bridge restart or reopening the UI; automatic reconnects reuse the token only while that UI remains open. Use [docs/manual-verification.md](docs/manual-verification.md) for actual Figma checks. The automated VM smoke test is useful for sandbox regressions but does not establish host layout or networking behavior.
