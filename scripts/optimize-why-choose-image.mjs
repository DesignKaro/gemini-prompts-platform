import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const rootDir = process.cwd();
const sourcePath = path.join(
  rootDir,
  'apps/web/public/optimized/why-choose/originals/livemint-replacement.png',
);
const outputDir = path.join(rootDir, 'apps/web/public/optimized/why-choose/avif');
const outputPath = path.join(outputDir, 'livemint-replacement.avif');

async function main() {
  await fs.mkdir(outputDir, { recursive: true });

  const image = sharp(sourcePath, { animated: false, limitInputPixels: false });
  const metadata = await image.metadata();

  await image
    .rotate()
    .resize({
      width: Math.min(metadata.width ?? 960, 960),
      withoutEnlargement: true,
      fit: 'inside',
    })
    .avif({
      quality: 60,
      effort: 7,
      chromaSubsampling: '4:4:4',
    })
    .toFile(outputPath);

  const [sourceStat, outputStat] = await Promise.all([fs.stat(sourcePath), fs.stat(outputPath)]);
  const manifest = {
    source: path.basename(sourcePath),
    output: path.basename(outputPath),
    width: metadata.width ?? null,
    height: metadata.height ?? null,
    sourceBytes: sourceStat.size,
    outputBytes: outputStat.size,
    reductionPercent: Number(
      (((sourceStat.size - outputStat.size) / sourceStat.size) * 100).toFixed(1),
    ),
  };

  await fs.writeFile(
    path.join(outputDir, 'manifest.json'),
    `${JSON.stringify(manifest, null, 2)}\n`,
    'utf8',
  );

  console.log(JSON.stringify(manifest, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
