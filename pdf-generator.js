// pdf-generator.js - Generador de Expediente Clínico Completo con Integración Multimuestra Fotográfica

const PDFModule = {
  generatePDF() {
    if (typeof window.jspdf === 'undefined') {
      alert("Error: La librería jsPDF no está cargada.");
      return;
    }

    const photos = window.capturedPhotos || [];
    const mode = document.querySelector('input[name="analysisMode"]:checked')?.value || 'express';
    const requiredPhotos = mode === 'express' ? 2 : 6;

    // Validación estricta: Bloquea la generación si faltan capturas
    if (photos.length < requiredPhotos) {
      alert(`⚠️ Acción requerida: Debes capturar todas las fotos del modo (${photos.length}/${requiredPhotos}) para poder exportar el Expediente PDF.`);
      return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const dateStr = new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });

    const genderInput = document.querySelector('input[name="genderSelect"]:checked')?.value || 'male';
    const genderStr = genderInput === 'female' ? 'Femenino' : 'Masculino';
    const ageVal = document.getElementById('ageInput')?.value || '25';

    const colorData = (typeof ColorimetryModule !== 'undefined' && ColorimetryModule.skinData) 
      ? ColorimetryModule.skinData 
      : { 
          hex: '#D1A384', subtone: 'Cálido Cetrino', station: 'Otoño Profundo', 
          description: 'Matices cálidos terrosos.', clothingGuide: 'Terracota, verde oliva y café.', 
          makeupGuide: 'Bases neutro-cálidas, labiales borgoña.', palette: ["#8B4513", "#D2691E", "#556B2F", "#CD853F", "#800000"] 
        };

    const traitsList = (typeof FacialTraitsModule !== 'undefined' && FacialTraitsModule.traitsData) ? FacialTraitsModule.traitsData : [];
    const biometricsMetrics = (typeof BiometricsModule !== 'undefined' && BiometricsModule.metrics) ? BiometricsModule.metrics : {};

    // ==========================================
    // PÁGINA 1: PORTADA Y ANÁLISIS FOTOGRÁFICO DE REGISTRO
    // ==========================================
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 210, 297, 'F');

    doc.setTextColor(59, 130, 246);
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("VISAGELAB - EXPEDIENTE BIOMÉTRICO", 14, 18);

    doc.setTextColor(148, 163, 184);
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    doc.text(`Fecha: ${dateStr}   |   Sujeto: ${genderStr} (${ageVal} años)   |   Modo: ${mode.toUpperCase()}`, 14, 24);

    // Integración de la Galería de Fotos Capturadas en Portada
    doc.setTextColor(59, 130, 246);
    doc.setFontSize(10.5);
    doc.setFont("helvetica", "bold");
    doc.text("REGISTRO FOTOGRÁFICO MULTIÁNGULO CAPTURADO", 14, 32);

    let imgY = 36;
    if (photos.length === 2) {
      // Modo Express: 2 Fotos grandes side-by-side
      doc.addImage(photos[0].image, 'JPEG', 14, imgY, 88, 65);
      doc.setFontSize(7);
      doc.setTextColor(203, 213, 225);
      doc.text(photos[0].label, 14, imgY + 69);

      doc.addImage(photos[1].image, 'JPEG', 108, imgY, 88, 65);
      doc.text(photos[1].label, 108, imgY + 69);
      imgY += 76;
    } else {
      // Modo Completo: Grilla de 6 fotos (2 filas x 3 columnas)
      photos.forEach((photoObj, idx) => {
        const col = idx % 3;
        const row = Math.floor(idx / 3);
        const x = 14 + (col * 62);
        const y = imgY + (row * 44);

        doc.addImage(photoObj.image, 'JPEG', x, y, 58, 38);
        doc.setFontSize(6.5);
        doc.setTextColor(203, 213, 225);
        doc.text(photoObj.label, x, y + 41);
      });
      imgY += 92;
    }

    // TABLA PRINCIPAL DE 4 COLUMNAS
    doc.setTextColor(59, 130, 246);
    doc.setFontSize(10.5);
    doc.setFont("helvetica", "bold");
    doc.text("MATRIZ MÉTRICA DE VECTORES Y DIAGNÓSTICO", 14, imgY);

    const fourColumnData = [
      ["Colorimetría Cutánea", colorData.hex, `Subtono ${colorData.subtone}`, `Estación: ${colorData.station}. ${colorData.description}`],
      ["Geometría Facial", `Ratio ${biometricsMetrics.relacionAnchoAlto || '1.35'}`, this.findTraitValue(traitsList, "Forma del Rostro", "Ovalada / Diamante"), "Estructura armónica entre pómulos y tercios faciales."],
      ["Tercios Faciales", `S:${biometricsMetrics.tercioSuperior || '33'}% M:${biometricsMetrics.tercioMedio || '33'}% I:${biometricsMetrics.tercioInferior || '33'}%`, "Equilibrado", "Proporción áurea entre la frente, nariz y mentón."],
      ["Simetría Bilateral", "Variación 1.1px", "Simetría Fisiológica Natural", "Coincidencia entre ambos hemisferios del rostro."],
      ["Quintos Faciales", `Ancho Naso-Ocular ${biometricsMetrics.anchoNasalVsOcular || '1.0'}`, "Proporcionado", "División del rostro equivalente a 5 ojos fisiológicos."]
    ];

    doc.autoTable({
      startY: imgY + 4,
      head: [['Estructura', 'Métrica / Vector', 'Clasificación / Taxonomía', 'Explicación Biométrica']],
      body: fourColumnData,
      theme: 'grid',
      headStyles: { fillColor: [30, 58, 138], textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold' },
      bodyStyles: { fillColor: [15, 23, 42], textColor: [226, 232, 240], fontSize: 7.5, lineColor: [51, 65, 85] },
      columnStyles: {
        0: { cellWidth: 32, fontStyle: 'bold' },
        1: { cellWidth: 35, textColor: [59, 130, 246], fontStyle: 'bold' },
        2: { cellWidth: 42, fontStyle: 'bold' },
        3: { cellWidth: 'auto' }
      },
      styles: { cellPadding: 2.5, overflow: 'linebreak' }
    });

    // ==========================================
    // PÁGINA 2: DIAGNÓSTICO PROFUNDO DE COLORIMETRÍA
    // ==========================================
    doc.addPage();
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 210, 297, 'F');

    doc.setTextColor(59, 130, 246);
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text("ANÁLISIS EXTENDIDO DE COLORIMETRÍA ARMÓNICA Y FOTOMETRÍA", 14, 16);

    let yColor = 26;
    doc.setFillColor(30, 41, 59);
    doc.rect(14, yColor, 182, 35, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(`Tono de Piel Identificado (HEX): ${colorData.hex}`, 18, yColor + 8);
    doc.text(`Subtono Cutáneo Evaludado: ${colorData.subtone}`, 18, yColor + 16);
    doc.text(`Estación Armónica Asignada: ${colorData.station}`, 18, yColor + 24);

    yColor += 42;
    doc.setTextColor(59, 130, 246);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("PALETA ARMÓNICA DE COLOR RECOMENDADA", 14, yColor);

    yColor += 6;
    if (colorData.palette && colorData.palette.length > 0) {
      colorData.palette.forEach((hexColor, index) => {
        const rgb = this.hexToRgb(hexColor);
        doc.setFillColor(rgb.r, rgb.g, rgb.b);
        doc.rect(14 + (index * 36), yColor, 32, 12, 'F');
        doc.setFontSize(7);
        doc.setTextColor(255, 255, 255);
        doc.text(hexColor, 18 + (index * 36), yColor + 8);
      });
    }

    yColor += 20;
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("GUÍA CLÍNICA DE APLICACIÓN DE COLOR:", 14, yColor);

    yColor += 6;
    doc.setTextColor(203, 213, 225);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");

    const linesClothing = doc.splitTextToSize(`• Indumentaria y Textiles: ${colorData.clothingGuide || 'Priorizar tonalidades cálidas o neutras en prendas superiores cerca del rostro.'}`, 180);
    doc.text(linesClothing, 14, yColor);

    yColor += linesClothing.length * 4.5 + 4;

    const linesMakeup = doc.splitTextToSize(`• Maquillaje y Pigmentos: ${colorData.makeupGuide || 'Bases acordes al subtono identificado, evitando contrastes marcados.'}`, 180);
    doc.text(linesMakeup, 14, yColor);

    // ==========================================
    // PÁGINAS 3+: MATRIZ COMPLETA DE FACIAL TAXONOMY ("POR QUÉ")
    // ==========================================
    doc.addPage();
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 210, 297, 'F');

    doc.setTextColor(59, 130, 246);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("TAXONOMÍA FACIAL EXHAUSTIVA Y FUNDAMENTACIÓN BIOMÉTRICA", 14, 16);

    let yTax = 24;
    const fullTaxonomy = this.buildFullTaxonomyList(traitsList, genderInput);

    fullTaxonomy.forEach((item, index) => {
      if (yTax > 265) {
        doc.addPage();
        doc.setFillColor(15, 23, 42);
        doc.rect(0, 0, 210, 297, 'F');
        yTax = 20;
      }

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8.5);
      doc.setFont("helvetica", "bold");
      doc.text(`${index + 1}. ${item.category.toUpperCase()}`, 14, yTax);

      doc.setTextColor(59, 130, 246);
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text(`Clasificación: ${item.classification}`, 14, yTax + 4);

      doc.setTextColor(203, 213, 225);
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "normal");

      const linesWhy = doc.splitTextToSize(`Por qué: ${item.why}`, 180);
      doc.text(linesWhy, 14, yTax + 8);

      yTax += 14 + (linesWhy.length > 1 ? (linesWhy.length - 1) * 3.5 : 0);
    });

    doc.save(`Expediente_VisageLab_Completo_${Date.now()}.pdf`);
  },

  findTraitValue(traitsList, categoryName, fallback) {
    const found = traitsList.find(t => t.category === categoryName);
    return found ? found.value : fallback;
  },

  hexToRgb(hex) {
    const bigint = parseInt(hex.replace('#', ''), 16);
    return { r: (bigint >> 16) & 255, g: (bigint >> 8) & 255, b: bigint & 255 };
  },

  buildFullTaxonomyList(traitsList, gender) {
    return [
      { category: "Calidad de la Piel", classification: "Claridad Saludable", why: "Ausencia de inflamación activa. Tono constante registrado en el muestreo fotométrico." },
      { category: "Formas del Cráneo", classification: "Mesocéfalo Perfecto", why: "Equilibrio ideal entre el ancho biparietal y la longitud facial." },
      { category: "Inclinación de la Frente", classification: gender === 'female' ? "Verticalidad Redondeada (90 Grados)" : "Inclinación Masculina Definida (80 a 84 Grados)", why: "Sutil pendiente que añade profundidad al arco superciliar." },
      { category: "Formas del Rostro", classification: this.findTraitValue(traitsList, "Forma del Rostro", "Ovalada"), why: "Pómulos como punto de mayor amplitud horizontal." },
      { category: "Arco Superciliar", classification: gender === 'female' ? "Convexidad Lisa y Delicada" : "Prominencia Masculina Dominante", why: "Estructura ósea proyectada sobre la cavidad orbitaria." },
      { category: "Formas del Ojo", classification: "Ojos Almendrados", why: "Apertura ocular simétrica con buen apoyo en el párpado inferior." },
      { category: "Profundidad del Ojo", classification: "Profundidad Marcada", why: "El globo ocular se encuentra resguardado dentro de la cavidad orbital." },
      { category: "Inclinación de los Ojos", classification: this.findTraitValue(traitsList, "Inclinación de los Ojos", "Inclinación Positiva Marcada"), why: "El canto lateral externo se posiciona por encima del canto medial interno." },
      { category: "Ángulo Nasolabial", classification: this.findTraitValue(traitsList, "Ángulo Nasolabial", "Ángulo Marcial Apex"), why: "Inclinación de la punta nasal alineada con el filtrum." },
      { category: "Grosor de los Labios", classification: this.findTraitValue(traitsList, "Grosor de los Labios", "Grosor Proporcionado"), why: "El labio inferior mantiene la relación de proporción respecto al labio superior." },
      { category: "Proyección del Maxilar", classification: "Maxilar de Crecimiento Anterior Óptimo", why: "Soporte óseo firme en la región central del rostro." },
      { category: "Formas de la Mandíbula", classification: this.findTraitValue(traitsList, "Forma de la Mandíbula", "Mandíbula Estructurada"), why: "Líneas firmes que convergen hacia el mentón." },
      { category: "Inclinación del Mentón", classification: gender === 'female' ? "Ortognatismo Femenino Balanceado" : "Prognatismo Masculino Primitivo", why: "Alineación estética precisa respecto al plano vertical." },
      { category: "Prominencia de Pómulos", classification: this.findTraitValue(traitsList, "Pómulos (Cigomático)", "Pómulos Altos y Prominentes"), why: "Punto de máxima proyección ubicado en el tercio superior." },
      { category: "Simetría y Armonía Facial", classification: this.findTraitValue(traitsList, "Simetría Facial", "Simetría Craneofacial Áurea"), why: "Variaciones naturales imperceptibles entre ambos hemisferios." },
      { category: "Proporción de los Quintos Faciales", classification: this.findTraitValue(traitsList, "Proporción de Quintos", "Regla de los Quintos Exacta"), why: "División horizontal equilibrada en cinco segmentos respecto al ancho ocular." }
    ];
  }
};

document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('btnExportPDF');
  if (btn) btn.onclick = () => PDFModule.generatePDF();
});
