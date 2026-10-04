// colorimetry.js - Módulo de Diagnóstico Fotométrico Extendido

const ColorimetryModule = {
  skinData: null,

  analyze(canvasElement, landmarks) {
    if (!canvasElement || !landmarks || landmarks.length < 454) return;
    const ctx = canvasElement.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    // Puntos de Muestreo: Frente, Mejilla D, Mejilla I, Mentón
    const samplePoints = [10, 117, 346, 152];
    let totalR = 0, totalG = 0, totalB = 0, count = 0;

    samplePoints.forEach(idx => {
      const pt = landmarks[idx];
      if (pt) {
        const x = Math.floor(pt.x * canvasElement.width);
        const y = Math.floor(pt.y * canvasElement.height);
        try {
          const pixelData = ctx.getImageData(Math.max(0, x - 2), Math.max(0, y - 2), 5, 5).data;
          for (let i = 0; i < pixelData.length; i += 4) {
            totalR += pixelData[i];
            totalG += pixelData[i + 1];
            totalB += pixelData[i + 2];
            count++;
          }
        } catch (e) {}
      }
    });

    if (count === 0) return;

    const avgR = Math.round(totalR / count);
    const avgG = Math.round(totalG / count);
    const avgB = Math.round(totalB / count);

    const skinHex = this.rgbToHex(avgR, avgG, avgB);
    const { subtone, depth, contrastText } = this.evaluateDetailedSubtone(avgR, avgG, avgB);
    const station = this.determineStationExtended(avgR, avgG, avgB);

    this.skinData = {
      rgb: `rgb(${avgR}, ${avgG}, ${avgB})`,
      hex: skinHex,
      subtone: subtone,
      depth: depth,
      contrast: contrastText,
      station: station.name,
      palette: station.palette,
      clothingGuide: station.clothingGuide,
      makeupGuide: station.makeupGuide,
      description: station.description
    };

    this.updateUI();
  },

  rgbToHex(r, g, b) {
    return "#" + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
  },

  evaluateDetailedSubtone(r, g, b) {
    const warmthRatio = (r - b) / (r + g + b || 1);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

    let subtone = "Neutro Balanceado";
    if (warmthRatio > 0.19) subtone = "Cálido Cetrino / Dorado";
    else if (warmthRatio > 0.15) subtone = "Neutro-Cálido (Melocotón)";
    else if (warmthRatio < 0.11) subtone = "Frío Rosado / Azulado";

    let depth = luminance > 0.65 ? "Claro / Neoténico" : luminance > 0.45 ? "Medio / Proporcionado" : "Profundo / Intenso";
    let contrastText = "Contraste Medio Armónico";

    return { subtone, depth, contrastText };
  },

  determineStationExtended(r, g, b) {
    const warmth = (r - b) / (r + g + b || 1);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

    if (warmth > 0.15) {
      if (luminance > 0.54) {
        return {
          name: "Primavera Clara / Luminosa",
          palette: ["#FF7F50", "#FFE4B5", "#78C800", "#FFD700", "#F4A460"],
          clothingGuide: "Tonalidades marfil, coral, verde manzana, dorado suave y azul turquesa.",
          makeupGuide: "Bases doradas/melocotón, labiales coral o rosado cálido, iluminador champagne.",
          description: "Dominancia de luz cálida y brillante. Resalta con metales dorados y telas satinadas."
        };
      } else {
        return {
          name: "Otoño Profundo / Cálido",
          palette: ["#8B4513", "#D2691E", "#556B2F", "#CD853F", "#800000"],
          clothingGuide: "Tonalidades terracota, mostaza, verde oliva, vino tinto y café chocolate.",
          makeupGuide: "Bases neutro-cálidas, labiales borgoña o bronce, sombras en cobrizos y tierra.",
          description: "Matices ricos, terrosos y densos. Destaca con joyería de oro viejo, bronce y cobre."
        };
      }
    } else {
      if (luminance > 0.52) {
        return {
          name: "Verano Suave / Frío",
          palette: ["#E6E6FA", "#B0E0E6", "#DB7093", "#708090", "#C0C0C0"],
          clothingGuide: "Tonalidades azul pastel, rosa ceniza, gris perla, lavanda y menta suave.",
          makeupGuide: "Bases rosadas o neutro-frías, labiales rosa palo, sombras lavanda y plata.",
          description: "Tonalidades frías, desaturadas y suaves. Resalta con metales de plata mate y platino."
        };
      } else {
        return {
          name: "Invierno Intenso / Brillante",
          palette: ["#000080", "#800080", "#DC143C", "#000000", "#FFFFFF"],
          clothingGuide: "Tonalidades blanco puro, negro azabache, azul marino, rojo carmesí y fucsia.",
          makeupGuide: "Bases claras e intensas, labiales rojo frío puro o magenta, delineado negro nítido.",
          description: "Alto contraste y frío saturado. Favorecen los contrastes puros y joyería en plata brillante."
        };
      }
    }
  },

  updateUI() {
    const panel = document.getElementById('colorimetry-data');
    if (!panel || !this.skinData) return;

    const paletteHTML = this.skinData.palette
      .map(color => `<div class="w-5 h-5 rounded-full border border-slate-700 shadow-sm" style="background-color: ${color};" title="${color}"></div>`)
      .join('');

    panel.innerHTML = `
      <div class="flex justify-between items-center border-b border-slate-800 pb-1.5">
        <span>Tono Piel (HEX):</span>
        <div class="flex items-center gap-2">
          <span class="font-mono text-slate-300">${this.skinData.hex}</span>
          <div class="w-3.5 h-3.5 rounded-full border border-slate-600" style="background-color: ${this.skinData.hex}"></div>
        </div>
      </div>
      <div class="flex justify-between items-center pt-1">
        <span>Subtono exacto:</span>
        <strong class="text-rose-400 font-semibold">${this.skinData.subtone}</strong>
      </div>
      <div class="flex justify-between items-center pt-1">
        <span>Estación Armónica:</span>
        <strong class="text-amber-300 font-semibold">${this.skinData.station}</strong>
      </div>
      <div class="pt-2 border-t border-slate-800">
        <p class="text-[11px] text-slate-400 mb-1.5">Paleta Estacional:</p>
        <div class="flex gap-1.5 justify-start">${paletteHTML}</div>
      </div>
      <p class="text-[11px] text-slate-400 italic pt-2">${this.skinData.description}</p>
    `;
  }
};
