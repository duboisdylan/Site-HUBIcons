// server.cjs (CommonJS)
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const swaggerUi = require("swagger-ui-express");
const swaggerJsdoc = require("swagger-jsdoc");

const app = express();
app.use(cors());

// --- Swagger (OpenAPI 3) ---
const swaggerDefinition = {
  openapi: "3.0.3",
  info: {
    title: "HubIcons API",
    version: "1.0.0",
    description: "API d’upload et de gestion d’icônes (PNG/SVG).",
  },
  servers: [
    { url: "http://100.112.254.48", description: "Via IIS (proxy /api)"},
    { url: "http://localhost", description: "Via localhost" }
  ],
  paths: {
    "/api/list": {
      get: {
        summary: "Lister les icônes",
        tags: ["icons"],
        responses: {
          "200": {
            description: "Liste d'icônes",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string" },
                      url: { type: "string", example: "/api/uploads/icon.svg" },
                      type: { type: "string", example: "image/svg+xml" },
                      size: { type: "integer", example: 1234 },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/upload": {
      post: {
        summary: "Uploader une ou plusieurs icônes",
        tags: ["icons"],
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                properties: {
                  files: {
                    type: "array",
                    items: { type: "string", format: "binary" },
                  },
                  relpaths: { type: "string", description: "JSON array optionnel des chemins relatifs" },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Icônes uploadées",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string" },
                      url: { type: "string" },
                      type: { type: "string" },
                      size: { type: "integer" },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/delete/{name}": {
      delete: {
        summary: "Supprimer une icône par son nom de fichier",
        tags: ["icons"],
        parameters: [
          {
            name: "name",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "Nom du fichier (ex: 1699999-home.svg)",
          },
        ],
        responses: {
          "200": {
            description: "Supprimé",
            content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean" } } } } },
          },
          "404": { description: "Fichier introuvable" },
        },
      },
    },
    "/api/uploads/{file}": {
      get: {
        summary: "Servir un fichier uploadé",
        tags: ["icons"],
        parameters: [
          { name: "file", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": { description: "Fichier binaire" },
          "404": { description: "Introuvable" },
        },
      },
    },
  },
};

const swaggerSpec = swaggerJsdoc({
  definition: swaggerDefinition,
  apis: [], // on n’utilise pas d’annotations JSDoc ici, tout est inline
});

// UI sous /api/docs et JSON sous /api/openapi.json
app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get("/api/openapi.json", (_req, res) => res.json(swaggerSpec));

// ➜ Sert les fichiers uploadés derrière /api/uploads
app.use("/api/uploads", express.static(path.join(__dirname, "uploads")));

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const category = req.query.category || "default";
    const dir = path.join(__dirname, "uploads", category);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});
const upload = multer({ storage });

// ➜ Toutes les routes API sont préfixées par /api
app.post("/api/upload", upload.array("files"), (req, res) => {
  const category = req.query.category || "default";
  const files = (req.files || []).map((f) => ({
    name: f.originalname,
    category,
    url: `/api/uploads/${category}/${path.basename(f.filename)}`, // <<< important
    type: f.mimetype,
    size: f.size,
  }));
  res.json(files);
});

app.get("/api/list", (req, res) => {
  const root = path.join(__dirname, "uploads");
  const category = req.query.category;
  let result = [];

  if (category) {
    const dir = path.join(root, category);
    if (fs.existsSync(dir)) {
      result = fs.readdirSync(dir).map((name) => ({
        name,
        category,
        url: `/api/uploads/${category}/${name}`,
      }));
    }
  } else {
    // liste toutes les catégories
    const categories = fs.readdirSync(root, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);

    result = categories.flatMap((cat) => {
      const dir = path.join(root, cat);
      return fs.readdirSync(dir).map((name) => ({
        name,
        category: cat,
        url: `/api/uploads/${cat}/${name}`,
      }));
    });
  }

  res.json(result);
});


app.delete("/api/delete/:category/:name", (req, res) => {
  const filePath = path.join(__dirname, "uploads", req.params.category, req.params.name);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  res.json({ ok: true });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, "127.0.0.1", () =>
  console.log(`✅ API Icons sur http://127.0.0.1:${PORT}`)
);