// @ts-nocheck
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import JSZip from "jszip";
import {
  Upload,
  Download,
  Clipboard as ClipboardIcon,
  Trash2,
  Search,
  Check,
  X,
  FileArchive,
  Images,
  Copy,
  Layers,
} from "lucide-react";

// -----------------------------
// Helpers
// -----------------------------

function bytesToNice(n = 0) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

async function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

function useLocalStorageState(key, initialValue) {
  const [state, setState] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : initialValue;
    } catch {
      return initialValue;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch {}
  }, [key, state]);
  return [state, setState];
}

function classNames(...s) {
  return s.filter(Boolean).join(" ");
}

// Helpers for server-backed mode
function inferTypeFromName(name = "") {
  const lower = name.toLowerCase();
  if (lower.endsWith(".svg")) return "image/svg+xml";
  if (lower.endsWith(".png")) return "image/png";
  return "application/octet-stream";
}

async function fetchTextSafe(url) {
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    return await r.text();
  } catch {
    return null;
  }
}

// -----------------------------
// Types
// -----------------------------
// Icon shape kept simple for demo
// id: string; name: string; type: string; size: number; dataURL: string; svgText?: string; createdAt: number; selected?: boolean

// -----------------------------
// Components
// -----------------------------

function Toolbar({
  onOpenFileDialog,
  onOpenZipDialog,
  canZip,
  onZip,
  onClear,
  query,
  setQuery,
  selectedCount,
  onSelectAll,
  total,
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2">
        <button
          onClick={onOpenFileDialog}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-2xl bg-black text-white hover:bg-gray-800 active:scale-[.98] shadow"
        >
          <Upload className="w-4 h-4" />
          Importer
        </button>

        <button
          onClick={onOpenZipDialog}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-2xl border bg-white hover:bg-gray-50 shadow-sm"
        >
          <Upload className="w-4 h-4" />
          Importer .zip
        </button>

        <button
          onClick={onZip}
          disabled={!canZip}
          className={classNames(
            "inline-flex items-center gap-2 px-3 py-2 rounded-2xl border shadow-sm",
            canZip
              ? "bg-white hover:bg-gray-50"
              : "bg-gray-100 text-gray-400 cursor-not-allowed"
          )}
        >
          <FileArchive className="w-4 h-4" />
          Zipper {selectedCount ? `(${selectedCount})` : "tout"}
        </button>

        <button
          onClick={onClear}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-2xl border bg-white hover:bg-gray-50 shadow-sm"
        >
          <Trash2 className="w-4 h-4" />
          Tout effacer
        </button>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher par nom ou type…"
            className="pl-9 pr-3 py-2 rounded-2xl border w-72 focus:ring-2 focus:ring-black/20"
          />
        </div>
        <button
          onClick={onSelectAll}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-2xl border bg-white hover:bg-gray-50 shadow-sm"
        >
          <Layers className="w-4 h-4" />
          {selectedCount === total ? "Tout désélectionner" : "Tout sélectionner"}
        </button>
      </div>
    </div>
  );
}

function DropZone({ onFiles }) {
  const inputRef = useRef(null);
  const [isOver, setIsOver] = useState(false);

  const openDialog = () => inputRef.current?.click();

  const onDrop = async (e) => {
    e.preventDefault();
    setIsOver(false);
    const files = Array.from(e.dataTransfer.files || []).filter((f) =>
      ["image/svg+xml", "image/png"].includes(f.type)
    );
    onFiles(files);
  };

  return (
    <div
      className={classNames(
        "relative rounded-3xl border-2 border-dashed p-8 sm:p-10 text-center transition-all",
        isOver ? "border-black bg-black/[.02]" : "border-gray-300"
      )}
      onDragOver={(e) => {
        e.preventDefault();
        setIsOver(true);
      }}
      onDragLeave={() => setIsOver(false)}
      onDrop={onDrop}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".svg,.png,image/svg+xml,image/png"
        multiple
        className="hidden"
        onChange={(e) => onFiles(Array.from(e.target.files || []))}
      />
      <Images className="w-8 h-8 mx-auto mb-2" />
      <p className="text-sm text-gray-600">
        Glisse-dépose tes SVG/PNG ici, ou
        <button
          onClick={openDialog}
          className="ml-1 underline underline-offset-4 hover:no-underline"
        >
          choisis des fichiers
        </button>
        .
      </p>
      <p className="text-xs text-gray-400">Formats supportés : .svg, .png</p>
    </div>
  );
}

function IconCard({ icon, onToggle, onCopySVG, onCopyImg, onDownload, onDelete }) {
  const [copied, setCopied] = useState(null); // "svg" | "img"

  const handleCopy = async (mode) => {
    try {
      if (mode === "svg") await onCopySVG(icon);
      if (mode === "img") await onCopyImg(icon);
      setCopied(mode);
      setTimeout(() => setCopied(null), 1400);
    } catch (e) {
      alert("Impossible de copier (permissions navigateur)");
    }
  };

  return (
    <motion.div
      layout
      className={classNames(
        "group relative rounded-2xl border bg-white p-3 shadow-sm hover:shadow-md transition-all",
        icon.selected ? "ring-2 ring-black" : ""
      )}
      whileHover={{ y: -2 }}
    >
      <div className="flex items-start justify-between gap-2">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={!!icon.selected}
            onChange={onToggle}
            className="accent-black w-4 h-4"
          />
          <span className="text-sm font-medium line-clamp-1" title={icon.name}>
            {icon.name}
          </span>
        </label>
        <button
          onClick={onDelete}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-500 hover:text-red-500"
          title="Supprimer"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <div className="flex items-center justify-center h-28 my-2 overflow-hidden rounded-xl bg-gray-50">
        {/* Render preview */}
        {icon.type === "image/svg+xml" ? (
          <div
            className="w-16 h-16"
            dangerouslySetInnerHTML={{ __html: icon.svgText || "" }}
          />
        ) : (
          <img src={icon.dataURL} alt={icon.name} className="w-16 h-16 object-contain" />
        )}
      </div>

      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>{icon.type.replace("image/", "").toUpperCase()}</span>
        <span>{bytesToNice(icon.size)}</span>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        {icon.type === "image/svg+xml" ? (
          <button
            onClick={() => handleCopy("svg")}
            className="inline-flex items-center justify-center gap-1 px-2 py-1 rounded-xl border bg-white hover:bg-gray-50"
            title="Copier le code SVG"
          >
            {copied === "svg" ? <Check className="w-4 h-4" /> : <ClipboardIcon className="w-4 h-4" />}
            <span className="hidden sm:inline">SVG</span>
          </button>
        ) : (
          <button
            onClick={() => handleCopy("img")}
            className="inline-flex items-center justify-center gap-1 px-2 py-1 rounded-xl border bg-white hover:bg-gray-50"
            title="Copier l'image dans le presse-papiers"
          >
            {copied === "img" ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span className="hidden sm:inline">PNG</span>
          </button>
        )}

        <button
          onClick={onDownload}
          className="inline-flex items-center justify-center gap-1 px-2 py-1 rounded-xl border bg-white hover:bg-gray-50"
          title="Télécharger"
        >
          <Download className="w-4 h-4" />
          <span className="hidden sm:inline">DL</span>
        </button>

        <a
          href={icon.dataURL}
          download={icon.name}
          className="inline-flex items-center justify-center gap-1 px-2 py-1 rounded-xl border bg-white hover:bg-gray-50"
          title="Ouvrir dans un nouvel onglet"
          target="_blank"
          rel="noreferrer"
        >
          <Images className="w-4 h-4" />
          <span className="hidden sm:inline">Ouvrir</span>
        </a>
      </div>
    </motion.div>
  );
}

export default function IconManagerApp() {
  const [icons, setIcons] = useState([]);
  const [query, setQuery] = useState("");
  const fileDialogRef = useRef(null);
  const zipDialogRef = useRef(null);

  // Charge la liste depuis le serveur au démarrage
  useEffect(() => {
    fetch("/api/list")
      .then(r => r.json())
      .then((serverFiles) => {
        const mapped = (serverFiles || []).map(f => ({
          id: f.url,
          name: f.name,
          type: f.type || inferTypeFromName(f.name),
          size: f.size ?? 0,
          dataURL: f.url,
          svgText: undefined,
          createdAt: Date.now(),
          selected: false,
        }));
        setIcons(mapped);
      })
      .catch(() => setIcons([]));
  }, []);

  // Précharger doucement le texte des SVG pour l'aperçu
  useEffect(() => {
    icons.forEach(async (icon) => {
      if (icon.type === "image/svg+xml" && !icon.svgText) {
        const text = await fetchTextSafe(icon.dataURL);
        if (text) {
          setIcons(prev => prev.map(i => i.id === icon.id ? { ...i, svgText: text } : i));
        }
      }
    });
  }, [icons]);

  // Derived
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return icons;
    return icons.filter((i) => `${i.name} ${i.type}`.toLowerCase().includes(q));
  }, [icons, query]);

  const selectedCount = icons.filter((i) => i.selected).length;

  const handleFiles = useCallback(async (files) => {
    const accepted = files.filter((f) => ["image/svg+xml", "image/png"].includes(f.type));
    if (accepted.length === 0) return;
    const form = new FormData();
    for (const f of accepted) form.append("files", f);
    const res = await fetch("/api/upload", { method: "POST", body: form });
    if (!res.ok) { alert("Échec de l'upload"); return; }
    const uploaded = await res.json();
    const mapped = uploaded.map(f => ({
      id: f.url,
      name: f.name,
      type: f.type || inferTypeFromName(f.name),
      size: f.size ?? 0,
      dataURL: f.url,
      svgText: undefined,
      createdAt: Date.now(),
      selected: false,
    }));
    setIcons(prev => [...mapped, ...prev]);
  }, []);

  const openFileDialog = () => fileDialogRef.current?.click();

  const toggleSelect = (id) => {
    setIcons((prev) => prev.map((i) => (i.id === id ? { ...i, selected: !i.selected } : i)));
  };

  const selectAll = () => {
    const allSelected = selectedCount === icons.length && icons.length > 0;
    setIcons((prev) => prev.map((i) => ({ ...i, selected: !allSelected })));
  };

  const clearAll = () => {
    if (confirm("Retirer toutes les icônes de l'affichage ? (les fichiers restent sur le serveur)")) setIcons([]);
  };

  const copySVG = async (icon) => {
    if (icon.type !== "image/svg+xml") throw new Error("Not SVG");
    let text = icon.svgText;
    if (!text) {
      text = await fetchTextSafe(icon.dataURL);
      if (!text) throw new Error("Impossible de lire le SVG depuis le serveur");
      setIcons(prev => prev.map(i => i.id === icon.id ? { ...i, svgText: text } : i));
    }
    await navigator.clipboard.writeText(text);
  };

  const copyImage = async (icon) => {
    const res = await fetch(icon.dataURL);
    const blob = await res.blob();
    await navigator.clipboard.write([
      new ClipboardItem({ [blob.type]: blob }),
    ]);
  };

  const downloadOne = async (icon) => {
    const a = document.createElement("a");
    a.href = icon.dataURL;
    a.download = icon.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const deleteOne = async (id) => {
    const icon = icons.find(i => i.id === id);
    if (!icon) return;
    const fileName = (icon.dataURL.split("/").pop() || icon.name);
    const res = await fetch(`/api/delete/${encodeURIComponent(fileName)}`, { method: "DELETE" });
    if (!res.ok) { alert("Échec de la suppression"); return; }
    setIcons(prev => prev.filter(i => i.id !== id));
  };

  const zipSelection = async () => {
    const toZip = icons.filter((i) => i.selected);
    const list = toZip.length > 0 ? toZip : icons;
    if (list.length === 0) return;

    const zip = new JSZip();
    for (const icon of list) {
      const res = await fetch(icon.dataURL);
      const blob = await res.blob();
      zip.file(`icons/${icon.name}`, blob);
    }
    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = list.length === icons.length ? "icons-library.zip" : "icons-selection.zip";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  // Import .zip to restore/share library across browsers
  const handleImportZip = async (file) => {
    if (!file) return;
    try {
      const zip = await JSZip.loadAsync(file);
      const entries = [];
      zip.forEach((relPath, zipObj) => {
        if (zipObj.dir) return;
        const lower = relPath.toLowerCase();
        if (lower.endsWith(".svg") || lower.endsWith(".png")) entries.push(zipObj);
      });
      const imported = await Promise.all(
        entries.map(async (entry) => {
          const blob = await entry.async("blob");
          const name = entry.name.split("/").pop() || entry.name;
          const type = name.toLowerCase().endsWith(".svg") ? "image/svg+xml" : "image/png";
          const dataURL = await new Promise((resolve) => {
            const r = new FileReader();
            r.onload = () => resolve(r.result);
            r.readAsDataURL(blob);
          });
          const svgText = type === "image/svg+xml" ? await (await fetch(dataURL)).text() : undefined;
          return {
            id: `${name}-${blob.size}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            name,
            type,
            size: blob.size,
            dataURL,
            svgText,
            createdAt: Date.now(),
            selected: false,
          };
        })
      );
      setIcons((prev) => [...imported, ...prev]);
      alert(`Importé: ${imported.length} icône(s)`);
    } catch (e) {
      console.error(e);
      alert("Échec de l'import du ZIP. Assure-toi qu'il contient des .svg/.png.");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 text-gray-900">
      <header className="sticky top-0 z-10 backdrop-blur bg-white/70 border-b">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-black text-white grid place-items-center">
              <Images className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">Icon Manager</h1>
              <p className="text-xs text-gray-500">SVG & PNG • Upload • Copier • ZIP</p>
            </div>
          </div>

          <a
            className="text-xs text-gray-500 underline-offset-4 hover:underline"
            href="https://lucide.dev/icons/"
            target="_blank"
            rel="noreferrer"
          >
            lucide-react icons ↗
          </a>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Hidden input for file dialog */}
        <input
          ref={fileDialogRef}
          type="file"
          accept=".svg,.png,image/svg+xml,image/png"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(Array.from(e.target.files || []))}
        />

        {/* Hidden input for ZIP import */}
        <input
          ref={zipDialogRef}
          type="file"
          accept=".zip,application/zip"
          className="hidden"
          onChange={(e) => handleImportZip(e.target.files?.[0])}
        />

        <Toolbar
          onOpenFileDialog={() => fileDialogRef.current?.click()}
          onOpenZipDialog={() => zipDialogRef.current?.click()}
          canZip={icons.length > 0}
          onZip={zipSelection}
          onClear={clearAll}
          query={query}
          setQuery={setQuery}
          selectedCount={selectedCount}
          onSelectAll={selectAll}
          total={icons.length}
        />

        <DropZone onFiles={handleFiles} />

        {icons.length === 0 ? (
          <div className="text-center text-sm text-gray-500 py-16">
            Aucune icône pour l’instant. Ajoute des fichiers pour commencer.
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>
                {filtered.length} affichée(s) / {icons.length} au total
              </span>
              <span>
                {selectedCount} sélectionnée(s)
              </span>
            </div>

            <motion.div
              layout
              className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4"
            >
              <AnimatePresence>
                {filtered.map((icon) => (
                  <IconCard
                    key={icon.id}
                    icon={icon}
                    onToggle={() => toggleSelect(icon.id)}
                    onCopySVG={copySVG}
                    onCopyImg={copyImage}
                    onDownload={() => downloadOne(icon)}
                    onDelete={() => deleteOne(icon.id)}
                  />
                ))}
              </AnimatePresence>
            </motion.div>
          </>
        )}

        <section className="mt-8 text-xs text-gray-500 leading-relaxed">
          <h2 className="text-sm font-semibold text-gray-700 mb-2">Notes</h2>
          <ul className="list-disc ml-5 space-y-1">
            <li>La copie d’images requiert un contexte sécurisé (HTTPS) et des permissions du navigateur.</li>
            <li>Les icônes sont maintenant stockées sur le <strong>serveur</strong> (IIS → Node). L’application recharge la liste via <code>/api/list</code>.</li>
            <li>Le ZIP est généré côté client via <code>JSZip</code>.</li>
          </ul>
        </section>
      </main>
    </div>
  );
}
