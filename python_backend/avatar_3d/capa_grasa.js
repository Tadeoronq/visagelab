// ============================================================================
// VISAGELAB - CAPA 3: GRASA
// Módulo independiente para tejido adiposo total y segmentario
// ============================================================================
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.158.0/build/three.module.js";

/**
 * Crea la Capa 3 (Grasa) acoplada a los puntos de anclaje de la Capa 1
 * (Esqueleto) y configurable por grasa total (%) y grasa segmentaria
 * (superior, tronco e inferior).
 */
export function crearCapaGrasa() {
  // ==========================================================================
  // BLOQUE 1: GRUPO PRINCIPAL, MATERIAL ADIPOSO Y HELPERS GEOMÉTRICOS
  // ==========================================================================
  const group = new THREE.Group();
  group.name = "CapaGrasa";

  const materialGrasa = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#e8c56b"),
    roughness: 0.62,
    metalness: 0.02,
    transparent: true,
    opacity: 0.88
  });

  function crearVolumenAdiposo(rTop, rBot, largo, segmentos = 18) {
    const geometria = new THREE.CylinderGeometry(rTop, rBot, largo, segmentos);
    const malla = new THREE.Mesh(geometria, materialGrasa);
    malla.castShadow = true;
    malla.receiveShadow = true;
    return malla;
  }

  // ==========================================================================
  // BLOQUE 2: DEPÓSITOS ADIPOSOS DEL TRONCO Y EXTREMIDADES
  // ==========================================================================
  // Tronco: cintura/abdomen adiposo, tórax superior y cadera/glúteo
  const grasaCintura = crearVolumenAdiposo(0.165, 0.155, 0.24);
  const grasaTorax = crearVolumenAdiposo(0.215, 0.165, 0.28);
  const grasaCadera = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.14, 0.18), materialGrasa);
  grasaCadera.castShadow = true;
  grasaCadera.receiveShadow = true;

  // Extremidades superiores: brazo y antebrazo adiposo
  const grasaBrazoIzq = crearVolumenAdiposo(0.058, 0.050, 0.27);
  const grasaAntebrazoIzq = crearVolumenAdiposo(0.048, 0.038, 0.25);

  const grasaBrazoDer = crearVolumenAdiposo(0.058, 0.050, 0.27);
  const grasaAntebrazoDer = crearVolumenAdiposo(0.048, 0.038, 0.25);

  // Extremidades inferiores: muslo y pantorrilla adiposos
  const grasaMusloIzq = crearVolumenAdiposo(0.095, 0.068, 0.41);
  const grasaPantorrillaIzq = crearVolumenAdiposo(0.066, 0.045, 0.40);

  const grasaMusloDer = crearVolumenAdiposo(0.095, 0.068, 0.41);
  const grasaPantorrillaDer = crearVolumenAdiposo(0.066, 0.045, 0.40);

  group.add(
    grasaCintura,
    grasaTorax,
    grasaCadera,
    grasaBrazoIzq,
    grasaAntebrazoIzq,
    grasaBrazoDer,
    grasaAntebrazoDer,
    grasaMusloIzq,
    grasaPantorrillaIzq,
    grasaMusloDer,
    grasaPantorrillaDer
  );

  // ==========================================================================
  // BLOQUE 3: ACTUALIZACIÓN DE VOLUMEN ADIPOSO ACOPLADA A POSTURA Y MEDIDAS
  // ==========================================================================
  /**
   * Actualiza la capa de grasa en postura base estática.
   *
   * @param {Object} params
   * @param {Object} [params.anclajes] - Puntos de anclaje devueltos por crearCapaEsqueleto()
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
   * @param {number} [params.cinturaCm=80]
   * @param {number} [params.pechoCm=100]
   * @param {number} [params.bicepsCm=35]
   * @param {number} [params.largoBrazoCm=60]
   * @param {number} [params.musloCm=56]
   * @param {number} [params.largoPiernaCm=84]
   */
  function actualizar(params = {}) {
    const estaturaCm = params.estaturaCm ?? 175;
    const anchoHombros = params.anchoHombros ?? 1.0;
    const anchoCadera = params.anchoCadera ?? 1.0;

    const escoliosisDeg = params.escoliosisDeg ?? params.desviacionColumnaDeg ?? 0;
    const cifosisDeg = params.cifosisDeg ?? 0;
    const hombrosAdelantadosDeg = params.hombrosAdelantadosDeg ?? 0;

    const escolRad = THREE.MathUtils.degToRad(escoliosisDeg);
    const cifoRad = THREE.MathUtils.degToRad(cifosisDeg);
    const protraccionRad = THREE.MathUtils.degToRad(hombrosAdelantadosDeg);

    const escalaAltura = estaturaCm / 175;
    const margenTobillo = 0.03 * escalaAltura;
    const largoPiernaM = ((params.largoPiernaCm ?? 84) / 84) * 0.84 * escalaAltura;
    const segPierna = largoPiernaM * 0.5;
    const yCadera = params.anclajes?.pelvis?.y ?? (margenTobillo + largoPiernaM * 2);

    // Porcentajes de grasa (total y segmentaria)
    const grasaTotalPct = params.grasaTotalPct ?? 18;
    const grasaSuperiorPct = params.grasaSuperiorPct ?? 15;
    const grasaTroncoPct = params.grasaTroncoPct ?? 20;
    const grasaInferiorPct = params.grasaInferiorPct ?? 18;

    const fTotal = 0.72 + (grasaTotalPct / 100) * 1.1;
    const fSup = (0.75 + (grasaSuperiorPct / 100) * 1.15) * (0.85 + fTotal * 0.15);
    const fTronco = (0.75 + (grasaTroncoPct / 100) * 1.25) * (0.85 + fTotal * 0.15);
    const fInf = (0.75 + (grasaInferiorPct / 100) * 1.2) * (0.85 + fTotal * 0.15);

    // Medidas de apoyo
    const cinturaCm = params.cinturaCm ?? 80;
    const pechoCm = params.pechoCm ?? 100;
    const bicepsCm = params.bicepsCm ?? 35;
    const largoBrazoM = ((params.largoBrazoCm ?? 60) / 60) * 0.54 * escalaAltura;
    const musloCm = params.musloCm ?? 56;

    const fCintura = cinturaCm / 80;
    const fPecho = pechoCm / 100;
    const fBiceps = bicepsCm / 35;
    const fMuslo = musloCm / 56;

    // Posiciones de referencia alineadas al esqueleto
    const dxTorax = params.anclajes?.torax?.x ?? (Math.sin(escolRad) * 0.26 * escalaAltura);
    const yTorax = params.anclajes?.torax?.y ?? (yCadera + 0.39 * escalaAltura);
    const dzTorax = params.anclajes?.torax?.z ?? (Math.sin(cifoRad) * 0.20 * escalaAltura);

    const dxCintura = Math.sin(escolRad * 0.5) * 0.11 * escalaAltura;
    const yCintura = yCadera + 0.14 * escalaAltura;
    const dzCintura = Math.sin(cifoRad * 0.35) * 0.08 * escalaAltura;

    // Tronco: cadera, cintura/abdomen y tórax superior
    grasaCadera.scale.set(
      anchoCadera * fInf * (0.85 + fCintura * 0.15),
      escalaAltura,
      anchoCadera * fInf * (0.85 + fCintura * 0.15)
    );
    grasaCadera.position.set(0, yCadera, 0);

    grasaCintura.scale.set(
      anchoCadera * fTronco * fCintura,
      escalaAltura,
      fTronco * fCintura
    );
    grasaCintura.position.set(dxCintura, yCintura, dzCintura);
    grasaCintura.rotation.set(cifoRad * 0.35, 0, -escolRad * 0.5);

    grasaTorax.scale.set(
      anchoHombros * fTronco * (0.85 + fPecho * 0.15),
      escalaAltura,
      anchoHombros * fTronco * (0.85 + fPecho * 0.15)
    );
    grasaTorax.position.set(dxTorax, yTorax, dzTorax);
    grasaTorax.rotation.set(cifoRad, 0, -escolRad);

    // Extremidades superiores
    const segBrazo = largoBrazoM * 0.52;
    const segAnt = largoBrazoM * 0.48;
    const angAbertura = 0.22;

    function actualizarBrazoGrasa(ladoSigno, anclaHombro, mBrazo, mAnt) {
      const xHombro = anclaHombro?.x ?? (dxTorax + ladoSigno * 0.19 * anchoHombros);
      const yHombro = anclaHombro?.y ?? (yCadera + 0.49 * escalaAltura);
      const zHombro = anclaHombro?.z ?? (dzTorax + Math.sin(protraccionRad) * 0.14 * escalaAltura);

      const cx1 = xHombro + ladoSigno * Math.sin(angAbertura) * (segBrazo * 0.5);
      const cy1 = yHombro - Math.cos(angAbertura) * (segBrazo * 0.5);
      const cz1 = zHombro + Math.sin(protraccionRad * 0.65) * (segBrazo * 0.4);

      const grosorBrazo = fSup * (0.82 + fBiceps * 0.18);
      mBrazo.scale.set(grosorBrazo, segBrazo / 0.27, grosorBrazo);
      mBrazo.position.set(cx1, cy1, cz1);
      mBrazo.rotation.set(protraccionRad * 0.65, 0, ladoSigno * angAbertura);

      const xCodo = xHombro + ladoSigno * Math.sin(angAbertura) * segBrazo;
      const yCodo = yHombro - Math.cos(angAbertura) * segBrazo;
      const zCodo = zHombro + Math.sin(protraccionRad * 0.65) * (segBrazo * 0.8);
      const angAnt = angAbertura + 0.08;

      const cx2 = xCodo + ladoSigno * Math.sin(angAnt) * (segAnt * 0.5);
      const cy2 = yCodo - Math.cos(angAnt) * (segAnt * 0.5);
      const cz2 = zCodo + Math.sin(protraccionRad * 0.4) * (segAnt * 0.4);

      const grosorAnt = grosorBrazo * 0.9;
      mAnt.scale.set(grosorAnt, segAnt / 0.25, grosorAnt);
      mAnt.position.set(cx2, cy2, cz2);
      mAnt.rotation.set(protraccionRad * 0.4, 0, ladoSigno * angAnt);
    }

    actualizarBrazoGrasa(-1, params.anclajes?.hombroIzq, grasaBrazoIzq, grasaAntebrazoIzq);
    actualizarBrazoGrasa(1, params.anclajes?.hombroDer, grasaBrazoDer, grasaAntebrazoDer);

    // Extremidades inferiores
    const sepPierna = 0.105 * anchoCadera;
    const grosorMuslo = fInf * (0.82 + fMuslo * 0.18);
    const grosorPant = grosorMuslo * 0.78;

    function actualizarPiernaGrasa(xDefault, anclaCadera, mMuslo, mPant) {
      const xPos = anclaCadera?.x ?? xDefault;
      const yMus = margenTobillo + segPierna * 1.5;
      const yPan = margenTobillo + segPierna * 0.5;

      mMuslo.scale.set(grosorMuslo, segPierna / 0.41, grosorMuslo);
      mMuslo.position.set(xPos, yMus, 0);

      mPant.scale.set(grosorPant, segPierna / 0.40, grosorPant);
      mPant.position.set(xPos, yPan, 0);
    }

    actualizarPiernaGrasa(-sepPierna, params.anclajes?.caderaIzq, grasaMusloIzq, grasaPantorrillaIzq);
    actualizarPiernaGrasa(sepPierna, params.anclajes?.caderaDer, grasaMusloDer, grasaPantorrillaDer);
  }

  actualizar();

  return { group, actualizar };
}