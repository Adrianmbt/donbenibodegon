import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Swal from 'sweetalert2';

// ─── Constantes ───────────────────────────────────────────────────────────────
const TOKEN = () => localStorage.getItem('token');
const API = (path) => `/api/dev${path}`;

// ─── Sub-panel: Estado DB ──────────────────────────────────────────────────────
const CardDB = ({ data, loading }) => (
  <div className="bg-surface p-8 rounded-[2.5rem] border border-white/5 shadow-2xl relative overflow-hidden group">
    <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform">
      <span className="material-symbols-outlined text-[8rem] text-secondary">database</span>
    </div>
    <span className="material-symbols-outlined text-3xl text-secondary mb-3 block">database</span>
    <h3 className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-2">Estado de la Base</h3>
    {loading ? (
      <div className="w-6 h-6 border-2 border-secondary border-t-transparent rounded-full animate-spin" />
    ) : (
      <>
        <p className="text-3xl font-black text-secondary font-mono">{data?.db_size || '---'}</p>
        <div className="flex items-center gap-2 mt-2">
          <span className={`w-2 h-2 rounded-full ${data?.status === 'online' ? 'bg-primary animate-pulse' : 'bg-error'}`}></span>
          <span className="text-[10px] font-bold uppercase tracking-widest opacity-50">
            {data?.status === 'online' ? 'Óptimo' : 'Error de Conexión'}
          </span>
        </div>
        {data?.tablas && (
          <div className="mt-4 grid grid-cols-3 gap-2">
            {Object.entries(data.tablas).map(([k, v]) => (
              <div key={k} className="bg-white/5 rounded-xl p-2 text-center">
                <p className="text-[8px] uppercase font-bold opacity-40">{k}</p>
                <p className="text-sm font-black font-mono">{v}</p>
              </div>
            ))}
          </div>
        )}
      </>
    )}
  </div>
);

// ─── Sub-panel: Licencia ───────────────────────────────────────────────────────
const CardLicencia = ({ data, loading }) => {
  const isActiva = data?.status === 'activa';
  return (
    <div className={`p-8 rounded-[2.5rem] border shadow-2xl relative overflow-hidden group ${isActiva ? 'bg-secondary/5 border-secondary/20' : 'bg-error/5 border-error/20'}`}>
      <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform">
        <span className="material-symbols-outlined text-[8rem]">verified_user</span>
      </div>
      <span className={`material-symbols-outlined text-3xl mb-3 block ${isActiva ? 'text-secondary' : 'text-error'}`}>
        {isActiva ? 'verified_user' : 'gpp_bad'}
      </span>
      <h3 className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-2">Estado de Licencia</h3>
      {loading ? (
        <div className="w-6 h-6 border-2 border-secondary border-t-transparent rounded-full animate-spin" />
      ) : (
        <>
          <p className={`text-3xl font-black capitalize ${isActiva ? 'text-secondary' : 'text-error'}`}>
            {data?.status === 'activa' ? 'Activa' : data?.status === 'vencida' ? 'Vencida' : 'Sin Licencia'}
          </p>
          {data?.expires && <p className="text-[10px] font-bold opacity-40 uppercase mt-1">Vence: {data.expires}</p>}
          {data?.dias_restantes !== undefined && (
            <p className={`text-[10px] font-bold mt-1 ${data.dias_restantes < 30 ? 'text-error' : 'text-primary'}`}>
              {data.dias_restantes} días restantes
            </p>
          )}
        </>
      )}
    </div>
  );
};

// ─── Componente principal ──────────────────────────────────────────────────────
const Mantenimiento = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('acciones'); // 'acciones' | 'logs'
  const [dbStatus, setDbStatus] = useState(null);
  const [licencia, setLicencia] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loadingDb, setLoadingDb] = useState(true);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [loadingBackup, setLoadingBackup] = useState(false);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [generatedKey, setGeneratedKey] = useState(null);
  const [toast, setToast] = useState(null);

  // Modal estados
  const [modalKey, setModalKey] = useState(false);
  const [activarForm, setActivarForm] = useState({ clave: '', username: '', password: '' });

  const headers = { Authorization: `Bearer ${TOKEN()}` };

  const swalOk = (msg) => Swal.fire({ icon: 'success', title: msg, timer: 2500, showConfirmButton: false, background: '#111827', color: '#f1f5f9', iconColor: '#EAB308' });
  const swalErr = (msg) => Swal.fire({ icon: 'error', title: 'Error', text: msg, background: '#111827', color: '#f1f5f9', confirmButtonColor: '#ef4444' });
  const swalConfirm = (title, text) => Swal.fire({ title, text, icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444', cancelButtonColor: '#374151', confirmButtonText: 'Sí, continuar', cancelButtonText: 'Cancelar', background: '#111827', color: '#f1f5f9' });

  const fetchDbStatus = async () => {
    setLoadingDb(true);
    try {
      const res = await fetch(API('/db-status'), { headers });
      setDbStatus(await res.json());
    } catch { setDbStatus({ status: 'error' }); }
    finally { setLoadingDb(false); }
  };

  const fetchLicencia = async () => {
    try {
      const res = await fetch(API('/licencia/estado'), { headers });
      setLicencia(await res.json());
    } catch { }
  };

  const fetchLogs = async () => {
    setLoadingLogs(true);
    try {
      const res = await fetch(API('/logs'), { headers });
      setLogs(await res.json());
    } catch { }
    finally { setLoadingLogs(false); }
  };

  useEffect(() => {
    fetchDbStatus();
    fetchLicencia();
  }, []);

  useEffect(() => {
    if (activeTab === 'logs') fetchLogs();
  }, [activeTab]);

  // ── Acciones ────────────────────────────────────────────────────────────────

  const handleBackup = async () => {
    setLoadingBackup(true);
    try {
      const res = await fetch(API('/backup'), { method: 'POST', headers });
      if (!res.ok) {
        const err = await res.json();
        swalErr(err.detail || 'Error al generar backup');
        return;
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `DonBeni_backup_${new Date().toISOString().slice(0, 10)}.sql`;
      a.click();
      swalOk('Backup descargado correctamente');
    } catch (e) {
      swalErr('pg_dump debe estar en el PATH del servidor. ' + e.message);
    } finally { setLoadingBackup(false); }
  };

  const handleGenerarKey = async () => {
    try {
      const res = await fetch(API('/licencia/generar'), { method: 'POST', headers });
      const data = await res.json();
      setGeneratedKey(data);   // abre modal
      fetchLicencia();
    } catch { swalErr('Error generando licencia'); }
  };

  const handleActivarKey = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(API('/licencia/activar'), {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(activarForm)
      });
      const data = await res.json();
      if (!res.ok) { swalErr(data.detail || 'Error'); return; }
      swalOk(`Licencia activada hasta ${data.expires}`);
      setModalKey(false);
      setActivarForm({ clave: '', username: '', password: '' });
      fetchLicencia();
    } catch { swalErr('Error al activar licencia'); }
  };

  const handleLimpiarLogs = async () => {
    const result = await swalConfirm('Limpiar Logs', '¿Eliminar TODOS los registros de auditoría? Esta acción no se puede deshacer.');
    if (!result.isConfirmed) return;
    try {
      const res = await fetch(API('/logs'), { method: 'DELETE', headers });
      const data = await res.json();
      swalOk(data.message);
      fetchLogs();
    } catch { swalErr('Error limpiando logs'); }
  };

  const handleRevocarLicencia = async () => {
    const result = await swalConfirm('Revocar Licencia', '¿REVOCAR la licencia activa? Admins y vendedores perderán el acceso inmediatamente.');
    if (!result.isConfirmed) return;
    try {
      const res = await fetch(API('/licencia/revocar'), { method: 'DELETE', headers });
      const data = await res.json();
      if (!res.ok) { swalErr(data.detail || 'Error al revocar'); return; }
      swalOk(data.message);
      fetchLicencia();
    } catch { swalErr('Error al revocar licencia'); }
  };

  const handleLimpiarDB = async () => {
    const result = await swalConfirm(
      '⚠️ LIMPIAR BASE DE DATOS',
      'Esta acción ELIMINARÁ todos los productos, ventas, clientes y deudas. Solo se conservarán los usuarios y licencias. ESTA ACCIÓN ES IRREVERSIBLE.'
    );
    if (!result.isConfirmed) return;
    try {
      const res = await fetch(API('/limpiar-datos'), { method: 'POST', headers });
      const data = await res.json();
      if (!res.ok) { swalErr(data.detail || 'Error al limpiar'); return; }
      swalOk('Base de datos limpiada con éxito');
      fetchDbStatus();
    } catch { swalErr('Error crítico al conectar'); }
  };

  const handleExportSQLite = async () => {
    const result = await swalConfirm(
      'Exportar a SQLite',
      'Se generará un archivo SQLite con TODOS los datos actuales de PostgreSQL. Esto puede tomar unos segundos.'
    );
    if (!result.isConfirmed) return;
    try {
      const res = await fetch(API('/exportar-sqlite'), { method: 'POST', headers });
      if (!res.ok) {
        const d = await res.json();
        swalErr(d.detail || 'Error al exportar');
        return;
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `DonBeni_${new Date().toISOString().slice(0, 10)}.sqlite3`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      swalOk('Base de datos SQLite exportada correctamente');
    } catch (e) { swalErr('Error exportando: ' + e.message); }
  };

  const handleDownloadPdf = async () => {
    setLoadingPdf(true);
    try {
      const res = await fetch(API('/logs/pdf'), { headers });
      if (!res.ok) { swalErr('Error al generar PDF'); return; }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Reporte_Auditoria_${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      swalOk('Reporte PDF generado correctamente');
    } catch { swalErr('Error cargando el PDF'); }
    finally { setLoadingPdf(false); }
  };

  // Color / icon por acción
  const accionColor = (a) => ({
    DELETE: 'bg-error/10 text-error border-error/20',
    EDIT: 'bg-secondary/10 text-secondary border-secondary/20',
    CREATE: 'bg-primary/10 text-primary border-primary/20',
  }[a] || 'bg-white/5 text-on-surface-variant border-white/10');

  return (
    <div className="p-10 space-y-10 animate-in fade-in duration-500 min-h-screen">

      {/* HERO */}
      <div>
        <h1 className="text-6xl font-black tracking-tighter mb-2 font-headline">
          Panel de <span className="text-secondary">Desarrollador</span>
        </h1>
        <p className="text-on-surface-variant font-medium tracking-tight">Acceso exclusivo para mantenimiento y control de licencia.</p>
      </div>

      {/* STATS CARDS */}
      <div className="grid grid-cols-3 gap-6">
        <CardDB data={dbStatus} loading={loadingDb} />

        {/* Card Logs */}
        <div
          className={`bg-surface p-8 rounded-[2.5rem] border shadow-2xl relative overflow-hidden group cursor-pointer transition-all ${activeTab === 'logs' ? 'border-primary/30 bg-primary/5' : 'border-white/5 hover:border-primary/20'}`}
          onClick={() => setActiveTab('logs')}
        >
          <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform">
            <span className="material-symbols-outlined text-[8rem] text-primary">history_edu</span>
          </div>
          <span className="material-symbols-outlined text-3xl text-primary mb-3 block">history_edu</span>
          <h3 className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-2">Logs del Sistema</h3>
          <p className="text-3xl font-black">{logs.length > 0 ? `${logs.length} eventos` : '— eventos'}</p>
          <p className="text-[10px] text-primary font-bold mt-2 uppercase tracking-widest">Click para ver</p>
        </div>

        <CardLicencia data={licencia} loading={false} />
      </div>

      {/* TABS */}
      <div className="flex gap-2 border-b border-white/5 pb-0">
        {[['acciones', 'build', 'Acciones'], ['logs', 'history_edu', 'Audit Logs']].map(([k, icon, label]) => (
          <button
            key={k}
            onClick={() => setActiveTab(k)}
            className={`flex items-center gap-2 px-6 py-3 rounded-t-2xl font-black text-xs uppercase tracking-widest transition-all border-b-2 ${activeTab === k ? 'border-primary text-primary bg-primary/5' : 'border-transparent text-on-surface-variant/50 hover:text-on-surface'}`}
          >
            <span className="material-symbols-outlined text-sm">{icon}</span>
            {label}
          </button>
        ))}
      </div>

      {/* ══ TAB: ACCIONES ══ */}
      {activeTab === 'acciones' && (
        <div className="space-y-8">
          <div className="bg-surface rounded-[2.5rem] border border-white/5 shadow-2xl p-10">
            <div className="flex justify-between items-center mb-10">
              <h3 className="text-xl font-black tracking-tight">Acciones de Mantenimiento</h3>
              <span className="text-[10px] font-black uppercase tracking-widest text-error">Zona de Riesgo</span>
            </div>
            <div className="grid grid-cols-2 gap-4">

              {/* Backup */}
              <button
                onClick={handleBackup}
                disabled={loadingBackup}
                className="flex items-center gap-4 p-6 bg-background rounded-3xl border border-white/5 hover:border-secondary/30 transition-all text-left group disabled:opacity-50"
              >
                <div className="bg-secondary/10 p-4 rounded-2xl group-hover:bg-secondary group-hover:text-on-secondary transition-all">
                  {loadingBackup
                    ? <div className="w-6 h-6 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    : <span className="material-symbols-outlined">backup</span>}
                </div>
                <div>
                  <p className="font-black text-sm">Respaldo Forzado</p>
                  <p className="text-xs opacity-40">Generar dump completo de la DB (.sql)</p>
                </div>
              </button>

              {/* Limpiar Logs */}
              <button
                onClick={() => { setActiveTab('logs'); setTimeout(handleLimpiarLogs, 300); }}
                className="flex items-center gap-4 p-6 bg-background rounded-3xl border border-white/5 hover:border-error/30 transition-all text-left group"
              >
                <div className="bg-error/10 p-4 rounded-2xl group-hover:bg-error group-hover:text-on-error transition-all text-error">
                  <span className="material-symbols-outlined">delete_sweep</span>
                </div>
                <div>
                  <p className="font-black text-sm text-error">Limpiar Logs</p>
                  <p className="text-xs opacity-40">Eliminar registros de auditoría</p>
                </div>
              </button>

              {/* Generar Key */}
              <button
                onClick={handleGenerarKey}
                className="flex items-center gap-4 p-6 bg-background rounded-3xl border border-white/5 hover:border-primary/30 transition-all text-left group"
              >
                <div className="bg-primary/10 p-4 rounded-2xl group-hover:bg-primary group-hover:text-on-primary transition-all">
                  <span className="material-symbols-outlined">key</span>
                </div>
                <div>
                  <p className="font-black text-sm">Generar Key de Licencia</p>
                  <p className="text-xs opacity-40">Nueva clave con validez de 6 meses</p>
                </div>
              </button>

              {/* Activar Key */}
              <button
                onClick={() => setModalKey(true)}
                className="flex items-center gap-4 p-6 bg-background rounded-3xl border border-white/5 hover:border-secondary/30 transition-all text-left group"
              >
                <div className="bg-secondary/10 p-4 rounded-2xl group-hover:bg-secondary group-hover:text-on-secondary transition-all">
                  <span className="material-symbols-outlined">verified</span>
                </div>
                <div>
                  <p className="font-black text-sm">Activar Licencia</p>
                  <p className="text-xs opacity-40">Introducir clave para renovar acceso</p>
                </div>
              </button>

              {/* Revocar Licencia */}
              <button
                onClick={handleRevocarLicencia}
                className="flex items-center gap-4 p-6 bg-background rounded-3xl border border-white/5 hover:border-error/30 transition-all text-left group"
              >
                <div className="bg-error/10 p-4 rounded-2xl group-hover:bg-error group-hover:text-on-error transition-all text-error">
                  <span className="material-symbols-outlined">block</span>
                </div>
                <div>
                  <p className="font-black text-sm text-error">Revocar Licencia</p>
                  <p className="text-xs opacity-40">Desactivar licencia actual de emergencia</p>
                </div>
              </button>

              {/* Limpiar DB (Solo Dev) */}
              {user?.rol === 'dev' && (
                <button
                  onClick={handleLimpiarDB}
                  className="flex items-center gap-4 p-6 bg-background rounded-3xl border-2 border-error/20 hover:border-error transition-all text-left group animate-pulse hover:animate-none"
                >
                  <div className="bg-error p-4 rounded-2xl text-on-error">
                    <span className="material-symbols-outlined">dangerous</span>
                  </div>
                  <div>
                    <p className="font-black text-sm text-error">LIMPIAR TODO</p>
                    <p className="text-xs opacity-40">Borrar stock, ventas y deudas (Reset)</p>
                  </div>
                </button>
              )}

            </div>
          </div>

          {/* MODAL KEY GENERADA */}
          {generatedKey && (
            <div className="fixed inset-0 bg-background/90 backdrop-blur-3xl z-[600] flex items-center justify-center p-6 animate-in zoom-in-95 duration-300">
              <div className="bg-surface w-full max-w-lg rounded-[3.5rem] p-12 border border-primary/20 shadow-3xl relative overflow-hidden">

                {/* Decoración de fondo */}
                <div className="absolute -right-10 -top-10 opacity-5">
                  <span className="material-symbols-outlined text-[15rem] text-primary">key</span>
                </div>

                <div className="flex justify-between items-start mb-10">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-2">Sistema Don Beni · Licenciamiento</p>
                    <h3 className="text-3xl font-black tracking-tighter">Nueva Licencia <span className="text-primary">Generada</span></h3>
                  </div>
                  <button onClick={() => setGeneratedKey(null)} className="p-2 hover:bg-white/5 rounded-full transition-colors opacity-40 hover:opacity-100">
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>

                {/* Badges de tecnología */}
                <div className="flex gap-3 mb-10">
                  <div className="flex items-center gap-2 bg-[#3776AB]/20 border border-[#3776AB]/30 px-5 py-2.5 rounded-full">
                    <svg viewBox="0 0 48 48" className="w-5 h-5" fill="none">
                      <path d="M24.047 5c-1.555.005-3.111.159-4.571.449C15.56 6.367 14.907 8.144 14.6 9.877c-.271 1.8-.405 3.63-.405 3.63H24v1.218H10.07S6.993 14.5 5.9 18.824c-1.064 4.183.985 6.6.985 6.6s.925 1.53 3.16 1.53h2.007v-3.69s-.11-3.14 3.07-3.14h9.91s2.97.048 2.97-2.88V9.116s.505-4.116-3.955-4.116zm-5.49 2.371a1.218 1.218 0 1 1 0 2.437 1.218 1.218 0 0 1 0-2.437z" fill="#3776AB" />
                      <path d="M24.953 43c1.555-.005 3.111-.159 4.571-.449 3.916-.918 4.569-2.695 4.876-4.428.271-1.8.405-3.63.405-3.63H24v-1.218h13.93s3.077.225 4.17-4.099c1.064-4.183-.985-6.6-.985-6.6s-.924-1.53-3.16-1.53h-2.006v3.69s.11 3.14-3.07 3.14h-9.91s-2.97-.048-2.97 2.88v9.128S19.494 43 23.954 43zm5.49-2.371a1.218 1.218 0 1 1 0-2.437 1.218 1.218 0 0 1 0 2.437z" fill="#FFD43B" />
                    </svg>
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#3776AB]">Python</span>
                  </div>
                  <div className="flex items-center gap-2 bg-[#009688]/20 border border-[#009688]/30 px-5 py-2.5 rounded-full">
                    <svg viewBox="0 0 200 200" className="w-5 h-5">
                      <polygon points="100,10 180,50 180,150 100,190 20,150 20,50" fill="#009688" />
                      <text x="100" y="115" textAnchor="middle" fontSize="80" fill="white" fontWeight="bold">F</text>
                    </svg>
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#009688]">FastAPI</span>
                  </div>
                </div>

                {/* Contenedor de la clave */}
                <div className="bg-background border border-white/5 rounded-3xl p-10 font-mono text-center mb-8 shadow-inner">
                  <p className="text-[10px] uppercase font-bold opacity-30 mb-5 tracking-[0.3em]">Clave de Activación</p>
                  <p className="text-3xl font-black text-primary tracking-[0.2em] break-all select-all leading-relaxed drop-shadow-[0_0_15px_rgba(234,179,8,0.2)]">
                    {generatedKey.clave}
                  </p>

                  <div className="flex justify-center gap-12 mt-8 pt-8 border-t border-white/5">
                    <div>
                      <p className="text-[10px] uppercase font-black opacity-30 mb-1">Duración</p>
                      <p className="text-sm font-black text-on-surface">6 Meses</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-black opacity-30 mb-1">Vence</p>
                      <p className="text-sm font-black text-secondary">{new Date(generatedKey.fecha_vencimiento).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => { navigator.clipboard.writeText(generatedKey.clave); swalOk('Clave copiada al portapapeles'); }}
                    className="w-full py-5 rounded-2xl bg-primary text-on-primary font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95"
                  >
                    <span className="material-symbols-outlined text-sm">content_copy</span>
                    Copiar Clave
                  </button>
                  <button
                    onClick={() => setGeneratedKey(null)}
                    className="w-full py-5 rounded-2xl bg-white/5 hover:bg-white/10 text-on-surface font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 border border-white/5"
                  >
                    Cerrar Modal
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══ TAB: LOGS ══ */}
      {activeTab === 'logs' && (
        <div className="bg-surface rounded-[2.5rem] border border-white/5 shadow-2xl p-10">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h3 className="text-xl font-black tracking-tight">Registro de Auditoría</h3>
              <p className="text-[10px] uppercase font-bold opacity-40 mt-1">Eliminaciones y ediciones autorizadas por el admin</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleDownloadPdf}
                disabled={loadingPdf}
                className="flex items-center gap-2 px-5 py-3 bg-primary/10 hover:bg-primary text-primary hover:text-on-primary rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all disabled:opacity-50"
              >
                {loadingPdf
                  ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  : <span className="material-symbols-outlined text-sm">picture_as_pdf</span>}
                Exportar PDF
              </button>

              <button
                onClick={handleLimpiarLogs}
                className="flex items-center gap-2 px-5 py-3 bg-error/10 hover:bg-error text-error hover:text-on-error rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all"
              >
                <span className="material-symbols-outlined text-sm">delete_sweep</span>
                Limpiar Todo
              </button>
            </div>
          </div>

          {loadingLogs ? (
            <div className="flex justify-center py-20">
              <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : logs.length === 0 ? (
            <div className="py-20 text-center opacity-20">
              <span className="material-symbols-outlined text-5xl mb-3">search_off</span>
              <p className="text-xs font-bold uppercase tracking-widest">Sin registros de auditoría</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto custom-scrollbar pr-2">
              {logs.map(log => (
                <div key={log.id} className="bg-background border border-white/5 rounded-2xl p-5 flex items-start gap-4 hover:border-white/10 transition-all">
                  <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase border flex-shrink-0 mt-0.5 ${accionColor(log.accion)}`}>
                    {log.accion}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-black text-primary uppercase">{log.entidad}</span>
                      {log.autorizado_por && (
                        <span className="text-[9px] bg-secondary/10 text-secondary px-2 py-0.5 rounded-full font-bold">
                          Auth: {log.autorizado_por}
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-medium text-on-surface leading-snug">{log.detalle}</p>
                    <p className="text-[9px] opacity-40 mt-1 font-mono">
                      {new Date(log.fecha).toLocaleString()} · {log.usuario}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL ACTIVAR LICENCIA */}
      {modalKey && (
        <div className="fixed inset-0 bg-background/90 backdrop-blur-3xl z-[500] flex items-center justify-center p-6 animate-in zoom-in-95 duration-300">
          <div className="bg-surface w-full max-w-md rounded-[3rem] p-12 border border-white/10 shadow-3xl">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 rounded-2xl bg-secondary/20 flex items-center justify-center">
                <span className="material-symbols-outlined text-secondary">key</span>
              </div>
              <div>
                <h2 className="text-2xl font-black">Activar <span className="text-secondary">Licencia</span></h2>
                <p className="text-[10px] uppercase font-bold opacity-40">Introduce la clave y tus credenciales</p>
              </div>
            </div>
            <form onSubmit={handleActivarKey} className="space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Clave de Licencia</label>
                <input
                  required
                  placeholder="DONBENI-XXXX-XXXX-XXXX-XXXX"
                  className="w-full bg-background border border-white/5 p-4 rounded-2xl text-xs font-mono outline-none focus:border-secondary/50 transition-all"
                  value={activarForm.clave}
                  onChange={e => setActivarForm({ ...activarForm, clave: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Tu Usuario</label>
                <input
                  required
                  className="w-full bg-background border border-white/5 p-4 rounded-2xl text-xs font-bold outline-none focus:border-secondary/50 transition-all"
                  value={activarForm.username}
                  onChange={e => setActivarForm({ ...activarForm, username: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Tu Contraseña</label>
                <input
                  type="password"
                  required
                  className="w-full bg-background border border-white/5 p-4 rounded-2xl text-xs font-mono outline-none focus:border-secondary/50 transition-all"
                  value={activarForm.password}
                  onChange={e => setActivarForm({ ...activarForm, password: e.target.value })}
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="submit" className="flex-1 bg-secondary text-on-secondary py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg hover:scale-105 transition-all">
                  Verificar y Activar
                </button>
                <button type="button" onClick={() => setModalKey(false)} className="px-6 py-4 font-black text-[10px] uppercase tracking-widest opacity-40 hover:opacity-100 transition-opacity">
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

export default Mantenimiento;
