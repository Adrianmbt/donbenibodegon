import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const SidebarLink = ({ to, icon, label }) => {
  const location = useLocation();
  const basePath = to.split('?')[0];
  const isActive = location.pathname === basePath || (basePath !== '/' && location.pathname.startsWith(basePath));

  return (
    <div className="pr-4">
      <Link to={to} className={isActive 
        ? "flex items-center gap-4 py-3 text-on-surface font-semibold border-l-2 border-primary pl-4 bg-primary/10 rounded-r-lg cursor-pointer transition-all"
        : "flex items-center gap-4 py-3 text-on-surface-variant/60 font-medium pl-4 hover:text-primary cursor-pointer transition-colors duration-200"
      }>
        <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 0" }}>{icon}</span>
        <span className="truncate">{label}</span>
      </Link>
    </div>
  );
};

const Sidebar = () => {
  const { user } = useAuth();
  const isAdmin = user?.rol === 'admin' || user?.rol === 'dev';
  const isDev = user?.rol === 'dev';

  return (
    <aside className="h-screen w-64 fixed left-0 top-0 flex flex-col py-8 bg-surface dark:bg-surface font-headline text-sm tracking-tight z-50 shadow-2xl border-r border-white/5">
      <div className="px-8 mb-12 flex flex-col items-center">
        <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-primary shadow-lg shadow-primary/20 mb-4 bg-background">
          <img src="/logo.jpg" alt="Don Beni Logo" className="w-full h-full object-cover" />
        </div>
        <div className="text-center">
          <span className="text-xl font-black tracking-tighter text-on-surface">DON BENI</span>
          <p className="text-[8px] uppercase tracking-[0.3em] text-primary font-bold">Bodegón de Calidad</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1">
        {isAdmin && <SidebarLink to="/" icon="dashboard" label="Dashboard" />}
        <SidebarLink to="/ventas?view=list" icon="point_of_sale" label="Punto de Venta" />
        <SidebarLink to="/compras" icon="shopping_cart" label="Compras" />
        <SidebarLink to="/inventario" icon="inventory_2" label="Inventario" />
        <SidebarLink to="/proveedores" icon="local_shipping" label="Proveedores" />
        {isAdmin && <SidebarLink to="/finanzas" icon="analytics" label="Finanzas" />}
        {isDev && <SidebarLink to="/mantenimiento" icon="build" label="Mantenimiento" />}
      </nav>

      <div className="mt-auto px-4 space-y-1 pt-8 border-t border-outline-variant/10">
        <Link to="/ventas?view=pos" className="w-full flex items-center justify-center gap-2 py-3 mb-6 bg-primary text-on-primary font-bold rounded-xl hover:bg-primary-container active:scale-95 transition-all text-xs uppercase tracking-widest shadow-lg shadow-primary/20">
          <span className="material-symbols-outlined text-sm">add</span>
          Nueva Venta
        </Link>
        
        {isAdmin && <SidebarLink to="/usuarios" icon="settings" label="Ajustes / Usuarios" />}
      </div>
    </aside>
  );
};

export default Sidebar;
