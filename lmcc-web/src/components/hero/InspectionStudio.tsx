import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Geometry, Mesh, Program, Renderer, Texture, Transform, type OGLRenderingContext } from 'ogl';
import { ScanLine, Fingerprint, Scale, FileText, PackageSearch, IndianRupee, Building2, Phone, ChartNoAxesColumnIncreasing, ArrowRight, ShieldCheck } from 'lucide-react';
import './InspectionStudio.css';

const PACKAGE_IMAGE = '/images/lays-classic-packet.png';

// Sample display only. This component never reads or writes inspection state.
const declarations = [
  ['identity', 'PRODUCT IDENTITY', "Lay’s Classic", 'Potato chips · sample package', PackageSearch],
  ['quantity', 'NET QUANTITY', '52 g', 'Illustrative declaration', Scale],
  ['price', 'MRP', '₹ 20.00', 'Illustrative · incl. of all taxes', IndianRupee],
  ['packer', 'PACKER DETAILS', 'Sample packer', 'Illustrative details · Pune, India', Building2],
  ['care', 'CONSUMER CARE', 'Sample contact', 'Illustrative declaration only', Phone],
  ['confidence', 'OCR STATUS', 'Awaiting extraction', 'No score or inspection simulated', ChartNoAxesColumnIncreasing],
];

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
vec4 tex=texture2D(tMap,vUv);
vec3 color=tex.rgb*(.9+.1*diffuse)+spec*mix(.025,.18,metal)+rim*vec3(.055,.032,.008);
gl_FragColor=vec4(color,tex.a); }`;

export default function InspectionStudio() {
  const navigate = useNavigate();
  const rootRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [assetFailed, setAssetFailed] = useState(false);

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
      const texture = new Texture(gl, { generateMipmaps: false, flipY: true });
      const artwork = new Image();
      artwork.onload = () => {
        texture.image = artwork;
        texture.needsUpdate = true;
        setAssetFailed(false);
        setReady(true);
        renderer.render({ scene, camera });
      };
      artwork.onerror = () => { setAssetFailed(true); setReady(false); };
      artwork.src = PACKAGE_IMAGE;
      const labelProgram = new Program(gl, { vertex, fragment, transparent: true, uniforms: { tMap: { value: texture }, metal: { value: 0 } } });
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
      resize(); renderer.render({ scene, camera });
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
      <figure ref={rootRef} className="inspection-studio" data-running="false">
      <div className="studio-toolbar"><span><i /> INSPECTION STUDIO</span><span>SAMPLE INSPECTION</span></div>
      <div className="studio-scene">
        <div className="studio-orbit" aria-hidden="true" />
        <div className="studio-floor" aria-hidden="true" />
        <div className="studio-package">
          <img className="studio-static-image" src={PACKAGE_IMAGE} alt="Yellow Lay’s Classic potato chips packet, 52 g, MRP ₹20.00" fetchPriority="high" decoding="async" onError={() => setAssetFailed(true)} aria-hidden={ready} style={{ opacity: ready ? 0 : 1 }} />
          <div ref={canvasRef} className="studio-canvas" aria-hidden="true" style={{ opacity: ready ? 1 : 0 }} />
          {assetFailed && <div className="studio-image-error" role="img" aria-label="Packet image unavailable">Packet image unavailable</div>}
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
