import { useState, useCallback, useEffect, useRef } from 'react';
import { Sparkles } from 'lucide-react';
import { fetchInsight, getAIPreferences, type InsightContext } from '@/lib/ai-insights';
import { useQuery } from '@tanstack/react-query';
import { getProfile } from '@/lib/api';
import type { WorkoutSet } from '@/lib/api';
import type { TrainingGoal, TrackingType } from '@/lib/constants';

interface AISetCoachProps {
  exerciseName: string;
  currentSet: WorkoutSet;
  setIndex: number;
  previousSets: WorkoutSet[];
  trainingGoal: TrainingGoal | null;
  trackingType: TrackingType;
}

export function AISetCoach({ exerciseName, currentSet, setIndex, previousSets, trainingGoal, trackingType }: AISetCoachProps) {
  const { data: profile } = useQuery({ queryKey: ['profile'], queryFn: getProfile });
  const prefs = getAIPreferences(profile?.preferences);

  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const lastFetchRef = useRef<string>('');
  const cooldownRef = useRef(false);

  // Build a fingerprint of the current set to detect changes
  const setFingerprint = `${currentSet.id}-${currentSet.weight}-${currentSet.reps}-${currentSet.rpe}-${currentSet.duration_seconds}`;

  const isWorkSet = currentSet.set_type === 'work' || currentSet.set_type === 'drop_set';
  const hasData = trackingType === 'weight_reps'
    ? (currentSet.weight != null && currentSet.reps != null && currentSet.rpe != null)
    : trackingType === 'reps_only'
      ? (currentSet.reps != null && currentSet.rpe != null)
      : trackingType === 'time_only'
        ? (currentSet.duration_seconds != null && currentSet.rpe != null)
        : (currentSet.rpe != null);

  const shouldFetch = isWorkSet && hasData && !cooldownRef.current && lastFetchRef.current !== setFingerprint;

  const doFetch = useCallback(async () => {
    if (!shouldFetch || !prefs.ai_enabled || prefs.ai_features['set_coaching'] === false) return;

    cooldownRef.current = true;
    lastFetchRef.current = setFingerprint;
    setLoading(true);

    try {
      const data: Record<string, unknown> = {
        exerciseName,
        trackingType,
        trainingGoal: trainingGoal ?? 'hypertrophy',
        setIndex: setIndex + 1,
        currentSet: {
          weight: currentSet.weight,
          reps: currentSet.reps,
          rpe: currentSet.rpe,
          duration_seconds: currentSet.duration_seconds,
          distance_meters: currentSet.distance_meters,
          set_type: currentSet.set_type,
        },
        previousSetsInSession: previousSets.map(s => ({
          weight: s.weight, reps: s.reps, rpe: s.rpe,
          duration_seconds: s.duration_seconds, set_type: s.set_type,
        })),
      };

      const result = await fetchInsight('set_coaching' as InsightContext, data, prefs.ai_tone, prefs.ai_mood);
      setSuggestion(result);
    } catch {
      // Silently fail — non-critical
    } finally {
      setLoading(false);
      setTimeout(() => { cooldownRef.current = false; }, 15000);
    }
  }, [shouldFetch, setFingerprint, exerciseName, trackingType, trainingGoal, setIndex, currentSet, previousSets, prefs]);

  useEffect(() => {
    if (shouldFetch) doFetch();
  }, [shouldFetch, doFetch]);

  if (!prefs.ai_enabled || prefs.ai_features['set_coaching'] === false) return null;
  if (!isWorkSet || !hasData) return null;

  if (loading) {
    return (
      <div className="flex items-center gap-1.5 pl-8 mt-0.5">
        <Sparkles className="h-3 w-3 text-primary animate-pulse" />
        <span className="text-[10px] text-muted-foreground">Analizando...</span>
      </div>
    );
  }

  if (!suggestion) return null;

  return (
    <div className="flex items-start gap-1.5 pl-8 mt-0.5">
      <Sparkles className="h-3 w-3 text-primary shrink-0 mt-0.5" />
      <p className="text-[10px] font-medium text-primary/90 leading-tight">{suggestion}</p>
    </div>
  );
}
