import OpenAI from "openai";
import { getNotes } from "./notesService.js";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function formatNotesCatalog(notes, type) {
  return notes
    .filter((n) => n.type === type)
    .map((n) => `- ${n.name}`)
    .join("\n");
}

function formatPreferences(label, liked, disliked) {
  return `${label} — aimées: ${liked.join(", ") || "aucune"} ; détestées: ${disliked.join(", ") || "aucune"}`;
}

export async function generateFormula({ top, heart, base }) {
  const notes = await getNotes();

  const prompt = [
    "Tu es un parfumeur expert. Tu dois composer un parfum sur mesure en choisissant des notes UNIQUEMENT dans le catalogue fourni ci-dessous, en te basant sur les préférences (aimé/pas aimé) exprimées par le client lors d'un questionnaire.",
    "",
    "Catalogue de notes de tête disponibles :",
    formatNotesCatalog(notes, "top"),
    "",
    "Catalogue de notes de cœur disponibles :",
    formatNotesCatalog(notes, "heart"),
    "",
    "Catalogue de notes de fond disponibles :",
    formatNotesCatalog(notes, "base"),
    "",
    "Préférences exprimées par le client (basées sur des notes d'exemple, à interpréter selon l'ambiance qu'elles évoquent, pas littéralement) :",
    formatPreferences("Notes de tête", top.liked ?? [], top.disliked ?? []),
    formatPreferences("Notes de cœur", heart.liked ?? [], heart.disliked ?? []),
    formatPreferences("Notes de fond", base.liked ?? [], base.disliked ?? []),
    "",
    "Choisis exactement 3 notes de tête, 3 notes de cœur et 3 notes de fond PARMI le catalogue ci-dessus (utilise le nom exact tel qu'il apparaît dans le catalogue).",
    "Réponds UNIQUEMENT avec un objet JSON valide, sans texte autour, au format exact suivant :",
    '{"top_notes": ["..."], "heart_notes": ["..."], "base_notes": ["..."], "description": "1 courte phrase (maximum 80 caractères) décrivant l\'ambiance et le caractère du parfum, sans énumérer les notes"}',
  ].join("\n");

  const response = await client.chat.completions.create({
    model: "gpt-4.1-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.8,
    response_format: { type: "json_object" },
  });

  const result = JSON.parse(response.choices[0].message.content);

  return {
    topNotes: (result.top_notes ?? []).slice(0, 3),
    heartNotes: (result.heart_notes ?? []).slice(0, 3),
    baseNotes: (result.base_notes ?? []).slice(0, 3),
    description: (result.description ?? "").trim().slice(0, 120),
  };
}
