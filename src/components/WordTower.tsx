import { useMemo } from "react";

interface WordTowerProps {
  words: Record<string, number>;
}

const WordTower = ({ words }: WordTowerProps) => {
  const tower = useMemo(() => {
    const entries = Object.entries(words);
    if (entries.length === 0) return [];

    const maxCount = Math.max(...entries.map(([, c]) => c));
    const minCount = Math.min(...entries.map(([, c]) => c));

    const sized = entries.map(([word, count]) => {
      const ratio = maxCount === minCount ? 0.5 : (count - minCount) / (maxCount - minCount);
      const fontSize = 10 + ratio * 50; // 10px to 60px
      return { word, count, fontSize, ratio };
    });

    // Sort by frequency descending — big words go to bottom
    sized.sort((a, b) => a.fontSize - b.fontSize);

    // Greedy row packing with tower-shaped width constraint
    const rows: { words: typeof sized; }[] = [];
    let wordIndex = 0;
    const containerWidth = 700; // max width at bottom

    while (wordIndex < sized.length) {
      const rowNum = rows.length;
      // Tower profile: starts very narrow, expands
      // Use a power curve for spire-like shape
      const progress = Math.min(rowNum / 25, 1);
      const rowWidth = 60 + progress * progress * (containerWidth - 60);

      const row: typeof sized = [];
      let usedWidth = 0;

      while (wordIndex < sized.length) {
        const w = sized[wordIndex];
        const estWidth = w.word.length * w.fontSize * 0.55 + 8;
        if (usedWidth + estWidth <= rowWidth || row.length === 0) {
          row.push(w);
          usedWidth += estWidth;
          wordIndex++;
        } else {
          break;
        }
      }
      rows.push({ words: row });
    }

    return rows;
  }, [words]);

  if (tower.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground text-lg">Введите слово, чтобы начать строить башню</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-0 py-8 select-none">
      {tower.map((row, ri) => (
        <div key={ri} className="flex items-baseline justify-center flex-nowrap" style={{ gap: '4px', lineHeight: 1.1 }}>
          {row.words.map((w, wi) => (
            <span
              key={`${w.word}-${wi}`}
              className="whitespace-nowrap leading-tight"
              style={{
                fontSize: `${w.fontSize}px`,
                color: `hsl(${30 + w.ratio * 15}, ${80 + w.ratio * 15}%, ${45 + w.ratio * 30}%)`,
                textShadow: w.ratio > 0.5 ? `0 0 ${w.ratio * 20}px hsl(35 95% 55% / 0.3)` : 'none',
                fontWeight: w.ratio > 0.6 ? 900 : w.ratio > 0.3 ? 700 : 600,
              }}
            >
              {w.word}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
};

export default WordTower;
