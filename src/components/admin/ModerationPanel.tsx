import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Plus, Loader2, Inbox, Trash2 } from "lucide-react";
import { toast } from "sonner";

export function ModerationPanel() {
  const queryClient = useQueryClient();
  const [input, setInput] = useState("");

  // ─── Approved words ───────────────────────────────────
  const { data: approvedMap = {}, isLoading } = useQuery<Record<string, number>>({
    queryKey: ["approved-words"],
    queryFn: () => fetch("/api/words/approved").then((r) => r.json()),
    refetchInterval: 3000,
  });

  const wordList = Object.entries(approvedMap).sort((a, b) => b[1] - a[1]);

  // ─── Add words ────────────────────────────────────────
  const addMutation = useMutation({
    mutationFn: (words: string) =>
      fetch("/api/words/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ words }),
      }).then((r) => {
        if (!r.ok) return r.json().then((e) => { throw new Error(e.error); });
        return r.json();
      }),
    onSuccess: (data: { added: { word: string; count: number; isNew: boolean }[] }) => {
      queryClient.invalidateQueries({ queryKey: ["approved-words"] });
      setInput("");
      const newCount = data.added.filter((w) => w.isNew).length;
      const dupeCount = data.added.length - newCount;
      let msg = `Добавлено: ${newCount}`;
      if (dupeCount > 0) msg += `, повторов: ${dupeCount}`;
      toast.success(msg);
    },
    onError: (err: Error) => toast.error(err.message || "Ошибка"),
  });

  // ─── Delete word ──────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: (word: string) =>
      fetch(`/api/words/approved/${encodeURIComponent(word)}`, { method: "DELETE" }).then((r) => {
        if (!r.ok) throw new Error("Delete failed");
        return r.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["approved-words"] });
      toast.success("Слово удалено");
    },
    onError: () => toast.error("Ошибка при удалении"),
  });

  const handleAdd = () => {
    if (input.trim()) {
      addMutation.mutate(input.trim());
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Загрузка…</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Add words */}
      <Card>
        <CardHeader>
          <CardTitle>Добавить слова</CardTitle>
          <CardDescription>
            Введите слова через запятую, пробел или перенос строки
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label>Слова</Label>
            <Textarea
              placeholder="привет, мир, добро, радость..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="min-h-[80px]"
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault();
                  handleAdd();
                }
              }}
            />
          </div>
          <Button
            disabled={!input.trim() || addMutation.isPending}
            onClick={handleAdd}
          >
            {addMutation.isPending ? (
              <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Добавление…</>
            ) : (
              <><Plus className="h-4 w-4 mr-2" /> Добавить</>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Word list */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Активные слова
            <Badge variant="secondary">{wordList.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {wordList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Inbox className="h-8 w-8 mb-2" />
              <p className="text-sm">Нет слов. Добавьте слова выше.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Слово</TableHead>
                  <TableHead className="text-center">Частота</TableHead>
                  <TableHead className="text-right">Удалить</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {wordList.map(([word, count]) => (
                  <TableRow key={word}>
                    <TableCell className="font-medium">{word}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline">{count}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => deleteMutation.mutate(word)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
