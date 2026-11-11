# HMW Diverger — Community listing draft

## Listing description

**One question. Different directions.**

Explore answers to a How Might We question without leaving your Figma canvas. Connect your own Claude Code or Codex agent, ask for distinct ideas, and get rough, editable wireframes you can compare before choosing a direction.

Each idea includes a title, rationale, approach tag and a prompt you can bring into Figma Make. Every batch creates one Section beside your existing work, with 1–3 greyscale screens per idea. Generate up to 15 directions in a batch, or paste a JSON spec to render ideas yourself.

Requires Figma Desktop, Node.js 22.12+, the HMW Diverger local bridge, and access to Claude Code or Codex through your own account. Pair the plugin with the private session token shown by your agent. The plugin does not include an AI subscription. Your agent's account policies and limits apply. No API key is entered into the plugin, and this integration does not use Figma's official MCP.

## Listing assets

- **Icon:** export a 128×128px PNG. A simple branching mark with three rough screen outlines on a neutral background; keep it legible at small sizes. Avoid provider logos or marks implying an official affiliation.
- **Cover:** export a 1920×960px PNG. Headline “One question. Different directions.” Show one HMW Section with three visibly distinct editable wireframes and their idea cards. Add “Bring your own Claude Code or Codex agent” and “Local bridge required” in readable supporting text.
- Capture the cover from the tested plugin output. Do not present polished, generated mockups as actual plugin output. The icon/cover briefs here are not exported release assets yet.

## Data disclosure

HMW Diverger receives your HMW and generated idea specs from your local agent through a WebSocket connection to `localhost:3055`. The bridge binds only to `127.0.0.1`. It accepts opaque (`null`) or absent Origins for pairing attempts and rejects ordinary website Origins. Because sandboxed websites can also have a `null` Origin, each socket must authenticate with a random 256-bit session token in its first message before it can receive requests, return tool replies, or replace the paired plugin. Failed or silent pairing attempts are closed.

The private token is returned only when explicitly requested through your agent's stdio MCP tool (`figma_status` with `includePairingToken:true`); it is never exposed by the WebSocket endpoint. The user pastes it into the plugin, which retains it only in memory for that open window and excludes it from URLs and recent-run logs. The bridge generates a new token on restart, and reopening the plugin also requires entering the token again. Any token displayed in your agent conversation is handled under that agent/provider's conversation settings.

The plugin returns the current file and page names for connection status and Section/node IDs and counts for render results. It does not read the current selection, other pages, existing text content, images, or your full document. It uses current-page node bounds to place new content. It creates editable nodes in the current file; that content is stored and shared under your Figma file's normal settings.

Neither bridge nor plugin stores prompts on disk, sends analytics, or calls a hosted AI provider directly. The UI keeps the eight most recent result summaries/errors in memory until closed. Your Claude Code or Codex conversation, including the HMW and specs, is handled according to your agent/provider's terms and settings. Running `npx` also downloads the bridge and dependencies from npm during installation.

## Review and release notes

The current [Figma manifest documentation](https://developers.figma.com/docs/plugins/manifest/) permits `ws` domains and requires a reasoning note for local servers in `allowedDomains`. The manifest declares only `ws://localhost:3055` and explains that the bridge is required for normal operation. This is documentation support, **not a guarantee of Community approval**; recheck the current review requirements before submitting.

Before release:

1. Complete [manual-verification.md](manual-verification.md) in Figma Desktop and confirm localhost works for the submission build.
2. Obtain a Figma-assigned plugin ID for publication; the checked-in development ID is inherited from the original project.
3. Confirm npm ownership/availability for `hmw-diverger-mcp`, review the tarball with `npm pack --workspace bridge --dry-run`, and publish a reviewed release separately. This implementation does not publish it.
4. Export the 128px icon and 1920×960 cover, add tested screenshots and final support/contact details, and confirm the disclosure matches the shipped behavior.
5. Check that the release setup commands work from a clean machine:

```bash
claude mcp add hmw-diverger -- npx -y hmw-diverger-mcp
codex mcp add hmw-diverger -- npx -y hmw-diverger-mcp
```
