import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const rootDir = process.cwd();
const sourceDir = path.join(rootDir, 'apps/web/public/optimized/home-hero/originals');
const outputDir = path.join(rootDir, 'apps/web/public/optimized/home-hero/avif');

const TARGET_WIDTH = 620;
const AVIF_QUALITY = 58;
const AVIF_EFFORT = 7;

async function main() {
  await fs.mkdir(outputDir, { recursive: true });
  const entries = await fs.readdir(sourceDir);
  const imageNames = entries.filter((entry) => /\.(avif|webp|png|jpe?g)$/i.test(entry)).sort();

  const manifest = [];

  for (const fileName of imageNames) {
    const inputPath = path.join(sourceDir, fileName);
    const outputName = `${path.parse(fileName).name}.avif`;
    const outputPath = path.join(outputDir, outputName);

    const inputBuffer = await fs.readFile(inputPath);
    const image = sharp(inputBuffer, { animated: false, limitInputPixels: false });
    const metadata = await image.metadata();
    const width = metadata.width ?? TARGET_WIDTH;

    const transformed = image
      .rotate()
      .resize({
        width: Math.min(width, TARGET_WIDTH),
        withoutEnlargement: true,
        fit: 'inside',
      })
      .avif({
        quality: AVIF_QUALITY,
        effort: AVIF_EFFORT,
        chromaSubsampling: '4:4:4',
      });

    await transformed.toFile(outputPath);

    let [inputStat, outputStat] = await Promise.all([fs.stat(inputPath), fs.stat(outputPath)]);

    if (outputStat.size >= inputStat.size && path.extname(fileName).toLowerCase() === '.avif') {
      await fs.copyFile(inputPath, outputPath);
      outputStat = await fs.stat(outputPath);
    }

    manifest.push({
      source: fileName,
      output: outputName,
      width: metadata.width ?? null,
      height: metadata.height ?? null,
      sourceBytes: inputStat.size,
      outputBytes: outputStat.size,
      reductionPercent:
        inputStat.size > 0
          ? Number((((inputStat.size - outputStat.size) / inputStat.size) * 100).toFixed(1))
          : 0,
    });
  }

  const manifestPath = path.join(outputDir, 'manifest.json');
  await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

  console.table(manifest);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
