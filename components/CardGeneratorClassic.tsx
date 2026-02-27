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

// Multiple RPC endpoints for fallback
const BASE_RPC_URLS = [
  'https://base.gateway.tenderly.co',
  'https://base-mainnet.public.blastapi.io',
  'https://base.blockpi.network/v1/rpc/public',
  'https://mainnet.base.org'
];

const COLLATERALS: Record<string, string> = {
  "0x20d3922b4a1a8560e1ac99fba4fade0c849e2142": "ETH",
  "0x823cd4264c1b951c9209ad0deaea9988fe8429bf": "AAVE",
  "0x1d2a0e5ec8e5bbdca5cb219e649b565d8e5c3360": "AAVE",
  "0xe0b22e0037b130a9f56bbb537684e6fa18192341": "DAI",
  "0x27f8d03b3a2196956ed754badc28d73be8830a6e": "DAI",
  "0x50c5725949a6f0c72e6c4a641f24049a917db0cb": "DAI",
  "0x1a13f4ca1d028320a707d99520abfefca3998b7f": "USDC",
  "0x9719d867a500ef117cc201206b8ab51e794d3f82": "USDC",
  "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913": "USDC",
  "0x98ea609569bd25119707451ef982b90e3eb719cd": "LINK",
  "0xdae5f1590db13e3b40423b5b5c5fbf175515910b": "USDT",
  "0x60d55f02a771d515e077c9c2403a1ef324885cec": "USDT",
  "0xf4b8888427b00d7caf21654408b7cba2ecf4ebd9": "TUSD",
  "0x8c8bdbe9cee455732525086264a4bf9cf821c498": "UNI",
  "0xe20f7d1f0ec39c4d5db01f53554f2ef54c71f613": "YFI",
  "0x4200000000000000000000000000000000000006": "WETH",
  "0x2ae3f1ec7f1f5012cfeab0185bfc7aa3cf0dec22": "cbETH",
  "0xd9aaec86b65d86f6a7b5b1b0c42ffa531710b6ca": "USDbC"
};

const ABI = [
  {
    "inputs": [{"internalType": "uint256", "name": "_tokenId", "type": "uint256"}],
    "name": "getAavegotchi",
    "outputs": [{
      "components": [
        {"internalType": "uint256", "name": "tokenId", "type": "uint256"},
        {"internalType": "string", "name": "name", "type": "string"},
        {"internalType": "address", "name": "owner", "type": "address"},
        {"internalType": "uint256", "name": "randomNumber", "type": "uint256"},
        {"internalType": "uint256", "name": "status", "type": "uint256"},
        {"internalType": "int16[6]", "name": "numericTraits", "type": "int16[6]"},
        {"internalType": "int16[6]", "name": "modifiedNumericTraits", "type": "int16[6]"},
        {"internalType": "uint16[16]", "name": "equippedWearables", "type": "uint16[16]"},
        {"internalType": "address", "name": "collateral", "type": "address"},
        {"internalType": "address", "name": "escrow", "type": "address"},
        {"internalType": "uint256", "name": "stakedAmount", "type": "uint256"},
        {"internalType": "uint256", "name": "minimumStake", "type": "uint256"},
        {"internalType": "uint256", "name": "kinship", "type": "uint256"},
        {"internalType": "uint256", "name": "lastInteracted", "type": "uint256"},
        {"internalType": "uint256", "name": "experience", "type": "uint256"},
        {"internalType": "uint256", "name": "toNextLevel", "type": "uint256"},
        {"internalType": "uint256", "name": "usedSkillPoints", "type": "uint256"},
        {"internalType": "uint256", "name": "level", "type": "uint256"},
        {"internalType": "uint256", "name": "hauntId", "type": "uint256"},
        {"internalType": "uint256", "name": "baseRarityScore", "type": "uint256"},
        {"internalType": "uint256", "name": "modifiedRarityScore", "type": "uint256"},
        {"internalType": "bool", "name": "locked", "type": "bool"}
      ],
      "internalType": "struct AavegotchiInfo",
      "name": "aavegotchiInfo_",
      "type": "tuple"
    }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "_tokenId", "type": "uint256"}],
    "name": "getAavegotchiSvg",
    "outputs": [{"internalType": "string", "name": "ag_", "type": "string"}],
    "stateMutability": "view",
    "type": "function"
  }
];

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

const rarityColors: Record<string, string> = {
  godlike: "#51FFA8",
  mythical: "#FF96FF",
  legendary: "#FFC36B",
  rare: "#59BCFF",
  uncommon: "#20C9C0",
  common: "#806AFB"
};

export default function CardGeneratorClassic({ gotchiId, hideButtons = false }: { gotchiId: string; hideButtons?: boolean }) {
  const [gotchiData, setGotchiData] = useState<GotchiData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [inGallery, setInGallery] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem('gotchiGalleryClassic');
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
            
            break;
          } catch (err: any) {
            console.warn(`RPC ${rpcUrl} failed:`, err.message);
            lastError = err;
          }
        }

        if (!gotchi) {
          throw lastError || new Error('All RPC endpoints failed');
        }

        const status = Number((gotchi as any).status);
        if (status !== 2 && status !== 3) {
          throw new Error(`Invalid gotchi status: ${status} (not an active gotchi)`);
        }

        const modifiedBRS = Number((gotchi as any).modifiedRarityScore);
        const brs = withSetsBRS ? Number(withSetsBRS) : modifiedBRS;
        const traits = (gotchi as any).modifiedNumericTraits;

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
              console.warn('Unknown collateral:', addr);
            }
            return name || addr.slice(0, 8);
          })(),
          rarity: getRarity(brs),
          traits: {
            energy: Number(traits[0]),
            aggression: Number(traits[1]),
            spookiness: Number(traits[2]),
            brainSize: Number(traits[3])
          },
          svg: (() => {
            let cleanSvg = svg as string;
            cleanSvg = cleanSvg.replace(/<g class="gotchi-wearable wearable-bg"><svg[^>]*>[\s\S]*?<\/svg><\/g>/, '');
            cleanSvg = cleanSvg.replace(/<g class="gotchi-bg">[\s\S]*?<\/g>/, '');
            
            const uniqueId = `g${gotchiId}`;
            const colorClasses = ['gotchi-primary', 'gotchi-secondary', 'gotchi-cheek', 'gotchi-eyeColor', 'gotchi-primary-mouth'];
            
            colorClasses.forEach(className => {
              const regex = new RegExp(`\\.${className}\\b`, 'g');
              cleanSvg = cleanSvg.replace(regex, `.${uniqueId}-${className}`);
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
      link.download = `gotchi-${gotchiData.id}-${gotchiData.name.toLowerCase().replace(/\s+/g, '-')}-classic.png`;
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
      navigator.share({ title: 'Gotchi Grails Classic', text, url });
    } else {
      navigator.clipboard.writeText(url);
      alert('Link copied to clipboard!');
    }
  };

  const handleToggleGallery = () => {
    if (!gotchiData) return;
    
    const stored = localStorage.getItem('gotchiGalleryClassic');
    let gallery: string[] = [];
    
    if (stored) {
      try {
        gallery = JSON.parse(stored);
      } catch (e) {
        gallery = [];
      }
    }
    
    if (inGallery) {
      gallery = gallery.filter(id => id !== gotchiId);
    } else {
      if (!gallery.includes(gotchiId)) {
        gallery.push(gotchiId);
      }
    }
    
    localStorage.setItem('gotchiGalleryClassic', JSON.stringify(gallery));
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

  const color = rarityColors[gotchiData.rarity];
  const rarityRgb = color.match(/\w\w/g)?.map(x => parseInt(x, 16)).join(', ') || '89, 188, 255';

  return (
    <div className="space-y-6">
      {/* Classic Card - matches gotchi-cards.html */}
      <div ref={cardRef} className="relative inline-block">
        <div 
          className="w-[400px] h-[620px] rounded-[20px] p-5 relative animate-float"
          style={{
            background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
            border: `4px solid ${color}`,
            boxShadow: `0 20px 60px rgba(0,0,0,0.4), 0 0 40px rgba(${rarityRgb}, 0.6), inset 0 0 60px rgba(${rarityRgb}, 0.1)`
          }}
        >
          {/* Glow effect */}
          <div 
            className="absolute -top-1 -left-1 -right-1 -bottom-1 rounded-[20px] -z-10 blur-[20px] animate-pulse"
            style={{
              background: `linear-gradient(135deg, rgba(${rarityRgb}, 0.3) 0%, rgba(${rarityRgb}, 0.1) 50%, rgba(${rarityRgb}, 0.3) 100%)`
            }}
          />

          {/* Header */}
          <div className="text-center text-[#2d3436] text-base font-bold mb-2 uppercase tracking-[3px]">
            {gotchiData.name}
          </div>

          <div className="text-center font-bold mb-3 tracking-[2px] text-xs" style={{ color }}>
            #{gotchiData.id} • HAUNT {gotchiData.haunt} • {gotchiData.rarity.toUpperCase()}
          </div>

          {/* Gotchi art */}
          <div 
            className="w-[360px] mx-auto mb-4 h-[260px] rounded-[15px] flex items-center justify-center overflow-hidden relative"
            style={{
              background: `radial-gradient(circle at center, rgba(${rarityRgb}, 0.1) 0%, white 60%)`,
              border: `4px solid ${color}`,
              boxShadow: `inset 0 4px 8px rgba(0,0,0,0.1), 0 0 20px rgba(${rarityRgb}, 0.4)`
            }}
          >
            <div
              dangerouslySetInnerHTML={{ __html: gotchiData.svg }}
              className="w-[220px] h-[220px]"
              style={{
                imageRendering: 'pixelated',
                filter: `drop-shadow(0 4px 8px rgba(${rarityRgb}, 0.3))`
              }}
            />
          </div>

          {/* Stats */}
          <div 
            className="w-[360px] mx-auto rounded-xl p-3 mb-4"
            style={{
              background: 'rgba(255,255,255,0.95)',
              border: `3px solid ${color}`,
              boxShadow: `0 4px 12px rgba(${rarityRgb}, 0.3)`
            }}
          >
            {[
              { label: 'BRS', value: gotchiData.brs, max: 600 },
              { label: 'KIN', value: gotchiData.kinship, max: 10000 },
              { label: 'XP', value: gotchiData.experience, max: 50000 },
              { label: 'LEVEL', value: gotchiData.level, max: 99 }
            ].map((stat, i) => (
              <div key={i} className="flex justify-between items-center my-2 text-[11px] tracking-wider">
                <span className="text-[#2d3436] font-bold min-w-[70px]">{stat.label}</span>
                <div className="flex-1 h-[10px] bg-[#ecf0f1] rounded-full mx-2 overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min((stat.value / stat.max) * 100, 100)}%`,
                      background: `linear-gradient(90deg, ${color} 0%, ${color}CC 100%)`,
                      boxShadow: `0 0 8px rgba(${rarityRgb}, 0.6)`
                    }}
                  />
                </div>
                <span className="text-base font-bold min-w-[30px] text-right" style={{ color, textShadow: `0 0 5px rgba(${rarityRgb}, 0.5)` }}>
                  {stat.value}
                </span>
              </div>
            ))}
          </div>

          {/* Traits */}
          <div className="grid grid-cols-4 gap-2">
            {Object.entries(gotchiData.traits).map(([key, value], i) => (
              <div 
                key={i}
                className="rounded-lg p-2 text-center text-xs font-bold"
                style={{
                  background: 'rgba(255,255,255,0.9)',
                  border: `2px solid ${color}`
                }}
              >
                <div className="text-base" style={{ color }}>{value}</div>
                <div className="text-[#7f8c8d] uppercase text-[10px] mt-1">
                  {['NRG', 'AGR', 'SPK', 'BRN'][i]}
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="absolute bottom-3 left-5 right-5 flex justify-between text-[10px] text-[#95a5a6]">
            <span className="font-bold">GOTCHI GRAILS™ CLASSIC</span>
            <span>© 2026</span>
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

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
