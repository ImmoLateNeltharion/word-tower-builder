import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { QrCode, Bot } from 'lucide-react';
import { toast } from "sonner";

const QR_FALLBACK = 'https://t.me/YourBotUsername';

type SettingsResponse = {
  botLink: string;
  hasBotToken: boolean;
  botTokenMasked: string;
  tokenSource: "database" | "env" | null;
  botRunning: boolean;
  botUsername: string | null;
};

export function SettingsPanel() {
  const queryClient = useQueryClient();
  const { data } = useQuery<SettingsResponse>({
    queryKey: ["admin-settings"],
    queryFn: () => fetch("/api/settings").then((r) => {
      if (!r.ok) throw new Error("Failed to load settings");
      return r.json();
    }),
  });

  const [url, setUrl] = useState(QR_FALLBACK);
  const [botToken, setBotToken] = useState("");
  const [saved, setSaved] = useState(false);
  const [tokenSaved, setTokenSaved] = useState(false);

  useEffect(() => {
    if (!data) return;
    setUrl(data.botLink || QR_FALLBACK);
  }, [data]);

  const saveLinkMutation = useMutation({
    mutationFn: async (botLink: string) => {
      const r = await fetch("/api/settings/bot-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ botLink }),
      });
      if (!r.ok) {
        const e = await r.json().catch(() => ({ error: "Failed to save bot link" }));
        throw new Error(e.error || "Failed to save bot link");
      }
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-settings"] });
      queryClient.invalidateQueries({ queryKey: ["public-settings"] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      toast.success("Ссылка сохранена");
    },
    onError: (err: Error) => toast.error(err.message || "Ошибка сохранения ссылки"),
  });

  const saveTokenMutation = useMutation({
    mutationFn: async (token: string) => {
      const r = await fetch("/api/settings/bot-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (!r.ok) {
        const e = await r.json().catch(() => ({ error: "Failed to save bot token" }));
        throw new Error(e.error || "Failed to save bot token");
      }
      return r.json();
    },
    onSuccess: () => {
      setBotToken("");
      queryClient.invalidateQueries({ queryKey: ["admin-settings"] });
      setTokenSaved(true);
      setTimeout(() => setTokenSaved(false), 2000);
      toast.success("Токен обновлен");
    },
    onError: (err: Error) => toast.error(err.message || "Ошибка обновления токена"),
  });

  const save = () => {
    saveLinkMutation.mutate(url.trim());
  };

  const saveToken = () => {
    saveTokenMutation.mutate(botToken.trim());
  };

  const qrPreview = url.trim() || QR_FALLBACK;

  return (
    <div className="space-y-4">
      {/* QR settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            QR-код
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-6 items-start flex-wrap">
            <div className="flex-1 min-w-[220px] space-y-3">
              <div className="space-y-1">
                <Label htmlFor="qr-url">URL (ссылка или текст)</Label>
                <Input
                  id="qr-url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://t.me/..."
                />
              </div>
              <Button
                onClick={save}
                disabled={!url.trim() || saveLinkMutation.isPending}
                variant={saved ? 'default' : 'outline'}
                className="w-full sm:w-auto"
              >
                {saved ? '✓ Сохранено' : 'Сохранить'}
              </Button>
              <p className="text-xs text-muted-foreground">
                QR на главной странице обновится автоматически при смене URL.
              </p>
            </div>
            <div className="shrink-0">
              <div className="p-3 bg-white rounded-lg shadow-sm inline-block">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(qrPreview)}&size=300x300&margin=6`}
                  width={150}
                  height={150}
                  alt="QR preview"
                />
              </div>
              <p className="text-xs text-muted-foreground text-center mt-1">Предпросмотр</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Telegram бот
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm text-muted-foreground">
            <p>Статус: {data?.botRunning ? "запущен" : "остановлен"}</p>
            <p>Бот: {data?.botUsername || "не определен"}</p>
            <p>Токен: {data?.hasBotToken ? data.botTokenMasked : "не задан"}</p>
            <p>Источник токена: {data?.tokenSource || "нет"}</p>
          </div>

          <div className="space-y-1">
            <Label htmlFor="bot-token">Новый токен</Label>
            <Input
              id="bot-token"
              type="password"
              value={botToken}
              onChange={(e) => setBotToken(e.target.value)}
              placeholder="123456:ABC..."
            />
          </div>

          <div className="flex gap-2 flex-wrap">
            <Button
              onClick={saveToken}
              disabled={!botToken.trim() || saveTokenMutation.isPending}
              variant={tokenSaved ? "default" : "outline"}
            >
              {tokenSaved ? "✓ Обновлено" : "Обновить токен"}
            </Button>
            <Button
              variant="destructive"
              onClick={() => saveTokenMutation.mutate("")}
              disabled={saveTokenMutation.isPending}
            >
              Отключить бота
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            После сохранения токена бот перезапускается автоматически.
          </p>
        </CardContent>
      </Card>

    </div>
  );
}
