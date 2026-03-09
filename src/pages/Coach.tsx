import { useState, useRef, useEffect, useCallback } from 'react';
import { Brain, Loader2, ArrowLeft, Send, RotateCcw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { getCoachData } from '@/db/coach-data';
import { streamCoachChat, type ChatMsg } from '@/lib/stream-chat';
import ReactMarkdown from 'react-markdown';

export default function Coach() {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [coachDataRef, setCoachDataRef] = useState<any>(null);
  const [initializing, setInitializing] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }, 50);
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  const startConsultation = async () => {
    setInitializing(true);
    try {
      const data = await getCoachData();
      if (!data.exercises.length && !data.weeklyMuscleSets.length) {
        toast({ title: 'Sin datos suficientes', description: 'Necesitas al menos algunas sesiones para consultar al Coach.', variant: 'destructive' });
        setInitializing(false);
        return;
      }
      setCoachDataRef(data);

      // Start streaming initial analysis
      setStreaming(true);
      const controller = new AbortController();
      abortRef.current = controller;

      let assistantContent = '';
      const initialMsg: ChatMsg = { role: 'user', content: 'Analiza mi entrenamiento', isInitial: true };

      setMessages([initialMsg]);

      await streamCoachChat({
        messages: [initialMsg],
        coachData: data,
        signal: controller.signal,
        onDelta: (chunk) => {
          assistantContent += chunk;
          setMessages(prev => {
            const last = prev[prev.length - 1];
            if (last?.role === 'assistant') {
              return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantContent } : m);
            }
            return [...prev, { role: 'assistant', content: assistantContent }];
          });
          scrollToBottom();
        },
        onDone: () => { setStreaming(false); },
        onError: (err) => {
          toast({ title: 'Error', description: err, variant: 'destructive' });
          setStreaming(false);
        },
      });
    } catch (e: any) {
      toast({ title: 'Error', description: e?.message ?? 'Error al cargar datos', variant: 'destructive' });
    } finally {
      setInitializing(false);
      setStreaming(false);
    }
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || streaming) return;
    setInput('');

    const userMsg: ChatMsg = { role: 'user', content: text };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setStreaming(true);
    scrollToBottom();

    const controller = new AbortController();
    abortRef.current = controller;
    let assistantContent = '';

    await streamCoachChat({
      messages: updatedMessages,
      coachData: coachDataRef, // always send context
      signal: controller.signal,
      onDelta: (chunk) => {
        assistantContent += chunk;
        setMessages(prev => {
          const last = prev[prev.length - 1];
          if (last?.role === 'assistant') {
            return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantContent } : m);
          }
          return [...prev, { role: 'assistant', content: assistantContent }];
        });
        scrollToBottom();
      },
      onDone: () => { setStreaming(false); },
      onError: (err) => {
        toast({ title: 'Error', description: err, variant: 'destructive' });
        setStreaming(false);
      },
    });
  };

  const resetChat = () => {
    abortRef.current?.abort();
    setMessages([]);
    setCoachDataRef(null);
    setStreaming(false);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const hasStarted = messages.length > 0;

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
        <Link to="/">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-lg font-bold flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" /> Coach IA
          </h1>
          <p className="text-xs text-muted-foreground">Análisis exhaustivo con IA</p>
        </div>
        {hasStarted && (
          <Button variant="ghost" size="icon" onClick={resetChat} title="Nueva consulta">
            <RotateCcw className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Messages area */}
      <ScrollArea className="flex-1 px-4" ref={scrollRef}>
        <div className="py-4 space-y-4">
          {!hasStarted && (
            <div className="flex flex-col items-center justify-center h-full min-h-[50vh] gap-6">
              <div className="text-center space-y-2">
                <Brain className="h-16 w-16 text-primary mx-auto opacity-50" />
                <h2 className="text-lg font-semibold">Coach IA v2</h2>
                <p className="text-sm text-muted-foreground max-w-xs">
                  Análisis completo de volumen, fatiga, periodización, composición corporal, desequilibrios y más.
                </p>
              </div>
              <Button
                onClick={startConsultation}
                disabled={initializing}
                className="h-14 px-8 text-base font-bold gap-2"
                size="lg"
              >
                {initializing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Brain className="h-5 w-5" />}
                {initializing ? 'Cargando datos…' : 'Iniciar consulta'}
              </Button>
            </div>
          )}

          {messages.filter(m => !m.isInitial).map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[90%] rounded-2xl px-4 py-3 text-sm ${
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground rounded-br-md'
                    : 'bg-muted text-foreground rounded-bl-md'
                }`}
              >
                {msg.role === 'assistant' ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                )}
              </div>
            </div>
          ))}

          {streaming && messages[messages.length - 1]?.role !== 'assistant' && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:0ms]" />
                  <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:150ms]" />
                  <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input area */}
      {hasStarted && (
        <div className="border-t border-border p-3">
          <div className="flex gap-2 items-end">
            <Textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Pregunta al Coach... (ej: ¿por qué estoy estancado en press banca?)"
              className="min-h-[44px] max-h-[120px] resize-none text-sm"
              rows={1}
              disabled={streaming}
            />
            <Button
              size="icon"
              onClick={sendMessage}
              disabled={!input.trim() || streaming}
              className="shrink-0 h-11 w-11"
            >
              {streaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
