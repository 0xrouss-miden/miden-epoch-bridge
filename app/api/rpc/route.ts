import { rpcUrl, noStore } from "@/lib/server";
const allowed = new Set([
  "eth_chainId",
  "eth_blockNumber",
  "eth_getBalance",
  "eth_getTransactionReceipt",
  "eth_getTransactionByHash",
  "eth_call",
  "eth_estimateGas",
  "eth_gasPrice",
  "eth_maxPriorityFeePerGas",
  "eth_getBlockByNumber",
  "eth_feeHistory",
  "eth_getCode",
  "eth_getTransactionCount",
]);
export async function POST(request: Request) {
  const raw = await request.text();
  if (raw.length > 32768)
    return Response.json({ error: "Request too large" }, { status: 413 });
  try {
    const body = JSON.parse(raw);
    if (
      Array.isArray(body) ||
      !allowed.has(body.method) ||
      body.jsonrpc !== "2.0"
    )
      return Response.json(
        { error: "Read-only RPC method not allowed" },
        { status: 400 },
      );
    const response = await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: raw,
      signal: AbortSignal.timeout(12000),
      cache: "no-store",
    });
    if (!response.ok) throw new Error("RPC unavailable");
    return Response.json(await response.json(), { headers: noStore });
  } catch {
    return Response.json(
      { error: "Sepolia RPC unavailable" },
      { status: 502, headers: noStore },
    );
  }
}
