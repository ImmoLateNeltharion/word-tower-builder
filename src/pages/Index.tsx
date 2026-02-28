import { useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import WordTower from "@/components/WordTower";

const Index = () => {
  const [words, setWords] = useState<Record<string, number>>({});
  const [input, setInput] = useState("");

  const addWord = useCallback(() => {
    const w = input.trim().toLowerCase();
    if (!w) return;
    setWords(prev => ({ ...prev, [w]: (prev[w] || 0) + 1 }));
    setInput("");
  }, [input]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") addWord();
  };

  const totalWords = Object.values(words).reduce((a, b) => a + b, 0);

  return (
    // h-screen fallback for older browsers, 100dvh for mobile (excludes address bar)
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
      {/* Header */}
      <header className="relative z-10 w-full text-center pt-6 pb-3 px-4 shrink-0">
        <h1 className="text-2xl md:text-3xl font-black tracking-tight" style={{ color: '#ffffff' }}>
          Башня Слов
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'hsl(38, 60%, 55%)' }}>
          Введите слово — и оно станет частью башни
        </p>
      </header>

      {/* Input */}
      <div className="relative z-10 flex gap-2 w-full max-w-md mx-auto px-4 mb-1 shrink-0">
        <Input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Напишите слово..."
          className="bg-card border-border text-foreground placeholder:text-muted-foreground text-base h-11"
        />
        <Button onClick={addWord} className="h-11 px-5 font-bold text-base shrink-0">
          Добавить
        </Button>
      </div>

      {totalWords > 0 && (
        <p className="relative z-10 text-muted-foreground text-xs text-center mb-1 shrink-0">
          {totalWords} {totalWords === 1 ? "слово" : "слов"} · {Object.keys(words).length} уникальных
        </p>
      )}

      {/* Tower fills all remaining space — height drives font scaling */}
      <div className="relative z-10 flex-1 min-h-0 w-full px-2 sm:px-4">
        <WordTower words={words} />
      </div>
    </div>
  );
};

export default Index;
