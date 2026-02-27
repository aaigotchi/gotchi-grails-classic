"use client";

import { useEffect, useState, useRef } from "react";
import { createPublicClient, http } from "viem";
import { base } from "viem/chains";
import { toPng } from "html-to-image";

interface GotchiData {
  id: string;
  name: string;
  brs: number;
  kinship: number;
  experience: number;
  haunt: number;
  level: number;
  collateral: string;
  rarity: string;
  traits: {
    energy: number;
    aggression: number;
    spookiness: number;
    brainSize: number;
  };
  svg: string;
}

const DIAMOND_ADDRESS = "0xA99c4B08201F2913Db8D28e71d020c4298F29dBF";
const SUBGRAPH_URL = 'https://api.goldsky.com/api/public/project_cmh3flagm0001r4p25foufjtt/subgraphs/aavegotchi-core-base/prod/gn';

// Multiple RPC endpoints for fallback (avoid rate limiting)
const BASE_RPC_URLS = [
  'https://base.gateway.tenderly.co',
  'https://base-mainnet.public.blastapi.io',
  'https://base.blockpi.network/v1/rpc/public',
  'https://mainnet.base.org'
];

const ABI = [{
  inputs: [{ internalType: "uint256", name: "_tokenId", type: "uint256" }],
  name: "getAavegotchi",
  outputs: [{
    components: [
      { name: "tokenId", type: "uint256" },
      { name: "name", type: "string" },
      { name: "owner", type: "address" },
      { name: "randomNumber", type: "uint256" },
      { name: "status", type: "uint256" },
      { name: "numericTraits", type: "int16[6]" },
      { name: "modifiedNumericTraits", type: "int16[6]" },
      { name: "equippedWearables", type: "uint16[16]" },
      { name: "collateral", type: "address" },
      { name: "escrow", type: "address" },
      { name: "stakedAmount", type: "uint256" },
      { name: "minimumStake", type: "uint256" },
      { name: "kinship", type: "uint256" },
      { name: "lastInteracted", type: "uint40" },
      { name: "experience", type: "uint256" },
      { name: "toNextLevel", type: "uint256" },
      { name: "usedSkillPoints", type: "uint256" },
      { name: "level", type: "uint256" },
      { name: "hauntId", type: "uint256" },
      { name: "baseRarityScore", type: "uint256" },
      { name: "modifiedRarityScore", type: "uint256" },
      { name: "locked", type: "bool" }
    ],
    internalType: "struct AavegotchiInfo",
    type: "tuple"
  }],
  stateMutability: "view",
  type: "function"
}, {
  inputs: [{ internalType: "uint256", name: "_tokenId", type: "uint256" }],
  name: "getAavegotchiSvg",
  outputs: [{ internalType: "string", name: "ag_", type: "string" }],
  stateMutability: "view",
  type: "function"
}] as const;

const COLLATERALS: Record<string, string> = {
  // ETH
  "0x20d3922b4a1a8560e1ac99fba4fade0c849e2142": "ETH",
  // AAVE
  "0x823cd4264c1b951c9209ad0deaea9988fe8429bf": "AAVE",
  "0x1d2a0e5ec8e5bbdca5cb219e649b565d8e5c3360": "AAVE",
  // DAI
  "0xe0b22e0037b130a9f56bbb537684e6fa18192341": "DAI",
  "0x27f8d03b3a2196956ed754badc28d73be8830a6e": "DAI",
  "0x50c5725949a6f0c72e6c4a641f24049a917db0cb": "DAI",
  // USDC
  "0x1a13f4ca1d028320a707d99520abfefca3998b7f": "USDC",
  "0x9719d867a500ef117cc201206b8ab51e794d3f82": "USDC",
  "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913": "USDC",
  // LINK
  "0x98ea609569bd25119707451ef982b90e3eb719cd": "LINK",
  // USDT
  "0xdae5f1590db13e3b40423b5b5c5fbf175515910b": "USDT",
  "0x60d55f02a771d515e077c9c2403a1ef324885cec": "USDT",
  // TUSD
  "0xf4b8888427b00d7caf21654408b7cba2ecf4ebd9": "TUSD",
  // UNI
  "0x8c8bdbe9cee455732525086264a4bf9cf821c498": "UNI",
  // YFI
  "0xe20f7d1f0ec39c4d5db01f53554f2ef54c71f613": "YFI",
  // Other
  "0x4200000000000000000000000000000000000006": "WETH",
  "0x2ae3f1ec7f1f5012cfeab0185bfc7aa3cf0dec22": "cbETH",
  "0xd9aaec86b65d86f6a7b5b1b0c42ffa531710b6ca": "USDbC"
};

async function querySubgraph(tokenId: string): Promise<string | null> {
  const query = `{
    aavegotchi(id: "${tokenId}") {
      withSetsRarityScore
    }
  }`;

  try {
    const response = await fetch(SUBGRAPH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    });

    const result = await response.json();
    return result.data?.aavegotchi?.withSetsRarityScore || null;
  } catch (error) {
    console.warn('Failed to fetch withSetsRarityScore from subgraph:', error);
    return null;
  }
}

function getRarity(brs: number): string {
  if (brs >= 580) return "godlike";
  if (brs >= 525) return "mythical";
  if (brs >= 475) return "uncommon";
  return "common";
}

const TRAIT_NAMES: Record<string, string> = {
  energy: "NRG",
  aggression: "AGR",
  spookiness: "SPK",
  brainSize: "BRN"
};

const TRAIT_ICONS: Record<string, string> = {
  energy: "/icons/NRG.png",
  aggression: "/icons/AGR.png",
  spookiness: "/icons/SPK.png",
  brainSize: "/icons/BRN.png"
};

const rarityColors: Record<string, string> = {
  godlike: "#51FFA8",
  mythical: "#FF96FF",
  legendary: "#FFC36B",
  rare: "#59BCFF",
  uncommon: "#20C9C0",
  common: "#806AFB"
};

export default function CardGeneratorMVP({ gotchiId, hideButtons = false }: { gotchiId: string; hideButtons?: boolean }) {
  const [gotchiData, setGotchiData] = useState<GotchiData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [inGallery, setInGallery] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check if this gotchi is already in gallery
    const stored = localStorage.getItem('gotchiGallery');
    if (stored) {
      try {
        const gallery = JSON.parse(stored);
        setInGallery(gallery.includes(gotchiId));
      } catch (e) {
        // Ignore
      }
    }
  }, [gotchiId]);

  useEffect(() => {
    async function fetchGotchi() {
      try {
        setLoading(true);
        setError(null);

        // Try multiple RPC endpoints with fallback
        let gotchi, svg, withSetsBRS;
        let lastError;
        
        for (const rpcUrl of BASE_RPC_URLS) {
          try {
            const client = createPublicClient({
              chain: base,
              transport: http(rpcUrl, {
                timeout: 10000,
                retryCount: 2
              })
            });

            [gotchi, svg, withSetsBRS] = await Promise.all([
          client.readContract({
            address: DIAMOND_ADDRESS,
            abi: ABI,
            functionName: "getAavegotchi",
            args: [BigInt(gotchiId)]
          }),
          client.readContract({
            address: DIAMOND_ADDRESS,
            abi: ABI,
            functionName: "getAavegotchiSvg",
            args: [BigInt(gotchiId)]
          }),
          querySubgraph(gotchiId)
        ]);
            
            // Success! Break out of retry loop
            break;
          } catch (err: any) {
            console.warn(`RPC ${rpcUrl} failed:`, err.message);
            lastError = err;
            // Continue to next RPC
          }
        }

        // If all RPCs failed, throw the last error
        if (!gotchi) {
          throw lastError || new Error('All RPC endpoints failed');
        }

        // Validate gotchi exists (status should be 2 or 3 for active gotchi)
        const status = Number((gotchi as any).status);
        if (status !== 2 && status !== 3) {
          throw new Error(`Invalid gotchi status: ${status} (not an active gotchi)`);
        }

        const modifiedBRS = Number((gotchi as any).modifiedRarityScore);
        const brs = withSetsBRS ? Number(withSetsBRS) : modifiedBRS;
        const traits = (gotchi as any).modifiedNumericTraits;

        // Calculate haunt based on ID ranges
        // Haunt 1: 1-10000, Haunt 2: 10001-25000
        const id = Number(gotchiId);
        const haunt = id <= 10000 ? 1 : 2;

        const data: GotchiData = {
          id: gotchiId,
          name: (gotchi as any).name,
          brs,
          kinship: Number((gotchi as any).kinship),
          experience: Number((gotchi as any).experience),
          haunt,
          level: Number((gotchi as any).level),
          collateral: (() => {
            const addr = ((gotchi as any).collateral as string).toLowerCase();
            const name = COLLATERALS[addr];
            if (!name) {
              console.warn(`Unknown collateral address: ${addr}`);
              // Extract token symbol from address (fallback)
              return addr.slice(0, 8) + '...';
            }
            return name;
          })(),
          rarity: getRarity(brs),
          traits: {
            energy: Number(traits[0]),
            aggression: Number(traits[1]),
            spookiness: Number(traits[2]),
            brainSize: Number(traits[3])
          },
          svg: (() => {
            // MANDATORY: Strip ALL backgrounds from SVG (wearable-bg AND gotchi-bg!)
            let cleanSvg = svg as string;
            // Remove wearable-bg slot (first method)
            cleanSvg = cleanSvg.replace(/<g class="gotchi-wearable wearable-bg"><svg[^>]*>[\s\S]*?<\/svg><\/g>/, '');
            // Remove gotchi-bg (alternative method some gotchis use)
            cleanSvg = cleanSvg.replace(/<g class="gotchi-bg">[\s\S]*?<\/g>/, '');
            
            // CRITICAL: Scope ONLY color-related CSS classes to prevent bleeding
            // DO NOT scope structural classes like sleeves-up, handsUp, etc.
            const uniqueId = `g${gotchiId}`;
            const colorClasses = ['gotchi-primary', 'gotchi-secondary', 'gotchi-cheek', 'gotchi-eyeColor', 'gotchi-primary-mouth'];
            
            colorClasses.forEach(className => {
              // Replace in style tags
              const regex = new RegExp(`\\.${className}\\b`, 'g');
              cleanSvg = cleanSvg.replace(regex, `.${uniqueId}-${className}`);
              // Replace in class attributes
              const classRegex = new RegExp(`class="${className}"`, 'g');
              cleanSvg = cleanSvg.replace(classRegex, `class="${uniqueId}-${className}"`);
            });
            
            return cleanSvg;
          })()
        };

        setGotchiData(data);
      } catch (err: any) {
        console.error('Fetch error for gotchi #' + gotchiId + ':', err);
        const errorMsg = err?.message || err?.toString() || 'Unknown error';
        setError(`Failed to fetch gotchi #${gotchiId}: ${errorMsg.slice(0, 100)}`);
      } finally {
        setLoading(false);
      }
    }

    fetchGotchi();
  }, [gotchiId]);

  const handleDownload = async () => {
    if (!cardRef.current || !gotchiData) return;
    
    try {
      setDownloading(true);
      const dataUrl = await toPng(cardRef.current, {
        quality: 1.0,
        pixelRatio: 2,
      });
      
      const link = document.createElement('a');
      link.download = `gotchi-${gotchiData.id}-${gotchiData.name.toLowerCase().replace(/\s+/g, '-')}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Download failed:', err);
    } finally {
      setDownloading(false);
    }
  };

  const handleShare = () => {
    if (!gotchiData) return;
    const text = `Check out my Gotchi Grail card for ${gotchiData.name} (#${gotchiData.id})! 👻`;
    const url = `${window.location.origin}?gotchi=${gotchiData.id}`;
    
    if (navigator.share) {
      navigator.share({ title: 'Gotchi Grails', text, url });
    } else {
      navigator.clipboard.writeText(url);
      alert('Link copied to clipboard!');
    }
  };

  const handleToggleGallery = () => {
    if (!gotchiData) return;
    
    const stored = localStorage.getItem('gotchiGallery');
    let gallery: string[] = [];
    
    if (stored) {
      try {
        gallery = JSON.parse(stored);
      } catch (e) {
        gallery = [];
      }
    }
    
    if (inGallery) {
      // Remove from gallery
      gallery = gallery.filter(id => id !== gotchiId);
    } else {
      // Add to gallery (avoid duplicates)
      if (!gallery.includes(gotchiId)) {
        gallery.push(gotchiId);
      }
    }
    
    localStorage.setItem('gotchiGallery', JSON.stringify(gallery));
    setInGallery(!inGallery);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-2xl text-gotchi-godlike animate-pulse">
          Loading gotchi data... 👻
        </div>
      </div>
    );
  }

  if (error || !gotchiData) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4">
        <div className="text-xl text-red-400">{error || "Failed to load"}</div>
        <button
          onClick={() => window.location.href = '/'}
          className="px-6 py-3 bg-gotchi-godlike text-gray-900 font-bold rounded-lg hover:bg-gotchi-mythical transition-colors"
        >
          ← Try Another Gotchi
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* MVP Card - EXACT match to gotchi-cards-mvp.html */}
      <div 
        ref={cardRef}
        className="w-[400px] h-[700px] bg-white rounded-[18px] relative overflow-hidden"
      >
        {/* Card Inner */}
        <div 
          className="absolute top-4 left-4 right-4 bottom-4 rounded-lg p-4 flex flex-col"
          style={{ background: rarityColors[gotchiData.rarity] }}
        >
          {/* Top badges */}
          <div className="flex gap-2 mb-2">
            {[
              { label: 'ID', value: `#${gotchiData.id}` },
              { label: 'BRS', value: gotchiData.brs },
              { label: 'KIN', value: gotchiData.kinship },
              { label: 'XP', value: gotchiData.experience },
              { label: 'HAUNT', value: gotchiData.haunt }
            ].map((badge, i) => (
              <div key={i} className="flex-1 bg-white/50 rounded px-1 py-1.5 text-center flex flex-col gap-0.5">
                <div className="text-[10px] opacity-70 font-bold text-black">{badge.label}</div>
                <div className="text-[14px] font-bold text-black">{badge.value}</div>
              </div>
            ))}
          </div>

          {/* Name section - reduced height by 35% */}
          <div className="bg-white/50 rounded-lg py-2 px-4 mb-1 text-center">
            <div className="text-[25px] font-bold uppercase text-black leading-none">
              {gotchiData.name}
            </div>
          </div>

          {/* Collateral and Rarity badges */}
          <div className="flex justify-between mb-1.5">
            <div className="bg-white/50 rounded px-3 py-2 text-[13px] font-bold text-black self-start w-20 text-center">
              {gotchiData.collateral}
            </div>
            <div className="bg-white/50 rounded px-3 py-2 text-[13px] font-bold text-black self-end w-20 text-center uppercase">
              {gotchiData.rarity}
            </div>
          </div>

          {/* Gotchi artwork */}
          <div 
            className="flex-1 flex items-center justify-center mb-0.5 -mt-[11%] gotchi-container"
            dangerouslySetInnerHTML={{ __html: gotchiData.svg }}
            style={{
              imageRendering: 'pixelated',
              transform: 'scale(0.90)'
            } as React.CSSProperties}
          />
          <style jsx>{`
            .gotchi-container :global(.wearable-bg) {
              display: none !important;
            }
          `}</style>

          {/* Traits - separated value from icon+name */}
          <div className="grid grid-cols-4 gap-2 mb-2.5 -mt-[13%]">
            {Object.entries(gotchiData.traits).map(([key, value]) => (
              <div key={key} className="flex flex-col gap-2">
                {/* Value badge - separate */}
                <div className="bg-white/50 rounded-lg px-2 py-1.5 text-center">
                  <div className="text-[25px] font-bold text-black leading-none">
                    {value}
                  </div>
                </div>
                {/* Icon + Name badge - together */}
                <div className="bg-white/50 rounded-lg p-2 text-center flex flex-col items-center">
                  <img 
                    src={TRAIT_ICONS[key]} 
                    alt={TRAIT_NAMES[key]}
                    className="w-10 h-10 mb-1 block"
                    style={{ imageRendering: 'pixelated' }}
                  />
                  <div className="text-[13px] font-bold text-black leading-tight">{TRAIT_NAMES[key]}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="flex justify-between items-center text-[10px] text-black">
            <div className="font-bold">GOTCHI GRAAILS™</div>
            <div>© 2026</div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      {!hideButtons && (
        <div className="flex justify-center gap-4">
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="px-6 py-3 bg-gotchi-godlike text-gray-900 font-bold rounded-lg hover:bg-gotchi-mythical transition-colors disabled:opacity-50"
          >
            {downloading ? "Downloading..." : "📥 Download"}
          </button>
          <button
            onClick={handleShare}
            className="px-6 py-3 bg-gotchi-mythical text-gray-900 font-bold rounded-lg hover:bg-gotchi-legendary transition-colors"
          >
            🔗 Share
          </button>
          <button
            onClick={handleToggleGallery}
            className={`px-6 py-3 font-bold rounded-lg transition-colors ${
              inGallery 
                ? 'bg-red-500 text-white hover:bg-red-600' 
                : 'bg-gotchi-rare text-gray-900 hover:bg-gotchi-legendary'
            }`}
          >
            {inGallery ? '❌ Remove from Gallery' : '🎨 Add to Gallery'}
          </button>
        </div>
      )}
    </div>
  );
}
