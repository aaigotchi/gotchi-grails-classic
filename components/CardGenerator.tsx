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

const ABI = [
  {
    inputs: [{ internalType: "uint256", name: "_tokenId", type: "uint256" }],
    name: "getAavegotchi",
    outputs: [
      {
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
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [{ internalType: "uint256", name: "_tokenId", type: "uint256" }],
    name: "getAavegotchiSvg",
    outputs: [{ internalType: "string", name: "ag_", type: "string" }],
    stateMutability: "view",
    type: "function"
  }
] as const;

const COLLATERALS: Record<string, string> = {
  "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913": "USDC",
  "0x4200000000000000000000000000000000000006": "WETH",
  "0x2ae3f1ec7f1f5012cfeab0185bfc7aa3cf0dec22": "cbETH",
  "0xd9aaec86b65d86f6a7b5b1b0c42ffa531710b6ca": "USDbC",
  "0x50c5725949a6f0c72e6c4a641f24049a917db0cb": "DAI"
};

function getRarity(brs: number): string {
  if (brs >= 600) return "godlike";
  if (brs >= 550) return "mythical";
  if (brs >= 525) return "legendary";
  if (brs >= 500) return "rare";
  if (brs >= 475) return "uncommon";
  return "common";
}

export default function CardGenerator({ gotchiId }: { gotchiId: string }) {
  const [gotchiData, setGotchiData] = useState<GotchiData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchGotchi() {
      try {
        setLoading(true);
        setError(null);

        const client = createPublicClient({
          chain: base,
          transport: http('https://mainnet.base.org')
        });

        const [gotchi, svg] = await Promise.all([
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
          })
        ]);

        const brs = Number((gotchi as any).baseRarityScore);
        const traits = (gotchi as any).numericTraits;

        const data: GotchiData = {
          id: gotchiId,
          name: (gotchi as any).name,
          brs,
          kinship: Number((gotchi as any).kinship),
          experience: Number((gotchi as any).experience),
          haunt: Number((gotchi as any).hauntId) + 1,
          level: Number((gotchi as any).level),
          collateral: COLLATERALS[((gotchi as any).collateral as string).toLowerCase()] || "UNKNOWN",
          rarity: getRarity(brs),
          traits: {
            energy: Number(traits[0]),
            aggression: Number(traits[1]),
            spookiness: Number(traits[2]),
            brainSize: Number(traits[3])
          },
          svg: svg as string
        };

        setGotchiData(data);
      } catch (err: any) {
        console.error('Fetch error details:', {
          message: err?.message,
          cause: err?.cause,
          name: err?.name,
          stack: err?.stack,
          contract: DIAMOND_ADDRESS,
          gotchiId,
          rpcUrl: 'https://mainnet.base.org'
        });
        const errorMsg = err?.message || err?.toString() || "Unknown error";
        const causeMsg = err?.cause?.message || '';
        setError(`Failed to fetch gotchi data: ${errorMsg}${causeMsg ? ` (${causeMsg})` : ''}. Contract: ${DIAMOND_ADDRESS}, ID: ${gotchiId}`);
      } finally {
        setLoading(false);
      }
    }

    fetchGotchi();
  }, [gotchiId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-2xl text-gotchi-godlike animate-pulse">
          Loading gotchi data... 👻
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-xl text-red-400">{error}</div>
      </div>
    );
  }

  if (!gotchiData) return null;

  const rarityColor = `gotchi-${gotchiData.rarity}`;

  const handleDownload = async () => {
    if (!cardRef.current) return;
    
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
      alert('Download failed. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  const handleShare = () => {
    const text = `Check out my Gotchi Grail card for ${gotchiData.name} (#${gotchiData.id})! 👻`;
    const url = `${window.location.origin}?gotchi=${gotchiData.id}`;
    
    if (navigator.share) {
      navigator.share({ title: 'Gotchi Grails', text, url });
    } else {
      navigator.clipboard.writeText(url);
      alert('Link copied to clipboard!');
    }
  };

  return (
    <div className="space-y-6">
      {/* Card */}
      <div 
        ref={cardRef}
        className="relative w-[400px] h-[700px] bg-white rounded-3xl p-4 shadow-2xl"
        style={{
          background: `linear-gradient(to bottom, white 0%, white 8%, var(--tw-${rarityColor}) 8%, var(--tw-${rarityColor}) 100%)`
        }}
      >
        {/* Top Badges */}
        <div className="flex gap-2 justify-center mb-4">
          <span className="px-3 py-1 bg-gray-800 text-white text-xs rounded-full">#{gotchiData.id}</span>
          <span className="px-3 py-1 bg-gray-800 text-white text-xs rounded-full">BRS {gotchiData.brs}</span>
          <span className="px-3 py-1 bg-gray-800 text-white text-xs rounded-full">KIN {gotchiData.kinship}</span>
          <span className="px-3 py-1 bg-gray-800 text-white text-xs rounded-full">XP {gotchiData.experience}</span>
          <span className="px-3 py-1 bg-gray-800 text-white text-xs rounded-full">H{gotchiData.haunt}</span>
        </div>

        {/* Name */}
        <h2 className="text-center text-2xl font-bold text-white mb-4 uppercase">
          {gotchiData.name}
        </h2>

        {/* Collateral & Rarity */}
        <div className="flex justify-between mb-4 px-4">
          <span className="px-4 py-2 bg-white text-gray-900 text-sm font-bold rounded-lg">
            {gotchiData.collateral}
          </span>
          <span className="px-4 py-2 bg-white text-gray-900 text-sm font-bold rounded-lg uppercase">
            {gotchiData.rarity}
          </span>
        </div>

        {/* Gotchi SVG */}
        <div 
          className="flex items-center justify-center mb-6 h-64"
          dangerouslySetInnerHTML={{ __html: gotchiData.svg }}
        />

        {/* Traits */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          {[
            { label: "NRG", value: gotchiData.traits.energy },
            { label: "AGR", value: gotchiData.traits.aggression },
            { label: "SPK", value: gotchiData.traits.spookiness },
            { label: "BRN", value: gotchiData.traits.brainSize }
          ].map((trait) => (
            <div key={trait.label} className="bg-white rounded-lg p-2 text-center">
              <div className="text-xs text-gray-600">{trait.label}</div>
              <div className="text-lg font-bold text-gray-900">{trait.value}</div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="text-center text-white text-xs">
          GOTCHI GRAAILS™ © 2026
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-center gap-4">
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="px-6 py-3 bg-gotchi-godlike text-gray-900 font-bold rounded-lg hover:bg-gotchi-mythical transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {downloading ? "Downloading..." : "📥 Download"}
        </button>
        <button
          onClick={handleShare}
          className="px-6 py-3 bg-gotchi-mythical text-gray-900 font-bold rounded-lg hover:bg-gotchi-legendary transition-colors"
        >
          🔗 Share
        </button>
      </div>
    </div>
  );
}
