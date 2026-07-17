import { readFile, writeFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = path.join(__dirname, "data", "config.json");

let configCache = null;

async function load() {
  if (!configCache) {
    const raw = await readFile(CONFIG_PATH, "utf-8");
    configCache = JSON.parse(raw);
  }
  return configCache;
}

async function persist() {
  await writeFile(CONFIG_PATH, JSON.stringify(configCache, null, 2));
}

export async function getConfig() {
  return load();
}

export async function setBackgroundImageUrl(url) {
  await load();
  configCache.backgroundImageUrl = url;
  await persist();
  return configCache;
}

export async function setLogoImageUrl(url) {
  await load();
  configCache.logoImageUrl = url;
  await persist();
  return configCache;
}
