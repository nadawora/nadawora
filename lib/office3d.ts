// @ts-nocheck
// 3D 오피스 장면. 가구와 캐릭터는 도형으로 만든 임시 모델이며, 나중에 무료(CC0) 3D 에셋으로 바꿀 수 있어요.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

export interface OfficeStaff { name: string; color: string; busy: string | null }

export function mountOffice(wrap: HTMLElement, overlay: HTMLElement) {
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
wrap.insertBefore(renderer.domElement, overlay);

const scene = new THREE.Scene();
scene.background = new THREE.Color('#BFE6F2');
const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 200);
cam.position.set(15, 17, 19);
cam.lookAt(-0.6, 0, 0.4);

function resize() {
  const w = wrap.clientWidth;
  const h = Math.max(360, Math.round(w * 0.64));
  renderer.setSize(w, h);
  wrap.style.height = h + 'px';
  const viewH = w < 700 ? 19 : 15.2;
  const a = w / h;
  cam.left = -viewH * a / 2; cam.right = viewH * a / 2;
  cam.top = viewH / 2; cam.bottom = -viewH / 2;
  cam.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

scene.add(new THREE.HemisphereLight('#FFFFFF', '#ECE6DA', 1.2));
const sun = new THREE.DirectionalLight('#FFF4E2', 1.9);
sun.position.set(7, 16, 9);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -22, right: 22, top: 22, bottom: -22, near: 0.5, far: 70 });
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.02;
scene.add(sun);

const matCache = {};
function M(c, opts) {
  const k = c + JSON.stringify(opts || {});
  if (!matCache[k]) matCache[k] = new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.82, metalness: 0 }, opts || {}));
  return matCache[k];
}
function add(mesh, x, y, z, parent) {
  mesh.position.set(x, y, z);
  mesh.castShadow = true; mesh.receiveShadow = true;
  (parent || scene).add(mesh);
  return mesh;
}
function rbox(w, h, d, c, x, y, z, parent, r) {
  return add(new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, r === undefined ? Math.min(w, h, d) * 0.25 : r), M(c)), x, y, z, parent);
}
function box(w, h, d, c, x, y, z, parent) {
  return add(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), M(c)), x, y, z, parent);
}
function cyl(rt, rb, h, c, x, y, z, parent, seg) {
  return add(new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg || 24), M(c)), x, y, z, parent);
}
function sph(r, c, x, y, z, parent, opts) {
  return add(new THREE.Mesh(new THREE.SphereGeometry(r, 24, 16), M(c, opts)), x, y, z, parent);
}

// ---------- floors & walls ----------
box(20.6, 0.3, 14.6, '#E4E0D8', 0, -0.15, 0);
box(8, 0.02, 6, '#EAF2FC', -6, 0.01, -4);
box(12, 0.02, 6, '#F2DFBC', 4, 0.01, -4);
for (let i = 0; i < 12; i++) box(0.03, 0.021, 6, '#E6CDA2', -1.5 + i, 0.012, -4);
box(20, 0.02, 8, '#F8F6F1', 0, 0.01, 3);
const dotG = new THREE.CircleGeometry(0.04, 6);
for (let i = 0; i < 300; i++) {
  const d = new THREE.Mesh(dotG, M(['#BFD9EE', '#F5C2B6', '#F2DFA0', '#D9D3C8'][i % 4]));
  d.rotation.x = -Math.PI / 2;
  d.position.set(-9.8 + Math.random() * 19.6, 0.022, -0.9 + Math.random() * 7.8);
  scene.add(d);
}
box(20.6, 3, 0.3, '#F4F1EC', 0, 1.5, -7.15);
box(0.3, 3, 6.3, '#F4F1EC', -10.15, 1.5, -4.15);
box(0.3, 3, 8, '#9FD3E6', -10.15, 1.5, 3);
box(20.6, 0.12, 0.32, '#E2DDD4', 0, 3.02, -7.15);
// windows (cafeteria)
for (const wx of [1.6, 4.9, 8.2]) {
  box(2.9, 1.6, 0.06, '#FFFFFF', wx, 1.75, -6.98);
  add(new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.32, 0.04), M('#BFE0F6', { emissive: '#8EC5EA', emissiveIntensity: 0.45 })), wx, 1.75, -6.95);
  box(0.06, 1.32, 0.05, '#FFFFFF', wx, 1.75, -6.93);
  for (let b = 0; b < 4; b++) box(0.32, 0.25 + ((b * 37 + wx * 10) % 5) * 0.12, 0.02, '#9DC6E3', wx - 1 + b * 0.6, 1.2 + (0.25 + ((b * 37 + wx * 10) % 5) * 0.12) / 2, -6.92);
}
// wall shelves on blue wall
for (const sz of [1.2, 4.2]) {
  box(0.3, 0.05, 1.4, '#FFFFFF', -9.85, 1.9, sz);
  box(0.16, 0.22, 0.16, '#E8590C', -9.85, 2.04, sz - 0.4);
  box(0.12, 0.3, 0.2, '#1C7ED6', -9.85, 2.08, sz);
  sph(0.1, '#37B24D', -9.85, 2.03, sz + 0.45);
}

// ---------- meeting room ----------
const glass = new THREE.MeshPhysicalMaterial({ color: '#CFE6F7', transparent: true, opacity: 0.28, roughness: 0.08 });
function glassPane(w, d, x, z) {
  const g = new THREE.Mesh(new THREE.BoxGeometry(w, 2.4, d), glass);
  g.position.set(x, 1.2, z); scene.add(g);
  box(w + 0.04, 0.06, d + 0.04, '#6B7280', x, 2.42, z);
  box(w + 0.04, 0.06, d + 0.04, '#6B7280', x, 0.03, z);
}
glassPane(0.08, 6, -2, -4);
glassPane(6, 0.08, -7, -1);
glassPane(1, 0.08, -2.5, -1);
box(2.4, 1.3, 0.08, '#1F2937', -6, 1.7, -6.95);
add(new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.1, 0.02), M('#4C6EF5', { emissive: '#3B5BDB', emissiveIntensity: 0.5 })), -6, 1.7, -6.9);
rbox(4.4, 0.12, 1.8, '#FFFFFF', -6, 0.78, -4.3, null, 0.05);
for (const lx of [-7.9, -4.1]) cyl(0.06, 0.06, 0.72, '#ADB5BD', lx, 0.36, -4.3);
rbox(0.5, 0.04, 0.35, '#E9ECEF', -6.6, 0.86, -4.2, null, 0.01);
cyl(0.06, 0.05, 0.12, '#F59F00', -5.1, 0.9, -4.0);

function chair(x, z, rot, color) {
  const g = new THREE.Group();
  rbox(0.62, 0.12, 0.6, color, 0, 0.5, 0, g, 0.05);
  rbox(0.62, 0.62, 0.1, color, 0, 0.86, -0.28, g, 0.05);
  cyl(0.04, 0.04, 0.36, '#495057', 0, 0.27, 0, g);
  cyl(0.28, 0.28, 0.05, '#495057', 0, 0.06, 0, g, 5);
  g.position.set(x, 0, z); g.rotation.y = rot;
  scene.add(g);
  return g;
}
const MESH = '#5B7DB1';
chair(-7.5, -5.4, 0, MESH); chair(-6, -5.4, 0, MESH); chair(-4.5, -5.4, 0, MESH);
chair(-8.7, -4.3, Math.PI / 2, MESH); chair(-3.3, -4.3, -Math.PI / 2, MESH);

function plant(x, z, s) {
  s = s || 1;
  cyl(0.28 * s, 0.22 * s, 0.5 * s, '#F1F3F5', x, 0.25 * s, z);
  cyl(0.24 * s, 0.24 * s, 0.04, '#6B4F3A', x, 0.5 * s, z);
  const leafM = M('#4C9A5F', { flatShading: true });
  const leafM2 = M('#3E8A50', { flatShading: true });
  for (let i = 0; i < 5; i++) {
    const l = new THREE.Mesh(new THREE.IcosahedronGeometry(0.28 * s, 0), i % 2 ? leafM : leafM2);
    const a = (i / 5) * Math.PI * 2;
    add(l, x + Math.cos(a) * 0.18 * s, (0.75 + (i % 3) * 0.18) * s, z + Math.sin(a) * 0.18 * s);
  }
  const top = new THREE.Mesh(new THREE.IcosahedronGeometry(0.3 * s, 0), leafM);
  add(top, x, 1.15 * s, z);
}
plant(-9.3, -6.4, 1.1);

// ---------- cafeteria ----------
rbox(5.2, 0.95, 0.8, '#F1F3F5', 2.6, 0.48, -6.55, null, 0.06);
rbox(5.3, 0.06, 0.86, '#D9DEE3', 2.6, 0.98, -6.55, null, 0.02);
rbox(0.6, 0.72, 0.5, '#343A40', 0.6, 1.37, -6.55, null, 0.06);
add(new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.1, 0.02), M('#FF6B6B', { emissive: '#E03131', emissiveIntensity: 0.6 })), 0.6, 1.5, -6.29);
cyl(0.06, 0.05, 0.12, '#FFFFFF', 1.2, 1.07, -6.45);
cyl(0.06, 0.05, 0.12, '#FFFFFF', 1.4, 1.07, -6.5);
cyl(0.2, 0.2, 0.55, '#CFE8FA', 3.6, 1.28, -6.5);
rbox(0.5, 0.25, 0.4, '#ADB5BD', 4.6, 1.12, -6.5, null, 0.05);
rbox(1.2, 2.3, 0.9, '#E9ECEF', 8.9, 1.15, -6.45, null, 0.08);
box(1.1, 0.03, 0.02, '#ADB5BD', 8.9, 1.45, -5.99);
box(0.05, 0.4, 0.04, '#868E96', 9.3, 1.8, -5.98);
cyl(1.9, 1.9, 0.02, '#CDEBE3', 3.7, 0.03, -3.3, null, 40);
function cafeTable(x, z) {
  cyl(0.72, 0.72, 0.07, '#FFFFFF', x, 0.76, z, null, 32);
  cyl(0.06, 0.06, 0.72, '#ADB5BD', x, 0.37, z);
  cyl(0.32, 0.32, 0.04, '#ADB5BD', x, 0.03, z);
}
function stool(x, z, c) {
  cyl(0.24, 0.24, 0.1, c, x, 0.5, z);
  cyl(0.04, 0.04, 0.46, '#868E96', x, 0.24, z);
}
cafeTable(2.2, -3.6); stool(1.2, -3.6, '#F4A261'); stool(3.2, -3.6, '#F4A261');
cafeTable(5.4, -3.0); stool(4.4, -3.0, '#F4A261'); stool(6.4, -3.0, '#F4A261');
cyl(0.05, 0.04, 0.12, '#74C0FC', 2.1, 0.86, -3.5);
cyl(0.05, 0.04, 0.12, '#FFA94D', 5.6, 0.86, -3.1);
rbox(2.8, 0.42, 1.0, '#6C8BC7', 8.3, 0.36, -2.1, null, 0.12);
rbox(2.8, 0.7, 0.3, '#5C7CBA', 8.3, 0.75, -2.55, null, 0.12);
rbox(0.3, 0.6, 1.0, '#5C7CBA', 6.95, 0.55, -2.1, null, 0.12);
rbox(0.3, 0.6, 1.0, '#5C7CBA', 9.65, 0.55, -2.1, null, 0.12);
rbox(0.5, 0.3, 0.2, '#FFE066', 7.7, 0.68, -2.3, null, 0.08);
plant(9.4, -4.6, 1.15);
plant(-1.4, -6.4, 0.9);

// ---------- work area ----------
const DESK_X = [-7.4, -4.9, -2.4];
function deskRow(z) {
  rbox(7.6, 0.08, 1.0, '#F8F9FA', -4.9, 0.78, z, null, 0.03);
  for (const lx of [-8.6, -1.2]) { box(0.06, 0.74, 0.9, '#CED4DA', lx, 0.37, z); }
  box(7.6, 0.62, 0.06, '#C9CDD2', -4.9, 1.12, z + 0.5);
  for (const px of [-6.15, -3.65]) box(0.06, 0.62, 1.0, '#C9CDD2', px, 1.12, z);
  DESK_X.forEach(function (x, i) {
    box(0.82, 0.52, 0.05, '#1F2937', x, 1.17, z + 0.18);
    add(new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.44, 0.01), M('#74C0FC', { emissive: '#4DABF7', emissiveIntensity: 0.55 })), x, 1.17, z + 0.15);
    box(0.06, 0.18, 0.06, '#495057', x, 0.9, z + 0.2);
    rbox(0.62, 0.03, 0.2, '#E9ECEF', x, 0.84, z - 0.2, null, 0.01);
    if ((i + z) % 2 < 1) cyl(0.06, 0.05, 0.12, '#F59F00', x + 0.7, 0.88, z - 0.1);
    chair(x, z - 0.95, 0, MESH);
  });
}
deskRow(1.6);
deskRow(4.6);
// whiteboard
box(3.0, 1.6, 0.06, '#FFFFFF', 3.6, 1.45, 1.4);
box(3.08, 0.06, 0.1, '#ADB5BD', 3.6, 0.63, 1.42);
for (const lx of [2.2, 5.0]) box(0.06, 1.4, 0.06, '#ADB5BD', lx, 0.7, 1.45);
[['#FFE066', 2.5, 1.8], ['#FFA8A8', 2.9, 1.75], ['#A5D8FF', 3.3, 1.82], ['#B2F2BB', 2.7, 1.35]].forEach(function (s) { box(0.3, 0.3, 0.02, s[0], s[1], s[2], 1.36); });
box(1.2, 0.04, 0.02, '#4C6EF5', 4.3, 1.8, 1.36); box(0.9, 0.04, 0.02, '#F03E3E', 4.15, 1.6, 1.36); box(1.0, 0.04, 0.02, '#495057', 4.2, 1.4, 1.36);
// printer & cabinets
rbox(1.0, 0.85, 0.8, '#F1F3F5', 6.6, 0.43, 3.0, null, 0.06);
box(0.8, 0.06, 0.5, '#495057', 6.6, 0.88, 3.0);
box(0.6, 0.02, 0.4, '#FFFFFF', 6.6, 0.6, 3.42);
for (const cz of [2.4, 3.4, 4.4, 5.4]) {
  rbox(0.9, 1.3, 0.9, '#DEE2E6', 9.3, 0.65, cz, null, 0.04);
  box(0.3, 0.04, 0.02, '#868E96', 8.84, 0.95, cz);
  box(0.3, 0.04, 0.02, '#868E96', 8.84, 0.45, cz);
}
plant(9.3, 6.5, 1.2);
plant(-0.3, 6.4, 1.0);
plant(-9.4, 6.4, 1.0);

// ---------- outdoors ----------
const ground = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), M('#A9D8A0'));
ground.rotation.x = -Math.PI / 2; ground.position.y = -0.31; ground.receiveShadow = true; scene.add(ground);
for (let i = 0; i < 160; i++) {
  const g = new THREE.Mesh(new THREE.CircleGeometry(0.5 + Math.random() * 1.2, 7), M(['#9DCF94', '#B5DFA9', '#A2D49A'][i % 3]));
  g.rotation.x = -Math.PI / 2;
  let gx, gz;
  do { gx = -40 + Math.random() * 80; gz = -40 + Math.random() * 80; } while (Math.abs(gx) < 13 && Math.abs(gz) < 10);
  g.position.set(gx, -0.3, gz); g.receiveShadow = true; scene.add(g);
}
box(25, 0.06, 19, '#EFEAE0', 0, -0.29, 0);
box(25.4, 0.08, 0.2, '#D9D2C4', 0, -0.27, 9.6); box(25.4, 0.08, 0.2, '#D9D2C4', 0, -0.27, -9.6);
box(0.2, 0.08, 19.4, '#D9D2C4', 12.6, -0.27, 0); box(0.2, 0.08, 19.4, '#D9D2C4', -12.6, -0.27, 0);
for (let i = 0; i < 8; i++) rbox(1.1, 0.06, 0.7, '#E6DFD1', 4.6, -0.25, 8.5 + i * 1.0, null, 0.03);
box(1.6, 0.04, 0.6, '#5C7CBA', 4.6, -0.24, 7.75);
function tree(x, z, s, kind) {
  s = s || 1;
  cyl(0.14 * s, 0.2 * s, 1.2 * s, '#8B5E3C', x, 0.3 * s - 0.3, z);
  const cols = kind === 'pink' ? ['#F7B7C8', '#F49AB4', '#FAD0DB'] : kind === 'yellow' ? ['#F6D66B', '#EFC24A', '#F9E39A'] : ['#5DAA68', '#4C9A5F', '#6FBF78'];
  [[0, 1.3, 0, 0.95], [0.45, 1.05, 0.2, 0.7], [-0.4, 1.1, -0.15, 0.72], [0, 1.85, 0, 0.7]].forEach(function (b, i) {
    add(new THREE.Mesh(new THREE.IcosahedronGeometry(b[3] * s, 1), M(cols[i % 3], { flatShading: true })), x + b[0] * s, b[1] * s - 0.3, z + b[2] * s);
  });
}
function bush(x, z, s, c) {
  s = s || 1;
  add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.45 * s, 1), M(c || '#5DAA68', { flatShading: true })), x, 0.05 * s - 0.1, z);
  add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.32 * s, 1), M('#6FBF78', { flatShading: true })), x + 0.35 * s, 0.0, z + 0.1 * s);
}
function flowerBed(x, z, w) {
  rbox(w, 0.35, 0.8, '#C9A27A', x, -0.12, z, null, 0.06);
  box(w - 0.15, 0.04, 0.65, '#7A5A3E', x, 0.06, z);
  const fc = ['#FF8FA3', '#FFD43B', '#FFFFFF', '#B197FC', '#FF922B'];
  for (let i = 0; i < Math.round(w * 4); i++) {
    sph(0.07, fc[i % fc.length], x - w / 2 + 0.2 + Math.random() * (w - 0.4), 0.16, z - 0.25 + Math.random() * 0.5);
  }
  for (let i = 0; i < Math.round(w * 3); i++) {
    const l = sph(0.08, '#5DAA68', x - w / 2 + 0.2 + Math.random() * (w - 0.4), 0.1, z - 0.25 + Math.random() * 0.5); l.scale.y = 0.6;
  }
}
flowerBed(-1.5, 8.4, 7);
flowerBed(9.2, 8.4, 4.5);
flowerBed(13.6, -2, 0.9);
function bench(x, z, rot) {
  const g = new THREE.Group();
  rbox(1.8, 0.1, 0.5, '#C08552', 0, 0.2, 0, g, 0.03);
  rbox(1.8, 0.4, 0.08, '#C08552', 0, 0.48, -0.22, g, 0.03);
  for (const lx of [-0.75, 0.75]) box(0.08, 0.5, 0.45, '#495057', lx, -0.06, 0, g);
  g.position.set(x, 0, z); g.rotation.y = rot || 0; scene.add(g);
}
bench(8, 10.6, 0);
bench(14.2, 3.5, -Math.PI / 2);
function lamp(x, z) {
  cyl(0.06, 0.08, 2.6, '#343A40', x, 1.0, z);
  add(new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), M('#FFF3BF', { emissive: '#FFE066', emissiveIntensity: 0.6 })), x, 2.35, z);
}
lamp(2.8, 10.2); lamp(13.5, 8.5); lamp(-13.5, -8.5);
tree(-14, -11, 1.3); tree(-6, -11.5, 1.1, 'pink'); tree(2, -11.2, 1.25); tree(9, -11, 1.1, 'yellow'); tree(15, -10.5, 1.3);
tree(15.2, -5, 1.15, 'pink'); tree(15.5, 1, 1.05); tree(15, 7.2, 1.2);
tree(-15, -3.5, 1.2); tree(-15.2, 4, 1.1, 'yellow'); tree(-14.5, 10.5, 1.25);
tree(-8, 12.5, 1.15); tree(0, 13.2, 1.05, 'pink'); tree(11.5, 13, 1.2);
bush(-12.2, 9.4, 1); bush(12.4, -9.1, 1.1); bush(-12.4, -9.2, 1); bush(13.8, 10.5, 0.9, '#4C9A5F'); bush(-3.5, 10.3, 0.8); bush(6.5, 12.2, 0.9);
// parked bicycles
for (const bx of [10.8, 11.5]) {
  const g = new THREE.Group();
  [-0.35, 0.35].forEach(function (wz) { const w = add(new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.035, 8, 20), M('#212529')), 0, 0.25, wz, g); w.rotation.y = Math.PI / 2; });
  box(0.04, 0.04, 0.7, bx > 11 ? '#4DABF7' : '#FF6B6B', 0, 0.45, 0, g);
  box(0.04, 0.3, 0.04, bx > 11 ? '#4DABF7' : '#FF6B6B', 0, 0.35, -0.2, g);
  g.position.set(bx, -0.3, 10.8); scene.add(g);
}

// ---------- characters ----------
const SKIN = '#FBE0CB';
function makeChar(o) {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const legs = [];
  [-0.11, 0.11].forEach(function (lx) {
    const piv = new THREE.Group(); piv.position.set(lx, 0.56, 0); body.add(piv);
    add(new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.32, 4, 10), M(o.pants)), 0, -0.25, 0, piv);
    const shoe = add(new THREE.Mesh(new THREE.SphereGeometry(0.1, 14, 10), M(o.shoe)), 0, -0.48, 0.04, piv);
    shoe.scale.set(1, 0.6, 1.4);
    legs.push(piv);
  });
  const torso = add(new THREE.Mesh(new THREE.CapsuleGeometry(0.25, 0.3, 6, 16), M(o.top)), 0, 0.86, 0, body);
  torso.scale.set(1, 1, 0.8);
  const arms = [];
  [-0.31, 0.31].forEach(function (ax) {
    const piv = new THREE.Group(); piv.position.set(ax, 1.08, 0); body.add(piv);
    add(new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.28, 4, 10), M(o.top)), 0, -0.2, 0, piv);
    add(new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 10), M(o.skin || SKIN)), 0, -0.41, 0, piv);
    arms.push(piv);
  });
  const head = new THREE.Group(); head.position.set(0, 1.46, 0); body.add(head);
  sph(0.34, o.skin || SKIN, 0, 0, 0, head);
  sph(0.07, o.skin || SKIN, -0.33, -0.02, 0, head); sph(0.07, o.skin || SKIN, 0.33, -0.02, 0, head);
  [-0.12, 0.12].forEach(function (ex) {
    if (o.closedEyes) {
      const e = add(new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.012, 6, 12, Math.PI), M('#2B2320')), ex, 0.0, 0.31, head);
      e.rotation.z = 0;
    } else {
      const e = sph(0.05, '#2B2320', ex, 0.0, 0.3, head); e.scale.set(1, 1.25, 0.6);
      sph(0.016, '#FFFFFF', ex + 0.016, 0.025, 0.33, head);
    }
    const ck = sph(0.05, '#F4A3A0', ex * 1.55, -0.1, 0.27, head, { transparent: true, opacity: 0.75 }); ck.scale.set(1.2, 0.6, 0.4);
  });
  const mouth = add(new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.012, 6, 12, Math.PI), M('#8A4B3C')), 0, -0.11, 0.315, head);
  mouth.rotation.z = Math.PI;
  const hairM = M(o.hair);
  const cap = add(new THREE.Mesh(new THREE.SphereGeometry(0.36, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.52), hairM), 0, 0.01, -0.02, head);
  cap.rotation.x = -0.28;
  const fringe = add(new THREE.Mesh(new THREE.SphereGeometry(0.355, 24, 10, Math.PI * 1.05, Math.PI * 0.9, Math.PI * 0.18, Math.PI * 0.16), hairM), 0, 0.03, 0.01, head);
  fringe.rotation.y = Math.PI;
  if (o.style === 'long') { const b = add(new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 0.32, 6, 14), hairM), 0, -0.25, -0.12, head); b.scale.set(1.1, 1, 0.75); }
  if (o.style === 'bun') sph(0.15, o.hair, 0, 0.37, -0.08, head);
  if (o.style === 'pony') { const p = add(new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.34, 4, 10), hairM), 0, -0.12, -0.38, head); p.rotation.x = 0.45; sph(0.05, '#FF8787', 0.0, 0.12, -0.34, head); }
  if (o.style === 'cap') {
    const c = add(new THREE.Mesh(new THREE.SphereGeometry(0.372, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.42), M(o.capColor)), 0, 0.03, 0, head);
    c.rotation.x = -0.12;
    const brim = rbox(0.42, 0.04, 0.3, o.capColor, 0, 0.13, 0.32, head, 0.02); brim.rotation.x = 0.1;
  }
  if (o.glasses) {
    [-0.12, 0.12].forEach(function (gx) {
      const g = add(new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.014, 6, o.glasses === 'square' ? 4 : 18), M('#212529')), gx, 0.0, 0.33, head);
      if (o.glasses === 'square') g.rotation.z = Math.PI / 4;
    });
    box(0.08, 0.014, 0.014, '#212529', 0, 0.01, 0.34, head);
  }
  if (o.headset) {
    const hs = add(new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.026, 8, 24, Math.PI), M('#374151')), 0, 0.02, 0, head);
    hs.rotation.y = Math.PI / 2;
    rbox(0.1, 0.16, 0.12, '#374151', -0.38, -0.02, 0, head, 0.03);
    const mic = box(0.03, 0.03, 0.26, '#374151', -0.34, -0.14, 0.14, head); mic.rotation.y = 0.5;
  }
  if (o.tie) { box(0.08, 0.3, 0.03, '#E03131', 0, 0.88, 0.21, body); box(0.24, 0.06, 0.03, '#FFFFFF', 0, 1.06, 0.18, body); }
  if (o.inner) box(0.14, 0.4, 0.03, o.inner, 0, 0.9, 0.205, body);
  if (o.collar) box(0.22, 0.08, 0.03, o.collar, 0, 1.05, 0.19, body);
  if (o.knit) { box(0.5, 0.05, 0.03, o.knit, 0, 0.62, 0.17, body); }
  box(0.1, 0.13, 0.02, '#FFFFFF', 0.13, 0.93, 0.215, body);
  box(0.1, 0.03, 0.021, '#2F5FE0', 0.13, 0.98, 0.216, body);
  box(0.012, 0.16, 0.012, '#2F5FE0', 0.09, 1.06, 0.205, body);
  if (o.clipboard) { const cb = rbox(0.26, 0.36, 0.03, '#2B2D33', 0.06, -0.38, 0.1, arms[1], 0.02); add(new THREE.Mesh(new THREE.BoxGeometry(0.21, 0.29, 0.01), M('#A5D8FF', { emissive: '#74C0FC', emissiveIntensity: 0.4 })), 0.06, -0.38, 0.12, arms[1]); cb.rotation.x = -0.3; }
  const cup = cyl(0.06, 0.05, 0.14, '#FFFFFF', 0, -0.5, 0.06, arms[1]);
  cup.visible = false;
  return { root: root, body: body, legs: legs, arms: arms, head: head, cup: cup };
}

// spots: [x, z, pose, faceY, access path from corridor]
const R2 = [[-0.6, 0], [-0.6, 2.95]];
const SPOTS = {
  desk0: { p: [-7.4, 0.68], pose: 'type', face: 0, acc: [[-7.4, 0]] },
  desk2: { p: [-4.9, 0.68], pose: 'type', face: 0, acc: [[-4.9, 0]] },
  desk3: { p: [-2.4, 0.68], pose: 'type', face: 0, acc: [[-2.4, 0]] },
  desk1: { p: [-7.4, 3.68], pose: 'type', face: 0, acc: R2.concat([[-7.4, 2.95]]) },
  desk4: { p: [-4.9, 3.68], pose: 'type', face: 0, acc: R2.concat([[-4.9, 2.95]]) },
  cafe0: { p: [1.2, -3.6], pose: 'sit', face: Math.PI / 2, acc: [[1.2, -0.3]] },
  cafe1: { p: [3.2, -3.6], pose: 'sit', face: -Math.PI / 2, acc: [[3.2, -0.3]] },
  cafe2: { p: [4.4, -3.0], pose: 'sit', face: Math.PI / 2, acc: [[4.4, -0.3]] },
  cafe3: { p: [6.4, -3.0], pose: 'sit', face: -Math.PI / 2, acc: [[6.4, -0.3]] },
  cafe4: { p: [8.0, -1.85], pose: 'sit', face: 0, acc: [[8.0, -0.3]] },
  chk2: { p: [-4.4, 0.0], pose: 'stand', face: Math.PI, acc: [] },
  chk3: { p: [-1.9, 0.0], pose: 'stand', face: Math.PI, acc: [] },
  meet0: { p: [-7.5, -5.3], pose: 'sit', face: 0, acc: [[-3.5, 0], [-3.5, -2.2], [-7.5, -2.6]] },
  meet1: { p: [-6.0, -5.3], pose: 'sit', face: 0, acc: [[-3.5, 0], [-3.5, -2.2], [-6.0, -2.6]] },
  meet2: { p: [-4.5, -5.3], pose: 'sit', face: 0, acc: [[-3.5, 0], [-3.5, -2.2], [-4.5, -2.6]] },
  meet3: { p: [-8.6, -4.3], pose: 'sit', face: Math.PI / 2, acc: [[-3.5, 0], [-3.5, -2.2], [-8.6, -2.6]] },
  meet4: { p: [-3.4, -4.3], pose: 'sit', face: -Math.PI / 2, acc: [[-3.5, 0], [-3.5, -2.2], [-3.4, -2.6]] }
};

const LOOKS = [
  { top: '#F3E3C7', inner: '#FFFFFF', pants: '#AEB6C1', shoe: '#FFFFFF', hair: '#6B4330', style: 'bun', headset: true },
  { top: '#A9CBF2', collar: '#EAF3FD', pants: '#2F3E5C', shoe: '#7A4B2A', hair: '#1F2937', style: 'short', glasses: 'round', skin: '#F5D2B8' },
  { top: '#9CC9A3', knit: '#86B88E', pants: '#D8C3A0', shoe: '#FFFFFF', hair: '#7A4B2A', style: 'short' },
  { top: '#C3B1F2', knit: '#B09BEA', pants: '#2B2D33', shoe: '#FFFFFF', hair: '#2D2A32', style: 'pony', closedEyes: true },
  { top: '#7A818C', inner: '#FFFFFF', pants: '#3B4A6B', shoe: '#1F1F1F', hair: '#4A3B35', style: 'short', glasses: 'square', clipboard: true, skin: '#F5D2B8' },
];
const DESK = ['desk1', 'desk0', 'desk2', 'desk3', 'desk4'];
const CAFE = ['cafe0', 'cafe1', 'cafe2', 'cafe3', 'cafe4'];
const REST = ['커피 한잔 하는 중', '다음 업무 기다리는 중', '라떼 한잔', '간식 타임', '소파에서 잠깐'];
const MEET = ['목표와 연결해 주세요', '진행 상황 공유할게요', '자료 정리했어요', '초안 공유할게요', '기준 점검했어요'];

let staff = [];
let meeting = false;
let reviewing = false;
let tick = 0;

const chars = LOOKS.map(function (o, i) {
  const c = makeChar(o);
  scene.add(c.root);
  const lab = document.createElement('div');
  lab.className = 'lab3d';
  const bub = document.createElement('div'); bub.className = 'bub3d';
  const nm = document.createElement('div'); nm.className = 'nm3d';
  lab.appendChild(bub); lab.appendChild(nm);
  overlay.appendChild(lab);
  const spot = SPOTS[CAFE[i]];
  c.root.position.set(spot.p[0], 0, spot.p[1]);
  return Object.assign(c, { i: i, lab: lab, bub: bub, nm: nm, spot: CAFE[i], path: [], phase: Math.random() * 6 });
});

function where(i) {
  if (meeting) return 'meet' + i;
  if (i === 4 && reviewing && !(staff[4] && staff[4].busy)) {
    const k = tick % 6;
    return k < 2 ? 'chk2' : k < 4 ? 'chk3' : DESK[4];
  }
  return staff[i] && staff[i].busy ? DESK[i] : CAFE[i];
}

function routeTo(c, key) {
  const from = SPOTS[c.spot];
  const to = SPOTS[key];
  const path = [];
  from.acc.slice().reverse().forEach(function (p) { path.push(p); });
  to.acc.forEach(function (p) { path.push(p); });
  path.push(to.p);
  c.path = path;
  c.spot = key;
}

function refresh() {
  chars.forEach(function (c, i) {
    const key = where(i);
    if (key !== c.spot) routeTo(c, key);
    const s = staff[i];
    c.lab.style.display = s ? '' : 'none';
    c.root.visible = !!s;
    if (!s) return;
    c.nm.textContent = s.name;
    c.nm.style.background = s.color;
    const kind = key.replace(/[0-9]/g, '');
    let say = kind === 'meet' ? MEET[(tick + i) % MEET.length] : kind === 'chk' ? '결과물 점검 중' : kind === 'desk' ? (s.busy ? '작업 중: ' + (s.busy.length > 14 ? s.busy.slice(0, 14) + '…' : s.busy) : '점검 기록 정리') : REST[(tick + i) % REST.length];
    if (c.path.length) say = kind === 'meet' ? '회의실로 가는 중' : kind === 'cafe' ? '카페테리아로 가는 중' : kind === 'chk' ? '점검하러 가는 중' : '자리로 가는 중';
    c.bub.textContent = say;
  });
}
const timer = setInterval(function () { tick++; refresh(); }, 3200);

const clock = new THREE.Clock();
const v = new THREE.Vector3();
let raf = 0;
function animate() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;
  chars.forEach(function (c) {
    const r = c.root;
    if (c.path.length) {
      const tgt = c.path[0];
      const dx = tgt[0] - r.position.x, dz = tgt[1] - r.position.z;
      const dist = Math.hypot(dx, dz);
      const sp = 2.4 * dt;
      if (dist <= sp) { r.position.x = tgt[0]; r.position.z = tgt[1]; c.path.shift(); if (!c.path.length) refresh(); }
      else { r.position.x += dx / dist * sp; r.position.z += dz / dist * sp; }
      const want = Math.atan2(dx, dz);
      let d = want - r.rotation.y; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2;
      r.rotation.y += d * Math.min(1, dt * 10);
      const s = Math.sin(t * 10 + c.phase);
      c.legs[0].rotation.x = s * 0.6; c.legs[1].rotation.x = -s * 0.6;
      c.arms[0].rotation.x = -s * 0.5; c.arms[1].rotation.x = s * 0.5;
      c.body.position.y = Math.abs(s) * 0.05;
      c.cup.visible = false;
    } else {
      const sp = SPOTS[c.spot];
      let d = sp.face - r.rotation.y; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2;
      r.rotation.y += d * Math.min(1, dt * 6);
      const breath = Math.sin(t * 2 + c.phase) * 0.012;
      if (sp.pose === 'type' || sp.pose === 'sit') {
        c.body.position.y = -0.06 + breath;
        c.legs[0].rotation.x = c.legs[1].rotation.x = -1.45;
        if (sp.pose === 'type') {
          c.arms[0].rotation.x = -0.9 + Math.sin(t * 14 + c.phase) * 0.08;
          c.arms[1].rotation.x = -0.9 + Math.sin(t * 14 + c.phase + 1.5) * 0.08;
          c.cup.visible = false;
        } else {
          c.arms[0].rotation.x = -0.2;
          c.arms[1].rotation.x = -0.9 + Math.sin(t * 1.2 + c.phase) * 0.25;
          c.cup.visible = c.spot.indexOf('cafe') === 0;
        }
      } else {
        c.body.position.y = breath;
        c.legs[0].rotation.x = c.legs[1].rotation.x = 0;
        c.arms[0].rotation.x = 0.05; c.arms[1].rotation.x = -0.5;
        c.cup.visible = false;
      }
      c.head.rotation.y = Math.sin(t * 0.7 + c.phase) * 0.15;
    }
  });
  renderer.render(scene, cam);
  const w = renderer.domElement.clientWidth, h = renderer.domElement.clientHeight;
  chars.forEach(function (c) {
    v.set(c.root.position.x, 2.25 + c.body.position.y, c.root.position.z).project(cam);
    c.lab.style.transform = 'translate(' + ((v.x + 1) / 2 * w) + 'px,' + ((1 - v.y) / 2 * h) + 'px) translate(-50%,-100%)';
    c.lab.style.zIndex = String(1000 + Math.round(c.root.position.z * 10));
  });
  raf = requestAnimationFrame(animate);
}
animate();

return {
  update(next, isMeeting, hasReview) {
    staff = next; meeting = isMeeting; reviewing = hasReview;
    refresh();
  },
  dispose() {
    cancelAnimationFrame(raf);
    clearInterval(timer);
    window.removeEventListener('resize', resize);
    chars.forEach(function (c) { c.lab.remove(); });
    renderer.dispose();
    renderer.domElement.remove();
  },
};
}
