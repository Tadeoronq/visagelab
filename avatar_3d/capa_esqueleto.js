// ============================================================================
// VISAGELAB - CAPA 1: ESQUELETO HUMANO ORGÁNICO
// ============================================================================
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.158.0/build/three.module.js";

function crearHuesoOrganico(rSup, rMed, rInf, alto, segRadial = 24, segAlto = 18) {
  const puntos = [
    new THREE.Vector2(0.001, -alto * 0.5),
    new THREE.Vector2(rInf * 0.92, -alto * 0.45),
    new THREE.Vector2(rInf, -alto * 0.32),
    new THREE.Vector2(rMed, 0),
    new THREE.Vector2(rSup, alto * 0.32),
    new THREE.Vector2(rSup * 0.92, alto * 0.45),
    new THREE.Vector2(0.001, alto * 0.5)
  ];
  const curva = new THREE.SplineCurve(puntos);
  const geo = new THREE.LatheGeometry(curva.getPoints(segAlto), segRadial);
  geo.computeVertexNormals();
  return geo;
}

export function crearCapaEsqueleto() {
  const group = new THREE.Group();
  group.name = "CapaEsqueleto";

  const materialHueso = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#f0eadc"),
    roughness: 0.38,
    metalness: 0.04
  });

  const materialArticulacion = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#dfd7c5"),
    roughness: 0.45,
    metalness: 0.02
  });

  function mallaHueso(geo, mat = materialHueso) {
    const m = new THREE.Mesh(geo, mat);
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  }

  // Cráneo y mandíbula esculpidos
  const craneoGrupo = new THREE.Group();
  const neurocraneo = mallaHueso(new THREE.SphereGeometry(0.095, 28, 24));
  neurocraneo.scale.set(0.86, 1.08, 1.04);
  const mandibula = mallaHueso(new THREE.SphereGeometry(0.068, 20, 18));
  mandibula.scale.set(0.78, 0.65, 0.95);
  mandibula.position.set(0, -0.055, 0.024);
  const cervical = mallaHueso(crearHuesoOrganico(0.017, 0.015, 0.019, 0.09));
  cervical.position.set(0, -0.105, -0.005);
  craneoGrupo.add(neurocraneo, mandibula, cervical);

  // Columna vertebral (lumbar + dorsal) y caja torácica con costillas
  const columnaLumbar = mallaHueso(crearHuesoOrganico(0.022, 0.020, 0.027, 0.24));
  const columnaDorsal = mallaHueso(crearHuesoOrganico(0.018, 0.019, 0.022, 0.28));

  const toraxGrupo = new THREE.Group();
  const esternon = mallaHueso(crearHuesoOrganico(0.018, 0.014, 0.010, 0.17));
  esternon.position.set(0, 0.01, 0.095);
  toraxGrupo.add(esternon);

  const costillas = [];
  for (let i = 0; i < 6; i++) {
    const t = i / 5;
    const radioCostilla = THREE.MathUtils.lerp(0.095, 0.132, Math.sin(t * Math.PI * 0.78));
    const geoCostilla = new THREE.TorusGeometry(radioCostilla, 0.0085, 10, 28, Math.PI * 1.45);
    const costilla = mallaHueso(geoCostilla);
    costilla.rotation.x = Math.PI * 0.48;
    costilla.rotation.z = Math.PI * 0.78;
    costilla.position.set(0, 0.09 - i * 0.036, 0.01);
    costilla.scale.set(1.05, 0.82, 1.0);
    toraxGrupo.add(costilla);
    costillas.push(costilla);
  }

  // Pelvis anatómica (cuenco pélvico + crestas iliacas)
  const pelvisGrupo = new THREE.Group();
  const sacro = mallaHueso(crearHuesoOrganico(0.032, 0.022, 0.014, 0.11));
  sacro.position.set(0, 0, -0.045);
  const cuencoPelvico = mallaHueso(new THREE.TorusGeometry(0.105, 0.024, 14, 28, Math.PI * 1.35));
  cuencoPelvico.rotation.x = Math.PI * 0.46;
  cuencoPelvico.rotation.z = -Math.PI * 0.175;
  cuencoPelvico.scale.set(1.15, 0.85, 1.1);
  pelvisGrupo.add(sacro, cuencoPelvico);

  // Extremidades superiores (clavícula, húmero, radio/cúbito, mano)
  function crearBrazoOseo(signo) {
    const g = new THREE.Group();
    const clavicula = mallaHueso(crearHuesoOrganico(0.010, 0.008, 0.011, 0.15));
    clavicula.rotation.z = signo * (Math.PI * 0.42);
    clavicula.rotation.x = 0.15;

    const hombro = mallaHueso(new THREE.SphereGeometry(0.025, 18, 18), materialArticulacion);
    const humero = mallaHueso(crearHuesoOrganico(0.022, 0.016, 0.019, 0.28));
    const codo = mallaHueso(new THREE.SphereGeometry(0.019, 16, 16), materialArticulacion);
    const antebrazo = mallaHueso(crearHuesoOrganico(0.017, 0.014, 0.011, 0.25));
    const mano = mallaHueso(new THREE.BoxGeometry(0.022, 0.085, 0.062));

    g.add(clavicula, hombro, humero, codo, antebrazo, mano);
    return { g, clavicula, hombro, humero, codo, antebrazo, mano };
  }

  const brazoIzqOseo = crearBrazoOseo(-1);
  const brazoDerOseo = crearBrazoOseo(1);

  // Extremidades inferiores (fémur, rótula, tibia/peroné, pie)
  function crearPiernaOsea() {
    const g = new THREE.Group();
    const cadera = mallaHueso(new THREE.SphereGeometry(0.032, 18, 18), materialArticulacion);
    const femur = mallaHueso(crearHuesoOrganico(0.028, 0.022, 0.026, 0.41));
    const rodilla = mallaHueso(new THREE.SphereGeometry(0.025, 18, 18), materialArticulacion);
    const tibia = mallaHueso(crearHuesoOrganico(0.024, 0.017, 0.015, 0.40));
    const pie = mallaHueso(new THREE.BoxGeometry(0.065, 0.036, 0.19));

    g.add(cadera, femur, rodilla, tibia, pie);
    return { g, cadera, femur, rodilla, tibia, pie };
  }

  const piernaIzqOsea = crearPiernaOsea();
  const piernaDerOsea = crearPiernaOsea();

  group.add(
    craneoGrupo,
    columnaLumbar,
    columnaDorsal,
    toraxGrupo,
    pelvisGrupo,
    brazoIzqOseo.g,
    brazoDerOseo.g,
    piernaIzqOsea.g,
    piernaDerOsea.g
  );

  const anclajes = {
    pelvis: new THREE.Vector3(),
    torax: new THREE.Vector3(),
    craneo: new THREE.Vector3(),
    hombroIzq: new THREE.Vector3(),
    codoIzq: new THREE.Vector3(),
    hombroDer: new THREE.Vector3(),
    codoDer: new THREE.Vector3(),
    caderaIzq: new THREE.Vector3(),
    rodillaIzq: new THREE.Vector3(),
    caderaDer: new THREE.Vector3(),
    rodillaDer: new THREE.Vector3()
  };

  function actualizar(params = {}) {
    const estaturaCm = params.estaturaCm ?? 175;
    const anchoHombros = params.anchoHombros ?? 1.0;
    const anchoCadera = params.anchoCadera ?? 1.0;
    const escoliosisDeg = params.escoliosisDeg ?? params.desviacionColumnaDeg ?? 0;
    const cifosisDeg = params.cifosisDeg ?? 0;
    const hombrosAdelantadosDeg = params.hombrosAdelantadosDeg ?? 0;

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

    function posicionarPierna(p, signo) {
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

      p.pie.scale.set(1, escalaAltura, escalaAltura);
      p.pie.position.set(x, 0.018 * escalaAltura, 0.045 * escalaAltura);
    }

    posicionarPierna(piernaIzqOsea, -1);
    posicionarPierna(piernaDerOsea, 1);
    anclajes.caderaIzq.copy(piernaIzqOsea.cadera.position);
    anclajes.rodillaIzq.copy(piernaIzqOsea.rodilla.position);
    anclajes.caderaDer.copy(piernaDerOsea.cadera.position);
    anclajes.rodillaDer.copy(piernaDerOsea.rodilla.position);

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

    function posicionarBrazo(b, signo) {
      const xHombro = dxTorax + signo * 0.195 * anchoHombros;
      b.clavicula.scale.set(anchoHombros, escalaAltura, escalaAltura);
      b.clavicula.position.set(dxTorax + signo * 0.095 * anchoHombros, yHombro + 0.012 * escalaAltura, dzHombro + 0.035);

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

      b.mano.scale.setScalar(escalaAltura);
      b.mano.rotation.z = -signo * angAnt;
      b.mano.rotation.x = protraccionRad * 0.4;
      b.mano.position.set(
        xCodo + signo * Math.sin(angAnt) * (segAnt + 0.04 * escalaAltura),
        yCodo - Math.cos(angAnt) * (segAnt + 0.04 * escalaAltura),
        zCodo + Math.sin(protraccionRad * 0.4) * (segAnt * 0.75)
      );
    }

    posicionarBrazo(brazoIzqOseo, -1);
    posicionarBrazo(brazoDerOseo, 1);
    anclajes.hombroIzq.copy(brazoIzqOseo.hombro.position);
    anclajes.codoIzq.copy(brazoIzqOseo.codo.position);
    anclajes.hombroDer.copy(brazoDerOseo.hombro.position);
    anclajes.codoDer.copy(brazoDerOseo.codo.position);
  }

  actualizar();
  return { group, anclajes, actualizar };
}