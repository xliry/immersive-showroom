import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    target: 'es2022',
    sourcemap: true,
    modulePreload: false,
    rollupOptions: {
      input: {
        main: 'index.html',
        adPreview: 'ad-preview.html',
        splashLab: 'splash-lab.html',
        particleLab: 'particle-lab.html',
        particleFlow: 'particle-flow.html',
        particleVariants: 'particle-variants.html',
        particleV1: 'particle-v1.html',
        particleV2: 'particle-v2.html',
        particleV3: 'particle-v3.html',
        particleV4: 'particle-v4.html',
        particleV5: 'particle-v5.html',
        particleV6: 'particle-v6.html',
        splatMotions: 'splat-motions.html',
        splatV1: 'splat-v1.html',
        splatV2: 'splat-v2.html',
        splatV3: 'splat-v3.html',
        splatV4: 'splat-v4.html',
        splatV5: 'splat-v5.html',
        splatV6: 'splat-v6.html',
      },
      output: {
        manualChunks(id) {
          if (id.includes('@sparkjsdev/spark')) return 'spark';
          if (id.includes('@mediapipe/tasks-vision')) return 'vision';
          if (id.includes('node_modules/three')) return 'three';
        },
      },
    },
  },
});
