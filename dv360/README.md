# Hyundai Accent DV360 creatives

Two fixed-size HTML5 display creatives are generated from the same lightweight point-cloud and real-vehicle renderer:

- `970x250`
- `970x500`

The opening vehicle formation is rendered from a quantized point sample derived from the licensed Hyundai Accent GLB. It then transitions to an optimized real 3D vehicle with exterior, profile, detail, and cockpit/interior views. Both the point data and Meshopt-compressed GLB are embedded in generated JavaScript, so the DV360 ZIP contains only HTML, CSS, and JS assets and also works when opened directly from disk.

The creative uses no camera access, cookies, storage, audio, or external network calls. Ambient animation stops before 30 seconds; pointer interaction remains available. Each generated ZIP is about 1.6 MB, and the total uncompressed browser payload stays below 5 MB.

## Build

```powershell
npm run build:dv360
```

Artifacts are written to `dv360/output/`. Each size contains:

- an unpacked preview folder;
- `hyundai-accent-<size>.zip`, ready for DV360 validation/upload;
- a separate backup JPEG;
- a separate polite-load JPEG under 40 KB.

Local previews point to `http://localhost:4174/?experience=1`. Before trafficking, replace the fallback `https://landing-url.invalid/hyundai-accent` clickTag URL in each generated `index.html`, or set the detected exit URL in DV360 to the production Coolify showroom URL.
