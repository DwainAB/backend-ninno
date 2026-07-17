import { getPool, mapConfigRow } from "./db.js";

async function ensureConfigRow() {
  await getPool().query(
    `INSERT IGNORE INTO app_config (id, background_image_url, logo_image_url)
     VALUES (1, NULL, NULL)`
  );
}

export async function getConfig() {
  await ensureConfigRow();
  const [rows] = await getPool().query("SELECT * FROM app_config WHERE id = 1");
  return mapConfigRow(rows[0]);
}

export async function setBackgroundImageUrl(url) {
  await ensureConfigRow();
  await getPool().query(
    "UPDATE app_config SET background_image_url = :url WHERE id = 1",
    { url }
  );
  return getConfig();
}

export async function setLogoImageUrl(url) {
  await ensureConfigRow();
  await getPool().query(
    "UPDATE app_config SET logo_image_url = :url WHERE id = 1",
    { url }
  );
  return getConfig();
}
