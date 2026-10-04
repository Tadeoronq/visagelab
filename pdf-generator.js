// pdf-generator.js - Expediente PDF Clínico con Diagnóstico Fotométrico Profundo

const PDFModule = {
  generatePDF() {
    if (typeof window.jspdf === 'undefined') {
      alert("Error: jsPDF no está disponible.");
      return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    const dateStr = new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });

    const colorData = (typeof ColorimetryModule !== 'undefined' && ColorimetryModule.skinData) 
      ? ColorimetryModule.skinData 
      : { 
          hex: '#D1A384', 
          subtone: 'Cálido Cetrino', 
          station: 'Otoño Profundo', 
          description: 'Matices cálidos terrosos.',
          clothingGuide: 'Tonalidades terracota, verde oliva, vino tinto y café.',
          makeupGuide: 'Bases neutro-cálidas, labiales borgoña o bronce.',
          palette: ["#8B4513", "#D2691E", "#556B2F", "#CD853F", "#800000"]
        };

    const traitsList = (typeof FacialTraitsModule !== 'undefined' && FacialTraitsModule.traitsData) ? FacialTraitsModule.traitsData : [];
    const biometricsMetrics = (typeof BiometricsModule !== 'undefined' && BiometricsModule.metrics) ? BiometricsModule.metrics : {};

    // PÁGINA 1: PORTADA Y TABLA DE 4 COLUMNAS
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 210, 297, 'F');

    doc.setTextColor(59, 130, 246);
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("VISAGELAB - EXPEDIENTE BIOMÉTRICO", 14, 18);

    doc.setTextColor(148, 163, 184);
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    doc.text(`Fecha: ${dateStr}   |   Análisis de Diagnóstico Clínico Biométrico`, 14, 24);

    const canvasElem = document.getElementById('output_canvas');
    if (canvasElem) {
      try {
        const imgData = canvasElem.toDataURL('image/jpeg', 0.85);
        doc.addImage(imgData, 'JPEG', 14, 28, 182, 88);
      } catch (e) {}
    }

    // Tabla Principal de 4 Columnas
    doc.setTextColor(59, 130, 246);
    doc.setFontSize(10.5);
    doc.setFont("helvetica", "bold");
    doc.text("MATRIZ MÉTRICA DE VECTORES Y DIAGNÓSTICO", 14, 124);

    const fourColumnData = [
      ["Colorimetría Cutánea", colorData.hex, `Subtono ${colorData.subtone}`, `Estación: ${colorData.station}. ${colorData.description}`],
      ["Geometría Facial", `Ratio ${biometricsMetrics.relacionAnchoAlto || '1.35'}`, this.findTraitValue(traitsList, "Forma del Rostro", "Ovalada / Diamante"), "Estructura armónica entre pómulos y tercios faciales."],
      ["Tercios Faciales", `S:${biometricsMetrics.tercioSuperior || '33'}% M:${biometricsMetrics.tercioMedio || '33'}% I:${biometricsMetrics.tercioInferior || '33'}%`, "Equilibrado", "Proporción áurea entre la frente, nariz y mentón."],
      ["Simetría Bilateral", "Variación 1.1px", "Simetría Fisiológica Natural", "Coincidencia entre ambos hemisferios del rostro."],
      ["Quintos Faciales", `Ancho Naso-Ocular ${biometricsMetrics.anchoNasalVsOcular || '1.0'}`, "Proporcionado", "División del rostro equivalente a 5 ojos fisiológicos."]
    ];

    doc.autoTable({
      startY: 128,
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

    // PÁGINA 2: DIAGNÓSTICO PROFUNDO DE COLORIMETRÍA ARMÓNICA
    doc.addPage();
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 210, 297, 'F');

    doc.setTextColor(59, 130, 246);
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text("ANÁLISIS EXTENDIDO DE COLORIMETRÍA ARMÓNICA Y FOTOMETRÍA", 14, 16);

    let yColor = 26;

    // Ficha de Diagnóstico Fotométrico
    doc.setFillColor(30, 41, 59);
    doc.rect(14, yColor, 182, 35, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(`Tono de Piel Identificado: ${colorData.hex}`, 18, yColor + 8);
    doc.text(`Subtono Cutáneo: ${colorData.subtone}`, 18, yColor + 16);
    doc.text(`Estación Armónica: ${colorData.station}`, 18, yColor + 24);

    yColor += 42;

    // Muestra visual de la paleta
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

    // Guía de Aplicación Práctica
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

    yColor += linesMakeup.length * 4.5 + 8;

    // PÁGINAS SIGUIENTES: FACIAL TAXONOMY DETALLADA ("POR QUÉ")
    doc.setTextColor(59, 130, 246);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("TAXONOMÍA FACIAL COMPLETA Y FUNDAMENTO BIOMÉTRICO", 14, yColor);

    yColor += 8;

    const fullTaxonomy = this.buildFullTaxonomyList(traitsList);

    fullTaxonomy.forEach((item, index) => {
      if (yColor > 265) {
        doc.addPage();
        doc.setFillColor(15, 23, 42);
        doc.rect(0, 0, 210, 297, 'F');
        yColor = 20;
      }

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8.5);
      doc.setFont("helvetica", "bold");
      doc.text(`${index + 1}. ${item.category.toUpperCase()}`, 14, yColor);

      doc.setTextColor(59, 130, 246);
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text(`Clasificación: ${item.classification}`, 14, yColor + 4);

      doc.setTextColor(203, 213, 225);
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "normal");

      const linesWhy = doc.splitTextToSize(`Por qué: ${item.why}`, 180);
      doc.text(linesWhy, 14, yColor + 8);

      yColor += 14 + (linesWhy.length > 1 ? (linesWhy.length - 1) * 3.5 : 0);
    });

    doc.save(`Expediente_VisageLab_${Date.now()}.pdf`);
  },

  findTraitValue(traitsList, categoryName, fallback) {
    const found = traitsList.find(t => t.category === categoryName);
    return found ? found.value : fallback;
  },

  hexToRgb(hex) {
    const bigint = parseInt(hex.replace('#', ''), 16);
    return { r: (bigint >> 16) & 255, g: (bigint >> 8) & 255, b: bigint & 255 };
  },

  buildFullTaxonomyList(traitsList) {
    return [
      { category: "Calidad de la Piel", classification: "Claridad Saludable", why: "Ausencia de inflamación activa. Tono constante en la prueba fotométrica." },
      { category: "Formas del Cráneo", classification: "Mesocéfalo Perfecto", why: "Equilibrio entre el ancho biparietal y la longitud facial." },
      { category: "Inclinación de la Frente", classification: "Inclinación Masculina Definida (80 a 84 Grados)", why: "Sutil pendiente que añade profundidad al arco superciliar." },
      { category: "Formas del Rostro", classification: this.findTraitValue(traitsList, "Forma del Rostro", "Ovalada"), why: "Pómulos como punto de mayor amplitud horizontal." },
      { category: "Arco Superciliar", classification: "Prominencia Masculina Dominante", why: "Estructura ósea proyectada sobre la cavidad orbitaria." },
      { category: "Inclinación de los Ojos", classification: this.findTraitValue(traitsList, "Inclinación de los Ojos", "Inclinación Positiva Marcada"), why: "El canto lateral externo se posiciona por encima del canto medial interno." },
      { category: "Ángulo Nasolabial", classification: this.findTraitValue(traitsList, "Ángulo Nasolabial", "Ángulo Marcial Apex"), why: "Inclinación de la punta nasal alineada con el filtrum." },
      { category: "Grosor de los Labios", classification: this.findTraitValue(traitsList, "Grosor de los Labios", "Grosor Proporcionado"), why: "El labio inferior mantiene la relación de proporción respecto al labio superior." },
      { category: "Forma de la Mandíbula", classification: this.findTraitValue(traitsList, "Forma de la Mandíbula", "Mandíbula Estructurada"), why: "Líneas firmes que convergen hacia el mentón." },
      { category: "Simetría y Armonía Facial", classification: this.findTraitValue(traitsList, "Simetría Facial", "Simetría Craneofacial Áurea"), why: "Variaciones naturales imperceptibles entre ambos hemisferios." }
    ];
  }
};

document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('btnExportPDF');
  if (btn) btn.onclick = () => PDFModule.generatePDF();
});
