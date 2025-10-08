
# 🖼️ IconHub — Gestionnaire d’icônes SVG & PNG

**IconHub** est une application web permettant d’importer, visualiser, copier et télécharger des icônes **SVG** et **PNG**, avec stockage des fichiers sur un **serveur IIS** via une **API Node.js Express**.  
Le frontend est développé en **React + Tailwind CSS + Framer Motion + JSZip + Lucide React**.

---

## 📁 Structure du dépôt

```
SITE-HubIcons/
 ├─ HubIcons-API/       ← API Node.js (Express / Multer / stockage local)
 ├─ HubIcons-Front/        ← Frontend React (Vite + Tailwind + Framer Motion)
 ├─ .gitignore
 └─ README.md          ← Ce fichier
```

---

## ⚙️ Technologies

| Domaine | Technologies |
|--------|--------------|
| **Frontend** | React 18+ (ou 19), Vite, Tailwind CSS, Framer Motion, JSZip, Lucide React |
| **Backend** | Node.js 18+ / 22+, Express, Multer, CORS |
| **Serveur Web** | IIS + URL Rewrite + ARR (Application Request Routing) |
| **Build** | Vite (proxy `/api` → Node) |

---

## 🚀 Démarrage rapide

### 1) Cloner
```bash
git clone <url-du-repo> IconHub
cd IconHub
```

### 2) Backend (API)
```bash
cd iconhub-api
npm install
npm start
```
L’API démarre sur **http://127.0.0.1:3001** par défaut.

### 3) Frontend (UI)
```bash
cd ../iconhub-ui
npm install
npm run dev
```
Ouvre **http://localhost:5173** (ou le port Vite affiché).

---

## 🧱 Déploiement sur IIS

1. **Installer** :
   - [URL Rewrite](https://www.iis.net/downloads/microsoft/url-rewrite)
   - [ARR (Application Request Routing)](https://www.iis.net/downloads/microsoft/application-request-routing)

2. **Activer le proxy ARR**  
   _IIS Manager_ → nœud **Serveur** → **Application Request Routing Cache** → **Server Proxy Settings…** → **Enable Proxy** → **Apply**

3. **Placer le build React**  
   - Compiler l’UI : `cd iconhub-ui && npm run build` → dossier `dist/`
   - Copier le contenu de `dist/` dans `C:\inetpub\wwwroot\`

4. **Proxy `/api` vers Node** : créer `C:\inetpub\wwwroot\web.config`

```xml
<?xml version="1.0" encoding="UTF-8"?>
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
    <security>
      <requestFiltering>
        <requestLimits maxAllowedContentLength="104857600" />
      </requestFiltering>
    </security>
  </system.webServer>
</configuration>
```

> ⚠️ Si tu avais un bloc `<serverVariables>` (ex: `HTTP_X_FORWARDED_PROTO`), **supprime-le** pour éviter l’erreur **HTTP 500.50**.

---

## 🔌 Endpoints API (rappel)

| Méthode | Route | Description |
|--------|------|-------------|
| GET | `/api/list` | Liste les fichiers dans `uploads/` |
| POST | `/api/upload` | Upload multiple (`files[]`) |
| DELETE | `/api/delete/:name` | Supprime un fichier |

---

## 🧰 Exécution en service (optionnel)

### PM2
```bash
npm i -g pm2
cd iconhub-api
pm2 start server.cjs --name iconhub-api
pm2 save
pm2 startup
```

### NSSM (Windows Service)
```bash
nssm install iconhub-api "C:\Program Files
odejs
ode.exe" "C:\sites\iconhub-api\server.cjs"
nssm start iconhub-api
```

---

## 🧪 Dépannage rapide

| Problème | Indice | Solution |
|----------|--------|----------|
| **502.3 Bad Gateway** | ARR/IIS ne joint pas Node | Vérifie que Node écoute sur `127.0.0.1:3001` (`npm start`, `netstat`), proxy activé |
| **500.50 URL Rewrite** | Variable interdite | Retirer `<serverVariables>` (ex. `HTTP_X_FORWARDED_PROTO`) dans `web.config` |
| **413 Payload Too Large** | Upload volumineux | `requestLimits maxAllowedContentLength` dans `web.config` |
| **404 /api/** | Mauvaise règle | Règles `Rewrite` et ordre dans `web.config` |
| **Accès dossier uploads** | Droits NTFS | Donner **Modify** au compte du service Node / IIS |

---

## 📚 Docs liées

- `iconhub-api/README.md` — détail API & endpoints  
- `iconhub-ui/README.md` — setup UI (Vite, Tailwind, appels `/api`)  

---

## 🤝 Contribution

1. Fork & branch (`feat/nom-fonctionnalite`)  
2. Linter/tests : `npm run lint` (si configuré)  
3. PR avec description claire (screenshots bienvenus)

---

## 📝 Licence

MIT — fais-toi plaisir ✨
