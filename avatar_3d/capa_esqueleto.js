// ============================================================================
// VISAGELAB - CAPA 1: SISTEMA ESQUELÉTICO (FK, 12 PARÁMETROS Y SOPORTE GLB/PBR)
// ============================================================================

// ============================================================================
// [BLOQUE 1] IMPORTACIONES, TEXTURA ÓSEA PBR Y CONSTRUCTORES GEOMÉTRICOS
// Función: Carga Three.js y GLTFLoader mediante el importmap del visor, sintetiza
// la textura de porosidad ósea y define los constructores de diáfisis y vértebras.
// ============================================================================
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

// Genera mapa difuso y bump de porosidad ósea cortical sobre un canvas 2D
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

// Construye un hueso largo con epífisis ensanchadas y diáfisis estrecha mediante torno
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

// Construye una vértebra con cuerpo cilíndrico, disco intervertebral y apófisis
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
// [BLOQUE 2] MATERIALES PBR Y ARMATURE VIRTUAL (CINEMÁTICA DIRECTA / FK)
// Función: Configura los materiales físicos del tejido óseo, articular y
// cartilaginoso, y arma la jerarquía padre-hijo de huesos virtuales
// (Pelvis -> L5..L1 -> T12..T1 -> C7..C1 -> Head y extremidades) compatible
// con nombres de rig estándar de Blender.
// ============================================================================
export function crearCapaEsqueleto(opciones = {}) {
  const group = new THREE.Group();
  group.name = "CapaEsqueleto";

  const texturaHueso = crearTexturaPorosidadOsea();

  // Material cortical con micro-relieve y barniz sutil
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

  // Material ligeramente más rugoso para cápsulas y superficies articulares
  const materialArticulacion = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color("#dfd5c0"),
    map: texturaHueso,
    bumpMap: texturaHueso,
    bumpScale: 0.002,
    roughness: 0.50,
    metalness: 0.01
  });

  // Material translúcido para discos intervertebrales y cartílagos costales
  const materialCartilago = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color("#c9d2d8"),
    roughness: 0.36,
    metalness: 0.01,
    transmission: 0.15,
    thickness: 0.02
  });

  function malla(geo, mat = materialHueso) {
    const m = new THREE.Mesh(geo, mat);
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  }

  // Raíz del esqueleto cinemático virtual
  const armatureRaiz = new THREE.Group();
  armatureRaiz.name = "Armature_VisageLab";
  group.add(armatureRaiz);

  const huesos = {};
  function crearHueso(nombre, padre, posLocal = [0, 0, 0]) {
    const h = new THREE.Object3D();
    h.name = nombre;
    h.position.set(...posLocal);
    padre.add(h);
    huesos[nombre] = h;
    return h;
  }

  // Pelvis como hueso raíz de toda la cadena postural
  const hPelvis = crearHueso("Pelvis", armatureRaiz, [0, 0.85, 0]);

  // Columna lumbar (L5 a L1) encadenada sobre Pelvis
  const hLumbares = [];
  let padreActual = hPelvis;
  for (let i = 5; i >= 1; i--) {
    const yStep = i === 5 ? 0.045 : 0.036;
    const hL = crearHueso(`L${i}`, padreActual, [0, yStep, -0.022]);
    hLumbares.push(hL);
    padreActual = hL;
  }

  // Columna dorsal/torácica (T12 a T1) encadenada sobre L1
  const hDorsales = [];
  for (let i = 12; i >= 1; i--) {
    const hT = crearHueso(`T${i}`, padreActual, [0, 0.025, 0]);
    hDorsales.push(hT);
    padreActual = hT;
  }

  // Punto central del tórax anclado a la vértebra T6
  const hTorax = crearHueso("Torax_Centro", huesos["T6"], [0, 0, 0.022]);

  // Columna cervical (C7 a C1) y cabeza encadenadas sobre T1
  const hCervicales = [];
  for (let i = 7; i >= 1; i--) {
    const hC = crearHueso(`C${i}`, padreActual, [0, 0.017, 0.002]);
    hCervicales.push(hC);
    padreActual = hC;
  }
  const hCraneo = crearHueso("Head", padreActual, [0, 0.042, 0.014]);

  // Ramas de cintura escapular y extremidades superiores (L = izquierda, R = derecha)
  function construirCadenaBrazo(lado) {
    const s = lado === "L" ? -1 : 1;
    const hClavicula = crearHueso(`Clavicle.${lado}`, huesos["T2"], [s * 0.025, 0.012, 0.045]);
    const hEscapula = crearHueso(`Scapula.${lado}`, huesos["T4"], [s * 0.068, 0.015, -0.042]);
    const hHombro = crearHueso(`UpperArm.${lado}`, hClavicula, [s * 0.165, -0.008, -0.022]);
    const hCodo = crearHueso(`Forearm.${lado}`, hHombro, [0, -0.28, 0]);
    const hMuneca = crearHueso(`Hand.${lado}`, hCodo, [0, -0.25, 0]);
    return { hClavicula, hEscapula, hHombro, hCodo, hMuneca };
  }
  const cadBrazoIzq = construirCadenaBrazo("L");
  const cadBrazoDer = construirCadenaBrazo("R");

  // Ramas de extremidades inferiores encadenadas a la pelvis
  function construirCadenaPierna(lado) {
    const s = lado === "L" ? -1 : 1;
    const hCadera = crearHueso(`Thigh.${lado}`, hPelvis, [s * 0.098, -0.015, 0.005]);
    const hRodilla = crearHueso(`Shin.${lado}`, hCadera, [0, -0.41, 0.010]);
    const hTobillo = crearHueso(`Foot.${lado}`, hRodilla, [0, -0.40, -0.006]);
    return { hCadera, hRodilla, hTobillo };
  }
  const cadPiernaIzq = construirCadenaPierna("L");
  const cadPiernaDer = construirCadenaPierna("R");
  // ============================================================================
// [BLOQUE 3] ENSAMBLAJE DE GEOMETRÍA ÓSEA PROCEDURAL SOBRE EL ARMATURE
// Función: Viste cada hueso virtual con mallas anatómicas detalladas (pelvis,
// 24 vértebras, caja torácica con cartílago costal, cráneo/mandíbula,
// escápulas, clavículas y extremidades) para operar sin dependencias externas
// mientras no se cargue un archivo .glb.
// ============================================================================
  const rigProcedural = new THREE.Group();
  rigProcedural.name = "EsqueletoProcedural";
  armatureRaiz.add(rigProcedural);

  // Contenedor oculto por defecto que se activa al importar un .glb de Blender
  const contenedorGlb = new THREE.Group();
  contenedorGlb.name = "EsqueletoGLB";
  contenedorGlb.visible = false;
  group.add(contenedorGlb);

  // 1. Pelvis ósea (sacro y cintura pélvica)
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

  // 2. Inserción de las 24 vértebras individuales (5 lumbares, 12 dorsales, 7 cervicales)
  hLumbares.forEach((hL, idx) => {
    const r = 0.021 - idx * 0.0006;
    hL.add(crearVertebra(r, 0.030, materialHueso, materialCartilago));
  });
  hDorsales.forEach((hT, idx) => {
    const r = 0.018 - idx * 0.0004;
    hT.add(crearVertebra(r, 0.022, materialHueso, materialCartilago));
  });
  hCervicales.forEach((hC, idx) => {
    const r = 0.013 - idx * 0.0003;
    hC.add(crearVertebra(r, 0.014, materialHueso, materialCartilago));
  });

  // 3. Caja torácica (esternón + 10 pares de costillas verdaderas y falsas)
  const cajaToracicaGrupo = new THREE.Group();
  const esternon = malla(crearDiafisis(0.016, 0.013, 0.175));
  esternon.position.set(0, 0.005, 0.096);
  esternon.rotation.x = -0.14;
  cajaToracicaGrupo.add(esternon);

  const costillasMallas = [];
  for (let i = 0; i < 10; i++) {
    const t = i / 9;
    const radioBase = THREE.MathUtils.lerp(0.072, 0.128, Math.sin(t * Math.PI * 0.82));
    const arco = i < 7 ? Math.PI * 1.58 : Math.PI * 1.25;
    const geoCostilla = new THREE.TorusGeometry(radioBase, 0.0055, 10, 32, arco);
    const costilla = malla(geoCostilla, i >= 6 ? materialCartilago : materialHueso);
    costilla.rotation.x = Math.PI * 0.49;
    costilla.rotation.z = Math.PI * 0.5 - arco * 0.5 + Math.PI;
    costilla.position.set(0, 0.115 - i * 0.024, 0.002);
    costilla.userData.indice = i;
    cajaToracicaGrupo.add(costilla);
    costillasMallas.push(costilla);
  }
  hTorax.add(cajaToracicaGrupo);

  // 4. Cráneo, maxilar y mandíbula
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

  // 5. Extremidades superiores (clavícula, escápula, húmero, antebrazo, mano)
  function vestirBrazoProcedural(cad, lado) {
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

    const artHombro = malla(new THREE.SphereGeometry(0.023, 18, 16), materialArticulacion);
    const humero = malla(crearDiafisis(0.020, 0.015, 0.28));
    humero.position.set(0, -0.14, 0);
    cad.hHombro.add(artHombro, humero);

    const artCodo = malla(new THREE.SphereGeometry(0.017, 16, 14), materialArticulacion);
    const antebrazo = malla(crearDiafisis(0.016, 0.012, 0.25));
    antebrazo.position.set(0, -0.125, 0);
    cad.hCodo.add(artCodo, antebrazo);

    const artMuneca = malla(new THREE.SphereGeometry(0.013, 14, 12), materialArticulacion);
    const mano = malla(new THREE.BoxGeometry(0.018, 0.080, 0.054));
    mano.position.set(0, -0.042, 0);
    cad.hMuneca.add(artMuneca, mano);
  }
  vestirBrazoProcedural(cadBrazoIzq, "L");
  vestirBrazoProcedural(cadBrazoDer, "R");

  // 6. Extremidades inferiores (cadera, fémur, rodilla, tibia, tobillo, pie)
  function vestirPiernaProcedural(cad) {
    const artCadera = malla(new THREE.SphereGeometry(0.028, 18, 16), materialArticulacion);
    const femur = malla(crearDiafisis(0.027, 0.021, 0.41));
    femur.position.set(0, -0.205, 0.005);
    cad.hCadera.add(artCadera, femur);

    const artRodilla = malla(new THREE.SphereGeometry(0.023, 18, 16), materialArticulacion);
    const tibia = malla(crearDiafisis(0.022, 0.016, 0.40));
    tibia.position.set(0, -0.20, -0.003);
    cad.hRodilla.add(artRodilla, tibia);

    const artTobillo = malla(new THREE.SphereGeometry(0.017, 14, 12), materialArticulacion);
    const pie = malla(new THREE.BoxGeometry(0.056, 0.030, 0.180));
    pie.position.set(0, -0.022, 0.042);
    cad.hTobillo.add(artTobillo, pie);
  }
  vestirPiernaProcedural(cadPiernaIzq);
  vestirPiernaProcedural(cadPiernaDer);
  // ============================================================================
// [BLOQUE 4] PUNTOS DE ANCLAJE MUNDIALES (POSICIÓN + ROTACIÓN)
// Función: Calcula y expone las coordenadas mundiales (getWorldPosition) y
// orientaciones (getWorldQuaternion) de las 16 articulaciones principales para
// que las Capas 2 (Músculo), 3 (Grasa), 4 (Piel) y 6 (Ropa) se alineen con
// precisión milimétrica ante cualquier postura.
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

  // Actualiza las matrices mundiales del árbol FK y vuelca posición y cuaternión
  function sincronizarAnclajes() {
    group.updateMatrixWorld(true);
    Object.entries(nodosAncla).forEach(([clave, nodo]) => {
      nodo.getWorldPosition(anclajes[clave]);
      nodo.getWorldQuaternion(anclajes[clave].quat);
    });
  }

  let ultimoParams = {};
  let skinnedMeshGlb = null;
  let huesosGlbMap = {};
  // ============================================================================
// [BLOQUE 5] MOTOR CINEMÁTICO DE LOS 12 PARÁMETROS CLÍNICOS
// Función: Transforma los 12 parámetros clínicos (cifosis, hiperlordosis,
// escoliosis torácica/lumbar, antepulsión cervical, rotación craneal,
// hombros adelantados, escápulas aladas, asimetría de hombros, morfología
// costal, anteversión/retroversión y basculación pélvica) en rotaciones FK,
// Morph Targets y actualización de anclajes.
// ============================================================================
  function actualizar(params = {}) {
    ultimoParams = { ...ultimoParams, ...params };

    const estaturaCm = ultimoParams.estaturaCm ?? 175;
    const escalaAltura = estaturaCm / 175;
    const anchoHombros = ultimoParams.anchoHombros ?? 1.0;
    const anchoCadera = ultimoParams.anchoCadera ?? 1.0;

    // Lectura de los 12 parámetros clínicos de la Capa 1
    const cifosisDeg = ultimoParams.cifosisDeg ?? 0;
    const hiperlordosisDeg = ultimoParams.hiperlordosisDeg ?? 0;
    const escoliosisToracicaDeg =
      ultimoParams.escoliosisToracicaDeg ?? ultimoParams.escoliosisDeg ?? 0;
    const escoliosisLumbarDeg = ultimoParams.escoliosisLumbarDeg ?? 0;

    const antepulsionCuelloCm = ultimoParams.antepulsionCuelloCm ?? 0;
    const craneoPitchDeg = ultimoParams.craneoPitchDeg ?? 0;
    const craneoYawDeg = ultimoParams.craneoYawDeg ?? 0;
    const craneoRollDeg = ultimoParams.craneoRollDeg ?? 0;

    const hombrosAdelantadosDeg = ultimoParams.hombrosAdelantadosDeg ?? 0;
    const escapulasAladasDeg = ultimoParams.escapulasAladasDeg ?? 0;
    const asimetriaHombrosCm = ultimoParams.asimetriaHombrosCm ?? 0;
    const morfologiaTorax = ultimoParams.morfologiaTorax ?? 1.0;

    const anteversionPelvicaDeg = ultimoParams.anteversionPelvicaDeg ?? 0;
    const basculacionPelvicaDeg = ultimoParams.basculacionPelvicaDeg ?? 0;

    // Escalado global proporcional a la estatura
    armatureRaiz.scale.setScalar(escalaAltura);

    // D. Pelvis y Cadera: Anteversión/Retroversión (11) y Basculación lateral (12)
    const antevRad = THREE.MathUtils.degToRad(anteversionPelvicaDeg);
    const bascRad = THREE.MathUtils.degToRad(basculacionPelvicaDeg);
    hPelvis.rotation.set(antevRad, 0, -bascRad);
    mallaPelvis.scale.set(anchoCadera, 1, anchoCadera);

    // Compensa la rotación en caderas para mantener ambos pies apoyados en y = 0
    cadPiernaIzq.hCadera.position.x = -0.098 * anchoCadera;
    cadPiernaDer.hCadera.position.x = 0.098 * anchoCadera;
    cadPiernaIzq.hCadera.rotation.set(-antevRad, 0, bascRad);
    cadPiernaDer.hCadera.rotation.set(-antevRad, 0, bascRad);

    // A. Columna Lumbar (L5-L1): Hiperlordosis (2) y Escoliosis Lumbar (4)
    const lordStep = THREE.MathUtils.degToRad(-hiperlordosisDeg) / hLumbares.length;
    const escLumStep = THREE.MathUtils.degToRad(-escoliosisLumbarDeg) / hLumbares.length;
    const compPelvisStep = -antevRad * 0.45 / hLumbares.length;
    hLumbares.forEach((hL) => {
      hL.rotation.set(lordStep + compPelvisStep, 0, escLumStep);
    });

    // A. Columna Dorsal (T12-T1): Cifosis (1) y Escoliosis Torácica (3)
    const cifoStep = THREE.MathUtils.degToRad(cifosisDeg) / hDorsales.length;
    const escTorStep = THREE.MathUtils.degToRad(-escoliosisToracicaDeg) / hDorsales.length;
    hDorsales.forEach((hT) => {
      hT.rotation.set(cifoStep, 0, escTorStep);
    });

    // C. Morfología de la Caja Torácica y ángulo subcostal (10)
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

    // B. Cuello (C7-C1) y Cráneo: Antepulsión (5) e Inclinación/Rotación (6)
    const antepM = (antepulsionCuelloCm / 100) / escalaAltura;
    const flexCervicalStep = Math.atan2(antepM, 0.12) / hCervicales.length;
    hCervicales.forEach((hC, idx) => {
      hC.position.z = 0.002 + (antepM / hCervicales.length);
      hC.rotation.set(flexCervicalStep * 0.55, 0, 0);
      if (idx === hCervicales.length - 1) {
        hC.rotation.x -= flexCervicalStep * 2.2;
      }
    });

    hCraneo.rotation.set(
      THREE.MathUtils.degToRad(craneoPitchDeg) - cifoStep * 4.5,
      THREE.MathUtils.degToRad(craneoYawDeg),
      THREE.MathUtils.degToRad(craneoRollDeg) - escTorStep * 4.0
    );

    // C. Cintura Escapular: Hombros adelantados (7), Escápulas aladas (8) y Asimetría (9)
    const protraccionRad = THREE.MathUtils.degToRad(hombrosAdelantadosDeg);
    const aladaRad = THREE.MathUtils.degToRad(escapulasAladasDeg);
    const asimM = (asimetriaHombrosCm / 100) / escalaAltura;

    function actualizarBrazoFK(cad, lado) {
      const s = lado === "L" ? -1 : 1;
      const deltaY = s * (asimM * 0.5);

      cad.hClavicula.position.set(s * 0.025, 0.012 + deltaY, 0.045);
      cad.hClavicula.rotation.set(0, -s * protraccionRad * 0.75, s * (deltaY * 4.2));

      cad.hEscapula.position.set(s * 0.068, 0.015 + deltaY, -0.042);
      cad.hEscapula.rotation.set(aladaRad * 0.35, -s * (aladaRad + protraccionRad * 0.3), 0);

      cad.hHombro.position.set(s * 0.165 * anchoHombros, -0.008, -0.022);
      cad.hHombro.rotation.set(
        protraccionRad * 0.65,
        s * protraccionRad * 0.45,
        -s * 0.17
      );

      cad.hCodo.rotation.set(-0.08, 0, -s * 0.05);
    }
    actualizarBrazoFK(cadBrazoIzq, "L");
    actualizarBrazoFK(cadBrazoDer, "R");

    // Transfiere rotaciones FK y Morph Targets al modelo .glb si está activo
    if (contenedorGlb.visible) {
      contenedorGlb.scale.setScalar(escalaAltura);
      Object.entries(huesos).forEach(([nombre, huesoVirtual]) => {
        const huesoGlb = huesosGlbMap[nombre];
        if (huesoGlb) {
          huesoGlb.rotation.copy(huesoVirtual.rotation);
        }
      });
      if (skinnedMeshGlb?.morphTargetDictionary && skinnedMeshGlb?.morphTargetInfluences) {
        const idxTorax = skinnedMeshGlb.morphTargetDictionary["Ribcage_Width"];
        if (idxTorax !== undefined) {
          skinnedMeshGlb.morphTargetInfluences[idxTorax] = THREE.MathUtils.clamp(
            (morfologiaTorax - 0.82) / 0.40,
            0,
            1
          );
        }
      }
    }

    sincronizarAnclajes();
  }// ============================================================================
// [BLOQUE 6] CARGADOR DE MODELOS .GLB RIGGEADOS Y EXPORTACIÓN DEL MÓDULO
// Función: Carga un archivo .glb generado en Blender/bpy, enlaza sus huesos
// internos (Bone) y Morph Targets (SkinnedMesh) al motor FK de la Capa 1,
// oculta el fallback procedural y retorna la API pública del esqueleto.
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
          skinnedMeshGlb = null;

          // Indexa huesos y mallas con skinning del archivo GLB
          gltf.scene.traverse((obj) => {
            if (obj.isBone) {
              huesosGlbMap[obj.name] = obj;
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
          rigProcedural.visible = false;
          contenedorGlb.visible = true;
          actualizar(ultimoParams);
          resolve(true);
        },
        undefined,
        (err) => reject(err)
      );
    });
  }

  // Carga automática si se recibió una URL inicial en las opciones
  if (opciones.urlModeloGlb) {
    cargarModeloGLB(opciones.urlModeloGlb).catch(() => {
      rigProcedural.visible = true;
      contenedorGlb.visible = false;
    });
  }

  actualizar();
  return { group, anclajes, huesos, actualizar, cargarModeloGLB };
}