import { Suspense } from "react";
import HomeContent from "@/components/HomeContent";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <Suspense fallback={<div className="text-2xl text-gotchi-godlike animate-pulse">Loading... 👻</div>}>
        <HomeContent />
      </Suspense>
    </main>
  );
}
