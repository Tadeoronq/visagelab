// ============================================================================
// VISAGELAB - CAPA 1: MOTOR DE DEFORMACIÓN ANATÓMICA UNIFICADO (applyAnatomyState)
// ============================================================================

// ============================================================================
// [BLOQUE 1] IMPORTACIONES DIRECTAS, TEXTURA PBR Y GEOMETRÍA BASE
// Función: Importa Three.js y GLTFLoader con URL completa para evitar fallos
// de resolución en localhost, genera la textura de porosidad ósea y define los
// constructores geométricos de huesos largos y vértebras.
// ============================================================================
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.158.0/build/three.module.js";
import { GLTFLoader } from "https://cdn.jsdelivr.net/npm/three@0.158.0/examples/jsm/loaders/GLTFLoader.js";

function crearTexturaPorosidadOsea() {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#efe8d8";
  ctx.fillRect(0, 0, 256, 256);

  for (let i = 0; i < 2800; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const r = 0.4 + Math.random() * 1.3;
    ctx.fillStyle = Math.random() > 0.48
      ? "rgba(176, 162, 138, 0.24)"
      : "rgba(255, 252, 245, 0.30)";
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 4);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function crearDiafisis(rExtremos, rCentro, largo, segRadial = 24, segCurva = 18) {
  const puntos = [
    new THREE.Vector2(0.001, -largo * 0.5),
    new THREE.Vector2(rExtremos * 1.18, -largo * 0.43),
    new THREE.Vector2(rExtremos, -largo * 0.32),
    new THREE.Vector2(rCentro, 0),
    new THREE.Vector2(rExtremos, largo * 0.32),
    new THREE.Vector2(rExtremos * 1.18, largo * 0.43),
    new THREE.Vector2(0.001, largo * 0.5)
  ];
  const curva = new THREE.SplineCurve(puntos);
  const geo = new THREE.LatheGeometry(curva.getPoints(segCurva), segRadial);
  geo.computeVertexNormals();
  return geo;
}

function crearVertebra(radioCuerpo, altura, matHueso, matDisco) {
  const g = new THREE.Group();
  const cuerpo = new THREE.Mesh(
    new THREE.CylinderGeometry(radioCuerpo * 0.96, radioCuerpo, altura * 0.76, 18),
    matHueso
  );
  cuerpo.scale.set(1.12, 1, 0.92);
  cuerpo.castShadow = true;
  cuerpo.receiveShadow = true;

  const disco = new THREE.Mesh(
    new THREE.CylinderGeometry(radioCuerpo * 0.98, radioCuerpo * 0.98, altura * 0.24, 18),
    matDisco
  );
  disco.scale.set(1.12, 1, 0.92);
  disco.position.y = altura * 0.5;

  const espinosa = new THREE.Mesh(
    new THREE.BoxGeometry(radioCuerpo * 0.24, altura * 0.55, radioCuerpo * 1.15),
    matHueso
  );
  espinosa.position.set(0, -altura * 0.05, -radioCuerpo * 1.15);
  espinosa.rotation.x = 0.28;
  espinosa.castShadow = true;

  const transversa = new THREE.Mesh(
    new THREE.BoxGeometry(radioCuerpo * 2.5, altura * 0.26, radioCuerpo * 0.28),
    matHueso
  );
  transversa.position.set(0, 0, -radioCuerpo * 0.65);

  g.add(cuerpo, disco, espinosa, transversa);
  return g;
}
// ============================================================================
// [BLOQUE 2] DISTRIBUCIÓN SUAVE NO LINEAL Y LÍMITES CLÍNICOS (CLAMPING)
// Función: Define los límites seguros por parámetro, los factores de
// calibración clínica y las curvas matemáticas (campana gaussiana y onda
// compensada de escoliosis) para evitar quiebres o bisagras rígidas.
// ============================================================================
const CLAMP_LIMITS = {
  estaturaCm: [140, 210],
  cifosisDeg: [-15, 45],
  hiperlordosisDeg: [-15, 45],
  escoliosisToracicaDeg: [-35, 35],
  escoliosisLumbarDeg: [-35, 35],
  antepulsionCuelloCm: [-3, 14],
  craneoPitchDeg: [-35, 35],
  craneoYawDeg: [-50, 50],
  craneoRollDeg: [-30, 30],
  hombrosAdelantadosDeg: [-10, 35],
  escapulasAladasDeg: [0, 30],
  asimetriaHombrosCm: [-6, 6],
  morfologiaTorax: [0.78, 1.28],
  anteversionPelvicaDeg: [-20, 30],
  basculacionPelvicaDeg: [-15, 15]
};

function acotar(valor, min, max) {
  return THREE.MathUtils.clamp(Number.isFinite(valor) ? valor : 0, min, max);
}

// Curva en campana gaussiana normalizada: concentra la curvatura sagital en el ápex
function obtenerPesosCampana(numHuesos, apexNorm = 0.5, sigma = 0.28) {
  const pesos = [];
  let suma = 0;
  for (let i = 0; i < numHuesos; i++) {
    const t = numHuesos > 1 ? i / (numHuesos - 1) : 0.5;
    const d = (t - apexNorm) / sigma;
    const w = Math.exp(-0.5 * d * d);
    pesos.push(w);
    suma += w;
  }
  return pesos.map((w) => w / (suma || 1));
}

// Onda sinusoidal compensada para escoliosis: el tramo nace inclinándose,
// alcanza el ápex lateral en el centro del segmento y regresa a la vertical arriba
function obtenerPesosArcoEscoliosis(numHuesos) {
  const pesos = [];
  for (let i = 0; i < numHuesos; i++) {
    const t = numHuesos > 1 ? i / (numHuesos - 1) : 0.5;
    // Derivada de campana senoidal: positiva en la mitad inferior, negativa en la superior
    const w = Math.cos(t * Math.PI) * Math.sin(t * Math.PI);
    pesos.push(w);
  }
  return pesos;
}
// ============================================================================
// [BLOQUE 3] ARMATURE JERÁRQUICO, POSE NEUTRA (restPose) Y MALLAS ÓSEAS
// Función: Construye la cadena cinemática padre-hijo, añade las mallas óseas
// con curva anatómica base fisiológica y guarda la restPose inmutable de cada
// hueso para resetear antes de cada actualización.
// ============================================================================
export function crearCapaEsqueleto(opciones = {}) {
  const group = new THREE.Group();
  group.name = "CapaEsqueleto";

  const texturaHueso = crearTexturaPorosidadOsea();

  const materialHueso = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color("#f3ede0"),
    map: texturaHueso,
    bumpMap: texturaHueso,
    bumpScale: 0.003,
    roughness: 0.42,
    metalness: 0.02,
    clearcoat: 0.14,
    clearcoatRoughness: 0.52
  });

  const materialArticulacion = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color("#dfd5c0"),
    map: texturaHueso,
    bumpMap: texturaHueso,
    bumpScale: 0.002,
    roughness: 0.50,
    metalness: 0.01
  });

  const materialCartilago = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color("#c9d2d8"),
    roughness: 0.36,
    metalness: 0.01
  });

  function malla(geo, mat = materialHueso) {
    const m = new THREE.Mesh(geo, mat);
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  }

  const armatureRaiz = new THREE.Group();
  armatureRaiz.name = "Armature_VisageLab";
  group.add(armatureRaiz);

  const contenedorGlb = new THREE.Group();
  contenedorGlb.name = "EsqueletoGLB";
  contenedorGlb.visible = false;
  group.add(contenedorGlb);

  const huesos = {};
  const restPose = {};

  function crearHueso(nombre, padre, posLocal = [0, 0, 0], rotLocal = [0, 0, 0]) {
    const h = new THREE.Object3D();
    h.name = nombre;
    h.position.set(...posLocal);
    h.rotation.set(...rotLocal);
    padre.add(h);
    huesos[nombre] = h;
    // Registro inmutable de la Pose Neutra (T-Pose / A-Pose en 0°)
    restPose[nombre] = {
      position: h.position.clone(),
      rotation: h.rotation.clone(),
      scale: h.scale.clone()
    };
    return h;
  }

  // Raíz pélvica
  const hPelvis = crearHueso("Pelvis", armatureRaiz, [0, 0.86, 0]);

  // Tramo Lumbar: L5 a L1 (con ligera lordosis fisiológica base en restPose)
  const hLumbares = [];
  let padreActual = hPelvis;
  for (let i = 5; i >= 1; i--) {
    const yStep = i === 5 ? 0.044 : 0.035;
    const zStep = i === 5 ? -0.018 : 0.002;
    const rotBaseX = -0.025; // Lordosis fisiológica neutra
    const hL = crearHueso(`L${i}`, padreActual, [0, yStep, zStep], [rotBaseX, 0, 0]);
    hLumbares.push(hL);
    padreActual = hL;
  }

  // Tramo Dorsal/Torácico: T12 a T1 (con ligera cifosis fisiológica base en restPose)
  const hDorsales = [];
  for (let i = 12; i >= 1; i--) {
    const rotBaseX = 0.018; // Cifosis fisiológica neutra
    const hT = crearHueso(`T${i}`, padreActual, [0, 0.025, 0], [rotBaseX, 0, 0]);
    hDorsales.push(hT);
    padreActual = hT;
  }

  const hTorax = crearHueso("Torax_Centro", huesos["T6"], [0, 0, 0.022]);

  // Tramo Cervical: C7 a C1 + Head
  const hCervicales = [];
  for (let i = 7; i >= 1; i--) {
    const rotBaseX = -0.015;
    const hC = crearHueso(`C${i}`, padreActual, [0, 0.017, 0.001], [rotBaseX, 0, 0]);
    hCervicales.push(hC);
    padreActual = hC;
  }
  const hCraneo = crearHueso("Head", padreActual, [0, 0.042, 0.012], [0.02, 0, 0]);

  // Cintura escapular y extremidades superiores
  function construirCadenaBrazo(lado) {
    const s = lado === "L" ? -1 : 1;
    const hClavicula = crearHueso(`Clavicle.${lado}`, huesos["T2"], [s * 0.024, 0.012, 0.044]);
    const hEscapula = crearHueso(`Scapula.${lado}`, huesos["T4"], [s * 0.068, 0.014, -0.040]);
    const hHombro = crearHueso(`UpperArm.${lado}`, hClavicula, [s * 0.165, -0.008, -0.020], [0, 0, -s * 0.16]);
    const hCodo = crearHueso(`Forearm.${lado}`, hHombro, [0, -0.28, 0], [-0.06, 0, -s * 0.04]);
    const hMuneca = crearHueso(`Hand.${lado}`, hCodo, [0, -0.25, 0]);
    return { hClavicula, hEscapula, hHombro, hCodo, hMuneca };
  }
  const cadBrazoIzq = construirCadenaBrazo("L");
  const cadBrazoDer = construirCadenaBrazo("R");

  // Extremidades inferiores
  function construirCadenaPierna(lado) {
    const s = lado === "L" ? -1 : 1;
    const hCadera = crearHueso(`Thigh.${lado}`, hPelvis, [s * 0.098, -0.015, 0.005]);
    const hRodilla = crearHueso(`Shin.${lado}`, hCadera, [0, -0.41, 0.008]);
    const hTobillo = crearHueso(`Foot.${lado}`, hRodilla, [0, -0.40, -0.005]);
    return { hCadera, hRodilla, hTobillo };
  }
  const cadPiernaIzq = construirCadenaPierna("L");
  const cadPiernaDer = construirCadenaPierna("R");

  // Vestido geométrico de Pelvis
  const mallaPelvis = new THREE.Group();
  const sacro = malla(crearDiafisis(0.032, 0.020, 0.11));
  sacro.position.set(0, -0.01, -0.042);
  sacro.rotation.x = -0.22;
  const cinturaPelvica = malla(new THREE.TorusGeometry(0.098, 0.021, 14, 32, Math.PI * 1.38));
  cinturaPelvica.rotation.x = Math.PI * 0.46;
  cinturaPelvica.rotation.z = -Math.PI * 0.19;
  cinturaPelvica.scale.set(1.16, 0.84, 1.06);
  mallaPelvis.add(sacro, cinturaPelvica);
  hPelvis.add(mallaPelvis);

  // Vestido de las 24 Vértebras
  hLumbares.forEach((hL, idx) => hL.add(crearVertebra(0.021 - idx * 0.0006, 0.030, materialHueso, materialCartilago)));
  hDorsales.forEach((hT, idx) => hT.add(crearVertebra(0.018 - idx * 0.0004, 0.022, materialHueso, materialCartilago)));
  hCervicales.forEach((hC, idx) => hC.add(crearVertebra(0.013 - idx * 0.0003, 0.014, materialHueso, materialCartilago)));

  // Vestido de Caja Torácica
  const cajaToracicaGrupo = new THREE.Group();
  const esternon = malla(crearDiafisis(0.016, 0.013, 0.175));
  esternon.position.set(0, 0.005, 0.096);
  esternon.rotation.x = -0.12;
  cajaToracicaGrupo.add(esternon);

  const costillasMallas = [];
  for (let i = 0; i < 10; i++) {
    const t = i / 9;
    const radioBase = THREE.MathUtils.lerp(0.072, 0.128, Math.sin(t * Math.PI * 0.82));
    const arco = i < 7 ? Math.PI * 1.58 : Math.PI * 1.25;
    const costilla = malla(new THREE.TorusGeometry(radioBase, 0.0055, 10, 32, arco), i >= 6 ? materialCartilago : materialHueso);
    costilla.rotation.x = Math.PI * 0.49;
    costilla.rotation.z = Math.PI * 0.5 - arco * 0.5 + Math.PI;
    costilla.position.set(0, 0.115 - i * 0.024, 0.002);
    costilla.userData.indice = i;
    cajaToracicaGrupo.add(costilla);
    costillasMallas.push(costilla);
  }
  hTorax.add(cajaToracicaGrupo);

  // Vestido de Cráneo y Mandíbula
  const mallaCraneo = new THREE.Group();
  const boveda = malla(new THREE.SphereGeometry(0.092, 32, 26));
  boveda.scale.set(0.85, 1.08, 1.04);
  boveda.position.set(0, 0.032, -0.006);
  const maxilar = malla(new THREE.CylinderGeometry(0.044, 0.036, 0.042, 20));
  maxilar.scale.set(1.05, 1, 1.15);
  maxilar.position.set(0, -0.018, 0.042);
  const mandibula = malla(new THREE.SphereGeometry(0.056, 24, 20));
  mandibula.scale.set(0.76, 0.52, 0.94);
  mandibula.position.set(0, -0.048, 0.032);
  mallaCraneo.add(boveda, maxilar, mandibula);
  hCraneo.add(mallaCraneo);

  // Vestido de Brazos y Piernas
  function vestirBrazo(cad, lado) {
    const s = lado === "L" ? -1 : 1;
    const clavicula = malla(crearDiafisis(0.010, 0.007, 0.165));
    clavicula.rotation.z = s * (Math.PI * 0.47);
    clavicula.position.set(s * 0.082, -0.004, -0.011);
    cad.hClavicula.add(clavicula);

    const escapula = malla(new THREE.ConeGeometry(0.046, 0.115, 3));
    escapula.scale.set(1.0, 1.0, 0.24);
    escapula.rotation.x = Math.PI + 0.12;
    escapula.rotation.y = s * 0.28;
    escapula.position.set(s * 0.022, -0.042, -0.012);
    cad.hEscapula.add(escapula);

    const humero = malla(crearDiafisis(0.020, 0.015, 0.28));
    humero.position.set(0, -0.14, 0);
    cad.hHombro.add(malla(new THREE.SphereGeometry(0.023, 18, 16), materialArticulacion), humero);

    const antebrazo = malla(crearDiafisis(0.016, 0.012, 0.25));
    antebrazo.position.set(0, -0.125, 0);
    cad.hCodo.add(malla(new THREE.SphereGeometry(0.017, 16, 14), materialArticulacion), antebrazo);

    const mano = malla(new THREE.BoxGeometry(0.018, 0.080, 0.054));
    mano.position.set(0, -0.042, 0);
    cad.hMuneca.add(malla(new THREE.SphereGeometry(0.013, 14, 12), materialArticulacion), mano);
  }
  vestirBrazo(cadBrazoIzq, "L");
  vestirBrazo(cadBrazoDer, "R");

  function vestirPierna(cad) {
    const femur = malla(crearDiafisis(0.027, 0.021, 0.41));
    femur.position.set(0, -0.205, 0.005);
    cad.hCadera.add(malla(new THREE.SphereGeometry(0.028, 18, 16), materialArticulacion), femur);

    const tibia = malla(crearDiafisis(0.022, 0.016, 0.40));
    tibia.position.set(0, -0.20, -0.003);
    cad.hRodilla.add(malla(new THREE.SphereGeometry(0.023, 18, 16), materialArticulacion), tibia);

    const pie = malla(new THREE.BoxGeometry(0.056, 0.030, 0.180));
    pie.position.set(0, -0.022, 0.042);
    cad.hTobillo.add(malla(new THREE.SphereGeometry(0.017, 14, 12), materialArticulacion), pie);
  }
  vestirPierna(cadPiernaIzq);
  vestirPierna(cadPiernaDer);
  // ============================================================================
// [BLOQUE 4] RESET A POSE NEUTRA (restPose) Y ANCLAJES MUNDIALES
// Función: Restaura todos los huesos a su estado neutro inicial antes de cada
// cálculo para impedir derivas acumulativas y expone las coordenadas mundiales
// para las Capas 2, 3, 4 y 6.
// ============================================================================
  const anclajes = {};
  const nodosAncla = {
    pelvis: hPelvis,
    torax: hTorax,
    cuello: huesos["C4"],
    craneo: hCraneo,
    hombroIzq: cadBrazoIzq.hHombro,
    codoIzq: cadBrazoIzq.hCodo,
    munecaIzq: cadBrazoIzq.hMuneca,
    hombroDer: cadBrazoDer.hHombro,
    codoDer: cadBrazoDer.hCodo,
    munecaDer: cadBrazoDer.hMuneca,
    caderaIzq: cadPiernaIzq.hCadera,
    rodillaIzq: cadPiernaIzq.hRodilla,
    tobilloIzq: cadPiernaIzq.hTobillo,
    caderaDer: cadPiernaDer.hCadera,
    rodillaDer: cadPiernaDer.hRodilla,
    tobilloDer: cadPiernaDer.hTobillo
  };

  Object.keys(nodosAncla).forEach((clave) => {
    const v = new THREE.Vector3();
    v.quat = new THREE.Quaternion();
    anclajes[clave] = v;
  });

  let ultimoParams = {};
  let skinnedMeshGlb = null;
  let huesosGlbMap = {};
  let restPoseGlb = {};

  function resetToRestPose() {
    Object.entries(huesos).forEach(([nombre, h]) => {
      const base = restPose[nombre];
      if (base) {
        h.position.copy(base.position);
        h.rotation.copy(base.rotation);
        h.scale.copy(base.scale);
      }
    });
    Object.entries(huesosGlbMap).forEach(([nombre, hGlb]) => {
      const baseGlb = restPoseGlb[nombre];
      if (baseGlb) {
        hGlb.position.copy(baseGlb.position);
        hGlb.rotation.copy(baseGlb.rotation);
        hGlb.scale.copy(baseGlb.scale);
      }
    });
  }

  function sincronizarAnclajes() {
    group.updateMatrixWorld(true);
    Object.entries(nodosAncla).forEach(([clave, nodo]) => {
      nodo.getWorldPosition(anclajes[clave]);
      nodo.getWorldQuaternion(anclajes[clave].quat);
    });
  }

  // Pesos precalculados de distribución suave para columna lumbar (5), dorsal (12) y cervical (7)
  const pesosCampanaLumbar = obtenerPesosCampana(5, 0.5, 0.32);
  const pesosCampanaDorsal = obtenerPesosCampana(12, 0.55, 0.30);
  const pesosArcoLumbar = obtenerPesosArcoEscoliosis(5);
  const pesosArcoDorsal = obtenerPesosArcoEscoliosis(12);
  // ============================================================================
// [BLOQUE 5] MOTOR UNIFICADO applyAnatomyState(state)
// Función: Único punto de entrada que (1) resetea a restPose, (2) valida y
// acota el estado clínico, (3) aplica curvas suaves no lineales por segmento
// anatómico y (4) actualiza matrices y anclajes para las capas superiores.
// ============================================================================
  function applyAnatomyState(state = {}) {
    ultimoParams = { ...ultimoParams, ...state };

    // 1. Resetear todos los huesos a su postura neutra inicial
    resetToRestPose();

    // 2. Validar y acotar (clamping) cada parámetro clínico
    const estaturaCm = acotar(ultimoParams.estaturaCm ?? 175, ...CLAMP_LIMITS.estaturaCm);
    const escalaAltura = estaturaCm / 175;
    const anchoHombros = acotar(ultimoParams.anchoHombros ?? 1.0, 0.75, 1.35);
    const anchoCadera = acotar(ultimoParams.anchoCadera ?? 1.0, 0.75, 1.35);

    const cifosisDeg = acotar(ultimoParams.cifosisDeg ?? 0, ...CLAMP_LIMITS.cifosisDeg);
    const hiperlordosisDeg = acotar(ultimoParams.hiperlordosisDeg ?? 0, ...CLAMP_LIMITS.hiperlordosisDeg);
    const escoliosisToracicaDeg = acotar(
      ultimoParams.escoliosisToracicaDeg ?? ultimoParams.escoliosisDeg ?? 0,
      ...CLAMP_LIMITS.escoliosisToracicaDeg
    );
    const escoliosisLumbarDeg = acotar(ultimoParams.escoliosisLumbarDeg ?? 0, ...CLAMP_LIMITS.escoliosisLumbarDeg);

    const antepulsionCuelloCm = acotar(ultimoParams.antepulsionCuelloCm ?? 0, ...CLAMP_LIMITS.antepulsionCuelloCm);
    const craneoPitchDeg = acotar(ultimoParams.craneoPitchDeg ?? 0, ...CLAMP_LIMITS.craneoPitchDeg);
    const craneoYawDeg = acotar(ultimoParams.craneoYawDeg ?? 0, ...CLAMP_LIMITS.craneoYawDeg);
    const craneoRollDeg = acotar(ultimoParams.craneoRollDeg ?? 0, ...CLAMP_LIMITS.craneoRollDeg);

    const hombrosAdelantadosDeg = acotar(ultimoParams.hombrosAdelantadosDeg ?? 0, ...CLAMP_LIMITS.hombrosAdelantadosDeg);
    const escapulasAladasDeg = acotar(ultimoParams.escapulasAladasDeg ?? 0, ...CLAMP_LIMITS.escapulasAladasDeg);
    const asimetriaHombrosCm = acotar(ultimoParams.asimetriaHombrosCm ?? 0, ...CLAMP_LIMITS.asimetriaHombrosCm);
    const morfologiaTorax = acotar(ultimoParams.morfologiaTorax ?? 1.0, ...CLAMP_LIMITS.morfologiaTorax);

    const anteversionPelvicaDeg = acotar(ultimoParams.anteversionPelvicaDeg ?? 0, ...CLAMP_LIMITS.anteversionPelvicaDeg);
    const basculacionPelvicaDeg = acotar(ultimoParams.basculacionPelvicaDeg ?? 0, ...CLAMP_LIMITS.basculacionPelvicaDeg);

    armatureRaiz.scale.setScalar(escalaAltura);

    // 3A. Pelvis y Cadera (Anteversión/Retroversión y Basculación Lateral)
    const antevRad = THREE.MathUtils.degToRad(anteversionPelvicaDeg) * 0.85;
    const bascRad = THREE.MathUtils.degToRad(basculacionPelvicaDeg) * 0.85;
    hPelvis.rotation.x += antevRad;
    hPelvis.rotation.z -= bascRad;
    mallaPelvis.scale.set(anchoCadera, 1, anchoCadera);

    // Compensación articular en caderas para que las piernas no se crucen ni despeguen del piso
    cadPiernaIzq.hCadera.position.x = -0.098 * anchoCadera;
    cadPiernaDer.hCadera.position.x = 0.098 * anchoCadera;
    cadPiernaIzq.hCadera.rotation.x -= antevRad;
    cadPiernaDer.hCadera.rotation.x -= antevRad;
    cadPiernaIzq.hCadera.rotation.z += bascRad;
    cadPiernaDer.hCadera.rotation.z += bascRad;

    // 3B. Columna Lumbar L5..L1 (Distribución Gaussiana + Arco Compensado de Escoliosis)
    const lordTotalRad = THREE.MathUtils.degToRad(-hiperlordosisDeg) * 0.95;
    const escLumRad = THREE.MathUtils.degToRad(-escoliosisLumbarDeg) * 0.75;
    let acumSagital = antevRad;
    let acumFrontal = -bascRad;

    hLumbares.forEach((hL, i) => {
      // Compensación suave de la anteversión y basculación pélvica en las lumbares
      const wCampana = pesosCampanaLumbar[i];
      const wArco = pesosArcoLumbar[i];
      const deltaX = lordTotalRad * wCampana - antevRad * wCampana * 0.65;
      const deltaZ = escLumRad * wArco + bascRad * wCampana * 0.60;

      hL.rotation.x += deltaX;
      hL.rotation.z += deltaZ;
      // Leve rotación axial acoplada a la escoliosis (ley de Fryette)
      hL.rotation.y += deltaZ * 0.25;

      acumSagital += hL.rotation.x;
      acumFrontal += hL.rotation.z;
    });

    // 3C. Columna Dorsal T12..T1 (Distribución Gaussiana + Arco en C/S Torácico)
    const cifoTotalRad = THREE.MathUtils.degToRad(cifosisDeg) * 0.95;
    const escTorRad = THREE.MathUtils.degToRad(-escoliosisToracicaDeg) * 0.80;

    hDorsales.forEach((hT, i) => {
      const wCampana = pesosCampanaDorsal[i];
      const wArco = pesosArcoDorsal[i];
      const deltaX = cifoTotalRad * wCampana;
      const deltaZ = escTorRad * wArco;

      hT.rotation.x += deltaX;
      hT.rotation.z += deltaZ;
      hT.rotation.y += deltaZ * 0.30;

      acumSagital += hT.rotation.x;
      acumFrontal += hT.rotation.z;
    });

    // 3D. Morfología de Caja Torácica (Shape Key / Escala Subcostal)
    cajaToracicaGrupo.scale.set(
      anchoHombros * morfologiaTorax,
      1.0,
      0.92 + (morfologiaTorax - 1.0) * 0.85
    );
    costillasMallas.forEach((c) => {
      const idx = c.userData.indice;
      const factorSubcostal = 1 + (morfologiaTorax - 1.0) * (0.25 + idx * 0.07);
      c.scale.set(factorSubcostal, 0.82, 1.0);
    });

    // 3E. Cuello C7..C1 y Cráneo (Antepulsión + Enderezamiento Óptico + Pitch/Yaw/Roll)
    const antepM = (antepulsionCuelloCm / 100) / escalaAltura;
    const flexCervicalRad = Math.atan2(antepM, 0.12);

    hCervicales.forEach((hC, i) => {
      const t = i / (hCervicales.length - 1);
      // C7-C4 flexionan hacia adelante; C3-C1 extienden para nivelar la vista
      const perfilS = (1 - t * 1.65) * (flexCervicalRad / hCervicales.length);
      hC.position.z += antepM / hCervicales.length;
      hC.rotation.x += perfilS - (acumSagital * 0.08);
      hC.rotation.z -= acumFrontal * 0.08;
    });

    hCraneo.rotation.x += THREE.MathUtils.degToRad(craneoPitchDeg) - acumSagital * 0.35;
    hCraneo.rotation.y += THREE.MathUtils.degToRad(craneoYawDeg);
    hCraneo.rotation.z += THREE.MathUtils.degToRad(craneoRollDeg) - acumFrontal * 0.35;

    // 3F. Cintura Escapular (Hombros Adelantados, Escápulas Aladas y Asimetría)
    const protraccionRad = THREE.MathUtils.degToRad(hombrosAdelantadosDeg);
    const aladaRad = THREE.MathUtils.degToRad(escapulasAladasDeg);
    const asimM = (asimetriaHombrosCm / 100) / escalaAltura;

    function aplicarCinturaEscapular(cad, lado) {
      const s = lado === "L" ? -1 : 1;
      const deltaY = s * (asimM * 0.5);

      cad.hClavicula.position.y += deltaY;
      cad.hClavicula.rotation.y += -s * protraccionRad * 0.72;
      cad.hClavicula.rotation.z += s * (deltaY * 3.8);

      cad.hEscapula.position.y += deltaY;
      cad.hEscapula.rotation.x += aladaRad * 0.35;
      cad.hEscapula.rotation.y += -s * (aladaRad + protraccionRad * 0.32);

      cad.hHombro.position.x = s * 0.165 * anchoHombros;
      cad.hHombro.rotation.x += protraccionRad * 0.55;
      cad.hHombro.rotation.y += s * protraccionRad * 0.40;
    }
    aplicarCinturaEscapular(cadBrazoIzq, "L");
    aplicarCinturaEscapular(cadBrazoDer, "R");

    // 4. Sincronizar con rig GLB externo si está cargado
    if (contenedorGlb.visible) {
      contenedorGlb.scale.setScalar(escalaAltura);
      Object.entries(huesos).forEach(([nombre, hVirtual]) => {
        const hGlb = huesosGlbMap[nombre];
        const baseVirtual = restPose[nombre];
        const baseGlb = restPoseGlb[nombre];
        if (hGlb && baseVirtual && baseGlb) {
          hGlb.rotation.set(
            baseGlb.rotation.x + (hVirtual.rotation.x - baseVirtual.rotation.x),
            baseGlb.rotation.y + (hVirtual.rotation.y - baseVirtual.rotation.y),
            baseGlb.rotation.z + (hVirtual.rotation.z - baseVirtual.rotation.z)
          );
        }
      });
      if (skinnedMeshGlb?.morphTargetDictionary && skinnedMeshGlb?.morphTargetInfluences) {
        const idxTorax = skinnedMeshGlb.morphTargetDictionary["Ribcage_Width"];
        if (idxTorax !== undefined) {
          skinnedMeshGlb.morphTargetInfluences[idxTorax] = THREE.MathUtils.clamp(
            (morfologiaTorax - 0.78) / 0.50,
            0,
            1
          );
        }
      }
    }

    // 5. Actualizar matrices mundiales y puntos de anclaje
    sincronizarAnclajes();
  }
  // ============================================================================
// [BLOQUE 6] CARGADOR .GLB CON CAPTURA DE POSE NEUTRA Y EXPORTACIÓN
// Función: Importa un modelo .glb, registra la restPose original de sus huesos,
// activa sus Morph Targets y exporta applyAnatomyState y actualizar.
// ============================================================================
  function cargarModeloGLB(url) {
    if (!url) return Promise.resolve(false);
    const loader = new GLTFLoader();
    return new Promise((resolve, reject) => {
      loader.load(
        url,
        (gltf) => {
          contenedorGlb.clear();
          huesosGlbMap = {};
          restPoseGlb = {};
          skinnedMeshGlb = null;

          gltf.scene.traverse((obj) => {
            if (obj.isBone) {
              huesosGlbMap[obj.name] = obj;
              restPoseGlb[obj.name] = {
                position: obj.position.clone(),
                rotation: obj.rotation.clone(),
                scale: obj.scale.clone()
              };
            }
            if (obj.isMesh) {
              obj.castShadow = true;
              obj.receiveShadow = true;
              obj.material = materialHueso;
              if (obj.isSkinnedMesh && !skinnedMeshGlb) {
                skinnedMeshGlb = obj;
              }
            }
          });

          contenedorGlb.add(gltf.scene);
          armatureRaiz.visible = false;
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
      armatureRaiz.visible = true;
      contenedorGlb.visible = false;
    });
  }

  applyAnatomyState();

  return {
    group,
    anclajes,
    huesos,
    restPose,
    applyAnatomyState,
    actualizar: applyAnatomyState,
    cargarModeloGLB
  };
}