import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import type { 
  CuentaServicio, 
  ConfiguracionReporte, 
  EstadisticasMensuales 
} from '../tipos';
import type { DesgloseSueldo, ResumenDesglose, ResumenConsolidado } from '../tipos/desglosador';
import { servicioCalculosEstadisticas } from './calculosEstadisticas';
import { format } from 'date-fns';

/**
 * Servicio para generar reportes PDF utilizando jsPDF y html2canvas
 */
export class ServicioGeneradorPDF {
  
  /**
   * Configuración por defecto para la generación de PDFs
   */
  private static readonly CONFIG_PDF = {
    format: 'a4' as const,
    orientation: 'portrait' as const,
    unit: 'mm' as const,
    compress: true,
    precision: 2
  };

  /**
   * Configuración para html2canvas
   */
  private static readonly CONFIG_CANVAS = {
    scale: 2, // Mayor resolución
    useCORS: true,
    allowTaint: true,
    backgroundColor: '#ffffff',
    logging: false,
    width: 794, // A4 width en pixels (210mm * 3.78)
    height: 1123, // A4 height en pixels (297mm * 3.78)
    scrollX: 0,
    scrollY: 0
  };

  /**
   * Genera un reporte mensual en PDF
   */
  async generarReporteMensual(
    cuentas: CuentaServicio[],
    año: number,
    mes: number,
    _incluirGraficos: boolean = true // TODO: Implementar inclusión de gráficos
  ): Promise<Blob> {
    try {
      // Filtrar cuentas del período
      const cuentasPeriodo = servicioCalculosEstadisticas.filtrarPorPeriodo(cuentas, año, mes);
      
      // Calcular estadísticas
      const estadisticas = servicioCalculosEstadisticas.calcularEstadisticasMensuales(cuentas, año, mes);
      
      // Crear elemento temporal para renderizar la plantilla
      const elementoTemporal = await this.crearElementoReporteMensual(
        cuentasPeriodo, 
        estadisticas, 
        _incluirGraficos
      );
      
      // Generar PDF desde el elemento HTML
      const pdf = await this.convertirElementoAPDF(
        elementoTemporal,
        `reporte-mensual-${año}-${mes.toString().padStart(2, '0')}`
      );
      
      // Limpiar elemento temporal
      document.body.removeChild(elementoTemporal);
      
      return pdf;
      
    } catch (error) {
      console.error('Error al generar reporte mensual:', error);
      throw new Error(`No se pudo generar el reporte mensual: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  /**
   * Genera una planilla de cuentas a pagar en PDF
   */
  async generarPlanillaPagos(
    cuentas: CuentaServicio[],
    año: number,
    mes: number
  ): Promise<Blob> {
    try {
      // Filtrar solo cuentas pendientes del período
      const cuentasPendientes = cuentas.filter(cuenta => 
        cuenta.año === año && 
        cuenta.mes === mes && 
        !cuenta.pagada
      );
      
      // Crear elemento temporal para renderizar la plantilla
      const elementoTemporal = await this.crearElementoPlanillaPagos(
        cuentasPendientes,
        mes,
        año
      );
      
      // Generar PDF desde el elemento HTML
      const pdf = await this.convertirElementoAPDF(
        elementoTemporal,
        `planilla-pagos-${año}-${mes.toString().padStart(2, '0')}`
      );
      
      // Limpiar elemento temporal
      document.body.removeChild(elementoTemporal);
      
      return pdf;
      
    } catch (error) {
      console.error('Error al generar planilla de pagos:', error);
      throw new Error(`No se pudo generar la planilla de pagos: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  /**
   * Genera un reporte basado en la configuración proporcionada
   */
  async generarReporte(
    cuentas: CuentaServicio[],
    configuracion: ConfiguracionReporte
  ): Promise<Blob> {
    const { tipo, periodo, incluirGraficos } = configuracion;
    
    switch (tipo) {
      case 'mensual':
        if (!periodo.mes) {
          throw new Error('El mes es requerido para reportes mensuales');
        }
        return this.generarReporteMensual(cuentas, periodo.año, periodo.mes, incluirGraficos);
        
      case 'planilla':
        if (!periodo.mes) {
          throw new Error('El mes es requerido para planillas de pagos');
        }
        return this.generarPlanillaPagos(cuentas, periodo.año, periodo.mes);
        
      case 'anual':
        return this.generarReporteAnual(cuentas, periodo.año, incluirGraficos);
        
      default:
        throw new Error(`Tipo de reporte no soportado: ${tipo}`);
    }
  }

  /**
   * Genera un reporte anual (implementación básica)
   */
  private async generarReporteAnual(
    cuentas: CuentaServicio[],
    año: number,
    _incluirGraficos: boolean = true
  ): Promise<Blob> {
    // Por ahora, generar un reporte simple con estadísticas anuales
    const estadisticasAnuales = servicioCalculosEstadisticas.calcularEstadisticasAnuales(cuentas, año);
    
    // Crear PDF básico con jsPDF directamente
    const pdf = new jsPDF(ServicioGeneradorPDF.CONFIG_PDF);
    
    // Configurar metadatos
    this.configurarMetadatosPDF(pdf, `Reporte Anual ${año}`, 'anual');
    
    // Título
    pdf.setFontSize(20);
    pdf.text(`Reporte Anual ${año}`, 105, 30, { align: 'center' });
    
    // Estadísticas básicas
    pdf.setFontSize(12);
    let y = 60;
    
    pdf.text(`Total Anual: $${estadisticasAnuales.totalAnual.toLocaleString('es-AR')}`, 20, y);
    y += 10;
    pdf.text(`Promedio Mensual: $${estadisticasAnuales.promedioMensual.toLocaleString('es-AR')}`, 20, y);
    y += 10;
    pdf.text(`Mes con Mayor Gasto: ${estadisticasAnuales.mesConMayorGasto.mes} ($${estadisticasAnuales.mesConMayorGasto.total.toLocaleString('es-AR')})`, 20, y);
    y += 10;
    pdf.text(`Mes con Menor Gasto: ${estadisticasAnuales.mesConMenorGasto.mes} ($${estadisticasAnuales.mesConMenorGasto.total.toLocaleString('es-AR')})`, 20, y);
    
    // Gastos por servicio
    y += 20;
    pdf.text('Gastos por Servicio:', 20, y);
    y += 10;
    
    Object.entries(estadisticasAnuales.gastosPorServicio).forEach(([servicio, total]) => {
      if (total > 0) {
        pdf.text(`${servicio.charAt(0).toUpperCase() + servicio.slice(1)}: $${total.toLocaleString('es-AR')}`, 30, y);
        y += 8;
      }
    });
    
    return new Blob([pdf.output('blob')], { type: 'application/pdf' });
  }

  /**
   * Crea un elemento DOM temporal con la plantilla del reporte mensual
   */
  private async crearElementoReporteMensual(
    cuentas: CuentaServicio[],
    estadisticas: EstadisticasMensuales,
    incluirGraficos: boolean
  ): Promise<HTMLElement> {
    // Crear elemento contenedor
    const elemento = document.createElement('div');
    elemento.style.position = 'absolute';
    elemento.style.left = '-9999px';
    elemento.style.top = '0';
    elemento.style.width = '210mm';
    elemento.style.backgroundColor = 'white';
    
    // Importar dinámicamente el componente React y renderizarlo
    const { PlantillaReporteMensual } = await import('../componentes/reportes');
    const React = await import('react');
    const ReactDOM = await import('react-dom/client');
    
    // Crear root y renderizar
    const root = ReactDOM.createRoot(elemento);
    
    return new Promise((resolve, reject) => {
      try {
        root.render(
          React.createElement(PlantillaReporteMensual, {
            cuentas,
            estadisticas,
            incluirGraficos
          })
        );
        
        // Esperar a que se complete el renderizado
        setTimeout(() => {
          document.body.appendChild(elemento);
          resolve(elemento);
        }, 100);
        
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Crea un elemento DOM temporal con la plantilla de planilla de pagos
   */
  private async crearElementoPlanillaPagos(
    cuentas: CuentaServicio[],
    mes: number,
    año: number
  ): Promise<HTMLElement> {
    // Crear elemento contenedor
    const elemento = document.createElement('div');
    elemento.style.position = 'absolute';
    elemento.style.left = '-9999px';
    elemento.style.top = '0';
    elemento.style.width = '210mm';
    elemento.style.backgroundColor = 'white';
    
    // Importar dinámicamente el componente React y renderizarlo
    const { PlantillaPlanillaPagos } = await import('../componentes/reportes');
    const React = await import('react');
    const ReactDOM = await import('react-dom/client');
    
    // Crear root y renderizar
    const root = ReactDOM.createRoot(elemento);
    
    return new Promise((resolve, reject) => {
      try {
        root.render(
          React.createElement(PlantillaPlanillaPagos, {
            cuentas,
            mes,
            año
          })
        );
        
        // Esperar a que se complete el renderizado
        setTimeout(() => {
          document.body.appendChild(elemento);
          resolve(elemento);
        }, 100);
        
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Convierte un elemento HTML a PDF usando html2canvas y jsPDF
   */
  private async convertirElementoAPDF(
    elemento: HTMLElement,
    nombreArchivo: string
  ): Promise<Blob> {
    try {
      // Generar canvas del elemento
      const canvas = await html2canvas(elemento, ServicioGeneradorPDF.CONFIG_CANVAS);
      
      // Crear PDF
      const pdf = new jsPDF(ServicioGeneradorPDF.CONFIG_PDF);
      
      // Configurar metadatos
      this.configurarMetadatosPDF(pdf, nombreArchivo);
      
      // Calcular dimensiones
      const imgWidth = 210; // A4 width en mm
      const pageHeight = 297; // A4 height en mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      
      let position = 0;
      
      // Agregar imagen al PDF
      const imgData = canvas.toDataURL('image/png', 0.8);
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      
      // Agregar páginas adicionales si es necesario
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      
      return new Blob([pdf.output('blob')], { type: 'application/pdf' });
      
    } catch (error) {
      console.error('Error al convertir elemento a PDF:', error);
      throw new Error(`Error en la conversión a PDF: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  /**
   * Configura los metadatos del PDF
   */
  private configurarMetadatosPDF(
    pdf: jsPDF,
    titulo: string,
    _tipo: string = 'reporte'
  ): void {
    
    pdf.setProperties({
      title: titulo,
      subject: `${_tipo.charAt(0).toUpperCase() + _tipo.slice(1)} de Cuentas de Servicios`,
      author: 'Sistema de Gestión de Cuentas de Servicios',
      creator: 'Sistema de Gestión de Cuentas de Servicios',
      keywords: 'cuentas, servicios, reporte, pdf'
    });
  }

  /**
   * Descarga un blob como archivo PDF
   */
  descargarPDF(blob: Blob, nombreArchivo: string): void {
    try {
      // Crear URL del blob
      const url = URL.createObjectURL(blob);
      
      // Crear elemento de descarga temporal
      const enlace = document.createElement('a');
      enlace.href = url;
      enlace.download = `${nombreArchivo}.pdf`;
      enlace.style.display = 'none';
      
      // Agregar al DOM, hacer clic y remover
      document.body.appendChild(enlace);
      enlace.click();
      document.body.removeChild(enlace);
      
      // Limpiar URL
      URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Error al descargar PDF:', error);
      throw new Error(`No se pudo descargar el archivo: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  /**
   * Genera y descarga un reporte en un solo paso
   */
  async generarYDescargarReporte(
    cuentas: CuentaServicio[],
    configuracion: ConfiguracionReporte
  ): Promise<void> {
    try {
      // Generar el reporte
      const blob = await this.generarReporte(cuentas, configuracion);
      
      // Crear nombre del archivo
      const nombreArchivo = this.generarNombreArchivo(configuracion);
      
      // Descargar
      this.descargarPDF(blob, nombreArchivo);
      
    } catch (error) {
      console.error('Error al generar y descargar reporte:', error);
      throw error;
    }
  }

  /**
   * Genera un nombre de archivo basado en la configuración del reporte
   */
  private generarNombreArchivo(configuracion: ConfiguracionReporte): string {
    const { tipo, periodo } = configuracion;
    const fechaGeneracion = format(new Date(), 'yyyy-MM-dd');
    
    switch (tipo) {
      case 'mensual':
        return `reporte-mensual-${periodo.año}-${periodo.mes?.toString().padStart(2, '0')}-${fechaGeneracion}`;
        
      case 'planilla':
        return `planilla-pagos-${periodo.año}-${periodo.mes?.toString().padStart(2, '0')}-${fechaGeneracion}`;
        
      case 'anual':
        return `reporte-anual-${periodo.año}-${fechaGeneracion}`;
        
      default:
        return `reporte-${fechaGeneracion}`;
    }
  }

  /**
   * Valida que la configuración del reporte sea correcta
   */
  validarConfiguracion(configuracion: ConfiguracionReporte): { valido: boolean; errores: string[] } {
    const errores: string[] = [];
    
    // Validar tipo
    if (!['mensual', 'planilla', 'anual'].includes(configuracion.tipo)) {
      errores.push('Tipo de reporte no válido');
    }
    
    // Validar período
    if (!configuracion.periodo.año || configuracion.periodo.año < 2020 || configuracion.periodo.año > 2050) {
      errores.push('Año no válido');
    }
    
    // Validar mes para reportes mensuales y planillas
    if ((configuracion.tipo === 'mensual' || configuracion.tipo === 'planilla')) {
      if (!configuracion.periodo.mes || configuracion.periodo.mes < 1 || configuracion.periodo.mes > 12) {
        errores.push('Mes no válido para reporte mensual o planilla');
      }
    }
    
    return {
      valido: errores.length === 0,
      errores
    };
  }

  /**
   * Genera un reporte PDF del desglose de sueldo.
   * Si se pasa `consolidado`, incluye una sección con las cuentas de servicios
   * y el supermercado reflejados, además del saldo disponible final.
   */
  generarReporteDesglose(
    desglose: DesgloseSueldo,
    resumen: ResumenDesglose,
    consolidado?: ResumenConsolidado
  ): void {
    const pdf = new jsPDF(ServicioGeneradorPDF.CONFIG_PDF);
    
    const formatearPesosChilenos = (monto: number): string => {
      return new Intl.NumberFormat('es-CL', {
        style: 'currency',
        currency: 'CLP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(monto);
    };
    
    this.configurarMetadatosPDF(pdf, `Desglose de Sueldo - ${desglose.nombre || 'Sin nombre'}`, 'desglose');
    
    // Título
    pdf.setFontSize(18);
    pdf.text('Desglose de Sueldo', 105, 20, { align: 'center' });
    
    pdf.setFontSize(12);
    pdf.text(desglose.nombre || 'Sin nombre', 105, 30, { align: 'center' });
    pdf.text(`${desglose.mes}/${desglose.año}`, 105, 37, { align: 'center' });
    
    // Resumen
    let y = 55;
    pdf.setFontSize(14);
    pdf.text('Resumen', 20, y);
    
    y += 10;
    pdf.setFontSize(11);
    pdf.text(`Sueldo Inicial: ${formatearPesosChilenos(resumen.sueldoInicial)}`, 20, y);
    
    y += 8;
    pdf.text(`Total Gastos Propios: ${formatearPesosChilenos(resumen.totalGastos)}`, 20, y);
    
    y += 8;
    pdf.text(`Total Gastos Bebe: ${formatearPesosChilenos(resumen.totalGastosBebe)}`, 20, y);
    
    y += 8;
    pdf.text(`Total Gastos Generales: ${formatearPesosChilenos(resumen.totalGastosGenerales)}`, 20, y);
    
    y += 8;
    pdf.text(`Total Descuentos: ${formatearPesosChilenos(resumen.totalDescuentos)}`, 20, y);
    
    y += 8;
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`Saldo Restante: ${formatearPesosChilenos(resumen.saldoRestante)}`, 20, y);
    pdf.setFont('helvetica', 'normal');
    
    y += 8;
    pdf.setFontSize(11);
    pdf.text(`Porcentaje Gastado: ${resumen.porcentajeGastado.toFixed(1)}%`, 20, y);

    // Sección consolidada: cuentas de servicios + supermercado + saldo disponible
    if (consolidado) {
      y += 15;
      if (y > 250) { pdf.addPage(); y = 20; }
      pdf.setFontSize(14);
      pdf.text('Descuentos Automaticos del Mes', 20, y);

      y += 10;
      pdf.setFontSize(11);

      if (consolidado.cuentasReflejadas.length > 0) {
        consolidado.cuentasReflejadas.forEach(cuenta => {
          if (y > 270) { pdf.addPage(); y = 20; }
          const nombre = cuenta.servicio.charAt(0).toUpperCase() + cuenta.servicio.slice(1);
          const estado = cuenta.pagada ? ' (pagada)' : '';
          const familiar = cuenta.esFamiliar
            ? ` [familiar${cuenta.titular ? ': ' + cuenta.titular : ''}]`
            : '';
          pdf.text(`${nombre}${estado}${familiar}`, 25, y);
          pdf.text(formatearPesosChilenos(cuenta.monto), 150, y);
          y += 7;
        });
        if (y > 270) { pdf.addPage(); y = 20; }
        pdf.setFont('helvetica', 'bold');
        pdf.text('Total Cuentas:', 25, y);
        pdf.text(formatearPesosChilenos(consolidado.totalCuentas), 150, y);
        pdf.setFont('helvetica', 'normal');
        y += 9;
      }

      if (consolidado.totalSupermercado > 0) {
        if (y > 270) { pdf.addPage(); y = 20; }
        pdf.text('Supermercado:', 25, y);
        pdf.text(formatearPesosChilenos(consolidado.totalSupermercado), 150, y);
        y += 9;
      }

      if (y > 260) { pdf.addPage(); y = 20; }
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`Saldo Disponible: ${formatearPesosChilenos(consolidado.saldoDisponible)}`, 20, y);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(11);
      y += 7;
      pdf.text(`Gastado (consolidado): ${consolidado.porcentajeGastadoConsolidado.toFixed(1)}%`, 20, y);
    }
    
    // Gastos por categoría (presupuesto)
    const etiquetasCategoria: Record<string, string> = {
      basicos: 'Gastos básicos',
      arriendo: 'Arriendo',
      supermercado: 'Supermercado',
      manutencion: 'Manutención',
      prestamos: 'Préstamos',
      otro: 'Otro'
    };
    const gastosPorCategoria: Record<string, number> = {};
    (desglose.gastos || []).forEach(g => {
      const cat = g.categoria || 'otro';
      gastosPorCategoria[cat] = (gastosPorCategoria[cat] || 0) + g.monto;
    });
    const categoriasConGasto = Object.entries(gastosPorCategoria).filter(([, m]) => m > 0);
    if (categoriasConGasto.length > 0) {
      y += 15;
      if (y > 250) { pdf.addPage(); y = 20; }
      pdf.setFontSize(14);
      pdf.text('Gastos Propios por Categoría', 20, y);
      y += 10;
      pdf.setFontSize(11);
      categoriasConGasto.forEach(([cat, monto]) => {
        if (y > 270) { pdf.addPage(); y = 20; }
        pdf.text(`${etiquetasCategoria[cat] || cat}: ${formatearPesosChilenos(monto)}`, 25, y);
        y += 7;
      });
    }

    // Gastos por tipo
    y += 15;
    pdf.setFontSize(14);
    pdf.text('Gastos Propios por Tipo', 20, y);
    
    y += 10;
    pdf.setFontSize(11);
    Object.entries(resumen.gastosPorTipo).forEach(([tipo, monto]) => {
      if (monto > 0) {
        pdf.text(`${tipo.charAt(0).toUpperCase() + tipo.slice(1)}: ${formatearPesosChilenos(monto)}`, 25, y);
        y += 7;
      }
    });
    
    // Detalle de gastos propios
    if (desglose.gastos && desglose.gastos.length > 0) {
      y += 10;
      pdf.setFontSize(14);
      pdf.text('Detalle de Gastos Propios', 20, y);
      
      y += 10;
      pdf.setFontSize(10);
      
      desglose.gastos.forEach((gasto, index) => {
        if (y > 270) {
          pdf.addPage();
          y = 20;
        }
        
        const fecha = format(gasto.fecha, 'dd/MM/yyyy');
        pdf.text(`${index + 1}. ${gasto.descripcion}`, 20, y);
        pdf.text(formatearPesosChilenos(gasto.monto), 150, y);
        pdf.text(gasto.tipo, 180, y);
        y += 5;
        pdf.setFontSize(9);
        pdf.text(gasto.categoria ? `${fecha} · ${gasto.categoria}` : fecha, 25, y);
        pdf.setFontSize(10);
        y += 8;
      });
    }
    
    // Detalle de gastos del bebé
    if (desglose.gastosBebe && desglose.gastosBebe.length > 0) {
      y += 10;
      if (y > 250) {
        pdf.addPage();
        y = 20;
      }
      
      pdf.setFontSize(14);
      pdf.text('Gastos del Bebe', 20, y);
      
      y += 10;
      pdf.setFontSize(10);
      
      desglose.gastosBebe.forEach((gasto, index) => {
        if (y > 270) {
          pdf.addPage();
          y = 20;
        }
        
        const fecha = format(gasto.fecha, 'dd/MM/yyyy');
        const montoTotal = gasto.monto * gasto.cantidad;
        
        pdf.text(`${index + 1}. ${gasto.descripcion}`, 20, y);
        pdf.text(gasto.tipo, 120, y);
        
        if (gasto.cantidad > 1) {
          pdf.text(`${formatearPesosChilenos(gasto.monto)} x ${gasto.cantidad}`, 150, y);
        } else {
          pdf.text(formatearPesosChilenos(montoTotal), 150, y);
        }
        
        y += 5;
        pdf.setFontSize(9);
        pdf.text(fecha, 25, y);
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'bold');
        pdf.text(formatearPesosChilenos(montoTotal), 180, y);
        pdf.setFont('helvetica', 'normal');
        y += 8;
      });
    }
    
    // Detalle de gastos generales
    if (desglose.gastosGenerales && desglose.gastosGenerales.length > 0) {
      y += 10;
      if (y > 250) {
        pdf.addPage();
        y = 20;
      }
      
      pdf.setFontSize(14);
      pdf.text('Gastos Generales', 20, y);
      
      y += 10;
      pdf.setFontSize(10);
      
      desglose.gastosGenerales.forEach((gasto, index) => {
        if (y > 270) {
          pdf.addPage();
          y = 20;
        }
        
        const fecha = format(gasto.fecha, 'dd/MM/yyyy');
        const montoTotal = gasto.monto * gasto.cantidad;
        
        pdf.text(`${index + 1}. ${gasto.titulo}`, 20, y);
        
        if (gasto.cantidad > 1) {
          pdf.text(`${formatearPesosChilenos(gasto.monto)} x ${gasto.cantidad}`, 150, y);
        } else {
          pdf.text(formatearPesosChilenos(montoTotal), 150, y);
        }
        
        y += 5;
        pdf.setFontSize(9);
        pdf.text(fecha, 25, y);
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'bold');
        pdf.text(formatearPesosChilenos(montoTotal), 180, y);
        pdf.setFont('helvetica', 'normal');
        y += 8;
      });
    }
    
    // Pie de página
    const totalPages = pdf.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      pdf.setPage(i);
      pdf.setFontSize(9);
      pdf.text(
        `Generado el ${format(new Date(), 'dd/MM/yyyy HH:mm')}`,
        105,
        290,
        { align: 'center' }
      );
      pdf.text(`Página ${i} de ${totalPages}`, 190, 290, { align: 'right' });
    }
    
    const meses = [
      'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
      'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
    ];
    
    const nombreMes = meses[desglose.mes - 1];
    const nombreArchivo = `desglose-de-sueldo-${nombreMes}-${desglose.año}`;
    this.descargarPDF(new Blob([pdf.output('blob')], { type: 'application/pdf' }), nombreArchivo);
  }

  /**
   * Genera un reporte PDF del desglose de gastos del bebé
   */
  generarReporteDesgloseBebe(desglose: any, resumen: any): void {
    const pdf = new jsPDF(ServicioGeneradorPDF.CONFIG_PDF);
    
    const formatearPesosChilenos = (monto: number): string => {
      return new Intl.NumberFormat('es-CL', {
        style: 'currency',
        currency: 'CLP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(monto);
    };

    const nombresCategoria: Record<string, string> = {
      alimentacion: 'Alimentación',
      panales: 'Pañales',
      ropa: 'Ropa',
      salud: 'Salud',
      muebles: 'Muebles',
      juguetes: 'Juguetes',
      guarderia: 'Guardería',
      educacion: 'Educación',
      higiene: 'Higiene',
      otro: 'Otro'
    };
    
    this.configurarMetadatosPDF(pdf, `Gastos del Bebé - ${desglose.nombre || 'Sin nombre'}`, 'desglose-bebe');
    
    // Título con emoji
    pdf.setFontSize(18);
    pdf.text('Gastos del Bebé', 105, 20, { align: 'center' });
    
    pdf.setFontSize(12);
    pdf.text(desglose.nombre || 'Sin nombre', 105, 30, { align: 'center' });
    pdf.text(`${desglose.mes}/${desglose.año}`, 105, 37, { align: 'center' });
    
    // Resumen
    let y = 55;
    pdf.setFontSize(14);
    pdf.text('Resumen', 20, y);
    
    y += 10;
    pdf.setFontSize(11);
    pdf.text(`Presupuesto Mensual: ${formatearPesosChilenos(resumen.presupuestoMensual)}`, 20, y);
    
    y += 8;
    pdf.text(`Total Gastos: ${formatearPesosChilenos(resumen.totalGastos)}`, 20, y);
    
    y += 8;
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`Saldo Restante: ${formatearPesosChilenos(resumen.saldoRestante)}`, 20, y);
    pdf.setFont('helvetica', 'normal');
    
    y += 8;
    pdf.setFontSize(11);
    pdf.text(`Porcentaje Gastado: ${resumen.porcentajeGastado.toFixed(1)}%`, 20, y);
    
    // Gastos por categoría
    y += 15;
    pdf.setFontSize(14);
    pdf.text('Gastos por Categoria', 20, y);
    
    y += 10;
    pdf.setFontSize(11);
    Object.entries(resumen.gastosPorTipo).forEach(([tipo, monto]: [string, any]) => {
      if (monto > 0) {
        pdf.text(`${nombresCategoria[tipo]}: ${formatearPesosChilenos(monto)}`, 25, y);
        y += 7;
      }
    });
    
    // Detalle de gastos
    y += 10;
    pdf.setFontSize(14);
    pdf.text('Detalle de Gastos', 20, y);
    
    y += 10;
    pdf.setFontSize(10);
    
    desglose.gastos.forEach((gasto: any, index: number) => {
      if (y > 260) {
        pdf.addPage();
        y = 20;
      }
      
      const fecha = format(gasto.fecha, 'dd/MM/yyyy');
      const montoTotal = gasto.monto * gasto.cantidad;
      
      pdf.text(`${index + 1}. ${gasto.descripcion}`, 20, y);
      pdf.text(nombresCategoria[gasto.tipo], 120, y);
      
      if (gasto.cantidad > 1) {
        pdf.text(`${formatearPesosChilenos(gasto.monto)} x ${gasto.cantidad}`, 160, y);
      }
      
      y += 5;
      pdf.setFontSize(9);
      pdf.text(fecha, 25, y);
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.text(formatearPesosChilenos(montoTotal), 160, y);
      pdf.setFont('helvetica', 'normal');
      
      if (gasto.notas) {
        y += 5;
        pdf.setFontSize(9);
        pdf.text(`Nota: ${gasto.notas}`, 25, y);
        pdf.setFontSize(10);
      }

      if (gasto.enlaceProducto) {
        y += 5;
        pdf.setFontSize(9);
        pdf.setTextColor(37, 99, 235);
        pdf.textWithLink('Ver producto', 25, y, { url: gasto.enlaceProducto });
        pdf.setTextColor(0, 0, 0);
        pdf.setFontSize(10);
      }
      
      y += 8;
    });
    
    // Pie de página
    const totalPages = pdf.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      pdf.setPage(i);
      pdf.setFontSize(9);
      pdf.text(
        `Generado el ${format(new Date(), 'dd/MM/yyyy HH:mm')}`,
        105,
        290,
        { align: 'center' }
      );
      pdf.text(`Página ${i} de ${totalPages}`, 190, 290, { align: 'right' });
    }
    
    const meses = [
      'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
      'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
    ];
    
    const nombreMes = meses[desglose.mes - 1];
    const nombreArchivo = `gastos-bebe-${nombreMes}-${desglose.año}`;
    this.descargarPDF(new Blob([pdf.output('blob')], { type: 'application/pdf' }), nombreArchivo);
  }

  /**
   * Genera un reporte PDF de la calculadora de gastos
   */
  generarReporteCalculadora(calculadora: any, resumen: any): void {
    const pdf = new jsPDF(ServicioGeneradorPDF.CONFIG_PDF);
    
    const formatearPesosChilenos = (monto: number): string => {
      return new Intl.NumberFormat('es-CL', {
        style: 'currency',
        currency: 'CLP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(monto);
    };
    
    this.configurarMetadatosPDF(pdf, 'Calculadora de Gastos', 'calculadora-gastos');
    
    // Título
    pdf.setFontSize(18);
    pdf.text('Calculadora de Gastos', 105, 20, { align: 'center' });
    
    pdf.setFontSize(12);
    pdf.text(`Generado el ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 105, 30, { align: 'center' });
    
    // Resumen
    let y = 50;
    pdf.setFontSize(14);
    pdf.text('Resumen', 20, y);
    
    y += 10;
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`Total: ${formatearPesosChilenos(resumen.totalGastos)}`, 20, y);
    pdf.setFont('helvetica', 'normal');
    
    y += 8;
    pdf.setFontSize(11);
    pdf.text(`Cantidad de gastos: ${resumen.cantidadGastos}`, 20, y);
    
    // Detalle de gastos
    y += 20;
    pdf.setFontSize(14);
    pdf.text('Detalle de Gastos', 20, y);
    
    y += 10;
    pdf.setFontSize(10);
    
    calculadora.gastos.forEach((gasto: any, index: number) => {
      if (y > 260) {
        pdf.addPage();
        y = 20;
      }
      
      const fecha = format(gasto.fecha, 'dd/MM/yyyy HH:mm');
      const montoTotal = gasto.monto * gasto.cantidad;
      
      pdf.text(`${index + 1}. ${gasto.titulo}`, 20, y);
      
      if (gasto.cantidad > 1) {
        y += 5;
        pdf.setFontSize(9);
        pdf.text(`${formatearPesosChilenos(gasto.monto)} x ${gasto.cantidad}`, 25, y);
        pdf.setFontSize(10);
      }
      
      y += 5;
      pdf.setFontSize(9);
      pdf.text(fecha, 25, y);
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.text(formatearPesosChilenos(montoTotal), 160, y);
      pdf.setFont('helvetica', 'normal');
      
      y += 10;
    });
    
    // Pie de página
    const totalPages = pdf.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      pdf.setPage(i);
      pdf.setFontSize(9);
      pdf.text(
        `Generado el ${format(new Date(), 'dd/MM/yyyy HH:mm')}`,
        105,
        290,
        { align: 'center' }
      );
      pdf.text(`Página ${i} de ${totalPages}`, 190, 290, { align: 'right' });
    }
    
    const nombreArchivo = `calculadora-gastos-${format(new Date(), 'yyyy-MM-dd')}`;
    this.descargarPDF(new Blob([pdf.output('blob')], { type: 'application/pdf' }), nombreArchivo);
  }
}

// Instancia singleton del servicio
export const servicioGeneradorPDF = new ServicioGeneradorPDF();