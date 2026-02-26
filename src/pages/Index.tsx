import { useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import WordTower from "@/components/WordTower";

const INITIAL_WORDS: Record<string, number> = {
  "люди": 25, "сеул": 20, "рост": 18, "инновации": 16, "команда": 14,
  "доверие": 13, "развитие": 12, "событие": 11, "поездка": 10, "корея": 10,
  "компания": 9, "технологии": 9, "будущее": 8, "опыт": 8, "знания": 8,
  "обучение": 7, "партнёры": 7, "возможности": 7, "прогресс": 7, "успех": 6,
  "стоматология": 6, "встреча": 6, "впечатления": 6, "коллеги": 6, "мотивация": 5,
  "общение": 5, "путешествие": 5, "культура": 5, "дружба": 5, "вдохновение": 5,
  "цели": 4, "качество": 4, "результат": 4, "энергия": 4, "радость": 4,
  "поддержка": 4, "профессионализм": 4, "наука": 4, "медицина": 3, "сервис": 3,
  "лидерство": 3, "эмоции": 3, "перспектива": 3, "амбиции": 3, "стратегия": 3,
  "конференция": 3, "прорыв": 3, "единство": 3, "открытие": 3, "благодарность": 3,
  "семья": 2, "здоровье": 2, "образование": 2, "творчество": 2, "свобода": 2,
  "ответственность": 2, "честность": 2, "уважение": 2, "традиции": 2, "гармония": 2,
  "мечта": 2, "сила": 2, "решение": 2, "идея": 2, "связь": 2,
  "прибыль": 2, "клиенты": 2, "рынок": 2, "продукт": 2, "бренд": 2,
  "диагностика": 1, "рентген": 1, "сенсор": 1, "панорама": 1, "томография": 1,
  "цифровизация": 1, "интеграция": 1, "платформа": 1, "экосистема": 1, "глобализация": 1,
  "выставка": 1, "презентация": 1, "демонстрация": 1, "мастеркласс": 1, "воркшоп": 1,
  "нетворкинг": 1, "ужин": 1, "экскурсия": 1, "храм": 1, "дворец": 1,
  "кухня": 1, "кимчи": 1, "ханбок": 1, "хангыль": 1, "метро": 1,
};

const Index = () => {
  const [words, setWords] = useState<Record<string, number>>(INITIAL_WORDS);
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
    <div className="min-h-screen flex flex-col items-center bg-background">
      {/* Header */}
      <header className="w-full text-center pt-12 pb-6 px-4">
        <h1 className="text-3xl md:text-4xl font-black text-foreground tracking-tight">
          Башня Слов
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Введите слово — и оно станет частью башни
        </p>
      </header>

      {/* Input */}
      <div className="flex gap-2 w-full max-w-md px-4 mb-2">
        <Input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Напишите слово..."
          className="bg-card border-border text-foreground placeholder:text-muted-foreground text-lg h-12"
        />
        <Button onClick={addWord} className="h-12 px-6 font-bold text-base">
          Добавить
        </Button>
      </div>

      {totalWords > 0 && (
        <p className="text-muted-foreground text-xs mb-4">
          {totalWords} {totalWords === 1 ? "слово" : "слов"} · {Object.keys(words).length} уникальных
        </p>
      )}

      {/* Tower */}
      <div className="w-full max-w-3xl px-4 flex-1">
        <WordTower words={words} />
      </div>
    </div>
  );
};

export default Index;
