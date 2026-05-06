export const toolDefs = [
  {
    name: 'ping',
    description: 'Health check. Returns ok immediately. Use this to verify the MCP server is reachable before making other calls.',
    inputSchema: { type: 'object', properties: {} },
  },
];

export const handlers = {
  ping() {
    return { ok: true, ts: new Date().toISOString() };
  },
};
