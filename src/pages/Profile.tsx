import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/contexts/AuthContext';
import { getProfile, updateProfile } from '@/lib/api';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LogOut, User, Sparkles, ChevronDown, Palette, Type, LayoutGrid, RotateCcw, Target } from 'lucide-react';
import { AIInsightCard } from '@/components/AIInsightCard';
import { getAIPreferences, getAppFeatures, DEFAULT_AI_PREFERENCES, DEFAULT_APP_FEATURES, type AIPreferences, type AppFeaturePreferences } from '@/lib/ai-insights';
import { TRAINING_GOALS, type TrainingGoal } from '@/lib/constants';
import { toast } from 'sonner';

const AI_FEATURE_LABELS: Record<string, string> = {
  home_summary: 'Briefing diario (Inicio)',
  exercise_analysis: 'Análisis de ejercicios',
  routine_review: 'Evaluación de rutinas',
  session_feedback: 'Feedback de sesión',
  fatigue_advice: 'Consejo de fatiga',
  measurement_insight: 'Análisis corporal',
  program_review: 'Evaluación de programa',
  calendar_patterns: 'Patrones de calendario',
  monthly_report_narrative: 'Narrativa del informe',
  profile_recommendations: 'Recomendaciones de perfil',
  new_session_suggestion: 'Sugerencia de sesión',
};

const THEME_OPTIONS = [
  { value: 'dark-orange', label: '🟠 Naranja' },
  { value: 'dark-blue', label: '🔵 Azul' },
  { value: 'dark-green', label: '🟢 Verde' },
  { value: 'dark-purple', label: '🟣 Morado' },
  { value: 'dark-red', label: '🔴 Rojo' },
];

const APP_FEATURE_GROUPS: { title: string; keys: { key: keyof AppFeaturePreferences; label: string }[] }[] = [
  {
    title: '🏠 Pantalla de Inicio',
    keys: [
      { key: 'home_weekly_activity', label: 'Actividad semanal' },
      { key: 'home_quick_stats', label: 'Estadísticas rápidas' },
      { key: 'home_streak', label: 'Racha de entrenamiento' },
      { key: 'home_today_routine', label: 'Sugerencia de rutina' },
      { key: 'home_recent_sessions', label: 'Sesiones recientes' },
      { key: 'home_quick_actions', label: 'Accesos rápidos' },
    ],
  },
  {
    title: '📊 Análisis (tabs)',
    keys: [
      { key: 'analysis_exercise', label: 'Ejercicio' },
      { key: 'analysis_muscle', label: 'Músculo' },
      { key: 'analysis_volume', label: 'Volumen' },
      { key: 'analysis_1rm', label: '1RM' },
      { key: 'analysis_prs', label: 'PRs' },
      { key: 'analysis_body', label: 'Cuerpo' },
      { key: 'analysis_relative', label: 'F. Relativa' },
      { key: 'analysis_summary', label: 'Resumen' },
    ],
  },
  {
    title: '🔥 Fatiga',
    keys: [
      { key: 'fatigue_heatmap', label: 'Mapa de fatiga' },
      { key: 'fatigue_history', label: 'Historial de fatiga' },
      { key: 'fatigue_critical', label: 'Músculos críticos' },
      { key: 'fatigue_overview', label: 'Resumen general' },
    ],
  },
  {
    title: '📱 Secciones del menú',
    keys: [
      { key: 'nav_coach', label: 'Coach IA' },
      { key: 'nav_fatigue', label: 'Fatiga' },
      { key: 'nav_measurements', label: 'Medidas' },
      { key: 'nav_programs', label: 'Programas' },
      { key: 'nav_calendar', label: 'Calendario' },
      { key: 'nav_report', label: 'Informe mensual' },
    ],
  },
];

export default function Profile() {
  const { user, signOut } = useAuth();
  const queryClient = useQueryClient();
  const { data: profile } = useQuery({ queryKey: ['profile'], queryFn: getProfile });
  const [displayName, setDisplayName] = useState('');
  const [units, setUnits] = useState('kg');
  const [heightCm, setHeightCm] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [sex, setSex] = useState('');
  const [userTrainingGoal, setUserTrainingGoal] = useState<TrainingGoal | ''>('');
  const [aiPrefs, setAiPrefs] = useState<AIPreferences>(DEFAULT_AI_PREFERENCES);
  const [appFeatures, setAppFeatures] = useState<AppFeaturePreferences>({ ...DEFAULT_APP_FEATURES });
  const [showAiFeatures, setShowAiFeatures] = useState(false);
  const [showAppFeatures, setShowAppFeatures] = useState(false);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name ?? '');
      const prefs = profile.preferences as any;
      setUnits(prefs?.units ?? 'kg');
      setHeightCm((profile as any).height_cm?.toString() ?? '');
      setBirthDate((profile as any).birth_date ?? '');
      setSex((profile as any).sex ?? '');
      setAiPrefs(getAIPreferences(prefs));
      setAppFeatures(getAppFeatures(prefs));
    }
  }, [profile]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { data: { user: u } } = await supabase.auth.getUser();
      if (!u) throw new Error('Not authenticated');
      const updateData: any = {
        display_name: displayName,
        preferences: {
          units,
          ai_enabled: aiPrefs.ai_enabled,
          ai_tone: aiPrefs.ai_tone,
          ai_mood: aiPrefs.ai_mood,
          ai_features: aiPrefs.ai_features,
          font_size: aiPrefs.font_size,
          theme: aiPrefs.theme,
          app_features: appFeatures,
        },
      };
      if (heightCm.trim()) updateData.height_cm = Number(heightCm);
      else updateData.height_cm = null;
      if (birthDate.trim()) updateData.birth_date = birthDate;
      else updateData.birth_date = null;
      updateData.sex = sex || null;
      const { error } = await supabase.from('profiles').update(updateData).eq('user_id', u.id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['profile'] }); toast.success('Perfil actualizado'); },
  });

  const updateAiPref = (key: keyof AIPreferences, value: any) => {
    setAiPrefs(prev => ({ ...prev, [key]: value }));
  };

  const updateAiFeature = (feature: string, enabled: boolean) => {
    setAiPrefs(prev => ({ ...prev, ai_features: { ...prev.ai_features, [feature]: enabled } }));
  };

  const updateAppFeature = (key: keyof AppFeaturePreferences, value: boolean) => {
    setAppFeatures(prev => ({ ...prev, [key]: value }));
  };

  const initials = (displayName || user?.email || '?').slice(0, 2).toUpperCase();

  return (
    <div className="p-4 pb-20 max-w-lg mx-auto">
      <h1 className="text-xl font-black mb-6 flex items-center gap-2">
        <User className="h-5 w-5 text-primary" />
        Perfil
      </h1>

      {/* AI Profile Recommendations */}
      <AIInsightCard
        context="profile_recommendations"
        data={{
          displayName,
          email: user?.email,
          heightCm: heightCm || null,
          birthDate: birthDate || null,
          sex: sex || null,
          units,
        }}
        cacheKey={`profile-${heightCm}-${birthDate}-${sex}`}
        label="✨ Recomendaciones"
      />

      <div className="flex items-center gap-4 mb-6 mt-4 p-4 rounded-xl bg-card border border-border">
        <Avatar className="h-16 w-16 border-2 border-primary/30">
          <AvatarImage src={profile?.avatar_url ?? undefined} />
          <AvatarFallback className="text-lg font-bold bg-secondary text-foreground">{initials}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="font-bold text-lg truncate">{displayName || 'Sin nombre'}</p>
          <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <Label className="text-xs font-semibold text-muted-foreground">Nombre</Label>
          <Input value={displayName} onChange={e => setDisplayName(e.target.value)} className="rounded-lg bg-card border-border" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs font-semibold text-muted-foreground">Altura (cm)</Label>
            <Input inputMode="decimal" placeholder="175" value={heightCm} onChange={e => setHeightCm(e.target.value)} className="rounded-lg bg-card border-border" />
          </div>
          <div>
            <Label className="text-xs font-semibold text-muted-foreground">Fecha nacimiento</Label>
            <Input type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)} className="rounded-lg bg-card border-border" />
          </div>
        </div>
        <div>
          <Label className="text-xs font-semibold text-muted-foreground">Sexo</Label>
          <Select value={sex} onValueChange={setSex}>
            <SelectTrigger className="rounded-lg bg-card border-border"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="male">Masculino</SelectItem>
              <SelectItem value="female">Femenino</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs font-semibold text-muted-foreground">Unidades de peso</Label>
          <Select value={units} onValueChange={setUnits}>
            <SelectTrigger className="rounded-lg bg-card border-border"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="kg">Kilogramos (kg)</SelectItem>
              <SelectItem value="lb">Libras (lb)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Appearance section */}
        <div className="rounded-xl bg-card border border-border p-4 space-y-4">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <Palette className="h-4 w-4 text-primary" />
            Apariencia
          </h3>
          <div>
            <Label className="text-xs font-semibold text-muted-foreground">Tema de color</Label>
            <Select value={aiPrefs.theme} onValueChange={v => updateAiPref('theme', v)}>
              <SelectTrigger className="rounded-lg bg-secondary/50 border-border"><SelectValue /></SelectTrigger>
              <SelectContent>
                {THEME_OPTIONS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Type className="h-4 w-4 text-muted-foreground" />
              <Label className="text-xs font-semibold text-muted-foreground">Letra grande</Label>
            </div>
            <Switch checked={aiPrefs.font_size === 'large'} onCheckedChange={v => updateAiPref('font_size', v ? 'large' : 'normal')} />
          </div>
        </div>

        {/* App Features section */}
        <div className="rounded-xl bg-card border border-border p-4 space-y-3">
          <Collapsible open={showAppFeatures} onOpenChange={setShowAppFeatures}>
            <CollapsibleTrigger className="flex items-center justify-between w-full">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <LayoutGrid className="h-4 w-4 text-primary" />
                Personalizar App
              </h3>
              <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${showAppFeatures ? 'rotate-180' : ''}`} />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <p className="text-xs text-muted-foreground mt-2 mb-3">Activa o desactiva las fichas y secciones que quieras ver.</p>
              <div className="space-y-4">
                {APP_FEATURE_GROUPS.map(group => (
                  <div key={group.title}>
                    <p className="text-xs font-bold text-muted-foreground mb-2">{group.title}</p>
                    <div className="space-y-2">
                      {group.keys.map(({ key, label }) => (
                        <div key={key} className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">{label}</span>
                          <Switch
                            checked={appFeatures[key]}
                            onCheckedChange={v => updateAppFeature(key, v)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs rounded-lg"
                  onClick={() => setAppFeatures({ ...DEFAULT_APP_FEATURES })}
                >
                  <RotateCcw className="h-3 w-3 mr-1.5" />
                  Restaurar valores por defecto
                </Button>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>

        {/* AI section */}
        <div className="rounded-xl bg-card border border-border p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Asistente IA
            </h3>
            <Switch checked={aiPrefs.ai_enabled} onCheckedChange={v => updateAiPref('ai_enabled', v)} />
          </div>

          {aiPrefs.ai_enabled && (
            <>
              <div>
                <Label className="text-xs font-semibold text-muted-foreground">Estilo de lenguaje</Label>
                <Select value={aiPrefs.ai_tone} onValueChange={v => updateAiPref('ai_tone', v)}>
                  <SelectTrigger className="rounded-lg bg-secondary/50 border-border"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="technical">🔬 Técnico</SelectItem>
                    <SelectItem value="casual">💬 Coloquial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-semibold text-muted-foreground">Tono</Label>
                <Select value={aiPrefs.ai_mood} onValueChange={v => updateAiPref('ai_mood', v)}>
                  <SelectTrigger className="rounded-lg bg-secondary/50 border-border"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="motivator">🔥 Motivador</SelectItem>
                    <SelectItem value="focused">🎯 Centrado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Collapsible open={showAiFeatures} onOpenChange={setShowAiFeatures}>
                <CollapsibleTrigger className="flex items-center justify-between w-full py-1">
                  <span className="text-xs font-bold text-muted-foreground">Funciones individuales</span>
                  <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${showAiFeatures ? 'rotate-180' : ''}`} />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="space-y-2 pt-2">
                    {Object.entries(AI_FEATURE_LABELS).map(([key, label]) => (
                      <div key={key} className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">{label}</span>
                        <Switch
                          checked={aiPrefs.ai_features[key] !== false}
                          onCheckedChange={v => updateAiFeature(key, v)}
                        />
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </>
          )}
        </div>

        <Button className="w-full rounded-xl gradient-primary text-primary-foreground border-0 font-bold" onClick={() => saveMutation.mutate()}>Guardar</Button>
      </div>

      

      <div className="mt-8 pt-6 border-t border-border">
        <Button variant="outline" className="w-full rounded-xl border-destructive/30 text-destructive hover:bg-destructive/10" onClick={signOut}>
          <LogOut className="h-4 w-4 mr-2" />
          Cerrar sesión
        </Button>
      </div>
    </div>
  );
}
