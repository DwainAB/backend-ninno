import mysql from "mysql2/promise";
import { readFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let pool = null;

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Variable d'environnement manquante: ${name}`);
  }
  return value;
}

export function getPool() {
  if (!pool) {
    throw new Error("Base de données non initialisée. Appeler initDb() d'abord.");
  }
  return pool;
}

export async function initDb() {
  const connectionUrl = process.env.MYSQL_URL || process.env.MYSQL_PUBLIC_URL;

  console.log(
    connectionUrl
      ? "Connexion MySQL via MYSQL_URL..."
      : `Connexion MySQL via variables individuelles (host=${process.env.MYSQL_HOST || "127.0.0.1"})...`
  );

  pool = connectionUrl
    ? mysql.createPool({
        uri: connectionUrl,
        waitForConnections: true,
        connectionLimit: 10,
        namedPlaceholders: true,
        connectTimeout: 10000,
      })
    : mysql.createPool({
        host: process.env.MYSQL_HOST || "127.0.0.1",
        port: Number(process.env.MYSQL_PORT || 3306),
        user: requireEnv("MYSQL_USER"),
        password: process.env.MYSQL_PASSWORD ?? "",
        database: requireEnv("MYSQL_DATABASE"),
        waitForConnections: true,
        connectionLimit: 10,
        namedPlaceholders: true,
        connectTimeout: 10000,
      });

  console.log("Création des tables...");
  await pool.query(`
    CREATE TABLE IF NOT EXISTS notes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      type ENUM('top', 'heart', 'base') NOT NULL,
      image_url TEXT NULL,
      happy_image_url TEXT NULL,
      sad_image_url TEXT NULL,
      happy_anim_url TEXT NULL,
      sad_anim_url TEXT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_config (
      id TINYINT PRIMARY KEY DEFAULT 1,
      background_image_url TEXT NULL,
      logo_image_url TEXT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  console.log("Tables prêtes, seed en cours...");
  await seedIfEmpty();
  console.log("MySQL prêt");
}

async function seedIfEmpty() {
  const [noteRows] = await pool.query("SELECT COUNT(*) AS count FROM notes");
  if (noteRows[0].count === 0) {
    const raw = await readFile(path.join(__dirname, "data", "notes.json"), "utf-8");
    const notes = JSON.parse(raw);
    for (const note of notes) {
      await pool.query(
        `INSERT INTO notes (
          id, name, type, image_url, happy_image_url, sad_image_url, happy_anim_url, sad_anim_url
        ) VALUES (
          :id, :name, :type, :imageUrl, :happyImageUrl, :sadImageUrl, :happyAnimUrl, :sadAnimUrl
        )`,
        {
          id: note.id,
          name: note.name,
          type: note.type,
          imageUrl: note.imageUrl,
          happyImageUrl: note.happyImageUrl,
          sadImageUrl: note.sadImageUrl,
          happyAnimUrl: note.happyAnimUrl,
          sadAnimUrl: note.sadAnimUrl,
        }
      );
    }
    await pool.query("ALTER TABLE notes AUTO_INCREMENT = ?", [notes.length + 1]);
    console.log(`Seed: ${notes.length} notes importées`);
  }

  const [configRows] = await pool.query("SELECT COUNT(*) AS count FROM app_config");
  if (configRows[0].count === 0) {
    const raw = await readFile(path.join(__dirname, "data", "config.json"), "utf-8");
    const config = JSON.parse(raw);
    await pool.query(
      `INSERT INTO app_config (id, background_image_url, logo_image_url)
       VALUES (1, :backgroundImageUrl, :logoImageUrl)`,
      {
        backgroundImageUrl: config.backgroundImageUrl || null,
        logoImageUrl: config.logoImageUrl || null,
      }
    );
    console.log("Seed: config importée");
  }
}

export function mapNoteRow(row) {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    imageUrl: row.image_url,
    happyImageUrl: row.happy_image_url,
    sadImageUrl: row.sad_image_url,
    happyAnimUrl: row.happy_anim_url,
    sadAnimUrl: row.sad_anim_url,
  };
}

export function mapConfigRow(row) {
  return {
    backgroundImageUrl: row.background_image_url ?? "",
    logoImageUrl: row.logo_image_url ?? "",
  };
}
