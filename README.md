# HMW Diverger

Explore distinctly different answers to a “How Might We” question inside Figma. Your Claude Code or Codex agent does the ideation; this plugin draws rough, editable wireframes and an idea card for each direction. Each batch lives in one Section beside your existing work.

```text
Claude Code / Codex → stdio MCP → local bridge → WebSocket → plugin UI → Figma nodes
```

The plugin and bridge do not call an AI provider, require an API key, or use Figma’s official MCP. Use your agent with an account that includes access; its usual account policies and usage limits apply. The plugin never reads the current selection. Only the HMW is needed for ideation.

## Run from source

Requires Node.js **22.12+**, npm, Figma Desktop, and Claude Code or Codex configured with your account.

```bash
npm install
npm run build
```

1. In Figma Desktop, choose **Plugins → Development → Import plugin from manifest…** and select `plugin/manifest.json`.
2. Run **HMW Diverger** in a Figma Design file. Keep its window open; the initial status is **Pair bridge**.
3. From the repository root, register the built bridge with **one** agent:

```bash
claude mcp add hmw-diverger-dev -- node "$(pwd)/bridge/dist/index.js"
# Or:
codex mcp add hmw-diverger-dev -- node "$(pwd)/bridge/dist/index.js"
```

Restart the agent session so it launches the MCP server. Ask it to call `figma_status` with `includePairingToken: true` and show you the private pairing token. Paste that token into **Pair this bridge** in the plugin and click **Pair bridge**. The pill becomes **Bridge connected** only after authentication. A normal `figma_status` call then returns the connected file and page without including the token. Then ask:

> Diverge on “HMW help first-time users set up a budget” with 6 distinctly different ideas in Figma. Use HMW Diverger.

The agent can also use the MCP prompt `diverge(hmw, count)`, with 1–15 ideas (default 6). It should finish with **one `render_ideas` call for the entire batch**.

The bridge belongs to the agent process. You do not need to run another server in a terminal. Only one agent session can own port 3055 at a time. Each bridge start generates a new pairing token. The plugin keeps it in memory while its window is open and uses it for reconnects. Pair again after restarting the bridge or reopening the plugin. Keep the token out of idea specs, URLs, files, and run logs.

A newly **paired** plugin replaces the previous plugin connection, so renders target the most recently paired window. Unpaired connections cannot replace a live plugin or receive agent requests. The replaced window pauses reconnecting; use **Connect this window** to make it active again using its in-memory token.

These commands follow the official [Claude Code MCP instructions](https://code.claude.com/docs/en/mcp) and [Codex MCP instructions](https://learn.chatgpt.com/docs/extend/mcp?surface=app).

## Install a published bridge

The npm package is named `hmw-diverger-mcp`. **It is not published by this source change**; use the source commands above until a release is available. Once published:

```bash
claude mcp add hmw-diverger -- npx -y hmw-diverger-mcp
codex mcp add hmw-diverger -- npx -y hmw-diverger-mcp
```

Choose the command for your agent. Do not enable both servers concurrently.

## What gets drawn

- 1–15 ideas per batch, at most four columns per row.
- A colored approach tag, title, rationale, and Figma Make prompt on each idea card.
- 1–3 greyscale wireframe screens per idea, stacked under its card. Mobile, tablet, and desktop widths are 375, 768, and 1280px; height follows the contents.
- Editable frames, rectangles, and text with auto layout. Images and unsupported node types become labeled placeholders.

Paste the card’s Make prompt into Figma Make when you want to develop a direction. This version supports Figma Design only; selection context, refinement commands, FigJam, and additional ideation modes are outside its scope.

## Paste JSON

Open **Paste JSON instead** in the plugin and paste [docs/example-ideas.json](docs/example-ideas.json). It uses the same validation and renderer as the agent and works without the bridge.

`render_ideas` takes `{ "hmw": "…", "ideas": [...] }`. Each idea requires `title`, `approach`, `rationale`, `makePrompt`, and `screens`. Approach is `mobile`, `web`, `dashboard`, `onboarding`, or `feature`. Each screen requires `name`, `platform` (`mobile|tablet|desktop`), and a `root` node.

| Node type | Required fields | Optional fields |
| --- | --- | --- |
| `stack` | `children` | `direction` (`vertical|horizontal`), `gap`, `padding` |
| `text`, `note` | `text` | |
| `button`, `image`, `navbar`, `chip`, `avatar` | `label` | |
| `input` | `label` | `placeholder` |
| `card` | `label`, `children` | |
| `list`, `tabbar` | `items` (strings) | |
| `toggle` | `label` | `checked` |
| `divider` | | |
| `chart` | `label`, `values` (numbers 0–100) | |

Unknown `type` strings are accepted and marked for fallback rendering. Nodes can nest up to six levels, with at most 40 children per node, 20 list items/chart values, and 600 wireframe nodes in a batch. Validation errors identify the field, for example `ideas[2].screens[0].root.children[1].label`. The shared schema in `shared/spec.ts` is authoritative.

## Development and verification

```bash
npm test                 # Bridge and plugin tests
npm run typecheck        # Both packages, including tests
npm run build            # Both production bundles
npm run watch --workspace plugin
```

You can also run `npm test` and `npm run build` inside `bridge/` or `plugin/`. Install dependencies from the repository root; the npm workspaces share one lockfile. The plugin watch command rebuilds both the sandbox bundle and inline UI after source or shared-schema edits. Reopen the plugin in Figma after building; restart the agent after bridge changes.

```text
shared/                 Zod schema, message contract, test fixtures
bridge/src/relay.ts     Loopback WebSocket relay, correlated requests, timeouts
bridge/src/tools.ts     MCP tools and diverge prompt
bridge/src/index.ts     stdio entry point
plugin/src/core/        Pure wireframe planning and grid placement
plugin/src/render/      Thin Figma applier, idea cards, Section rendering
plugin/src/code.ts      Validated and serialized message routing
plugin/src/ui/          Reconnecting transport and setup/Paste JSON UI
bridge/test/            Schema, relay, MCP client, and end-to-end contract tests
plugin/test/            Pure core, fake Figma, router, transport, bundled sandbox smoke test
```

Automated tests exercise real WebSockets and MCP clients, a small fake Figma API, fake timers, and the built bundle in a VM with dynamic evaluation disabled. Zod uses interpreted validation for sandbox compatibility. Actual Figma layout, host networking, and Community review still require the [manual acceptance checks](docs/manual-verification.md). Publication copy and disclosures are in [docs/community-listing.md](docs/community-listing.md).

## Troubleshooting

| Symptom | What to check |
| --- | --- |
| Waiting for bridge | Register the built bridge, restart the agent, and keep the plugin open. Use the local source command until npm publication. |
| Pair bridge | Ask the agent for `figma_status({includePairingToken:true})`, then paste the current token into the plugin. The token changes when the bridge restarts. |
| Port 3055 in use | Close the other agent session using HMW Diverger and restart this session. Do not launch a standalone bridge alongside the MCP server. |
| Wrong file receives ideas | A second paired plugin replaces the first. Use **Connect this window** in the intended window, or reopen it and pair it again. |
| Validation error | Correct the field at the reported path and resend the full batch. |
| Request timed out | Inspect the canvas and plugin before retrying. A timed-out render may have completed; retrying can create another Section. |
| Fonts or rendering fail | The plugin reports the error and removes partial output. Reopen the plugin and retry. |
| Network access blocked | Reimport the current manifest and use Figma Desktop. It permits only `ws://localhost:3055`. |

## Data flow

The local bridge binds to `127.0.0.1:3055` and accepts only absent or opaque (`null`) Origins, rejecting ordinary website Origins. Origin checks alone cannot identify the plugin: sandboxed websites can also use `null`. Every socket must authenticate in its first message using a random 256-bit session token before receiving requests, returning tool replies, or replacing an active plugin. Invalid or silent pairing attempts are closed. The token is available only through an explicit request to the stdio MCP tool, never from the WebSocket endpoint.

The plugin connects using `ws://localhost:3055`, sends the token in its first message, and waits for a pairing acknowledgment before forwarding commands to Figma. It sends file/page names for status and node IDs/counts for rendering replies, and receives the generated spec. Tokens stay in bridge/plugin memory and are excluded from URLs and run logs. Neither component stores prompts on disk or adds analytics; the UI keeps only eight recent results in memory. Your chosen agent/provider handles its conversation, including any pairing token you ask it to display, and created nodes are saved in your Figma file under its normal sharing settings.

## License

MIT. See [LICENSE](LICENSE).
