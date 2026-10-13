import sharp from "sharp";
import { readdir, mkdir } from "node:fs/promises";
import { resolve, join } from "node:path";
await mkdir("public/portfolio-media/projects", { recursive: true });
for (const name of await readdir("artifacts")) {
  if (
    !name.endsWith(".png") ||
    name === "donstroy.png" ||
    /^(desktop|mobile|preview|qa|social)/.test(name)
  )
    continue;
  await sharp(join("artifacts", name))
    .resize({ width: 1440, withoutEnlargement: true })
    .webp({ quality: 83 })
    .toFile(`public/portfolio-media/projects/${name.replace(".png", ".webp")}`);
}
if (process.argv[2]) {
  const folder = resolve(process.argv[2]);
  await sharp(join(folder, "фото.jpg"))
    .webp({ quality: 86 })
    .toFile("public/portfolio-media/portrait.webp");
  await sharp(join(folder, "фото.jpg"))
    .resize({ width: 480 })
    .webp({ quality: 83 })
    .toFile("public/portfolio-media/portrait-small.webp");
  await sharp(join(folder, "photo_2026-05-10_00-43-37.jpg"))
    .resize({ width: 600 })
    .webp({ quality: 82 })
    .toFile("public/portfolio-media/approach.webp");
}
console.log("WebP assets prepared. Originals are not modified.");
