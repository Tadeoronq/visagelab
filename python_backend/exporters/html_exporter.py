"""
exporters/html_exporter.py
Genera un dossier interactivo en HTML autocontenido para móviles y web.
"""

from datetime import datetime

def exportar_diagnostico_html(datos_frontal: dict, datos_ojos: dict, datos_perfil: dict, datos_color: dict, ruta_salida: str = "dossier_visagelab.html"):
    fecha_str = datetime.now().strftime("%d/%m/%Y %H:%M")

    # Muestras de color según la estación detectada
    paletas_muestra = {
        "invierno": [("#0F172A", "Negro Profundo"), ("#1E40AF", "Azul Cobalto"), ("#BE185D", "Magenta"), ("#FFFFFF", "Blanco Puro")],
        "verano": [("#64748B", "Gris Pizarra"), ("#818CF8", "Lavanda"), ("#F472B6", "Rosa Empolvado"), ("#A5F3FC", "Cian Pastel")],
        "otono": [("#78350F", "Tierra Quemada"), ("#B45309", "Mostaza Cálido"), ("#065F46", "Verde Bosque"), ("#FDE68A", "Beige Cálido")],
        "primavera": [("#EA580C", "Coral Vivo"), ("#F59E0B", "Dorado Miel"), ("#10B981", "Turquesa Claro"), ("#FEF08A", "Vainilla")]
    }

    clave_estacion = "verano"
    for k in paletas_muestra:
        if k in datos_color['estacion'].lower():
            clave_estacion = k
            break

    swatches = paletas_muestra[clave_estacion]
    swatches_html = "".join([
        f"""
        <div class="swatch-card">
            <div class="swatch" style="background-color: {color};"></div>
            <span>{nombre}</span>
        </div>
        """ for color, nombre in swatches
    ])

    html_content = f"""<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Visagelab | Dossier Clínico Interactivo</title>
    <style>
        :root {{
            --bg: #0b0f19;
            --surface: #131b2e;
            --surface-card: #1e293b;
            --border: #334155;
            --text: #f8fafc;
            --text-muted: #94a3b8;
            --accent: #10b981;
            --accent-cyan: #06b6d4;
        }}
        * {{
            box-sizing: border-box;
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        }}
        body {{
            background-color: var(--bg);
            color: var(--text);
            padding: 16px;
            display: flex;
            justify-content: center;
        }}
        .container {{
            width: 100%;
            max-width: 680px;
            display: flex;
            flex-direction: column;
            gap: 16px;
        }}
        header {{
            background: linear-gradient(135deg, var(--surface) 0%, var(--surface-card) 100%);
            border: 1px solid var(--border);
            border-radius: 16px;
            padding: 20px;
            text-align: center;
        }}
        header h1 {{
            font-size: 1.4rem;
            letter-spacing: 1px;
            color: var(--text);
            margin-bottom: 6px;
        }}
        header p {{
            font-size: 0.8rem;
            color: var(--text-muted);
        }}
        .badge {{
            display: inline-block;
            margin-top: 8px;
            background: rgba(16, 185, 129, 0.15);
            color: var(--accent);
            border: 1px solid var(--accent);
            font-size: 0.75rem;
            padding: 4px 10px;
            border-radius: 9999px;
            font-weight: bold;
        }}
        .section-card {{
            background-color: var(--surface);
            border: 1px solid var(--border);
            border-radius: 14px;
            padding: 18px;
        }}
        .section-title {{
            font-size: 1rem;
            font-weight: 600;
            color: var(--accent-cyan);
            margin-bottom: 12px;
            display: flex;
            align-items: center;
            gap: 8px;
        }}
        .metric-row {{
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            padding: 10px 0;
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
            font-size: 0.88rem;
        }}
        .metric-row:last-child {{
            border-bottom: none;
            padding-bottom: 0;
        }}
        .metric-name {{
            font-weight: 600;
            color: var(--text);
            flex: 1;
        }}
        .metric-val {{
            color: var(--accent);
            font-family: monospace;
            font-size: 0.85rem;
            margin-right: 8px;
        }}
        .metric-desc {{
            color: var(--text-muted);
            font-size: 0.82rem;
            margin-top: 3px;
        }}
        .palette-grid {{
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 10px;
            margin-top: 12px;
        }}
        .swatch-card {{
            display: flex;
            flex-direction: column;
            align-items: center;
            font-size: 0.75rem;
            color: var(--text-muted);
            text-align: center;
            gap: 6px;
        }}
        .swatch {{
            width: 100%;
            height: 48px;
            border-radius: 8px;
            border: 1px solid var(--border);
        }}
        footer {{
            text-align: center;
            font-size: 0.75rem;
            color: var(--text-muted);
            padding: 12px;
        }}
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>🔬 VISAGELAB</h1>
            <p>Dossier Clínico Morfológico & Colorimétrico</p>
            <div class="badge">ANÁLISIS COMPLETADO</div>
            <p style="margin-top: 8px; font-size: 0.72rem;">Fecha de emisión: {fecha_str}</p>
        </header>

        <!-- Colorimetría y Paleta -->
        <div class="section-card">
            <div class="section-title">🎨 Colorimetría CIE-Lab & Armonía</div>
            <div class="metric-row">
                <div style="width: 100%;">
                    <div style="display:flex; justify-content:space-between;">
                        <span class="metric-name">Subtono Dérmico</span>
                        <span class="metric-val">b*: {datos_color['lab']['b']} | a*: {datos_color['lab']['a']}</span>
                    </div>
                    <div class="metric-desc">{datos_color['subtono']}</div>
                </div>
            </div>
            <div class="metric-row">
                <div style="width: 100%;">
                    <div style="display:flex; justify-content:space-between;">
                        <span class="metric-name">Fototipo Cutáneo (ITA)</span>
                        <span class="metric-val">{datos_color['ita_grados']}° (L*: {datos_color['lab']['l']})</span>
                    </div>
                    <div class="metric-desc">{datos_color['fototipo']}</div>
                </div>
            </div>
            <div class="metric-row">
                <div style="width: 100%;">
                    <div style="display:flex; justify-content:space-between;">
                        <span class="metric-name">Armonía Estacional</span>
                        <span class="metric-val">Paleta Recomendada</span>
                    </div>
                    <div class="metric-desc">{datos_color['estacion']}</div>
                </div>
            </div>
            <div class="palette-grid">
                {swatches_html}
            </div>
        </div>

        <!-- Arquitectura Facial -->
        <div class="section-card">
            <div class="section-title">📐 Arquitectura Facial (Frontal)</div>
            <div class="metric-row">
                <div style="width: 100%;">
                    <div style="display:flex; justify-content:space-between;">
                        <span class="metric-name">Morfología de Rostro</span>
                        <span class="metric-val">Ratio {datos_frontal['forma_rostro']['ratio_alto_ancho']}</span>
                    </div>
                    <div class="metric-desc">{datos_frontal['forma_rostro']['diagnostico']}</div>
                </div>
            </div>
            <div class="metric-row">
                <div style="width: 100%;">
                    <div style="display:flex; justify-content:space-between;">
                        <span class="metric-name">Distribución de Tercios</span>
                        <span class="metric-val">S:{datos_frontal['tercios']['superior']}% M:{datos_frontal['tercios']['medio']}% I:{datos_frontal['tercios']['inferior']}%</span>
                    </div>
                    <div class="metric-desc">{datos_frontal['tercios']['diagnostico']}</div>
                </div>
            </div>
            <div class="metric-row">
                <div style="width: 100%;">
                    <div style="display:flex; justify-content:space-between;">
                        <span class="metric-name">Simetría Bilateral</span>
                        <span class="metric-val">Desv. {datos_frontal['simetria']['desviacion_media_px']} px</span>
                    </div>
                    <div class="metric-desc">{datos_frontal['simetria']['diagnostico']}</div>
                </div>
            </div>
        </div>

        <!-- Ojos y Periocular -->
        <div class="section-card">
            <div class="section-title">👁️ Región Periocular</div>
            <div class="metric-row">
                <div style="width: 100%;">
                    <div style="display:flex; justify-content:space-between;">
                        <span class="metric-name">Inclinación Cantal</span>
                        <span class="metric-val">{datos_ojos['inclinacion_cantal']['angulo_promedio_deg']}°</span>
                    </div>
                    <div class="metric-desc">{datos_ojos['inclinacion_cantal']['diagnostico']}</div>
                </div>
            </div>
            <div class="metric-row">
                <div style="width: 100%;">
                    <div style="display:flex; justify-content:space-between;">
                        <span class="metric-name">Exposición Palpebral</span>
                        <span class="metric-val">Apertura {datos_ojos['exposicion_palpebral']['ratio_apertura']}</span>
                    </div>
                    <div class="metric-desc">{datos_ojos['exposicion_palpebral']['diagnostico']}</div>
                </div>
            </div>
            <div class="metric-row">
                <div style="width: 100%;">
                    <div style="display:flex; justify-content:space-between;">
                        <span class="metric-name">Arquetipo Ocular</span>
                        <span class="metric-val">Contorno</span>
                    </div>
                    <div class="metric-desc">{datos_ojos['arquetipo_ocular']['diagnostico']}</div>
                </div>
            </div>
        </div>

        <!-- Sagital y Cuello -->
        <div class="section-card">
            <div class="section-title">👤 Perfil Sagital & Cuello</div>
            <div class="metric-row">
                <div style="width: 100%;">
                    <div style="display:flex; justify-content:space-between;">
                        <span class="metric-name">Sínfisis Mentoniana</span>
                        <span class="metric-val">González-Ulloa</span>
                    </div>
                    <div class="metric-desc">{datos_perfil['menton_perfil']['diagnostico']}</div>
                </div>
            </div>
            <div class="metric-row">
                <div style="width: 100%;">
                    <div style="display:flex; justify-content:space-between;">
                        <span class="metric-name">Ángulo Nasolabial</span>
                        <span class="metric-val">{datos_perfil['angulo_nasolabial']['grados']}°</span>
                    </div>
                    <div class="metric-desc">{datos_perfil['angulo_nasolabial']['diagnostico']}</div>
                </div>
            </div>
            <div class="metric-row">
                <div style="width: 100%;">
                    <div style="display:flex; justify-content:space-between;">
                        <span class="metric-name">Transición Cervical</span>
                        <span class="metric-val">Ratio {datos_perfil['cuello_mandibula']['ratio']}</span>
                    </div>
                    <div class="metric-desc">{datos_perfil['cuello_mandibula']['diagnostico']}</div>
                </div>
            </div>
        </div>

        <footer>
            Generado por Visagelab Biometric Platform &copy; 2026<br>
            Uso confidencial y profesional para asesoría de imagen.
        </footer>
    </div>
</body>
</html>"""

    with open(ruta_salida, "w", encoding="utf-8") as f:
        f.write(html_content)

    return ruta_salida