"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import CardGeneratorClassic from "@/components/CardGeneratorClassic";

export default function HomeContent() {
  const searchParams = useSearchParams();
  const [gotchiId, setGotchiId] = useState("");
  const [showCard, setShowCard] = useState(false);

  useEffect(() => {
    const id = searchParams.get("gotchi");
    if (id && /^\d+$/.test(id)) {
      setGotchiId(id);
      setShowCard(true);
    } else if (id) {
      // Invalid ID in URL, clear it
      setGotchiId("");
      setShowCard(false);
    }
  }, [searchParams]);

  const handleGenerate = () => {
    if (gotchiId && /^\d+$/.test(gotchiId)) {
      setShowCard(true);
    }
  };

  return (
    <div className="max-w-4xl w-full space-y-12">
      {/* Hero Section */}
      <div className="text-center space-y-6">
        <h1 className="text-6xl font-bold text-gotchi-godlike animate-pulse">
          GOTCHI GRAILS CLASSIC
        </h1>
        <p className="text-2xl text-gray-300">
          Generate classic floating cards for your Aavegotchi NFTs 👻
        </p>
        <Link 
          href="/gallery"
          className="inline-block px-6 py-3 bg-gotchi-mythical text-gray-900 font-bold rounded-lg hover:bg-gotchi-legendary transition-colors"
        >
          Browse Gallery 🎨
        </Link>
      </div>

      {/* Input Section */}
      <div className="flex flex-col items-center space-y-4">
        <div className="flex gap-4 w-full max-w-md">
          <input
            type="text"
            placeholder="Enter Gotchi ID (e.g., 9638)"
            value={gotchiId}
            onChange={(e) => setGotchiId(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleGenerate()}
            className="flex-1 px-6 py-4 bg-gray-800 border-2 border-gotchi-godlike rounded-lg text-white text-xl focus:outline-none focus:ring-2 focus:ring-gotchi-godlike"
          />
          <button
            onClick={handleGenerate}
            className="px-8 py-4 bg-gotchi-godlike text-gray-900 font-bold rounded-lg hover:bg-gotchi-mythical transition-colors text-xl"
          >
            Generate
          </button>
        </div>
        <p className="text-gray-500 text-sm">
          Enter any Aavegotchi ID from Base chain
        </p>
      </div>

      {/* Card Display */}
      {showCard && gotchiId && (
        <div className="flex justify-center">
          <CardGeneratorClassic gotchiId={gotchiId} />
        </div>
      )}

      {/* Footer */}
      <div className="text-center text-gray-500 text-sm pt-12">
        <p>GOTCHI GRAAILS™ © 2026</p>
        <p className="mt-2">Built with 👻 for the Aavegotchi community</p>
      </div>
    </div>
  );
}
