// ============================================================================
// VISAGELAB - CAPA 1: SISTEMA ESQUELÉTICO (BRAZOS SEPARADOS Y applyAnatomyState)
// ============================================================================

// ============================================================================
// [BLOQUE 1] IMPORTACIONES DIRECTAS, TEXTURA PBR Y GEOMETRÍA BASE
// Función: Importa Three.js y GLTFLoader, genera la textura de porosidad ósea
// cortical en canvas 2D y define los constructores de diáfisis, vértebras,
// manos y pies articulados.
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
// Función: Define los límites seguros por parámetro y las curvas matemáticas
// (campana gaussiana y arco compensado de escoliosis) para deformar la columna
// con naturalidad.
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

function obtenerPesosArcoEscoliosis(numHuesos) {
  const pesos = [];
  for (let i = 0; i < numHuesos; i++) {
    const t = numHuesos > 1 ? i / (numHuesos - 1) : 0.5;
    const w = Math.cos(t * Math.PI) * Math.sin(t * Math.PI);
    pesos.push(w);
  }
  return pesos;
}

// ============================================================================
// [BLOQUE 3] ARMATURE JERÁRQUICO, POSE EN "A" ABIERTA HACIA AFUERA Y MALLAS ÓSEAS
// Función: Construye el árbol cinemático aplicando rotación Z con signo positivo
// (+s * 0.42 en hombro y +s * 0.18 en codo) para que los brazos y manos que
// cuelgan en -Y se abran ampliamente hacia afuera del cuerpo sin tocar el torso
// ni los muslos, registrando su restPose inmutable.
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
    restPose[nombre] = {
      position: h.position.clone(),
      rotation: h.rotation.clone(),
      scale: h.scale.clone()
    };
    return h;
  }

  const hPelvis = crearHueso("Pelvis", armatureRaiz, [0, 0.86, 0]);

  const hLumbares = [];
  let padreActual = hPelvis;
  for (let i = 5; i >= 1; i--) {
    const yStep = i === 5 ? 0.044 : 0.035;
    const zStep = i === 5 ? -0.018 : 0.002;
    const hL = crearHueso(`L${i}`, padreActual, [0, yStep, zStep], [-0.025, 0, 0]);
    hLumbares.push(hL);
    padreActual = hL;
  }

  const hDorsales = [];
  for (let i = 12; i >= 1; i--) {
    const hT = crearHueso(`T${i}`, padreActual, [0, 0.025, 0], [0.018, 0, 0]);
    hDorsales.push(hT);
    padreActual = hT;
  }

  const hTorax = crearHueso("Torax_Centro", huesos["T6"], [0, 0, 0.022]);

  const hCervicales = [];
  for (let i = 7; i >= 1; i--) {
    const hC = crearHueso(`C${i}`, padreActual, [0, 0.017, 0.001], [-0.015, 0, 0]);
    hCervicales.push(hC);
    padreActual = hC;
  }
  const hCraneo = crearHueso("Head", padreActual, [0, 0.042, 0.012], [0.02, 0, 0]);

  // Brazos abiertos hacia afuera: signo POSITIVO (+s) en rotation.z aleja el brazo del cuerpo
  function construirCadenaBrazo(lado) {
    const s = lado === "L" ? -1 : 1;
    const hClavicula = crearHueso(`Clavicle.${lado}`, huesos["T2"], [s * 0.028, 0.012, 0.044]);
    const hEscapula = crearHueso(`Scapula.${lado}`, huesos["T4"], [s * 0.075, 0.014, -0.040]);
    const hHombro = crearHueso(`UpperArm.${lado}`, hClavicula, [s * 0.185, -0.006, -0.018], [0, 0, s * 0.42]);
    const hCodo = crearHueso(`Forearm.${lado}`, hHombro, [0, -0.28, 0], [-0.08, 0, s * 0.18]);
    const hMuneca = crearHueso(`Hand.${lado}`, hCodo, [0, -0.25, 0], [0, 0, s * 0.08]);
    return { hClavicula, hEscapula, hHombro, hCodo, hMuneca };
  }
  const cadBrazoIzq = construirCadenaBrazo("L");
  const cadBrazoDer = construirCadenaBrazo("R");

  function construirCadenaPierna(lado) {
    const s = lado === "L" ? -1 : 1;
    const hCadera = crearHueso(`Thigh.${lado}`, hPelvis, [s * 0.102, -0.015, 0.005]);
    const hRodilla = crearHueso(`Shin.${lado}`, hCadera, [0, -0.41, 0.008]);
    const hTobillo = crearHueso(`Foot.${lado}`, hRodilla, [0, -0.40, -0.005]);
    return { hCadera, hRodilla, hTobillo };
  }
  const cadPiernaIzq = construirCadenaPierna("L");
  const cadPiernaDer = construirCadenaPierna("R");

  // Pelvis
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

  // 24 Vértebras
  hLumbares.forEach((hL, idx) => hL.add(crearVertebra(0.021 - idx * 0.0006, 0.030, materialHueso, materialCartilago)));
  hDorsales.forEach((hT, idx) => hT.add(crearVertebra(0.018 - idx * 0.0004, 0.022, materialHueso, materialCartilago)));
  hCervicales.forEach((hC, idx) => hC.add(crearVertebra(0.013 - idx * 0.0003, 0.014, materialHueso, materialCartilago)));

  // Caja Torácica
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

  // Cráneo y Mandíbula
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

  // Extremidades Superiores con mano anatómica (metacarpos + dedos)
  function vestirBrazo(cad, lado) {
    const s = lado === "L" ? -1 : 1;
    const clavicula = malla(crearDiafisis(0.010, 0.007, 0.180));
    clavicula.rotation.z = s * (Math.PI * 0.47);
    clavicula.position.set(s * 0.090, -0.004, -0.011);
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

    const radioCubito = malla(crearDiafisis(0.016, 0.012, 0.25));
    radioCubito.position.set(0, -0.125, 0);
    cad.hCodo.add(malla(new THREE.SphereGeometry(0.017, 16, 14), materialArticulacion), radioCubito);

    const manoGrupo = new THREE.Group();
    const palma = malla(new THREE.BoxGeometry(0.016, 0.048, 0.052));
    palma.position.set(0, -0.026, 0);
    manoGrupo.add(palma);
    for (let d = -2; d <= 2; d++) {
      const largoDedo = d === -2 ? 0.028 : 0.040 - Math.abs(d) * 0.003;
      const dedo = malla(crearDiafisis(0.0035, 0.0028, largoDedo, 10, 8));
      dedo.position.set(0, -0.052 - largoDedo * 0.5, d * 0.010);
      manoGrupo.add(dedo);
    }
    cad.hMuneca.add(malla(new THREE.SphereGeometry(0.013, 14, 12), materialArticulacion), manoGrupo);
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

    const pie = malla(new THREE.BoxGeometry(0.058, 0.028, 0.182));
    pie.position.set(0, -0.022, 0.044);
    cad.hTobillo.add(malla(new THREE.SphereGeometry(0.017, 14, 12), materialArticulacion), pie);
  }
  vestirPierna(cadPiernaIzq);
  vestirPierna(cadPiernaDer);

  // ==========================================================================
  // [BLOQUE 4] RESET A POSE NEUTRA (restPose) Y ANCLAJES MUNDIALES
  // Función: Restaura todos los huesos a su estado neutro inicial antes de cada
  // cálculo y expone las coordenadas y cuaterniones mundiales para las capas 2-4.
  // ==========================================================================
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

  const pesosCampanaLumbar = obtenerPesosCampana(5, 0.5, 0.32);
  const pesosCampanaDorsal = obtenerPesosCampana(12, 0.55, 0.30);
  const pesosArcoLumbar = obtenerPesosArcoEscoliosis(5);
  const pesosArcoDorsal = obtenerPesosArcoEscoliosis(12);

  // ==========================================================================
  // [BLOQUE 5] MOTOR UNIFICADO applyAnatomyState(state) CON APERTURA EXTERIOR
  // Función: Resetea a restPose, aplica los 12 parámetros clínicos y suma
  // abducción hacia afuera (+s * abduccionExtra) cuando crecen dorsal, músculo
  // o grasa para mantener los brazos siempre separados del cuerpo.
  // ==========================================================================
  function applyAnatomyState(state = {}) {
    ultimoParams = { ...ultimoParams, ...state };
    resetToRestPose();

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

    // Pelvis y Cadera
    const antevRad = THREE.MathUtils.degToRad(anteversionPelvicaDeg) * 0.85;
    const bascRad = THREE.MathUtils.degToRad(basculacionPelvicaDeg) * 0.85;
    hPelvis.rotation.x += antevRad;
    hPelvis.rotation.z -= bascRad;
    mallaPelvis.scale.set(anchoCadera, 1, anchoCadera);

    cadPiernaIzq.hCadera.position.x = -0.102 * anchoCadera;
    cadPiernaDer.hCadera.position.x = 0.102 * anchoCadera;
    cadPiernaIzq.hCadera.rotation.x -= antevRad;
    cadPiernaDer.hCadera.rotation.x -= antevRad;
    cadPiernaIzq.hCadera.rotation.z += bascRad;
    cadPiernaDer.hCadera.rotation.z += bascRad;

    // Columna Lumbar
    const lordTotalRad = THREE.MathUtils.degToRad(-hiperlordosisDeg) * 0.95;
    const escLumRad = THREE.MathUtils.degToRad(-escoliosisLumbarDeg) * 0.75;
    let acumSagital = antevRad;
    let acumFrontal = -bascRad;

    hLumbares.forEach((hL, i) => {
      const wCampana = pesosCampanaLumbar[i];
      const wArco = pesosArcoLumbar[i];
      const deltaX = lordTotalRad * wCampana - antevRad * wCampana * 0.65;
      const deltaZ = escLumRad * wArco + bascRad * wCampana * 0.60;

      hL.rotation.x += deltaX;
      hL.rotation.z += deltaZ;
      hL.rotation.y += deltaZ * 0.25;

      acumSagital += hL.rotation.x;
      acumFrontal += hL.rotation.z;
    });

    // Columna Dorsal
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

    // Caja Torácica
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

    // Cuello y Cráneo
    const antepM = (antepulsionCuelloCm / 100) / escalaAltura;
    const flexCervicalRad = Math.atan2(antepM, 0.12);

    hCervicales.forEach((hC, i) => {
      const t = i / (hCervicales.length - 1);
      const perfilS = (1 - t * 1.65) * (flexCervicalRad / hCervicales.length);
      hC.position.z += antepM / hCervicales.length;
      hC.rotation.x += perfilS - (acumSagital * 0.08);
      hC.rotation.z -= acumFrontal * 0.08;
    });

    hCraneo.rotation.x += THREE.MathUtils.degToRad(craneoPitchDeg) - acumSagital * 0.35;
    hCraneo.rotation.y += THREE.MathUtils.degToRad(craneoYawDeg);
    hCraneo.rotation.z += THREE.MathUtils.degToRad(craneoRollDeg) - acumFrontal * 0.35;

    // Cintura Escapular + Apertura dinámica hacia afuera (+s) según volumen corporal
    const protraccionRad = THREE.MathUtils.degToRad(hombrosAdelantadosDeg);
    const aladaRad = THREE.MathUtils.degToRad(escapulasAladasDeg);
    const asimM = (asimetriaHombrosCm / 100) / escalaAltura;

    const extraMusc = Math.max(0, ((ultimoParams.musculoGlobalKg ?? 32) - 32) / 25) * 0.12;
    const extraGrasa = Math.max(0, ((ultimoParams.grasaTotalPct ?? 18) - 18) / 30) * 0.16;
    const extraDorsal = Math.max(0, ((ultimoParams.dorsalAnchoNivel ?? 4) - 4) / 6) * 0.10;
    const abduccionExtra = extraMusc + extraGrasa + extraDorsal + Math.max(0, morfologiaTorax - 1.0) * 0.25;

    function aplicarCinturaEscapular(cad, lado) {
      const s = lado === "L" ? -1 : 1;
      const deltaY = s * (asimM * 0.5);

      cad.hClavicula.position.y += deltaY;
      cad.hClavicula.rotation.y += -s * protraccionRad * 0.72;
      cad.hClavicula.rotation.z += s * (deltaY * 3.8);

      cad.hEscapula.position.y += deltaY;
      cad.hEscapula.rotation.x += aladaRad * 0.35;
      cad.hEscapula.rotation.y += -s * (aladaRad + protraccionRad * 0.32);

      cad.hHombro.position.x = s * 0.185 * anchoHombros * (1 + Math.max(0, morfologiaTorax - 1.0) * 0.5);
      cad.hHombro.rotation.x += protraccionRad * 0.55;
      cad.hHombro.rotation.y += s * protraccionRad * 0.40;
      // Signo POSITIVO (+s): abre el brazo más hacia afuera al crecer el torso
      cad.hHombro.rotation.z += s * abduccionExtra;
    }
    aplicarCinturaEscapular(cadBrazoIzq, "L");
    aplicarCinturaEscapular(cadBrazoDer, "R");

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
    }

    sincronizarAnclajes();
  }}