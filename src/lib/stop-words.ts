const STORAGE_KEY = "wordtower-stop-words";

export function loadStopWords(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveStopWords(words: string[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(words));
}
