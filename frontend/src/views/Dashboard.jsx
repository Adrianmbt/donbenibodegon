import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetch("/api/dashboard/resumen-ejecutivo")
      .then(res => res.json())
      .then(d => setData(d))
      .catch(e => console.error(e))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-background">
      <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="p-10 space-y-12 animate-in fade-in zoom-in-95 duration-500 bg-background min-h-screen text-on-surface">
      {/* Header Seccional */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-6xl font-black tracking-tighter mb-2 font-headline">
            Panel de <span className="text-primary">Control</span>
          </h1>
          <p className="text-on-surface-variant font-medium tracking-tight">Análisis operativo para Bodegón Don Beni.</p>
        </div>
        <div className="bg-surface px-6 py-4 rounded-2xl border border-white/5 flex items-center gap-4 shadow-xl">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_10px_rgba(212,175,55,0.8)]"></div>
          <span className="text-[10px] font-black uppercase tracking-widest">Sistema Online</span>
        </div>
      </div>

      {/* Grid de KPIs Principales */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div 
          onClick={() => navigate('/ventas')} 
          className="bg-surface p-8 rounded-[2rem] border border-white/5 shadow-2xl relative overflow-hidden group cursor-pointer hover:bg-surface-container/50 transition-all"
        >
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform">
            <span className="material-symbols-outlined text-9xl text-primary">payments</span>
          </div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-primary font-black mb-6">Ventas de Hoy</p>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-5xl font-black font-mono leading-none">${data?.ventas_del_dia?.toFixed(2)}</span>
          </div>
          <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Ingresos brutos acumulados</p>
          <div className="mt-8 h-1 w-full bg-white/5 rounded-full overflow-hidden">
            <div className="h-full bg-primary w-2/3 shadow-[0_0_15px_rgba(212,175,55,0.4)]"></div>
          </div>
        </div>

        <div 
          onClick={() => navigate('/ventas?filter=credito')} 
          className="bg-surface p-8 rounded-[2rem] border border-white/5 shadow-2xl relative overflow-hidden group cursor-pointer hover:bg-surface-container/50 transition-all"
        >
           <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform">
            <span className="material-symbols-outlined text-9xl text-primary">account_balance_wallet</span>
          </div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-primary font-black mb-6">Cuentas por Cobrar</p>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-5xl font-black font-mono leading-none">${data?.capital_en_cxc?.toFixed(2)}</span>
          </div>
          <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Capital pendiente de clientes</p>
          <div className="mt-8 h-1 w-full bg-white/5 rounded-full overflow-hidden">
            <div className="h-full bg-secondary w-1/2 shadow-[0_0_15px_rgba(255,193,7,0.4)]"></div>
          </div>
        </div>

        <div 
          onClick={() => navigate('/inventario?filter=critical')} 
          className="bg-surface p-8 rounded-[2rem] border border-white/5 shadow-2xl relative overflow-hidden group cursor-pointer hover:bg-surface-container/50 transition-all"
        >
           <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform text-error">
            <span className="material-symbols-outlined text-9xl">warning</span>
          </div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-error font-black mb-6">Stock Crítico</p>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-5xl font-black font-mono leading-none text-error">{data?.productos_stock_bajo}</span>
          </div>
          <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Productos requieren reposición</p>
          <div className="mt-8 flex gap-1">
             {[...Array(5)].map((_, i) => (
               <div key={i} className={`h-1.5 flex-1 rounded-full ${i < (data?.productos_stock_bajo > 0 ? 5 : 0) ? 'bg-error animate-pulse' : 'bg-white/5'}`}></div>
             ))}
          </div>
        </div>
      </div>

      {/* Sección Inferior: Análisis y Top Ventas */}
      <div className="grid grid-cols-12 gap-8 mt-12">
        {/* Top Productos del Mes */}
        <div className="col-span-12 lg:col-span-7 bg-surface rounded-[2.5rem] p-10 border border-white/5 shadow-2xl">
          <div className="flex justify-between items-center mb-10">
            <h2 className="text-xs uppercase tracking-[0.4em] font-black text-on-surface-variant">Top 5 Productos del Mes</h2>
            <span className="material-symbols-outlined text-primary">military_tech</span>
          </div>
          <div className="space-y-6">
            {data?.top_productos?.length === 0 ? (
              <p className="text-sm text-on-surface-variant italic py-10 text-center">Sin datos de ventas registradas este mes.</p>
            ) : (
                data?.top_productos?.map((prod, index) => (
                  <div key={index} className="flex items-center justify-between group p-4 hover:bg-white/5 rounded-2xl transition-all border border-transparent hover:border-white/5">
                    <div className="flex items-center gap-6">
                      <div className="w-10 h-10 rounded-full bg-background flex items-center justify-center font-black text-primary border border-primary/20">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-bold text-on-surface">{prod.nombre}</p>
                        <p className="text-[10px] text-on-surface-variant/60 font-mono">Movimiento mensual</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-mono font-bold text-primary text-xl">{prod.cantidad}</p>
                      <p className="text-[8px] font-black uppercase text-on-surface-variant/40 tracking-widest">Vendidos</p>
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>

        {/* Balance por Método de Pago */}
        <div className="col-span-12 lg:col-span-5 bg-surface rounded-[2.5rem] p-10 border border-white/5 shadow-2xl flex flex-col justify-between">
           <div>
              <h2 className="text-xs uppercase tracking-[0.4em] font-black text-on-surface-variant mb-10 text-center">Corte de Caja (Hoy)</h2>
              <div className="space-y-4">
                {Object.entries(data?.balance_pagos || {}).map(([metodo, monto]) => (
                  <div key={metodo} className="flex flex-col gap-2">
                    <div className="flex justify-between text-xs font-bold uppercase tracking-wider">
                      <span>{metodo}</span>
                      <span className="text-primary">${monto.toFixed(2)}</span>
                    </div>
                    <div className="h-2 w-full bg-background rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary" 
                        style={{ width: `${(monto / (data.ventas_del_dia || 1)) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
                {(!data?.balance_pagos || Object.keys(data.balance_pagos).length === 0) && (
                   <p className="text-sm text-on-surface-variant italic py-10 text-center">No hay flujo de caja registrado hoy.</p>
                )}
              </div>
           </div>
           
           <div className="mt-12 p-6 bg-background rounded-2xl border border-white/5">
              <p className="text-[10px] uppercase font-black text-primary tracking-widest mb-2">Total en Bóveda</p>
              <p className="text-3xl font-black font-mono">${data?.ventas_del_dia?.toFixed(2)}</p>
           </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
