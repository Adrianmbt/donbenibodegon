import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useSearch } from "../context/SearchContext";

const Ventas = () => {
  const { searchQuery, updateSearch } = useSearch();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const initialView = searchParams.get("view") === "pos" ? "pos" : "list";
  const urlFilter = searchParams.get("filter");

  // Estados de Datos
  const [productos, setProductos] = useState([]);
  const [historialVentas, setHistorialVentas] = useState([]);
  const [tasaBcv, setTasaBcv] = useState(36.50);

  // Estados de UI
  const [view, setView] = useState(initialView); // "list" | "pos"
  const [carrito, setCarrito] = useState([]);
  const [metodoPago, setMetodoPago] = useState("Efectivo");
  const [procesando, setProcesando] = useState(false);
  const [referencia, setReferencia] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const v = searchParams.get("view");
    if (v === "pos") setView("pos");
    else if (v === "list") setView("list");
  }, [location.search]);

  const fetchData = async () => {
    try {
      const [resProd, resHist, resTasa] = await Promise.all([
        fetch("/api/inventario/productos"),
        fetch("/api/ventas/historial"),
        fetch("/api/bcv/tasa")
      ]);
      setProductos(await resProd.json());
      setHistorialVentas(await resHist.json());
      const tasaData = await resTasa.json();
      if (tasaData?.rate) setTasaBcv(tasaData.rate);
    } catch (e) {
      console.error("Error al cargar datos:", e);
    }
  };

  const agregarAlCarrito = (producto) => {
    const existe = carrito.find(item => item.id === producto.id);
    if (existe) {
      if (existe.cantidad + 1 > producto.stock) return alert("Stock insuficiente");
      setCarrito(carrito.map(item =>
        item.id === producto.id ? { ...item, cantidad: item.cantidad + 1 } : item
      ));
    } else {
      if (producto.stock <= 0) return alert("Producto agotado");
      setCarrito([...carrito, { ...producto, cantidad: 1, es_caja: false }]);
    }
  };

  const toggleCaja = (id) => {
    setCarrito(carrito.map(item => {
      if (item.id === id && item.es_licor) {
        return { ...item, es_caja: !item.es_caja };
      }
      return item;
    }));
  };

  const quitarDelCarrito = (id) => {
    setCarrito(carrito.filter(item => item.id !== id));
  };

  const actualizarCantidad = (id, delta) => {
    setCarrito(carrito.map(item => {
      if (item.id === id) {
        const currentCant = parseInt(item.cantidad) || 0;
        const nuevaCant = currentCant + delta;
        if (nuevaCant < 1) return { ...item, cantidad: 1 };
        const prodOriginal = productos.find(p => p.id === id);
        if (nuevaCant > prodOriginal.stock) {
          alert("Limite de stock alcanzado");
          return { ...item, cantidad: prodOriginal.stock };
        }
        return { ...item, cantidad: nuevaCant };
      }
      return item;
    }));
  };

  const setCantidadExacta = (id, valueInput) => {
    if (valueInput === "") {
        setCarrito(carrito.map(item => item.id === id ? { ...item, cantidad: "" } : item));
        return;
    }
    const nuevaCant = parseInt(valueInput, 10);
    if (isNaN(nuevaCant)) return;
    
    setCarrito(carrito.map(item => {
      if (item.id === id) {
        const prodOriginal = productos.find(p => p.id === id);
        if (nuevaCant > prodOriginal.stock) {
          alert("Limite de stock alcanzado");
          return { ...item, cantidad: prodOriginal.stock };
        }
        return { ...item, cantidad: nuevaCant };
      }
      return item;
    }));
  };

  const totalUsd = carrito.reduce((acc, item) => {
    const precio = item.es_caja ? (item.precio_caja_usd || 0) : item.precio_usd;
    return acc + (precio * (parseInt(item.cantidad) || 0));
  }, 0);
  const totalBs = totalUsd * tasaBcv;

  const handleProcesarVenta = async () => {
    if (carrito.length === 0) return;
    setProcesando(true);
    try {
      const response = await fetch("/api/ventas/procesar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: carrito.map(i => ({ 
            producto_id: i.id, 
            cantidad: parseInt(i.cantidad) || 1,
            es_caja: !!i.es_caja
          })),
          metodo: metodoPago,
          usuario_id: currentUser?.id || 1,
          referencia: referencia.trim() !== "" ? referencia.trim() : null
        })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || "Error al procesar venta");
      }

      const data = await response.json();

      // Descarga automática del PDF si la venta fue exitosa
      if (data.id) {
        downloadPDF(data.id);
      }

      setCarrito([]);
      setReferencia("");
      setView("list");
      fetchData();
    } catch (err) {
      alert(err.message);
    } finally {
      setProcesando(false);
    }
  };

  const downloadPDF = (ventaId) => {
    let iframe = document.getElementById('pdf-download-iframe');
    if (!iframe) {
      iframe = document.createElement('iframe');
      iframe.id = 'pdf-download-iframe';
      iframe.style.display = 'none';
      document.body.appendChild(iframe);
    }
    iframe.src = `/api/ventas/pdf/${ventaId}`;
  };

  const { user: currentUser } = useAuth();
  const [authModal, setAuthModal] = useState({ open: false, action: null });
  const [authForm, setAuthForm] = useState({ username: "", password: "" });

  useEffect(() => {
    fetchData();
  }, []);

  const handleAdminAuth = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/usuarios/verificar-autorizacion", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          admin_username: authForm.username,
          admin_password: authForm.password
        })
      });
      const data = await res.json();
      if (data.valid) {
        const actionToExecute = authModal.action;
        setAuthModal({ open: false, action: null });
        setAuthForm({ username: "", password: "" });
        actionToExecute();
      } else {
        alert(data.message);
      }
    } catch (err) {
      alert("Error verificando autorización");
    }
  };

  const cancelarVenta = async (ventaId) => {
    const executeDelete = async () => {
      if (!window.confirm("¿Estás seguro de cancelar esta venta? El stock será devuelto al inventario.")) return;
      try {
        const res = await fetch(`/api/ventas/${ventaId}`, { method: "DELETE" });
        if (res.ok) fetchData();
        else alert("Error al cancelar venta");
      } catch (e) { console.error(e); }
    };

    if (currentUser?.rol === "vendedor") {
      setAuthModal({ open: true, action: executeDelete });
    } else {
      executeDelete();
    }
  };

  const productosFiltrados = productos.filter(p =>
    p.nombre.toLowerCase().includes(searchQuery.toLowerCase()) || p.barcode.includes(searchQuery)
  );

  let preFiltradas = historialVentas;
  if (urlFilter === "credito") {
    preFiltradas = preFiltradas.filter(v => 
      v.metodo_pago && v.metodo_pago.toLowerCase().includes("crédito")
    );
  }

  const ventasFiltradas = preFiltradas.filter(v => 
    v.id.toString().includes(searchQuery) ||
    new Date(v.fecha).toLocaleDateString().includes(searchQuery) ||
    v.metodo_pago.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.ceil(ventasFiltradas.length / itemsPerPage) || 1;
  const currentVentas = ventasFiltradas.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  return (
    <div className="p-10 space-y-12 min-h-screen bg-background text-on-surface animate-in fade-in duration-500">

      {/* Header Dinámico */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-6xl font-black tracking-tighter mb-2 font-headline">
            Gestión de <span className="text-primary">{view === "list" ? "Ventas" : "Ventas"}</span>
          </h1>
          <p className="text-on-surface-variant font-medium tracking-tight">
            {view === "list" ? "Historial de transacciones y facturación." : "Punto de Venta Interactivo."}
          </p>
        </div>
        <div className="flex items-center gap-8">
          <div className="text-right flex items-center gap-4">
            <button
              onClick={async () => {
                const res = await fetch("/api/bcv/update", { method: "POST" });
                if (res.ok) {
                  const data = await res.json();
                  setTasaBcv(data.valor);
                  alert("Tasa BCV actualizada: " + data.valor + " Bs/$");
                }
              }}
              className="p-2 hover:bg-secondary/20 text-secondary rounded-lg transition-all"
              title="Sincronizar Tasa BCV"
            >
              <span className="material-symbols-outlined text-sm">sync</span>
            </button>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant/60">Tasa BCV Oficial</p>
              <p className="text-2xl font-black text-secondary font-mono">
                {tasaBcv.toFixed(2)} <span className="text-xs">Bs/$</span>
              </p>
            </div>
          </div>
          <div className="flex gap-4">
            {view === "list" ? (
              <button
                onClick={() => setView("pos")}
                className="bg-primary text-on-primary px-8 py-5 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-3 hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-primary/30"
              >
                <span className="material-symbols-outlined text-sm">add_shopping_cart</span>
                Nueva Venta
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
      </div>

      {view === "list" ? (
        /* VISTA 1: TABLA DE HISTORIAL */
        <div className="bg-surface rounded-[2.5rem] border border-white/5 shadow-2xl overflow-hidden p-10 animate-in slide-in-from-bottom-4">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-xs font-black uppercase tracking-[0.4em] text-on-surface-variant">Registro de Operaciones Diarias</h3>
            <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-secondary">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span> Sistema En Línea
            </div>
          </div>
          <table className="w-full">
            <thead>
              <tr className="text-[10px] uppercase font-black tracking-widest text-on-surface-variant/40 text-left border-b border-white/5">
                <th className="pb-4">Nro</th>
                <th className="pb-4">Fecha / Hora</th>
                <th className="pb-4">Método</th>
                <th className="pb-4 text-right">Total USD / VES</th>
                <th className="pb-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {currentVentas.map(venta => (
                <tr key={venta.id} className="text-sm font-medium hover:bg-white/2 transition-colors group">
                  <td className="py-6 font-bold text-primary">#{venta.id}</td>
                  <td className="py-6">{new Date(venta.fecha).toLocaleString()}</td>
                  <td className="py-6">
                    <div className="flex flex-col gap-1 items-start">
                      <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase bg-secondary/10 text-secondary border border-secondary/20 block truncate max-w-[120px]">
                        {venta.metodo_pago}
                      </span>
                      {venta.referencia && (
                        <span className="text-[8px] font-mono text-on-surface-variant/70 uppercase">Ref: {venta.referencia}</span>
                      )}
                    </div>
                  </td>
                  <td className="py-6 text-right font-mono">
                    <div className="font-bold text-primary">${venta.total_usd.toFixed(2)}</div>
                    <div className="text-[10px] text-on-surface-variant/60">{(venta.total_usd * venta.tasa_bcv).toFixed(2)} Bs</div>
                  </td>
                  <td className="py-6 text-center">
                    <div className="flex justify-center gap-2">
                      <button
                        onClick={() => downloadPDF(venta.id)}
                        className="p-2 hover:bg-primary/20 hover:text-primary rounded-lg transition-all" title="Descargar Recibo"
                      >
                        <span className="material-symbols-outlined text-sm">print</span>
                      </button>
                      <button
                        onClick={() => cancelarVenta(venta.id)}
                        className="p-2 hover:bg-error/20 hover:text-error rounded-lg transition-all" title="Anular Factura"
                      >
                        <span className="material-symbols-outlined text-sm">delete_forever</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {ventasFiltradas.length === 0 && (
                <tr><td colSpan="5" className="py-20 text-center text-on-surface-variant italic">No se encontraron ventas.</td></tr>
              )}
            </tbody>
          </table>

          {/* Controles de Paginación */}
          {totalPages > 1 && (
            <div className="flex justify-between items-center p-6 border-t border-white/5 bg-surface/50 mt-4 rounded-b-[2rem]">
              <p className="text-[10px] uppercase font-bold text-on-surface-variant/50 tracking-widest">
                 Mostrando {((currentPage - 1) * itemsPerPage) + 1} a {Math.min(currentPage * itemsPerPage, ventasFiltradas.length)} de {ventasFiltradas.length} operaciones
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
        /* VISTA 2: PUNTO DE VENTA (POS) */
        <div className="grid grid-cols-12 gap-8 h-[700px] animate-in slide-in-from-bottom-5 duration-500">

          {/* Lado Izquierdo: Galería de Productos */}
          <div className="col-span-12 lg:col-span-8 flex flex-col space-y-6">
            <div className="relative group/search">
              <span className="material-symbols-outlined absolute left-6 top-1/2 -translate-y-1/2 text-on-surface-variant/40 transition-colors group-focus-within/search:text-primary">search</span>
              <input
                type="text"
                placeholder="Escanee un producto o escriba su nombre..."
                className="w-full bg-surface border border-white/5 rounded-[2rem] py-6 pl-16 pr-6 text-sm font-medium focus:ring-4 focus:ring-primary/10 focus:border-primary/40 outline-none transition-all shadow-xl font-bold uppercase tracking-tight"
                value={searchQuery}
                onChange={(e) => updateSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && searchQuery.trim() !== "") {
                    // Buscar coincidencia exacta por barcode
                    const found = productos.find(p => p.barcode === searchQuery.trim());
                    if (found) {
                      agregarAlCarrito(found);
                      updateSearch(""); // Limpiar para el siguiente escaneo
                    } else {
                      alert(`No se encontró ningún producto con el código: ${searchQuery.trim()}`);
                    }
                  }
                }}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto pr-2 custom-scrollbar flex-1 pb-10">
              {productosFiltrados.map(producto => (
                <button
                  key={producto.id}
                  onClick={() => agregarAlCarrito(producto)}
                  disabled={producto.stock <= 0}
                  className={`p-6 rounded-[2.5rem] border text-left transition-all group relative overflow-hidden flex flex-col justify-between h-52 shadow-xl ${producto.stock <= 0
                      ? 'bg-surface/50 border-white/2 opacity-50 cursor-not-allowed'
                      : 'bg-surface border-white/5 hover:border-primary/50 active:scale-95'
                    }`}
                >
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60">{producto.barcode}</span>
                      <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase ${producto.stock <= 5 ? 'bg-error text-on-error' : 'bg-primary/10 text-primary'}`}>
                        {producto.stock} en stock
                      </span>
                    </div>
                    <h3 className="font-bold text-lg text-on-surface line-clamp-2 leading-tight group-hover:text-primary transition-colors">{producto.nombre}</h3>
                  </div>
                  <div className="flex justify-between items-end">
                    <div className="flex flex-col">
                      <span className="text-3xl font-black font-mono text-primary">${producto.precio_usd.toFixed(2)}</span>
                      <span className="text-[10px] font-bold text-on-surface-variant/60">{(producto.precio_usd * tasaBcv).toFixed(2)} Bs</span>
                    </div>
                    <div className="bg-primary/20 p-3 rounded-2xl group-hover:bg-primary group-hover:text-on-primary transition-all">
                      <span className="material-symbols-outlined text-sm">add_shopping_cart</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Lado Derecho: Carrito y Cobro */}
          <div className="col-span-12 lg:col-span-4 bg-surface rounded-[3rem] border border-white/5 shadow-2xl flex flex-col overflow-hidden">
            <div className="p-10 border-b border-white/5 bg-white/2 flex justify-between items-center">
              <div>
                <h3 className="text-xs font-black uppercase tracking-[0.4em] text-primary">Detalle de Ticket</h3>
                <p className="text-xl font-black text-on-surface">Carrito Actual</p>
              </div>
              <span className="material-symbols-outlined text-on-surface-variant/20 text-4xl">local_mall</span>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-4 custom-scrollbar">
              {carrito.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center opacity-10 text-center grayscale">
                  <span className="material-symbols-outlined text-[8rem] mb-4">shopping_cart_checkout</span>
                  <p className="text-xs uppercase font-black tracking-widest">Esperando Productos...</p>
                </div>
              ) : (
                carrito.map(item => (
                  <div key={item.id} className="bg-background/40 rounded-3xl p-5 border border-white/5 flex items-center gap-4 animate-in slide-in-from-right-5">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-[13px] text-on-surface leading-tight truncate mb-1">{item.nombre}</h4>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-secondary font-mono">
                          ${(item.es_caja ? item.precio_caja_usd : item.precio_usd).toFixed(2)}
                        </span>
                        <span className="text-[10px] text-on-surface-variant/60">
                           {(((item.es_caja ? item.precio_caja_usd : item.precio_usd)) * tasaBcv).toFixed(2)} Bs
                        </span>
                        <span className="text-[10px] text-on-surface-variant/40">× {item.cantidad} {item.es_caja ? 'Cajas' : 'Bots'}</span>
                      </div>
                      {item.es_licor && (
                         <button 
                           onClick={() => toggleCaja(item.id)}
                           className={`mt-2 flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all ${item.es_caja ? 'bg-primary/20 border-primary/30 text-primary' : 'bg-white/5 border-white/5 text-on-surface-variant/60'}`}
                         >
                            <span className="material-symbols-outlined text-[14px]">{item.es_caja ? 'inventory_2' : 'liquor'}</span>
                            <span className="text-[9px] font-black uppercase tracking-widest">{item.es_caja ? 'Venta por Caja' : 'Cambiar a Caja'}</span>
                         </button>
                      )}
                    </div>
                    <div className="flex items-center gap-1 bg-background border border-white/5 px-2 py-1.5 rounded-2xl">
                      <button onClick={() => actualizarCantidad(item.id, -1)} className="text-on-surface hover:text-primary transition-colors p-1"><span className="material-symbols-outlined text-xs">remove</span></button>
                      <input 
                        type="text"
                        className="bg-transparent border-none text-center font-mono font-black text-sm w-10 focus:outline-none focus:ring-0 p-0 m-0" 
                        value={item.cantidad} 
                        onChange={(e) => {
                            const val = e.target.value.replace(/[^0-9]/g, '');
                            setCantidadExacta(item.id, val);
                        }}
                        onBlur={(e) => {
                           if(e.target.value === "" || parseInt(e.target.value) < 1) {
                               setCantidadExacta(item.id, "1");
                           }
                        }}
                      />
                      <button onClick={() => actualizarCantidad(item.id, 1)} className="text-on-surface hover:text-primary transition-colors p-1"><span className="material-symbols-outlined text-xs">add</span></button>
                    </div>
                    <button onClick={() => quitarDelCarrito(item.id)} className="text-error/40 hover:text-error transition-colors p-1"><span className="material-symbols-outlined text-lg">close</span></button>
                  </div>
                ))
              )}
            </div>

            <div className="p-10 border-t border-white/10 bg-white/2 space-y-8">
              <div className="space-y-4">
                <div className="flex justify-between items-center text-on-surface-variant/60 font-black text-[10px] uppercase tracking-widest">
                  <span>Equivalente en Bolívares (VES)</span>
                  <span className="text-secondary font-mono text-sm">{totalBs.toFixed(2)} Bs</span>
                </div>
                <div className="flex justify-between items-end border-t border-white/5 pt-4">
                  <div>
                    <p className="text-[10px] uppercase font-black text-on-surface-variant tracking-widest mb-1">Total a Cobrar</p>
                    <p className="text-6xl font-black font-mono text-primary tracking-tighter">${totalUsd.toFixed(2)}</p>
                  </div>
                  <div className="text-right flex flex-col items-end gap-3">
                    <div>
                      <p className="text-[10px] uppercase font-black text-on-surface-variant tracking-widest mb-2">Método de Pago</p>
                      <select
                        className="bg-background border border-white/10 rounded-xl py-3 px-4 text-xs font-black uppercase text-primary outline-none cursor-pointer hover:border-primary/50 transition-all w-full"
                        value={metodoPago}
                        onChange={(e) => setMetodoPago(e.target.value)}
                      >
                        <option value="Efectivo">Efectivo 💵</option>
                        <option value="Punto de Venta">Punto 💳</option>
                        <option value="Pago Móvil">Pago Móvil ⚡</option>
                        <option value="Divisa">Divisa (Efectivo $) 💰</option>
                        <option value="Crédito">A Crédito (Fiado) 📝</option>
                      </select>
                    </div>
                    {(metodoPago === "Punto de Venta" || metodoPago === "Pago Móvil") && (
                      <div className="w-full">
                        <input 
                          type="text" 
                          placeholder="NRO. REFERENCIA"
                          className="w-full bg-background border border-white/10 rounded-xl py-3 px-4 text-xs font-black uppercase text-on-surface outline-none focus:border-primary/50 transition-all"
                          value={referencia}
                          onChange={(e) => setReferencia(e.target.value)}
                          required
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <button
                onClick={handleProcesarVenta}
                disabled={procesando || carrito.length === 0 || ((metodoPago === "Punto de Venta" || metodoPago === "Pago Móvil") && referencia.trim() === "")}
                className={`w-full py-7 rounded-[2rem] font-black text-xs uppercase tracking-[0.3em] transition-all flex items-center justify-center gap-4 shadow-3xl disabled:opacity-20 ${procesando || carrito.length === 0 || ((metodoPago === "Punto de Venta" || metodoPago === "Pago Móvil") && referencia.trim() === "")
                    ? 'bg-surface text-on-surface-variant/20 cursor-not-allowed'
                    : 'bg-primary text-on-primary hover:scale-[1.02] active:scale-[0.98] shadow-primary/20'
                  }`}
              >
                {procesando ? (
                  <div className="w-5 h-5 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin"></div>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-sm">receipt_long</span>
                    Completar Operación
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE AUTORIZACIÓN PARA VENDEDORES */}
      {authModal.open && (
        <div className="fixed inset-0 bg-background/90 backdrop-blur-3xl z-[500] flex items-center justify-center p-6 animate-in fade-in duration-300">
           <div className="bg-surface w-full max-sm rounded-[3rem] p-10 border border-white/10 shadow-3xl text-center">
              <span className="material-symbols-outlined text-6xl text-primary mb-6">lock_person</span>
              <h3 className="text-2xl font-black tracking-tighter mb-2">Autorización Requerida</h3>
              <p className="text-[10px] uppercase font-bold tracking-widest opacity-40 mb-8">Un administrador debe validar esta acción</p>
              
              <form onSubmit={handleAdminAuth} className="space-y-4">
                 <input 
                  required
                  placeholder="Usuario Admin"
                  className="w-full bg-background border border-white/5 p-4 rounded-2xl text-xs font-bold outline-none focus:border-primary/40"
                  value={authForm.username}
                  onChange={e => setAuthForm({...authForm, username: e.target.value})}
                 />
                 <input 
                  type="password"
                  required
                  placeholder="Contraseña Admin"
                  className="w-full bg-background border border-white/5 p-4 rounded-2xl text-xs font-bold outline-none focus:border-primary/40"
                  value={authForm.password}
                  onChange={e => setAuthForm({...authForm, password: e.target.value})}
                 />
                 <div className="pt-4 flex flex-col gap-2">
                    <button type="submit" className="w-full bg-primary text-on-primary py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all">
                      Validar y Continuar
                    </button>
                    <button type="button" onClick={() => setAuthModal({open: false, action: null})} className="w-full py-4 text-[10px] font-black uppercase tracking-widest opacity-30 hover:opacity-100 transition-all">
                      Cancelar
                    </button>
                 </div>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};

export default Ventas;
