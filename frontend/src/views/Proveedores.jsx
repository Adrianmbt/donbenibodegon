import React, { useState, useEffect } from "react";

const Proveedores = () => {
  const [proveedores, setProveedores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [nuevoProveedor, setNuevoProveedor] = useState({ rif: "", nombre: "", contacto: "" });
  const [mostrarModal, setMostrarModal] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const fetchProveedores = async () => {
    try {
      const response = await fetch("/api/proveedores/");
      const data = await response.json();
      setProveedores(data);
    } catch (err) {
      console.error("Error cargando proveedores:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProveedores();
  }, []);

  const handleCrear = async (e) => {
    e.preventDefault();
    try {
      const resp = await fetch("/api/proveedores/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nuevoProveedor)
      });
      if (resp.ok) {
        setMostrarModal(false);
        setNuevoProveedor({ rif: "", nombre: "", contacto: "" });
        fetchProveedores();
      }
    } catch (err) {
      alert("Error al crear proveedor");
    }
  };

  const proveedoresFiltrados = proveedores.filter(p =>
    p.nombre.toLowerCase().includes(busqueda.toLowerCase()) || p.rif.includes(busqueda)
  );

  useEffect(() => { setCurrentPage(1); }, [busqueda]);

  const totalPages = Math.ceil(proveedoresFiltrados.length / itemsPerPage) || 1;
  const currentProveedores = proveedoresFiltrados.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  return (
    <div className="p-10 space-y-12 animate-in fade-in duration-500">
      {/* Hero Section */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-6xl font-black tracking-tighter text-on-surface mb-2 font-headline">
            Gestión de <span className="text-primary">Proveedores</span>
          </h1>
          <p className="text-on-surface-variant font-medium tracking-tight">Directorio comercial y control de cuentas por pagar.</p>
        </div>
        <button 
          onClick={() => setMostrarModal(true)}
          className="bg-primary text-on-primary px-8 py-5 rounded-[1.5rem] font-black text-xs uppercase tracking-widest flex items-center gap-3 hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-primary/30"
        >
          <span className="material-symbols-outlined text-sm">person_add</span>
          Nuevo Proveedor
        </button>
      </div>

      {/* Barra de Búsqueda */}
      <div className="relative max-w-2xl">
        <span className="material-symbols-outlined absolute left-6 top-1/2 -translate-y-1/2 text-primary">search</span>
        <input 
          type="text" 
          placeholder="Buscar Proveedor por RIF o Nombre..."
          className="w-full bg-surface-container border border-white/5 rounded-[2rem] py-6 pl-16 pr-6 text-sm focus:ring-2 focus:ring-primary/40 outline-none transition-all shadow-inner"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {currentProveedores.map(proveedor => (
            <div key={proveedor.id} className="bg-surface rounded-[2.5rem] border border-white/5 p-8 shadow-2xl group relative overflow-hidden flex flex-col justify-between transition-all hover:border-primary/30">
              <div className="absolute -right-6 -top-6 opacity-5 group-hover:scale-110 transition-transform">
                 <span className="material-symbols-outlined text-[10rem] text-primary">local_shipping</span>
              </div>
              
              <div className="relative">
                <div className="flex justify-between items-start mb-6">
                   <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
                      <span className="material-symbols-outlined text-primary text-3xl">store</span>
                   </div>
                   <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/40">RIF: {proveedor.rif}</span>
                </div>
                
                <h3 className="text-2xl font-black text-on-surface mb-2 leading-tight">{proveedor.nombre}</h3>
                <p className="text-xs text-on-surface-variant font-medium flex items-center gap-2">
                   <span className="material-symbols-outlined text-[14px]">call</span>
                   {proveedor.contacto || "Sin contacto registrado"}
                </p>
              </div>

              <div className="mt-12 pt-8 border-t border-white/5 flex items-end justify-between">
                <div>
                   <p className="text-[10px] uppercase tracking-widest font-black text-on-surface-variant/60 mb-2">Deuda Pendiente</p>
                   <p className={`text-3xl font-black font-mono leading-none ${proveedor.balance_pendiente > 0 ? 'text-secondary' : 'text-primary'}`}>
                      ${proveedor.balance_pendiente.toFixed(2)}
                   </p>
                </div>
                <button className="p-4 bg-white/5 rounded-2xl hover:bg-primary hover:text-on-primary transition-all active:scale-95">
                   <span className="material-symbols-outlined text-sm">chevron_right</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Controles de Paginación */}
      {!loading && totalPages > 1 && (
        <div className="flex justify-between items-center p-6 border border-white/5 bg-surface/50 rounded-[2.5rem] mt-8 shadow-xl">
          <p className="text-[10px] uppercase font-bold text-on-surface-variant/50 tracking-widest">
             Mostrando {((currentPage - 1) * itemsPerPage) + 1} a {Math.min(currentPage * itemsPerPage, proveedoresFiltrados.length)} de {proveedoresFiltrados.length} proveedores
          </p>
          <div className="flex items-center gap-2">
             <button disabled={currentPage === 1} onClick={() => goToPage(currentPage - 1)} className="p-2 rounded-lg bg-surface border border-white/5 disabled:opacity-30 hover:bg-white/5 transition-colors text-on-surface"><span className="material-symbols-outlined text-sm">chevron_left</span></button>
             <span className="text-xs font-bold font-mono px-4 text-on-surface">Página {currentPage} de {totalPages}</span>
             <button disabled={currentPage === totalPages} onClick={() => goToPage(currentPage + 1)} className="p-2 rounded-lg bg-surface border border-white/5 disabled:opacity-30 hover:bg-white/5 transition-colors text-on-surface"><span className="material-symbols-outlined text-sm">chevron_right</span></button>
          </div>
        </div>
      )}

      {/* Modal Nuevo Proveedor */}
      {mostrarModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-md z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
           <div className="bg-surface w-full max-w-lg rounded-[3rem] p-12 border border-white/10 shadow-[0_0_100px_rgba(212,175,55,0.1)]">
              <h2 className="text-3xl font-black mb-8 text-on-surface">Alta de <span className="text-primary">Socio Comercial</span></h2>
              <form onSubmit={handleCrear} className="space-y-6">
                <div>
                  <label className="text-[10px] uppercase font-black tracking-widest text-on-surface-variant ml-2 mb-2 block">RIF del Proveedor</label>
                  <input 
                    required
                    type="text" 
                    className="w-full bg-background border border-white/5 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-primary/40 outline-none transition-all"
                    placeholder="J-12345678-9"
                    value={nuevoProveedor.rif}
                    onChange={e => setNuevoProveedor({...nuevoProveedor, rif: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-black tracking-widest text-on-surface-variant ml-2 mb-2 block">Razón Social</label>
                  <input 
                    required
                    type="text" 
                    className="w-full bg-background border border-white/5 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-primary/40 outline-none transition-all"
                    placeholder="Nombre de la empresa..."
                    value={nuevoProveedor.nombre}
                    onChange={e => setNuevoProveedor({...nuevoProveedor, nombre: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-black tracking-widest text-on-surface-variant ml-2 mb-2 block">Vendedor / Contacto</label>
                  <input 
                    type="text" 
                    className="w-full bg-background border border-white/5 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-primary/40 outline-none transition-all"
                    placeholder="Nombre o teléfono..."
                    value={nuevoProveedor.contacto}
                    onChange={e => setNuevoProveedor({...nuevoProveedor, contacto: e.target.value})}
                  />
                </div>
                <div className="flex gap-4 pt-6">
                  <button type="button" onClick={() => setMostrarModal(false)} className="flex-1 py-4 text-xs font-black uppercase tracking-widest text-on-surface-variant hover:text-on-surface transition-colors">Cancelar</button>
                  <button type="submit" className="flex-1 bg-primary text-on-primary py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all">Registrar</button>
                </div>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};

export default Proveedores;
