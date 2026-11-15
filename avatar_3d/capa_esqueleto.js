// ============================================================================
// VISAGELAB - CAPA 1: ESQUELETO (BASE POSTURAL, ANCLAJES Y SOPORTE GLB/PBR)
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

  // Micro-porosidad y vetas sutiles del hueso cortical
  for (let i = 0; i < 2400; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const r = 0.5 + Math.random() * 1.4;
    const osc = Math.random() > 0.5 ? "rgba(185, 172, 148, 0.22)" : "rgba(255, 252, 245, 0.28)";
    ctx.fillStyle = osc;
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

function crearDiafisis(rExtremos, rCentro, largo, segRadial = 28, segCurva = 20) {
  const puntos = [
    new THREE.Vector2(0.001, -largo * 0.5),
    new THREE.Vector2(rExtremos * 1.15, -largo * 0.44),
    new THREE.Vector2(rExtremos, -largo * 0.34),
    new THREE.Vector2(rCentro, 0),
    new THREE.Vector2(rExtremos, largo * 0.34),
    new THREE.Vector2(rExtremos * 1.15, largo * 0.44),
    new THREE.Vector2(0.001, largo * 0.5)
  ];
  const curva = new THREE.SplineCurve(puntos);
  const geo = new THREE.LatheGeometry(curva.getPoints(segCurva), segRadial);
  geo.computeVertexNormals();
  return geo;
}

export function crearCapaEsqueleto(opciones = {}) {
  const group = new THREE.Group();
  group.name = "CapaEsqueleto";

  const texturaHueso = crearTexturaPorosidadOsea();

  const materialHueso = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color("#f3ede0"),
    map: texturaHueso,
    bumpMap: texturaHueso,
    bumpScale: 0.003,
    roughness: 0.44,
    metalness: 0.02,
    clearcoat: 0.12,
    clearcoatRoughness: 0.55
  });

  const materialArticulacion = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color("#dfd5c0"),
    map: texturaHueso,
    bumpMap: texturaHueso,
    bumpScale: 0.002,
    roughness: 0.52,
    metalness: 0.01
  });

  const rigProcedural = new THREE.Group();
  rigProcedural.name = "EsqueletoProcedural";
  group.add(rigProcedural);

  const contenedorGlb = new THREE.Group();
  contenedorGlb.name = "EsqueletoGLB";
  contenedorGlb.visible = false;
  group.add(contenedorGlb);

  function malla(geo, mat = materialHueso) {
    const m = new THREE.Mesh(geo, mat);
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  }

  // 1. Cráneo, mandíbula y columna cervical
  const craneoGrupo = new THREE.Group();
  const craneo = malla(new THREE.SphereGeometry(0.094, 32, 26));
  craneo.scale.set(0.86, 1.10, 1.05);
  const mandibula = malla(new THREE.SphereGeometry(0.064, 24, 20));
  mandibula.scale.set(0.76, 0.58, 0.92);
  mandibula.position.set(0, -0.056, 0.022);
  const cervical = malla(crearDiafisis(0.018, 0.015, 0.095));
  cervical.position.set(0, -0.105, -0.006);
  craneoGrupo.add(craneo, mandibula, cervical);

  // 2. Columna vertebral y jaula torácica (esternón + costillas)
  const columnaLumbar = malla(crearDiafisis(0.024, 0.020, 0.24));
  const columnaDorsal = malla(crearDiafisis(0.021, 0.019, 0.28));

  const toraxGrupo = new THREE.Group();
  const esternon = malla(crearDiafisis(0.016, 0.013, 0.165));
  esternon.position.set(0, 0.01, 0.092);
  toraxGrupo.add(esternon);

  for (let i = 0; i < 6; i++) {
    const t = i / 5;
    const radio = THREE.MathUtils.lerp(0.092, 0.128, Math.sin(t * Math.PI * 0.78));
    const geoCostilla = new THREE.TorusGeometry(radio, 0.0075, 12, 32, Math.PI * 1.42);
    const costilla = malla(geoCostilla);
    costilla.rotation.x = Math.PI * 0.48;
    costilla.rotation.z = Math.PI * 0.79;
    costilla.position.set(0, 0.088 - i * 0.035, 0.008);
    costilla.scale.set(1.04, 0.80, 1.0);
    toraxGrupo.add(costilla);
  }

  // 3. Pelvis (sacro + alas iliacas)
  const pelvisGrupo = new THREE.Group();
  const sacro = malla(crearDiafisis(0.032, 0.022, 0.11));
  sacro.position.set(0, 0, -0.042);
  const cinturaPelvica = malla(new THREE.TorusGeometry(0.102, 0.022, 14, 32, Math.PI * 1.35));
  cinturaPelvica.rotation.x = Math.PI * 0.46;
  cinturaPelvica.rotation.z = -Math.PI * 0.175;
  cinturaPelvica.scale.set(1.14, 0.84, 1.08);
  pelvisGrupo.add(sacro, cinturaPelvica);

  // 4. Extremidades superiores
  function crearBrazo(signo) {
    const g = new THREE.Group();
    const clavicula = malla(crearDiafisis(0.011, 0.008, 0.15));
    clavicula.rotation.z = signo * (Math.PI * 0.42);
    clavicula.rotation.x = 0.14;

    const hombro = malla(new THREE.SphereGeometry(0.024, 20, 18), materialArticulacion);
    const humero = malla(crearDiafisis(0.022, 0.016, 0.28));
    const codo = malla(new THREE.SphereGeometry(0.018, 18, 16), materialArticulacion);
    const antebrazo = malla(crearDiafisis(0.017, 0.013, 0.25));
    const muneca = malla(new THREE.SphereGeometry(0.014, 16, 14), materialArticulacion);
    const mano = malla(new THREE.BoxGeometry(0.020, 0.082, 0.056));

    g.add(clavicula, hombro, humero, codo, antebrazo, muneca, mano);
    return { g, clavicula, hombro, humero, codo, antebrazo, muneca, mano };
  }

  const brazoIzq = crearBrazo(-1);
  const brazoDer = crearBrazo(1);

  // 5. Extremidades inferiores
  function crearPierna() {
    const g = new THREE.Group();
    const cadera = malla(new THREE.SphereGeometry(0.030, 20, 18), materialArticulacion);
    const femur = malla(crearDiafisis(0.028, 0.022, 0.41));
    const rodilla = malla(new THREE.SphereGeometry(0.024, 20, 18), materialArticulacion);
    const tibia = malla(crearDiafisis(0.023, 0.017, 0.40));
    const tobillo = malla(new THREE.SphereGeometry(0.018, 16, 14), materialArticulacion);
    const pie = malla(new THREE.BoxGeometry(0.058, 0.032, 0.185));

    g.add(cadera, femur, rodilla, tibia, tobillo, pie);
    return { g, cadera, femur, rodilla, tibia, tobillo, pie };
  }

  const piernaIzq = crearPierna();
  const piernaDer = crearPierna();

  rigProcedural.add(
    craneoGrupo,
    columnaLumbar,
    columnaDorsal,
    toraxGrupo,
    pelvisGrupo,
    brazoIzq.g,
    brazoDer.g,
    piernaIzq.g,
    piernaDer.g
  );

  // Puntos de anclaje estables para Capa 2 (Músculo), Capa 3 (Grasa), Capa 4 (Piel) y futuras capas
  const anclajes = {
    pelvis: new THREE.Vector3(),
    torax: new THREE.Vector3(),
    cuello: new THREE.Vector3(),
    craneo: new THREE.Vector3(),
    hombroIzq: new THREE.Vector3(),
    codoIzq: new THREE.Vector3(),
    munecaIzq: new THREE.Vector3(),
    hombroDer: new THREE.Vector3(),
    codoDer: new THREE.Vector3(),
    munecaDer: new THREE.Vector3(),
    caderaIzq: new THREE.Vector3(),
    rodillaIzq: new THREE.Vector3(),
    tobilloIzq: new THREE.Vector3(),
    caderaDer: new THREE.Vector3(),
    rodillaDer: new THREE.Vector3(),
    tobilloDer: new THREE.Vector3()
  };

  let ultimoParams = {};

  function actualizar(params = {}) {
    ultimoParams = { ...ultimoParams, ...params };

    const estaturaCm = ultimoParams.estaturaCm ?? 175;
    const anchoHombros = ultimoParams.anchoHombros ?? 1.0;
    const anchoCadera = ultimoParams.anchoCadera ?? 1.0;
    const escoliosisDeg = ultimoParams.escoliosisDeg ?? ultimoParams.desviacionColumnaDeg ?? 0;
    const cifosisDeg = ultimoParams.cifosisDeg ?? 0;
    const hombrosAdelantadosDeg = ultimoParams.hombrosAdelantadosDeg ?? 0;

    const escalaAltura = estaturaCm / 175;
    const escolRad = THREE.MathUtils.degToRad(escoliosisDeg);
    const cifoRad = THREE.MathUtils.degToRad(cifosisDeg);
    const protraccionRad = THREE.MathUtils.degToRad(hombrosAdelantadosDeg);

    const altoTobillo = 0.04 * escalaAltura;
    const largoFemur = 0.41 * escalaAltura;
    const largoTibia = 0.40 * escalaAltura;
    const yRodilla = altoTobillo + largoTibia;
    const yCadera = yRodilla + largoFemur;

    pelvisGrupo.scale.set(anchoCadera, escalaAltura, anchoCadera);
    pelvisGrupo.position.set(0, yCadera, 0);
    anclajes.pelvis.copy(pelvisGrupo.position);

    const sepPierna = 0.102 * anchoCadera;

    function posicionarPierna(p, signo, esIzq) {
      const x = signo * sepPierna;

      p.cadera.scale.setScalar(escalaAltura);
      p.cadera.position.set(x, yCadera, 0);

      p.femur.scale.set(1, escalaAltura, 1);
      p.femur.position.set(x, yCadera - largoFemur * 0.5, 0.01);
      p.femur.rotation.x = -0.03;

      p.rodilla.scale.setScalar(escalaAltura);
      p.rodilla.position.set(x, yRodilla, 0.015);

      p.tibia.scale.set(1, escalaAltura, 1);
      p.tibia.position.set(x, altoTobillo + largoTibia * 0.5, 0.008);

      p.tobillo.scale.setScalar(escalaAltura);
      p.tobillo.position.set(x, altoTobillo, 0.004);

      p.pie.scale.set(1, escalaAltura, escalaAltura);
      p.pie.position.set(x, 0.016 * escalaAltura, 0.045 * escalaAltura);

      if (esIzq) {
        anclajes.caderaIzq.copy(p.cadera.position);
        anclajes.rodillaIzq.copy(p.rodilla.position);
        anclajes.tobilloIzq.copy(p.tobillo.position);
      } else {
        anclajes.caderaDer.copy(p.cadera.position);
        anclajes.rodillaDer.copy(p.rodilla.position);
        anclajes.tobilloDer.copy(p.tobillo.position);
      }
    }

    posicionarPierna(piernaIzq, -1, true);
    posicionarPierna(piernaDer, 1, false);

    const largoLumbar = 0.24 * escalaAltura;
    const largoDorsal = 0.28 * escalaAltura;

    const dxLumbar = Math.sin(escolRad * 0.5) * (largoLumbar * 0.5);
    const dzLumbar = Math.sin(cifoRad * 0.35) * (largoLumbar * 0.5) - 0.025;
    columnaLumbar.scale.set(1, escalaAltura, 1);
    columnaLumbar.position.set(dxLumbar, yCadera + largoLumbar * 0.5, dzLumbar);
    columnaLumbar.rotation.z = -escolRad * 0.5;
    columnaLumbar.rotation.x = cifoRad * 0.35;

    const xBaseDorsal = Math.sin(escolRad * 0.5) * largoLumbar;
    const zBaseDorsal = dzLumbar + Math.sin(cifoRad * 0.35) * (largoLumbar * 0.5);
    columnaDorsal.scale.set(1, escalaAltura, 1);
    columnaDorsal.position.set(
      xBaseDorsal + Math.sin(escolRad) * (largoDorsal * 0.5),
      yCadera + largoLumbar + largoDorsal * 0.5,
      zBaseDorsal + Math.sin(cifoRad) * (largoDorsal * 0.5)
    );
    columnaDorsal.rotation.z = -escolRad;
    columnaDorsal.rotation.x = cifoRad;

    const dxTorax = xBaseDorsal + Math.sin(escolRad) * (largoDorsal * 0.62);
    const yTorax = yCadera + 0.39 * escalaAltura;
    const dzTorax = zBaseDorsal + Math.sin(cifoRad) * (largoDorsal * 0.62) + 0.02;

    toraxGrupo.scale.set(anchoHombros, escalaAltura, anchoHombros * 0.92);
    toraxGrupo.position.set(dxTorax, yTorax, dzTorax);
    toraxGrupo.rotation.z = -escolRad;
    toraxGrupo.rotation.x = cifoRad;
    anclajes.torax.copy(toraxGrupo.position);

    const dxCabeza = dxTorax + Math.sin(escolRad) * (0.28 * escalaAltura);
    const yCabeza = yCadera + 0.69 * escalaAltura;
    const dzCabeza = dzTorax + Math.sin(cifoRad) * (0.20 * escalaAltura) + 0.015;

    anclajes.cuello.set(dxCabeza, yCadera + 0.56 * escalaAltura, dzCabeza - 0.005);

    craneoGrupo.scale.setScalar(escalaAltura);
    craneoGrupo.position.set(dxCabeza, yCabeza, dzCabeza);
    craneoGrupo.rotation.z = -escolRad;
    craneoGrupo.rotation.x = cifoRad * 0.7;
    anclajes.craneo.copy(craneoGrupo.position);

    const yHombro = yCadera + 0.49 * escalaAltura;
    const dzHombro = dzTorax + Math.sin(protraccionRad) * (0.14 * escalaAltura);
    const segBrazo = 0.28 * escalaAltura;
    const segAnt = 0.25 * escalaAltura;
    const angAbertura = 0.18;

    function posicionarBrazo(b, signo, esIzq) {
      const xHombro = dxTorax + signo * 0.195 * anchoHombros;

      b.clavicula.scale.set(anchoHombros, escalaAltura, escalaAltura);
      b.clavicula.position.set(
        dxTorax + signo * 0.095 * anchoHombros,
        yHombro + 0.012 * escalaAltura,
        dzHombro + 0.035
      );

      b.hombro.scale.setScalar(escalaAltura);
      b.hombro.position.set(xHombro, yHombro, dzHombro);

      b.humero.scale.set(1, escalaAltura, 1);
      b.humero.rotation.z = -signo * angAbertura;
      b.humero.rotation.x = protraccionRad * 0.65;
      b.humero.position.set(
        xHombro + signo * Math.sin(angAbertura) * (segBrazo * 0.5),
        yHombro - Math.cos(angAbertura) * (segBrazo * 0.5),
        dzHombro + Math.sin(protraccionRad * 0.65) * (segBrazo * 0.4)
      );

      const xCodo = xHombro + signo * Math.sin(angAbertura) * segBrazo;
      const yCodo = yHombro - Math.cos(angAbertura) * segBrazo;
      const zCodo = dzHombro + Math.sin(protraccionRad * 0.65) * (segBrazo * 0.8);

      b.codo.scale.setScalar(escalaAltura);
      b.codo.position.set(xCodo, yCodo, zCodo);

      const angAnt = angAbertura + 0.06;
      b.antebrazo.scale.set(1, escalaAltura, 1);
      b.antebrazo.rotation.z = -signo * angAnt;
      b.antebrazo.rotation.x = protraccionRad * 0.4;
      b.antebrazo.position.set(
        xCodo + signo * Math.sin(angAnt) * (segAnt * 0.5),
        yCodo - Math.cos(angAnt) * (segAnt * 0.5),
        zCodo + Math.sin(protraccionRad * 0.4) * (segAnt * 0.4)
      );

      const xMuneca = xCodo + signo * Math.sin(angAnt) * segAnt;
      const yMuneca = yCodo - Math.cos(angAnt) * segAnt;
      const zMuneca = zCodo + Math.sin(protraccionRad * 0.4) * (segAnt * 0.72);

      b.muneca.scale.setScalar(escalaAltura);
      b.muneca.position.set(xMuneca, yMuneca, zMuneca);

      b.mano.scale.setScalar(escalaAltura);
      b.mano.rotation.z = -signo * angAnt;
      b.mano.rotation.x = protraccionRad * 0.4;
      b.mano.position.set(
        xMuneca + signo * Math.sin(angAnt) * (0.04 * escalaAltura),
        yMuneca - Math.cos(angAnt) * (0.04 * escalaAltura),
        zMuneca + Math.sin(protraccionRad * 0.4) * (0.025 * escalaAltura)
      );

      if (esIzq) {
        anclajes.hombroIzq.copy(b.hombro.position);
        anclajes.codoIzq.copy(b.codo.position);
        anclajes.munecaIzq.copy(b.muneca.position);
      } else {
        anclajes.hombroDer.copy(b.hombro.position);
        anclajes.codoDer.copy(b.codo.position);
        anclajes.munecaDer.copy(b.muneca.position);
      }
    }

    posicionarBrazo(brazoIzq, -1, true);
    posicionarBrazo(brazoDer, 1, false);

    if (contenedorGlb.visible) {
      contenedorGlb.scale.setScalar(escalaAltura);
      contenedorGlb.rotation.set(cifoRad, 0, -escolRad);
    }
  }

  // Permite cargar un modelo GLB anatómico real cuando esté disponible
  function cargarModeloGLB(url) {
    if (!url) return Promise.resolve(false);
    const loader = new GLTFLoader();
    return new Promise((resolve, reject) => {
      loader.load(
        url,
        (gltf) => {
          contenedorGlb.clear();
          gltf.scene.traverse((obj) => {
            if (obj.isMesh) {
              obj.castShadow = true;
              obj.receiveShadow = true;
              obj.material = materialHueso;
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

  if (opciones.urlModeloGlb) {
    cargarModeloGLB(opciones.urlModeloGlb).catch(() => {
      rigProcedural.visible = true;
      contenedorGlb.visible = false;
    });
  }

  actualizar();
  return { group, anclajes, actualizar, cargarModeloGLB };
}