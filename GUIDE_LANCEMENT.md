# 🚀 Guide de Lancement - OpenCut

Ce guide vous explique comment installer, configurer et lancer OpenCut pour le développement et les tests.

## 📋 Prérequis

### Logiciels Requis
- **Node.js** 18+ (recommandé: 20+)
- **Bun** 1.2.18+ (gestionnaire de paquets principal)
- **Docker** & **Docker Compose** (pour les services locaux)
- **Git** pour le versioning

### Vérification des Prérequis
```bash
# Vérifier Node.js
node --version  # Doit être 18+

# Installer Bun si nécessaire
curl -fsSL https://bun.sh/install | bash

# Vérifier Bun
bun --version  # Doit être 1.2.18+

# Vérifier Docker
docker --version
docker-compose --version
```

## 🔧 Installation

### 1. Cloner le Projet
```bash
git clone https://github.com/votre-repo/OpenCut.git
cd OpenCut
```

### 2. Installer les Dépendances
```bash
# Installation des dépendances (monorepo)
bun install

# Si vous avez des problèmes, essayez :
bun install --force
```

### 3. Services Locaux (Base de Données & Redis)
```bash
# Démarrer PostgreSQL et Redis avec Docker
docker-compose up -d

# Vérifier que les services sont actifs
docker-compose ps
```

### 4. Configuration des Variables d'Environnement
```bash
# Copier le fichier d'exemple
cp apps/web/.env.example apps/web/.env.local

# Éditer le fichier .env.local avec vos valeurs
nano apps/web/.env.local
```

**Variables d'environnement requises :**
```bash
# Base de données
DATABASE_URL="postgresql://opencut:opencutthegoat@localhost:5432/opencut"

# Authentification
BETTER_AUTH_SECRET="votre-clé-secrète-générée"
BETTER_AUTH_URL="http://localhost:3000"

# Redis
UPSTASH_REDIS_REST_URL="http://localhost:8079"
UPSTASH_REDIS_REST_TOKEN="example_token"

# CMS (optionnel pour les tests)
MARBLE_WORKSPACE_KEY="workspace-key"
NEXT_PUBLIC_MARBLE_API_URL="https://api.marblecms.com"
```

### 5. Initialiser la Base de Données
```bash
cd apps/web

# Générer les migrations si nécessaire
bun run db:generate

# Appliquer les migrations
bun run db:push:local
```

## 🚀 Lancement

### Mode Développement Complet
```bash
# Depuis la racine du projet - Lance tous les services
bun dev
```

### Mode Développement Web Uniquement
```bash
# Depuis apps/web/ - Plus rapide pour le dev frontend
cd apps/web
bun run dev
```

### Commandes de Développement Utiles
```bash
# Linter et formatage
bun lint          # Vérifier le code
bun format        # Formatter le code

# Base de données
cd apps/web
bun run db:push:local    # Pousser le schéma en local
bun run db:migrate       # Appliquer les migrations

# Build de production (test)
bun build
```

## 🧪 Tests et Validation

### 1. Vérification de l'Installation
- Ouvrir http://localhost:3000
- Vérifier que la page d'accueil se charge
- Tester l'authentification (créer un compte)

### 2. Test des Fonctionnalités Principales

#### Import de Média
1. Aller sur `/editor`
2. Cliquer sur "Import Media" dans le panneau média
3. Importer une vidéo (formats supportés: MP4, MOV, WebM)
4. Vérifier que la miniature se génère

#### Timeline et Lecture
1. Glisser une vidéo sur la timeline
2. Cliquer sur Play ▶️
3. **⚠️ Problème Connu :** Lag possible lors de la lecture

#### Export (Fonctionnalité Basique)
1. Avec du contenu sur la timeline
2. Cliquer sur "Export"
3. Sélectionner les paramètres d'export

### 3. Tests de Performance

#### Test de Charge Média
```bash
# Importer plusieurs vidéos (5-10) de tailles différentes
# Observer l'utilisation mémoire dans les DevTools
```

#### Test de Timeline
```bash
# Ajouter plusieurs éléments sur différentes pistes
# Tester le drag & drop
# Vérifier la fluidité du zoom/scroll
```

## 🐛 Problèmes Connus et Solutions

### Problème de Lag Vidéo (Principal)
**Symptômes :** Lecture vidéo saccadée, délai de réponse

**Causes Identifiées :**
1. **VideoCache inefficace** - `mediabunny` avec poolSize=3 trop petit
2. **Synchronisation audio/vidéo** - Events DOM trop fréquents
3. **Frame caching** - Hash calculations trop lourds
4. **Canvas rendering** - Pas de Web Workers

**Solutions Recommandées :**
```typescript
// Dans video-cache.ts - Augmenter le pool
const sink = new CanvasSink(videoTrack, {
  poolSize: 8, // Au lieu de 3
  fit: "contain",
});

// Dans playback-store.ts - Réduire la fréquence des events
const updateTime = () => {
  // Throttle à 30fps au lieu de 60fps
  if (now - lastUpdate < 33) return; // 33ms = 30fps
};
```

### Problèmes de Build
```bash
# Si erreur TypeScript
bun run check-types

# Si erreur de dépendances
rm -rf node_modules apps/*/node_modules
bun install

# Si erreur de base de données
docker-compose down -v
docker-compose up -d
bun run db:push:local
```

### Problèmes de Performance Générale
```bash
# Vider les caches
rm -rf .next .turbo apps/web/.next

# Redémarrer avec profiling
NODE_OPTIONS="--inspect" bun dev
```

## 📊 Monitoring et Debug

### DevTools Utiles
- **Performance Tab** - Analyser les bottlenecks
- **Memory Tab** - Détecter les fuites mémoire
- **Network Tab** - Vérifier les requêtes lentes

### Logs Importants
```javascript
// Dans la console du navigateur
videoCache.getStats() // Statistiques du cache vidéo
```

### Métriques à Surveiller
- **Memory Usage** - Ne doit pas dépasser 1GB
- **Frame Rate** - Doit rester > 24fps pendant la lecture
- **Cache Hit Rate** - Doit être > 80% après quelques secondes

## 🔄 Workflow de Développement

### 1. Avant de Commencer
```bash
git pull origin main
bun install
docker-compose up -d
```

### 2. Pendant le Développement
```bash
# Terminal 1 - Services
docker-compose up

# Terminal 2 - App
bun dev

# Terminal 3 - Tests/Debug
bun lint
bun run db:push:local
```

### 3. Avant de Commit
```bash
bun lint
bun format
bun run check-types
```

## 🚨 Aide et Support

### Logs à Vérifier
- Console navigateur (F12)
- Terminal du serveur de développement
- Logs Docker : `docker-compose logs`

### Commandes de Diagnostic
```bash
# État des services
docker-compose ps

# Logs de la base de données
docker-compose logs postgres

# Espace disque
df -h

# Processus Node
ps aux | grep node
```

### Contacts et Ressources
- **Issues GitHub** - Pour reporter des bugs
- **Documentation** - `CLAUDE.md` pour l'architecture
- **Performance** - Utiliser Chrome DevTools

---

**Note :** Ce projet utilise des technologies modernes (Next.js 15, Bun, Turborepo) qui peuvent nécessiter des versions récentes de Node.js et des navigateurs modernes.
