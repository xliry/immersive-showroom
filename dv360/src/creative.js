(() => {
  'use strict';

  const WIDTH = __WIDTH__;
  const HEIGHT = __HEIGHT__;
  const FORMATION_SECONDS = 3.8;
  const AMBIENT_LIMIT_SECONDS = 29;
  const canvas = document.getElementById('cloud');
  const creative = document.getElementById('creative');
  const loader = document.querySelector('.loader');
  const loaderBar = document.querySelector('.loader-track i');
  const loaderValue = document.querySelector('.loader-value');
  const gl = canvas.getContext('webgl', { alpha: true, antialias: false, depth: true });

  const vertexSource = `
    precision highp float;
    attribute vec3 aPosition;
    uniform float uTime;
    uniform float uFormation;
    uniform float uYaw;
    uniform float uZoom;
    uniform vec2 uPointer;
    uniform vec2 uViewport;
    varying float vGlow;
    float hash(vec3 p) { return fract(sin(dot(p, vec3(127.1,311.7,74.7))) * 43758.5453); }
    void main() {
      vec3 p = aPosition;
      float seed = hash(p);
      float angle = seed * 6.283185 + uTime * (0.11 + seed * 0.13);
      vec3 scatter = vec3(cos(angle) * (0.55 + seed * 1.15), sin(angle * 1.31) * .42, sin(angle) * .72);
      scatter += vec3(sin(uTime * .37 + seed * 19.0), cos(uTime * .29 + seed * 11.0), 0.0) * .11;
      float eased = 1.0 - pow(1.0 - uFormation, 3.0);
      p = mix(p + scatter, p, eased);
      p.y += sin(uTime * .62 + seed * 31.0) * .008 * eased;
      float yaw = uYaw + uPointer.x * .14;
      float cy = cos(yaw); float sy = sin(yaw);
      p.xz = mat2(cy, -sy, sy, cy) * p.xz;
      p.y += uPointer.y * .08;
      float perspective = 1.0 / max(1.35 + p.z * .34, .62);
      vec2 screen = vec2(p.x * perspective, p.y * perspective);
      screen.x *= uZoom;
      screen.y *= uZoom * (uViewport.x / uViewport.y);
      screen.x += __MODEL_OFFSET_X__;
      gl_Position = vec4(screen, clamp(p.z * .08, -.8, .8), 1.0);
      gl_PointSize = mix(1.1, 2.4, perspective) * min(2.0, uViewport.y / 250.0);
      vGlow = .3 + perspective * .7 + seed * .18;
    }
  `;

  const fragmentSource = `
    precision mediump float;
    varying float vGlow;
    void main() {
      vec2 uv = gl_PointCoord - .5;
      float d = length(uv) * 2.0;
      float alpha = smoothstep(1.0, .05, d) * .72;
      if (alpha < .04) discard;
      vec3 color = mix(vec3(.0,.62,.34), vec3(.70,1.0,.86), clamp(vGlow,0.0,1.0));
      gl_FragColor = vec4(color * (1.0 + vGlow * .32), alpha);
    }
  `;

  function shader(type, source) {
    const item = gl.createShader(type);
    gl.shaderSource(item, source);
    gl.compileShader(item);
    if (!gl.getShaderParameter(item, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(item));
    return item;
  }

  function program() {
    const item = gl.createProgram();
    gl.attachShader(item, shader(gl.VERTEX_SHADER, vertexSource));
    gl.attachShader(item, shader(gl.FRAGMENT_SHADER, fragmentSource));
    gl.linkProgram(item);
    if (!gl.getProgramParameter(item, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(item));
    return item;
  }

  const state = {
    pointer: [0, 0], targetPointer: [0, 0],
    yaw: -.55, targetYaw: -.55,
    zoom: __MODEL_ZOOM__, targetZoom: __MODEL_ZOOM__,
    dragging: false, moved: false, startX: 0, startYaw: 0,
  };

  function setView(name) {
    const views = {
      exterior: [-.55, __MODEL_ZOOM__],
      profile: [0.04, __MODEL_ZOOM__ * .96],
      detail: [-.78, __MODEL_ZOOM__ * 1.48],
      interior: [-.55, __MODEL_ZOOM__],
    };
    const view = views[name] || views.exterior;
    state.targetYaw = view[0];
    state.targetZoom = view[1];
    document.querySelectorAll('[data-view]').forEach((button) => {
      const active = button.dataset.view === name;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    window.dispatchEvent(new CustomEvent('creative-view', { detail: { name } }));
    document.body.classList.toggle('interior-view', name === 'interior');
  }

  function openLanding() {
    window.open(window.clickTag, '_blank', 'noopener');
  }

  document.querySelector('.cta').addEventListener('click', (event) => { event.stopPropagation(); openLanding(); });
  document.querySelectorAll('[data-view]').forEach((button) => {
    button.addEventListener('click', (event) => { event.stopPropagation(); setView(button.dataset.view); });
  });
  creative.addEventListener('pointerdown', (event) => {
    state.dragging = true; state.moved = false; state.startX = event.clientX; state.startYaw = state.targetYaw;
    creative.setPointerCapture(event.pointerId);
  });
  creative.addEventListener('pointermove', (event) => {
    const rect = creative.getBoundingClientRect();
    state.targetPointer[0] = ((event.clientX - rect.left) / rect.width - .5) * 2;
    state.targetPointer[1] = -((event.clientY - rect.top) / rect.height - .5) * 2;
    if (!state.dragging) return;
    const distance = event.clientX - state.startX;
    state.moved = state.moved || Math.abs(distance) > 4;
    state.targetYaw = state.startYaw + distance / rect.width * 2.2;
  });
  creative.addEventListener('pointerup', () => { state.dragging = false; });
  creative.addEventListener('pointercancel', () => { state.dragging = false; });
  creative.addEventListener('click', (event) => { if (!state.moved && event.target === creative) openLanding(); });
  creative.addEventListener('pointerleave', () => { if (!state.dragging) state.targetPointer = [0, 0]; });

  if (!gl) {
    loader.querySelector('.loader-label').textContent = '3D desteklenmiyor';
    return;
  }

  const renderer = program();
  const locations = {
    position: gl.getAttribLocation(renderer, 'aPosition'),
    time: gl.getUniformLocation(renderer, 'uTime'),
    formation: gl.getUniformLocation(renderer, 'uFormation'),
    yaw: gl.getUniformLocation(renderer, 'uYaw'),
    zoom: gl.getUniformLocation(renderer, 'uZoom'),
    pointer: gl.getUniformLocation(renderer, 'uPointer'),
    viewport: gl.getUniformLocation(renderer, 'uViewport'),
  };

  Promise.resolve(__POINT_DATA__)
    .then((encoded) => {
      const data = new Float32Array(encoded.length);
      for (let index = 0; index < encoded.length; index += 1) data[index] = encoded[index] / 32767;
      const buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
      gl.useProgram(renderer);
      gl.enableVertexAttribArray(locations.position);
      gl.vertexAttribPointer(locations.position, 3, gl.FLOAT, false, 0, 0);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
      gl.disable(gl.CULL_FACE);

      const started = performance.now();
      function frame(now) {
        const seconds = (now - started) / 1000;
        const formation = Math.min(1, seconds / FORMATION_SECONDS);
        const motionTime = Math.min(seconds, AMBIENT_LIMIT_SECONDS);
        const smoothing = .065;
        state.pointer[0] += (state.targetPointer[0] - state.pointer[0]) * smoothing;
        state.pointer[1] += (state.targetPointer[1] - state.pointer[1]) * smoothing;
        state.yaw += (state.targetYaw - state.yaw) * smoothing;
        state.zoom += (state.targetZoom - state.zoom) * smoothing;

        canvas.width = WIDTH * Math.min(window.devicePixelRatio || 1, 1.5);
        canvas.height = HEIGHT * Math.min(window.devicePixelRatio || 1, 1.5);
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.uniform1f(locations.time, motionTime);
        gl.uniform1f(locations.formation, formation);
        gl.uniform1f(locations.yaw, state.yaw);
        gl.uniform1f(locations.zoom, state.zoom);
        gl.uniform2f(locations.pointer, state.pointer[0], state.pointer[1]);
        gl.uniform2f(locations.viewport, canvas.width, canvas.height);
        gl.drawArrays(gl.POINTS, 0, data.length / 3);

        const progress = Math.round(formation * 100);
        loaderBar.style.transform = `scaleX(${formation})`;
        loaderValue.textContent = String(progress).padStart(2, '0');
        loader.classList.toggle('is-done', formation >= 1);
        requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    })
    .catch(() => { loader.querySelector('.loader-label').textContent = 'POINT CLOUD YÜKLENEMEDİ'; });
})();
