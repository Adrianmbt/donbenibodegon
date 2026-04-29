import React, { useState, useEffect } from "react";

const Finanzas = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/finanzas/stats", {
        headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
      });
      const data = await res.json();
      if (!data.detail) {
        setStats(data);
      } else {
        console.error("Error en finanzas:", data.detail);
      }
    } catch (e) {
      console.error("Error cargando finanzas:", e);
    } finally {
      setLoading(false);
    }
  };

  const downloadFile = async (url, filename) => {
    try {
      const response = await fetch(url, {
        headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
      });
      if (!response.ok) throw new Error("Error al descargar archivo");
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(blobUrl);
      document.body.removeChild(a);
    } catch (e) {
      console.error(e);
      alert("Error al generar el reporte.");
    }
  };

  const downloadPDF = () => downloadFile(`/api/finanzas/reporte-pdf`, `Reporte_Patrimonial_DonBeni.pdf`);
  const downloadDeclaracion = () => downloadFile(`/api/finanzas/declaracion-ingresos-mensual`, `Declaracion_Ingresos_Mes.pdf`);

  if (loading) return <div className="p-10 text-center animate-pulse">Cargando estado financiero...</div>;

  const formatVES = (usd) => (usd * stats.tasa_bcv).toLocaleString('es-VE', { minimumFractionDigits: 2 });

  return (
    <div className="p-10 space-y-12 min-h-screen bg-background text-on-surface animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-6xl font-black tracking-tighter mb-2 font-headline text-on-surface">
            Centro de <span className="text-primary">Finanzas</span>
          </h1>
          <p className="text-on-surface-variant font-medium tracking-tight">Análisis patrimonial y auditoría de activos/pasivos.</p>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={downloadDeclaracion}
            className="bg-surface border border-white/10 text-on-surface px-8 py-5 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-3 hover:bg-white/5 transition-all shadow-xl"
          >
            <span className="material-symbols-outlined text-sm text-secondary">description</span>
            Declaración de Ingresos (Mes)
          </button>
          <button 
            onClick={downloadPDF}
            className="bg-primary text-on-primary px-8 py-5 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-3 hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-primary/30"
          >
            <span className="material-symbols-outlined text-sm">picture_as_pdf</span>
            Exportar Patrimonio (PDF)
          </button>
        </div>
      </div>

      {/* Grid de Métricas Principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        
        {/* Card: Inventario */}
        <div className="bg-surface p-8 rounded-[2.5rem] border border-white/5 shadow-xl flex flex-col justify-between h-56 group hover:border-primary/30 transition-all">
          <div className="flex justify-between items-start">
            <span className="material-symbols-outlined text-primary text-3xl">inventory_2</span>
            <div className="text-right">
               <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/40">Activos en Stock</p>
               <p className="text-[9px] font-bold text-primary/60">Tasa: {stats.tasa_bcv} Bs</p>
            </div>
          </div>
          <div>
            <p className="text-4xl font-black font-mono tracking-tighter">${stats?.valor_inventario.toLocaleString()}</p>
            <p className="text-sm font-bold text-on-surface-variant/60 font-mono mt-1">{formatVES(stats?.valor_inventario)} Bs</p>
            <p className="text-[9px] font-black text-on-surface-variant uppercase mt-3 tracking-widest">Valoración de Mercancía</p>
          </div>
        </div>

        {/* Card: Por Cobrar */}
        <div className="bg-surface p-8 rounded-[2.5rem] border border-white/5 shadow-xl flex flex-col justify-between h-56 hover:border-secondary/30 transition-all">
          <div className="flex justify-between items-start">
            <span className="material-symbols-outlined text-secondary text-3xl">request_quote</span>
            <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/40">Por Cobrar</span>
          </div>
          <div>
            <p className="text-4xl font-black font-mono tracking-tighter">${stats?.cuentas_por_cobrar.toLocaleString()}</p>
            <p className="text-sm font-bold text-secondary/60 font-mono mt-1">{formatVES(stats?.cuentas_por_cobrar)} Bs</p>
            <p className="text-[9px] font-black text-on-surface-variant uppercase mt-3 tracking-widest">Créditos a Clientes</p>
          </div>
        </div>

        {/* Card: Por Pagar */}
        <div className="bg-surface p-8 rounded-[2.5rem] border border-white/5 shadow-xl flex flex-col justify-between h-56 hover:border-error/30 transition-all">
          <div className="flex justify-between items-start">
            <span className="material-symbols-outlined text-error text-3xl">account_balance_wallet</span>
            <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/40">Por Pagar</span>
          </div>
          <div>
            <p className="text-4xl font-black font-mono tracking-tighter">${stats?.cuentas_por_pagar.toLocaleString()}</p>
            <p className="text-sm font-bold text-error/60 font-mono mt-1">{formatVES(stats?.cuentas_por_pagar)} Bs</p>
            <p className="text-[9px] font-black text-on-surface-variant uppercase mt-3 tracking-widest">Deuda a Proveedores</p>
          </div>
        </div>

        {/* Card: Patrimonio */}
        <div className="bg-primary/5 p-8 rounded-[2.5rem] border border-primary/20 shadow-xl flex flex-col justify-between h-56 relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <span className="material-symbols-outlined text-[10rem]">account_balance</span>
          </div>
          <div className="flex justify-between items-start relative z-10">
            <span className="material-symbols-outlined text-primary text-3xl">payments</span>
            <span className="text-[10px] font-black uppercase tracking-widest text-primary/60">Patrimonio Neto</span>
          </div>
          <div className="relative z-10">
            <p className="text-4xl font-black font-mono tracking-tighter text-primary">${stats?.patrimonio_neto.toLocaleString()}</p>
            <p className="text-sm font-bold text-primary/40 font-mono mt-1">{formatVES(stats?.patrimonio_neto)} Bs</p>
            <p className="text-[9px] font-black text-on-surface-variant uppercase mt-3 tracking-widest">Estimación del Negocio</p>
          </div>
        </div>
      </div>

      {/* Visualización de Activos vs Pasivos */}
      <div className="grid grid-cols-12 gap-8 h-[500px]">
        {/* Desglose de Activos */}
        <div className="col-span-12 lg:col-span-7 bg-surface rounded-[3rem] border border-white/5 shadow-2xl p-12 flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-black uppercase tracking-[0.4em] text-primary mb-2">Composición del Capital</h3>
            <h2 className="text-3xl font-black text-on-surface tracking-tighter mb-8">Activos Circulantes</h2>
            
            <div className="space-y-8">
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-black uppercase tracking-widest">
                  <span>Inventario</span>
                  <span>{((stats.valor_inventario / stats.activos_totales) * 100).toFixed(1)}%</span>
                </div>
                <div className="h-4 w-full bg-background rounded-full overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: `${(stats.valor_inventario / stats.activos_totales) * 100}%` }}></div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs font-black uppercase tracking-widest text-secondary">
                  <span>Cuentas por Cobrar</span>
                  <span>{((stats.cuentas_por_cobrar / stats.activos_totales) * 100).toFixed(1)}%</span>
                </div>
                <div className="h-4 w-full bg-background rounded-full overflow-hidden">
                  <div className="h-full bg-secondary" style={{ width: `${(stats.cuentas_por_cobrar / stats.activos_totales) * 100}%` }}></div>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-8 border-t border-white/5 flex justify-between items-center">
            <p className="text-xs font-black uppercase text-on-surface-variant/40 tracking-widest">Totalización de Bienes</p>
            <p className="text-4xl font-black font-mono text-on-surface">${stats?.activos_totales.toLocaleString()}</p>
          </div>
        </div>

        {/* Resumen de Pasivos y Deuda */}
        <div className="col-span-12 lg:col-span-5 bg-surface rounded-[3rem] border border-white/5 shadow-2xl p-12 flex flex-col">
          <h3 className="text-xs font-black uppercase tracking-[0.4em] text-error mb-2">Estado de Deudas</h3>
          <h2 className="text-3xl font-black text-on-surface tracking-tighter mb-8">Pasivos Totales</h2>
          
          <div className="flex-1 flex flex-col items-center justify-center space-y-4">
             <div className="relative w-48 h-48 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="96" cy="96" r="88" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-background" />
                  <circle cx="96" cy="96" r="88" stroke="currentColor" strokeWidth="12" fill="transparent" strokeDasharray={552} strokeDashoffset={552 - (552 * (stats.cuentas_por_pagar / stats.activos_totales))} className="text-error" />
                </svg>
                <div className="absolute text-center">
                  <p className="text-3xl font-black font-mono">{( (stats.cuentas_por_pagar / stats.activos_totales) * 100 ).toFixed(1)}%</p>
                  <p className="text-[8px] font-black uppercase tracking-widest text-on-surface-variant">Riesgo / Deuda</p>
                </div>
             </div>
             <p className="text-[10px] text-on-surface-variant/60 font-medium text-center px-10">Tu nivel de deuda representa el {((stats.cuentas_por_pagar / stats.activos_totales) * 100).toFixed(1)}% respecto a tus activos totales.</p>
          </div>

          <div className="pt-8 border-t border-white/5 space-y-4">
            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-on-surface-variant/40">
              <span>Ventas Históricas Acumuladas</span>
              <span className="text-primary font-mono text-lg">${stats?.ventas_totales.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Finanzas;
