import { useEffect, useState, useCallback, useRef } from 'react';
import { updateSet as updateSetApi } from '@/lib/api';
import { toast } from 'sonner';

interface QueuedMutation {
  setId: string;
  data: Record<string, unknown>;
  timestamp: number;
}

const STORAGE_KEY = 'offline_queue';

function loadQueue(): QueuedMutation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveQueue(queue: QueuedMutation[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
}

export function useOfflineQueue() {
  const [queue, setQueue] = useState<QueuedMutation[]>(loadQueue);
  const processingRef = useRef(false);

  const enqueue = useCallback((setId: string, data: Record<string, unknown>) => {
    const item: QueuedMutation = { setId, data, timestamp: Date.now() };
    setQueue(prev => {
      // Replace existing entry for same setId or append
      const filtered = prev.filter(q => q.setId !== setId);
      const next = [...filtered, item];
      saveQueue(next);
      return next;
    });
  }, []);

  const processQueue = useCallback(async () => {
    if (processingRef.current) return;
    const pending = loadQueue();
    if (pending.length === 0) return;

    processingRef.current = true;
    const failed: QueuedMutation[] = [];

    for (const item of pending) {
      try {
        await updateSetApi(item.setId, item.data as any);
      } catch {
        failed.push(item);
      }
    }

    saveQueue(failed);
    setQueue(failed);
    processingRef.current = false;

    if (failed.length === 0 && pending.length > 0) {
      toast.success('Datos sincronizados correctamente');
    } else if (failed.length > 0) {
      toast.error(`${failed.length} cambios pendientes de sincronizar`);
    }
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      processQueue();
    };
    window.addEventListener('online', handleOnline);
    // Try on mount too
    if (navigator.onLine && loadQueue().length > 0) {
      processQueue();
    }
    return () => window.removeEventListener('online', handleOnline);
  }, [processQueue]);

  return { queue, enqueue, hasPending: queue.length > 0, processQueue };
}
