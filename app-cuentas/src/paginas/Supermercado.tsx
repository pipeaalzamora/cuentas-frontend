import ListaSupermercado from '../componentes/ListaSupermercado';
import HistorialCompras from '../componentes/HistorialCompras';

const Supermercado = () => {
  return (
    <div className="pagina-container">
      <ListaSupermercado />
      <HistorialCompras />
    </div>
  );
};

export default Supermercado;
