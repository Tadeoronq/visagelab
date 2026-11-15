// ============================================================================
// VISAGELAB - CAPA 2: SISTEMA MUSCULAR POR RAMAS Y SUB-RAMAS (applyAnatomyState)
// ============================================================================

// ============================================================================
// [BLOQUE 1] IMPORTACIONES, TEXTURA PBR DE FIBRAS Y GEOMETRÍA MUSCULAR
// Función: Importa Three.js y GLTFLoader, sintetiza en canvas 2D la textura
// estriada de fibras miofibrilares con aponeurosis tendinosa y define el
// generador de vientres musculares fusiformes.
// ============================================================================
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.158.0/build/three.module.js";
import { GLTFLoader } from "https://cdn.jsdelivr.net/npm/three@0.158.0/examples/jsm/loaders/GLTFLoader.js";

function crearTexturaFibraMuscular() {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");

  const grad = ctx.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0.0, "#cbbba8");
  grad.addColorStop(0.14, "#a62c34");
  grad.addColorStop(0.50, "#96222b");
  grad.addColorStop(0.86, "#a62c34");
  grad.addColorStop(1.0, "#cbbba8");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);

  for (let i = 0; i < 420; i++) {
    const x = Math.random() * 256;
    const grosor = 0.6 + Math.random() * 1.6;
    ctx.fillStyle = Math.random() > 0.5
      ? "rgba(255, 190, 185, 0.14)"
      : "rgba(60, 8, 14, 0.18)";
    ctx.fillRect(x, 0, grosor, 256);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.repeat.set(3, 1);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function crearVientreMuscular(rInsercion, rVientre, largo, picoNorm = 0.0, segRadial = 24, segAlto = 20) {
  const yPico = largo * picoNorm;
  const puntos = [
    new THREE.Vector2(0.001, -largo * 0.5),
    new THREE.Vector2(rInsercion, -largo * 0.42),
    new THREE.Vector2(rVientre * 0.88, -largo * 0.20 + yPico * 0.4),
    new THREE.Vector2(rVientre, yPico),
    new THREE.Vector2(rVientre * 0.88, largo * 0.20 + yPico * 0.4),
    new THREE.Vector2(rInsercion, largo * 0.42),
    new THREE.Vector2(0.001, largo * 0.5)
  ];
  const curva = new THREE.SplineCurve(puntos);
  const geo = new THREE.LatheGeometry(curva.getPoints(segAlto), segRadial);
  geo.computeVertexNormals();
  return geo;
}
// ============================================================================
// [BLOQUE 2] CONVERSIÓN DE ESCALAS (0-10, 0-5, CM, MUÑECA) Y LÍMITES SEGUROS
// Función: Transforma los niveles de desarrollo (escala 0-10 con base 4; escala
// 0-5 con base 2), los perímetros en centímetros y la prueba de muñeca en
// multiplicadores anatómicos acotados.
// ============================================================================
const CLAMP_MUSCULO = {
  musculoGlobalKg: [15, 58],
  nivel10: [0, 10],
  nivel5: [0, 5],
  hombrosCm: [88, 200],
  brazoCm: [22, 75],
  antebrazoCm: [18, 48],
  pechoCm: [75, 160],
  musloCm: [38, 88]
};

function acotar(val, min, max) {
  return THREE.MathUtils.clamp(Number.isFinite(val) ? val : min, min, max);
}

// Escala 0 a 10: 0 = abandono (0.64), 4 = base referencia (1.00), 5 = medio (1.08), 10 = máximo (1.54)
function factorDesdeNivel10(nivelRaw = 4) {
  const n = acotar(nivelRaw, ...CLAMP_MUSCULO.nivel10);
  if (n <= 4) return THREE.MathUtils.lerp(0.64, 1.00, n / 4);
  return THREE.MathUtils.lerp(1.00, 1.54, (n - 4) / 6);
}

// Escala 0 a 5: 0 = nulo (0.68), 2 = base referencia (1.00), 3 = estándar (1.12), 5 = máximo (1.42)
function factorDesdeNivel5(nivelRaw = 2) {
  const n = acotar(nivelRaw, ...CLAMP_MUSCULO.nivel5);
  if (n <= 2) return THREE.MathUtils.lerp(0.68, 1.00, n / 2);
  return THREE.MathUtils.lerp(1.00, 1.42, (n - 2) / 3);
}

// Prueba clínica de rodear la muñeca con los dedos: pequeña, normal o grande
function factorDesdeMuneca(tipo = "normal") {
  if (tipo === "pequena") return 0.86;
  if (tipo === "grande") return 1.15;
  return 1.00;
}
// ============================================================================
// [BLOQUE 3] CONSTRUCCIÓN DE MALLAS MUSCULARES AJUSTADAS AL RIG Y POSE NEUTRA
// Función: Instancia cada sub-rama muscular sobre las coordenadas exactas de la
// caja torácica, columna, pelvis y extremidades de la Capa 1, registrando su
// restPose inmutable.
// ============================================================================
export function crearCapaMusculo(opciones = {}) {
  const group = new THREE.Group();
  group.name = "CapaMusculo";

  const texFibra = crearTexturaFibraMuscular();

  const materialMusculo = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color("#b8353f"),
    map: texFibra,
    bumpMap: texFibra,
    bumpScale: 0.004,
    roughness: 0.44,
    metalness: 0.04,
    clearcoat: 0.18,
    clearcoatRoughness: 0.48
  });

  const rigProcedural = new THREE.Group();
  rigProcedural.name = "MusculoProcedural";
  group.add(rigProcedural);

  const contenedorGlb = new THREE.Group();
  contenedorGlb.name = "MusculoGLB";
  contenedorGlb.visible = false;
  group.add(contenedorGlb);

  const mallas = {};
  const restPose = {};

  function registrarMalla(nombre, geo, padre, pos = [0, 0, 0], rot = [0, 0, 0], esc = [1, 1, 1]) {
    const m = new THREE.Mesh(geo, materialMusculo);
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

  // Nodos seguidores con coordenadas base idénticas a la pose neutra de Capa 1
  const nPelvis = new THREE.Group();
  nPelvis.position.set(0, 0.86, 0);

  const nCore = new THREE.Group();
  nCore.position.set(0, 1.01, -0.005);

  const nTorax = new THREE.Group();
  nTorax.position.set(0, 1.19, 0.01);

  const nCuello = new THREE.Group();
  nCuello.position.set(0, 1.39, 0.005);

  rigProcedural.add(nPelvis, nCore, nTorax, nCuello);

  // 1. Rama Cuello (Esternocleidomastoideo y escalenos)
  registrarMalla("cuelloIzq", crearVientreMuscular(0.014, 0.026, 0.125), nCuello, [-0.024, 0.005, 0.004], [0.08, 0, -0.10]);
  registrarMalla("cuelloDer", crearVientreMuscular(0.014, 0.026, 0.125), nCuello, [0.024, 0.005, 0.004], [0.08, 0, 0.10]);

  // 2. Rama Pecho: Pectoral Superior, Medio e Inferior colocados sobre las costillas anteriores
  [-1, 1].forEach((s) => {
    const lado = s < 0 ? "Izq" : "Der";
    const geoPec = new THREE.SphereGeometry(0.058, 22, 18);
    registrarMalla(`pecSup${lado}`, geoPec, nTorax, [s * 0.058, 0.082, 0.088], [-0.24, s * 0.22, s * 0.14], [1.24, 0.44, 0.46]);
    registrarMalla(`pecMed${lado}`, geoPec, nTorax, [s * 0.062, 0.044, 0.098], [0, s * 0.20, 0], [1.30, 0.54, 0.52]);
    registrarMalla(`pecInf${lado}`, geoPec, nTorax, [s * 0.058, 0.008, 0.092], [0.22, s * 0.18, -s * 0.10], [1.20, 0.40, 0.44]);
  });

  // 3. Rama Espalda Media y Alta: Trapecio (Sup, Med, Inf), Romboides Mayor y Dorsal Ancho
  [-1, 1].forEach((s) => {
    const lado = s < 0 ? "Izq" : "Der";
    registrarMalla(`trapSup${lado}`, crearVientreMuscular(0.015, 0.036, 0.145), nTorax, [s * 0.054, 0.132, -0.045], [0.14, 0, s * 0.58], [1.0, 1.0, 0.68]);
    registrarMalla(`trapMed${lado}`, new THREE.SphereGeometry(0.050, 18, 14), nTorax, [s * 0.046, 0.072, -0.078], [0, 0, s * 0.14], [1.26, 0.56, 0.44]);
    registrarMalla(`trapInf${lado}`, crearVientreMuscular(0.014, 0.038, 0.165), nTorax, [s * 0.035, -0.005, -0.080], [-0.08, 0, -s * 0.22], [1.0, 1.0, 0.48]);
    registrarMalla(`romboides${lado}`, new THREE.SphereGeometry(0.048, 16, 14), nTorax, [s * 0.062, 0.062, -0.072], [0, 0, s * 0.34], [1.18, 0.62, 0.40]);
    registrarMalla(`dorsal${lado}`, crearVientreMuscular(0.026, 0.072, 0.26, 0.12), nTorax, [s * 0.092, -0.020, -0.058], [0.06, -s * 0.24, -s * 0.18], [1.14, 1.0, 0.58]);
  });

  // 4. Rama Zona Media / Core: Abdomen, Oblicuos y Erectores Lumbares
  registrarMalla("abdomen", crearVientreMuscular(0.046, 0.082, 0.25), nCore, [0, 0.015, 0.068], [0, 0, 0], [1.06, 1.0, 0.56]);
  [-1, 1].forEach((s) => {
    const lado = s < 0 ? "Izq" : "Der";
    registrarMalla(`oblicuo${lado}`, crearVientreMuscular(0.026, 0.048, 0.20), nCore, [s * 0.086, -0.005, 0.028], [0.06, s * 0.30, 0], [0.74, 1.0, 0.94]);
    registrarMalla(`lumbar${lado}`, crearVientreMuscular(0.020, 0.036, 0.22), nCore, [s * 0.034, 0.0, -0.056], [0, 0, 0], [0.96, 1.0, 0.80]);
  });

  // 5. Rama Glúteos
  [-1, 1].forEach((s) => {
    const lado = s < 0 ? "Izq" : "Der";
    registrarMalla(`gluteo${lado}`, new THREE.SphereGeometry(0.080, 22, 18), nPelvis, [s * 0.072, -0.015, -0.062], [0.14, s * 0.12, 0], [0.98, 0.94, 1.10]);
  });

  // 6. Rama Deltoides (3 cabezas) y Rama Brazos (Bíceps, Tríceps, Antebrazo y Muñeca)
  function construirBrazoMuscular(lado, signo) {
    const nHombro = new THREE.Group();
    nHombro.position.set(signo * 0.189, 1.32, 0.012);

    const nBrazoSup = new THREE.Group();
    nBrazoSup.position.set(signo * 0.21, 1.18, 0.012);

    const nAntebrazo = new THREE.Group();
    nAntebrazo.position.set(signo * 0.24, 0.92, 0.020);

    rigProcedural.add(nHombro, nBrazoSup, nAntebrazo);

    const geoDelt = crearVientreMuscular(0.014, 0.034, 0.125, 0.12);
    registrarMalla(`deltAnt${lado}`, geoDelt, nHombro, [signo * 0.012, -0.026, 0.024], [-0.22, 0, -signo * 0.16], [0.94, 1.0, 0.90]);
    registrarMalla(`deltLat${lado}`, geoDelt, nHombro, [signo * 0.028, -0.024, 0.0], [0, 0, -signo * 0.26], [0.98, 1.05, 1.04]);
    registrarMalla(`deltPost${lado}`, geoDelt, nHombro, [signo * 0.012, -0.026, -0.024], [0.22, 0, -signo * 0.16], [0.92, 1.0, 0.88]);

    registrarMalla(`biceps${lado}`, crearVientreMuscular(0.015, 0.037, 0.23, -0.04), nBrazoSup, [0, 0, 0.018], [0, 0, 0], [0.96, 1.0, 0.96]);
    registrarMalla(`triceps${lado}`, crearVientreMuscular(0.016, 0.039, 0.24, 0.08), nBrazoSup, [0, 0.008, -0.020], [0, 0, 0], [1.02, 1.0, 0.96]);

    registrarMalla(`antebrazo${lado}`, crearVientreMuscular(0.014, 0.034, 0.23, 0.16), nAntebrazo, [0, 0.01, 0.002], [0, 0, 0], [0.98, 1.0, 0.94]);
    registrarMalla(`muneca${lado}`, new THREE.CylinderGeometry(0.020, 0.019, 0.044, 18), nAntebrazo, [0, -0.105, 0], [0, 0, 0], [1.0, 1.0, 0.82]);

    return { nHombro, nBrazoSup, nAntebrazo };
  }
  const segBrazoIzq = construirBrazoMuscular("Izq", -1);
  const segBrazoDer = construirBrazoMuscular("Der", 1);

  // 7. Rama Muslos (Cuádriceps e Isquiotibiales) y Pantorrillas / Gemelos
  function construirPiernaMuscular(lado, signo) {
    const nMuslo = new THREE.Group();
    nMuslo.position.set(signo * 0.098, 0.64, 0.008);

    const nPiernaInf = new THREE.Group();
    nPiernaInf.position.set(signo * 0.098, 0.24, 0.005);

    rigProcedural.add(nMuslo, nPiernaInf);

    registrarMalla(`cuadriceps${lado}`, crearVientreMuscular(0.030, 0.070, 0.38, 0.06), nMuslo, [signo * 0.004, 0, 0.020], [0, 0, 0], [1.06, 1.0, 0.98]);
    registrarMalla(`isquios${lado}`, crearVientreMuscular(0.026, 0.058, 0.37, 0.04), nMuslo, [0, 0, -0.022], [0, 0, 0], [0.96, 1.0, 0.96]);
    registrarMalla(`pantorrilla${lado}`, crearVientreMuscular(0.019, 0.049, 0.35, 0.18), nPiernaInf, [0, 0.015, -0.016], [0, 0, 0], [0.98, 1.0, 1.08]);

    return { nMuslo, nPiernaInf };
  }
  const segPiernaIzq = construirPiernaMuscular("Izq", -1);
  const segPiernaDer = construirPiernaMuscular("Der", 1);
  // ============================================================================
// [BLOQUE 4] MOTOR UNIFICADO applyAnatomyState(state) POR RAMAS Y SUB-RAMAS
// Función: Resetea las mallas a restPose, calcula los factores de desarrollo
// muscular por cada Gran Rama y Sub-rama sin conflicto de unidades y sincroniza
// posición y rotación con los anclajes mundiales del esqueleto.
// ============================================================================
  const ejeY = new THREE.Vector3(0, 1, 0);
  const vDir = new THREE.Vector3();
  let ultimoParams = {};
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

  function applyAnatomyState(state = {}) {
    ultimoParams = { ...ultimoParams, ...state };
    resetToRestPose();

    const estaturaCm = acotar(ultimoParams.estaturaCm ?? 175, 140, 210);
    const escalaAltura = estaturaCm / 175;
    const morfologia = ultimoParams.morfologia ?? "mesomorfo";
    const factorSomato = morfologia === "ectomorfo" ? 0.90 : (morfologia === "endomorfo" ? 0.98 : 1.04);

    // Músculo General (Global en kg)
    const musculoGlobalKg = acotar(ultimoParams.musculoGlobalKg ?? 32, ...CLAMP_MUSCULO.musculoGlobalKg);
    const fGlobal = Math.cbrt(musculoGlobalKg / 32) * factorSomato;

    // 1. GRAN RAMA DELTOIDES (Hombros):
    // - "general": Nivel (0-10) o Centímetros (cm).
    // - "desglosado": Anterior, Lateral y Posterior SOLO por Nivel (0-10), sin cm.
    let fDeltAnt = 1, fDeltLat = 1, fDeltPost = 1;
    if (ultimoParams.deltoidesModo === "desglosado") {
      fDeltAnt = factorDesdeNivel10(ultimoParams.deltoidesAnterior ?? 4) * fGlobal;
      fDeltLat = factorDesdeNivel10(ultimoParams.deltoidesLateral ?? 4) * fGlobal;
      fDeltPost = factorDesdeNivel10(ultimoParams.deltoidesPosterior ?? 4) * fGlobal;
    } else {
      const fDeltGen = (ultimoParams.deltoidesUnidad === "cm"
        ? acotar(ultimoParams.hombrosCm ?? 118, ...CLAMP_MUSCULO.hombrosCm) / 118
        : factorDesdeNivel10(ultimoParams.deltoidesGeneralNivel ?? 4)) * fGlobal;
      fDeltAnt = fDeltLat = fDeltPost = fDeltGen;
    }

    // 2. GRAN RAMA BRAZOS (Bíceps, Tríceps, Antebrazo y Muñeca)
    let fBiceps = 1, fTriceps = 1;
    if (ultimoParams.brazoModo === "desglosado") {
      fBiceps = factorDesdeNivel10(ultimoParams.bicepsNivel ?? 4) * fGlobal;
      fTriceps = factorDesdeNivel10(ultimoParams.tricepsNivel ?? 4) * fGlobal;
    } else {
      const fBrazoGen = (ultimoParams.brazoUnidad === "cm"
        ? acotar(ultimoParams.brazoCm ?? 35, ...CLAMP_MUSCULO.brazoCm) / 35
        : factorDesdeNivel10(ultimoParams.brazoGeneralNivel ?? 4)) * fGlobal;
      fBiceps = fTriceps = fBrazoGen;
    }

    const fAntebrazo = (ultimoParams.antebrazoUnidad === "cm"
      ? acotar(ultimoParams.antebrazoCm ?? 28, ...CLAMP_MUSCULO.antebrazoCm) / 28
      : factorDesdeNivel10(ultimoParams.antebrazoNivel ?? 4)) * fGlobal;
    const fMuneca = factorDesdeMuneca(ultimoParams.munecaTipo ?? "normal");

    // 3. GRAN RAMA PECHO (Pectorales)
    let fPecSup = 1, fPecMed = 1, fPecInf = 1;
    if (ultimoParams.pechoModo === "desglosado") {
      fPecSup = factorDesdeNivel10(ultimoParams.pectoralSuperior ?? 4) * fGlobal;
      fPecMed = factorDesdeNivel10(ultimoParams.pectoralMedio ?? 4) * fGlobal;
      fPecInf = factorDesdeNivel10(ultimoParams.pectoralInferior ?? 4) * fGlobal;
    } else {
      const fPechoGen = (ultimoParams.pechoUnidad === "cm"
        ? acotar(ultimoParams.pechoCm ?? 100, ...CLAMP_MUSCULO.pechoCm) / 100
        : factorDesdeNivel10(ultimoParams.pechoGeneralNivel ?? 4)) * fGlobal;
      fPecSup = fPecMed = fPecInf = fPechoGen;
    }

    // 4. GRAN RAMA ESPALDA MEDIA Y ALTA (Trapecio, Romboides Mayor y Dorsal Ancho)
    let fTrapSup = 1, fTrapMed = 1, fTrapInf = 1;
    if (ultimoParams.trapecioModo === "desglosado") {
      fTrapSup = factorDesdeNivel10(ultimoParams.trapecioSuperior ?? 4) * fGlobal;
      fTrapMed = factorDesdeNivel10(ultimoParams.trapecioMedio ?? 4) * fGlobal;
      fTrapInf = factorDesdeNivel10(ultimoParams.trapecioInferior ?? 4) * fGlobal;
    } else {
      const fTrapGen = factorDesdeNivel10(ultimoParams.trapecioGeneralNivel ?? 4) * fGlobal;
      fTrapSup = fTrapMed = fTrapInf = fTrapGen;
    }
    const fRomboides = factorDesdeNivel10(ultimoParams.romboidesNivel ?? 4) * fGlobal;
    const fDorsal = factorDesdeNivel10(ultimoParams.dorsalAnchoNivel ?? 4) * fGlobal;

    // 5. GRAN RAMA CUELLO Y CORE (Escala 0 a 5, base 2)
    const fCuello = factorDesdeNivel5(ultimoParams.cuelloNivel ?? 2) * fGlobal;
    const fAbdomen = factorDesdeNivel5(ultimoParams.abdomenNivel ?? 2) * fGlobal;
    const fOblicuos = factorDesdeNivel5(ultimoParams.oblicuosNivel ?? 2) * fGlobal;
    const fLumbar = factorDesdeNivel5(ultimoParams.lumbarNivel ?? 2) * fGlobal;

    // 6. GRAN RAMA TREN INFERIOR (Glúteos 0-10, Muslos General/Desglosado y Pantorrillas 0-5)
    const fGluteos = factorDesdeNivel10(ultimoParams.gluteosNivel ?? 4) * fGlobal;
    let fCuadriceps = 1, fIsquios = 1;
    if (ultimoParams.musloModo === "desglosado") {
      fCuadriceps = factorDesdeNivel10(ultimoParams.cuadricepsNivel ?? 4) * fGlobal;
      fIsquios = factorDesdeNivel10(ultimoParams.isquiotibialesNivel ?? 4) * fGlobal;
    } else {
      const fMusloGen = (ultimoParams.musloUnidad === "cm"
        ? acotar(ultimoParams.musloCm ?? 56, ...CLAMP_MUSCULO.musloCm) / 56
        : factorDesdeNivel10(ultimoParams.musloGeneralNivel ?? 4)) * fGlobal;
      fCuadriceps = fIsquios = fMusloGen;
    }
    const fPantorrilla = factorDesdeNivel5(ultimoParams.pantorrillaNivel ?? 2) * fGlobal;

    // Sincronización con los anclajes mundiales del esqueleto (Capa 1)
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

      const configurarExtremidadSup = (seg, pHombro, pCodo, pMuneca) => {
        seg.nHombro.position.copy(pHombro);
        if (pHombro.quat) seg.nHombro.quaternion.copy(pHombro.quat);
        seg.nHombro.scale.setScalar(escalaAltura);

        const lBrazo = alinearSegmentoEntreAnclajes(seg.nBrazoSup, pHombro, pCodo);
        seg.nBrazoSup.scale.set(escalaAltura, lBrazo / 0.28, escalaAltura);

        const lAnt = alinearSegmentoEntreAnclajes(seg.nAntebrazo, pCodo, pMuneca);
        seg.nAntebrazo.scale.set(escalaAltura, lAnt / 0.25, escalaAltura);
      };

      if (anc.hombroIzq && anc.codoIzq && anc.munecaIzq) {
        configurarExtremidadSup(segBrazoIzq, anc.hombroIzq, anc.codoIzq, anc.munecaIzq);
      }
      if (anc.hombroDer && anc.codoDer && anc.munecaDer) {
        configurarExtremidadSup(segBrazoDer, anc.hombroDer, anc.codoDer, anc.munecaDer);
      }

      const configurarExtremidadInf = (seg, pCadera, pRodilla, pTobillo) => {
        const lMuslo = alinearSegmentoEntreAnclajes(seg.nMuslo, pCadera, pRodilla);
        seg.nMuslo.scale.set(escalaAltura, lMuslo / 0.41, escalaAltura);

        const lPierna = alinearSegmentoEntreAnclajes(seg.nPiernaInf, pRodilla, pTobillo);
        seg.nPiernaInf.scale.set(escalaAltura, lPierna / 0.40, escalaAltura);
      };

      if (anc.caderaIzq && anc.rodillaIzq && anc.tobilloIzq) {
        configurarExtremidadInf(segPiernaIzq, anc.caderaIzq, anc.rodillaIzq, anc.tobilloIzq);
      }
      if (anc.caderaDer && anc.rodillaDer && anc.tobilloDer) {
        configurarExtremidadInf(segPiernaDer, anc.caderaDer, anc.rodillaDer, anc.tobilloDer);
      }
    }

    // Proyección radial hacia afuera respecto al hueso y caja torácica
    const morfoTorax = acotar(ultimoParams.morfologiaTorax ?? 1.0, 0.78, 1.28);

    ["Izq", "Der"].forEach((lado) => {
      const s = lado === "Izq" ? -1 : 1;

      mallas[`cuello${lado}`].scale.multiply(new THREE.Vector3(fCuello, 1.0, fCuello));

      mallas[`pecSup${lado}`].scale.multiply(new THREE.Vector3(fPecSup * morfoTorax, fPecSup, fPecSup));
      mallas[`pecSup${lado}`].position.z += (fPecSup - 1) * 0.016 + (morfoTorax - 1) * 0.03;

      mallas[`pecMed${lado}`].scale.multiply(new THREE.Vector3(fPecMed * morfoTorax, fPecMed, fPecMed));
      mallas[`pecMed${lado}`].position.z += (fPecMed - 1) * 0.022 + (morfoTorax - 1) * 0.035;

      mallas[`pecInf${lado}`].scale.multiply(new THREE.Vector3(fPecInf * morfoTorax, fPecInf, fPecInf));
      mallas[`pecInf${lado}`].position.z += (fPecInf - 1) * 0.018 + (morfoTorax - 1) * 0.03;

      mallas[`trapSup${lado}`].scale.multiply(new THREE.Vector3(fTrapSup, fTrapSup, fTrapSup));
      mallas[`trapMed${lado}`].scale.multiply(new THREE.Vector3(fTrapMed, fTrapMed, fTrapMed));
      mallas[`trapInf${lado}`].scale.multiply(new THREE.Vector3(fTrapInf, fTrapInf, fTrapInf));
      mallas[`romboides${lado}`].scale.multiply(new THREE.Vector3(fRomboides, fRomboides, fRomboides));

      mallas[`dorsal${lado}`].scale.multiply(new THREE.Vector3(fDorsal * morfoTorax, 1.0, fDorsal));
      mallas[`dorsal${lado}`].position.x += s * (fDorsal - 1) * 0.025;

      mallas[`oblicuo${lado}`].scale.multiply(new THREE.Vector3(fOblicuos, 1.0, fOblicuos));
      mallas[`oblicuo${lado}`].position.x += s * (fOblicuos - 1) * 0.012;
      mallas[`lumbar${lado}`].scale.multiply(new THREE.Vector3(fLumbar, 1.0, fLumbar));
      mallas[`lumbar${lado}`].position.z -= (fLumbar - 1) * 0.010;

      mallas[`gluteo${lado}`].scale.multiply(new THREE.Vector3(fGluteos, fGluteos, fGluteos));
      mallas[`gluteo${lado}`].position.z -= (fGluteos - 1) * 0.022;

      mallas[`deltAnt${lado}`].scale.multiply(new THREE.Vector3(fDeltAnt, 1.0, fDeltAnt));
      mallas[`deltAnt${lado}`].position.z += (fDeltAnt - 1) * 0.010;

      mallas[`deltLat${lado}`].scale.multiply(new THREE.Vector3(fDeltLat, 1.0, fDeltLat));
      mallas[`deltLat${lado}`].position.x += s * (fDeltLat - 1) * 0.014;

      mallas[`deltPost${lado}`].scale.multiply(new THREE.Vector3(fDeltPost, 1.0, fDeltPost));
      mallas[`deltPost${lado}`].position.z -= (fDeltPost - 1) * 0.010;

      mallas[`biceps${lado}`].scale.multiply(new THREE.Vector3(fBiceps, 1.0, fBiceps));
      mallas[`biceps${lado}`].position.z += (fBiceps - 1) * 0.012;

      mallas[`triceps${lado}`].scale.multiply(new THREE.Vector3(fTriceps, 1.0, fTriceps));
      mallas[`triceps${lado}`].position.z -= (fTriceps - 1) * 0.014;

      mallas[`antebrazo${lado}`].scale.multiply(new THREE.Vector3(fAntebrazo, 1.0, fAntebrazo));
      mallas[`muneca${lado}`].scale.multiply(new THREE.Vector3(fMuneca, 1.0, fMuneca));

      mallas[`cuadriceps${lado}`].scale.multiply(new THREE.Vector3(fCuadriceps, 1.0, fCuadriceps));
      mallas[`cuadriceps${lado}`].position.z += (fCuadriceps - 1) * 0.014;

      mallas[`isquios${lado}`].scale.multiply(new THREE.Vector3(fIsquios, 1.0, fIsquios));
      mallas[`isquios${lado}`].position.z -= (fIsquios - 1) * 0.014;

      mallas[`pantorrilla${lado}`].scale.multiply(new THREE.Vector3(fPantorrilla, 1.0, fPantorrilla));
      mallas[`pantorrilla${lado}`].position.z -= (fPantorrilla - 1) * 0.012;
    });

    mallas.abdomen.scale.multiply(new THREE.Vector3(fAbdomen, 1.0, fAbdomen));
    mallas.abdomen.position.z += (fAbdomen - 1) * 0.012;
  }
  // ============================================================================
// [BLOQUE 5] CARGADOR .GLB MUSCULAR Y EXPORTACIÓN PÚBLICA
// Función: Carga un archivo .glb muscular si se proporciona y retorna el
// objeto público con applyAnatomyState y actualizar.
// ============================================================================
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
              obj.material = materialMusculo;
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
    applyAnatomyState,
    actualizar: applyAnatomyState,
    cargarModeloGLB
  };
}