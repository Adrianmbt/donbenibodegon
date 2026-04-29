import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// Componentes Globales
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import { AuthProvider } from './context/AuthContext';
import { SearchProvider } from './context/SearchContext';
import { ThemeProvider } from './context/ThemeContext';

// Vistas
import Dashboard from './views/Dashboard';
import Ventas from './views/Ventas';
import Compras from './views/Compras';
import Inventario from './views/Inventario';
import Proveedores from './views/Proveedores';
import Finanzas from './views/Finanzas';
import Usuarios from './views/Usuarios';
import Mantenimiento from './views/Mantenimiento';
import Login from './views/Login';
import BrandSelector from './views/BrandSelector';
import { useAuth } from './context/AuthContext';
import { useTheme } from './context/ThemeContext';
import { Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';

// ── Guarda de licencia: bloquea admin/vendedor si no hay licencia activa ──────
const LicenseGate = ({ children }) => {
  const { user, logout } = useAuth();
  const { resetBrandSelection } = useTheme();
  const [licStatus, setLicStatus] = useState(null); // null=cargando, true=ok, false=bloqueado
  const [licInfo, setLicInfo] = useState(null);

  useEffect(() => {
    if (user?.rol === 'dev') { setLicStatus(true); return; } // dev siempre pasa
    const token = localStorage.getItem('token');
    fetch('/api/dev/licencia/verificar', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(data => {
        setLicInfo(data);
        setLicStatus(data.valida === true);
      })
      .catch(() => setLicStatus(true)); // si falla el check, no bloquear (fail-open)
  }, [user]);

  if (licStatus === null)
    return <div className="min-h-screen bg-background flex items-center justify-center font-black animate-pulse opacity-20">VERIFICANDO LICENCIA...</div>;

  if (licStatus === false) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-8">
        <div className="max-w-md w-full text-center">
          {/* Icono */}
          <div className="w-24 h-24 rounded-full bg-error/10 border border-error/20 flex items-center justify-center mx-auto mb-8">
            <span className="material-symbols-outlined text-5xl text-error">gpp_bad</span>
          </div>
          {/* Título */}
          <h1 className="text-4xl font-black tracking-tighter text-error mb-3">
            Licencia Vencida
          </h1>
          <p className="text-on-surface-variant font-medium mb-2">
            El acceso al sistema ha sido suspendido.
          </p>
          <p className="text-xs uppercase font-black tracking-[0.2em] opacity-30 mb-10">
            {licInfo?.motivo === 'sin_licencia' ? 'Sin licencia activa registrada' : `Licencia expiró el ${licInfo?.expires || ''}`}
          </p>
          {/* Card de acción */}
          <div className="bg-surface border border-white/5 rounded-3xl p-8 text-left mb-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="material-symbols-outlined text-secondary">info</span>
              <p className="text-xs font-black uppercase tracking-widest text-secondary">¿Qué hacer?</p>
            </div>
            <p className="text-sm text-on-surface-variant leading-relaxed">
              Contacta a tu administrador de sistema para obtener una nueva clave de licencia e ingrésala en el sistema para renovar el acceso.
            </p>
          </div>
          <button
            onClick={() => { resetBrandSelection(); logout(); }}
            className="w-full py-4 rounded-2xl bg-error/10 hover:bg-error text-error hover:text-on-error font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-sm">logout</span>
            Cerrar Sesión
          </button>
        </div>
      </div>
    );
  }

  return children;
};

// ── Guarda de ruta: solo rol 'dev' puede acceder ───────────────────────────────
const DevOnly = ({ children }) => {
  const { user } = useAuth();
  if (user?.rol !== 'dev') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 select-none">
        <span className="material-symbols-outlined text-[8rem] text-error/20">lock</span>
        <div className="text-center">
          <h2 className="text-4xl font-black tracking-tighter opacity-20">Acceso Restringido</h2>
          <p className="text-xs uppercase font-bold tracking-widest opacity-20 mt-2">Esta sección es exclusiva del desarrollador</p>
        </div>
        <Navigate to="/" replace />
      </div>
    );
  }
  return children;
};


const AppLayout = () => {
  const { user, loading } = useAuth();
  const { brandSelected } = useTheme();
  
  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center font-black animate-pulse opacity-20">INICIANDO SISTEMA...</div>;
  if (!user) return <Login />;

  // Si es dev y no ha seleccionado marca, mostrar el selector
  if (user.rol === 'dev' && !brandSelected) return <BrandSelector />;

  return (
    <LicenseGate>
    <div className="bg-background text-on-surface selection:bg-primary-container selection:text-on-primary-container font-body min-h-screen flex overflow-hidden">
      
      {/* 1. Sidebar Componentizado */}
      <Sidebar />

      <div className="flex-1 flex flex-col min-h-screen ml-64 overflow-hidden">
        {/* 2. Header Componentizado */}
        <Header />

        {/* 3. Main Content Area Dinámico mediante Route */}
        <main className="flex-1 pt-16 w-full relative overflow-y-auto custom-scrollbar">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/ventas" element={<Ventas />} />
            <Route path="/compras" element={<Compras />} />
            <Route path="/inventario" element={<Inventario />} />
            <Route path="/proveedores" element={<Proveedores />} />
            <Route path="/finanzas" element={<Finanzas />} />
            <Route path="/usuarios" element={<Usuarios />} />
            <Route path="/mantenimiento" element={<DevOnly><Mantenimiento /></DevOnly>} />
          </Routes>
        </main>
      </div>

    </div>
    </LicenseGate>
  );
};

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <ThemeProvider>
          <SearchProvider>
            <AppLayout />
          </SearchProvider>
        </ThemeProvider>
      </AuthProvider>
    </Router>
  );
}
