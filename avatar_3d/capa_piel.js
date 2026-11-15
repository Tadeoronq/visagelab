// ============================================================================
// VISAGELAB - CAPA 4: PIEL (SILUETA HUMANA COMPLETA ESCULPIDA)
// ============================================================================
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.158.0/build/three.module.js";

function crearPerfilTorneado(radiosYAlturas, segRadial = 32, segCurva = 28) {
  const puntos = radiosYAlturas.map(([r, y]) => new THREE.Vector2(r, y));
  const curva = new THREE.SplineCurve(puntos);
  const geo = new THREE.LatheGeometry(curva.getPoints(segCurva), segRadial);
  geo.computeVertexNormals();
  return geo;
}

export function crearCapaPiel() {
  const group = new THREE.Group();
  group.name = "CapaPiel";

  const materialPiel = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#d9a37a"),
    roughness: 0.56,
    metalness: 0.03,
    transparent: true,
    opacity: 1.0
  });

  function mallaPiel(geo) {
    const m = new THREE.Mesh(geo, materialPiel);
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  }

  // Cabeza esculpida
  const cabezaGrupo = new THREE.Group();
  const craneoPiel = mallaPiel(new THREE.SphereGeometry(0.112, 32, 28));
  craneoPiel.scale.set(0.88, 1.12, 1.04);

  const mandibulaPiel = mallaPiel(new THREE.SphereGeometry(0.082, 24, 20));
  mandibulaPiel.scale.set(0.84, 0.72, 0.96);
  mandibulaPiel.position.set(0, -0.056, 0.022);

  const nariz = mallaPiel(new THREE.ConeGeometry(0.017, 0.036, 14));
  nariz.rotation.x = Math.PI * 0.42;
  nariz.position.set(0, -0.012, 0.106);

  cabezaGrupo.add(craneoPiel, mandibulaPiel, nariz);

  // Cuello y torso humano con cintura, pecho y hombros
  const cuello = mallaPiel(
    crearPerfilTorneado([
      [0.001, -0.07],
      [0.068, -0.055],
      [0.056, 0.0],
      [0.052, 0.055],
      [0.001, 0.07]
    ], 26, 16)
  );
  cuello.scale.set(0.95, 1.0, 1.02);

  const torso = mallaPiel(
    crearPerfilTorneado([
      [0.001, -0.27],
      [0.155, -0.23],
      [0.176, -0.11],
      [0.156, 0.01],
      [0.198, 0.14],
      [0.222, 0.24],
      [0.001, 0.275]
    ], 36, 30)
  );
  torso.scale.set(1.12, 1.0, 0.86);

  const gluteoIzq = mallaPiel(new THREE.SphereGeometry(0.092, 24, 20));
  gluteoIzq.scale.set(1.0, 0.94, 1.14);
  const gluteoDer = mallaPiel(new THREE.SphereGeometry(0.092, 24, 20));
  gluteoDer.scale.set(1.0, 0.94, 1.14);

  // Brazos, antebrazos y manos anatómicas
  function crearBrazoPiel() {
    const hombro = mallaPiel(new THREE.SphereGeometry(0.054, 22, 20));
    hombro.scale.set(0.96, 1.04, 1.02);

    const brazo = mallaPiel(
      crearPerfilTorneado([
        [0.001, -0.145],
        [0.046, -0.115],
        [0.058, -0.02],
        [0.064, 0.08],
        [0.050, 0.135],
        [0.001, 0.15]
      ], 24, 18)
    );

    const antebrazo = mallaPiel(
      crearPerfilTorneado([
        [0.001, -0.13],
        [0.032, -0.115],
        [0.048, -0.03],
        [0.052, 0.08],
        [0.040, 0.12],
        [0.001, 0.13]
      ], 24, 18)
    );

    const mano = mallaPiel(new THREE.BoxGeometry(0.028, 0.092, 0.072));
    group.add(hombro, brazo, antebrazo, mano);
    return { hombro, brazo, antebrazo, mano };
  }

  const brazoIzqPiel = crearBrazoPiel();
  const brazoDerPiel = crearBrazoPiel();

  // Piernas y pies anatómicos
  function crearPiernaPiel() {
    const muslo = mallaPiel(
      crearPerfilTorneado([
        [0.001, -0.21],
        [0.066, -0.185],
        [0.085, -0.06],
        [0.102, 0.08],
        [0.108, 0.185],
        [0.001, 0.215]
      ], 28, 22)
    );
    muslo.scale.set(1.02, 1.0, 1.08);

    const pantorrilla = mallaPiel(
      crearPerfilTorneado([
        [0.001, -0.205],
        [0.039, -0.175],
        [0.068, -0.05],
        [0.060, 0.08],
        [0.058, 0.185],
        [0.001, 0.21]
      ], 28, 22)
    );
    pantorrilla.scale.set(0.96, 1.0, 1.12);

    const pie = mallaPiel(new THREE.BoxGeometry(0.076, 0.048, 0.215));
    group.add(muslo, pantorrilla, pie);
    return { muslo, pantorrilla, pie };
  }

  const piernaIzqPiel = crearPiernaPiel();
  const piernaDerPiel = crearPiernaPiel();

  group.add(cabezaGrupo, cuello, torso, gluteoIzq, gluteoDer);

  function actualizar(params = {}) {
    const colorPiel = params.colorPiel ?? "#d9a37a";
    const translucida = Boolean(params.translucida ?? false);
    materialPiel.color.set(colorPiel);
    materialPiel.opacity = translucida ? 0.36 : 1.0;
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

    const altoTobillo = 0.04 * escalaAltura;
    const largoPiernaM = ((params.largoPiernaCm ?? 84) / 84) * 0.81 * escalaAltura;
    const segPierna = largoPiernaM * 0.5;
    const yCadera = params.anclajes?.pelvis?.y ?? (altoTobillo + largoPiernaM);

    const grasaTotalPct = params.grasaTotalPct ?? 18;
    const grasaSuperiorPct = params.grasaSuperiorPct ?? 15;
    const grasaTroncoPct = params.grasaTroncoPct ?? 20;
    const grasaInferiorPct = params.grasaInferiorPct ?? 18;

    const fGrasaTotal = 0.84 + (grasaTotalPct / 100) * 0.78;
    const fGrasaSup = (0.86 + (grasaSuperiorPct / 100) * 0.80) * (0.9 + fGrasaTotal * 0.1);
    const fGrasaTronco = (0.86 + (grasaTroncoPct / 100) * 0.88) * (0.9 + fGrasaTotal * 0.1);
    const fGrasaInf = (0.86 + (grasaInferiorPct / 100) * 0.85) * (0.9 + fGrasaTotal * 0.1);

    const pechoCm = params.pechoCm ?? 100;
    const cinturaCm = params.cinturaCm ?? 80;
    const bicepsCm = params.bicepsCm ?? 35;
    const largoBrazoM = ((params.largoBrazoCm ?? 60) / 60) * 0.53 * escalaAltura;
    const musloCm = params.musloCm ?? 56;

    const anchoCaderaFinal =
      (esFemenino ? 1.12 : 0.96) * anchoCadera * factorPeso * fGrasaInf * (0.86 + cinturaCm / 170);
    const anchoTorsoFinal =
      (esFemenino ? 0.90 : 1.05) * anchoHombros * factorPeso * fGrasaSup * (0.84 + pechoCm / 210);

    const dxTronco = Math.sin(escolRad * 0.65) * 0.16 * escalaAltura;
    const yTronco = yCadera + 0.25 * escalaAltura;
    const dzTronco = Math.sin(cifoRad * 0.65) * 0.11 * escalaAltura;

    const anchoSiluetaTronco = ((anchoTorsoFinal + anchoCaderaFinal) * 0.5) * fGrasaTronco;
    torso.scale.set(1.12 * anchoSiluetaTronco, escalaAltura, 0.88 * anchoSiluetaTronco);
    torso.position.set(dxTronco, yTronco, dzTronco);
    torso.rotation.set(cifoRad * 0.65, 0, -escolRad * 0.65);

    const sepPierna = 0.102 * anchoCadera;
    const sGlut = anchoCaderaFinal * escalaAltura;
    gluteoIzq.scale.set(sGlut, 0.94 * sGlut, 1.14 * sGlut);
    gluteoIzq.position.set(-sepPierna * 0.92, yCadera - 0.02 * escalaAltura, -0.058 * sGlut);

    gluteoDer.scale.set(sGlut, 0.94 * sGlut, 1.14 * sGlut);
    gluteoDer.position.set(sepPierna * 0.92, yCadera - 0.02 * escalaAltura, -0.058 * sGlut);

    const dxTorax = params.anclajes?.torax?.x ?? (Math.sin(escolRad) * 0.25 * escalaAltura);
    const yTorax = params.anclajes?.torax?.y ?? (yCadera + 0.39 * escalaAltura);
    const dzTorax = params.anclajes?.torax?.z ?? (Math.sin(cifoRad) * 0.18 * escalaAltura);

    const dxCabeza = params.anclajes?.craneo?.x ?? (dxTorax + Math.sin(escolRad) * 0.12 * escalaAltura);
    const yCabeza = params.anclajes?.craneo?.y ?? (yCadera + 0.69 * escalaAltura);
    const dzCabeza = params.anclajes?.craneo?.z ?? (dzTorax + Math.sin(cifoRad) * 0.12 * escalaAltura) + 0.012;

    const gCuello = (esFemenino ? 0.85 : 1.04) * factorPeso;
    cuello.scale.set(0.95 * gCuello, escalaAltura, 1.02 * gCuello);
    cuello.position.set(dxCabeza, yCadera + 0.56 * escalaAltura, dzCabeza - 0.008);
    cuello.rotation.set(cifoRad * 0.6, 0, -escolRad);

    cabezaGrupo.scale.setScalar(escalaAltura * (0.96 + factorMorfo * 0.04));
    cabezaGrupo.position.set(dxCabeza, yCabeza, dzCabeza);
    cabezaGrupo.rotation.set(cifoRad * 0.7, 0, -escolRad);

    const segBrazo = largoBrazoM * 0.53;
    const segAnt = largoBrazoM * 0.47;
    const angAbertura = 0.18;
    const gBrazo = (bicepsCm / 35) * fGrasaSup * factorPeso;

    function posicionarBrazoPiel(b, signo, anclaHombro) {
      const xHombro = anclaHombro?.x ?? (dxTorax + signo * 0.195 * anchoTorsoFinal);
      const yHombro = anclaHombro?.y ?? (yCadera + 0.49 * escalaAltura);
      const zHombro = anclaHombro?.z ?? (dzTorax + Math.sin(protraccionRad) * 0.14 * escalaAltura);

      b.hombro.scale.setScalar(escalaAltura * gBrazo);
      b.hombro.position.set(xHombro + signo * 0.006, yHombro - 0.012 * escalaAltura, zHombro);

      const cx1 = xHombro + signo * Math.sin(angAbertura) * (segBrazo * 0.5);
      const cy1 = yHombro - Math.cos(angAbertura) * (segBrazo * 0.5);
      const cz1 = zHombro + Math.sin(protraccionRad * 0.65) * (segBrazo * 0.4);

      b.brazo.scale.set(gBrazo, segBrazo / 0.295, gBrazo);
      b.brazo.position.set(cx1, cy1, cz1);
      b.brazo.rotation.set(protraccionRad * 0.65, 0, -signo * angAbertura);

      const xCodo = xHombro + signo * Math.sin(angAbertura) * segBrazo;
      const yCodo = yHombro - Math.cos(angAbertura) * segBrazo;
      const zCodo = zHombro + Math.sin(protraccionRad * 0.65) * (segBrazo * 0.8);
      const angAnt = angAbertura + 0.06;

      const cx2 = xCodo + signo * Math.sin(angAnt) * (segAnt * 0.5);
      const cy2 = yCodo - Math.cos(angAnt) * (segAnt * 0.5);
      const cz2 = zCodo + Math.sin(protraccionRad * 0.4) * (segAnt * 0.4);

      const gAnt = gBrazo * 0.90;
      b.antebrazo.scale.set(gAnt, segAnt / 0.26, gAnt);
      b.antebrazo.position.set(cx2, cy2, cz2);
      b.antebrazo.rotation.set(protraccionRad * 0.4, 0, -signo * angAnt);

      b.mano.scale.setScalar(escalaAltura * gAnt);
      b.mano.rotation.set(protraccionRad * 0.4, 0, -signo * angAnt);
      b.mano.position.set(
        xCodo + signo * Math.sin(angAnt) * (segAnt + 0.042 * escalaAltura),
        yCodo - Math.cos(angAnt) * (segAnt + 0.042 * escalaAltura),
        zCodo + Math.sin(protraccionRad * 0.4) * (segAnt * 0.75)
      );
    }

    posicionarBrazoPiel(brazoIzqPiel, -1, params.anclajes?.hombroIzq);
    posicionarBrazoPiel(brazoDerPiel, 1, params.anclajes?.hombroDer);

    const gMuslo = (musloCm / 56) * fGrasaInf * factorPeso;
    const gPant = gMuslo * 0.78;

    function posicionarPiernaPiel(p, signo, anclaCadera) {
      const xPos = anclaCadera?.x ?? (signo * sepPierna);
      p.muslo.scale.set(1.02 * gMuslo, segPierna / 0.425, 1.08 * gMuslo);
      p.muslo.position.set(xPos, altoTobillo + segPierna * 1.5, 0.012);

      p.pantorrilla.scale.set(0.96 * gPant, segPierna / 0.415, 1.12 * gPant);
      p.pantorrilla.position.set(xPos, altoTobillo + segPierna * 0.5, -0.005);

      p.pie.scale.set(gPant, escalaAltura, escalaAltura);
      p.pie.position.set(xPos, 0.024 * escalaAltura, 0.048 * escalaAltura);
    }

    posicionarPiernaPiel(piernaIzqPiel, -1, params.anclajes?.caderaIzq);
    posicionarPiernaPiel(piernaDerPiel, 1, params.anclajes?.caderaDer);
  }

  actualizar();
  return { group, actualizar };
}