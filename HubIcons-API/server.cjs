// server.cjs (CommonJS)
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(cors());

// ➜ Sert les fichiers uploadés derrière /api/uploads
app.use("/api/uploads", express.static(path.join(__dirname, "uploads")));

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, "uploads");
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});
const upload = multer({ storage });

// ➜ Toutes les routes API sont préfixées par /api
app.post("/api/upload", upload.array("files"), (req, res) => {
  const files = (req.files || []).map((f) => ({
    name: f.originalname,
    url: `/api/uploads/${path.basename(f.filename)}`, // <<< important
    type: f.mimetype,
    size: f.size,
  }));
  res.json(files);
});

app.get("/api/list", (req, res) => {
  const dir = path.join(__dirname, "uploads");
  if (!fs.existsSync(dir)) return res.json([]);
  const files = fs.readdirSync(dir).map((name) => ({
    name,
    url: `/api/uploads/${name}`, // <<< important
  }));
  res.json(files);
});

app.delete("/api/delete/:name", (req, res) => {
  const filePath = path.join(__dirname, "uploads", req.params.name);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  res.json({ ok: true });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, "127.0.0.1", () =>
  console.log(`✅ API Icons sur http://127.0.0.1:${PORT}`)
);