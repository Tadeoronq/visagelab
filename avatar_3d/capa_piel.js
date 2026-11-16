// ============================================================================
// VISAGELAB - CAPA 4: PIEL (COLORIMETRÍA CIELAB, ENVOLTURA ANTI-PERFORACIÓN
// Y PUENTE DE IMPORTACIÓN DE DIAGNÓSTICO FACIAL / CORPORAL)
// ============================================================================

// ============================================================================
// [BLOQUE 1] IMPORTACIONES, MOTOR COLORIMÉTRICO CIELAB (L*a*b*) Y TEXTURA PBR
// Función: Importa Three.js y GLTFLoader, implementa la conversión matemática
// bidireccional entre CIELAB (L*, a*, b*), sRGB/HEX y HSL para evitar sombras
// grises, y genera en canvas 2D el mapa de micro-relieve de poros cutáneos.
// ============================================================================
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.158.0/build/three.module.js";
import { GLTFLoader } from "https://cdn.jsdelivr.net/npm/three@0.158.0/examples/jsm/loaders/GLTFLoader.js";

function acotar(val, min, max) {
  return THREE.MathUtils.clamp(Number.isFinite(val) ? val : min, min, max);
}

// Convierte un color HEX (#rrggbb) al espacio perceptivo CIELAB { L, a, b }
export function hexToLab(hex = "#d9a37a") {
  const c = new THREE.Color(hex);
  let r = c.r, g = c.g, b = c.b;

  // sRGB a lineal
  r = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
  g = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
  b = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;

  // Lineal a XYZ (D65)
  let x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047;
  let y = (r * 0.2126 + g * 0.7152 + b * 0.0722) / 1.00000;
  let z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;

  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const fx = f(x), fy = f(y), fz = f(z);

  return {
    L: acotar(116 * fy - 16, 15, 95),
    a: acotar(500 * (fx - fy), -20, 45),
    b: acotar(200 * (fy - fz), -20, 55)
  };
}

// Convierte coordenadas CIELAB (L*, a*, b*) a color HEX (#rrggbb)
export function labToHex(L = 70, a = 14, b = 24) {
  let y = (L + 16) / 116;
  let x = a / 500 + y;
  let z = y - b / 200;

  const invF = (t) => {
    const t3 = t * t * t;
    return t3 > 0.008856 ? t3 : (t - 16 / 116) / 7.787;
  };

  x = 0.95047 * invF(x);
  y = 1.00000 * invF(y);
  z = 1.08883 * invF(z);

  let r = x * 3.2406 + y * -1.5372 + z * -0.4986;
  let g = x * -0.9689 + y * 1.8758 + z * 0.0415;
  let bl = x * 0.0557 + y * -0.2040 + z * 1.0570;

  const toSrgb = (u) => (u > 0.0031308 ? 1.055 * Math.pow(u, 1 / 2.4) - 0.055 : 12.92 * u);
  r = acotar(toSrgb(r), 0, 1);
  g = acotar(toSrgb(g), 0, 1);
  bl = acotar(toSrgb(bl), 0, 1);

  const col = new THREE.Color(r, g, bl);
  return `#${col.getHexString()}`;
}

// Genera textura procedural de micro-poros y líneas cutáneas (Langer)
function crearTexturaMicroPiel() {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#808080";
  ctx.fillRect(0, 0, 256, 256);

  for (let i = 0; i < 3200; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const r = 0.35 + Math.random() * 0.95;
    ctx.fillStyle = Math.random() > 0.52
      ? "rgba(55, 55, 55, 0.22)"
      : "rgba(210, 210, 210, 0.20)";
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(6, 6);
  return tex;
}

// ============================================================================
// [BLOQUE 2] SUBTONOS, ESTACIONES CROMÁTICAS Y CALIDAD SUPERFICIAL DE LA PIEL
// Función: Define los modificadores de subtono (cálido, frío, neutro, oliva),
// las 12 estaciones cromáticas (Primavera, Verano, Otoño, Invierno) y los
// presets clínicos de calidad de piel (sana, glow, mate, seca, oleosa).
// ============================================================================
const MODIFICADORES_SUBTONO = {
  neutro: { dA: 0, dB: 0, sheenHex: "#ff9e80" },
  calido: { dA: 2.2, dB: 5.5, sheenHex: "#ff8c66" },
  frio: { dA: 3.0, dB: -3.5, sheenHex: "#ff94a2" },
  oliva: { dA: -2.8, dB: 4.2, sheenHex: "#e6a87c" }
};

const MODIFICADORES_ESTACION = {
  primavera_clara: { dL: 2.5, dA: 1.5, dB: 4.0 },
  primavera_calida: { dL: 1.0, dA: 2.5, dB: 6.0 },
  primavera_brillante: { dL: 1.8, dA: 2.8, dB: 4.5 },
  verano_claro: { dL: 2.2, dA: 1.8, dB: -2.2 },
  verano_suave: { dL: 0.0, dA: 0.8, dB: -1.5 },
  verano_frio: { dL: -0.5, dA: 2.2, dB: -3.2 },
  otono_suave: { dL: -1.2, dA: 1.2, dB: 3.5 },
  otono_calido: { dL: -2.0, dA: 3.2, dB: 6.5 },
  otono_profundo: { dL: -4.5, dA: 3.5, dB: 5.0 },
  invierno_frio: { dL: -1.5, dA: 2.5, dB: -3.8 },
  invierno_profundo: { dL: -5.0, dA: 2.0, dB: -2.0 },
  invierno_brillante: { dL: 1.2, dA: 2.2, dB: -2.5 }
};

const CALIDAD_PIEL_PRESETS = {
  sana: { roughness: 0.48, clearcoat: 0.18, bumpScale: 0.0018, sheen: 0.38 },
  hidratada_glow: { roughness: 0.32, clearcoat: 0.36, bumpScale: 0.0012, sheen: 0.46 },
  mate_porcelana: { roughness: 0.64, clearcoat: 0.08, bumpScale: 0.0010, sheen: 0.30 },
  seca_texturizada: { roughness: 0.74, clearcoat: 0.04, bumpScale: 0.0038, sheen: 0.22 },
  oleosa_brillante: { roughness: 0.26, clearcoat: 0.45, bumpScale: 0.0028, sheen: 0.42 }
};

function crearPerfilTorneado(radiosYAlturas, segRadial = 32, segCurva = 26) {
  const puntos = radiosYAlturas.map(([r, y]) => new THREE.Vector2(r, y));
  const curva = new THREE.SplineCurve(puntos);
  const geo = new THREE.LatheGeometry(curva.getPoints(segCurva), segRadial);
  geo.computeVertexNormals();
  return geo;
}

// ============================================================================
// [BLOQUE 3] ENVOLTURA CUTÁNEA CONTINUA ROSTRO–CUERPO (restPose)
// Función: Construye la malla cerrada y continua de piel para cabeza/rostro
// (cráneo, pómulos, mejillas, nariz, labios, mandíbula), cuello, tórax,
// pechos, espalda, abdomen, cintura, pelvis, glúteos, brazos, manos, piernas
// y pies, compartiendo un material PBR con dispersión subsuperficial (SSS).
// ============================================================================
export function crearCapaPiel(opciones = {}) {
  const group = new THREE.Group();
  group.name = "CapaPiel";

  const texPoros = crearTexturaMicroPiel();

  // Material PBR de Piel con Subsurface Scattering (sheen cálido) y polygonOffset
  // para garantizar prioridad visual como envoltura externa sobre músculo y grasa
  const materialPiel = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color("#d9a37a"),
    bumpMap: texPoros,
    bumpScale: 0.0018,
    roughness: 0.48,
    metalness: 0.02,
    clearcoat: 0.18,
    clearcoatRoughness: 0.42,
    sheen: 0.38,
    sheenRoughness: 0.65,
    sheenColor: new THREE.Color("#ff8c66"),
    transparent: false,
    opacity: 1.0,
    depthWrite: true,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -2
  });

  const rigProcedural = new THREE.Group();
  rigProcedural.name = "PielProcedural";
  group.add(rigProcedural);

  const contenedorGlb = new THREE.Group();
  contenedorGlb.name = "PielGLB";
  contenedorGlb.visible = false;
  group.add(contenedorGlb);

  const mallas = {};
  const restPose = {};

  function registrarMalla(nombre, geo, padre, pos = [0, 0, 0], rot = [0, 0, 0], esc = [1, 1, 1]) {
    const m = new THREE.Mesh(geo, materialPiel);
    m.name = nombre;
    m.castShadow = true;
    m.receiveShadow = true;
    m.position.set(...pos);
    m.rotation.set(...rot);
    m.scale.set(...esc);
    padre.add(m);
    mallas[nombre] = m;
    restPose[nombre] = {
      position: m.position.clone(),
      rotation: m.rotation.clone(),
      scale: m.scale.clone()
    };
    return m;
  }

  const nCraneo = new THREE.Group();
  const nCuello = new THREE.Group();
  const nTorax = new THREE.Group();
  const nCore = new THREE.Group();
  const nPelvis = new THREE.Group();
  rigProcedural.add(nCraneo, nCuello, nTorax, nCore, nPelvis);

  // 1. ROSTRO Y CABEZA ESCULPIDA (Continuidad facial preparada para Fase 5A)
  registrarMalla("craneoPiel", new THREE.SphereGeometry(0.104, 32, 28), nCraneo, [0, 0.030, -0.002], [0, 0, 0], [0.89, 1.12, 1.06]);
  registrarMalla("mandibulaPiel", new THREE.SphereGeometry(0.068, 26, 22), nCraneo, [0, -0.044, 0.034], [0.06, 0, 0], [0.88, 0.68, 0.98]);
  registrarMalla("mentonPiel", new THREE.SphereGeometry(0.024, 18, 14), nCraneo, [0, -0.066, 0.066], [0, 0, 0], [1.10, 0.82, 0.95]);
  registrarMalla("narizPiel", new THREE.ConeGeometry(0.016, 0.040, 16), nCraneo, [0, -0.008, 0.098], [Math.PI * 0.42, 0, 0], [0.92, 1.0, 1.0]);
  registrarMalla("labiosPiel", new THREE.SphereGeometry(0.020, 18, 14), nCraneo, [0, -0.036, 0.082], [0.10, 0, 0], [1.35, 0.52, 0.80]);

  [-1, 1].forEach((s) => {
    const lado = s < 0 ? "Izq" : "Der";
    registrarMalla(`mejillaPiel${lado}`, new THREE.SphereGeometry(0.038, 22, 18), nCraneo, [s * 0.046, -0.018, 0.056], [0.10, s * 0.24, 0], [0.95, 1.10, 0.90]);
    registrarMalla(`arcoCiliarPiel${lado}`, new THREE.SphereGeometry(0.024, 16, 12), nCraneo, [s * 0.032, 0.022, 0.078], [0, s * 0.18, -s * 0.08], [1.35, 0.42, 0.65]);
    registrarMalla(`orejaPiel${lado}`, new THREE.SphereGeometry(0.022, 14, 12), nCraneo, [s * 0.092, -0.005, -0.006], [0, -s * 0.25, 0], [0.35, 1.35, 0.72]);
  });

  // 2. CUELLO CONTINUO (Se funde suavemente entre la mandíbula y el trapecio/clavículas)
  registrarMalla(
    "cuelloPiel",
    crearPerfilTorneado([
      [0.001, -0.085],
      [0.076, -0.068],
      [0.062, -0.020],
      [0.058, 0.030],
      [0.060, 0.068],
      [0.001, 0.082]
    ], 28, 18),
    nCuello,
    [0, 0.004, 0.0],
    [0, 0, 0],
    [0.98, 1.0, 1.02]
  );
  registrarMalla("papadaPiel", new THREE.SphereGeometry(0.040, 18, 14), nCuello, [0, 0.046, 0.042], [0.35, 0, 0], [0.98, 0.58, 0.96]);

  // 3. ENVOLTURA TORÁCICA, PECTORAL Y DORSAL (Cierra hombros, pecho y espalda alta/media)
  registrarMalla(
    "toraxPiel",
    crearPerfilTorneado([
      [0.001, -0.165],
      [0.142, -0.135],
      [0.158, -0.030],
      [0.172, 0.065],
      [0.162, 0.135],
      [0.001, 0.165]
    ], 34, 24),
    nTorax,
    [0, 0.015, 0.005],
    [0, 0, 0],
    [1.14, 1.0, 0.88]
  );

  [-1, 1].forEach((s) => {
    const lado = s < 0 ? "Izq" : "Der";
    registrarMalla(`pechoPiel${lado}`, new THREE.SphereGeometry(0.074, 24, 20), nTorax, [s * 0.062, 0.042, 0.102], [0.06, s * 0.18, 0], [1.28, 0.82, 0.66]);
    registrarMalla(`dorsalPiel${lado}`, new THREE.SphereGeometry(0.078, 22, 18), nTorax, [s * 0.088, 0.015, -0.056], [0.05, -s * 0.22, -s * 0.16], [1.20, 1.35, 0.72]);
    registrarMalla(`trapecioPiel${lado}`, new THREE.SphereGeometry(0.058, 18, 14), nTorax, [s * 0.058, 0.125, -0.038], [0.12, 0, s * 0.52], [1.25, 0.75, 0.85]);
  });

  // 4. ENVOLTURA ABDOMINAL, COSTADOS (FLANCOS) Y ESPALDA BAJA
  registrarMalla(
    "abdomenPiel",
    crearPerfilTorneado([
      [0.001, -0.165],
      [0.146, -0.130],
      [0.156, -0.030],
      [0.148, 0.060],
      [0.142, 0.135],
      [0.001, 0.165]
    ], 34, 24),
    nCore,
    [0, 0.005, 0.016],
    [0, 0, 0],
    [1.10, 1.0, 0.82]
  );

  [-1, 1].forEach((s) => {
    const lado = s < 0 ? "Izq" : "Der";
    registrarMalla(`costadoPiel${lado}`, new THREE.SphereGeometry(0.070, 20, 16), nCore, [s * 0.098, -0.012, 0.014], [0, 0, s * 0.10], [0.88, 1.38, 1.16]);
    registrarMalla(`espaldaBajaPiel${lado}`, new THREE.SphereGeometry(0.068, 20, 16), nCore, [s * 0.060, -0.010, -0.058], [0.06, 0, 0], [1.22, 1.05, 0.68]);
  });

  // 5. ENVOLTURA PÉLVICA, CADERAS Y GLÚTEOS
  registrarMalla(
    "pelvisPiel",
    crearPerfilTorneado([
      [0.001, -0.120],
      [0.138, -0.085],
      [0.154, 0.0],
      [0.146, 0.085],
      [0.001, 0.120]
    ], 32, 20),
    nPelvis,
    [0, 0.0, -0.004],
    [0, 0, 0],
    [1.12, 1.0, 0.90]
  );

  [-1, 1].forEach((s) => {
    const lado = s < 0 ? "Izq" : "Der";
    registrarMalla(`gluteoPiel${lado}`, new THREE.SphereGeometry(0.094, 24, 20), nPelvis, [s * 0.076, -0.016, -0.062], [0.12, s * 0.12, 0], [1.10, 1.02, 1.20]);
    registrarMalla(`caderaLatPiel${lado}`, new THREE.SphereGeometry(0.072, 20, 16), nPelvis, [s * 0.102, 0.005, -0.010], [0, 0, -s * 0.12], [0.82, 1.15, 1.08]);
  });

  // 6. EXTREMIDADES SUPERIORES CONTINUAS (Hombro, Brazo, Codo, Antebrazo, Muñeca y Mano con dedos)
  function construirBrazoPiel(lado, signo) {
    const nHombro = new THREE.Group();
    const nBrazoSup = new THREE.Group();
    const nCodo = new THREE.Group();
    const nAntebrazo = new THREE.Group();
    const nMano = new THREE.Group();
    rigProcedural.add(nHombro, nBrazoSup, nCodo, nAntebrazo, nMano);

    registrarMalla(`hombroPiel${lado}`, new THREE.SphereGeometry(0.060, 22, 18), nHombro, [signo * 0.016, -0.022, 0], [0, 0, -signo * 0.14], [1.08, 1.20, 1.08]);

    const geoBrazo = crearPerfilTorneado([
      [0.001, -0.155],
      [0.048, -0.125],
      [0.060, -0.025],
      [0.065, 0.065],
      [0.056, 0.135],
      [0.001, 0.155]
    ], 26, 20);
    registrarMalla(`brazoPiel${lado}`, geoBrazo, nBrazoSup);

    registrarMalla(`codoPiel${lado}`, new THREE.SphereGeometry(0.044, 18, 14), nCodo, [0, 0, 0], [0, 0, 0], [0.95, 1.05, 0.95]);

    const geoAnt = crearPerfilTorneado([
      [0.001, -0.140],
      [0.034, -0.118],
      [0.046, -0.020],
      [0.050, 0.075],
      [0.044, 0.120],
      [0.001, 0.140]
    ], 26, 20);
    registrarMalla(`antebrazoPiel${lado}`, geoAnt, nAntebrazo);

    const manoGrupo = new THREE.Group();
    const palma = new THREE.Mesh(new THREE.SphereGeometry(0.032, 18, 14), materialPiel);
    palma.scale.set(0.58, 1.65, 1.22);
    palma.position.set(0, -0.038, 0);
    manoGrupo.add(palma);
    for (let d = -2; d <= 2; d++) {
      const lDedo = d === -2 ? 0.032 : 0.044 - Math.abs(d) * 0.003;
      const dedo = new THREE.Mesh(new THREE.CylinderGeometry(0.0055, 0.0045, lDedo, 10), materialPiel);
      dedo.position.set(0, -0.062 - lDedo * 0.5, d * 0.0105);
      manoGrupo.add(dedo);
    }
    nMano.add(manoGrupo);
    mallas[`manoPiel${lado}`] = palma;
    restPose[`manoPiel${lado}`] = {
      position: palma.position.clone(),
      rotation: palma.rotation.clone(),
      scale: palma.scale.clone()
    };

    return { nHombro, nBrazoSup, nCodo, nAntebrazo, nMano };
  }
  const segBrazoIzq = construirBrazoPiel("Izq", -1);
  const segBrazoDer = construirBrazoPiel("Der", 1);

  // 7. EXTREMIDADES INFERIORES CONTINUAS (Muslo, Rodilla, Pantorrilla, Tobillo y Pie)
  function construirPiernaPiel(lado, signo) {
    const nMuslo = new THREE.Group();
    const nRodilla = new THREE.Group();
    const nPiernaInf = new THREE.Group();
    const nPie = new THREE.Group();
    rigProcedural.add(nMuslo, nRodilla, nPiernaInf, nPie);

    const geoMuslo = crearPerfilTorneado([
      [0.001, -0.220],
      [0.066, -0.188],
      [0.088, -0.050],
      [0.104, 0.080],
      [0.110, 0.185],
      [0.001, 0.220]
    ], 30, 22);
    registrarMalla(`musloPiel${lado}`, geoMuslo, nMuslo, [0, 0, 0], [0, 0, 0], [1.08, 1.0, 1.10]);

    registrarMalla(`rodillaPiel${lado}`, new THREE.SphereGeometry(0.058, 20, 16), nRodilla, [0, 0, 0.004], [0, 0, 0], [0.96, 1.05, 1.02]);

    const geoPant = crearPerfilTorneado([
      [0.001, -0.215],
      [0.040, -0.180],
      [0.064, -0.040],
      [0.062, 0.080],
      [0.056, 0.180],
      [0.001, 0.215]
    ], 28, 22);
    registrarMalla(`pantorrillaPiel${lado}`, geoPant, nPiernaInf, [0, 0, -0.006], [0, 0, 0], [1.02, 1.0, 1.12]);

    registrarMalla(`piePiel${lado}`, new THREE.SphereGeometry(0.040, 18, 14), nPie, [0, -0.018, 0.044], [0, 0, 0], [0.98, 0.58, 2.80]);

    return { nMuslo, nRodilla, nPiernaInf, nPie };
  }
  const segPiernaIzq = construirPiernaPiel("Izq", -1);
  const segPiernaDer = construirPiernaPiel("Der", 1);

  // ==========================================================================
  // [BLOQUE 4] REGLA DE ORO (ENVOLTURA ANTI-PERFORACIÓN) Y applyAnatomyState
  // Función: Calcula el contorno exterior máximo entre la Capa 2 (Músculo) y la
  // Capa 3 (Grasa) en cada zona anatómica y aplica un colchón dérmico positivo
  // (MARGEN_ENVOLTURA = 1.075) para que ningún músculo sobresalga jamás a
  // través de la piel, además de aplicar la colorimetría CIELAB y acabado PBR.
  // ==========================================================================
  const ejeY = new THREE.Vector3(0, 1, 0);
  const vDir = new THREE.Vector3();
  let ultimoParams = {};
  let diagnosticoImportadoBase = null;
  let skinnedMeshGlb = null;

  function resetToRestPose() {
    Object.entries(mallas).forEach(([nombre, m]) => {
      const base = restPose[nombre];
      if (base) {
        m.position.copy(base.position);
        m.rotation.copy(base.rotation);
        m.scale.copy(base.scale);
      }
    });
  }

  function alinearSegmentoEntreAnclajes(grupo, pSup, pInf) {
    grupo.position.lerpVectors(pSup, pInf, 0.5);
    vDir.subVectors(pSup, pInf);
    const largo = vDir.length();
    if (largo > 0.0001) {
      vDir.normalize();
      grupo.quaternion.setFromUnitVectors(ejeY, vDir);
    }
    return largo;
  }

  function factorDesdeNivel10(n = 4) {
    const v = acotar(n, 0, 10);
    return v <= 4 ? THREE.MathUtils.lerp(0.64, 1.00, v / 4) : THREE.MathUtils.lerp(1.00, 1.54, (v - 4) / 6);
  }

  function factorDesdeNivel5(n = 2) {
    const v = acotar(n, 0, 5);
    return v <= 2 ? THREE.MathUtils.lerp(0.68, 1.00, v / 2) : THREE.MathUtils.lerp(1.00, 1.42, (v - 2) / 3);
  }

  function applyAnatomyState(state = {}) {
    // Regla de prioridad: la base importada del diagnóstico facial sirve como cimiento,
    // y los controles manuales sobrescriben/afinan encima sin borrar la base.
    ultimoParams = { ...(diagnosticoImportadoBase || {}), ...ultimoParams, ...state };
    resetToRestPose();

    // 1. Colorimetría Facial/Corporal en espacio CIELAB (L*a*b*) + Subtono + Estación
    const subtono = ultimoParams.pielSubtono ?? "neutro";
    const estacion = ultimoParams.pielEstacion ?? "primavera_calida";
    const calidad = ultimoParams.pielCalidad ?? "sana";
    const translucida = Boolean(ultimoParams.translucida ?? false);

    const labBase = (ultimoParams.pielL !== undefined && ultimoParams.pielA !== undefined && ultimoParams.pielB !== undefined)
      ? { L: ultimoParams.pielL, a: ultimoParams.pielA, b: ultimoParams.pielB }
      : hexToLab(ultimoParams.colorPiel ?? "#d9a37a");

    const modSub = MODIFICADORES_SUBTONO[subtono] || MODIFICADORES_SUBTONO.neutro;
    const modEst = MODIFICADORES_ESTACION[estacion] || { dL: 0, dA: 0, dB: 0 };

    const LFinal = acotar(labBase.L + modEst.dL * 0.45, 18, 92);
    const aFinal = acotar(labBase.a + modSub.dA + modEst.dA * 0.5, -15, 42);
    const bFinal = acotar(labBase.b + modSub.dB + modEst.dB * 0.5, -15, 52);

    const hexCalculado = labToHex(LFinal, aFinal, bFinal);
    materialPiel.color.set(hexCalculado);
    materialPiel.sheenColor.set(modSub.sheenHex);

    // 2. Calidad, Estado y Acabado Superficial de la Piel
    const presetCalidad = CALIDAD_PIEL_PRESETS[calidad] || CALIDAD_PIEL_PRESETS.sana;
    materialPiel.roughness = acotar(ultimoParams.pielRoughness ?? presetCalidad.roughness, 0.15, 0.90);
    materialPiel.clearcoat = presetCalidad.clearcoat;
    materialPiel.bumpScale = acotar(ultimoParams.pielPorosidad ?? presetCalidad.bumpScale, 0.0004, 0.006);
    materialPiel.sheen = acotar(ultimoParams.pielSubsurface ?? presetCalidad.sheen, 0.05, 0.85);

    materialPiel.transparent = translucida;
    materialPiel.opacity = translucida ? 0.36 : 1.0;
    materialPiel.depthWrite = !translucida;

    // 3. Cálculo del Contorno Interno (Músculo Capa 2 + Grasa Capa 3) para Envoltura Cerrada
    const estaturaCm = acotar(ultimoParams.estaturaCm ?? 175, 140, 210);
    const escalaAltura = estaturaCm / 175;
    const morfoTorax = acotar(ultimoParams.morfologiaTorax ?? 1.0, 0.78, 1.28);
    const esFemenino = (ultimoParams.sexo ?? "masculino") === "femenino";
    const morfologia = ultimoParams.morfologia ?? "mesomorfo";
    const factorSomato = morfologia === "ectomorfo" ? 0.90 : (morfologia === "endomorfo" ? 0.98 : 1.04);

    const musculoGlobalKg = acotar(ultimoParams.musculoGlobalKg ?? 32, 15, 58);
    const fMuscGlobal = Math.cbrt(musculoGlobalKg / 32) * factorSomato;

    // Factores musculares exactos de cada rama de la Capa 2
    const fMuscDelt = factorDesdeNivel10(
      ultimoParams.deltoidesModo === "desglosado"
        ? Math.max(ultimoParams.deltoidesAnterior ?? 4, ultimoParams.deltoidesLateral ?? 4, ultimoParams.deltoidesPosterior ?? 4)
        : (ultimoParams.deltoidesGeneralNivel ?? 4)
    ) * fMuscGlobal;

    const fMuscBrazo = factorDesdeNivel10(
      ultimoParams.brazoModo === "desglosado"
        ? Math.max(ultimoParams.bicepsNivel ?? 4, ultimoParams.tricepsNivel ?? 4)
        : (ultimoParams.brazoGeneralNivel ?? 4)
    ) * fMuscGlobal;

    const fMuscAntebrazo = factorDesdeNivel10(ultimoParams.antebrazoNivel ?? 4) * fMuscGlobal;

    const fMuscPecho = factorDesdeNivel10(
      ultimoParams.pechoModo === "desglosado"
        ? Math.max(ultimoParams.pectoralSuperior ?? 4, ultimoParams.pectoralMedio ?? 4, ultimoParams.pectoralInferior ?? 4)
        : (ultimoParams.pechoGeneralNivel ?? 4)
    ) * fMuscGlobal;

    const fMuscTrap = factorDesdeNivel10(
      ultimoParams.trapecioModo === "desglosado"
        ? Math.max(ultimoParams.trapecioSuperior ?? 4, ultimoParams.trapecioMedio ?? 4, ultimoParams.trapecioInferior ?? 4)
        : (ultimoParams.trapecioGeneralNivel ?? 4)
    ) * fMuscGlobal;

    const fMuscDorsal = factorDesdeNivel10(ultimoParams.dorsalAnchoNivel ?? 4) * fMuscGlobal;
    const fMuscCuello = factorDesdeNivel5(ultimoParams.cuelloNivel ?? 2) * fMuscGlobal;
    const fMuscAbd = factorDesdeNivel5(ultimoParams.abdomenNivel ?? 2) * fMuscGlobal;
    const fMuscObl = factorDesdeNivel5(ultimoParams.oblicuosNivel ?? 2) * fMuscGlobal;
    const fMuscLumbar = factorDesdeNivel5(ultimoParams.lumbarNivel ?? 2) * fMuscGlobal;
    const fMuscGluteo = factorDesdeNivel10(ultimoParams.gluteosNivel ?? 4) * fMuscGlobal;

    const fMuscMuslo = factorDesdeNivel10(
      ultimoParams.musloModo === "desglosado"
        ? Math.max(ultimoParams.cuadricepsNivel ?? 4, ultimoParams.isquiotibialesNivel ?? 4)
        : (ultimoParams.musloGeneralNivel ?? 4)
    ) * fMuscGlobal;

    const fMuscPant = factorDesdeNivel5(ultimoParams.pantorrillaNivel ?? 2) * fMuscGlobal;

    // Estado volumétrico procedente de la Capa 3 (Grasa)
    const eg = ultimoParams.estadoGrasa || {};
    const fGrasaCara = eg.fCara ?? 1.0;
    const fGrasaCuello = eg.fCuello ?? 1.0;
    const fGrasaPecho = eg.fPecho ?? 1.0;
    const fGrasaCintura = eg.fCintura ?? 1.0;
    const fGrasaCostados = eg.fCostados ?? 1.0;
    const fGrasaCadera = eg.fCadera ?? 1.0;
    const fGrasaEspalda = eg.fEspalda ?? 1.0;
    const fGrasaSupDer = eg.fSupDer ?? 1.0;
    const fGrasaSupIzq = eg.fSupIzq ?? 1.0;
    const fGrasaInfDer = eg.fInfDer ?? 1.0;
    const fGrasaInfIzq = eg.fInfIzq ?? 1.0;
    const movY = eg.desplazamientoY ?? 0;

    // Función de Envoltura Cerrada: garantiza que la piel SIEMPRE sea mayor que el músculo y la grasa
    const MARGEN_DERMICO = 1.075;
    const envolver = (fMusc, fGrasa) => Math.max(fMusc, fGrasa, (fMusc * 0.55 + fGrasa * 0.55)) * MARGEN_DERMICO;

    // 4. Sincronización con los Anclajes Mundiales de la Capa 1 (Esqueleto)
    const anc = ultimoParams.anclajes;
    if (anc?.pelvis && anc?.torax) {
      nPelvis.position.copy(anc.pelvis);
      if (anc.pelvis.quat) nPelvis.quaternion.copy(anc.pelvis.quat);
      nPelvis.scale.setScalar(escalaAltura);

      nTorax.position.copy(anc.torax);
      if (anc.torax.quat) nTorax.quaternion.copy(anc.torax.quat);
      nTorax.scale.setScalar(escalaAltura);

      nCore.position.lerpVectors(anc.pelvis, anc.torax, 0.45);
      if (anc.pelvis.quat && anc.torax.quat) {
        nCore.quaternion.slerpQuaternions(anc.pelvis.quat, anc.torax.quat, 0.5);
      }
      nCore.scale.setScalar(escalaAltura);

      if (anc.cuello) {
        nCuello.position.copy(anc.cuello);
        if (anc.cuello.quat) nCuello.quaternion.copy(anc.cuello.quat);
        nCuello.scale.setScalar(escalaAltura);
      }

      if (anc.craneo) {
        nCraneo.position.copy(anc.craneo);
        if (anc.craneo.quat) nCraneo.quaternion.copy(anc.craneo.quat);
        nCraneo.scale.setScalar(escalaAltura);
      }

      const alinearBrazo = (seg, pHombro, pCodo, pMuneca) => {
        seg.nHombro.position.copy(pHombro);
        if (pHombro.quat) seg.nHombro.quaternion.copy(pHombro.quat);
        seg.nHombro.scale.setScalar(escalaAltura);

        const lB = alinearSegmentoEntreAnclajes(seg.nBrazoSup, pHombro, pCodo);
        seg.nBrazoSup.scale.set(escalaAltura, lB / 0.28, escalaAltura);

        seg.nCodo.position.copy(pCodo);
        if (pCodo.quat) seg.nCodo.quaternion.copy(pCodo.quat);
        seg.nCodo.scale.setScalar(escalaAltura);

        const lA = alinearSegmentoEntreAnclajes(seg.nAntebrazo, pCodo, pMuneca);
        seg.nAntebrazo.scale.set(escalaAltura, lA / 0.25, escalaAltura);

        seg.nMano.position.copy(pMuneca);
        if (pMuneca.quat) seg.nMano.quaternion.copy(pMuneca.quat);
        seg.nMano.scale.setScalar(escalaAltura);
      };
      if (anc.hombroIzq && anc.codoIzq && anc.munecaIzq) {
        alinearBrazo(segBrazoIzq, anc.hombroIzq, anc.codoIzq, anc.munecaIzq);
      }
      if (anc.hombroDer && anc.codoDer && anc.munecaDer) {
        alinearBrazo(segBrazoDer, anc.hombroDer, anc.codoDer, anc.munecaDer);
      }

      const alinearPierna = (seg, pCadera, pRodilla, pTobillo) => {
        const lM = alinearSegmentoEntreAnclajes(seg.nMuslo, pCadera, pRodilla);
        seg.nMuslo.scale.set(escalaAltura, lM / 0.41, escalaAltura);

        seg.nRodilla.position.copy(pRodilla);
        if (pRodilla.quat) seg.nRodilla.quaternion.copy(pRodilla.quat);
        seg.nRodilla.scale.setScalar(escalaAltura);

        const lP = alinearSegmentoEntreAnclajes(seg.nPiernaInf, pRodilla, pTobillo);
        seg.nPiernaInf.scale.set(escalaAltura, lP / 0.40, escalaAltura);

        seg.nPie.position.copy(pTobillo);
        if (pTobillo.quat) seg.nPie.quaternion.copy(pTobillo.quat);
        seg.nPie.scale.setScalar(escalaAltura);
      };
      if (anc.caderaIzq && anc.rodillaIzq && anc.tobilloIzq) {
        alinearPierna(segPiernaIzq, anc.caderaIzq, anc.rodillaIzq, anc.tobilloIzq);
      }
      if (anc.caderaDer && anc.rodillaDer && anc.tobilloDer) {
        alinearPierna(segPiernaDer, anc.caderaDer, anc.rodillaDer, anc.tobilloDer);
      }
    }

    // 5. Aplicación de la Envoltura Solidaria por Zonas (Cero Perforación Muscular)
    // Cara y Cuello
    const envCara = envolver(0.95 + 0.05 * fMuscGlobal, fGrasaCara);
    mallas.craneoPiel.scale.multiply(new THREE.Vector3(0.94 + envCara * 0.06, 0.96 + envCara * 0.04, 0.95 + envCara * 0.05));
    mallas.mandibulaPiel.scale.multiply(new THREE.Vector3(0.86 + envCara * 0.14, 0.82 + envCara * 0.18, 0.90 + envCara * 0.10));
    ["Izq", "Der"].forEach((lado) => {
      const s = lado === "Izq" ? -1 : 1;
      const mejilla = mallas[`mejillaPiel${lado}`];
      mejilla.scale.multiply(new THREE.Vector3(envCara, envCara, envCara));
      mejilla.position.x += s * (fGrasaCara - 1.0) * 0.012;
      mejilla.position.z += (fGrasaCara - 1.0) * 0.013;
      mejilla.position.y += movY * 0.35;
    });

    const envCuello = envolver(fMuscCuello, fGrasaCuello);
    mallas.cuelloPiel.scale.multiply(new THREE.Vector3(envCuello, 1.0, envCuello));
    mallas.papadaPiel.scale.multiply(new THREE.Vector3(fGrasaCuello * MARGEN_DERMICO, fGrasaCuello * 1.15, fGrasaCuello * 1.22));
    mallas.papadaPiel.position.y += -((fGrasaCuello - 1.0) * 0.008) + movY * 0.4;
    mallas.papadaPiel.position.z += (fGrasaCuello - 1.0) * 0.014;

    // Tórax, Pecho y Espalda Alta/Media
    const envToraxX = envolver(Math.max(fMuscDorsal, fMuscPecho) * morfoTorax, fGrasaPecho * morfoTorax);
    const envToraxZ = envolver(Math.max(fMuscPecho, fMuscEspalda(fMuscTrap, fMuscDorsal)) * morfoTorax, Math.max(fGrasaPecho, fGrasaEspalda) * morfoTorax);
    mallas.toraxPiel.scale.multiply(new THREE.Vector3(envToraxX * (esFemenino ? 0.94 : 1.02), 1.0, envToraxZ));

    function fMuscEspalda(t, d) { return Math.max(t, d); }

    // Abdomen, Costados y Espalda Baja
    const envAbdomen = envolver(Math.max(fMuscAbd, fMuscObl), Math.max(fGrasaCintura, fGrasaCostados));
    mallas.abdomenPiel.scale.multiply(new THREE.Vector3(envAbdomen * morfoTorax, 1.0, envAbdomen * 1.10));
    mallas.abdomenPiel.position.z += (envAbdomen - 1.0) * 0.026;
    mallas.abdomenPiel.position.y += movY;

    // Pelvis, Caderas y Glúteos
    const envCadera = envolver(fMuscGluteo, fGrasaCadera) * (esFemenino ? 1.08 : 1.0);
    mallas.pelvisPiel.scale.multiply(new THREE.Vector3(envCadera, 1.0, envCadera));

    ["Izq", "Der"].forEach((lado) => {
      const s = lado === "Izq" ? -1 : 1;

      const envPecho = envolver(fMuscPecho, fGrasaPecho) * (esFemenino ? 1.14 : 1.0);
      mallas[`pechoPiel${lado}`].scale.multiply(new THREE.Vector3(envPecho * morfoTorax, envPecho, envPecho));
      mallas[`pechoPiel${lado}`].position.z += (envPecho - 1.0) * 0.025 + (morfoTorax - 1.0) * 0.035;
      mallas[`pechoPiel${lado}`].position.y += movY * 1.15;

      const envDorsal = envolver(fMuscDorsal, fGrasaEspalda);
      mallas[`dorsalPiel${lado}`].scale.multiply(new THREE.Vector3(envDorsal * morfoTorax, 1.0, envDorsal));
      mallas[`dorsalPiel${lado}`].position.x += s * (envDorsal - 1.0) * 0.026;
      mallas[`dorsalPiel${lado}`].position.z -= (envDorsal - 1.0) * 0.018;

      const envTrap = envolver(fMuscTrap, fGrasaEspalda);
      mallas[`trapecioPiel${lado}`].scale.multiply(new THREE.Vector3(envTrap, envTrap, envTrap));

      const envCostado = envolver(fMuscObl, fGrasaCostados);
      mallas[`costadoPiel${lado}`].scale.multiply(new THREE.Vector3(envCostado, 1.0, envCostado));
      mallas[`costadoPiel${lado}`].position.x += s * (envCostado - 1.0) * 0.024;
      mallas[`costadoPiel${lado}`].position.y += movY * 0.85;

      const envEspBaja = envolver(fMuscLumbar, fGrasaEspalda);
      mallas[`espaldaBajaPiel${lado}`].scale.multiply(new THREE.Vector3(envEspBaja, envEspBaja, envEspBaja));
      mallas[`espaldaBajaPiel${lado}`].position.z -= (envEspBaja - 1.0) * 0.022;

      mallas[`gluteoPiel${lado}`].scale.multiply(new THREE.Vector3(envCadera, envCadera, envCadera));
      mallas[`gluteoPiel${lado}`].position.x += s * (envCadera - 1.0) * 0.018;
      mallas[`gluteoPiel${lado}`].position.z -= (envCadera - 1.0) * 0.026;
      mallas[`gluteoPiel${lado}`].position.y += movY * 0.75;

      mallas[`caderaLatPiel${lado}`].scale.multiply(new THREE.Vector3(envCadera, 1.0, envCadera));
    });

    // Extremidades Superiores (Izquierda y Derecha asimétricas o simétricas)
    const envHombroIzq = envolver(fMuscDelt, fGrasaSupIzq);
    const envHombroDer = envolver(fMuscDelt, fGrasaSupDer);
    mallas.hombroPielIzq.scale.multiply(new THREE.Vector3(envHombroIzq, 1.0, envHombroIzq));
    mallas.hombroPielDer.scale.multiply(new THREE.Vector3(envHombroDer, 1.0, envHombroDer));

    const envBrazoIzq = envolver(fMuscBrazo, fGrasaSupIzq);
    const envBrazoDer = envolver(fMuscBrazo, fGrasaSupDer);
    mallas.brazoPielIzq.scale.multiply(new THREE.Vector3(envBrazoIzq, 1.0, envBrazoIzq));
    mallas.brazoPielDer.scale.multiply(new THREE.Vector3(envBrazoDer, 1.0, envBrazoDer));

    const envAntIzq = envolver(fMuscAntebrazo, fGrasaSupIzq * 0.92);
    const envAntDer = envolver(fMuscAntebrazo, fGrasaSupDer * 0.92);
    mallas.codoPielIzq.scale.multiply(new THREE.Vector3(envAntIzq, 1.0, envAntIzq));
    mallas.codoPielDer.scale.multiply(new THREE.Vector3(envAntDer, 1.0, envAntDer));
    mallas.antebrazoPielIzq.scale.multiply(new THREE.Vector3(envAntIzq, 1.0, envAntIzq));
    mallas.antebrazoPielDer.scale.multiply(new THREE.Vector3(envAntDer, 1.0, envAntDer));

    // Extremidades Inferiores
    const envMusloIzq = envolver(fMuscMuslo, fGrasaInfIzq);
    const envMusloDer = envolver(fMuscMuslo, fGrasaInfDer);
    mallas.musloPielIzq.scale.multiply(new THREE.Vector3(envMusloIzq, 1.0, envMusloIzq));
    mallas.musloPielDer.scale.multiply(new THREE.Vector3(envMusloDer, 1.0, envMusloDer));
    mallas.rodillaPielIzq.scale.multiply(new THREE.Vector3(envMusloIzq * 0.90, 1.0, envMusloIzq * 0.90));
    mallas.rodillaPielDer.scale.multiply(new THREE.Vector3(envMusloDer * 0.90, 1.0, envMusloDer * 0.90));

    const envPantIzq = envolver(fMuscPant, fGrasaInfIzq * 0.88);
    const envPantDer = envolver(fMuscPant, fGrasaInfDer * 0.88);
    mallas.pantorrillaPielIzq.scale.multiply(new THREE.Vector3(envPantIzq, 1.0, envPantIzq));
    mallas.pantorrillaPielDer.scale.multiply(new THREE.Vector3(envPantDer, 1.0, envPantDer));
  }

  // ==========================================================================
  // [BLOQUE 5] PUENTE DE IMPORTACIÓN DE DIAGNÓSTICO FACIAL Y CARGADOR .GLB
  // Función: Recibe el objeto de diagnóstico desde el escáner facial (tono HEX
  // o CIELAB L*a*b*, subtono, estación cromática y calidad de piel), lo guarda
  // como estado base prioritario y permite restaurarlo o cargar un .glb externo.
  // ==========================================================================
  function importarDiagnosticoFacial(datosDiagnostico = {}) {
    const lab = (datosDiagnostico.L !== undefined && datosDiagnostico.a !== undefined && datosDiagnostico.b !== undefined)
      ? { L: datosDiagnostico.L, a: datosDiagnostico.a, b: datosDiagnostico.b }
      : hexToLab(datosDiagnostico.colorHex || datosDiagnostico.colorPiel || "#d9a37a");

    diagnosticoImportadoBase = {
      colorPiel: labToHex(lab.L, lab.a, lab.b),
      pielL: lab.L,
      pielA: lab.a,
      pielB: lab.b,
      pielSubtono: datosDiagnostico.subtono || datosDiagnostico.pielSubtono || "calido",
      pielEstacion: datosDiagnostico.estacion || datosDiagnostico.pielEstacion || "primavera_calida",
      pielCalidad: datosDiagnostico.calidad || datosDiagnostico.pielCalidad || "sana",
      pielRoughness: datosDiagnostico.roughness ?? CALIDAD_PIEL_PRESETS[datosDiagnostico.calidad || "sana"]?.roughness ?? 0.48
    };

    applyAnatomyState(diagnosticoImportadoBase);
    return { ...diagnosticoImportadoBase };
  }

  function restaurarDiagnosticoImportado() {
    if (!diagnosticoImportadoBase) return null;
    applyAnatomyState(diagnosticoImportadoBase);
    return { ...diagnosticoImportadoBase };
  }

  function cargarModeloGLB(url) {
    if (!url) return Promise.resolve(false);
    const loader = new GLTFLoader();
    return new Promise((resolve, reject) => {
      loader.load(
        url,
        (gltf) => {
          contenedorGlb.clear();
          skinnedMeshGlb = null;
          gltf.scene.traverse((obj) => {
            if (obj.isMesh) {
              obj.castShadow = true;
              obj.receiveShadow = true;
              obj.material = materialPiel;
              if (obj.isSkinnedMesh && !skinnedMeshGlb) skinnedMeshGlb = obj;
            }
          });
          contenedorGlb.add(gltf.scene);
          rigProcedural.visible = false;
          contenedorGlb.visible = true;
          applyAnatomyState(ultimoParams);
          resolve(true);
        },
        undefined,
        (err) => reject(err)
      );
    });
  }

  if (opciones.urlModeloGlb) {
    cargarModeloGLB(opciones.urlModeloGlb).catch(() => {
      rigProcedural.visible = true;
      contenedorGlb.visible = false;
    });
  }

  applyAnatomyState();

  return {
    group,
    mallas,
    restPose,
    materialPiel,
    applyAnatomyState,
    actualizar: applyAnatomyState,
    importarDiagnosticoFacial,
    restaurarDiagnosticoImportado,
    cargarModeloGLB
  };
}