export async function GET() {
  return Response.json({
    contract: "0xA99c4B08201F2913Db8D28e71d020c4298F29dBF",
    rpc: "https://mainnet.base.org",
    timestamp: new Date().toISOString(),
    version: "v2-fixed"
  });
}
// Force deploy Thu Feb 26 20:00:45 UTC 2026
