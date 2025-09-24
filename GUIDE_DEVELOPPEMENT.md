# 🛠️ Guide de Développement - OpenCut

Ce guide détaille l'architecture, les patterns de développement et les meilleures pratiques pour contribuer au projet OpenCut.

## 📐 Architecture du Projet

### Structure Monorepo (Turborepo)
```
OpenCut/
├── apps/
│   ├── web/                    # Application Next.js principale
│   ├── desktop/                # Application Tauri (desktop)
│   ├── bg-remover/             # Service Python de suppression d'arrière-plan
│   └── transcription/          # Service de transcription audio
├── packages/
│   ├── auth/                   # Package d'authentification partagé
│   └── db/                     # Package de base de données partagé
└── [configs & docs]
```

### Stack Technologique

#### Frontend (apps/web/)
- **Next.js 15** - Framework React avec App Router
- **TypeScript 5.8** - Typage statique strict
- **Tailwind CSS 4** - Styling avec design system
- **Zustand** - Gestion d'état (stores multiples)
- **Biome + Ultracite** - Linting et formatage
- **Framer Motion** - Animations et transitions

#### Backend & Services
- **PostgreSQL** - Base de données principale
- **Redis** - Cache et sessions
- **Better Auth** - Système d'authentification
- **Drizzle ORM** - ORM TypeScript-first

#### Médias & Performance
- **MediaBunny** - Décodage vidéo côté client
- **FFmpeg.js** - Traitement vidéo
- **OPFS** - Stockage de fichiers optimisé
- **IndexedDB** - Stockage de métadonnées

## 🏗️ Architecture de l'Éditeur Vidéo

### Système de Stores (Zustand)

#### Store Principal: Timeline (`timeline-store.ts`)
```typescript
interface TimelineStore {
  // État de base
  _tracks: TimelineTrack[];          // Pistes privées
  tracks: TimelineTrack[];           // Pistes ordonnées (getter)
  selectedElements: ElementRef[];     // Sélection multiple
  
  // Actions principales
  addElementToTrack(trackId, element);
  updateElementStartTime(trackId, elementId, time);
  splitSelected(splitTime);
  deleteSelected();
  
  // Historique
  history: TimelineTrack[][];
  undo() / redo();
}
```

#### Store Médias (`media-store.ts`)
```typescript
interface MediaStore {
  mediaFiles: MediaFile[];
  
  // Gestion des fichiers
  addMediaFile(projectId, file);
  removeMediaFile(projectId, id);
  
  // Persistance
  loadProjectMedia(projectId);
  clearProjectMedia(projectId);
}
```

#### Store Lecture (`playback-store.ts`)
```typescript
interface PlaybackStore {
  // État de lecture
  isPlaying: boolean;
  currentTime: number;
  speed: number;
  
  // Contrôles
  play() / pause() / toggle();
  seek(time);
  setSpeed(speed);
}
```

### Système de Rendu Vidéo

#### Cache Vidéo (`video-cache.ts`)
```typescript
class VideoCache {
  // Pool de décodeurs par vidéo
  private sinks: Map<string, VideoSinkData>;
  
  // Récupération de frame avec cache intelligent
  async getFrameAt(mediaId, file, time): Promise<WrappedCanvas>
  
  // Optimisations récentes:
  // - Pool size augmenté: 3 → 8
  // - Protection contre les boucles infinies
  // - Meilleur nettoyage mémoire
}
```

#### Préchargeur Vidéo (`video-preloader.ts`)
```typescript
class VideoPreloader {
  // Queue de préchargement priorisée
  schedulePreload({ currentTime, tracks, mediaFiles });
  
  // Stratégie:
  // - Précharge ±3 secondes autour du temps actuel
  // - Priorité basée sur la distance temporelle
  // - Concurrence limitée (2 préchargements simultanés)
}
```

#### Cache de Frames (`use-frame-cache.ts`)
```typescript
// Cache intelligent de frames rendues
const { getCachedFrame, cacheFrame, invalidateCache } = useFrameCache({
  maxCacheSize: 150,        // Réduit de 300 pour les perfs
  cacheResolution: 24       // 24fps au lieu de 30fps
});

// Hash optimisé pour détecter les changements
// Évite JSON.stringify coûteux
```

## 🎯 Patterns de Développement

### 1. Gestion d'État avec Zustand

#### Pattern Store
```typescript
// ✅ Bon: Actions atomiques avec auto-save
const useMyStore = create<MyStore>((set, get) => ({
  data: [],
  
  addItem: (item) => {
    set(state => ({ data: [...state.data, item] }));
    // Auto-save en arrière-plan
    setTimeout(autoSave, 100);
  },
  
  // ✅ Bon: Getters calculés
  get totalItems() {
    return get().data.length;
  }
}));

// ❌ Éviter: Mutations directes
state.data.push(item); // Non !
```

#### Pattern de Persistance
```typescript
// Pattern unifié pour la sauvegarde
const updateTracksAndSave = (newTracks: TimelineTrack[]) => {
  updateTracks(newTracks);           // Mise à jour locale immédiate
  setTimeout(autoSaveTimeline, 100); // Sauvegarde différée
};
```

### 2. Composants React Optimisés

#### Pattern de Performance
```typescript
// ✅ Bon: Memoization des calculs lourds
const TimelineElement = ({ element, track }) => {
  const elementStyle = useMemo(() => ({
    left: element.startTime * PIXELS_PER_SECOND,
    width: element.duration * PIXELS_PER_SECOND,
  }), [element.startTime, element.duration]);
  
  return <div style={elementStyle} />;
};

// ✅ Bon: Callbacks stables
const handleElementClick = useCallback((elementId: string) => {
  selectElement(track.id, elementId);
}, [track.id, selectElement]);
```

#### Pattern de Drag & Drop
```typescript
// Système unifié pour le drag & drop
const { dragProps } = useDragDrop({
  onDragStart: (data) => setDragState({ isDragging: true, data }),
  onDrop: (data, target) => handleDrop(data, target),
  acceptedTypes: ['media', 'text']
});
```

### 3. Gestion des Erreurs

#### Pattern Try-Catch Obligatoire
```typescript
// ✅ Toujours avec gestion d'erreur
const processVideo = async (file: File): Promise<ProcessResult> => {
  try {
    const result = await heavyProcessing(file);
    return { success: true, data: result };
  } catch (error) {
    console.error('Video processing failed:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
};
```

## 🚀 Optimisations de Performance

### Problèmes Résolus

#### 1. Lag Vidéo ✅
**Avant:** Pool size = 3, événements à 60fps
**Après:** Pool size = 8, throttling à 30fps
```typescript
// Optimisation du cache vidéo
const sink = new CanvasSink(videoTrack, {
  poolSize: 8, // Augmenté pour réduire les seeks
  fit: "contain",
});

// Throttling des mises à jour
if (now - lastUpdate < 33) return; // 30fps max
```

#### 2. Cache de Frames ✅
**Avant:** Hash JSON.stringify, cache 300 frames à 30fps
**Après:** Hash optimisé, cache 150 frames à 24fps
```typescript
// Hash efficace sans JSON.stringify
const hashParts = [
  activeElements.length,
  activeElements.map(e => `${e.id}-${e.type}`).join('|'),
  projectState.backgroundColor || 'default'
];
return hashParts.join('::');
```

#### 3. Préchargement Intelligent ✅
```typescript
// Nouveau système de préchargement
videoPreloader.schedulePreload({
  currentTime,
  tracks,
  mediaFiles,
  playbackSpeed: state.speed,
});
```

### Métriques de Performance

#### Objectifs
- **Frame Rate:** > 24fps constant pendant la lecture
- **Memory Usage:** < 1GB pour des projets moyens
- **Cache Hit Rate:** > 80% après 5 secondes de lecture
- **Seek Time:** < 200ms pour un seek de 10 secondes

#### Monitoring
```javascript
// Dans la console du navigateur
videoCache.getStats();     // Stats du cache vidéo
videoPreloader.getStats(); // Stats du préchargeur

// Performance.measureUserAgentSpecificMemory (Chrome)
performance.measureUserAgentSpecificMemory?.();
```

## 🔧 Outils de Développement

### Linting et Formatage
```bash
# Vérification complète
bun lint                    # Biome + Ultracite
bun format                  # Auto-formatage
bun run check-types         # TypeScript strict

# Auto-fix
bun run lint:fix           # Corrections automatiques
```

### Base de Données
```bash
# Développement local
bun run db:push:local      # Synchroniser le schéma
bun run db:generate        # Générer les migrations
bun run db:migrate         # Appliquer les migrations

# Inspection
bun run db:studio          # Interface graphique Drizzle
```

### Debug et Profiling
```bash
# Mode debug
NODE_OPTIONS="--inspect" bun dev

# Profiling mémoire
NODE_OPTIONS="--inspect --max-old-space-size=4096" bun dev

# Analyse bundle
ANALYZE=true bun run build
```

## 📝 Standards de Code

### TypeScript Strict
```typescript
// ✅ Bon: Types explicites
interface VideoElement extends TimelineElement {
  type: 'media';
  mediaId: string;
  trimStart: number;
  trimEnd: number;
}

// ❌ Éviter: any, unknown sans vérification
const data: any = response; // Non !
```

### Accessibility (a11y)
```typescript
// ✅ Obligatoire: title pour les icônes
<PlayIcon title="Play video" />

// ✅ Obligatoire: type pour les boutons
<button type="button" onClick={handleClick}>

// ✅ Obligatoire: aria-label pour les éléments interactifs
<canvas aria-label="Video preview canvas" />
```

### Gestion des Props
```typescript
// ✅ Toujours destructurer les props
function VideoPlayer({ src, autoPlay, onLoad }: VideoPlayerProps) {
  // ...
}

// ❌ Éviter: props individuelles
function VideoPlayer(src: string, autoPlay: boolean) { // Non !
```

## 🐛 Debug et Troubleshooting

### Problèmes Courants

#### 1. Lag Vidéo
```typescript
// Vérifier les stats du cache
console.log(videoCache.getStats());
// Doit avoir: activeSinks > 0, cachedFrames > 0

// Vérifier le préchargeur
console.log(videoPreloader.getStats());
// queueLength doit diminuer progressivement
```

#### 2. Mémoire
```javascript
// Surveiller l'utilisation mémoire
performance.memory?.usedJSHeapSize; // Chrome uniquement

// Nettoyer les caches si nécessaire
videoCache.clearAll();
frameCache.invalidateCache();
```

#### 3. Timeline Sync
```typescript
// Vérifier les événements de synchronisation
window.addEventListener('playback-update', (e) => {
  console.log('Playback time:', e.detail.time);
});
```

### Outils de Debug
- **Chrome DevTools** - Performance, Memory, Network
- **React DevTools** - State, Props, Renders
- **Zustand DevTools** - Store state tracking

## 🚀 Déploiement et Build

### Build de Production
```bash
# Build complet (tous les apps)
bun build

# Build web uniquement
cd apps/web && bun run build

# Vérification post-build
bun run start                # Test du build
```

### Variables d'Environnement
```bash
# Production
DATABASE_URL=postgresql://...
BETTER_AUTH_SECRET=...       # Générer avec openssl rand -hex 32
UPSTASH_REDIS_REST_URL=...
```

### Performance Checks
```bash
# Lighthouse CI
npx @lhci/cli@latest autorun

# Bundle analyzer
ANALYZE=true bun run build

# TypeScript performance
tsc --noEmit --diagnostics
```

---

## 📚 Ressources Supplémentaires

### Documentation Technique
- **CLAUDE.md** - Architecture générale et contexte
- **GUIDE_LANCEMENT.md** - Installation et premier lancement
- **README.md** - Vue d'ensemble du projet

### APIs et Libraries
- [Next.js 15 Docs](https://nextjs.org/docs)
- [Zustand Guide](https://github.com/pmndrs/zustand)
- [MediaBunny API](https://github.com/TrevorSundberg/mediabunny)
- [Drizzle ORM](https://orm.drizzle.team/)

### Outils de Développement
- [Biome](https://biomejs.dev/) - Linter/Formatter
- [Ultracite](https://github.com/codemix/ultracite) - Config TypeScript stricte
- [Turbo](https://turbo.build/) - Monorepo build system
