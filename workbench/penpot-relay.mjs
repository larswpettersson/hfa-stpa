#!/usr/bin/env node
/**
 * penpot-relay.mjs — lets the STPA workbench (a browser page) talk to the Penpot MCP server.
 *
 * Browsers block cross-origin calls to the hosted Penpot MCP endpoint (no CORS headers), and the
 * endpoint URL embeds your Penpot user token. This relay listens on 127.0.0.1 only, forwards
 * MCP Streamable HTTP requests to Penpot, and adds the CORS headers the page needs, so the token
 * stays in your shell instead of the page.
 *
 * Usage (Node 18+, no dependencies):
 *   PENPOT_MCP_URL=<token or full MCP URL> node penpot-relay.mjs [port]
 *
 * PENPOT_MCP_URL may be either the user token (as in hfa-ds/.mcp.json, which builds
 * https://design.penpot.app/mcp/stream?userToken=${PENPOT_MCP_URL}) or a complete URL, e.g. a
 * local Penpot MCP server such as http://localhost:4401/mcp.
 * The workbench's default "Penpot MCP URL" setting is http://127.0.0.1:4410/mcp.
 */
import http from "node:http";

const raw = (process.env.PENPOT_MCP_URL || process.env.PENPOT_MCP_TOKEN || "").trim();
if (!raw) {
  console.error("Set PENPOT_MCP_URL to your Penpot MCP user token or full MCP URL.");
  process.exit(1);
}
const TARGET = /^https?:\/\//.test(raw) ? raw : `https://design.penpot.app/mcp/stream?userToken=${encodeURIComponent(raw)}`;
const PORT = Number(process.argv[2] || process.env.PORT || 4410);
const FORWARD_REQ = ["content-type", "accept", "mcp-session-id", "mcp-protocol-version", "last-event-id"];
const FORWARD_RES = ["content-type", "mcp-session-id", "cache-control"];

function cors(req) {
  return {
    "access-control-allow-origin": req.headers.origin || "*",
    "access-control-allow-methods": "GET, POST, DELETE, OPTIONS",
    "access-control-allow-headers": FORWARD_REQ.join(", "),
    "access-control-expose-headers": "mcp-session-id",
    "access-control-allow-private-network": "true", // Chrome private-network preflight
    vary: "origin",
  };
}

const server = http.createServer(async (req, res) => {
  if (new URL(req.url, "http://relay").pathname !== "/mcp") {
    res.writeHead(404, cors(req)).end("Use /mcp");
    return;
  }
  if (req.method === "OPTIONS") {
    res.writeHead(204, cors(req)).end();
    return;
  }
  try {
    const headers = {};
    for (const h of FORWARD_REQ) if (req.headers[h]) headers[h] = req.headers[h];
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const upstream = await fetch(TARGET, {
      method: req.method,
      headers,
      body: req.method === "POST" ? Buffer.concat(chunks) : undefined,
    });
    const out = cors(req);
    for (const h of FORWARD_RES) { const v = upstream.headers.get(h); if (v) out[h] = v; }
    res.writeHead(upstream.status, out);
    if (upstream.body) for await (const chunk of upstream.body) res.write(chunk);
    res.end();
  } catch (e) {
    if (!res.headersSent) res.writeHead(502, { ...cors(req), "content-type": "text/plain" });
    res.end("Relay error: " + e.message);
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Penpot MCP relay on http://127.0.0.1:${PORT}/mcp → ${new URL(TARGET).origin}${new URL(TARGET).pathname}`);
});
