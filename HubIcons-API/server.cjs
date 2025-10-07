// server.cjs (CommonJS)
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

app.post("/upload", upload.array("files"), (req, res) => {
  const files = (req.files || []).map((f) => ({
    name: f.originalname,
    url: `/uploads/${path.basename(f.filename)}`,
    type: f.mimetype,
    size: f.size,
  }));
  res.json(files);
});

app.get("/list", (req, res) => {
  const dir = path.join(__dirname, "uploads");
  if (!fs.existsSync(dir)) return res.json([]);
  const files = fs.readdirSync(dir).map((name) => ({
    name,
    url: `/uploads/${name}`,
  }));
  res.json(files);
});

app.delete("/delete/:name", (req, res) => {
  const filePath = path.join(__dirname, "uploads", req.params.name);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  res.json({ ok: true });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`✅ API Icons sur http://localhost:${PORT}`));