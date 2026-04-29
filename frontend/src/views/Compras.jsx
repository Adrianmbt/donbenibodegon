import React, { useState, useEffect } from "react";

const Compras = () => {
  // Estados de Datos
  const [proveedores, setProveedores] = useState([]);
  const [productos, setProductos] = useState([]);
  const [historialCompras, setHistorialCompras] = useState([]);

  // Estados de UI
  const [view, setView] = useState("list"); // "list" | "new"
  const [busquedaProv, setBusquedaProv] = useState("");
  const [proveedorSeleccionado, setProveedorSeleccionado] = useState(null);
  const [carrito, setCarrito] = useState([]);
  const [metodoPago, setMetodoPago] = useState("Contado");
  const [procesando, setProcesando] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Modales
  const [modalNuevoProv, setModalNuevoProv] = useState(false);
  const [modalNuevoProd, setModalNuevoProd] = useState(false);
  const [modalEditarCompra, setModalEditarCompra] = useState(false);
  const [compraAEditar, setCompraAEditar] = useState(null);

  const [nuevoProv, setNuevoProv] = useState({ rif: "", nombre: "", contacto: "" });
  const [nuevoProd, setNuevoProd] = useState({ nombre: "", barcode: "", precio_usd: 1.0, costo_usd: 0.5, stock: 0, categoria_id: 1 });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const headers = { "Authorization": `Bearer ${localStorage.getItem("token")}` };
      const [resProv, resProd, resHist] = await Promise.all([
        fetch("/api/proveedores/", { headers }),
        fetch("/api/inventario/productos", { headers }),
        fetch("/api/compras/historial", { headers })
      ]);
      setProveedores(await resProv.json());
      setProductos(await resProd.json());
      setHistorialCompras(await resHist.json());
    } catch (e) { console.error(e); }
  };

  const handleEliminarCompra = async (id) => {
    if (!window.confirm("¿Estás seguro de eliminar este registro de compra?")) return;
    try {
      const res = await fetch(`/api/compras/${id}`, { 
        method: "DELETE",
        headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
      });
      if (res.ok) fetchData();
      else alert("Error al eliminar");
    } catch (e) { console.error(e); }
  };

  const handleActualizarCompra = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/compras/${compraAEditar.id}`, {
        method: "PATCH",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({
          estado: compraAEditar.estado,
          monto_total: compraAEditar.monto_total,
          monto_pendiente: compraAEditar.monto_pendiente
        })
      });
      if (res.ok) {
        setModalEditarCompra(false);
        fetchData();
      } else {
        alert("Error al actualizar");
      }
    } catch (e) { console.error(e); }
  };

  // Filtrar productos por el proveedor seleccionado
  const productosFiltrados = productos.filter(pt =>
    !proveedorSeleccionado || pt.producto?.proveedor_id === proveedorSeleccionado.id || !pt.producto?.proveedor_id
  );

  const agregarAlCarrito = (pt) => {
    if (!carrito.find(i => i.id === pt.producto_id)) {
      setCarrito([...carrito, { 
        id: pt.producto_id, 
        nombre: pt.producto.nombre, 
        costo: pt.costo_usd || 0,
        unidades_por_caja: pt.producto.unidades_por_caja,
        es_licor: pt.producto.es_licor,
        cantidad: 1, 
        es_caja: false 
      }]);
    }
  };

  const actualizarItem = (id, campo, valor) => {
    setCarrito(carrito.map(i => i.id === id ? { ...i, [campo]: valor } : i));
  };

  const totalCompra = carrito.reduce((acc, i) => acc + (i.cantidad * i.costo), 0);

  const handleRegistrarCompra = async () => {
    if (!proveedorSeleccionado || carrito.length === 0) return alert("Faltan datos");
    setProcesando(true);
    try {
      const res = await fetch("/api/compras/registrar", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({
          proveedor_id: proveedorSeleccionado.id,
          items: carrito.map(i => ({ 
            producto_id: i.id, 
            cantidad: i.cantidad || 0, 
            costo_unitario_usd: i.costo || 0,
            es_caja: !!i.es_caja
          })),
          metodo_pago: metodoPago,
          monto_total_usd: totalCompra
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.compra_id) {
          downloadPDF(data.compra_id);
        }
        setView("list");
        setCarrito([]);
        setProveedorSeleccionado(null);
        fetchData();
      } else {
        const errData = await res.json();
        alert("Error del servidor: " + (errData.detail || "Desconocido"));
      }
    } catch (e) { 
      console.error("Error en registro:", e);
      alert("Error de conexión."); 
    } finally { setProcesando(false); }
  };

  const crearNuevoProducto = async (e) => {
    e.preventDefault();
    if (!proveedorSeleccionado) return alert("Selecciona un proveedor primero");
    try {
      const res = await fetch("/api/inventario/productos", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({ ...nuevoProd, proveedor_id: proveedorSeleccionado.id })
      });
      if (res.ok) {
        const pt = await res.json();
        setProductos([...productos, pt]);
        agregarAlCarrito(pt);
        setModalNuevoProd(false);
      }
    } catch (e) { alert("Error al crear producto"); }
  };

  const downloadPDF = async (compraId) => {
    try {
      const response = await fetch(`/api/compras/pdf/${compraId}`, {
        headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
      });
      if (!response.ok) throw new Error("Error al descargar PDF");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Compra_${compraId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (e) {
      console.error(e);
      alert("Error al descargar el PDF de la compra.");
    }
  };

  const totalPages = Math.ceil(historialCompras.length / itemsPerPage) || 1;
  const currentCompras = historialCompras.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  return (
    <div className="p-10 space-y-12 min-h-screen bg-background text-on-surface animate-in fade-in duration-500">

      {/* Header con Switch de Vista */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-6xl font-black tracking-tighter mb-2 font-headline">
            Central de <span className="text-primary">Compras</span>
          </h1>
          <p className="text-on-surface-variant font-medium tracking-tight">Registro y auditoría de mercancía entrante.</p>
        </div>
        <div className="flex gap-4">
          {view === "list" ? (
            <button
              onClick={() => setView("new")}
              className="bg-primary text-on-primary px-8 py-5 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-3 hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-primary/30"
            >
              <span className="material-symbols-outlined text-sm">add_shopping_cart</span>
              Nueva Compra
            </button>
          ) : (
            <button
              onClick={() => setView("list")}
              className="bg-surface text-on-surface-variant px-8 py-5 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-3 hover:bg-white/5 transition-all"
            >
              <span className="material-symbols-outlined text-sm">arrow_back</span>
              Volver al Listado
            </button>
          )}
        </div>
      </div>

      {view === "list" ? (
        /* VISTA 1: DATA TABLE DE COMPRAS (AUDITORÍA) */
        <div className="bg-surface rounded-[2.5rem] border border-white/5 shadow-2xl overflow-hidden p-10">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-xs font-black uppercase tracking-[0.4em] text-on-surface-variant">Historial de Operaciones</h3>
            <span className="material-symbols-outlined text-primary">analytics</span>
          </div>
          <table className="w-full">
            <thead>
              <tr className="text-[10px] uppercase font-black tracking-widest text-on-surface-variant/40 text-left border-b border-white/5">
                <th className="pb-4">Fecha</th>
                <th className="pb-4">Proveedor</th>
                <th className="pb-4">Estado</th>
                <th className="pb-4 text-right">Monto</th>
                <th className="pb-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {currentCompras.map(compra => (
                <tr key={compra.id} className="text-sm font-medium hover:bg-white/2 transition-colors">
                  <td className="py-6">{new Date(compra.fecha_emision).toLocaleDateString()}</td>
                  <td className="py-6 font-bold">
                    {proveedores.find(p => p.id === compra.proveedor_id)?.nombre || `Proveedor #${compra.proveedor_id}`}
                  </td>
                  <td className="py-6">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${compra.estado === 'pendiente' ? 'bg-secondary/10 text-secondary' : 'bg-primary/10 text-primary'}`}>
                      {compra.estado}
                    </span>
                  </td>
                  <td className="py-6 text-right font-mono font-bold text-primary">${compra.monto_total.toFixed(2)}</td>
                  <td className="py-6 text-center">
                    <div className="flex justify-center gap-2">
                      <button 
                        onClick={() => downloadPDF(compra.id)}
                        className="p-2 hover:text-primary transition-colors" title="Descargar PDF"
                      >
                        <span className="material-symbols-outlined text-sm">picture_as_pdf</span>
                      </button>
                      <button 
                        onClick={() => { setCompraAEditar({ ...compra }); setModalEditarCompra(true); }}
                        className="p-2 hover:text-primary transition-colors" title="Editar Compra"
                      >
                        <span className="material-symbols-outlined text-sm">edit</span>
                      </button>
                      <button 
                        onClick={() => handleEliminarCompra(compra.id)}
                        className="p-2 hover:text-error transition-colors" title="Eliminar Compra"
                      >
                        <span className="material-symbols-outlined text-sm">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {historialCompras.length === 0 && (
                <tr><td colSpan="5" className="py-20 text-center text-on-surface-variant italic">No se han registrado compras recientemente.</td></tr>
              )}
            </tbody>
          </table>
          
          {/* Controles de Paginación */}
          {totalPages > 1 && (
            <div className="flex justify-between items-center p-6 border-t border-white/5 bg-surface/50 mt-4 rounded-b-[2.5rem]">
              <p className="text-[10px] uppercase font-bold text-on-surface-variant/50 tracking-widest">
                 Mostrando {((currentPage - 1) * itemsPerPage) + 1} a {Math.min(currentPage * itemsPerPage, historialCompras.length)} de {historialCompras.length} operaciones
              </p>
              <div className="flex items-center gap-2">
                 <button disabled={currentPage === 1} onClick={() => goToPage(currentPage - 1)} className="p-2 rounded-lg bg-surface border border-white/5 disabled:opacity-30 hover:bg-white/5 transition-colors text-on-surface"><span className="material-symbols-outlined text-sm">chevron_left</span></button>
                 <span className="text-xs font-bold font-mono px-4 text-on-surface">Página {currentPage} de {totalPages}</span>
                 <button disabled={currentPage === totalPages} onClick={() => goToPage(currentPage + 1)} className="p-2 rounded-lg bg-surface border border-white/5 disabled:opacity-30 hover:bg-white/5 transition-colors text-on-surface"><span className="material-symbols-outlined text-sm">chevron_right</span></button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* VISTA 2: FORMULARIO DE COMPRA (INTERACTIVO) */
        <div className="grid grid-cols-12 gap-8 animate-in slide-in-from-bottom-5">
          {/* Selector Lateral */}
          <div className="col-span-12 lg:col-span-4 space-y-6">
            {/* Proveedor */}
            <div className="bg-surface p-8 rounded-[2rem] border border-white/5 shadow-xl">
              <div className="flex justify-between items-center mb-6">
                <p className="text-[10px] uppercase font-black tracking-widest text-primary">1. Origen</p>
                <button onClick={() => setModalNuevoProv(true)} className="text-[8px] font-black uppercase text-on-surface-variant hover:text-primary transition-colors">Nuevo Proveedor</button>
              </div>
              <select
                className="w-full bg-background border border-white/5 rounded-xl p-4 text-xs outline-none"
                onChange={(e) => setProveedorSeleccionado(proveedores.find(p => p.id === parseInt(e.target.value)))}
                value={proveedorSeleccionado?.id || ""}
              >
                <option value="">Seleccione un Proveedor...</option>
                {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre} ({p.rif})</option>)}
              </select>
            </div>

            {/* Productos Vinculados */}
            <div className="bg-surface p-8 rounded-[2rem] border border-white/5 shadow-xl h-[500px] flex flex-col">
              <div className="flex justify-between items-center mb-6">
                <p className="text-[10px] uppercase font-black tracking-widest text-primary">2. Mercancía</p>
                <button onClick={() => setModalNuevoProd(true)} className="text-[8px] font-black uppercase text-on-surface-variant hover:text-primary transition-colors">Añadir Mercancía Nueva</button>
              </div>
              <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar">
                {productosFiltrados.map(pt => (
                  <button
                    key={pt.id}
                    onClick={() => agregarAlCarrito(pt)}
                    className="w-full p-4 bg-background rounded-xl border border-white/5 hover:border-primary/40 transition-all flex items-center justify-between group"
                  >
                    <div className="text-left">
                      <p className="font-bold text-[11px] leading-tight">{pt.producto?.nombre}</p>
                      <p className="text-[9px] text-on-surface-variant/40 mt-1 uppercase font-black">Ref: {pt.producto?.barcode}</p>
                    </div>
                    <span className="material-symbols-outlined text-primary scale-0 group-hover:scale-100 transition-transform text-sm">add_circle</span>
                  </button>
                ))}
                {productosFiltrados.length === 0 && (
                  <p className="text-[10px] text-center py-10 text-on-surface-variant italic">Seleccione un proveedor para ver sus productos.</p>
                )}
              </div>
            </div>
          </div>

          {/* Hoja de Recepción */}
          <div className="col-span-12 lg:col-span-8 bg-surface rounded-[2.5rem] border border-white/5 shadow-2xl flex flex-col overflow-hidden">
            <div className="p-10 border-b border-white/5 flex justify-between items-center">
              <h2 className="text-2xl font-black tracking-tighter">Hoja de <span className="text-primary">Recepción Electrónica</span></h2>
              <div className="flex gap-2">
                {["Contado", "Credito"].map(m => (
                  <button key={m} onClick={() => setMetodoPago(m)} className={`px-5 py-2 rounded-full text-[9px] font-black uppercase transition-all ${metodoPago === m ? 'bg-primary text-on-primary' : 'bg-background border border-white/5'}`}>{m}</button>
                ))}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-10 space-y-4 custom-scrollbar min-h-[400px]">
               {carrito.map(item => (
                <div key={item.id} className="bg-background/40 rounded-2xl border border-white/5 p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1"><p className="font-bold text-sm text-on-surface">{item.nombre}</p></div>
                    <button onClick={() => setCarrito(carrito.filter(i => i.id !== item.id))} className="text-on-surface-variant/20 hover:text-error transition-colors"><span className="material-symbols-outlined text-sm">close</span></button>
                  </div>
                  
                  <div className="flex items-center gap-6">
                    <div className="flex-1">
                      <label className="text-[9px] font-black uppercase text-on-surface-variant/40 mb-1 block">Cantidad</label>
                      <input type="number" className="w-full bg-background border border-white/10 rounded-xl p-3 text-center text-xs font-bold" value={item.cantidad || ''} onChange={(e) => actualizarItem(item.id, "cantidad", parseInt(e.target.value) || 0)} />
                    </div>
                    
                    <div className="flex-1">
                      <label className="text-[9px] font-black uppercase text-on-surface-variant/40 mb-1 block">Costo (USD)</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary text-[10px] font-bold">$</span>
                        <input type="number" step="0.01" className="w-full bg-background border border-white/10 rounded-xl p-3 pl-6 text-xs font-bold text-secondary text-right" value={item.costo || ''} onChange={(e) => actualizarItem(item.id, "costo", parseFloat(e.target.value) || 0)} />
                      </div>
                    </div>

                    <div className="w-24 text-right">
                       <label className="text-[9px] font-black uppercase text-on-surface-variant/40 mb-1 block">Subtotal</label>
                       <p className="text-sm font-black font-mono text-primary">${((item.cantidad || 0) * (item.costo || 0)).toFixed(2)}</p>
                    </div>
                  </div>

                  {item.es_licor && (
                    <div className="flex items-center justify-between p-3 bg-white/2 rounded-xl border border-white/5">
                       <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-[14px] text-primary">inventory_2</span>
                          <span className="text-[9px] font-black uppercase tracking-widest text-on-surface/60">¿Entrada por Caja ({item.unidades_por_caja} unids)?</span>
                       </div>
                       <button 
                         type="button"
                         onClick={() => actualizarItem(item.id, "es_caja", !item.es_caja)}
                         className={`w-10 h-5 rounded-full transition-all relative ${item.es_caja ? 'bg-primary' : 'bg-white/10'}`}
                       >
                         <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${item.es_caja ? 'left-5.5' : 'left-0.5'}`}></div>
                       </button>
                    </div>
                  )}
                </div>
              ))}
              {carrito.length === 0 && <div className="h-full flex flex-col items-center justify-center opacity-5 py-20"><span className="material-symbols-outlined text-8xl">upload_file</span><p className="text-xs font-black uppercase tracking-widest">Esperando Mercancía...</p></div>}
            </div>
            <div className="p-10 border-t border-white/5 bg-white/2 flex items-center justify-between">
              <div><p className="text-[10px] font-black text-on-surface-variant/40 uppercase mb-2">Inversión Final</p><p className="text-5xl font-black font-mono text-primary">${totalCompra.toFixed(2)}</p></div>
              <button
                disabled={procesando || !proveedorSeleccionado || carrito.length === 0}
                onClick={handleRegistrarCompra}
                className="bg-primary text-on-primary px-12 py-6 rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl hover:scale-105 active:scale-95 disabled:opacity-20 flex items-center gap-3 transition-all"
              >
                {procesando ? "Procesando..." : <> <span className="material-symbols-outlined text-sm">download</span> Finalizar y Descargar PDF </>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modales: Proveedor Flash y Producto Sorpresa */}
      {modalNuevoProv && (
        <div className="fixed inset-0 bg-background/90 backdrop-blur-xl z-[200] flex items-center justify-center p-6 animate-in zoom-in-95 duration-300">
          <div className="bg-surface w-full max-w-md rounded-[2.5rem] p-10 border border-white/10 shadow-2xl">
            <h4 className="text-2xl font-black mb-6">Proveedor <span className="text-primary">Nuevo</span></h4>
            <form onSubmit={async (e) => {
              e.preventDefault();
              try {
                const res = await fetch("/api/proveedores/", { 
                  method: "POST", 
                  headers: { 
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${localStorage.getItem("token")}`
                  }, 
                  body: JSON.stringify(nuevoProv) 
                });
                if (res.ok) { 
                  const d = await res.json(); 
                  setProveedores([...proveedores, d]); 
                  setProveedorSeleccionado(d); 
                  setModalNuevoProv(false); 
                } else {
                  alert("Error al crear proveedor");
                }
              } catch (e) { console.error(e); }
            }} className="space-y-4">
              <input required placeholder="RIF..." className="w-full bg-background border border-white/5 p-4 rounded-xl text-xs outline-none" value={nuevoProv.rif} onChange={e => setNuevoProv({ ...nuevoProv, rif: e.target.value })} />
              <input required placeholder="Razón Social..." className="w-full bg-background border border-white/5 p-4 rounded-xl text-xs outline-none" value={nuevoProv.nombre} onChange={e => setNuevoProv({ ...nuevoProv, nombre: e.target.value })} />
              <button type="submit" className="w-full bg-primary text-on-primary py-4 rounded-xl font-black text-[10px] uppercase shadow-lg shadow-primary/20">Registrar y Seleccionar</button>
              <button type="button" onClick={() => setModalNuevoProv(false)} className="w-full py-4 text-[10px] font-black uppercase text-on-surface-variant">Cancelar</button>
            </form>
          </div>
        </div>
      )}

      {modalNuevoProd && (
        <div className="fixed inset-0 bg-background/90 backdrop-blur-xl z-[200] flex items-center justify-center p-6 animate-in zoom-in-95 duration-300">
          <div className="bg-surface w-full max-w-md rounded-[2.5rem] p-10 border border-white/10 shadow-2xl text-on-surface">
            <h4 className="text-2xl font-black mb-6">Mercancía <span className="text-primary">Nueva</span></h4>
            <p className="text-[10px] text-on-surface-variant font-bold mb-6 uppercase tracking-widest">Vinculando a: <span className="text-primary">{proveedorSeleccionado?.nombre}</span></p>
            <form onSubmit={crearNuevoProducto} className="space-y-4">
              <input required placeholder="Nombre del Producto..." className="w-full bg-background border border-white/5 p-4 rounded-xl text-xs outline-none" value={nuevoProd.nombre} onChange={e => setNuevoProd({ ...nuevoProd, nombre: e.target.value })} />
              <input required placeholder="Código de Barras / Ref..." className="w-full bg-background border border-white/5 p-4 rounded-xl text-xs outline-none" value={nuevoProd.barcode} onChange={e => setNuevoProd({ ...nuevoProd, barcode: e.target.value })} />
              <div className="grid grid-cols-2 gap-4">
                <input type="number" placeholder="Costo Unit. (USD)" className="w-full bg-background border border-white/5 p-4 rounded-xl text-xs outline-none" value={nuevoProd.costo_usd} onChange={e => setNuevoProd({ ...nuevoProd, costo_usd: parseFloat(e.target.value) })} />
                <input type="number" placeholder="Precio Venta (USD)" className="w-full bg-background border border-white/5 p-4 rounded-xl text-xs outline-none" value={nuevoProd.precio_usd} onChange={e => setNuevoProd({ ...nuevoProd, precio_usd: parseFloat(e.target.value) })} />
              </div>
              <button type="submit" className="w-full bg-primary text-on-primary py-4 rounded-xl font-black text-[10px] uppercase shadow-lg shadow-primary/20">Añadir al Stock e Inventario</button>
              <button type="button" onClick={() => setModalNuevoProd(false)} className="w-full py-4 text-[10px] font-black uppercase text-on-surface-variant">Cancelar</button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar Compra */}
      {modalEditarCompra && (
        <div className="fixed inset-0 bg-background/90 backdrop-blur-xl z-[200] flex items-center justify-center p-6 animate-in zoom-in-95 duration-300">
          <div className="bg-surface w-full max-w-md rounded-[2.5rem] p-10 border border-white/10 shadow-2xl">
            <h4 className="text-2xl font-black mb-6">Editar <span className="text-primary">Compra</span></h4>
            <form onSubmit={handleActualizarCompra} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-on-surface-variant tracking-widest">Monto Total (USD)</label>
                <input 
                  type="number" step="0.01" 
                  className="w-full bg-background border border-white/5 p-4 rounded-xl text-xs outline-none font-bold" 
                  value={compraAEditar.monto_total} 
                  onChange={e => setCompraAEditar({...compraAEditar, monto_total: parseFloat(e.target.value)})} 
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-on-surface-variant tracking-widest">Monto Pendiente (USD)</label>
                <input 
                  type="number" step="0.01" 
                  className="w-full bg-background border border-white/5 p-4 rounded-xl text-xs outline-none font-bold text-secondary" 
                  value={compraAEditar.monto_pendiente} 
                  onChange={e => setCompraAEditar({...compraAEditar, monto_pendiente: parseFloat(e.target.value)})} 
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-on-surface-variant tracking-widest">Estado</label>
                <select 
                  className="w-full bg-background border border-white/5 p-4 rounded-xl text-xs outline-none font-bold"
                  value={compraAEditar.estado}
                  onChange={e => setCompraAEditar({...compraAEditar, estado: e.target.value})}
                >
                  <option value="pendiente">Pendiente ⏳</option>
                  <option value="pagado">Pagado ✅</option>
                </select>
              </div>
              <div className="pt-4 space-y-2">
                <button type="submit" className="w-full bg-primary text-on-primary py-5 rounded-xl font-black text-xs uppercase shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all">Guardar Cambios</button>
                <button type="button" onClick={() => setModalEditarCompra(false)} className="w-full py-4 text-[10px] font-black uppercase text-on-surface-variant hover:text-on-surface transition-colors">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Compras;
