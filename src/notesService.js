import { getPool, mapNoteRow } from "./db.js";

const VALID_TYPES = ["top", "heart", "base"];
const IMAGE_FIELDS = {
  imageUrl: "image_url",
  happyImageUrl: "happy_image_url",
  sadImageUrl: "sad_image_url",
  happyAnimUrl: "happy_anim_url",
  sadAnimUrl: "sad_anim_url",
};

export async function getNotes() {
  const [rows] = await getPool().query(
    "SELECT * FROM notes ORDER BY FIELD(type, 'top', 'heart', 'base'), id ASC"
  );
  return rows.map(mapNoteRow);
}

export async function createNote(data) {
  if (!VALID_TYPES.includes(data.type)) {
    throw new Error("type doit être 'top', 'heart' ou 'base'");
  }
  if (!data.name) {
    throw new Error("name est requis");
  }

  const [result] = await getPool().query(
    `INSERT INTO notes (
      name, type, image_url, happy_image_url, sad_image_url, happy_anim_url, sad_anim_url
    ) VALUES (
      :name, :type, :imageUrl, :happyImageUrl, :sadImageUrl, :happyAnimUrl, :sadAnimUrl
    )`,
    {
      name: data.name,
      type: data.type,
      imageUrl: data.imageUrl ?? null,
      happyImageUrl: data.happyImageUrl ?? null,
      sadImageUrl: data.sadImageUrl ?? null,
      happyAnimUrl: data.happyAnimUrl ?? null,
      sadAnimUrl: data.sadAnimUrl ?? null,
    }
  );

  const [rows] = await getPool().query("SELECT * FROM notes WHERE id = ?", [result.insertId]);
  return mapNoteRow(rows[0]);
}

export async function updateNote(id, data) {
  const pool = getPool();
  const [existing] = await pool.query("SELECT * FROM notes WHERE id = ?", [Number(id)]);
  if (!existing[0]) {
    throw new Error("Note introuvable");
  }

  if (data.type !== undefined && !VALID_TYPES.includes(data.type)) {
    throw new Error("type doit être 'top', 'heart' ou 'base'");
  }

  const sets = [];
  const params = { id: Number(id) };

  if (data.name !== undefined) {
    sets.push("name = :name");
    params.name = data.name;
  }
  if (data.type !== undefined) {
    sets.push("type = :type");
    params.type = data.type;
  }
  for (const [jsKey, column] of Object.entries(IMAGE_FIELDS)) {
    if (data[jsKey] !== undefined) {
      sets.push(`${column} = :${jsKey}`);
      params[jsKey] = data[jsKey];
    }
  }

  if (sets.length === 0) {
    return mapNoteRow(existing[0]);
  }

  await pool.query(`UPDATE notes SET ${sets.join(", ")} WHERE id = :id`, params);
  const [rows] = await pool.query("SELECT * FROM notes WHERE id = ?", [Number(id)]);
  return mapNoteRow(rows[0]);
}

export async function deleteNote(id) {
  const [result] = await getPool().query("DELETE FROM notes WHERE id = ?", [Number(id)]);
  if (result.affectedRows === 0) {
    throw new Error("Note introuvable");
  }
}
