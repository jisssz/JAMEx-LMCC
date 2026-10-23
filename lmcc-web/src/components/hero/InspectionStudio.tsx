import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Geometry, Mesh, Program, Renderer, Texture, Transform, type OGLRenderingContext } from 'ogl';
import { ScanLine, Fingerprint, Scale, FileText, PackageSearch, IndianRupee, Building2, Phone, ChartNoAxesColumnIncreasing, ArrowRight, ShieldCheck } from 'lucide-react';
import './InspectionStudio.css';

// Local illustration only. This component never reads or writes inspection state.
const declarations = [
  ['identity', 'PRODUCT IDENTITY', "Lay’s Classic", 'Potato chips · sample package', PackageSearch],
  ['quantity', 'NET QUANTITY', '52 g', 'Illustrative declaration', Scale],
  ['price', 'MRP', '₹ 20.00', 'Illustrative · incl. of all taxes', IndianRupee],
  ['packer', 'PACKER DETAILS', 'Sample packer', 'Illustrative details · Pune, India', Building2],
  ['care', 'CONSUMER CARE', 'Sample contact', 'Illustrative declaration only', Phone],
  ['confidence', 'OCR STATUS', 'Awaiting extraction', 'No score or inspection simulated', ChartNoAxesColumnIncreasing],
];

function packageArtwork() {
  const canvas = document.createElement('canvas');
  canvas.width = 1536;
  canvas.height = 2048;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');
  const w = canvas.width, h = canvas.height;
  const yellow = ctx.createLinearGradient(0, 0, w, 0);
  yellow.addColorStop(0, '#9f6000'); yellow.addColorStop(.08, '#f4b000');
  yellow.addColorStop(.28, '#ffe34a'); yellow.addColorStop(.52, '#ffc30d');
  yellow.addColorStop(.8, '#f6a900'); yellow.addColorStop(1, '#9b5d04');
  ctx.fillStyle = yellow; ctx.fillRect(0, 0, w, h);
  const foil = ctx.createLinearGradient(0, 0, w, 0);
  foil.addColorStop(0, '#3b200044'); foil.addColorStop(.12, '#fff6b242');
  foil.addColorStop(.24, '#fff8cf08'); foil.addColorStop(.72, '#fff8cf00');
  foil.addColorStop(.9, '#fff4a733'); foil.addColorStop(1, '#3b200044');
  ctx.fillStyle = foil; ctx.fillRect(0, 0, w, h);
  // Heat-sealed ends, diagonal crimp marks and foil folds give the illustration bag-like highlights.
  for (const y of [0, 164, h - 174, h - 72]) {
    ctx.fillStyle = '#8a510057'; ctx.fillRect(0, y, w, 12);
    ctx.fillStyle = '#fff1a34f'; ctx.fillRect(0, y + 14, w, 5);
    ctx.strokeStyle = '#9e5b056b'; ctx.lineWidth = 4;
    for (let x = -30; x < w + 40; x += 34) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 24, y + 42); ctx.stroke(); }
  }
  for (let i = 0; i < 12; i++) {
    const x = i * 150; ctx.beginPath(); ctx.moveTo(x, 160); ctx.bezierCurveTo(x + 100, 650, x - 80, 1310, x + 60, 1870);
    ctx.strokeStyle = i % 2 ? '#fff6c71a' : '#6e3f0014'; ctx.lineWidth = i % 3 === 0 ? 10 : 4; ctx.stroke();
  }
  ctx.textAlign = 'center'; ctx.fillStyle = '#8a4a05'; ctx.font = '600 30px Arial, sans-serif';
  ctx.fillText('POTATO CHIPS', w / 2, 278);
  // Original illustrative badge inspired by the supplied visual reference; this is not official pack art.
  ctx.save(); ctx.translate(w / 2, 570); ctx.rotate(-.045); ctx.shadowColor = '#8d4a00aa'; ctx.shadowBlur = 28;
  ctx.fillStyle = '#fff4bb'; ctx.beginPath(); ctx.ellipse(0, 0, 365, 218, -.06, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0; ctx.fillStyle = '#d92722'; ctx.beginPath(); ctx.ellipse(0, 3, 323, 168, -.055, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 13; ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.font = 'italic 900 196px Arial, sans-serif'; ctx.lineWidth = 8; ctx.strokeStyle = '#a51a1d';
  ctx.strokeText("Lay’s", 0, 63); ctx.fillText("Lay’s", 0, 63); ctx.restore();
  ctx.fillStyle = '#4f2c0a'; ctx.font = '500 120px Arial, sans-serif'; ctx.fillText('CLASSIC', w / 2, 795);
  const drawChip = (cx: number, cy: number, rx: number, ry: number, rotation: number) => {
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(rotation); ctx.shadowColor = '#8f4b0033'; ctx.shadowBlur = 6; ctx.shadowOffsetY = 4;
    const color = ctx.createLinearGradient(-rx, -ry, rx, ry); color.addColorStop(0, '#fff3b6'); color.addColorStop(.42, '#ffe17a'); color.addColorStop(1, '#eab23c');
    ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(-rx, 0);
    ctx.bezierCurveTo(-rx * .75, -ry * .9, -rx * .15, -ry * .75, 0, -ry * .82);
    ctx.bezierCurveTo(rx * .35, -ry, rx * .85, -ry * .4, rx, 0);
    ctx.bezierCurveTo(rx * .7, ry * .8, rx * .2, ry * .68, 0, ry * .82);
    ctx.bezierCurveTo(-rx * .45, ry, -rx * .86, ry * .38, -rx, 0); ctx.fill();
    ctx.shadowColor = 'transparent'; ctx.strokeStyle = '#fff0a5a0'; ctx.lineWidth = 7;
    ctx.beginPath(); ctx.moveTo(-rx * .68, -ry * .1); ctx.quadraticCurveTo(0, -ry * .55, rx * .68, -ry * .12); ctx.stroke(); ctx.restore();
  };
  drawChip(500, 1050, 250, 124, -.24); drawChip(1010, 1090, 238, 126, .2); drawChip(760, 1260, 280, 138, -.02);
  ctx.fillStyle = '#5b3906'; ctx.font = '700 52px Arial, sans-serif'; ctx.fillText('NET QUANTITY 52 g', w / 2, 1506);
  ctx.font = '700 62px Arial, sans-serif'; ctx.fillText('MRP ₹ 20.00', w / 2, 1570);
  ctx.font = '34px Arial, sans-serif'; ctx.fillText('(Inclusive of all taxes)', w / 2, 1612);
  ctx.strokeStyle = '#176b3b'; ctx.lineWidth = 7; ctx.strokeRect(w - 144, 1656, 58, 58);
  ctx.fillStyle = '#176b3b'; ctx.beginPath(); ctx.arc(w - 115, 1685, 17, 0, Math.PI * 2); ctx.fill();
  ctx.font = '600 28px Arial, sans-serif'; ctx.fillStyle = '#624009';
  ctx.fillText('ILLUSTRATIVE PACKAGE ART · NOT AN INSPECTION', w / 2, 1780);
  ctx.fillText('PACKER / CONTACT DECLARATIONS ARE SAMPLE PLACEHOLDERS', w / 2, 1824);
  return canvas;
}

function pouchGeometry(gl: OGLRenderingContext) {
  const columns = 48, rows = 72;
  const positions: number[] = [], normals: number[] = [], uvs: number[] = [], indices: number[] = [];
  const front: number[][] = [], back: number[][] = [];
  const point = (u: number, v: number) => {
    const edge = .88 + .12 * Math.sin(Math.PI * v);
    const pleat = .022 * Math.sin(u * 128 + v * 9) * (Math.exp(-v * 18) + Math.exp(-(1 - v) * 18));
    const x = (u - .5) * 2 * (1.3 * edge + pleat);
    const y = -2.1 + 4.2 * v + .018 * Math.sin(u * 94) * (Math.exp(-v * 22) - Math.exp(-(1 - v) * 22));
    const z = .16 * Math.sin(Math.PI * u) * Math.sin(Math.PI * v)
      + .035 * Math.sin(u * 76 + v * 11) * Math.sin(Math.PI * v)
      + .035 * Math.sin(u * 95) * (Math.exp(-v * 18) + Math.exp(-(1 - v) * 18));
    return [x, y, z];
  };
  const normalAt = (u: number, v: number) => {
    const left = point(Math.max(0, u - 1 / columns), v), right = point(Math.min(1, u + 1 / columns), v);
    const down = point(u, Math.max(0, v - 1 / rows)), up = point(u, Math.min(1, v + 1 / rows));
    const ux = right[0] - left[0], uy = right[1] - left[1], uz = right[2] - left[2];
    const vx = up[0] - down[0], vy = up[1] - down[1], vz = up[2] - down[2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const length = Math.hypot(nx, ny, nz) || 1;
    return [nx / length, ny / length, nz / length];
  };
  const addVertex = (position: number[], normal: number[], uv: number[]) => {
    const index = positions.length / 3;
    positions.push(...position); normals.push(...normal); uvs.push(...uv);
    return index;
  };
  for (let row = 0; row <= rows; row++) for (let col = 0; col <= columns; col++) {
    const u = col / columns, v = row / rows;
    const p = point(u, v), n = normalAt(u, v);
    front.push([addVertex(p, n, [u, v])]);
    back.push([addVertex([p[0], p[1], p[2] - .14], [-n[0], -n[1], -n[2]], [u, v])]);
  }
  const stride = columns + 1;
  for (let row = 0; row < rows; row++) for (let col = 0; col < columns; col++) {
    const a = row * stride + col, b = a + 1, c = a + stride, d = c + 1;
    const fa = front[a][0], fb = front[b][0], fc = front[c][0], fd = front[d][0];
    indices.push(fa, fb, fc, fb, fd, fc);
    const ba = back[a][0], bb = back[b][0], bc = back[c][0], bd = back[d][0];
    indices.push(ba, bc, bb, bb, bc, bd);
  }
  // Thin foil sidewalls make the pouch read as a flexible volume during parallax.
  const sideVertex = (position: number[], normal: number[], uv: number[]) => addVertex(position, normal, uv);
  for (let row = 0; row < rows; row++) {
    const v0 = row / rows, v1 = (row + 1) / rows;
    const lf0 = point(0, v0), lf1 = point(0, v1), lb0 = [lf0[0], lf0[1], lf0[2] - .14], lb1 = [lf1[0], lf1[1], lf1[2] - .14];
    let a = sideVertex(lf0, [-1, 0, 0], [0, v0]), b = sideVertex(lf1, [-1, 0, 0], [0, v1]);
    let c = sideVertex(lb1, [-1, 0, 0], [.035, v1]), d = sideVertex(lb0, [-1, 0, 0], [.035, v0]);
    indices.push(a, b, d, b, c, d);
    const rf0 = point(1, v0), rf1 = point(1, v1), rb0 = [rf0[0], rf0[1], rf0[2] - .14], rb1 = [rf1[0], rf1[1], rf1[2] - .14];
    a = sideVertex(rf0, [1, 0, 0], [1, v0]); b = sideVertex(rb0, [1, 0, 0], [.965, v0]);
    c = sideVertex(rb1, [1, 0, 0], [.965, v1]); d = sideVertex(rf1, [1, 0, 0], [1, v1]);
    indices.push(a, b, d, b, c, d);
  }
  for (let col = 0; col < columns; col++) {
    const u0 = col / columns, u1 = (col + 1) / columns;
    const bf0 = point(u0, 0), bf1 = point(u1, 0), bb0 = [bf0[0], bf0[1], bf0[2] - .14], bb1 = [bf1[0], bf1[1], bf1[2] - .14];
    let a = sideVertex(bf0, [0, -1, 0], [u0, 0]), b = sideVertex(bb0, [0, -1, 0], [u0, .035]);
    let c = sideVertex(bb1, [0, -1, 0], [u1, .035]), d = sideVertex(bf1, [0, -1, 0], [u1, 0]);
    indices.push(a, b, d, b, c, d);
    const tf0 = point(u0, 1), tf1 = point(u1, 1), tb0 = [tf0[0], tf0[1], tf0[2] - .14], tb1 = [tf1[0], tf1[1], tf1[2] - .14];
    a = sideVertex(tf0, [0, 1, 0], [u0, 1]); b = sideVertex(tf1, [0, 1, 0], [u1, 1]);
    c = sideVertex(tb1, [0, 1, 0], [u1, .965]); d = sideVertex(tb0, [0, 1, 0], [u0, .965]);
    indices.push(a, b, d, b, c, d);
  }
  return new Geometry(gl, {
    position: { size: 3, data: Float32Array.from(positions) }, normal: { size: 3, data: Float32Array.from(normals) },
    uv: { size: 2, data: Float32Array.from(uvs) }, index: { size: 1, data: Uint16Array.from(indices) },
  });
}

const vertex = `
attribute vec3 position; attribute vec3 normal; attribute vec2 uv;
uniform mat4 modelViewMatrix; uniform mat4 projectionMatrix; uniform mat3 normalMatrix;
varying vec2 vUv; varying vec3 vNormal; varying vec3 vPosition;
void main(){ vUv=uv; vNormal=normalize(normalMatrix*normal);
vec4 p=modelViewMatrix*vec4(position,1.); vPosition=p.xyz; gl_Position=projectionMatrix*p; }`;
const fragment = `
precision highp float;
uniform sampler2D tMap; uniform float metal;
varying vec2 vUv; varying vec3 vNormal; varying vec3 vPosition;
void main(){
vec3 n=normalize(vNormal); vec3 eye=normalize(-vPosition);
vec3 light=normalize(vec3(-3.,4.,5.));
float diffuse=max(dot(n,light),0.);
float spec=pow(max(dot(n,normalize(light+eye)),0.),mix(35.,100.,metal));
float rim=pow(1.-max(dot(n,eye),0.),3.);
vec3 base=mix(texture2D(tMap,vUv).rgb,vec3(.33,.36,.35),metal);
float fold=sin(vUv.y*54.+sin(vUv.x*17.)*3.)*.018;
float edgeShade=smoothstep(0.,.16,min(vUv.x,1.-vUv.x))*.12;
vec3 color=base*(.37+.68*diffuse+fold-edgeShade)+spec*mix(.15,.85,metal)+rim*vec3(.20,.12,.08);
gl_FragColor=vec4(color,1.); }`;

export default function InspectionStudio() {
  const navigate = useNavigate();
  const rootRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const host = canvasRef.current;
    const root = rootRef.current;
    if (!host || !root) return;
    let dispose = () => {};
    try {
      const renderer = new Renderer({ alpha: true, antialias: true, dpr: Math.min(window.devicePixelRatio, window.innerWidth < 760 ? 1 : 1.5) });
      const gl = renderer.gl;
      host.appendChild(gl.canvas);
      const scene = new Transform();
      const rig = new Transform(); rig.setParent(scene);
      const camera = new Camera(gl, { fov: 36 });
      camera.position.set(0, .45, 7.5); camera.lookAt([0, 0, 0]);
      const texture = new Texture(gl, { image: packageArtwork(), generateMipmaps: false });
      const labelProgram = new Program(gl, { vertex, fragment, uniforms: { tMap: { value: texture }, metal: { value: 0 } } });
      const bodyGeometry = pouchGeometry(gl);
      const body = new Mesh(gl, { geometry: bodyGeometry, program: labelProgram }); body.setParent(rig);
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
      let visible = false, frame = 0, elapsed = 0, previous = 0, lost = false;
      let targetX = 0, targetY = 0, x = 0, y = 0;
      const render = (time: number) => {
        frame = 0;
        if (lost) return;
        elapsed += previous ? Math.min(time - previous, 40) : 0; previous = time;
        x += (targetX - x) * .065; y += (targetY - y) * .065;
        const t = reduced.matches ? 0 : elapsed / 1000;
        rig.rotation.set(.025 + y * .06, x * .14 + Math.sin(t * .35) * .026, -.035);
        rig.position.y = .12 + Math.sin(t * .7) * .025;
        root.style.setProperty('--pointer-x', `${x * 7}px`);
        root.style.setProperty('--pointer-y', `${y * 5}px`);
        renderer.render({ scene, camera });
        if (visible && !document.hidden && !reduced.matches) frame = requestAnimationFrame(render);
      };
      const sync = () => {
        cancelAnimationFrame(frame); frame = 0; previous = 0;
        root.dataset.running = String(visible && !document.hidden && !reduced.matches && !lost);
        if (visible && !document.hidden && !lost) frame = requestAnimationFrame(render);
      };
      const resize = () => {
        renderer.setSize(host.clientWidth, host.clientHeight);
        camera.perspective({ aspect: host.clientWidth / host.clientHeight });
        sync();
      };
      const pointer = (event: PointerEvent) => {
        if (event.pointerType !== 'mouse' || reduced.matches) return;
        const bounds = root.getBoundingClientRect();
        targetX = (event.clientX - bounds.left) / bounds.width * 2 - 1;
        targetY = (event.clientY - bounds.top) / bounds.height * 2 - 1;
      };
      const reset = () => { targetX = 0; targetY = 0; };
      const contextLost = (event: Event) => { event.preventDefault(); lost = true; setReady(false); sync(); };
      const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); });
      const resizer = new ResizeObserver(resize);
      observer.observe(root); resizer.observe(host);
      root.addEventListener('pointermove', pointer); root.addEventListener('pointerleave', reset);
      gl.canvas.addEventListener('webglcontextlost', contextLost);
      document.addEventListener('visibilitychange', sync); reduced.addEventListener('change', sync);
      resize(); renderer.render({ scene, camera }); setReady(true);
      dispose = () => {
        cancelAnimationFrame(frame); observer.disconnect(); resizer.disconnect();
        root.removeEventListener('pointermove', pointer); root.removeEventListener('pointerleave', reset);
        document.removeEventListener('visibilitychange', sync); reduced.removeEventListener('change', sync);
        gl.canvas.removeEventListener('webglcontextlost', contextLost);
        bodyGeometry.remove(); labelProgram.remove();
        gl.deleteTexture(texture.texture); gl.getExtension('WEBGL_lose_context')?.loseContext();
        gl.canvas.remove();
      };
    } catch {
      host.replaceChildren(); setReady(false);
    }
    return () => dispose();
  }, []);

  return (
    <figure ref={rootRef} className="inspection-studio" data-running="false" aria-label="Sample packaged commodity inspection illustration">
      <div className="studio-toolbar"><span><i /> INSPECTION STUDIO</span><span>SAMPLE INSPECTION</span></div>
      <div className="studio-scene">
        <div className="studio-orbit" aria-hidden="true" />
        <div className="studio-floor" aria-hidden="true" />
        <div className="studio-package" aria-hidden="true">
          <div ref={canvasRef} className="studio-canvas" style={{ opacity: ready ? 1 : 0 }} />
          {!ready && <div className="studio-static-package"><small>ILLUSTRATIVE PACKAGE ART</small><strong className="static-lays">Lay’s</strong><strong>CLASSIC</strong><span>NET QUANTITY 52 g</span><span>MRP ₹ 20.00</span><small>Sample declaration values<br />Not an inspection</small></div>}
        </div>
        <div className="studio-scanner" aria-hidden="true"><span /></div>
        <div className="studio-shadow" aria-hidden="true" />
        <svg className="studio-connectors" viewBox="0 0 640 490" fill="none" aria-hidden="true">
          {['M160 95 H220 L285 170', 'M158 218 H240 L290 235', 'M480 135 H420 L355 200', 'M475 265 H420 L355 280', 'M180 340 H240 L290 305'].map((d, i) => <g key={d}><path d={d} /><path className="studio-particle" d={d} style={{ animationDelay: `${i * -.7}s` }} /><circle cx={[285, 290, 355, 355, 290][i]} cy={[170, 235, 200, 280, 305][i]} r="3" /></g>)}
        </svg>
        {declarations.map(([id, title, value, detail, Icon], index) => {
          const PanelIcon = Icon as typeof Scale;
          return <div key={String(id)} className={`studio-panel studio-panel--${String(id)}`} style={{ animationDelay: `${index * -.6}s` }}>
            <span className="studio-panel-icon"><PanelIcon size={17} aria-hidden="true" /></span>
            <div className="studio-panel-copy"><span className="studio-label">{String(title)}</span><strong>{String(value)}</strong><small>{String(detail)}</small></div>
            <span className="studio-evidence-preview" aria-hidden="true"><i /><b /></span>
          </div>;
        })}
      </div>
      <div className="studio-result">
        <span className="studio-result-icon"><ShieldCheck size={34} aria-hidden="true" /></span>
        <div className="studio-result-copy"><span className="studio-label"><Scale size={12} aria-hidden="true" /> RULE VALIDATION · SAMPLE</span><strong><i /> NEEDS REVIEW</strong><p>Illustrative declarations only. Full label evidence required.</p><small>No inspection has run. Deterministic rules decide; AI explains.</small></div>
        <button type="button" onClick={() => navigate('/rules')}>View rules <ArrowRight size={13} aria-hidden="true" /></button>
      </div>
      <ol className="studio-pipeline" aria-label="Inspection stages">
        {[['Package', Fingerprint], ['OCR extraction', ScanLine], ['Rule validation', Scale], ['Report', FileText]].map(([title, Icon], i) => {
          const StageIcon = Icon as typeof ScanLine;
          return <li key={String(title)}><StageIcon size={14} aria-hidden="true" /><span>{String(title)}</span>{i < 3 && <b aria-hidden="true">→</b>}</li>;
        })}
      </ol>
      <figcaption className="sr-only">Illustrative package and declarations only. No inspection is running.</figcaption>
    </figure>
  );
}
