import { useMemo } from "react";

interface WordTowerProps {
  words: Record<string, number>;
}

// Lots of positive filler words
const FILLER_WORDS = [
  "свет", "мир", "путь", "дар", "лад", "дух", "ритм", "шаг", "жар", "миг",
  "тон", "луч", "вид", "час", "дом", "сон", "ход", "зов", "рай", "бег",
  "жизнь", "вера", "воля", "тепло", "суть", "связь", "явь", "лик", "нрав",
  "след", "блик", "рост", "толк", "пыл", "взлёт", "клад", "край", "старт",
  "смысл", "честь", "труд", "плод", "весть", "блеск", "гимн", "знак", "круг",
];

const PLACEHOLDER_WORDS: Record<string, number> = {
  "люди": 22, "успех": 18, "команда": 17, "рост": 15, "доверие": 14,
  "будущее": 13, "опыт": 12, "развитие": 11, "инновации": 10, "победа": 9,
  "мечта": 8, "сила": 8, "радость": 7, "знания": 7, "энергия": 7,
  "дружба": 6, "вдохновение": 6, "гармония": 6, "свобода": 5, "любовь": 5,
  "счастье": 5, "надежда": 5, "мудрость": 4, "красота": 4, "добро": 4,
  "свет": 4, "тепло": 3, "улыбка": 3, "вера": 3, "честь": 3,
  "смелость": 3, "талант": 2, "цель": 2, "путь": 2, "звезда": 2,
  "солнце": 2, "мир": 2, "душа": 1, "искра": 1, "рассвет": 1,
};

// Smooth tower profile using bezier-like curves
// Returns width factor 0-1 for vertical position t (0=top, 1=bottom)
function towerProfile(t: number): number {
  // Spire: very thin at top, gradually widening
  if (t < 0.12) {
    const s = t / 0.12;
    return 0.03 + s * s * 0.09; // quadratic ease-in
  }
  // Upper body: smooth widening  
  if (t < 0.30) {
    const s = (t - 0.12) / 0.18;
    return 0.12 + s * 0.38;
  }
  // Observation deck bulge
  if (t < 0.42) {
    const s = (t - 0.30) / 0.12;
    const bulge = Math.sin(s * Math.PI);
    return 0.50 + bulge * 0.12;
  }
  // Neck: narrowing smoothly
  if (t < 0.55) {
    const s = (t - 0.42) / 0.13;
    return 0.50 - s * 0.15;
  }
  // Lower body: smooth expansion to base
  const s = (t - 0.55) / 0.45;
  return 0.35 + s * s * 0.65; // quadratic ease-in for smooth flare
}

function measureWord(word: string, fontSize: number): number {
  return word.length * fontSize * 0.52 + 4;
}

const WordTower = ({ words }: WordTowerProps) => {
  const tower = useMemo(() => {
    // Merge user words with placeholders
    const merged = { ...PLACEHOLDER_WORDS };
    for (const [w, c] of Object.entries(words)) {
      merged[w] = (merged[w] || 0) + c;
    }

    const entries = Object.entries(merged);
    if (entries.length === 0) return [];

    const maxCount = Math.max(...entries.map(([, c]) => c));
    const minCount = Math.min(...entries.map(([, c]) => c));

    type SizedWord = { word: string; count: number; fontSize: number; ratio: number; isUser: boolean; isFiller: boolean };

    const sized: SizedWord[] = entries.map(([word, count]) => {
      const ratio = maxCount === minCount ? 0.5 : (count - minCount) / (maxCount - minCount);
      const fontSize = 10 + ratio * 48;
      return { word, count, fontSize, ratio, isUser: word in words, isFiller: false };
    });

    // Sort ascending by font size
    sized.sort((a, b) => a.fontSize - b.fontSize);

    // Build rows
    const maxWidth = 420;
    const numRows = 50;
    const rows: { words: SizedWord[]; targetWidth: number; rowT: number }[] = [];

    for (let r = 0; r < numRows; r++) {
      const t = r / (numRows - 1);
      const widthFactor = towerProfile(t);
      rows.push({ words: [], targetWidth: Math.max(30, widthFactor * maxWidth), rowT: t });
    }

    // Assign words to rows: small words → top (narrow), big words → bottom (wide)
    // But we need to respect the width constraint
    let wordIdx = 0;
    for (let r = 0; r < numRows && wordIdx < sized.length; r++) {
      let usedWidth = 0;
      const rowW = rows[r].targetWidth;

      while (wordIdx < sized.length) {
        const w = sized[wordIdx];
        // Clamp font size so word fits in row
        const maxFontForRow = rowW / (w.word.length * 0.52 + 0.5);
        const clampedSize = Math.min(w.fontSize, maxFontForRow);
        const estW = measureWord(w.word, clampedSize);

        if (usedWidth + estW <= rowW + 2 || rows[r].words.length === 0) {
          rows[r].words.push({ ...w, fontSize: clampedSize });
          usedWidth += estW;
          wordIdx++;
        } else {
          break;
        }
      }
    }

    // Put remaining into last rows
    while (wordIdx < sized.length) {
      const lastRow = rows[rows.length - 1];
      lastRow.words.push(sized[wordIdx]);
      wordIdx++;
    }

    // Fill empty gaps with small filler words
    let fillerIdx = 0;
    for (let r = 0; r < rows.length; r++) {
      const row = rows[r];
      let usedWidth = row.words.reduce((sum, w) => sum + measureWord(w.word, w.fontSize), 0);
      const gap = row.targetWidth - usedWidth;

      if (gap > 20 && row.words.length > 0) {
        // Try to fill with small words
        let attempts = 0;
        while (usedWidth < row.targetWidth - 8 && attempts < 15) {
          const filler = FILLER_WORDS[fillerIdx % FILLER_WORDS.length];
          fillerIdx++;
          const fillerSize = 8 + Math.random() * 4;
          const fw = measureWord(filler, fillerSize);
          if (usedWidth + fw <= row.targetWidth + 2) {
            row.words.push({
              word: filler,
              count: 0,
              fontSize: fillerSize,
              ratio: 0,
              isUser: false,
              isFiller: true,
            });
            usedWidth += fw;
          }
          attempts++;
        }
      }
    }

    return rows.filter(r => r.words.length > 0);
  }, [words]);

  // SVG silhouette
  const silhouettePath = useMemo(() => {
    const h = 700, cx = 250, hw = 250, steps = 80;
    const left: string[] = [], right: string[] = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const y = t * h;
      const w = towerProfile(t) * hw;
      left.push(`${cx - w},${y}`);
      right.unshift(`${cx + w},${y}`);
    }
    return `M ${left.join(" L ")} L ${right.join(" L ")} Z`;
  }, []);

  if (tower.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground text-lg">Введите слово, чтобы начать строить башню</p>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col items-center py-8 select-none">
      {/* Faint silhouette guide */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none opacity-40"
        viewBox="0 0 500 700"
        preserveAspectRatio="xMidYMid meet"
        style={{ top: '32px' }}
      >
        <path d={silhouettePath} fill="none" stroke="hsl(35 80% 40% / 0.08)" strokeWidth="1" />
      </svg>

      {/* Words */}
      <div className="relative z-10 flex flex-col items-center" style={{ gap: '1px' }}>
        {tower.map((row, ri) => (
          <div
            key={ri}
            className="flex items-baseline justify-center flex-nowrap overflow-hidden"
            style={{
              gap: "2px",
              lineHeight: 1.1,
              maxWidth: `${row.targetWidth}px`,
            }}
          >
            {row.words.map((w, wi) => (
              <span
                key={`${w.word}-${ri}-${wi}`}
                className="whitespace-nowrap"
                style={{
                  fontSize: `${w.fontSize}px`,
                  color: w.isFiller
                    ? `hsl(30, 50%, 35%)`
                    : `hsl(${30 + w.ratio * 15}, ${80 + w.ratio * 15}%, ${42 + w.ratio * 33}%)`,
                  textShadow: !w.isFiller && w.ratio > 0.4
                    ? `0 0 ${w.ratio * 12}px hsl(35 95% 55% / 0.3)`
                    : "none",
                  fontWeight: w.isFiller ? 400 : (w.ratio > 0.6 ? 900 : w.ratio > 0.3 ? 700 : 600),
                  opacity: w.isFiller ? 0.35 : (w.isUser ? 1 : 0.75),
                  lineHeight: 1.05,
                }}
              >
                {w.word}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export default WordTower;
