import { ExternalLink } from 'lucide-react';

function getYouTubeId(url: string): string | null {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([^&?\s]+)/);
  return match?.[1] ?? null;
}

export function normalizeYouTubeUrl(url: string): string {
  const id = getYouTubeId(url);
  return id ? `https://www.youtube.com/watch?v=${id}` : url;
}

export default function VideoPreview({ url }: { url: string }) {
  const ytId = getYouTubeId(url);

  if (ytId) {
    return (
      <div className="w-full aspect-video rounded-lg overflow-hidden border border-border">
        <iframe
          src={`https://www.youtube.com/embed/${ytId}`}
          className="w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title="Video del ejercicio"
        />
      </div>
    );
  }

  return (
    <a href={normalizeYouTubeUrl(url)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-primary hover:underline">
      <ExternalLink className="h-3.5 w-3.5" />
      Ver video
    </a>
  );
}
