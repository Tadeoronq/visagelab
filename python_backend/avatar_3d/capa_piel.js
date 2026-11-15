// ============================================================================
// VISAGELAB - CAPA 4: PIEL
// Módulo independiente para silueta externa, tono de piel y translucidez
// ============================================================================
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.158.0/build/three.module.js";

/**
 * Crea la Capa 4 (Piel) acoplada a los puntos de anclaje de la Capa 1
 * (Esqueleto) y configurable por color de piel, morfología, composición
 * y medidas antropométricas.
 */
export function crearCapaPiel() {
  // ==========================================================================
  // BLOQUE 1: GRUPO PRINCIPAL, MATERIAL CUTÁNEO Y HELPERS GEOMÉTRICOS
  // ==========================================================================
  const group = new THREE.Group();
  group.name = "CapaPiel";

  const materialPiel = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#d6a37c"),
    roughness: 0.54,
    metalness: 0.04,
    transparent: true,
    opacity: 1.0
  });

  function crearSegmentoCutaneo(rTop, rBot, largo, segmentos = 20) {
    const geometria = new THREE.CylinderGeometry(rTop, rBot, largo, segmentos);
    const malla = new THREE.Mesh(geometria, materialPiel);
    malla.castShadow = true;
    malla.receiveShadow = true;
    return malla;
  }

  // ==========================================================================
  // BLOQUE 2: SILUETA CUTÁNEA DEL CUERPO EN POSTURA BASE ESTÁTICA
  // ==========================================================================
  const cabeza = new THREE.Mesh(new THREE.SphereGeometry(0.115, 24, 24), materialPiel);
  cabeza.castShadow = true;
  cabeza.receiveShadow = true;

  const cuello = crearSegmentoCutaneo(0.056, 0.066, 0.11);
  const torso = crearSegmentoCutaneo(0.215, 0.155, 0.30);
  const abdomen = crearSegmentoCutaneo(0.160, 0.150, 0.24);
  const pelvis = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.15, 0.18), materialPiel);
  pelvis.castShadow = true;
  pelvis.receiveShadow = true;

  // Extremidades superiores
  const brazoIzq = crearSegmentoCutaneo(0.060, 0.052, 0.28);
  const antebrazoIzq = crearSegmentoCutaneo(0.050, 0.040, 0.26);

  const brazoDer = crearSegmentoCutaneo(0.060, 0.052, 0.28);
  const antebrazoDer = crearSegmentoCutaneo(0.050, 0.040, 0.26);

  // Extremidades inferiores
  const musloIzq = crearSegmentoCutaneo(0.098, 0.070, 0.42);
  const pantorrillaIzq = crearSegmentoCutaneo(0.068, 0.046, 0.42);

  const musloDer = crearSegmentoCutaneo(0.098, 0.070, 0.42);
  const pantorrillaDer = crearSegmentoCutaneo(0.068, 0.046, 0.42);

  group.add(
    cabeza,
    cuello,
    torso,
    abdomen,
    pelvis,
    brazoIzq,
    antebrazoIzq,
    brazoDer,
    antebrazoDer,
    musloIzq,
    pantorrillaIzq,
    musloDer,
    pantorrillaDer
  );

  // ==========================================================================
  // BLOQUE 3: ACTUALIZACIÓN DE SILUETA Y ACABADO CUTÁNEO
  // ==========================================================================
  /**
   * Actualiza la capa de piel en postura base estática.
   *
   * @param {Object} params
   * @param {Object} [params.anclajes] - Puntos de anclaje devueltos por crearCapaEsqueleto()
   * @param {string} [params.colorPiel="#d6a37c"] - Color hexadecimal de la piel
   * @param {boolean} [params.translucida=false] - Si es true, reduce opacidad para ver capas internas
   * @param {string} [params.sexo="masculino"] - "masculino" | "femenino"
   * @param {string} [params.morfologia="mesomorfo"] - "ectomorfo" | "mesomorfo" | "endomorfo"
   * @param {number} [params.pesoKg=75]
   * @param {number} [params.estaturaCm=175]
   * @param {number} [params.anchoHombros=1.0]
   * @param {number} [params.anchoCadera=1.0]
   * @param {number} [params.escoliosisDeg=0]
   * @param {number} [params.cifosisDeg=0]
   * @param {number} [params.hombrosAdelantadosDeg=0]
   * @param {number} [params.grasaTotalPct=18]
   * @param {number} [params.grasaSuperiorPct=15]
   * @param {number} [params.grasaTroncoPct=20]
   * @param {number} [params.grasaInferiorPct=18]
   * @param {number} [params.bicepsCm=35]
   * @param {number} [params.largoBrazoCm=60]
   * @param {number} [params.pechoCm=100]
   * @param {number} [params.cinturaCm=80]
   * @param {number} [params.musloCm=56]
   * @param {number} [params.largoPiernaCm=84]
   */
  function actualizar(params = {}) {
    const colorPiel = params.colorPiel ?? "#d6a37c";
    const translucida = Boolean(params.translucida ?? false);
    materialPiel.color.set(colorPiel);
    materialPiel.opacity = translucida ? 0.34 : 1.0;
    materialPiel.depthWrite = !translucida;

    const sexo = params.sexo ?? "masculino";
    const morfologia = params.morfologia ?? "mesomorfo";
    const pesoKg = params.pesoKg ?? 75;
    const estaturaCm = params.estaturaCm ?? 175;
    const anchoHombros = params.anchoHombros ?? 1.0;
    const anchoCadera = params.anchoCadera ?? 1.0;

    const escoliosisDeg = params.escoliosisDeg ?? params.desviacionColumnaDeg ?? 0;
    const cifosisDeg = params.cifosisDeg ?? 0;
    const hombrosAdelantadosDeg = params.hombrosAdelantadosDeg ?? 0;

    const escolRad = THREE.MathUtils.degToRad(escoliosisDeg);
    const cifoRad = THREE.MathUtils.degToRad(cifosisDeg);
    const protraccionRad = THREE.MathUtils.degToRad(hombrosAdelantadosDeg);

    const esFemenino = sexo === "femenino";
    const factorMorfo =
      morfologia === "ectomorfo" ? 0.90 : (morfologia === "endomorfo" ? 1.12 : 1.0);
    const escalaAltura = estaturaCm / 175;
    const factorPeso = Math.cbrt(pesoKg / 75) * factorMorfo;

    const margenTobillo = 0.03 * escalaAltura;
    const largoPiernaM = ((params.largoPiernaCm ?? 84) / 84) * 0.84 * escalaAltura;
    const segPierna = largoPiernaM * 0.5;
    const yCadera = params.anclajes?.pelvis?.y ?? (margenTobillo + largoPiernaM * 2);

    const grasaTotalPct = params.grasaTotalPct ?? 18;
    const grasaSuperiorPct = params.grasaSuperiorPct ?? 15;
    const grasaTroncoPct = params.grasaTroncoPct ?? 20;
    const grasaInferiorPct = params.grasaInferiorPct ?? 18;

    const fGrasaTotal = 0.82 + (grasaTotalPct / 100) * 0.85;
    const fGrasaSup = (0.85 + (grasaSuperiorPct / 100) * 0.85) * (0.9 + fGrasaTotal * 0.1);
    const fGrasaTronco = (0.85 + (grasaTroncoPct / 100) * 0.95) * (0.9 + fGrasaTotal * 0.1);
    const fGrasaInf = (0.85 + (grasaInferiorPct / 100) * 0.90) * (0.9 + fGrasaTotal * 0.1);

    const pechoCm = params.pechoCm ?? 100;
    const cinturaCm = params.cinturaCm ?? 80;
    const bicepsCm = params.bicepsCm ?? 35;
    const largoBrazoM = ((params.largoBrazoCm ?? 60) / 60) * 0.54 * escalaAltura;
    const musloCm = params.musloCm ?? 56;

    const anchoCaderaFinal =
      (esFemenino ? 1.10 : 0.96) * anchoCadera * factorPeso * fGrasaInf * (0.85 + cinturaCm / 160);
    const anchoTorsoFinal =
      (esFemenino ? 0.88 : 1.04) * anchoHombros * factorPeso * fGrasaSup * (0.82 + pechoCm / 200);

    // Pelvis, abdomen y torso
    pelvis.scale.set(anchoCaderaFinal, escalaAltura, anchoCaderaFinal);
    pelvis.position.set(0, yCadera, 0);

    const dxAbdomen = Math.sin(escolRad * 0.5) * 0.11 * escalaAltura;
    const yAbdomen = yCadera + 0.14 * escalaAltura;
    const dzAbdomen = Math.sin(cifoRad * 0.35) * 0.08 * escalaAltura;
    const grosorAbdomen = anchoCaderaFinal * fGrasaTronco * (0.8 + cinturaCm / 200);

    abdomen.scale.set(grosorAbdomen, escalaAltura, grosorAbdomen);
    abdomen.position.set(dxAbdomen, yAbdomen, dzAbdomen);
    abdomen.rotation.set(cifoRad * 0.35, 0, -escolRad * 0.5);

    const dxTorax = params.anclajes?.torax?.x ?? (Math.sin(escolRad) * 0.26 * escalaAltura);
    const yTorax = params.anclajes?.torax?.y ?? (yCadera + 0.39 * escalaAltura);
    const dzTorax = params.anclajes?.torax?.z ?? (Math.sin(cifoRad) * 0.20 * escalaAltura);

    torso.scale.set(anchoTorsoFinal, escalaAltura, anchoTorsoFinal * fGrasaTronco);
    torso.position.set(dxTorax, yTorax, dzTorax);
    torso.rotation.set(cifoRad, 0, -escolRad);

    // Cuello y cabeza
    const dxCabeza = params.anclajes?.craneo?.x ?? (dxTorax + Math.sin(escolRad) * 0.12 * escalaAltura);
    const yCabeza = params.anclajes?.craneo?.y ?? (yCadera + 0.69 * escalaAltura);
    const dzCabeza = params.anclajes?.craneo?.z ?? (dzTorax + Math.sin(cifoRad) * 0.12 * escalaAltura);

    const grosorCuello = (esFemenino ? 0.85 : 1.05) * factorPeso;
    cuello.scale.set(grosorCuello, escalaAltura, grosorCuello);
    cuello.position.set(dxCabeza, yCadera + 0.56 * escalaAltura, dzCabeza);

    cabeza.scale.setScalar(escalaAltura * (0.95 + factorMorfo * 0.05));
    cabeza.position.set(dxCabeza, yCabeza, dzCabeza);
    cabeza.rotation.set(cifoRad * 0.7, 0, -escolRad);

    // Extremidades superiores
    const segBrazo = largoBrazoM * 0.52;
    const segAnt = largoBrazoM * 0.48;
    const angAbertura = 0.22;
    const grosorBrazo = (bicepsCm / 35) * fGrasaSup * factorPeso;

    function actualizarBrazoPiel(ladoSigno, anclaHombro, mBrazo, mAnt) {
      const xHombro = anclaHombro?.x ?? (dxTorax + ladoSigno * 0.19 * anchoTorsoFinal);
      const yHombro = anclaHombro?.y ?? (yCadera + 0.49 * escalaAltura);
      const zHombro = anclaHombro?.z ?? (dzTorax + Math.sin(protraccionRad) * 0.14 * escalaAltura);

      const cx1 = xHombro + ladoSigno * Math.sin(angAbertura) * (segBrazo * 0.5);
      const cy1 = yHombro - Math.cos(angAbertura) * (segBrazo * 0.5);
      const cz1 = zHombro + Math.sin(protraccionRad * 0.65) * (segBrazo * 0.4);

      mBrazo.scale.set(grosorBrazo, segBrazo / 0.28, grosorBrazo);
      mBrazo.position.set(cx1, cy1, cz1);
      mBrazo.rotation.set(protraccionRad * 0.65, 0, ladoSigno * angAbertura);

      const xCodo = xHombro + ladoSigno * Math.sin(angAbertura) * segBrazo;
      const yCodo = yHombro - Math.cos(angAbertura) * segBrazo;
      const zCodo = zHombro + Math.sin(protraccionRad * 0.65) * (segBrazo * 0.8);
      const angAnt = angAbertura + 0.08;

      const cx2 = xCodo + ladoSigno * Math.sin(angAnt) * (segAnt * 0.5);
      const cy2 = yCodo - Math.cos(angAnt) * (segAnt * 0.5);
      const cz2 = zCodo + Math.sin(protraccionRad * 0.4) * (segAnt * 0.4);

      const grosorAnt = grosorBrazo * 0.88;
      mAnt.scale.set(grosorAnt, segAnt / 0.26, grosorAnt);
      mAnt.position.set(cx2, cy2, cz2);
      mAnt.rotation.set(protraccionRad * 0.4, 0, ladoSigno * angAnt);
    }

    actualizarBrazoPiel(-1, params.anclajes?.hombroIzq, brazoIzq, antebrazoIzq);
    actualizarBrazoPiel(1, params.anclajes?.hombroDer, brazoDer, antebrazoDer);

    // Extremidades inferiores
    const sepPierna = 0.105 * anchoCaderaFinal;
    const grosorMuslo = (musloCm / 56) * fGrasaInf * factorPeso;
    const grosorPant = grosorMuslo * 0.76;

    function actualizarPiernaPiel(xDefault, anclaCadera, mMuslo, mPant) {
      const xPos = anclaCadera?.x ?? xDefault;
      const yMus = margenTobillo + segPierna * 1.5;
      const yPan = margenTobillo + segPierna * 0.5;

      mMuslo.scale.set(grosorMuslo, segPierna / 0.42, grosorMuslo);
      mMuslo.position.set(xPos, yMus, 0);

      mPant.scale.set(grosorPant, segPierna / 0.42, grosorPant);
      mPant.position.set(xPos, yPan, 0);
    }

    actualizarPiernaPiel(-sepPierna, params.anclajes?.caderaIzq, musloIzq, pantorrillaIzq);
    actualizarPiernaPiel(sepPierna, params.anclajes?.caderaDer, musloDer, pantorrillaDer);
  }

  actualizar();

  return { group, actualizar };
}