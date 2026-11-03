"""
exporters/excel_exporter.py
"""
from datetime import datetime
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side

def exportar_diagnostico_excel(datos_frontal: dict, datos_ojos: dict, datos_perfil: dict, datos_color: dict, ruta_salida: str = "reporte_visagelab.xlsx"):
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Ficha Morfológica"

    header_fill = PatternFill(start_color="1F2937", end_color="1F2937", fill_type="solid")
    section_fill = PatternFill(start_color="374151", end_color="374151", fill_type="solid")
    header_font = Font(name="Calibri", size=13, bold=True, color="FFFFFF")
    section_font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
    bold_font = Font(name="Calibri", size=10, bold=True)
    normal_font = Font(name="Calibri", size=10)
    center_align = Alignment(horizontal="center", vertical="center")
    left_align = Alignment(horizontal="left", vertical="center")
    thin_border = Border(
        left=Side(style='thin', color='D1D5DB'),
        right=Side(style='thin', color='D1D5DB'),
        top=Side(style='thin', color='D1D5DB'),
        bottom=Side(style='thin', color='D1D5DB')
    )

    ws.merge_cells("A1:D2")
    ws["A1"] = "VISAGELAB - FICHA ANATÓMICA Y COLORIMÉTRICA"
    ws["A1"].font = header_font
    ws["A1"].fill = header_fill
    ws["A1"].alignment = center_align

    ws["A3"] = f"Fecha de Emisión: {datetime.now().strftime('%Y-%m-%d %H:%M')}"
    ws["A3"].font = Font(name="Calibri", size=9, italic=True)

    filas = [
        ("SECCIÓN", "PARÁMETRO", "MÉTRICA ANATÓMICA / LAB", "TAXONOMÍA CUALITATIVA"),
        # Frontal
        ("Arquitectura Facial", "Forma del Rostro", f"Ratio {datos_frontal['forma_rostro']['ratio_alto_ancho']}", datos_frontal['forma_rostro']['diagnostico']),
        ("Arquitectura Facial", "Distribución de Tercios", f"Sup {datos_frontal['tercios']['superior']}% | Med {datos_frontal['tercios']['medio']}% | Inf {datos_frontal['tercios']['inferior']}%", datos_frontal['tercios']['diagnostico']),
        ("Arquitectura Facial", "Simetría Especular", f"Desv. {datos_frontal['simetria']['desviacion_media_px']} px", datos_frontal['simetria']['diagnostico']),
        ("Arquitectura Facial", "Quintos Transversales", "Análisis Canónico", datos_frontal['quintos']['diagnostico']),
        ("Arquitectura Facial", "Proporción Alar-Nasal", "Base Alar", datos_frontal['ancho_nasal']['diagnostico']),
        # Periocular
        ("Región Periocular", "Inclinación Cantal", f"{datos_ojos['inclinacion_cantal']['angulo_promedio_deg']}°", datos_ojos['inclinacion_cantal']['diagnostico']),
        ("Región Periocular", "Exposición Palpebral", f"Apertura {datos_ojos['exposicion_palpebral']['ratio_apertura']}", datos_ojos['exposicion_palpebral']['diagnostico']),
        ("Región Periocular", "Arquetipo Ocular", "Contorno", datos_ojos['arquetipo_ocular']['diagnostico']),
        ("Región Periocular", "Marco Superciliar", "Densidad Folículo", datos_ojos['cejas']['diagnostico']),
        # Perfil y Cuello
        ("Cervical y Perfil", "Transición Cuello-Mandíbula", f"Ratio {datos_perfil['cuello_mandibula']['ratio']}", datos_perfil['cuello_mandibula']['diagnostico']),
        ("Cervical y Perfil", "Sínfisis Mentoniana", "González-Ulloa", datos_perfil['menton_perfil']['diagnostico']),
        ("Cervical y Perfil", "Ángulo Nasolabial", f"{datos_perfil['angulo_nasolabial']['grados']}°", datos_perfil['angulo_nasolabial']['diagnostico']),
        # Colorimetría
        ("Colorimetría Clínica", "Subtono Dérmico", f"b*: {datos_color['lab']['b']} | a*: {datos_color['lab']['a']}", datos_color['subtono']),
        ("Colorimetría Clínica", "Fototipo Cutáneo (ITA)", f"ITA {datos_color['ita_grados']}° (L*: {datos_color['lab']['l']})", datos_color['fototipo']),
        ("Colorimetría Clínica", "Nivel de Contraste", "Δ Luminancia Piel-Ceja", datos_color['contraste']),
        ("Colorimetría Clínica", "Estación Analítica", "Armonía Estacional", datos_color['estacion'])
    ]

    r_inicio = 5
    for r_idx, fila in enumerate(filas, start=r_inicio):
        for c_idx, val in enumerate(fila, start=1):
            cell = ws.cell(row=r_idx, column=c_idx, value=val)
            cell.border = thin_border
            if r_idx == r_inicio:
                cell.fill = section_fill
                cell.font = section_font
                cell.alignment = center_align
            else:
                cell.font = bold_font if c_idx < 3 else normal_font
                cell.alignment = center_align if c_idx == 3 else left_align

    for col in ws.columns:
        max_len = max(len(str(cell.value or '')) for cell in col)
        col_letter = openpyxl.utils.get_column_letter(col[0].column)
        ws.column_dimensions[col_letter].width = max(max_len + 4, 14)

    wb.save(ruta_salida)
    return ruta_salida