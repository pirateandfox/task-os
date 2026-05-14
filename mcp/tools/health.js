const STARTED_AT = new Date().toISOString();

export const toolDefs = [
  {
    name: 'ping',
    description: 'Health check. Returns ok immediately. Use this to verify the MCP server is reachable before starting a pipeline. started_at changes each time the server restarts — if it differs from a previous ping, treat the session as fresh.',
    inputSchema: { type: 'object', properties: {} },
  },
];

export const handlers = {
  ping() {
    return { ok: true, ts: new Date().toISOString(), started_at: STARTED_AT };
  },
};
