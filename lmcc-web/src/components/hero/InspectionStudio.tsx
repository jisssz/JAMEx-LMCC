import { useEffect, useRef, useState } from 'react';
import { Camera, Cylinder, Mesh, Program, Renderer, Texture, Transform } from 'ogl';
import { ScanLine, Fingerprint, Scale, FileText } from 'lucide-react';
import './InspectionStudio.css';

// Local illustration only. This component never reads or writes inspection state.
const declarations = [
  ['identity', 'PRODUCT IDENTITY', 'Whole grain oats', 'Packaged food · illustrative'],
  ['quantity', 'NET QUANTITY', '250 g', 'Declaration located'],
  ['price', 'MRP', '₹ 99.00', 'Inclusive of all taxes'],
  ['packer', 'PACKER DETAILS', 'Sample Foods Pvt. Ltd.', '12 Sample Road, Pune 411001'],
  ['care', 'CONSUMER CARE', 'care@example.com', 'Sample contact declaration'],
  ['confidence', 'OCR CONFIDENCE', 'Awaiting extraction', 'No model score simulated'],
];

function packageArtwork() {
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 1536;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');
  ctx.fillStyle = '#e9e1cf';
  ctx.fillRect(0, 0, 2048, 1536);
  ctx.fillStyle = '#253c36';
  ctx.fillRect(0, 0, 2048, 130);
  ctx.fillRect(0, 1310, 2048, 226);
  // Repeat the front label around the cylinder so restrained rotation keeps it legible.
  for (const x of [512, 1536]) {
    ctx.textAlign = 'center';
    ctx.fillStyle = '#a95730';
    ctx.font = '26px sans-serif';
    ctx.fillText('S A M P L E   P A C K A G E', x, 235);
    ctx.fillStyle = '#253c36';
    ctx.font = 'bold 100px Georgia';
    ctx.fillText('Whole grain', x, 385);
    ctx.font = 'bold 180px Georgia';
    ctx.fillText('Oats', x, 570);
    ctx.strokeStyle = '#a07c43';
    ctx.lineWidth = 5;
    for (let i = -2; i <= 2; i++) {
      const sx = x + i * 55;
      ctx.beginPath(); ctx.moveTo(sx, 850); ctx.lineTo(sx + i * 10, 660); ctx.stroke();
      for (let j = 0; j < 4; j++) {
        ctx.beginPath(); ctx.ellipse(sx - 16 + i * j * 2, 690 + j * 33, 10, 24, -.6, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.ellipse(sx + 16 + i * j * 2, 705 + j * 33, 10, 24, .6, 0, Math.PI * 2); ctx.stroke();
      }
    }
    ctx.font = 'bold 42px sans-serif';
    ctx.fillText('NET QUANTITY 250 g', x, 955);
    ctx.font = '36px sans-serif';
    ctx.fillText('MRP ₹ 99.00 · incl. of all taxes', x, 1020);
    ctx.font = '28px sans-serif';
    ctx.fillText('Packed by Sample Foods Pvt. Ltd.', x, 1100);
    ctx.fillText('12 Sample Road, Pune 411001', x, 1145);
    ctx.fillText('Consumer care: care@example.com', x, 1205);
    ctx.fillStyle = '#e9e1cf';
    ctx.font = '25px sans-serif';
    ctx.fillText('ILLUSTRATION ONLY · NOT FOR SALE', x, 1400);
  }
  return canvas;
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
vec3 color=base*(.37+.68*diffuse)+spec*mix(.15,.85,metal)+rim*vec3(.16,.10,.23);
gl_FragColor=vec4(color,1.); }`;

export default function InspectionStudio() {
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
      const metalProgram = new Program(gl, { vertex, fragment, uniforms: { tMap: { value: texture }, metal: { value: 1 } } });
      const bodyGeometry = new Cylinder(gl, { radiusTop: .76, radiusBottom: .76, height: 2.65, radialSegments: 64 });
      const lidGeometry = new Cylinder(gl, { radiusTop: .79, radiusBottom: .79, height: .095, radialSegments: 64 });
      const body = new Mesh(gl, { geometry: bodyGeometry, program: labelProgram }); body.setParent(rig);
      for (const y of [-1.34, 1.34]) {
        const lid = new Mesh(gl, { geometry: lidGeometry, program: metalProgram }); lid.position.y = y; lid.setParent(rig);
      }
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
      let visible = false, frame = 0, elapsed = 0, previous = 0, lost = false;
      let targetX = 0, targetY = 0, x = 0, y = 0;
      const render = (time: number) => {
        frame = 0;
        if (lost) return;
        elapsed += previous ? Math.min(time - previous, 40) : 0; previous = time;
        x += (targetX - x) * .065; y += (targetY - y) * .065;
        const t = reduced.matches ? 0 : elapsed / 1000;
        rig.rotation.set(.08 + y * .1, -Math.PI / 2 + x * .22 + Math.sin(t * .35) * .07, -.10);
        rig.position.y = Math.sin(t * .7) * .035;
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
        bodyGeometry.remove(); lidGeometry.remove(); labelProgram.remove(); metalProgram.remove();
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
          {!ready && <div className="studio-static-package"><small>SAMPLE PACKAGE</small><strong>Whole grain<br /><em>Oats</em></strong><span>NET QUANTITY 250 g</span><span>MRP ₹ 99.00</span><small>Sample Foods Pvt. Ltd.<br />care@example.com</small></div>}
        </div>
        <div className="studio-scanner" aria-hidden="true"><span /></div>
        <svg className="studio-connectors" viewBox="0 0 640 490" fill="none" aria-hidden="true">
          {['M160 95 H220 L285 170', 'M158 218 H240 L290 235', 'M480 135 H420 L355 200', 'M475 265 H420 L355 280', 'M180 340 H240 L290 305'].map((d, i) => <g key={d}><path d={d} /><path className="studio-particle" d={d} style={{ animationDelay: `${i * -.7}s` }} /><circle cx={[285, 290, 355, 355, 290][i]} cy={[170, 235, 200, 280, 305][i]} r="3" /></g>)}
        </svg>
        {declarations.map(([id, title, value, detail], index) => <div key={id} className={`studio-panel studio-panel--${id}`} style={{ animationDelay: `${index * -.6}s` }}>
          <span className="studio-label">{title}</span><strong>{value}</strong><small>{detail}</small>
        </div>)}
        <div className="studio-result"><span className="studio-label"><Scale size={12} aria-hidden="true" /> RULE VALIDATION · SAMPLE</span><strong><span /> NEEDS REVIEW</strong><p>Full label evidence required.</p><small>Deterministic rules decide. AI explains.</small></div>
      </div>
      <ol className="studio-pipeline" aria-label="Inspection stages">
        {[['Package', Fingerprint], ['OCR extraction', ScanLine], ['Rule validation', Scale], ['Report', FileText]].map(([title, Icon], i) => {
          const StageIcon = Icon as typeof ScanLine;
          return <li key={String(title)}><StageIcon size={14} aria-hidden="true" /><span>{String(title)}</span>{i < 3 && <b aria-hidden="true">→</b>}</li>;
        })}
      </ol>
      <figcaption>Illustrative declarations only. No inspection is running.</figcaption>
    </figure>
  );
}
