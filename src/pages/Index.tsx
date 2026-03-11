import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import WordTower from "@/components/WordTower";
import { useStopWords } from "@/contexts/StopWordsContext";

const Index = () => {
  document.title = "test";
  const { stopWords } = useStopWords();

  // Poll approved words from the server every 5 seconds
  const { data: approvedWords = {} } = useQuery<Record<string, number>>({
    queryKey: ["approved-words"],
    queryFn: () => fetch("/api/words/approved").then((r) => r.json()),
    refetchInterval: 5000,
    retry: 1,
    retryDelay: 2000,
  });

  // Filter out stop words (no more placeholder merging — tower shows only real data)
  const filteredWords = useMemo(() => {
    const map = { ...approvedWords };
    for (const sw of stopWords) {
      delete map[sw];
    }
    return map;
  }, [approvedWords, stopWords]);

  return (
    <div
      className="h-screen relative flex flex-col overflow-hidden"
      style={{
        height: '100dvh',
        backgroundImage: 'url(/seoul-night-bg.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center bottom',
        backgroundRepeat: 'no-repeat',
        backgroundColor: '#0a0a0a',
      }}
    >
      {/* Dark overlay to keep text readable */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'linear-gradient(to bottom, rgba(5,5,10,0.82) 0%, rgba(5,5,10,0.65) 50%, rgba(5,5,10,0.45) 100%)' }}
      />

      {/* QR code — neon frame, top right */}
      <div className="absolute z-20 top-5 right-5 pointer-events-none">
        <div
          style={{
            padding: '7px',
            background: 'rgba(5,5,10,0.80)',
            borderRadius: '10px',
            border: '1.5px solid hsl(35, 90%, 55%)',
            boxShadow: '0 0 8px hsl(35, 90%, 55%), 0 0 20px hsl(35, 85%, 45% / 0.55), 0 0 40px hsl(35, 80%, 40% / 0.25)',
          }}
        >
          <img
            src="/vatech-qr.png"
            alt="QR"
            style={{
              height: '82px',
              width: '82px',
              objectFit: 'contain',
              display: 'block',
              borderRadius: '4px',
            }}
            onError={(e) => { (e.target as HTMLImageElement).closest('div')!.style.display = 'none'; }}
          />
        </div>
      </div>

      {/* Tower fills the remaining screen */}
      <div className="relative z-10 flex-1 min-h-0 w-full">
        <WordTower words={filteredWords} />
      </div>
    </div>
  );
};

export default Index;
