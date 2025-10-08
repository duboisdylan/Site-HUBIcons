
# 🖼️ Site-HubIcons — Gestionnaire d’icônes SVG/PNG

Application web permettant d’importer, gérer, copier et télécharger des icônes **SVG** et **PNG**, avec stockage des fichiers directement sur un **serveur IIS** via un **backend Node.js (Express)**.

---

## 📦 Dépendances
// server.cjs (CommonJS)
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
swagger-ui-express swagger-jsdoc

## 📦 Structure du projet

```
C:\
 ├─ sites\
 │   ├─ iconhub-api\        ← API Node.js (uploads / list / delete)
 │   │   ├─ server.cjs
 │   │   ├─ package.json
 │   │   ├─ uploads\
 │   │   └─ README.md
 │   └─ iconhub-ui\         ← Frontend React (build distribué sur IIS)
 │       └─ build\
 └─ inetpub\
     └─ wwwroot\            ← Emplacement IIS (sert le build React)
```

---

## ⚙️ Installation du backend (Node.js / Express)

### 1️⃣ Crée le dossier de l’API
```powershell
mkdir C:\sites\iconhub-api
cd C:\sites\iconhub-api
```

### 2️⃣ Initialise le projet Node
```bash
npm init -y
npm i express cors multer
```

### 3️⃣ Crée le fichier **server.cjs**
```js
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(cors());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, "uploads");
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});
const upload = multer({ storage });

app.get("/list", (req, res) => {
  const dir = path.join(__dirname, "uploads");
  if (!fs.existsSync(dir)) return res.json([]);
  const files = fs.readdirSync(dir).map((name) => ({
    name,
    url: `/uploads/${name}`,
  }));
  res.json(files);
});

app.post("/upload", upload.array("files"), (req, res) => {
  const files = (req.files || []).map((f) => ({
    name: f.originalname,
    url: `/uploads/${path.basename(f.filename)}`,
    type: f.mimetype,
    size: f.size,
  }));
  res.json(files);
});

app.delete("/delete/:name", (req, res) => {
  const p = path.join(__dirname, "uploads", req.params.name);
  if (fs.existsSync(p)) fs.unlinkSync(p);
  res.json({ ok: true });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, "127.0.0.1", () =>
  console.log(`✅ API Icons sur http://127.0.0.1:${PORT}`)
);
```

### 4️⃣ Lance l’API
```bash
npm start
```

Test :
```powershell
Invoke-WebRequest -Uri http://127.0.0.1:3001/list
```

Tu dois obtenir `[]`.

---

## 🌐 Configuration IIS

### 1️⃣ Installer les modules IIS nécessaires
- **URL Rewrite**
- **Application Request Routing (ARR)**

➡️ Télécharge-les sur [https://www.iis.net/downloads](https://www.iis.net/downloads)

### 2️⃣ Activer le proxy ARR
1. Ouvre **IIS Manager**
2. Clique sur le **nœud serveur**
3. Double-clique **Application Request Routing Cache**
4. Dans le panneau droit → **Server Proxy Settings...**
5. Coche **Enable Proxy** → **Apply**

---

## 🧱 Fichier web.config

Place ce fichier à la **racine** du site IIS qui sert le build React :

```xml
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
  <system.webServer>
    <rewrite>
      <rules>
        <!-- 1️⃣ Proxy /api/... vers Node -->
        <rule name="API to Node" stopProcessing="true">
          <match url="^api/(.*)" />
          <action type="Rewrite" url="http://127.0.0.1:3001/{R:1}" />
        </rule>

        <!-- 2️⃣ Fallback React Router -->
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

    <!-- 3️⃣ Augmenter la taille des uploads -->
    <security>
      <requestFiltering>
        <requestLimits maxAllowedContentLength="104857600" />
      </requestFiltering>
    </security>
  </system.webServer>
</configuration>
```

> ⚠️ Supprime toute ligne `<serverVariables>` si elle est présente.

---

## 🚀 Démarrage global

1. Lancer l’API :
   ```bash
   cd C:\sites\iconhub-api
   npm start
   ```
2. Démarrer IIS :
   ```bash
   iisreset
   ```
3. Tester :
   - `http://127.0.0.1:3001/list` → doit renvoyer `[]`
   - `https://TONSITE/api/list` → doit renvoyer aussi `[]`
4. Depuis ton navigateur :
   - Ouvre ton site → Upload une icône → elle apparaît immédiatement
   - Les fichiers sont stockés dans `C:\sites\iconhub-api\uploads`

---

## 🧰 Utilitaire de service (optionnel)

### Avec **PM2**
```bash
npm i -g pm2
pm2 start server.cjs --name hubicons-api
pm2 save
pm2 startup
```

### Avec **NSSM**
```bash
nssm install iconhub-api "C:\Program Files\nodejs\node.exe" "C:\sites\iconhub-api\server.cjs"
nssm start iconhub-api
```

---

## 🧪 Diagnostic rapide

| Problème | Cause probable | Solution |
|-----------|----------------|-----------|
| **502.3 Bad Gateway** | Node non démarré | Lancer `node server.cjs` |
| **500.50 URL Rewrite** | Variable non autorisée | Supprimer `<serverVariables>` |
| **413 Payload Too Large** | Upload trop gros | Ajouter `<requestLimits>` |
| **404 /api/** | Mauvaise règle Rewrite | Vérifie `web.config` et ARR |
| **Permission denied uploads** | Droits manquants | Donne *Modify* au compte du service Node |

---

## 📚 Liens utiles

- [URL Rewrite for IIS](https://www.iis.net/downloads/microsoft/url-rewrite)
- [Application Request Routing (ARR)](https://www.iis.net/downloads/microsoft/application-request-routing)
- [Express documentation](https://expressjs.com/fr/)
- [PM2 process manager](https://pm2.keymetrics.io/)
