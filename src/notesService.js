import { readFile, writeFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const NOTES_PATH = path.join(__dirname, "data", "notes.json");

let notesCache = null;

async function load() {
  if (!notesCache) {
    const raw = await readFile(NOTES_PATH, "utf-8");
    notesCache = JSON.parse(raw);
  }
  return notesCache;
}

async function persist() {
  await writeFile(NOTES_PATH, JSON.stringify(notesCache, null, 2));
}

const VALID_TYPES = ["top", "heart", "base"];
const IMAGE_FIELDS = ["imageUrl", "happyImageUrl", "sadImageUrl", "happyAnimUrl", "sadAnimUrl"];

export async function getNotes() {
  return load();
}

export async function createNote(data) {
  await load();

  if (!VALID_TYPES.includes(data.type)) {
    throw new Error("type doit être 'top', 'heart' ou 'base'");
  }
  if (!data.name) {
    throw new Error("name est requis");
  }

  const nextId = notesCache.reduce((max, n) => Math.max(max, n.id), 0) + 1;
  const note = { id: nextId, name: data.name, type: data.type };
  for (const field of IMAGE_FIELDS) {
    note[field] = data[field] ?? null;
  }

  notesCache.push(note);
  await persist();
  return note;
}

export async function updateNote(id, data) {
  await load();
  const note = notesCache.find((n) => n.id === Number(id));
  if (!note) {
    throw new Error("Note introuvable");
  }

  if (data.type !== undefined) {
    if (!VALID_TYPES.includes(data.type)) {
      throw new Error("type doit être 'top', 'heart' ou 'base'");
    }
    note.type = data.type;
  }
  if (data.name !== undefined) note.name = data.name;
  for (const field of IMAGE_FIELDS) {
    if (data[field] !== undefined) note[field] = data[field];
  }

  await persist();
  return note;
}

export async function deleteNote(id) {
  await load();
  const index = notesCache.findIndex((n) => n.id === Number(id));
  if (index === -1) {
    throw new Error("Note introuvable");
  }
  notesCache.splice(index, 1);
  await persist();
}
