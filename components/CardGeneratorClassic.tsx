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

const rarityColors: Record<string, string> = {
  common: "#806AFB",
  uncommon: "#20C9C0",
  rare: "#59BCFF",
  legendary: "#FFC36B",
  mythical: "#FF96FF",
  godlike: "#51FFA8"
};

function getRarity(brs: number): string {
  if (brs >= 580) return "godlike";
  if (brs >= 525) return "mythical";
  if (brs >= 475) return "uncommon";
  return "common";
}

export default function CardGeneratorClassic({ 
  gotchiId, 
  hideButtons = false 
}: { 
  gotchiId: string; 
  hideButtons?: boolean;
}) {
  const [gotchiData, setGotchiData] = useState<GotchiData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [inGallery, setInGallery] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem('gotchiGalleryClassic');
    if (stored) {
      try {
        const gallery = JSON.parse(stored);
        setInGallery(gallery.includes(gotchiId));
      } catch (e) {}
    }
  }, [gotchiId]);

  useEffect(() => {
    async function fetchGotchi() {
      try {
        setLoading(true);
        setError("");

        let lastError: Error | null = null;
        let client = null;

        for (const rpcUrl of BASE_RPC_URLS) {
          try {
            client = createPublicClient({
              chain: base,
              transport: http(rpcUrl, { timeout: 10000, retryCount: 2 })
            });

            const data = await client.readContract({
              address: DIAMOND_ADDRESS,
              abi: ABI,
              functionName: "getAavegotchi",
              args: [BigInt(gotchiId)]
            }) as any;

            const svg = await client.readContract({
              address: DIAMOND_ADDRESS,
              abi: ABI,
              functionName: "getAavegotchiSvg",
              args: [BigInt(gotchiId)]
            }) as string;

            let brs = Number(data.modifiedRarityScore || data.baseRarityScore || 0);
            
            if (brs === 0) {
              try {
                const query = `{
                  aavegotchi(id: "${gotchiId}") {
                    withSetsRarityScore
                  }
                }`;
                
                const response = await fetch(SUBGRAPH_URL, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ query })
                });
                
                const result = await response.json();
                if (result.data?.aavegotchi?.withSetsRarityScore) {
                  brs = parseInt(result.data.aavegotchi.withSetsRarityScore);
                }
              } catch (e) {
                console.warn("Subgraph fallback failed:", e);
              }
            }

            const cleanSvg = svg
              .replace(/<g class="gotchi-bg">[\s\S]*?<\/g>/g, '')
              .replace(/<rect[^>]*class="[^"]*wearable-bg[^"]*"[^>]*\/>/g, '');

            const haunt = parseInt(gotchiId) <= 10000 ? 1 : 2;

            setGotchiData({
              id: gotchiId,
              name: data.name || `Gotchi #${gotchiId}`,
              brs,
              kinship: Number(data.kinship || 0),
              experience: Number(data.experience || 0),
              haunt,
              level: Number(data.level || 1),
              collateral: COLLATERALS[data.collateral?.toLowerCase()] || "UNKNOWN",
              rarity: getRarity(brs),
              traits: {
                energy: Number(data.modifiedNumericTraits?.[0] || 0),
                aggression: Number(data.modifiedNumericTraits?.[1] || 0),
                spookiness: Number(data.modifiedNumericTraits?.[2] || 0),
                brainSize: Number(data.modifiedNumericTraits?.[3] || 0)
              },
              svg: cleanSvg
            });
            setLoading(false);
            return;

          } catch (err: any) {
            lastError = err;
            console.warn(`Failed with RPC ${rpcUrl}:`, err.message);
          }
        }

        throw lastError || new Error("All RPC endpoints failed");

      } catch (err: any) {
        console.error("Failed to fetch gotchi:", err);
        setError(err.message || "Failed to load gotchi");
        setLoading(false);
      }
    }

    fetchGotchi();
  }, [gotchiId]);

  const handleDownload = async () => {
    if (!cardRef.current) return;
    setDownloading(true);

    try {
      const dataUrl = await toPng(cardRef.current, { 
        quality: 1,
        pixelRatio: 2,
        backgroundColor: 'transparent'
      });
      
      const link = document.createElement('a');
      link.download = `gotchi-${gotchiId}-classic.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Download failed:", err);
      alert("Download failed. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  const handleShare = () => {
    const url = `${window.location.origin}/?gotchi=${gotchiId}`;
    const text = `Check out my Gotchi #${gotchiId}! 👻`;
    
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

  // Calculate damage (simple formula for demo)
  const baseDamage = 99;
  const levelBonus = gotchiData.level * gotchiData.level;
  const totalDamage = baseDamage + levelBonus;

  return (
    <div className="space-y-6">
      {/* Classic Card */}
      <div ref={cardRef} className="relative inline-block">
        <div 
          className="w-[400px] h-[620px] rounded-[20px] p-5 relative"
          style={{
            background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
            border: `4px solid ${color}`,
            boxShadow: `0 20px 60px rgba(0,0,0,0.4), 0 0 40px rgba(${rarityRgb}, 0.6), inset 0 0 60px rgba(${rarityRgb}, 0.1)`,
            animation: 'cardFloat 3s ease-in-out infinite'
          }}
        >
          {/* Pulsing glow */}
          <div 
            className="absolute -top-1 -left-1 -right-1 -bottom-1 rounded-[20px] -z-10"
            style={{
              background: `linear-gradient(135deg, rgba(${rarityRgb}, 0.3) 0%, rgba(${rarityRgb}, 0.1) 50%, rgba(${rarityRgb}, 0.3) 100%)`,
              filter: 'blur(20px)',
              animation: 'pulse 3s ease-in-out infinite'
            }}
          />

          {/* Top-left: Rarity badge */}
          <div 
            className="absolute top-[25px] left-[25px] px-[10px] py-[5px] rounded-[15px] text-white text-[11px] font-bold tracking-wider uppercase"
            style={{
              background: `linear-gradient(135deg, rgba(${rarityRgb}, 0.9) 0%, rgba(${rarityRgb}, 0.7) 100%)`,
              border: `3px solid ${color}`,
              boxShadow: `0 4px 8px rgba(${rarityRgb}, 0.4)`,
              letterSpacing: '0.5px'
            }}
          >
            {gotchiData.rarity.toUpperCase()}
          </div>

          {/* Top-right: BRS badge */}
          <div 
            className="absolute top-[25px] right-[25px] px-[10px] py-[5px] rounded-[15px] text-white text-[11px] font-bold"
            style={{
              background: `linear-gradient(135deg, rgba(${rarityRgb}, 0.9) 0%, rgba(${rarityRgb}, 0.7) 100%)`,
              border: `3px solid ${color}`,
              boxShadow: `0 4px 8px rgba(${rarityRgb}, 0.4)`
            }}
          >
            BRS {gotchiData.brs}
          </div>

          {/* Header */}
          <div className="text-center text-[#2d3436] text-base font-bold mb-2 uppercase tracking-[3px]">
            {gotchiData.name}
          </div>

          <div className="text-center font-bold mb-3 tracking-[2px] text-xs" style={{ color }}>
            #{gotchiData.id} - H{gotchiData.haunt}
          </div>

          {/* Gotchi art */}
          <div 
            className="w-[360px] h-[260px] mx-auto mb-[15px] rounded-[15px] flex items-center justify-center overflow-hidden relative"
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

          {/* Stats container */}
          <div 
            className="w-[360px] mx-auto rounded-xl p-3 mb-[15px]"
            style={{
              background: 'rgba(255,255,255,0.95)',
              border: `3px solid ${color}`,
              boxShadow: `0 4px 12px rgba(${rarityRgb}, 0.3)`
            }}
          >
            {[
              { label: 'NRG', icon: '⚡', value: gotchiData.traits.energy, max: 100 },
              { label: 'AGG', icon: '🔥', value: gotchiData.traits.aggression, max: 100 },
              { label: 'SPK', icon: '👻', value: gotchiData.traits.spookiness, max: 100 },
              { label: 'BRN', icon: '🧠', value: gotchiData.traits.brainSize, max: 100 }
            ].map((stat, i) => (
              <div key={i} className="flex justify-between items-center my-2 text-[11px] tracking-wider">
                <span className="text-[#2d3436] font-bold min-w-[70px] flex items-center gap-1.5">
                  <span className="text-base">{stat.icon}</span>
                  {stat.label}
                </span>
                <div 
                  className="flex-1 h-[10px] rounded-[5px] mx-2 overflow-hidden"
                  style={{
                    background: '#ecf0f1',
                    border: `2px solid ${color}`
                  }}
                >
                  <div 
                    className="h-full rounded-[5px] relative"
                    style={{
                      width: `${Math.min((stat.value / stat.max) * 100, 100)}%`,
                      background: `linear-gradient(90deg, ${color} 0%, ${color}B3 100%)`,
                      boxShadow: `0 0 10px rgba(${rarityRgb}, 0.5)`,
                      transition: 'width 0.5s ease'
                    }}
                  >
                    <div 
                      className="absolute inset-0"
                      style={{
                        background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)',
                        animation: 'shimmer 2s infinite'
                      }}
                    />
                  </div>
                </div>
                <span className="text-base font-bold min-w-[30px] text-right" style={{ color, textShadow: `0 0 5px rgba(${rarityRgb}, 0.5)` }}>
                  {stat.value}
                </span>
              </div>
            ))}
          </div>

          {/* Moves container */}
          <div 
            className="w-[360px] mx-auto rounded-[10px] p-[10px] relative"
            style={{
              background: `linear-gradient(135deg, rgba(${rarityRgb}, 0.9) 0%, rgba(${rarityRgb}, 0.7) 100%)`,
              color: 'white',
              border: `3px solid ${color}`,
              boxShadow: `0 4px 12px rgba(${rarityRgb}, 0.4)`
            }}
          >
            {/* Title row with badges */}
            <div className="flex items-center justify-center relative mb-1.5">
              {/* Left: KIN badge (INVERTED) */}
              <div 
                className="absolute left-0 px-[10px] py-[5px] rounded-[15px] text-[11px] font-bold uppercase tracking-wider"
                style={{
                  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.85) 100%)',
                  color: color,
                  border: `3px solid ${color}`,
                  boxShadow: `0 4px 8px rgba(${rarityRgb}, 0.4)`,
                  textShadow: '0 1px 2px rgba(0,0,0,0.1)'
                }}
              >
                KIN {gotchiData.kinship}
              </div>

              {/* Center: SKILL title */}
              <div className="text-xs uppercase tracking-[2px] opacity-90">
                SKILL
              </div>

              {/* Right: LEVEL badge (INVERTED) */}
              <div 
                className="absolute right-0 px-[10px] py-[5px] rounded-[15px] text-[11px] font-bold tracking-wider"
                style={{
                  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.85) 100%)',
                  color: color,
                  border: `3px solid ${color}`,
                  boxShadow: `0 4px 8px rgba(${rarityRgb}, 0.4)`,
                  textShadow: '0 1px 2px rgba(0,0,0,0.1)'
                }}
              >
                LV {gotchiData.level}
              </div>
            </div>

            {/* Move name */}
            <div className="text-[13px] font-bold text-white text-center mt-1.5 mb-1.5 tracking-wider">
              HAUNTING CURSE
            </div>

            {/* Damage */}
            <div className="text-[10px] text-white text-center tracking-wider opacity-90">
              DMG: {baseDamage} + ({gotchiData.level} × {gotchiData.level}) = {totalDamage}
            </div>
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
        @keyframes cardFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}
