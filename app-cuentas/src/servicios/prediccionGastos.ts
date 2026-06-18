// Servicio para predicción de gastos futuros basado en histórico

import type { 
  CuentaServicio, 
  TipoServicio,
  PrediccionMensual,
  PrediccionServicio,
  DatosHistoricos,
  EstadisticasTendencia,
  ConfiguracionPrediccion,
  AnalisisPatrones
} from '../tipos';

class ServicioPrediccionGastos {
  private configuracionDefault: ConfiguracionPrediccion = {
    mesesHistoricos: 6,
    factorEstacionalidad: true,
    ajustarInflacion: false,
    tasaInflacionAnual: 0.05
  };

  /**
   * Predice gastos para el próximo mes basado en histórico
   */
  predecirProximoMes(
    cuentas: CuentaServicio[],
    configuracion?: Partial<ConfiguracionPrediccion>
  ): PrediccionMensual {
    const config = { ...this.configuracionDefault, ...configuracion };
    const fechaActual = new Date();
    const mesProximo = fechaActual.getMonth() + 1;
    const añoProximo = mesProximo > 11 ? fechaActual.getFullYear() + 1 : fechaActual.getFullYear();
    const mesAjustado = mesProximo > 11 ? 0 : mesProximo;

    const datosHistoricos = this.extraerDatosHistoricos(cuentas, config.mesesHistoricos);
    const servicios: TipoServicio[] = ['luz', 'agua', 'gas', 'internet'];
    
    const prediccionesPorServicio: PrediccionServicio[] = servicios.map(servicio => {
      return this.predecirServicio(servicio, datosHistoricos, mesAjustado, config);
    });

    const totalPredicho = prediccionesPorServicio.reduce(
      (sum, pred) => sum + pred.montoPredicho, 
      0
    );

    const confianzaGeneral = prediccionesPorServicio.reduce(
      (sum, pred) => sum + pred.confianza, 
      0
    ) / prediccionesPorServicio.length;

    return {
      mes: mesAjustado,
      año: añoProximo,
      totalPredicho,
      prediccionesPorServicio,
      confianzaGeneral,
      basadoEnMeses: Math.min(config.mesesHistoricos, datosHistoricos.length)
    };
  }

  /**
   * Predice gastos para múltiples meses futuros
   */
  predecirMultiplesMeses(
    cuentas: CuentaServicio[],
    cantidadMeses: number,
    configuracion?: Partial<ConfiguracionPrediccion>
  ): PrediccionMensual[] {
    const predicciones: PrediccionMensual[] = [];
    const fechaActual = new Date();

    for (let i = 1; i <= cantidadMeses; i++) {
      const mes = (fechaActual.getMonth() + i) % 12;
      const año = fechaActual.getFullYear() + Math.floor((fechaActual.getMonth() + i) / 12);

      // i = cuántos meses hacia el futuro, para acumular inflación correctamente
      const prediccion = this.predecirMesFuturo(cuentas, mes, año, configuracion, i);
      predicciones.push(prediccion);
    }

    return predicciones;
  }

  /**
   * Predice un mes específico en el futuro
   */
  private predecirMesFuturo(
    cuentas: CuentaServicio[],
    mes: number,
    año: number,
    configuracion?: Partial<ConfiguracionPrediccion>,
    mesesHaciaFuturo: number = 1
  ): PrediccionMensual {
    const config = { ...this.configuracionDefault, ...configuracion };
    const datosHistoricos = this.extraerDatosHistoricos(cuentas, config.mesesHistoricos);
    const servicios: TipoServicio[] = ['luz', 'agua', 'gas', 'internet'];
    
    const prediccionesPorServicio: PrediccionServicio[] = servicios.map(servicio => {
      return this.predecirServicio(servicio, datosHistoricos, mes, config, mesesHaciaFuturo);
    });

    const totalPredicho = prediccionesPorServicio.reduce(
      (sum, pred) => sum + pred.montoPredicho, 
      0
    );

    const confianzaGeneral = prediccionesPorServicio.reduce(
      (sum, pred) => sum + pred.confianza, 
      0
    ) / prediccionesPorServicio.length;

    return {
      mes,
      año,
      totalPredicho,
      prediccionesPorServicio,
      confianzaGeneral,
      basadoEnMeses: Math.min(config.mesesHistoricos, datosHistoricos.length)
    };
  }

  /**
   * Predice gasto para un servicio específico
   */
  private predecirServicio(
    servicio: TipoServicio,
    datosHistoricos: DatosHistoricos[],
    mesFuturo: number,
    config: ConfiguracionPrediccion,
    mesesHaciaFuturo: number = 1
  ): PrediccionServicio {
    const datosServicio = datosHistoricos.filter(d => d.servicio === servicio);

    if (datosServicio.length === 0) {
      return {
        servicio,
        montoPredicho: 0,
        confianza: 0,
        tendencia: 'estable',
        variacionPorcentual: 0
      };
    }

    const estadisticas = this.calcularEstadisticas(datosServicio);
    let montoPredicho = estadisticas.promedio;

    // Aplicar tendencia lineal
    if (datosServicio.length >= 3) {
      const prediccionTendencia = estadisticas.tendenciaLineal.pendiente * datosServicio.length + 
                                   estadisticas.tendenciaLineal.intercepto;
      montoPredicho = (montoPredicho + prediccionTendencia) / 2;
    }

    // Aplicar factor estacional si está habilitado
    if (config.factorEstacionalidad && datosServicio.length >= 6) {
      const factorEstacional = this.calcularFactorEstacional(datosServicio, mesFuturo);
      montoPredicho *= factorEstacional;
    }

    // Ajustar por inflación si está habilitado (acumulada según meses al futuro)
    if (config.ajustarInflacion && config.tasaInflacionAnual) {
      const factorInflacion = Math.pow(1 + config.tasaInflacionAnual / 12, mesesHaciaFuturo);
      montoPredicho *= factorInflacion;
    }

    // Calcular confianza basada en cantidad de datos y variabilidad
    const confianza = this.calcularConfianza(datosServicio, estadisticas);

    // Determinar tendencia
    const tendencia = this.determinarTendencia(estadisticas);

    // Calcular variación porcentual respecto al promedio
    const variacionPorcentual = ((montoPredicho - estadisticas.promedio) / estadisticas.promedio) * 100;

    return {
      servicio,
      montoPredicho: Math.round(montoPredicho * 100) / 100,
      confianza,
      tendencia,
      variacionPorcentual: Math.round(variacionPorcentual * 100) / 100
    };
  }

  /**
   * Extrae datos históricos de las cuentas
   */
  private extraerDatosHistoricos(
    cuentas: CuentaServicio[],
    mesesHistoricos: number
  ): DatosHistoricos[] {
    const fechaActual = new Date();
    const fechaLimite = new Date(fechaActual);
    fechaLimite.setMonth(fechaLimite.getMonth() - mesesHistoricos);

    return cuentas
      .filter(cuenta => {
        const fechaCuenta = new Date(cuenta.año, cuenta.mes);
        return fechaCuenta >= fechaLimite && fechaCuenta < fechaActual;
      })
      .map(cuenta => ({
        mes: cuenta.mes,
        año: cuenta.año,
        servicio: cuenta.servicio,
        monto: cuenta.monto
      }));
  }

  /**
   * Calcula estadísticas de tendencia
   */
  private calcularEstadisticas(datos: DatosHistoricos[]): EstadisticasTendencia {
    const montos = datos.map(d => d.monto);
    const n = montos.length;

    const promedio = montos.reduce((sum, m) => sum + m, 0) / n;
    
    const montosOrdenados = [...montos].sort((a, b) => a - b);
    const mediana = n % 2 === 0
      ? (montosOrdenados[n / 2 - 1] + montosOrdenados[n / 2]) / 2
      : montosOrdenados[Math.floor(n / 2)];

    const varianza = montos.reduce((sum, m) => sum + Math.pow(m - promedio, 2), 0) / n;
    const desviacionEstandar = Math.sqrt(varianza);

    const minimo = Math.min(...montos);
    const maximo = Math.max(...montos);

    // Calcular regresión lineal simple
    const { pendiente, intercepto } = this.calcularRegresionLineal(montos);

    return {
      promedio,
      mediana,
      desviacionEstandar,
      minimo,
      maximo,
      tendenciaLineal: { pendiente, intercepto }
    };
  }

  /**
   * Calcula regresión lineal simple
   */
  private calcularRegresionLineal(valores: number[]): { pendiente: number; intercepto: number } {
    const n = valores.length;
    const indices = Array.from({ length: n }, (_, i) => i);

    const sumaX = indices.reduce((sum, x) => sum + x, 0);
    const sumaY = valores.reduce((sum, y) => sum + y, 0);
    const sumaXY = indices.reduce((sum, x, i) => sum + x * valores[i], 0);
    const sumaX2 = indices.reduce((sum, x) => sum + x * x, 0);

    const pendiente = (n * sumaXY - sumaX * sumaY) / (n * sumaX2 - sumaX * sumaX);
    const intercepto = (sumaY - pendiente * sumaX) / n;

    return { pendiente, intercepto };
  }

  /**
   * Calcula factor estacional para un mes específico
   */
  private calcularFactorEstacional(datos: DatosHistoricos[], mesFuturo: number): number {
    const datosMes = datos.filter(d => d.mes === mesFuturo);
    
    if (datosMes.length === 0) {
      return 1.0;
    }

    const promedioMes = datosMes.reduce((sum, d) => sum + d.monto, 0) / datosMes.length;
    const promedioGeneral = datos.reduce((sum, d) => sum + d.monto, 0) / datos.length;

    return promedioGeneral > 0 ? promedioMes / promedioGeneral : 1.0;
  }

  /**
   * Calcula nivel de confianza de la predicción
   */
  private calcularConfianza(datos: DatosHistoricos[], estadisticas: EstadisticasTendencia): number {
    // Confianza basada en cantidad de datos (más datos = más confianza)
    const confianzaCantidad = Math.min(datos.length / 12, 1.0);

    // Confianza basada en variabilidad (menos variabilidad = más confianza)
    const coeficienteVariacion = estadisticas.promedio > 0 
      ? estadisticas.desviacionEstandar / estadisticas.promedio 
      : 1;
    const confianzaVariabilidad = Math.max(0, 1 - coeficienteVariacion);

    // Promedio ponderado
    return (confianzaCantidad * 0.6 + confianzaVariabilidad * 0.4);
  }

  /**
   * Determina la tendencia basada en estadísticas
   */
  private determinarTendencia(estadisticas: EstadisticasTendencia): 'ascendente' | 'descendente' | 'estable' {
    const umbral = estadisticas.promedio * 0.05; // 5% del promedio

    if (estadisticas.tendenciaLineal.pendiente > umbral) {
      return 'ascendente';
    } else if (estadisticas.tendenciaLineal.pendiente < -umbral) {
      return 'descendente';
    } else {
      return 'estable';
    }
  }

  /**
   * Analiza patrones estacionales en los datos
   */
  analizarPatrones(cuentas: CuentaServicio[], servicio?: TipoServicio): AnalisisPatrones {
    const cuentasFiltradas = servicio 
      ? cuentas.filter(c => c.servicio === servicio)
      : cuentas;

    const gastosPorMes = new Map<number, number[]>();

    cuentasFiltradas.forEach(cuenta => {
      const gastos = gastosPorMes.get(cuenta.mes) || [];
      gastos.push(cuenta.monto);
      gastosPorMes.set(cuenta.mes, gastos);
    });

    const promediosPorMes = Array.from(gastosPorMes.entries()).map(([mes, gastos]) => ({
      mes,
      promedio: gastos.reduce((sum, g) => sum + g, 0) / gastos.length
    }));

    if (promediosPorMes.length < 6) {
      return {
        tienePatronEstacional: false,
        mesesPico: [],
        mesesBajo: [],
        variabilidad: 'baja'
      };
    }

    const promedioGeneral = promediosPorMes.reduce((sum, p) => sum + p.promedio, 0) / promediosPorMes.length;
    const desviacion = Math.sqrt(
      promediosPorMes.reduce((sum, p) => sum + Math.pow(p.promedio - promedioGeneral, 2), 0) / promediosPorMes.length
    );

    const umbralPico = promedioGeneral + desviacion * 0.5;
    const umbralBajo = promedioGeneral - desviacion * 0.5;

    const mesesPico = promediosPorMes.filter(p => p.promedio > umbralPico).map(p => p.mes);
    const mesesBajo = promediosPorMes.filter(p => p.promedio < umbralBajo).map(p => p.mes);

    const coeficienteVariacion = promedioGeneral > 0 ? desviacion / promedioGeneral : 0;
    const variabilidad: 'alta' | 'media' | 'baja' = 
      coeficienteVariacion > 0.3 ? 'alta' : 
      coeficienteVariacion > 0.15 ? 'media' : 'baja';

    return {
      tienePatronEstacional: mesesPico.length > 0 || mesesBajo.length > 0,
      mesesPico,
      mesesBajo,
      variabilidad
    };
  }
}

export const servicioPrediccionGastos = new ServicioPrediccionGastos();
