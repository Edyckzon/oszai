import * as THREE from 'three';

// One point-cloud draw call; displacement runs on the GPU, not in a per-point JS loop.
export function createParticleScene(field: HTMLElement) {
  const canvas = field.querySelector('canvas')!;
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: 'low-power' });
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(48, 1, .1, 80);
  camera.position.z = 14;
  const compact = matchMedia('(max-width: 800px)').matches;
  const count = compact ? 1500 : 4600;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const seeds = new Float32Array(count);
  const sizes = new Float32Array(count);
  const palette = ['#619fff', '#9c87eb', '#76c5bf', '#e5c575'].map(color => new THREE.Color(color));
  // Stable geometry avoids a different composition on every navigation.
  let seed = 20261004;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  for (let i = 0; i < count; i++) {
    const orbit = i < count * .60;
    const angle = random() * Math.PI * 2;
    const radius = 4.8 + random() * 1.9;
    positions[i * 3] = orbit ? Math.cos(angle) * radius + 3.9 : (random() - .5) * 30;
    positions[i * 3 + 1] = orbit ? Math.sin(angle) * radius * .78 : (random() - .5) * 18;
    positions[i * 3 + 2] = orbit ? Math.sin(angle * 2.0) * .7 + (random() - .5) * .7 : (random() - .5) * 8;
    const shade = random();
    const color = palette[shade < .65 ? 0 : shade < .83 ? 1 : shade < .96 ? 2 : 3];
    color.toArray(colors, i * 3);
    seeds[i] = random();
    sizes[i] = orbit ? .8 + random() * 1.1 : 1 + random() * 1.7;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
  geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
  const uniforms = {
    uTime: { value: 0 }, uScroll: { value: 0 }, uHorizontal: { value: 0 },
    uPointer: { value: new THREE.Vector2(20, 20) }, uAspect: { value: 1 },
    uRatio: { value: 1 }, uLight: { value: 0 }, uMobile: { value: compact ? 1 : 0 },
  };
  const material = new THREE.ShaderMaterial({
    uniforms, transparent: true, depthWrite: false, vertexColors: true, blending: THREE.AdditiveBlending,
    vertexShader: `
      attribute float aSeed;
      attribute float aSize;
      uniform float uTime, uScroll, uHorizontal, uAspect, uRatio, uMobile;
      uniform vec2 uPointer;
      varying vec3 vColor;
      varying float vAlpha;
      void main() {
        vec3 p = position;
        float phase = uTime * .12 + aSeed * 6.283;
        float angle = uScroll * 2.8 + uHorizontal * 1.1;
        float c = cos(angle * .3), s = sin(angle * .3);
        p.xy = mat2(c, -s, s, c) * p.xy;
        p.x += sin(p.y * .7 + phase) * (.12 + uScroll * .45) + uHorizontal * 1.7;
        p.y += cos(p.x * .55 + phase) * .18 - uScroll * 2.2;
        p.z += sin(p.x * .45 + phase + uScroll * 3.) * (.3 + uScroll * .8);
        p.x -= uMobile * 3.9;
        p.y -= uMobile * 1.5;
        vec4 viewPosition = modelViewMatrix * vec4(p, 1.0);
        vec4 projected = projectionMatrix * viewPosition;
        vec2 delta = projected.xy / projected.w - uPointer;
        delta.x *= uAspect;
        float influence = exp(-dot(delta, delta) * 7.0);
        viewPosition.xy += normalize(delta + vec2(.001)) * influence * .85;
        viewPosition.z += influence * .5;
        gl_Position = projectionMatrix * viewPosition;
        gl_PointSize = clamp(aSize * uRatio * 30.0 / -viewPosition.z, 1.5, 6.);
        vColor = color;
        vAlpha = (.48 + aSeed * .52) * (1. - uScroll * .24);
      }
    `,
    fragmentShader: `
      uniform float uLight;
      varying vec3 vColor;
      varying float vAlpha;
      void main() {
        float d = length(gl_PointCoord - .5) * 2.;
        if (d > 1.) discard;
        float alpha = pow(1. - d, 1.6) * vAlpha;
        vec3 tint = mix(vColor, vColor * .40, uLight);
        gl_FragColor = vec4(tint, alpha * mix(.92, .40, uLight));
      }
    `,
  });
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  scene.add(points);
  let paused = false;
  let destroyed = false;
  let targetScroll = 0;
  let targetHorizontal = 0;
  let last = 0;
  let frameCount = 0;
  const pointerTarget = new THREE.Vector2(20, 20);
  const abort = new AbortController();
  const options = { passive: true, signal: abort.signal };
  function measure() {
    const w = innerWidth, h = innerHeight;
    const ratio = Math.min(devicePixelRatio, compact ? 1.25 : 1.6);
    renderer.setPixelRatio(ratio);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    uniforms.uAspect.value = w / h;
    uniforms.uRatio.value = ratio;
    uniforms.uMobile.value = w < 801 ? 1 : 0;
    targetScroll = Math.min(1, scrollY / Math.max(1, document.documentElement.scrollHeight - h));
    renderer.render(scene, camera);
  }
  function theme() {
    const light = document.documentElement.dataset.theme === 'light';
    uniforms.uLight.value = light ? 1 : 0;
    material.blending = light ? THREE.NormalBlending : THREE.AdditiveBlending;
    material.needsUpdate = true;
    renderer.render(scene, camera);
  }
  function render(timestamp: number) {
    if (timestamp - last < (compact ? 1000 / 30 : 1000 / 45)) return;
    const dt = Math.min((timestamp - last) / 1000, .06);
    last = timestamp;
    uniforms.uTime.value += dt;
    uniforms.uScroll.value += (targetScroll - uniforms.uScroll.value) * .07;
    uniforms.uHorizontal.value += (targetHorizontal - uniforms.uHorizontal.value) * .06;
    uniforms.uPointer.value.lerp(pointerTarget, .11);
    renderer.render(scene, camera);
    // Expose rendered state on the canvas container for diagnostics and progressive enhancement.
    if (++frameCount % 30 === 0) {
      field.dataset.scroll = uniforms.uScroll.value.toFixed(3);
      field.dataset.horizontal = uniforms.uHorizontal.value.toFixed(3);
    }
  }
  function update(nextPaused: boolean) {
    paused = nextPaused;
    if (!paused) targetScroll = Math.min(1, scrollY / Math.max(1, document.documentElement.scrollHeight - innerHeight));
    renderer.setAnimationLoop(paused || document.hidden ? null : render);
    last = performance.now();
  }
  window.addEventListener('pointermove', event => {
    if (paused) return;
    pointerTarget.set(event.clientX / innerWidth * 2 - 1, -(event.clientY / innerHeight) * 2 + 1);
    field.dataset.pointer = `${Math.round(event.clientX)},${Math.round(event.clientY)}`;
  }, options);
  document.addEventListener('pointerleave', () => pointerTarget.set(20, 20), options);
  window.addEventListener('scroll', () => { if (!paused) targetScroll = Math.min(1, scrollY / Math.max(1, document.documentElement.scrollHeight - innerHeight)); }, options);
  window.addEventListener('wheel', event => { if (!paused && Math.abs(event.deltaX) > 1) targetHorizontal = Math.max(-1, Math.min(1, targetHorizontal + event.deltaX * .001)); }, options);
  window.addEventListener('osz:journey', event => { if (!paused) targetHorizontal = (event as CustomEvent<number>).detail; }, { signal: abort.signal });
  window.addEventListener('resize', measure, options);
  const themeObserver = new MutationObserver(theme);
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  canvas.addEventListener('webglcontextlost', event => {
    event.preventDefault(); renderer.setAnimationLoop(null); field.dataset.renderer = 'fallback';
  }, { signal: abort.signal });
  canvas.addEventListener('webglcontextrestored', () => { if (!destroyed) { field.dataset.renderer = 'webgl'; theme(); update(paused); } }, { signal: abort.signal });
  measure(); theme();
  field.dataset.renderer = 'webgl';
  update(false);
  return { update, dispose() { destroyed = true; abort.abort(); themeObserver.disconnect(); renderer.setAnimationLoop(null); geometry.dispose(); material.dispose(); renderer.dispose(); } };
}
