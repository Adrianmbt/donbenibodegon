import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useSearch } from "../context/SearchContext";

const Inventario = () => {
  const { searchQuery, updateSearch } = useSearch();
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  const filterParam = searchParams.get("filter");

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalCatOpen, setModalCatOpen] = useState(false);
  const [editando, setEditando] = useState(null);
  const [categorias, setCategorias] = useState([]);
  const [nuevaCategoria, setNuevaCategoria] = useState("");
  const [proveedores, setProveedores] = useState([]);
  const [form, setForm] = useState({
    nombre: "", barcode: "", precio_usd: 0, costo_usd: 0, stock: 0, stock_minimo: 5, categoria_id: "", proveedor_id: "",
    es_licor: false, unidades_por_caja: 1, precio_caja_usd: 0.0
  });

  const fetchProductos = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/inventario/productos", {
        headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
      });
      if (!response.ok) throw new Error("Error al cargar productos");
      const data = await response.json();
      setProductos(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchCatalogos = async () => {
    try {
      const headers = { "Authorization": `Bearer ${localStorage.getItem("token")}` };
      const [resCat, resProv] = await Promise.all([
        fetch("/api/inventario/categorias", { headers }),
        fetch("/api/proveedores/", { headers })
      ]);
      if (resCat.ok) setCategorias(await resCat.json());
      if (resProv.ok) setProveedores(await resProv.json());
    } catch (e) { console.error(e); }
  };

  const handleSaveCategoria = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/inventario/categorias", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({ nombre: nuevaCategoria })
      });
      if (res.ok) {
        setNuevaCategoria("");
        setModalCatOpen(false);
        fetchCatalogos();
      }
    } catch (e) { console.error(e); }
  };

  const handleDeleteCategoria = async (id) => {
    if (!window.confirm("¿Seguro que deseas eliminar esta categoría?")) return;
    try {
      const res = await fetch(`/api/inventario/categorias/${id}`, { 
        method: "DELETE",
        headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
      });
      if (res.ok) fetchCatalogos();
      else alert("No se puede eliminar (podría tener productos vinculados)");
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    fetchProductos();
    fetchCatalogos();
  }, []);


  const handleSave = async (e) => {
    e.preventDefault();
    const url = editando ? `/api/inventario/productos/${editando}` : "/api/inventario/productos";
    const method = editando ? "PUT" : "POST";
    
    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      if (res.ok) {
        setModalOpen(false);
        fetchProductos();
      } else {
        const errorData = await res.json();
        alert(`Error: ${errorData.detail || "No se pudo guardar el producto"}`);
      }
    } catch (e) {
      console.error(e);
      alert("Error de conexión");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("¿Seguro que deseas eliminar este producto?")) return;
    try {
      const res = await fetch(`/api/inventario/productos/${id}`, { method: "DELETE" });
      if (res.ok) fetchProductos();
      else alert("Error al eliminar");
    } catch (e) { console.error(e); }
  };

  let productosFiltrados = productos.filter((p) =>
    p.producto?.nombre?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.producto?.barcode?.includes(searchQuery)
  );

  if (filterParam === "critical") {
      productosFiltrados = productosFiltrados.filter(p => p.stock <= p.stock_minimo);
  }

  // Paginación
  useEffect(() => { setCurrentPage(1); }, [searchQuery, filterParam]);
  const totalPages = Math.ceil(productosFiltrados.length / itemsPerPage) || 1;
  const currentItems = productosFiltrados.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  const handleOpenModal = (pt = null) => {
    if (pt) {
      setEditando(pt.producto_id);
      setForm({ 
        ...pt.producto,
        stock: pt.stock,
        precio_usd: pt.precio_usd,
        precio_caja_usd: pt.precio_caja_usd,
        stock_minimo: pt.stock_minimo,
        activo: pt.activo
      });
    } else {
      setEditando(null);
      setForm({ 
        nombre: "", barcode: "", precio_usd: 0.0, costo_usd: 0.0, stock: 0, stock_minimo: 5, 
        categoria_id: categorias[0]?.id || "", proveedor_id: proveedores[0]?.id || "",
        es_licor: false, unidades_por_caja: 1, precio_caja_usd: 0.0
      });
    }
    setModalOpen(true);
  };

  return (
    <div className="p-10 animate-in fade-in duration-500">
      {/* Hero Header */}
      <div className="mb-12">
        <h1 className="text-6xl font-bold tracking-tighter text-on-surface mb-2 font-headline">
          Control de <span className="text-primary">Inventario</span>
        </h1>
        <p className="text-on-surface-variant font-medium tracking-tight">
          Supervisa tus existencias, precios y estados de stock en tiempo real.
        </p>
      </div>

      {/* Acciones Rápidas */}
      <div className="flex flex-wrap gap-4 mb-8">
        <div className="relative flex-1 min-w-[300px]">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/50 transition-colors group-focus-within:text-primary">
            search
          </span>
          <input
            type="text"
            placeholder="Buscar por nombre o código de barras..."
            className="w-full bg-surface-container-low border border-outline-variant/10 rounded-xl py-4 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-medium"
            value={searchQuery}
            onChange={(e) => updateSearch(e.target.value)}
          />
        </div>
        {filterParam === "critical" && (
           <button 
             onClick={() => navigate('/inventario')}
             className="bg-error/10 text-error px-6 py-4 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg shadow-error/10"
           >
             <span className="material-symbols-outlined text-sm">close</span>
             Quitar Filtro Crítico
           </button>
        )}
        <button 
          onClick={fetchProductos}
          className="bg-surface-container-high hover:bg-surface-container-highest text-on-surface p-4 rounded-xl border border-outline-variant/10 transition-all active:scale-95"
          title="Refrescar Inventario"
        >
          <span className="material-symbols-outlined">refresh</span>
        </button>
        <button 
          onClick={() => setModalCatOpen(true)}
          className="bg-surface border border-white/10 text-on-surface px-6 py-4 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-white/5 active:scale-95 transition-all shadow-lg"
        >
          <span className="material-symbols-outlined text-sm">category</span>
          Gestionar Categorías
        </button>
        <button 
          onClick={() => handleOpenModal()}
          className="bg-primary text-on-primary px-6 py-4 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center gap-2 hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-primary/20"
        >
          <span className="material-symbols-outlined text-sm">add</span>
          Nuevo Producto
        </button>
      </div>

      {/* Tabla de Productos */}
      <div className="bg-surface-container-low rounded-2xl border border-outline-variant/10 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] uppercase tracking-[0.2em] text-on-surface-variant/60 border-b border-outline-variant/10">
                <th className="px-8 py-6 font-bold">Producto</th>
                <th className="px-8 py-6 font-bold">Código</th>
                <th className="px-8 py-6 font-bold text-center">Stock</th>
                <th className="px-8 py-6 font-bold text-right">Precio (USD)</th>
                <th className="px-8 py-6 font-bold text-right">Estado</th>
                <th className="px-8 py-6 font-bold text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/5">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-8 py-20 text-center text-on-surface-variant/50 italic">
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                      Sincronizando con el almacén...
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan="6" className="px-8 py-20 text-center text-error">
                    <span className="material-symbols-outlined text-4xl mb-2">error</span>
                    <p>{error}</p>
                  </td>
                </tr>
              ) : productosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-8 py-20 text-center text-on-surface-variant/50">
                    No se encontraron productos que coincidan con la búsqueda.
                  </td>
                </tr>
              ) : (
                currentItems.map((item) => (
                  <tr key={item.id} className="group hover:bg-surface-container/50 transition-colors">
                    <td className="px-8 py-5">
                      <div className="font-bold text-on-surface">{item.producto?.nombre}</div>
                      <div className="text-[10px] text-on-surface-variant/60 uppercase tracking-widest mt-1">
                        ID: #{item.producto_id} | <span className="text-primary/70">{categorias.find(c => c.id === item.producto?.categoria_id)?.nombre || "Sin Cat."}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5 font-mono text-xs text-on-surface-variant">
                      {item.producto?.barcode}
                    </td>
                    <td className="px-8 py-5 text-center">
                      <span className={`font-mono font-bold text-lg ${item.stock <= item.stock_minimo ? 'text-error' : 'text-primary'}`}>
                        {item.stock}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-right font-mono font-bold text-secondary">
                      ${item.precio_usd.toFixed(2)}
                    </td>
                    <td className="px-8 py-5 text-right">
                      {item.stock <= 0 ? (
                        <span className="bg-error/10 text-error px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest">
                          Agotado
                        </span>
                      ) : item.stock <= item.stock_minimo ? (
                        <span className="bg-secondary/10 text-secondary px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest">
                          Stock Bajo
                        </span>
                      ) : (
                        <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest">
                          Disponible
                        </span>
                      )}
                    </td>
                    <td className="px-8 py-5 text-center">
                      <div className="flex justify-center gap-2">
                        <button 
                          onClick={() => handleOpenModal(item)}
                          className="text-on-surface-variant hover:text-primary p-2 rounded-lg transition-colors"
                        >
                          <span className="material-symbols-outlined text-lg">edit</span>
                        </button>
                        <button 
                          onClick={() => handleDelete(item.producto_id)}
                          className="text-on-surface-variant hover:text-error p-2 rounded-lg transition-colors"
                        >
                          <span className="material-symbols-outlined text-lg">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Controles de Paginación */}
        {totalPages > 1 && (
          <div className="flex justify-between items-center p-6 border-t border-outline-variant/10 bg-surface/50">
            <p className="text-[10px] uppercase font-bold text-on-surface-variant/50 tracking-widest">
               Mostrando {((currentPage - 1) * itemsPerPage) + 1} a {Math.min(currentPage * itemsPerPage, productosFiltrados.length)} de {productosFiltrados.length} productos
            </p>
            <div className="flex items-center gap-2">
               <button disabled={currentPage === 1} onClick={() => goToPage(currentPage - 1)} className="p-2 rounded-lg bg-surface border border-white/5 disabled:opacity-30 hover:bg-white/5 transition-colors text-on-surface"><span className="material-symbols-outlined text-sm">chevron_left</span></button>
               <span className="text-xs font-bold font-mono px-4 text-on-surface">Página {currentPage} de {totalPages}</span>
               <button disabled={currentPage === totalPages} onClick={() => goToPage(currentPage + 1)} className="p-2 rounded-lg bg-surface border border-white/5 disabled:opacity-30 hover:bg-white/5 transition-colors text-on-surface"><span className="material-symbols-outlined text-sm">chevron_right</span></button>
            </div>
          </div>
        )}
      </div>

      {/* Resumen de Inventario (Mini Cards) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
        <div className="bg-surface-container-low p-8 rounded-2xl border border-outline-variant/10 shadow-lg relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform">
            <span className="material-symbols-outlined text-9xl">inventory_2</span>
          </div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-on-surface-variant/60 font-bold mb-2">Total Productos</p>
          <p className="text-4xl font-bold font-mono">{productos.length}</p>
        </div>
        <div className="bg-surface-container-low p-8 rounded-2xl border border-outline-variant/10 shadow-lg relative overflow-hidden group">
           <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform">
            <span className="material-symbols-outlined text-9xl">warning</span>
          </div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-on-surface-variant/60 font-bold mb-2">Stock Bajo / Crítico</p>
          <p className="text-4xl font-bold font-mono text-secondary">
            {productos.filter(p => p.stock <= p.stock_minimo).length}
          </p>
        </div>
        <div className="bg-surface-container-low p-8 rounded-2xl border border-outline-variant/10 shadow-lg relative overflow-hidden group border-l-4 border-primary/40">
           <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform">
            <span className="material-symbols-outlined text-9xl">payments</span>
          </div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-on-surface-variant/60 font-bold mb-2">Valor Estimado</p>
          <p className="text-4xl font-bold font-mono text-primary">
            ${productos.reduce((acc, p) => acc + (p.stock * p.precio_usd), 0).toLocaleString()}
          </p>
        </div>
      </div>

      {/* Modal de Producto */}
      {modalOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-xl z-[200] flex items-center justify-center p-6 animate-in zoom-in-95 duration-300">
          <div className="bg-surface w-full max-w-2xl rounded-[3rem] p-12 border border-white/10 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 h-full pointer-events-none opacity-[0.03]">
               <span className="material-symbols-outlined text-[15rem]">inventory</span>
            </div>
            
            <h2 className="text-4xl font-black tracking-tighter mb-8">
              {editando ? "Editar" : "Nuevo"} <span className="text-primary">Producto</span>
            </h2>
            
            <form onSubmit={handleSave} className="space-y-6 relative z-10">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/50">Nombre del Producto</label>
                  <input required className="w-full bg-background border border-white/5 p-4 rounded-2xl text-xs outline-none focus:border-primary/50 transition-all font-bold" value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/50">Código de Barras / SKU</label>
                  <input required className="w-full bg-background border border-white/5 p-4 rounded-2xl text-xs outline-none focus:border-primary/50 transition-all font-mono" value={form.barcode} onChange={e => setForm({...form, barcode: e.target.value})} />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/50">Costo (USD)</label>
                  <input type="number" step="0.01" className="w-full bg-background border border-white/5 p-4 rounded-2xl text-xs outline-none focus:border-primary/50 transition-all font-mono text-error/80" value={form.costo_usd} onChange={e => setForm({...form, costo_usd: parseFloat(e.target.value)})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/50">Precio Venta (USD)</label>
                  <input type="number" step="0.01" className="w-full bg-background border border-white/5 p-4 rounded-2xl text-xs outline-none focus:border-primary/50 transition-all font-mono text-primary font-black" value={form.precio_usd} onChange={e => setForm({...form, precio_usd: parseFloat(e.target.value)})} />
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/50">Stock Inicial</label>
                    <input type="number" className="w-full bg-background border border-white/5 p-4 rounded-2xl text-xs outline-none focus:border-primary/50 transition-all font-mono font-bold" value={form.stock} onChange={e => setForm({...form, stock: parseInt(e.target.value)})} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/50">Categoría</label>
                  <select className="w-full bg-background border border-white/5 p-4 rounded-2xl text-xs outline-none focus:border-primary/50 transition-all font-bold" value={form.categoria_id} onChange={e => setForm({...form, categoria_id: parseInt(e.target.value)})}>
                    {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/50">Proveedor Principal</label>
                  <select className="w-full bg-background border border-white/5 p-4 rounded-2xl text-xs outline-none focus:border-primary/50 transition-all font-bold" value={form.proveedor_id} onChange={e => setForm({...form, proveedor_id: parseInt(e.target.value)})}>
                    {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                  </select>
                </div>
              </div>

              <div className="p-6 bg-white/5 rounded-[2rem] border border-white/5 space-y-4">
                <div className="flex justify-between items-center">
                   <div>
                      <p className="text-xs font-black text-on-surface">Venta al Mayor (Cajas)</p>
                      <p className="text-[9px] text-on-surface-variant/50 font-medium">Habilita precios especiales para ventas por caja.</p>
                   </div>
                   <button 
                     type="button"
                     onClick={() => setForm({...form, es_licor: !form.es_licor})}
                     className={`w-12 h-6 rounded-full transition-all relative ${form.es_licor ? 'bg-primary' : 'bg-white/10'}`}
                   >
                     <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${form.es_licor ? 'left-7' : 'left-1'}`}></div>
                   </button>
                </div>

                {form.es_licor && (
                  <div className="grid grid-cols-2 gap-4 pt-2 animate-in slide-in-from-top-2 duration-300">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/40">Unidades por Caja</label>
                      <input type="number" className="w-full bg-background border border-white/5 p-3 rounded-xl text-xs outline-none focus:border-primary/50 transition-all font-mono" value={form.unidades_por_caja} onChange={e => setForm({...form, unidades_por_caja: parseInt(e.target.value)})} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/40">Precio Caja (USD)</label>
                      <input type="number" step="0.01" className="w-full bg-background border border-white/5 p-3 rounded-xl text-xs outline-none focus:border-primary/50 transition-all font-mono text-primary font-bold" value={form.precio_caja_usd} onChange={e => setForm({...form, precio_caja_usd: parseFloat(e.target.value)})} />
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-6 flex gap-4">
                <button type="submit" className="flex-1 bg-primary text-on-primary py-5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all">
                  {editando ? "Guardar Cambios" : "Crear Producto"}
                </button>
                <button type="button" onClick={() => setModalOpen(false)} className="px-10 py-5 rounded-2xl font-black text-xs uppercase tracking-widest text-on-surface-variant hover:text-on-surface transition-colors">
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Gestión de Categorías */}
      {modalCatOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-xl z-[201] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-surface w-full max-w-md rounded-[2.5rem] p-10 border border-white/10 shadow-2xl">
            <h2 className="text-3xl font-black tracking-tighter mb-6">Gestionar <span className="text-secondary">Categorías</span></h2>
            
            <form onSubmit={handleSaveCategoria} className="flex gap-2 mb-8">
              <input 
                required
                placeholder="Nueva categoría..."
                className="flex-1 bg-background border border-white/5 p-4 rounded-xl text-xs outline-none focus:border-secondary/50 transition-all font-bold"
                value={nuevaCategoria}
                onChange={e => setNuevaCategoria(e.target.value)}
              />
              <button type="submit" className="bg-secondary text-on-secondary px-6 rounded-xl hover:opacity-90 transition-opacity">
                <span className="material-symbols-outlined">add</span>
              </button>
            </form>

            <div className="space-y-2 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
              {categorias.map(cat => (
                <div key={cat.id} className="flex justify-between items-center bg-background/50 p-4 rounded-xl border border-white/5 group">
                  <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">{cat.nombre}</span>
                  <button 
                    onClick={() => handleDeleteCategoria(cat.id)}
                    className="text-on-surface-variant/30 hover:text-error transition-colors p-1"
                  >
                    <span className="material-symbols-outlined text-sm">delete</span>
                  </button>
                </div>
              ))}
            </div>

            <button 
              onClick={() => setModalCatOpen(false)}
              className="w-full mt-8 py-4 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] text-on-surface-variant hover:bg-white/5 transition-all"
            >
              Cerrar Gestión
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventario;
