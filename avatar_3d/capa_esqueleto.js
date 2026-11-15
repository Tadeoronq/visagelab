// ============================================================================
// VISAGELAB - CAPA 1: ESTRUCTURA DEL ESQUELETO
// Módulo independiente para postura base estática y futuras integraciones
// ============================================================================
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.158.0/build/three.module.js";

/**
 * Crea la Capa 1 (Esqueleto) con soporte para parámetros posturales
 * (escoliosis, cifosis, hombros adelantados) y puntos de anclaje para las
 * siguientes capas (músculo, grasa, piel) y futura integración de datos.
 */
export function crearCapaEsqueleto() {
  // ==========================================================================
  // BLOQUE 1: GRUPO, MATERIAL ÓSEO Y HELPERS GEOMÉTRICOS
  // ==========================================================================
  const group = new THREE.Group();
  group.name = "CapaEsqueleto";

  const materialHueso = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#ece7dc"),
    roughness: 0.36,
    metalness: 0.05
  });

  function crearSegmentoOseo(radioSuperior, radioInferior, largo, segmentos = 18) {
    const geometria = new THREE.CylinderGeometry(radioSuperior, radioInferior, largo, segmentos);
    const malla = new THREE.Mesh(geometria, materialHueso);
    malla.castShadow = true;
    malla.receiveShadow = true;
    return malla;
  }

  function crearArticulacion(radio, segmentos = 16) {
    const geometria = new THREE.SphereGeometry(radio, segmentos, segmentos);
    const malla = new THREE.Mesh(geometria, materialHueso);
    malla.castShadow = true;
    malla.receiveShadow = true;
    return malla;
  }

  // ==========================================================================
  // BLOQUE 2: ESTRUCTURA ÓSEA BASE Y PUNTOS DE ANCLAJE
  // ==========================================================================
  const craneo = crearArticulacion(0.095, 22);
  const pelvis = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.11, 0.14), materialHueso);
  pelvis.castShadow = true;
  pelvis.receiveShadow = true;

  // Columna (lumbar y dorsal) y caja torácica
  const columnaLumbar = crearSegmentoOseo(0.024, 0.030, 0.24);
  const columnaDorsal = crearSegmentoOseo(0.020, 0.025, 0.30);
  const torax = crearSegmentoOseo(0.145, 0.115, 0.25);

  // Extremidades superiores
  const hombroIzq = crearArticulacion(0.026);
  const humeroIzq = crearSegmentoOseo(0.021, 0.017, 0.28);
  const codoIzq = crearArticulacion(0.020);
  const antebrazoIzq = crearSegmentoOseo(0.017, 0.013, 0.26);

  const hombroDer = crearArticulacion(0.026);
  const humeroDer = crearSegmentoOseo(0.021, 0.017, 0.28);
  const codoDer = crearArticulacion(0.020);
  const antebrazoDer = crearSegmentoOseo(0.017, 0.013, 0.26);

  // Extremidades inferiores
  const caderaIzq = crearArticulacion(0.032);
  const femurIzq = crearSegmentoOseo(0.029, 0.023, 0.42);
  const rodillaIzq = crearArticulacion(0.026);
  const tibiaIzq = crearSegmentoOseo(0.023, 0.017, 0.42);

  const caderaDer = crearArticulacion(0.032);
  const femurDer = crearSegmentoOseo(0.029, 0.023, 0.42);
  const rodillaDer = crearArticulacion(0.026);
  const tibiaDer = crearSegmentoOseo(0.023, 0.017, 0.42);

  group.add(
    craneo,
    pelvis,
    columnaLumbar,
    columnaDorsal,
    torax,
    hombroIzq,
    humeroIzq,
    codoIzq,
    antebrazoIzq,
    hombroDer,
    humeroDer,
    codoDer,
    antebrazoDer,
    caderaIzq,
    femurIzq,
    rodillaIzq,
    tibiaIzq,
    caderaDer,
    femurDer,
    rodillaDer,
    tibiaDer
  );

  // Puntos de referencia para acoplar músculo, grasa y piel en las siguientes capas
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

  // ==========================================================================
  // BLOQUE 3: ACTUALIZACIÓN DE PROPORCIONES Y ALTERACIONES POSTURALES
  // ==========================================================================
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

    // Base apoyada sobre y = 0
    const margenTobillo = 0.03 * escalaAltura;
    const largoSegmentoPierna = 0.42 * escalaAltura;
    const yCadera = margenTobillo + largoSegmentoPierna * 2;
    const yRodilla = margenTobillo + largoSegmentoPierna;

    // Pelvis y piernas
    pelvis.scale.set(anchoCadera, escalaAltura, anchoCadera);
    pelvis.position.set(0, yCadera, 0);
    anclajes.pelvis.copy(pelvis.position);

    const sepPierna = 0.105 * anchoCadera;

    caderaIzq.scale.setScalar(escalaAltura);
    caderaIzq.position.set(-sepPierna, yCadera, 0);
    anclajes.caderaIzq.copy(caderaIzq.position);

    femurIzq.scale.set(1, escalaAltura, 1);
    femurIzq.position.set(-sepPierna, yCadera - largoSegmentoPierna * 0.5, 0);

    rodillaIzq.scale.setScalar(escalaAltura);
    rodillaIzq.position.set(-sepPierna, yRodilla, 0);
    anclajes.rodillaIzq.copy(rodillaIzq.position);

    tibiaIzq.scale.set(1, escalaAltura, 1);
    tibiaIzq.position.set(-sepPierna, margenTobillo + largoSegmentoPierna * 0.5, 0);

    caderaDer.scale.setScalar(escalaAltura);
    caderaDer.position.set(sepPierna, yCadera, 0);
    anclajes.caderaDer.copy(caderaDer.position);

    femurDer.scale.set(1, escalaAltura, 1);
    femurDer.position.set(sepPierna, yCadera - largoSegmentoPierna * 0.5, 0);

    rodillaDer.scale.setScalar(escalaAltura);
    rodillaDer.position.set(sepPierna, yRodilla, 0);
    anclajes.rodillaDer.copy(rodillaDer.position);

    tibiaDer.scale.set(1, escalaAltura, 1);
    tibiaDer.position.set(sepPierna, margenTobillo + largoSegmentoPierna * 0.5, 0);

    // Columna lumbar, columna dorsal, tórax y cráneo
    const largoLumbar = 0.24 * escalaAltura;
    const largoDorsal = 0.30 * escalaAltura;

    const dxLumbar = Math.sin(escolRad * 0.5) * (largoLumbar * 0.5);
    const dzLumbar = Math.sin(cifoRad * 0.35) * (largoLumbar * 0.5);
    columnaLumbar.scale.set(1, escalaAltura, 1);
    columnaLumbar.position.set(dxLumbar, yCadera + largoLumbar * 0.5, -0.035 + dzLumbar);
    columnaLumbar.rotation.z = -escolRad * 0.5;
    columnaLumbar.rotation.x = cifoRad * 0.35;

    const xBaseDorsal = Math.sin(escolRad * 0.5) * largoLumbar;
    const zBaseDorsal = -0.035 + Math.sin(cifoRad * 0.35) * largoLumbar;
    columnaDorsal.scale.set(1, escalaAltura, 1);
    columnaDorsal.position.set(
      xBaseDorsal + Math.sin(escolRad) * (largoDorsal * 0.5),
      yCadera + largoLumbar + largoDorsal * 0.5,
      zBaseDorsal + Math.sin(cifoRad) * (largoDorsal * 0.5)
    );
    columnaDorsal.rotation.z = -escolRad;
    columnaDorsal.rotation.x = cifoRad;

    const dxTorax = xBaseDorsal + Math.sin(escolRad) * (largoDorsal * 0.65);
    const yTorax = yCadera + 0.39 * escalaAltura;
    const dzTorax = zBaseDorsal + Math.sin(cifoRad) * (largoDorsal * 0.65) + 0.035;

    torax.scale.set(anchoHombros, escalaAltura, anchoHombros * 0.9);
    torax.position.set(dxTorax, yTorax, dzTorax);
    torax.rotation.z = -escolRad;
    torax.rotation.x = cifoRad;
    anclajes.torax.copy(torax.position);

    const dxCabeza = dxTorax + Math.sin(escolRad) * (0.28 * escalaAltura);
    const yCabeza = yCadera + 0.69 * escalaAltura;
    const dzCabeza = dzTorax + Math.sin(cifoRad) * (0.20 * escalaAltura);

    craneo.scale.setScalar(escalaAltura);
    craneo.position.set(dxCabeza, yCabeza, dzCabeza);
    craneo.rotation.z = -escolRad;
    craneo.rotation.x = cifoRad * 0.7;
    anclajes.craneo.copy(craneo.position);

    // Extremidades superiores y protracción de hombros
    const yHombro = yCadera + 0.49 * escalaAltura;
    const dzHombro = dzTorax + Math.sin(protraccionRad) * (0.14 * escalaAltura);
    const xHombroIzq = dxTorax - 0.19 * anchoHombros;
    const xHombroDer = dxTorax + 0.19 * anchoHombros;

    const angAbertura = 0.22;
    const segBrazo = 0.28 * escalaAltura;
    const segAnt = 0.26 * escalaAltura;

    hombroIzq.scale.setScalar(escalaAltura);
    hombroIzq.position.set(xHombroIzq, yHombro, dzHombro);
    anclajes.hombroIzq.copy(hombroIzq.position);

    humeroIzq.scale.set(1, escalaAltura, 1);
    humeroIzq.rotation.z = -angAbertura;
    humeroIzq.rotation.x = protraccionRad * 0.65;
    humeroIzq.position.set(
      xHombroIzq - Math.sin(angAbertura) * (segBrazo * 0.5),
      yHombro - Math.cos(angAbertura) * (segBrazo * 0.5),
      dzHombro + Math.sin(protraccionRad * 0.65) * (segBrazo * 0.4)
    );

    const xCodoIzq = xHombroIzq - Math.sin(angAbertura) * segBrazo;
    const yCodoIzq = yHombro - Math.cos(angAbertura) * segBrazo;
    const zCodoIzq = dzHombro + Math.sin(protraccionRad * 0.65) * (segBrazo * 0.8);

    codoIzq.scale.setScalar(escalaAltura);
    codoIzq.position.set(xCodoIzq, yCodoIzq, zCodoIzq);
    anclajes.codoIzq.copy(codoIzq.position);

    const angAntIzq = angAbertura + 0.08;
    antebrazoIzq.scale.set(1, escalaAltura, 1);
    antebrazoIzq.rotation.z = -angAntIzq;
    antebrazoIzq.rotation.x = protraccionRad * 0.4;
    antebrazoIzq.position.set(
      xCodoIzq - Math.sin(angAntIzq) * (segAnt * 0.5),
      yCodoIzq - Math.cos(angAntIzq) * (segAnt * 0.5),
      zCodoIzq + Math.sin(protraccionRad * 0.4) * (segAnt * 0.4)
    );

    hombroDer.scale.setScalar(escalaAltura);
    hombroDer.position.set(xHombroDer, yHombro, dzHombro);
    anclajes.hombroDer.copy(hombroDer.position);

    humeroDer.scale.set(1, escalaAltura, 1);
    humeroDer.rotation.z = angAbertura;
    humeroDer.rotation.x = protraccionRad * 0.65;
    humeroDer.position.set(
      xHombroDer + Math.sin(angAbertura) * (segBrazo * 0.5),
      yHombro - Math.cos(angAbertura) * (segBrazo * 0.5),
      dzHombro + Math.sin(protraccionRad * 0.65) * (segBrazo * 0.4)
    );

    const xCodoDer = xHombroDer + Math.sin(angAbertura) * segBrazo;
    const yCodoDer = yHombro - Math.cos(angAbertura) * segBrazo;
    const zCodoDer = dzHombro + Math.sin(protraccionRad * 0.65) * (segBrazo * 0.8);

    codoDer.scale.setScalar(escalaAltura);
    codoDer.position.set(xCodoDer, yCodoDer, zCodoDer);
    anclajes.codoDer.copy(codoDer.position);

    const angAntDer = angAbertura + 0.08;
    antebrazoDer.scale.set(1, escalaAltura, 1);
    antebrazoDer.rotation.z = angAntDer;
    antebrazoDer.rotation.x = protraccionRad * 0.4;
    antebrazoDer.position.set(
      xCodoDer + Math.sin(angAntDer) * (segAnt * 0.5),
      yCodoDer - Math.cos(angAntDer) * (segAnt * 0.5),
      zCodoDer + Math.sin(protraccionRad * 0.4) * (segAnt * 0.4)
    );
  }

  actualizar();

  return { group, anclajes, actualizar };
}