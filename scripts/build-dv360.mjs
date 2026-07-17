import fs from 'node:fs';
import path from 'node:path';
import { build } from 'esbuild';
import { zipSync } from 'fflate';

const root = process.cwd();
const sourceDir = path.join(root, 'dv360', 'src');
const outputDir = path.join(root, 'dv360', 'output');
const particleSource = path.join(root, 'public', 'assets', 'hyundai-accent-particles.bin');
const vehicleSource = path.join(root, 'dv360', 'assets', 'hyundai-accent-lite.glb');
const particleBytes = fs.readFileSync(particleSource);
const sourcePoints = new Float32Array(
  particleBytes.buffer,
  particleBytes.byteOffset,
  particleBytes.byteLength / Float32Array.BYTES_PER_ELEMENT,
);

const formats = [
  { width: 970, height: 250, offsetX: .28, zoom: 1.23 },
  { width: 970, height: 500, offsetX: .22, zoom: 1.08 },
];

const html = (width, height) => `<!doctype html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=${width},height=${height},initial-scale=1">
  <meta name="ad.size" content="width=${width},height=${height}">
  <title>Hyundai Accent ${width}x${height}</title>
  <link rel="icon" href="data:,">
  <link rel="stylesheet" href="styles.css">
  <script>
    var clickTag = "https://experience.morryai.com/";
    if (location.protocol === "file:" || location.hostname === "localhost" || location.hostname === "127.0.0.1") {
      clickTag = "http://localhost:4174/?experience=1";
    }
  </script>
</head>
<body data-size="${width}x${height}">
  <main id="creative" aria-label="Hyundai Accent interaktif point cloud reklamı">
    <canvas id="cloud" aria-hidden="true"></canvas>
    <canvas id="vehicle" aria-label="Hyundai Accent üç boyutlu araç modeli"></canvas>
    <span class="ad-label">REKLAM</span>
    <section class="copy">
      <span class="eyebrow">HYUNDAI DIGITAL SHOWROOM</span>
      <h1>ACCENT</h1>
      <span class="tagline">HER AÇIDAN KEŞFET.</span>
      <i class="scan-line" aria-hidden="true"></i>
    </section>
    <span class="meta">${height === 250 ? '2013 ACCENT' : '2013 ACCENT / IMMERSIVE VIEW'}</span>
    <span class="hint">SÜRÜKLE / PERSPEKTİFİ DEĞİŞTİR</span>
    <nav class="views" aria-label="Araç görünümleri">
      <button class="is-active" data-view="exterior" aria-pressed="true">01 DIŞ</button>
      <button data-view="profile" aria-pressed="false">02 PROFİL</button>
      <button data-view="detail" aria-pressed="false">03 DETAY</button>
      <button data-view="interior" aria-pressed="false">04 İÇ</button>
    </nav>
    <button class="cta" type="button">3D DENEYİMİ AÇ</button>
    <div class="loader" aria-live="polite">
      <div class="loader-label"><span>POINT CLOUD OLUŞUYOR</span><output class="loader-value">00</output></div>
      <div class="loader-track"><i></i></div>
    </div>
  </main>
  <script src="creative.js"></script>
  <script src="vehicle.js"></script>
</body>
</html>`;

fs.rmSync(outputDir, { recursive: true, force: true });
fs.mkdirSync(outputDir, { recursive: true });

// Deterministically sample and quantize 50k source points. JSON is an accepted
// CM360/DV360 HTML5 asset type and stays comfortably below the 5 MB limit.
const targetCount = 50_000;
const sourceCount = sourcePoints.length / 3;
const points = new Array(targetCount * 3);
for (let index = 0; index < targetCount; index += 1) {
  const sourceIndex = Math.floor(index * sourceCount / targetCount);
  for (let axis = 0; axis < 3; axis += 1) {
    points[index * 3 + axis] = Math.max(-32767, Math.min(32767, Math.round(sourcePoints[sourceIndex * 3 + axis] * 32767)));
  }
}
const pointJson = JSON.stringify(points);
const vehicleBase64 = fs.readFileSync(vehicleSource).toString('base64');

for (const format of formats) {
  const name = `${format.width}x${format.height}`;
  const folder = path.join(outputDir, name, 'unpacked');
  fs.mkdirSync(folder, { recursive: true });
  fs.writeFileSync(path.join(folder, 'index.html'), html(format.width, format.height));
  fs.copyFileSync(path.join(sourceDir, 'styles.css'), path.join(folder, 'styles.css'));
  const script = fs.readFileSync(path.join(sourceDir, 'creative.js'), 'utf8')
    .replaceAll('__WIDTH__', String(format.width))
    .replaceAll('__HEIGHT__', String(format.height))
    .replaceAll('__MODEL_OFFSET_X__', String(format.offsetX))
    .replaceAll('__MODEL_ZOOM__', String(format.zoom))
    .replace('__POINT_DATA__', pointJson);
  fs.writeFileSync(path.join(folder, 'creative.js'), script);
  const vehicleScript = fs.readFileSync(path.join(sourceDir, 'vehicle.js'), 'utf8')
    .replaceAll('__WIDTH__', String(format.width))
    .replaceAll('__HEIGHT__', String(format.height))
    .replace('__MODEL_DATA__', vehicleBase64);
  await build({
    stdin: { contents: vehicleScript, resolveDir: root, sourcefile: 'vehicle.js' },
    outfile: path.join(folder, 'vehicle.js'),
    bundle: true,
    minify: true,
    format: 'iife',
    target: 'es2020',
    legalComments: 'none',
  });

  const zipPath = path.join(outputDir, name, `hyundai-accent-${name}.zip`);
  const archive = Object.fromEntries(
    ['index.html', 'styles.css', 'creative.js', 'vehicle.js'].map((file) => [
      file,
      fs.readFileSync(path.join(folder, file)),
    ]),
  );
  fs.writeFileSync(zipPath, zipSync(archive, { level: 9 }));

  for (const kind of ['backup', 'polite']) {
    const fallback = path.join(root, 'dv360', 'fallbacks', `${kind}-${name}.jpg`);
    if (fs.existsSync(fallback)) {
      fs.copyFileSync(fallback, path.join(outputDir, name, `${kind}-${name}.jpg`));
    }
  }
}

console.log(JSON.stringify(formats.map((format) => {
  const name = `${format.width}x${format.height}`;
  const zip = path.join(outputDir, name, `hyundai-accent-${name}.zip`);
  return { format: name, zipBytes: fs.statSync(zip).size, pointCount: targetCount };
}), null, 2));
