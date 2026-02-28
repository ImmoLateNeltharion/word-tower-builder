import { useMemo, useRef, useEffect, useState } from "react";

interface WordTowerProps {
  words: Record<string, number>;
}

const FILLER_WORDS = [
  "свет", "мир", "путь", "дар", "лад", "дух", "ритм", "шаг", "жар", "миг",
  "тон", "луч", "вид", "час", "дом", "сон", "ход", "зов", "рай", "бег",
  "жизнь", "вера", "воля", "тепло", "суть", "связь", "явь", "лик", "нрав",
  "след", "блик", "рост", "толк", "пыл", "взлёт", "клад", "край", "старт",
  "смысл", "честь", "труд", "плод", "весть", "блеск", "гимн", "знак", "круг",
  "ум", "да", "ок", "мы", "ты", "он", "я", "до", "по", "за",
  "огонь", "нота", "тень", "дождь", "ветер", "река", "заря", "пик", "код",
  "сад", "лес", "день", "ночь", "год", "век", "мост", "порт", "центр",
  "глаз", "рука", "лёд", "гром", "штиль", "нить", "стиль", "ключ",
  "роль", "факт", "темп", "план", "курс", "фон", "цвет", "форма", "точка",
  "идея", "опора", "база", "цена", "сеть", "связь", "корень", "поток", "грань",
  "мера", "доля", "суть", "взор", "пласт", "слой", "ярус", "скала", "стена",
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

// Tower silhouette profile: t=0 top, t=1 bottom. Returns half-width factor 0..1
// Namsan Tower shape: antenna tip → observation deck bulge → narrow shaft → wider base
function towerProfile(t: number): number {
  if (t < 0.03) return 0.02;                          // thin antenna tip
  if (t < 0.08) {
    const s = (t - 0.03) / 0.05;
    return 0.02 + s * 0.33;                           // 0.02 → 0.35 (expand to observation deck)
  }
  if (t < 0.20) {
    const s = (t - 0.08) / 0.12;
    const bulge = Math.sin(s * Math.PI);
    return 0.35 + bulge * 0.10;                       // 0.35 → 0.45 peak → 0.35 (observation deck)
  }
  if (t < 0.30) {
    const s = (t - 0.20) / 0.10;
    return 0.35 - s * 0.10;                           // 0.35 → 0.25 (narrow to shaft)
  }
  if (t < 0.80) {
    const s = (t - 0.30) / 0.50;
    return 0.25 + s * 0.05;                           // 0.25 → 0.30 (long narrow shaft)
  }
  const s = (t - 0.80) / 0.20;
  return 0.30 + s * s * 0.40;                         // 0.30 → 0.70 (base widens)
}

function measureWord(word: string, fontSize: number): number {
  return word.length * fontSize * 0.55 + 6;
}

type PlacedWord = {
  word: string;
  fontSize: number;
  ratio: number;
  isUser: boolean;
  isFiller: boolean;
  x: number;
};

type TowerRow = {
  placedWords: PlacedWord[];
  targetWidth: number;
  rowT: number;
  height: number;
};

const WordTower = ({ words }: WordTowerProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(700);
  const [containerHeight, setContainerHeight] = useState(600);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      if (width > 0) setContainerWidth(Math.floor(width));
      if (height > 0) setContainerHeight(Math.floor(height));
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const tower = useMemo(() => {
    const maxFontByWidth = containerWidth * 0.124;
    const maxFontByHeight = containerHeight / 22;
    const maxFontSize = Math.max(11, Math.min(maxFontByWidth, maxFontByHeight, 240));
    const minFontSize = Math.max(9, containerWidth * 0.014);
    const numRows = 15;

    const merged = { ...PLACEHOLDER_WORDS };
    for (const [w, c] of Object.entries(words)) {
      merged[w] = (merged[w] || 0) + c;
    }

    const entries = Object.entries(merged);
    if (entries.length === 0) return [];

    const maxCount = Math.max(...entries.map(([, c]) => c));
    const minCount = Math.min(...entries.map(([, c]) => c));

    type WordEntry = { word: string; count: number; fontSize: number; ratio: number; isUser: boolean };

    const allWords: WordEntry[] = entries.map(([word, count]) => {
      const ratio = maxCount === minCount ? 0.5 : (count - minCount) / (maxCount - minCount);
      const fontSize = minFontSize + ratio * (maxFontSize - minFontSize);
      return { word, count, fontSize, ratio, isUser: word in words };
    });

    allWords.sort((a, b) => b.count - a.count);

    // Cap tower layout width so it doesn't stretch too wide on big screens
    const towerWidth = Math.min(containerWidth, 420);

    const rows: TowerRow[] = [];
    for (let r = 0; r < numRows; r++) {
      const t = r / (numRows - 1);
      const w = towerProfile(t) * towerWidth;
      rows.push({ placedWords: [], targetWidth: Math.max(20, w), rowT: t, height: 0 });
    }

    let zigzag = 0;
    const usedWidths = new Array(numRows).fill(0);

    for (const entry of allWords) {
      let bestRow = -1;
      let bestScore = -Infinity;

      for (let r = 0; r < numRows; r++) {
        const row = rows[r];
        const remaining = row.targetWidth - usedWidths[r];
        const maxFontForRow = remaining / (entry.word.length * 0.55 + 0.5);
        const clampedSize = Math.min(entry.fontSize, Math.max(7, maxFontForRow));
        const wordW = measureWord(entry.word, clampedSize);

        if (usedWidths[r] + wordW <= row.targetWidth + 4) {
          const fillRatio = usedWidths[r] / row.targetWidth;
          const sizeRatio = clampedSize / entry.fontSize;
          const score = sizeRatio * 80 + (1 - fillRatio) * 20;
          if (score > bestScore) {
            bestScore = score;
            bestRow = r;
          }
        }
      }

      if (bestRow === -1) {
        let maxRemaining = -1;
        for (let r = 0; r < numRows; r++) {
          const rem = rows[r].targetWidth - usedWidths[r];
          if (rem > maxRemaining) { maxRemaining = rem; bestRow = r; }
        }
      }

      const row = rows[bestRow];
      const maxFont = (row.targetWidth - usedWidths[bestRow]) / (entry.word.length * 0.55 + 0.5);
      const fontSize = Math.max(7, Math.min(entry.fontSize, maxFont));
      const wordW = measureWord(entry.word, fontSize);

      const availableOffset = (row.targetWidth - usedWidths[bestRow] - wordW) / 2;
      const offset = availableOffset > 4 ? (zigzag % 2 === 0 ? -1 : 1) * Math.min(availableOffset * 0.3, 12) : 0;

      row.placedWords.push({
        word: entry.word,
        fontSize,
        ratio: entry.ratio,
        isUser: entry.isUser,
        isFiller: false,
        x: offset,
      });
      usedWidths[bestRow] += wordW;
      row.height = Math.max(row.height, fontSize * 1.15);
      zigzag++;
    }

    // Fill remaining space with filler words
    const fillerMinSize = Math.max(7, containerWidth * 0.008);
    const fillerMaxSize = fillerMinSize + Math.max(3, containerWidth * 0.004);
    let fillerIdx = 0;

    for (let r = 0; r < numRows; r++) {
      const row = rows[r];
      let used = usedWidths[r];
      let attempts = 0;

      while (used < row.targetWidth - 4 && attempts < 50) {
        const filler = FILLER_WORDS[fillerIdx % FILLER_WORDS.length];
        fillerIdx++;
        const fillerSize = fillerMinSize + Math.random() * (fillerMaxSize - fillerMinSize);
        const fw = measureWord(filler, fillerSize);

        if (used + fw <= row.targetWidth + 2) {
          row.placedWords.push({
            word: filler, fontSize: fillerSize, ratio: 0,
            isUser: false, isFiller: true, x: 0,
          });
          used += fw;
          if (row.height === 0) row.height = fillerSize * 1.2;
        }
        attempts++;
      }
      usedWidths[r] = used;
    }

    for (let r = 0; r < numRows; r++) {
      const row = rows[r];
      if (row.placedWords.length === 0 && row.targetWidth > 15) {
        let used = 0;
        let attempts = 0;
        while (used < row.targetWidth - 4 && attempts < 40) {
          const filler = FILLER_WORDS[fillerIdx % FILLER_WORDS.length];
          fillerIdx++;
          const fillerSize = fillerMinSize + Math.random() * (fillerMaxSize - fillerMinSize) * 0.7;
          const fw = measureWord(filler, fillerSize);
          if (used + fw <= row.targetWidth + 2) {
            row.placedWords.push({
              word: filler, fontSize: fillerSize, ratio: 0,
              isUser: false, isFiller: true, x: 0,
            });
            used += fw;
            row.height = Math.max(row.height, fillerSize * 1.2);
          }
          attempts++;
        }
      }
    }

    return rows.filter(r => r.placedWords.length > 0);
  }, [words, containerWidth, containerHeight]);

  const { silhouettePath, svgHeight } = useMemo(() => {
    const cw = Math.min(containerWidth, 420);
    const h = cw * 1.1;
    const cx = cw / 2;
    const hw = cw / 2;
    const steps = 80;
    const left: string[] = [], right: string[] = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const y = t * h;
      const w = towerProfile(t) * hw;
      left.push(`${cx - w},${y}`);
      right.unshift(`${cx + w},${y}`);
    }
    return {
      silhouettePath: `M ${left.join(" L ")} L ${right.join(" L ")} Z`,
      svgHeight: h,
    };
  }, [containerWidth]);

  if (tower.length === 0) {
    return (
      <div ref={containerRef} className="w-full h-full flex items-center justify-center py-20">
        <p className="text-muted-foreground text-lg">Введите слово, чтобы начать строить башню</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative w-full h-full flex flex-col items-center justify-center py-8 select-none">
      {/* Word rows with glow behind */}
      <div className="relative flex flex-col items-center" style={{ gap: '0px' }}>
        {/* Blurred glow silhouette behind the tower */}
        <svg
          className="absolute pointer-events-none"
          viewBox={`0 0 ${Math.min(containerWidth, 420)} ${svgHeight}`}
          preserveAspectRatio="xMidYMid meet"
          style={{
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: `${Math.min(containerWidth, 420)}px`,
            height: `${svgHeight}px`,
            opacity: 0.3,
            filter: 'blur(30px)',
          }}
        >
          <path d={silhouettePath} fill="hsl(35 70% 40%)" stroke="none" />
        </svg>
        {tower.map((row, ri) => (
          <div
            key={ri}
            className="flex items-baseline justify-center flex-wrap"
            style={{
              gap: "3px",
              lineHeight: 1.05,
              width: `${row.targetWidth}px`,
              minHeight: `${row.height}px`,
            }}
          >
            {row.placedWords.map((w, wi) => (
              <span
                key={`${w.word}-${ri}-${wi}`}
                className="whitespace-nowrap"
                style={{
                  fontSize: `${w.fontSize}px`,
                  color: w.isFiller
                    ? `hsl(30, 40%, 45%)`
                    : `hsl(${32 + w.ratio * 12}, ${75 + w.ratio * 20}%, ${45 + w.ratio * 30}%)`,
                  textShadow: !w.isFiller && w.ratio > 0.4
                    ? `0 0 ${w.ratio * 15}px hsl(35 90% 55% / 0.35)`
                    : "none",
                  fontWeight: w.isFiller ? 400 : (w.ratio > 0.6 ? 900 : w.ratio > 0.3 ? 700 : 600),
                  opacity: w.isFiller ? 0.4 : (w.isUser ? 1 : 0.8),
                  lineHeight: 1.0,
                  marginLeft: !w.isFiller && w.x ? `${w.x}px` : undefined,
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
