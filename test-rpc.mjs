import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';

const DIAMOND = "0x0B22380B7E7dE7a5Cc6f3f7391FE0867eedEa07A";

const client = createPublicClient({
  chain: base,
  transport: http('https://mainnet.base.org')
});

const ABI = [{
  inputs: [{ internalType: "uint256", name: "_tokenId", type: "uint256" }],
  name: "getAavegotchi",
  outputs: [{ type: "tuple", components: [
    { name: "tokenId", type: "uint256" },
    { name: "name", type: "string" },
  ]}],
  stateMutability: "view",
  type: "function"
}];

try {
  console.log('Testing gotchi #9638...');
  const result = await client.readContract({
    address: DIAMOND,
    abi: ABI,
    functionName: 'getAavegotchi',
    args: [BigInt(9638)]
  });
  console.log('Success!', result);
} catch (err) {
  console.error('Error:', err.message);
}
