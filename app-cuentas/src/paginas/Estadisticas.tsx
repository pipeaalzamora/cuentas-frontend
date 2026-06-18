import React from 'react';
import { PanelEstadisticas, PanelPredicciones } from '../componentes';

export const Estadisticas: React.FC = () => {
  return (
    <div className="pagina-container">
      <div className="pagina-header">
        <h1>Estadísticas y Análisis</h1>
      </div>
      <PanelEstadisticas />
      <PanelPredicciones />
    </div>
  );
};

export default Estadisticas;