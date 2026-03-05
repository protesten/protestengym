

## Optimización de rendimiento: Code splitting y lazy loading

### Problema principal
Lighthouse reporta **284 KiB de JavaScript sin usar** en la carga inicial. Esto ocurre porque todas las 16 páginas se importan estáticamente en `App.tsx`, generando un único bundle monolítico (`index-DOzfjKOZ.js` de 417 KB). El usuario solo necesita una página a la vez.

### Solución

#### 1. Lazy loading de todas las páginas (`src/App.tsx`)
Reemplazar los 16 imports estáticos por `React.lazy()` + `Suspense`:

```typescript
import { lazy, Suspense } from "react";

const Index = lazy(() => import("./pages/Index"));
const Exercises = lazy(() => import("./pages/Exercises"));
const Routines = lazy(() => import("./pages/Routines"));
// ... todas las demás páginas
```

Envolver las rutas en `<Suspense fallback={<LoadingSpinner />}>` para mostrar un indicador de carga mientras se descarga el chunk de cada página.

#### 2. Componente de carga ligero
Crear un spinner/skeleton simple y ligero que se muestre durante la carga de cada chunk.

#### 3. Vite manual chunks (`vite.config.ts`)
Separar las dependencias pesadas (recharts, html2canvas, date-fns) en chunks independientes para mejorar el cacheo:

```typescript
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        'vendor-react': ['react', 'react-dom', 'react-router-dom'],
        'vendor-ui': ['@radix-ui/react-dialog', '@radix-ui/react-popover', ...],
        'vendor-charts': ['recharts'],
        'vendor-supabase': ['@supabase/supabase-js'],
      }
    }
  }
}
```

Esto permite que el navegador cachee las librerías por separado y solo descargue el código de la página que el usuario visita.

### Impacto esperado
- Reducción del bundle inicial de ~417 KB a ~80-120 KB (solo React + router + auth)
- Cada página se carga bajo demanda (~30-80 KB por chunk)
- Mejor cache hit rate al separar vendor chunks
- Mejora directa en FCP, LCP y Speed Index

### Archivos afectados

| Archivo | Cambio |
|---|---|
| `src/App.tsx` | Lazy imports + Suspense wrapper |
| `vite.config.ts` | Manual chunks para vendor splitting |

### Nota sobre otros issues
- **Redirects (230ms)**: Es el redirect del dominio personalizado, no controlable desde código.
- **Cache lifetimes**: Depende de la configuración del servidor/CDN de hosting, no del código fuente.
- **Render-blocking CSS**: El CSS de Vite ya es mínimo (12 KB); no hay ganancia significativa al inlinearlo.

