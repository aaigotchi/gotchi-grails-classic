import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';

const DIAMOND = "0x0b22380B7E7De7A5Cc6F3f7391fe0867EEDeA07A";

const client = createPublicClient({
  chain: base,
  transport: http('https://mainnet.base.org')
});

try {
  console.log('Testing block number...');
  const block = await client.getBlockNumber();
  console.log('Current block:', block);
  
  console.log('\nTesting gotchi contract call...');
  const code = await client.getCode({ address: DIAMOND });
  console.log('Contract has code:', code ? 'YES' : 'NO');
  
} catch (err) {
  console.error('Error:', err.message);
}
