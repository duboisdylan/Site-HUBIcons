
# 🧩 IconHub UI — Frontend React

Interface web de gestion d’icônes **SVG/PNG**, conçue avec **React**, **Tailwind CSS**, **Framer Motion**, **JSZip** et **Lucide React**.  
Le frontend communique avec une API Node.js via le chemin `/api` (proxy IIS → Node).

---

## ⚙️ Stack technique

- **React 18+**
- **Tailwind CSS**
- **Framer Motion**
- **JSZip**
- **Lucide React**
- **Vite** (recommandé pour le build)

---

## 🚀 Installation locale

### 1️⃣ Crée le projet Vite
```bash
npm create vite@latest iconhub-ui -- --template react
cd iconhub-ui
```

### 2️⃣ Installe les dépendances
```bash
npm i
npm i framer-motion jszip lucide-react
npm i -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

### 3️⃣ Configure Tailwind
`tailwind.config.js` :
```js
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {},
  },
  plugins: [],
};
```

`src/index.css` :
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

---

## 🧠 Structure du code

```
src/
 ├─ components/
 │   ├─ IconManagerApp.jsx    ← composant principal
 │   └─ hooks/useIconsDB.js   ← (optionnel, IndexedDB version)
 ├─ App.jsx
 ├─ main.jsx
 └─ index.css
```

---

## 🌐 Appels à l’API

Tous les appels au backend se font via `/api` :

| Fonction | Méthode | Endpoint | Description |
|-----------|----------|-----------|--------------|
| `fetch("/api/list")` | GET | `/api/list` | Liste les icônes sur le serveur |
| `fetch("/api/upload")` | POST | `/api/upload` | Téléverse plusieurs fichiers |
| `fetch("/api/delete/:name")` | DELETE | `/api/delete/:name` | Supprime un fichier du serveur |

👉 Ces routes sont **proxies par IIS** vers `http://127.0.0.1:3001` via le `web.config`.

---

## 🧩 Aperçu du composant principal

Le composant `IconManagerApp` gère :  
- l’upload de fichiers (via `/api/upload`)
- la liste (`/api/list`)
- la suppression (`/api/delete/:name`)
- la génération de ZIP (JSZip)
- la copie SVG/PNG (presse-papiers)
- le rendu visuel (`dangerouslySetInnerHTML` pour SVG)

---

## 🏗️ Build de production

### 1️⃣ Compiler
```bash
npm run build
```

Le build final est généré dans `dist/`.

### 2️⃣ Déployer sur IIS
Copie le contenu de `dist/` dans :  
`C:\inetpub\wwwroot\`

IIS servira les fichiers statiques et proxyera `/api/*` vers l’API Node.js.

---

## ⚙️ Exemple de proxy côté IIS

`web.config` (dans `C:\inetpub\wwwroot` du site) :

```xml
<configuration>
  <system.webServer>
    <rewrite>
      <rules>
        <rule name="API to Node" stopProcessing="true">
          <match url="^api/(.*)" />
          <action type="Rewrite" url="http://127.0.0.1:3001/{R:1}" />
        </rule>
        <rule name="SPA fallback" stopProcessing="true">
          <match url=".*" />
          <conditions logicalGrouping="MatchAll">
            <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
            <add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" />
            <add input="{URL}" pattern="^api/" negate="true" />
          </conditions>
          <action type="Rewrite" url="/index.html" />
        </rule>
      </rules>
    </rewrite>
  </system.webServer>
</configuration>
```

---

## 💡 Développement local

Si ton API tourne sur le port 3001, crée un fichier `.env` :

```
VITE_API_BASE=http://localhost:3001
```

Et dans ton code :

```js
const API_BASE = import.meta.env.VITE_API_BASE || "/api";
fetch(`${API_BASE}/list`);
```

---

## 🔍 Vérification rapide

| Test | Commande | Résultat attendu |
|------|-----------|------------------|
| Démarrage local | `npm run dev` | Application accessible sur http://localhost:5173 |
| API connectée | `curl http://localhost:3001/list` | JSON `[]` |
| Proxy IIS | `https://tonsite/api/list` | JSON `[]` |
| Upload d’icônes | Interface web | Fichiers visibles dans `uploads/` |

---

## 📚 Liens utiles

- [React Docs](https://react.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Framer Motion](https://www.framer.com/motion/)
- [Lucide React](https://lucide.dev/)
- [JSZip](https://stuk.github.io/jszip/)

---
