// ============================================================================
// VISAGELAB - CAPA 3: TEJIDO ADIPOSO CONTINUO EN TODO EL CUERPO Y CARA
// ============================================================================

// ============================================================================
// [BLOQUE 1] IMPORTACIONES, TEXTURA PBR CELULAR Y GEOMETRÍA ADIPOSA
// Función: Importa Three.js y GLTFLoader, sintetiza en un canvas 2D la textura
// lobulillar del tejido adiposo subcutáneo y define el generador geométrico
// de panículos adiposos mediante curvas Spline y torno (LatheGeometry).
// ============================================================================
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.158.0/build/three.module.js";
import { GLTFLoader } from "https://cdn.jsdelivr.net/npm/three@0.158.0/examples/jsm/loaders/GLTFLoader.js";

function crearTexturaTejidoAdiposo() {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#e6be5a";
  ctx.fillRect(0, 0, 256, 256);

  for (let i = 0; i < 1600; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const r = 1.2 + Math.random() * 2.8;
    ctx.fillStyle = Math.random() > 0.45
      ? "rgba(255, 236, 168, 0.25)"
      : "rgba(184, 134, 38, 0.20)";
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 3);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function crearContornoAdiposo(radiosYAlturas, segRadial = 28, segCurva = 22) {
  const puntos = radiosYAlturas.map(([r, y]) => new THREE.Vector2(r, y));
  const curva = new THREE.SplineCurve(puntos);
  const geo = new THREE.LatheGeometry(curva.getPoints(segCurva), segRadial);
  geo.computeVertexNormals();
  return geo;
}

// ============================================================================
// [BLOQUE 2] CONVERSIÓN ANTROPOMÉTRICA (%, KG, CM, ZONAS Y PLICÓMETRO EN MM)
// Función: Define los límites clínicos seguros (clamping) y transforma los
// porcentajes, kilogramos segmentarios, perímetros en cm, controles zonales y
// pliegues cutáneos en mm en factores volumétricos coherentes.
// ============================================================================
const CLAMP_GRASA = {
  grasaTotalPct: [4, 50],
  grasaTotalKg: [3, 60],
  segTroncoKg: [1.2, 32],
  segSupKg: [0.2, 6.5],
  segInfKg: [0.8, 15.0],
  cuelloCm: [28, 56],
  cinturaCm: [52, 145],
  caderaCm: [70, 155],
  nivelZona: [0, 10],
  movilidadZona: [-5, 5],
  pliegueMm: [2, 55]
};

function acotar(val, min, max) {
  return THREE.MathUtils.clamp(Number.isFinite(val) ? val : min, min, max);
}

function factorDesdePorcentaje(pctRaw = 18) {
  const pct = acotar(pctRaw, ...CLAMP_GRASA.grasaTotalPct);
  return 0.62 + (pct / 18) * 0.38;
}

function factorDesdeKg(kgRaw, kgRef, minKg, maxKg) {
  const kg = acotar(kgRaw ?? kgRef, minKg, maxKg);
  return 0.62 + Math.cbrt(kg / kgRef) * 0.38;
}

function factorDesdeZona10(nivelRaw = 4) {
  const n = acotar(nivelRaw, ...CLAMP_GRASA.nivelZona);
  if (n <= 4) return THREE.MathUtils.lerp(0.46, 1.00, n / 4);
  return THREE.MathUtils.lerp(1.00, 1.65, (n - 4) / 6);
}

function factorDesdePliegueMm(mmRaw, mmRef = 12) {
  const mm = acotar(mmRaw ?? mmRef, ...CLAMP_GRASA.pliegueMm);
  return 0.60 + Math.sqrt(mm / mmRef) * 0.40;
}

// ============================================================================
// [BLOQUE 3] ENVOLTURA ADIPOSA DE CUERPO COMPLETO Y CARA (restPose)
// Función: Construye el panículo adiposo continuo sobre cabeza/cara completa,
// cuello, tórax superior e inferior, pecho, abdomen, flancos, espalda (3 zonas),
// pelvis/caderas, hombros, brazos, antebrazos, manos, muslos, rodillas,
// pantorrillas y pies.
// ============================================================================
export function crearCapaGrasa(opciones = {}) {
  const group = new THREE.Group();
  group.name = "CapaGrasa";

  const texGrasa = crearTexturaTejidoAdiposo();

  const materialGrasa = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color("#e8c366"),
    map: texGrasa,
    bumpMap: texGrasa,
    bumpScale: 0.0035,
    roughness: 0.54,
    metalness: 0.01,
    clearcoat: 0.12,
    clearcoatRoughness: 0.60,
    transparent: true,
    opacity: 0.84
  });

  const rigProcedural = new THREE.Group();
  rigProcedural.name = "GrasaProcedural";
  group.add(rigProcedural);

  const contenedorGlb = new THREE.Group();
  contenedorGlb.name = "GrasaGLB";
  contenedorGlb.visible = false;
  group.add(contenedorGlb);

  const mallas = {};
  const restPose = {};

  function registrarMalla(nombre, geo, padre, pos = [0, 0, 0], rot = [0, 0, 0], esc = [1, 1, 1]) {
    const m = new THREE.Mesh(geo, materialGrasa);
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

  // 1. ZONA CARA Y CABEZA COMPLETA (Panículo craneal, frente, sienes, pómulos/mejillas y mandíbula)
  registrarMalla("caraBaseSubcutanea", new THREE.SphereGeometry(0.094, 28, 22), nCraneo, [0, 0.030, -0.003], [0, 0, 0], [0.88, 1.10, 1.06]);
  const geoMejilla = new THREE.SphereGeometry(0.034, 20, 16);
  registrarMalla("caraMejillaIzq", geoMejilla, nCraneo, [-0.045, -0.020, 0.056], [0.12, -0.25, 0], [0.92, 1.08, 0.85]);
  registrarMalla("caraMejillaDer", geoMejilla, nCraneo, [0.045, -0.020, 0.056], [0.12, 0.25, 0], [0.92, 1.08, 0.85]);
  registrarMalla("caraMandibula", new THREE.SphereGeometry(0.058, 22, 16), nCraneo, [0, -0.046, 0.034], [0.08, 0, 0], [0.92, 0.60, 0.98]);

  // 2. ZONA CUELLO 360° (Collar subcutáneo completo + Papada submentoniana)
  registrarMalla("cuelloPapada", new THREE.SphereGeometry(0.038, 18, 14), nCuello, [0, 0.046, 0.042], [0.35, 0, 0], [0.98, 0.56, 0.95]);
  registrarMalla(
    "cuelloContorno",
    crearContornoAdiposo([
      [0.001, -0.072],
      [0.062, -0.055],
      [0.056, 0.0],
      [0.054, 0.055],
      [0.001, 0.072]
    ], 24, 14),
    nCuello,
    [0, 0.005, 0.0],
    [0, 0, 0],
    [0.98, 1.0, 1.0]
  );

  // 3. TRONCO SUPERIOR, PECHO, ABDOMEN Y COSTADOS (Envoltura continua de hombros a pelvis)
  registrarMalla(
    "toraxMantoAdiposo",
    crearContornoAdiposo([
      [0.001, -0.14],
      [0.128, -0.11],
      [0.146, 0.02],
      [0.156, 0.11],
      [0.001, 0.145]
    ]),
    nTorax,
    [0, 0.015, 0.006],
    [0, 0, 0],
    [1.10, 1.0, 0.84]
  );

  [-1, 1].forEach((s) => {
    const lado = s < 0 ? "Izq" : "Der";
    registrarMalla(`pechoGrasa${lado}`, new THREE.SphereGeometry(0.066, 22, 18), nTorax, [s * 0.062, 0.040, 0.104], [0.08, s * 0.18, 0], [1.26, 0.76, 0.62]);
    registrarMalla(`costadoGrasa${lado}`, new THREE.SphereGeometry(0.064, 20, 16), nCore, [s * 0.098, -0.014, 0.016], [0, 0, s * 0.12], [0.84, 1.32, 1.12]);
  });

  registrarMalla(
    "troncoAbdomenGrasa",
    crearContornoAdiposo([
      [0.001, -0.145],
      [0.132, -0.115],
      [0.148, -0.025],
      [0.140, 0.06],
      [0.128, 0.125],
      [0.001, 0.145]
    ]),
    nCore,
    [0, 0.005, 0.020],
    [0, 0, 0],
    [1.08, 1.0, 0.78]
  );

  // 4. ESPALDA (Alta, Media y Baja) + ENVOLTURA PÉLVICA Y CADERAS
  registrarMalla(
    "pelvisMantoAdiposo",
    crearContornoAdiposo([
      [0.001, -0.10],
      [0.126, -0.07],
      [0.142, 0.0],
      [0.134, 0.07],
      [0.001, 0.10]
    ]),
    nPelvis,
    [0, 0.0, -0.005],
    [0, 0, 0],
    [1.10, 1.0, 0.88]
  );

  [-1, 1].forEach((s) => {
    const lado = s < 0 ? "Izq" : "Der";
    registrarMalla(`espaldaAlta${lado}`, new THREE.SphereGeometry(0.066, 20, 16), nTorax, [s * 0.068, 0.070, -0.082], [-0.10, -s * 0.18, 0], [1.25, 0.84, 0.54]);
    registrarMalla(`espaldaMedia${lado}`, new THREE.SphereGeometry(0.064, 20, 16), nTorax, [s * 0.078, -0.015, -0.072], [0, -s * 0.22, 0], [1.22, 0.90, 0.58]);
    registrarMalla(`espaldaBaja${lado}`, new THREE.SphereGeometry(0.062, 20, 16), nCore, [s * 0.064, -0.012, -0.062], [0.08, 0, 0], [1.20, 0.92, 0.62]);
    registrarMalla(`caderaGluteoGrasa${lado}`, new THREE.SphereGeometry(0.090, 22, 18), nPelvis, [s * 0.078, -0.016, -0.062], [0.12, s * 0.12, 0], [1.08, 1.0, 1.16]);
  });

  // 5. MIEMBROS SUPERIORES COMPLETOS (Hombro, Brazo, Antebrazo y Mano)
  function construirBrazoAdiposo(lado, signo) {
    const nHombro = new THREE.Group();
    const nBrazoSup = new THREE.Group();
    const nAntebrazo = new THREE.Group();
    const nMano = new THREE.Group();
    rigProcedural.add(nHombro, nBrazoSup, nAntebrazo, nMano);

    registrarMalla(`hombroGrasa${lado}`, new THREE.SphereGeometry(0.052, 20, 16), nHombro, [signo * 0.016, -0.022, 0], [0, 0, -signo * 0.15], [1.02, 1.15, 1.02]);

    const geoBrazo = crearContornoAdiposo([
      [0.001, -0.145],
      [0.044, -0.115],
      [0.056, -0.02],
      [0.060, 0.065],
      [0.050, 0.13],
      [0.001, 0.145]
    ]);
    const geoAnt = crearContornoAdiposo([
      [0.001, -0.13],
      [0.030, -0.11],
      [0.042, -0.02],
      [0.046, 0.075],
      [0.038, 0.115],
      [0.001, 0.13]
    ]);

    registrarMalla(`brazoGrasa${lado}`, geoBrazo, nBrazoSup);
    registrarMalla(`antebrazoGrasa${lado}`, geoAnt, nAntebrazo);
    registrarMalla(`manoGrasa${lado}`, new THREE.SphereGeometry(0.028, 16, 14), nMano, [0, -0.040, 0], [0, 0, 0], [0.56, 1.65, 1.20]);

    return { nHombro, nBrazoSup, nAntebrazo, nMano };
  }
  const segSupIzq = construirBrazoAdiposo("Izq", -1);
  const segSupDer = construirBrazoAdiposo("Der", 1);

  // 6. MIEMBROS INFERIORES COMPLETOS (Muslo, Rodilla, Pantorrilla y Pie)
  function construirPiernaAdiposa(lado, signo) {
    const nMuslo = new THREE.Group();
    const nPiernaInf = new THREE.Group();
    const nPie = new THREE.Group();
    rigProcedural.add(nMuslo, nPiernaInf, nPie);

    const geoMuslo = crearContornoAdiposo([
      [0.001, -0.21],
      [0.062, -0.18],
      [0.082, -0.05],
      [0.096, 0.08],
      [0.102, 0.18],
      [0.001, 0.21]
    ]);
    const geoPant = crearContornoAdiposo([
      [0.001, -0.205],
      [0.036, -0.17],
      [0.060, -0.04],
      [0.058, 0.08],
      [0.052, 0.175],
      [0.001, 0.205]
    ]);

    registrarMalla(`musloGrasa${lado}`, geoMuslo, nMuslo, [0, 0, 0], [0, 0, 0], [1.05, 1.0, 1.08]);
    registrarMalla(`pantorrillaGrasa${lado}`, geoPant, nPiernaInf, [0, 0, -0.006], [0, 0, 0], [0.98, 1.0, 1.10]);
    registrarMalla(`pieGrasa${lado}`, new THREE.SphereGeometry(0.036, 16, 14), nPie, [0, -0.018, 0.044], [0, 0, 0], [0.96, 0.56, 2.75]);

    return { nMuslo, nPiernaInf, nPie };
  }
  const segInfIzq = construirPiernaAdiposa("Izq", -1);
  const segInfDer = construirPiernaAdiposa("Der", 1);

  // ==========================================================================
  // [BLOQUE 4] MOTOR UNIFICADO applyAnatomyState Y PUENTE VOLUMÉTRICO A CAPA 4
  // Función: Resetea a restPose, integra los parámetros globales (% y kg), los
  // 5 segmentos en kg, los perímetros en cm (cuello, cintura, cadera), las zonas
  // con movilidad y la Plicometría (mm), envolviendo por completo la Capa 2.
  // ==========================================================================
  const ejeY = new THREE.Vector3(0, 1, 0);
  const vDir = new THREE.Vector3();
  let ultimoParams = {};
  let skinnedMeshGlb = null;

  const estadoVolumetrico = {
    fGlobal: 1.0,
    fCara: 1.0,
    fCuello: 1.0,
    fPecho: 1.0,
    fCintura: 1.0,
    fCostados: 1.0,
    fCadera: 1.0,
    fEspalda: 1.0,
    fSupDer: 1.0,
    fSupIzq: 1.0,
    fInfDer: 1.0,
    fInfIzq: 1.0,
    desplazamientoY: 0
  };

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
    const morfoTorax = acotar(ultimoParams.morfologiaTorax ?? 1.0, 0.78, 1.28);

    const fPctGlobal = factorDesdePorcentaje(ultimoParams.grasaTotalPct ?? 18);
    const fKgGlobal = factorDesdeKg(ultimoParams.grasaTotalKg ?? 13.5, 13.5, ...CLAMP_GRASA.grasaTotalKg);
    const fGlobal = ultimoParams.grasaGlobalUnidad === "kg"
      ? fKgGlobal
      : (ultimoParams.grasaGlobalUnidad === "ambos" ? (fPctGlobal + fKgGlobal) * 0.5 : fPctGlobal);

    materialGrasa.opacity = THREE.MathUtils.clamp(0.56 + (fGlobal - 0.62) * 0.45, 0.50, 0.90);

    const fSegTronco = factorDesdeKg(ultimoParams.grasaTroncoKg ?? 7.0, 7.0, ...CLAMP_GRASA.segTroncoKg) * (0.35 + 0.65 * fGlobal);
    const fSegSupDer = factorDesdeKg(ultimoParams.grasaSupDerKg ?? 0.9, 0.9, ...CLAMP_GRASA.segSupKg) * (0.35 + 0.65 * fGlobal);
    const fSegSupIzq = factorDesdeKg(ultimoParams.grasaSupIzqKg ?? 0.9, 0.9, ...CLAMP_GRASA.segSupKg) * (0.35 + 0.65 * fGlobal);
    const fSegInfDer = factorDesdeKg(ultimoParams.grasaInfDerKg ?? 2.3, 2.3, ...CLAMP_GRASA.segInfKg) * (0.35 + 0.65 * fGlobal);
    const fSegInfIzq = factorDesdeKg(ultimoParams.grasaInfIzqKg ?? 2.3, 2.3, ...CLAMP_GRASA.segInfKg) * (0.35 + 0.65 * fGlobal);

    const fCuelloCm = acotar(ultimoParams.cuelloCm ?? 38, ...CLAMP_GRASA.cuelloCm) / 38;
    const fCinturaCm = acotar(ultimoParams.cinturaCm ?? 80, ...CLAMP_GRASA.cinturaCm) / 80;
    const fCaderaCm = acotar(ultimoParams.caderaCm ?? 96, ...CLAMP_GRASA.caderaCm) / 96;

    const plicActivo = Boolean(ultimoParams.plicometroActivo ?? false);
    const fPlicPecho = plicActivo ? factorDesdePliegueMm(ultimoParams.plieguePectoralMm ?? 10, 10) : 1.0;
    const fPlicTricipital = plicActivo ? factorDesdePliegueMm(ultimoParams.pliegueTricipitalMm ?? 12, 12) : 1.0;
    const fPlicSubescapular = plicActivo ? factorDesdePliegueMm(ultimoParams.pliegueSubescapularMm ?? 14, 14) : 1.0;
    const fPlicSuprailiaco = plicActivo ? factorDesdePliegueMm(ultimoParams.pliegueSuprailiacoMm ?? 15, 15) : 1.0;
    const fPlicAbdominal = plicActivo ? factorDesdePliegueMm(ultimoParams.pliegueAbdominalMm ?? 18, 18) : 1.0;
    const fPlicMuslo = plicActivo ? factorDesdePliegueMm(ultimoParams.pliegueMusloMm ?? 16, 16) : 1.0;

    const fCara = factorDesdeZona10(ultimoParams.grasaCaraNivel ?? 4) * (0.4 + 0.6 * fGlobal);
    const fCuello = factorDesdeZona10(ultimoParams.grasaCuelloNivel ?? 4) * fCuelloCm * (0.4 + 0.6 * fGlobal);
    const fPecho = factorDesdeZona10(ultimoParams.grasaPechoNivel ?? 4) * fSegTronco * fPlicPecho;
    const fCostados = factorDesdeZona10(ultimoParams.grasaCostadosNivel ?? 4) * fSegTronco * fCinturaCm * fPlicSuprailiaco;
    const fAbdomen = fSegTronco * fCinturaCm * fPlicAbdominal;
    const fCadera = ((fSegInfDer + fSegInfIzq) * 0.5) * fCaderaCm;

    let fEspAlta = 1, fEspMedia = 1, fEspBaja = 1;
    if (ultimoParams.grasaEspaldaModo === "desglosado") {
      fEspAlta = factorDesdeZona10(ultimoParams.grasaEspaldaAltaNivel ?? 4) * fSegTronco * fPlicSubescapular;
      fEspMedia = factorDesdeZona10(ultimoParams.grasaEspaldaMediaNivel ?? 4) * fSegTronco * fPlicSubescapular;
      fEspBaja = factorDesdeZona10(ultimoParams.grasaEspaldaBajaNivel ?? 4) * fSegTronco * fCinturaCm;
    } else {
      const fEspGen = factorDesdeZona10(ultimoParams.grasaEspaldaGeneralNivel ?? 4) * fSegTronco * fPlicSubescapular;
      fEspAlta = fEspMedia = fEspBaja = fEspGen;
    }

    const movSecciones = acotar(ultimoParams.grasaMovilidadVertical ?? 0, ...CLAMP_GRASA.movilidadZona) * 0.004;

    const musculoGlobalKg = acotar(ultimoParams.musculoGlobalKg ?? 32, 15, 58);
    const fBaseMuscular = Math.cbrt(musculoGlobalKg / 32);
    const fMuscCuello = 0.85 + ((ultimoParams.cuelloNivel ?? 2) / 5) * 0.25;

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
        const lA = alinearSegmentoEntreAnclajes(seg.nAntebrazo, pCodo, pMuneca);
        seg.nAntebrazo.scale.set(escalaAltura, lA / 0.25, escalaAltura);

        seg.nMano.position.copy(pMuneca);
        if (pMuneca.quat) seg.nMano.quaternion.copy(pMuneca.quat);
        seg.nMano.scale.setScalar(escalaAltura);
      };
      if (anc.hombroIzq && anc.codoIzq && anc.munecaIzq) {
        alinearBrazo(segSupIzq, anc.hombroIzq, anc.codoIzq, anc.munecaIzq);
      }
      if (anc.hombroDer && anc.codoDer && anc.munecaDer) {
        alinearBrazo(segSupDer, anc.hombroDer, anc.codoDer, anc.munecaDer);
      }

      const alinearPierna = (seg, pCadera, pRodilla, pTobillo) => {
        const lM = alinearSegmentoEntreAnclajes(seg.nMuslo, pCadera, pRodilla);
        seg.nMuslo.scale.set(escalaAltura, lM / 0.41, escalaAltura);
        const lP = alinearSegmentoEntreAnclajes(seg.nPiernaInf, pRodilla, pTobillo);
        seg.nPiernaInf.scale.set(escalaAltura, lP / 0.40, escalaAltura);

        seg.nPie.position.copy(pTobillo);
        if (pTobillo.quat) seg.nPie.quaternion.copy(pTobillo.quat);
        seg.nPie.scale.setScalar(escalaAltura);
      };
      if (anc.caderaIzq && anc.rodillaIzq && anc.tobilloIzq) {
        alinearPierna(segInfIzq, anc.caderaIzq, anc.rodillaIzq, anc.tobilloIzq);
      }
      if (anc.caderaDer && anc.rodillaDer && anc.tobilloDer) {
        alinearPierna(segInfDer, anc.caderaDer, anc.rodillaDer, anc.tobilloDer);
      }
    }

    // Cara y Cabeza
    mallas.caraBaseSubcutanea.scale.multiply(new THREE.Vector3(0.92 + fCara * 0.08, 0.96 + fCara * 0.04, 0.94 + fCara * 0.06));
    ["Izq", "Der"].forEach((lado) => {
      const s = lado === "Izq" ? -1 : 1;
      const mejilla = mallas[`caraMejilla${lado}`];
      mejilla.scale.multiply(new THREE.Vector3(fCara, fCara, fCara));
      mejilla.position.x += s * (fCara - 1.0) * 0.011;
      mejilla.position.z += (fCara - 1.0) * 0.013;
      mejilla.position.y += movSecciones * 0.35;
    });
    mallas.caraMandibula.scale.multiply(new THREE.Vector3(0.84 + fCara * 0.16, 0.78 + fCara * 0.22, 0.88 + fCara * 0.12));

    // Cuello
    const fCuelloTotal = fCuello * fMuscCuello;
    mallas.cuelloPapada.scale.multiply(new THREE.Vector3(fCuelloTotal, fCuelloTotal * 1.15, fCuelloTotal * 1.22));
    mallas.cuelloPapada.position.y += -((fCuelloTotal - 1.0) * 0.008) + movSecciones * 0.4;
    mallas.cuelloPapada.position.z += (fCuelloTotal - 1.0) * 0.014;
    mallas.cuelloContorno.scale.multiply(new THREE.Vector3(fCuelloTotal, 1.0, fCuelloTotal));

    // Tronco, Abdomen y Pelvis
    const fAbdomenFinal = fAbdomen * (0.85 + 0.15 * fBaseMuscular);
    mallas.toraxMantoAdiposo.scale.multiply(new THREE.Vector3(fSegTronco * morfoTorax * fBaseMuscular, 1.0, fSegTronco * morfoTorax));
    mallas.troncoAbdomenGrasa.scale.multiply(new THREE.Vector3(fAbdomenFinal * morfoTorax, 1.0, fAbdomenFinal * 1.14));
    mallas.troncoAbdomenGrasa.position.z += (fAbdomenFinal - 1.0) * 0.028;
    mallas.troncoAbdomenGrasa.position.y += movSecciones;
    mallas.pelvisMantoAdiposo.scale.multiply(new THREE.Vector3(fCadera, 1.0, fCadera));

    ["Izq", "Der"].forEach((lado) => {
      const s = lado === "Izq" ? -1 : 1;

      const fPechoFinal = fPecho * (0.85 + 0.15 * fBaseMuscular);
      mallas[`pechoGrasa${lado}`].scale.multiply(new THREE.Vector3(fPechoFinal * morfoTorax, fPechoFinal, fPechoFinal));
      mallas[`pechoGrasa${lado}`].position.z += (fPechoFinal - 1.0) * 0.022 + (morfoTorax - 1.0) * 0.03;
      mallas[`pechoGrasa${lado}`].position.y += movSecciones * 1.15;

      mallas[`costadoGrasa${lado}`].scale.multiply(new THREE.Vector3(fCostados, 1.0, fCostados));
      mallas[`costadoGrasa${lado}`].position.x += s * (fCostados - 1.0) * 0.024;
      mallas[`costadoGrasa${lado}`].position.y += movSecciones * 0.85;

      mallas[`espaldaAlta${lado}`].scale.multiply(new THREE.Vector3(fEspAlta * morfoTorax, fEspAlta, fEspAlta));
      mallas[`espaldaAlta${lado}`].position.z -= (fEspAlta - 1.0) * 0.018;

      mallas[`espaldaMedia${lado}`].scale.multiply(new THREE.Vector3(fEspMedia * morfoTorax, fEspMedia, fEspMedia));
      mallas[`espaldaMedia${lado}`].position.x += s * (fEspMedia - 1.0) * 0.016;
      mallas[`espaldaMedia${lado}`].position.z -= (fEspMedia - 1.0) * 0.018;

      mallas[`espaldaBaja${lado}`].scale.multiply(new THREE.Vector3(fEspBaja, fEspBaja, fEspBaja));
      mallas[`espaldaBaja${lado}`].position.z -= (fEspBaja - 1.0) * 0.022;

      mallas[`caderaGluteoGrasa${lado}`].scale.multiply(new THREE.Vector3(fCadera, fCadera, fCadera));
      mallas[`caderaGluteoGrasa${lado}`].position.x += s * (fCadera - 1.0) * 0.018;
      mallas[`caderaGluteoGrasa${lado}`].position.z -= (fCadera - 1.0) * 0.024;
      mallas[`caderaGluteoGrasa${lado}`].position.y += movSecciones * 0.75;
    });

    // Extremidades Superiores e Inferiores completas
    const fSupIzqFinal = fSegSupIzq * fPlicTricipital * (0.82 + 0.18 * fBaseMuscular);
    const fSupDerFinal = fSegSupDer * fPlicTricipital * (0.82 + 0.18 * fBaseMuscular);
    mallas.hombroGrasaIzq.scale.multiply(new THREE.Vector3(fSupIzqFinal, 1.0, fSupIzqFinal));
    mallas.brazoGrasaIzq.scale.multiply(new THREE.Vector3(fSupIzqFinal, 1.0, fSupIzqFinal));
    mallas.antebrazoGrasaIzq.scale.multiply(new THREE.Vector3(fSupIzqFinal * 0.92, 1.0, fSupIzqFinal * 0.92));
    mallas.hombroGrasaDer.scale.multiply(new THREE.Vector3(fSupDerFinal, 1.0, fSupDerFinal));
    mallas.brazoGrasaDer.scale.multiply(new THREE.Vector3(fSupDerFinal, 1.0, fSupDerFinal));
    mallas.antebrazoGrasaDer.scale.multiply(new THREE.Vector3(fSupDerFinal * 0.92, 1.0, fSupDerFinal * 0.92));

    const fInfIzqFinal = fSegInfIzq * fPlicMuslo * (0.82 + 0.18 * fBaseMuscular);
    const fInfDerFinal = fSegInfDer * fPlicMuslo * (0.82 + 0.18 * fBaseMuscular);
    mallas.musloGrasaIzq.scale.multiply(new THREE.Vector3(fInfIzqFinal, 1.0, fInfIzqFinal));
    mallas.pantorrillaGrasaIzq.scale.multiply(new THREE.Vector3(fInfIzqFinal * 0.88, 1.0, fInfIzqFinal * 0.88));
    mallas.musloGrasaDer.scale.multiply(new THREE.Vector3(fInfDerFinal, 1.0, fInfDerFinal));
    mallas.pantorrillaGrasaDer.scale.multiply(new THREE.Vector3(fInfDerFinal * 0.88, 1.0, fInfDerFinal * 0.88));

    estadoVolumetrico.fGlobal = fGlobal;
    estadoVolumetrico.fCara = fCara;
    estadoVolumetrico.fCuello = fCuelloTotal;
    estadoVolumetrico.fPecho = fPecho;
    estadoVolumetrico.fCintura = fAbdomenFinal;
    estadoVolumetrico.fCostados = fCostados;
    estadoVolumetrico.fCadera = fCadera;
    estadoVolumetrico.fEspalda = (fEspAlta + fEspMedia + fEspBaja) / 3;
    estadoVolumetrico.fSupDer = fSupDerFinal;
    estadoVolumetrico.fSupIzq = fSupIzqFinal;
    estadoVolumetrico.fInfDer = fInfDerFinal;
    estadoVolumetrico.fInfIzq = fInfIzqFinal;
    estadoVolumetrico.desplazamientoY = movSecciones;
  }

  // ==========================================================================
  // [BLOQUE 5] CARGADOR .GLB DE TEJIDO ADIPOSO Y EXPORTACIÓN PÚBLICA
  // Función: Permite cargar una malla .glb de tejido adiposo y retorna la API.
  // ==========================================================================
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
              obj.material = materialGrasa;
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
    estadoVolumetrico,
    applyAnatomyState,
    actualizar: applyAnatomyState,
    cargarModeloGLB
  };
}