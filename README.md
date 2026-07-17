# Hyundai Accent Immersive Showroom

Vite 6, TypeScript, Three.js ve Spark ile hazırlanmış masaüstü öncelikli otomotiv deneyimi. Açılışta Accent geometrisinden üretilmiş 379.981 noktalı point-cloud araç formuna süzülür ve ardından gerçek GLB modele geçer.

## Sahne görünümleri

- `EXTERIOR`: ön üç çeyrek showroom görünümü
- `COCKPIT`: sürücü göz hizasında direksiyon ve dashboard
- `REAR CABIN`: arka koltuktan ön konsol görünümü
- `WHEEL DETAIL`: ön far, tampon ve jant yakın planı

Görünümler arasında kamera konumu, rotasyonu, görüş alanı ve head-tracking hareket sınırları yumuşak biçimde geçiş yapar.

## Özellikler

- Tek WebGL renderer içinde Three.js mesh'leri ve `@sparkjsdev/spark`
- 1,9 MB SPZ v3 dosyasından gerçek araç point-cloud'u
- Point-cloud merkezlerinin GPU shader ile akış animasyonu
- MediaPipe Face Landmarker ile tamamen cihaz üzerinde yüz takibi
- Kamera izni reddedildiğinde mouse sürükleme alternatifi
- Reduced-motion, fullscreen, yeniden kalibrasyon ve debug FPS görünümü
- Coolify için Node 22 build + Nginx runtime

## Yerel geliştirme

```bash
npm install
npm run typecheck
npm run lint
npm run build
npm run dev
```

Uygulama varsayılan olarak `http://localhost:5173` üzerinde açılır. `?debug` query parametresi FPS, GPU sayaçları ve pose değerlerini gösterir.

## Varlıklar

- `public/assets/hyundai-accent-2013.glb`: 2013 Hyundai Accent modeli
- `public/assets/hyundai-accent-real-v3.spz`: 379.981 Gaussian içeren point-cloud
- `public/mediapipe/*`: yerel Face Landmarker modeli ve WASM runtime

Point-cloud, GLB'den [EA Mesh2Splat](https://github.com/electronicarts/mesh2splat) ile üretildi ve [PlayCanvas SplatTransform](https://github.com/playcanvas/splat-transform) ile SPZ v3'e sıkıştırıldı.

## Model lisansı ve atıf

`hyundai_accent_2013.glb`, [L95XP](https://sketchfab.com/I95XP) tarafından yayımlanan [Hyundai Accent 2013](https://sketchfab.com/3d-models/hyundai-accent-2013-cec6b04b06724f1088129c1054ccb1ec) modelidir ve [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) lisansı altındadır. Public yayında bu atıf korunmalıdır. SPZ varlığı bu modelden türetilmiştir ve aynı atıf zinciriyle dağıtılmalıdır.

## Coolify

1. Repoyu Coolify'a bağlayın.
2. Build Pack olarak **Dockerfile** seçin.
3. Dockerfile yolu olarak `/Dockerfile` kullanın.
4. Container portunu `80` seçin.
5. Health check path olarak `/health.txt` girin.
6. Webcam için domain üzerinde HTTPS'i etkinleştirin.

## Responsive reklam modu

Uygulama bir iframe içinde açıldığında responsive reklam modu otomatik devreye girer. Yerelde `?ad=1` ile test edilebilir. Creative; masthead, leaderboard, mobil banner ve dikdörtgen alanları viewport ölçüsünden algılar.

Desteklenen temel yerleşimler: `970x250`, `728x90`, `320x100` ve `300x250`. Reklam iframe'i içinde dört kamera sahnesi doğrudan seçilebilir; kullanıcı ayrıca 3D görünümü mouse veya dokunmayla sürükleyebilir. Geniş formatlarda sahne adları, dar banner'larda `01–04` kompakt kontroller gösterilir.

Tüm ölçüleri aynı sayfada görmek için geliştirme sunucusunda `/ad-preview.html` adresini açın.

Point-cloud splash animasyonunu GLB geçişi olmadan sürekli geliştirmek için `/splash-lab.html` sayfasını açın. Bu lab sayfasında parçacıklar yaklaşık 10 saniyelik döngüyle araç formuna akar ve yeniden dağılır; splash ekranda kalır.

Gerçek Gaussian splat için altı otomatik hareket seçeneği `/splat-motions.html` adresindedir. Her seferinde tek bir 379.981-splat sahnesi çalışır; ayrı tam ekran rotalar `/splat-v1.html` ile `/splat-v6.html` arasındadır.

Spark/SPZ'den bağımsız canlı GPU parçacık prototipleri `/particle-variants.html` adresindeki seçim galerisindedir. Altı ayrı tam ekran rota `/particle-v1.html` ile `/particle-v6.html` arasındadır. Motor, GLB yüzeyinden build-time çıkarılmış noktaları `GPUComputationRenderer` konum/hız dokularında simüle eder; fare yerine zaman tabanlı otomatik kuvvet alanları kullanır. Tam ekran sayfalarda 65.536, galeri önizlemelerinde 16.384 parçacık çalışır.

Kameralı head tracking için creative HTTPS üzerinden servis edilmeli ve yayıncı iframe'i kamera yetkisini açıkça devretmelidir:

```html
<iframe
  src="https://creative.example.com/?ad=1"
  width="970"
  height="250"
  allow="camera"
></iframe>
```

Kamera otomatik başlatılmaz. Point-cloud açılışından sonra ana deneyimdeki gibi iki seçenekli karar paneli gösterilir: kameralı deneyim veya mouse/dokunma kontrolü. Kamera seçildiğinde tarayıcı izin akışı açılır; izin verilmezse uygulama mouse/dokunma kontrolüne döner.
