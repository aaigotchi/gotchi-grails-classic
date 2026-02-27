"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import CardGeneratorMVP from "@/components/CardGeneratorMVP";

export default function Gallery() {
  const [galleryGotchis, setGalleryGotchis] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);
  const [renderKey, setRenderKey] = useState(0);

  useEffect(() => {
    setMounted(true);
    // Load gallery from localStorage
    const stored = localStorage.getItem('gotchiGallery');
    if (stored) {
      try {
        setGalleryGotchis(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse gallery:', e);
      }
    }
  }, []);

  const removeFromGallery = (id: string) => {
    const updated = galleryGotchis.filter(gid => gid !== id);
    setGalleryGotchis(updated);
    localStorage.setItem('gotchiGallery', JSON.stringify(updated));
    setRenderKey(prev => prev + 1); // Force complete re-render
  };

  // Force re-render when gallery changes
  useEffect(() => {
    const handleStorageChange = () => {
      const stored = localStorage.getItem('gotchiGallery');
      if (stored) {
        try {
          setGalleryGotchis(JSON.parse(stored));
          setRenderKey(prev => prev + 1); // Force re-render
        } catch (e) {
          console.error('Failed to parse gallery:', e);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  if (!mounted) {
    return null; // Avoid hydration mismatch
  }

  return (
    <main className="min-h-screen p-8 bg-[#1a1a2e]">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-5xl font-bold text-gotchi-godlike">
            My Gotchi Cards 🎨
          </h1>
          <p className="text-xl text-gray-300">
            {galleryGotchis.length} card{galleryGotchis.length !== 1 ? 's' : ''} in your collection
          </p>
          <Link 
            href="/"
            className="inline-block px-6 py-3 bg-gotchi-mythical text-gray-900 font-bold rounded-lg hover:bg-gotchi-legendary transition-colors"
          >
            ← Back to Generator
          </Link>
        </div>

        {/* Gallery Grid - 4x4 */}
        {galleryGotchis.length === 0 ? (
          <div className="text-center py-20 space-y-4">
            <div className="text-8xl opacity-20">👻</div>
            <p className="text-2xl text-gray-400">Your gallery is empty</p>
            <p className="text-gray-500">Generate a card and click "Add to Gallery" to start collecting!</p>
            <Link 
              href="/"
              className="inline-block px-8 py-4 bg-gotchi-godlike text-gray-900 font-bold rounded-lg hover:bg-gotchi-mythical transition-colors mt-4"
            >
              Generate Your First Card
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-6 items-start" key={`gallery-${renderKey}`}>
            {galleryGotchis.map((id) => (
              <div key={`gallery-card-${id}-${renderKey}`} className="relative">
                {/* Card container with proper bounds */}
                <div className="relative group">
                  {/* Actual card rendered - scaled down to fit grid */}
                  <div className="w-[300px] h-[525px] overflow-hidden bg-[#1a1a2e] rounded-xl">
                    <div className="transform scale-75 origin-top-left">
                      <CardGeneratorMVP key={`card-${id}-${renderKey}`} gotchiId={id} hideButtons={true} />
                    </div>
                  </div>
                  
                  {/* Remove button - top right corner of scaled card */}
                  <button
                    onClick={() => removeFromGallery(id)}
                    className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity font-bold text-sm shadow-lg z-10"
                    title="Remove from gallery"
                  >
                    ×
                  </button>
                  
                  {/* Click overlay to view full */}
                  <Link 
                    href={`/?gotchi=${id}`}
                    className="absolute inset-0 opacity-0 hover:opacity-10 bg-white transition-opacity rounded-lg"
                    title="View full card"
                  />
                </div>
              </div>
            ))}
            {/* Fill empty slots to maintain 4x4 grid */}
            {Array.from({ length: Math.max(0, 16 - galleryGotchis.length) }).map((_, i) => (
              <div key={`empty-${i}`} className="w-[300px] h-[525px] bg-gray-900/20 rounded-xl border-2 border-dashed border-gray-700 flex items-center justify-center">
                <span className="text-gray-600 text-4xl">+</span>
              </div>
            ))}
          </div>
        )}

        {/* Info */}
        <div className="text-center text-gray-400 space-y-2 pt-8">
          <p className="text-sm">
            GOTCHI GRAAILS™ © 2026
          </p>
        </div>
      </div>
    </main>
  );
}
