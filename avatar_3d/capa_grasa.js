// ============================================================================
// VISAGELAB - CAPA 3: GRASA HUMANA ORGÁNICA
// ============================================================================
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.158.0/build/three.module.js";

function crearContornoAdiposo(radiosYAlturas, segRadial = 26, segCurva = 22) {
  const puntos = radiosYAlturas.map(([r, y]) => new THREE.Vector2(r, y));
  const curva = new THREE.SplineCurve(puntos);
  const geo = new THREE.LatheGeometry(curva.getPoints(segCurva), segRadial);
  geo.computeVertexNormals();
  return geo;
}

export function crearCapaGrasa() {
  const group = new THREE.Group();
  group.name = "CapaGrasa";

  const materialGrasa = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#e8c366"),
    roughness: 0.60,
    metalness: 0.02,
    transparent: true,
    opacity: 0.86
  });

  function mallaGrasa(geo) {
    const m = new THREE.Mesh(geo, materialGrasa);
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  }

  const troncoGrasa = mallaGrasa(
    crearContornoAdiposo([
      [0.001, -0.26],
      [0.145, -0.22],
      [0.168, -0.10],
      [0.152, 0.02],
      [0.188, 0.14],
      [0.212, 0.24],
      [0.001, 0.27]
    ])
  );
  troncoGrasa.scale.set(1.08, 1.0, 0.86);

  const gluteoIzq = mallaGrasa(new THREE.SphereGeometry(0.085, 22, 18));
  gluteoIzq.scale.set(1.0, 0.92, 1.12);

  const gluteoDer = mallaGrasa(new THREE.SphereGeometry(0.085, 22, 18));
  gluteoDer.scale.set(1.0, 0.92, 1.12);

  function crearBrazoGrasa() {
    const brazo = mallaGrasa(
      crearContornoAdiposo([
        [0.001, -0.14],
        [0.044, -0.11],
        [0.056, -0.02],
        [0.062, 0.08],
        [0.046, 0.13],
        [0.001, 0.15]
      ])
    );
    const antebrazo = mallaGrasa(
      crearContornoAdiposo([
        [0.001, -0.125],
        [0.032, -0.11],
        [0.046, -0.03],
        [0.050, 0.08],
        [0.038, 0.12],
        [0.001, 0.13]
      ])
    );
    group.add(brazo, antebrazo);
    return { brazo, antebrazo };
  }

  const brazoIzqGrasa = crearBrazoGrasa();
  const brazoDerGrasa = crearBrazoGrasa();

  function crearPiernaGrasa() {
    const muslo = mallaGrasa(
      crearContornoAdiposo([
        [0.001, -0.205],
        [0.064, -0.18],
        [0.082, -0.06],
        [0.098, 0.08],
        [0.104, 0.18],
        [0.001, 0.21]
      ])
    );
    muslo.scale.set(1.02, 1.0, 1.08);

    const pantorrilla = mallaGrasa(
      crearContornoAdiposo([
        [0.001, -0.20],
        [0.038, -0.17],
        [0.066, -0.05],
        [0.058, 0.08],
        [0.056, 0.18],
        [0.001, 0.205]
      ])
    );
    pantorrilla.scale.set(0.96, 1.0, 1.12);

    group.add(muslo, pantorrilla);
    return { muslo, pantorrilla };
  }

  const piernaIzqGrasa = crearPiernaGrasa();
  const piernaDerGrasa = crearPiernaGrasa();

  group.add(troncoGrasa, gluteoIzq, gluteoDer);

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
    const altoTobillo = 0.04 * escalaAltura;
    const largoPiernaM = ((params.largoPiernaCm ?? 84) / 84) * 0.81 * escalaAltura;
    const segPierna = largoPiernaM * 0.5;
    const yCadera = params.anclajes?.pelvis?.y ?? (altoTobillo + largoPiernaM);

    const grasaTotalPct = params.grasaTotalPct ?? 18;
    const grasaSuperiorPct = params.grasaSuperiorPct ?? 15;
    const grasaTroncoPct = params.grasaTroncoPct ?? 20;
    const grasaInferiorPct = params.grasaInferiorPct ?? 18;

    const fTotal = 0.76 + (grasaTotalPct / 100) * 0.95;
    const fSup = (0.78 + (grasaSuperiorPct / 100) * 1.0) * (0.88 + fTotal * 0.12);
    const fTronco = (0.78 + (grasaTroncoPct / 100) * 1.1) * (0.88 + fTotal * 0.12);
    const fInf = (0.78 + (grasaInferiorPct / 100) * 1.05) * (0.88 + fTotal * 0.12);

    const cinturaCm = params.cinturaCm ?? 80;
    const pechoCm = params.pechoCm ?? 100;
    const bicepsCm = params.bicepsCm ?? 35;
    const largoBrazoM = ((params.largoBrazoCm ?? 60) / 60) * 0.53 * escalaAltura;
    const musloCm = params.musloCm ?? 56;

    const fCintura = cinturaCm / 80;
    const fPecho = pechoCm / 100;
    const fBiceps = bicepsCm / 35;
    const fMuslo = musloCm / 56;

    const dxTronco = Math.sin(escolRad * 0.65) * 0.16 * escalaAltura;
    const yTronco = yCadera + 0.25 * escalaAltura;
    const dzTronco = Math.sin(cifoRad * 0.65) * 0.11 * escalaAltura;

    const anchoTronco = ((anchoHombros * fPecho + anchoCadera * fCintura) * 0.5) * fTronco;
    troncoGrasa.scale.set(1.08 * anchoTronco, escalaAltura, 0.88 * anchoTronco);
    troncoGrasa.position.set(dxTronco, yTronco, dzTronco);
    troncoGrasa.rotation.set(cifoRad * 0.65, 0, -escolRad * 0.65);

    const sepPierna = 0.102 * anchoCadera;
    const sGlut = anchoCadera * fInf * (0.85 + fCintura * 0.15) * escalaAltura;
    gluteoIzq.scale.set(sGlut, 0.92 * sGlut, 1.12 * sGlut);
    gluteoIzq.position.set(-sepPierna * 0.9, yCadera - 0.02 * escalaAltura, -0.055 * sGlut);

    gluteoDer.scale.set(sGlut, 0.92 * sGlut, 1.12 * sGlut);
    gluteoDer.position.set(sepPierna * 0.9, yCadera - 0.02 * escalaAltura, -0.055 * sGlut);

    const segBrazo = largoBrazoM * 0.53;
    const segAnt = largoBrazoM * 0.47;
    const angAbertura = 0.18;
    const dxTorax = params.anclajes?.torax?.x ?? (Math.sin(escolRad) * 0.25 * escalaAltura);
    const yTorax = params.anclajes?.torax?.y ?? (yCadera + 0.39 * escalaAltura);
    const dzTorax = params.anclajes?.torax?.z ?? (Math.sin(cifoRad) * 0.18 * escalaAltura);

    function posicionarBrazoGrasa(b, signo, anclaHombro) {
      const xHombro = anclaHombro?.x ?? (dxTorax + signo * 0.195 * anchoHombros);
      const yHombro = anclaHombro?.y ?? (yCadera + 0.49 * escalaAltura);
      const zHombro = anclaHombro?.z ?? (dzTorax + Math.sin(protraccionRad) * 0.14 * escalaAltura);

      const cx1 = xHombro + signo * Math.sin(angAbertura) * (segBrazo * 0.5);
      const cy1 = yHombro - Math.cos(angAbertura) * (segBrazo * 0.5);
      const cz1 = zHombro + Math.sin(protraccionRad * 0.65) * (segBrazo * 0.4);

      const gBrazo = fSup * (0.82 + fBiceps * 0.18);
      b.brazo.scale.set(gBrazo, segBrazo / 0.29, gBrazo);
      b.brazo.position.set(cx1, cy1, cz1);
      b.brazo.rotation.set(protraccionRad * 0.65, 0, -signo * angAbertura);

      const xCodo = xHombro + signo * Math.sin(angAbertura) * segBrazo;
      const yCodo = yHombro - Math.cos(angAbertura) * segBrazo;
      const zCodo = zHombro + Math.sin(protraccionRad * 0.65) * (segBrazo * 0.8);
      const angAnt = angAbertura + 0.06;

      const cx2 = xCodo + signo * Math.sin(angAnt) * (segAnt * 0.5);
      const cy2 = yCodo - Math.cos(angAnt) * (segAnt * 0.5);
      const cz2 = zCodo + Math.sin(protraccionRad * 0.4) * (segAnt * 0.4);

      const gAnt = gBrazo * 0.92;
      b.antebrazo.scale.set(gAnt, segAnt / 0.255, gAnt);
      b.antebrazo.position.set(cx2, cy2, cz2);
      b.antebrazo.rotation.set(protraccionRad * 0.4, 0, -signo * angAnt);
    }

    posicionarBrazoGrasa(brazoIzqGrasa, -1, params.anclajes?.hombroIzq);
    posicionarBrazoGrasa(brazoDerGrasa, 1, params.anclajes?.hombroDer);

    const gMuslo = fInf * (0.82 + fMuslo * 0.18);
    const gPant = gMuslo * 0.80;

    function posicionarPiernaGrasa(p, signo, anclaCadera) {
      const xPos = anclaCadera?.x ?? (signo * sepPierna);
      p.muslo.scale.set(1.02 * gMuslo, segPierna / 0.415, 1.08 * gMuslo);
      p.muslo.position.set(xPos, altoTobillo + segPierna * 1.5, 0.012);

      p.pantorrilla.scale.set(0.96 * gPant, segPierna / 0.405, 1.12 * gPant);
      p.pantorrilla.position.set(xPos, altoTobillo + segPierna * 0.5, -0.005);
    }

    posicionarPiernaGrasa(piernaIzqGrasa, -1, params.anclajes?.caderaIzq);
    posicionarPiernaGrasa(piernaDerGrasa, 1, params.anclajes?.caderaDer);
  }

  actualizar();
  return { group, actualizar };
}