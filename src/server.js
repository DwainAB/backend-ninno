import "dotenv/config";
import express from "express";
import cors from "cors";
import multer from "multer";
import { generateFormula } from "./formulaService.js";
import { uploadImage } from "./cloudinaryService.js";
import { getConfig, setBackgroundImageUrl, setLogoImageUrl } from "./configService.js";
import { getNotes, createNote, updateNote, deleteNote } from "./notesService.js";
import { requireAdmin } from "./adminAuth.js";

const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const NOTE_IMAGE_FIELDS = [
  { name: "image", maxCount: 1 },
  { name: "happyImage", maxCount: 1 },
  { name: "sadImage", maxCount: 1 },
  { name: "happyAnim", maxCount: 1 },
  { name: "sadAnim", maxCount: 1 },
];
const NOTE_FIELD_TO_URL_KEY = {
  image: "imageUrl",
  happyImage: "happyImageUrl",
  sadImage: "sadImageUrl",
  happyAnim: "happyAnimUrl",
  sadAnim: "sadAnimUrl",
};

async function uploadNoteImages(files) {
  const patch = {};
  for (const [field, urlKey] of Object.entries(NOTE_FIELD_TO_URL_KEY)) {
    const file = files?.[field]?.[0];
    if (file) {
      const { url } = await uploadImage(file.buffer, "notes");
      patch[urlKey] = url;
    }
  }
  return patch;
}

app.use(cors());
app.use(express.json());

app.post("/formula", async (req, res) => {
  const { top, heart, base } = req.body ?? {};

  if (!top || !heart || !base) {
    return res.status(400).json({ error: "top, heart et base sont requis" });
  }

  try {
    const formula = await generateFormula({ top, heart, base });
    res.json(formula);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur lors de la génération de la formule" });
  }
});

// --- Lecture publique (consommée par le back office et, plus tard, l'app) ---

app.get("/config", async (req, res) => {
  res.json(await getConfig());
});

app.get("/notes", async (req, res) => {
  res.json(await getNotes());
});

// --- Administration (protégée par ADMIN_TOKEN) ---

app.get("/admin/config", requireAdmin, async (req, res) => {
  res.json(await getConfig());
});

app.post("/admin/config/background", requireAdmin, upload.single("image"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "image est requise" });
  }
  try {
    const { url } = await uploadImage(req.file.buffer, "background");
    const config = await setBackgroundImageUrl(url);
    res.json(config);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur lors de l'upload de l'image de fond" });
  }
});

app.post("/admin/config/logo", requireAdmin, upload.single("image"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "image est requise" });
  }
  try {
    const { url } = await uploadImage(req.file.buffer, "logo");
    const config = await setLogoImageUrl(url);
    res.json(config);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur lors de l'upload du logo" });
  }
});

app.get("/admin/notes", requireAdmin, async (req, res) => {
  res.json(await getNotes());
});

app.post("/admin/notes", requireAdmin, upload.fields(NOTE_IMAGE_FIELDS), async (req, res) => {
  try {
    const { name, type } = req.body;
    const imagePatch = await uploadNoteImages(req.files);
    const note = await createNote({ name, type, ...imagePatch });
    res.status(201).json(note);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message ?? "Erreur lors de la création de la note" });
  }
});

app.put("/admin/notes/:id", requireAdmin, upload.fields(NOTE_IMAGE_FIELDS), async (req, res) => {
  try {
    const { name, type } = req.body;
    const patch = {};
    if (name !== undefined) patch.name = name;
    if (type !== undefined) patch.type = type;
    Object.assign(patch, await uploadNoteImages(req.files));

    const note = await updateNote(req.params.id, patch);
    res.json(note);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message ?? "Erreur lors de la mise à jour de la note" });
  }
});

app.delete("/admin/notes/:id", requireAdmin, async (req, res) => {
  try {
    await deleteNote(req.params.id);
    res.status(204).end();
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message ?? "Erreur lors de la suppression de la note" });
  }
});

const port = process.env.PORT || 8000;
app.listen(port, () => {
  console.log(`ninno-backend listening on port ${port}`);
});
