// server.cjs
// Node + Express + Multer — gestion d'icônes par catégories

const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const fsp = fs.promises;
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

// Dossier racine de stockage
const UPLOAD_DIR = path.resolve(__dirname, "uploads");

// --- Utils ------------------------------------------------------------------

function bytes(n) {
  return typeof n === "number" ? n : 0;
}

function inferTypeFromName(name = "") {
  const lower = name.toLowerCase();
  if (lower.endsWith(".svg")) return "image/svg+xml";
  if (lower.endsWith(".png")) return "image/png";
  return "application/octet-stream";
}

// Liste les sous-dossiers immédiats du répertoire UPLOAD_DIR
async function listCategories() {
  try {
    const entries = await fsp.readdir(UPLOAD_DIR, { withFileTypes: true });
    return entries.filter((e) => e.isDirectory()).map((e) => e.name);
  } catch {
    return [];
  }
}

// Garantit l’existence d’un dossier
async function ensureDir(dir) {
  await fsp.mkdir(dir, { recursive: true });
}

// Retourne le chemin dossier correspondant à la catégorie
// - "default" ou non fourni => UPLOAD_DIR (racine)
// - "UI" => uploads/UI, etc.
function categoryFolder(category) {
  if (!category || category === "default") return UPLOAD_DIR;
  return path.join(UPLOAD_DIR, path.basename(category)); // basename pour éviter path traversal
}

// Construit l’URL publique d’un fichier
function publicUrl(category, fileName) {
  const safe = encodeURIComponent(fileName);
  if (!category || category === "default") return `/uploads/${safe}`;
  return `/uploads/${encodeURIComponent(category)}/${safe}`;
}

// Convertit un fichier en objet côté client
function toClientFile({ category, name, size }) {
  return {
    name,
    url: publicUrl(category, name),
    type: inferTypeFromName(name),
    size: bytes(size),
    category: category || "default",
  };
}

// Cherche un fichier par nom dans une catégorie précise OU dans toutes
// Retourne { fullPath, categoryFound } si trouvé, sinon null
async function findFileAcrossCategories(fileName, category) {
  const safeName = path.basename(fileName);
  const candidates = [];

  if (category && category !== "default") {
    candidates.push({ category, folder: categoryFolder(category) });
  } else {
    // Cherche d’abord à la racine
    candidates.push({ category: "default", folder: UPLOAD_DIR });
    // Puis dans chaque sous-dossier
    const cats = await listCategories();
    for (const c of cats) candidates.push({ category: c, folder: categoryFolder(c) });
  }

  for (const c of candidates) {
    const full = path.join(c.folder, safeName);
    try {
      const st = await fsp.stat(full);
      if (st.isFile()) return { fullPath: full, categoryFound: c.category };
    } catch {
      // ignore
    }
  }
  return null;
}

// --- Middlewares ------------------------------------------------------------

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Expose les fichiers statiques
app.use("/uploads", express.static(UPLOAD_DIR, {
  fallthrough: true,
  extensions: ["svg", "png"],
  // cache léger de 5 min
  maxAge: "5m",
}));

// Multer: stocke temporairement en mémoire; on déplace nous-mêmes ensuite
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB
    files: 200,
  },
  fileFilter: (_req, file, cb) => {
    const ok = ["image/svg+xml", "image/png"].includes(file.mimetype)
      || [".svg", ".png"].some((ext) => file.originalname.toLowerCase().endsWith(ext));
    cb(ok ? null : new Error("TYPE_NOT_ALLOWED"), ok);
  },
});

// --- Routes API -------------------------------------------------------------

/**
 * GET /api/list?category=UI|System|Social|Apps|default
 * - category=default ou absent => renvoie l’ensemble (racine + sous-dossiers)
 * - category=nom => renvoie uniquement cette catégorie
 */
app.get("/api/list", async (req, res) => {
  const { category } = req.query;

  try {
    await ensureDir(UPLOAD_DIR);

    // Cas spécifique: une catégorie précise
    if (category && category !== "default") {
      const folder = categoryFolder(category);
      await ensureDir(folder);
      const files = await fsp.readdir(folder, { withFileTypes: true });
      const out = [];
      for (const f of files) {
        if (!f.isFile()) continue;
        const full = path.join(folder, f.name);
        const st = await fsp.stat(full);
        out.push(toClientFile({ category, name: f.name, size: st.size }));
      }
      return res.json(out);
    }

    // Sinon, on renvoie tout (racine + sous-dossiers)
    const out = [];

    // Racine
    const rootFiles = await fsp.readdir(UPLOAD_DIR, { withFileTypes: true });
    for (const f of rootFiles) {
      if (f.isFile()) {
        const full = path.join(UPLOAD_DIR, f.name);
        const st = await fsp.stat(full);
        out.push(toClientFile({ category: "default", name: f.name, size: st.size }));
      }
    }

    // Sous-dossiers
    const cats = await listCategories();
    for (const c of cats) {
      const folder = categoryFolder(c);
      const files = await fsp.readdir(folder, { withFileTypes: true });
      for (const f of files) {
        if (!f.isFile()) continue;
        const full = path.join(folder, f.name);
        const st = await fsp.stat(full);
        out.push(toClientFile({ category: c, name: f.name, size: st.size }));
      }
    }

    res.json(out);
  } catch (e) {
    console.error(e);
    res.status(500).json([]);
  }
});

/**
 * POST /api/upload?category=...
 * - Stocke chaque fichier dans le dossier correspondant à la catégorie.
 * - Si category=default (ou manquante), on stocke à la racine /uploads.
 */
app.post("/api/upload", upload.array("files"), async (req, res) => {
  const { category } = req.query;
  const targetFolder = categoryFolder(category);

  try {
    await ensureDir(targetFolder);

    const results = [];
    for (const file of req.files || []) {
      const safeName = path.basename(file.originalname);
      const dest = path.join(targetFolder, safeName);
      await fsp.writeFile(dest, file.buffer);
      const st = await fsp.stat(dest);

      results.push({
        name: safeName,
        url: publicUrl(category, safeName),
        type: inferTypeFromName(safeName),
        size: bytes(st.size),
        category: category || "default",
      });
    }
    res.json(results);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "UPLOAD_FAILED" });
  }
});

/**
 * DELETE /api/delete/:fileName[?category=...]
 * - Compatible avec ton App.jsx actuel qui envoie seulement le nom de fichier.
 * - Si category est fournie, on supprime dans cette catégorie.
 * - Sinon, on cherche le fichier (racine + toutes catégories) et on supprime la première occurrence.
 */
app.delete("/api/delete/:fileName", async (req, res) => {
  const { fileName } = req.params;
  const { category } = req.query;

  try {
    const found = await findFileAcrossCategories(fileName, category);
    if (!found) return res.status(404).json({ error: "NOT_FOUND" });

    await fsp.unlink(found.fullPath);
    return res.json({ ok: true, deleted: path.basename(fileName), category: found.categoryFound });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "DELETE_FAILED" });
  }
});

// --- Démarrage --------------------------------------------------------------

(async () => {
  await ensureDir(UPLOAD_DIR);
  app.listen(PORT, () => {
    console.log(`Icon server listening on http://localhost:${PORT}`);
    console.log(`Static files served from /uploads`);
  });
})();
