import React, { useState } from 'react';

// Se importarán los componentes correspondientes a cada ruta de tu API (FastAPI)
// import Dashboard from './components/Dashboard';
// import PuntoDeVenta from './components/PuntoDeVenta'; // ventas.py
// import InventarioStitch from './InventarioStitch'; // inventario.py
// import Compras from './components/Compras'; // compras.py
// import Proveedores from './components/Proveedores'; // proveedores.py
// import Finanzas from './components/Finanzas'; // finanzas.py
// import Usuarios from './components/Usuarios'; // usuarios.py

const AppLayout = () => {
  // Estado para manejar el enrutamiento interno
  const [vistaActual, setVistaActual] = useState('inventario');

  // Función auxiliar para renderizar el color activo en el Sidebar
  const linkClass = (menuItem) => {
    const isActive = vistaActual === menuItem;
    return isActive 
      ? "flex items-center gap-4 py-3 text-[#e5e2e1] font-semibold border-l-2 border-[#6ee591] pl-4 bg-[#6ee591]/10 rounded-r-lg cursor-pointer transition-all"
      : "flex items-center gap-4 py-3 text-[#e5e2e1]/60 font-medium pl-4 hover:text-[#6ee591] cursor-pointer transition-colors duration-200";
  };

  // Función para renderizar el componente actual basado en la vista activa
  const renderizarVista = () => {
    switch (vistaActual) {
      case 'dashboard':
        return <div className="p-10 text-xl font-bold">Módulo de Dashboard (En desarrollo...)</div>;
      case 'pos':
        return <div className="p-10 text-xl font-bold">Módulo de Punto de Venta (Ventas)</div>;
      case 'inventario':
        // Aquí debes renderizar tu componente de InventarioStitch real,
        // modificándolo previamente para que solo exporte el <main>...</main> (sin Header y Sidebar)
        // Ejemplo: return <InventarioStitch />;
        return (
            <div className="p-10 text-xl font-bold">Módulo de Inventario <br/><span className="text-sm font-normal text-gray-400">Inserta aquí el componente InventarioStitch ajustado.</span></div>
        );
      case 'compras':
        return <div className="p-10 text-xl font-bold">Módulo de Compras</div>;
      case 'proveedores':
        return <div className="p-10 text-xl font-bold">Módulo de Proveedores</div>;
      case 'finanzas':
        return <div className="p-10 text-xl font-bold">Módulo de Finanzas y Reportes</div>;
      case 'usuarios':
        return <div className="p-10 text-xl font-bold">Módulo de Usuarios y Configuración</div>;
      default:
        return <div className="p-10 text-xl font-bold">Vista no encontrada</div>;
    }
  };

  return (
    <div className="bg-[#131313] text-[#e5e2e1] selection:bg-[#50c878] selection:text-[#005025] font-['Manrope',_sans-serif] min-h-screen flex">
      
      {/* 1. SideNavBar Anchor (Header/Sidebar Nativo) */}
      <aside className="h-screen w-64 fixed left-0 top-0 flex flex-col py-8 bg-[#1c1b1b] dark:bg-[#1c1b1b] font-manrope text-sm tracking-tight z-50 shadow-2xl">
        <div className="px-8 mb-12">
          <div className="flex items-center gap-3 mb-1">
            <span className="text-2xl font-bold tracking-tighter text-[#e5e2e1]">Don Beni</span>
          </div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#e5e2e1]/40">Sistema de Gestión v3.0</p>
        </div>

        <nav className="flex-1 space-y-1">
          <div className="pr-4">
            <div className={linkClass('dashboard')} onClick={() => setVistaActual('dashboard')}>
              <span className="material-symbols-outlined text-lg" data-icon="dashboard">dashboard</span>
              <span>Dashboard</span>
            </div>
          </div>
          <div className="pr-4">
            <div className={linkClass('pos')} onClick={() => setVistaActual('pos')}>
              <span className="material-symbols-outlined text-lg" data-icon="point_of_sale">point_of_sale</span>
              <span>Punto de Venta</span>
            </div>
          </div>
          <div className="pr-4">
            <div className={linkClass('inventario')} onClick={() => setVistaActual('inventario')}>
              <span className="material-symbols-outlined text-lg" data-icon="inventory_2">inventory_2</span>
              <span>Inventario</span>
            </div>
          </div>
          <div className="pr-4">
            <div className={linkClass('compras')} onClick={() => setVistaActual('compras')}>
              <span className="material-symbols-outlined text-lg" data-icon="shopping_cart">shopping_cart</span>
              <span>Compras</span>
            </div>
          </div>
          <div className="pr-4">
            <div className={linkClass('proveedores')} onClick={() => setVistaActual('proveedores')}>
              <span className="material-symbols-outlined text-lg" data-icon="local_shipping">local_shipping</span>
              <span>Proveedores</span>
            </div>
          </div>
          <div className="pr-4">
            <div className={linkClass('finanzas')} onClick={() => setVistaActual('finanzas')}>
              <span className="material-symbols-outlined text-lg" data-icon="analytics">analytics</span>
              <span>Finanzas</span>
            </div>
          </div>
        </nav>

        <div className="mt-auto px-4 space-y-1 pt-8 border-t border-[#3e4a3f]/10">
          <button className="w-full flex items-center justify-center gap-2 py-3 mb-6 bg-[#50c878] text-[#003919] font-bold rounded hover:bg-[#6ee591] active:scale-95 transition-all text-xs uppercase tracking-widest shadow-lg shadow-[#50c878]/20">
            <span className="material-symbols-outlined text-sm" data-icon="add">add</span>
            Nueva Venta
          </button>
          
          <div className={linkClass('usuarios')} onClick={() => setVistaActual('usuarios')}>
            <span className="material-symbols-outlined text-lg" data-icon="settings">settings</span>
            <span>Ajustes / Usuarios</span>
          </div>
        </div>
      </aside>

      {/* 2. TopNavBar Anchor */}
      <header className="fixed top-0 right-0 w-[calc(100%-16rem)] h-16 bg-[#131313]/80 backdrop-blur-xl dark:bg-[#131313]/80 flex justify-between items-center px-10 border-b border-[#3e4a3f]/15 z-40">
        <div className="flex items-center gap-8">
          <div className="relative flex items-center bg-[#1c1b1b] rounded-full px-4 py-2 border border-[#3e4a3f]/30">
            <span className="material-symbols-outlined text-[#e5e2e1]/40 text-sm" data-icon="search">search</span>
            <input className="bg-transparent border-none focus:ring-0 focus:outline-none text-[10px] uppercase tracking-widest text-[#e5e2e1] w-64 pl-3 placeholder:text-[#e5e2e1]/30" placeholder="BUSCAR PRODUCTOS, VENTAS..." type="text"/>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex flex-col items-end">
            <span className="text-[10px] text-[#6ee591] tracking-widest font-bold">Tasa BCV: 36.50 Bs</span>
            <span className="text-[8px] text-[#e5e2e1]/40 uppercase tracking-tighter">Sincronizado</span>
          </div>
          <div className="flex gap-4 border-l border-[#3e4a3f]/20 pl-6 text-[#e5e2e1]/70">
            <span className="material-symbols-outlined cursor-pointer hover:text-[#e9c349] transition-colors" data-icon="notifications">notifications</span>
            <span className="material-symbols-outlined cursor-pointer hover:text-[#e9c349] transition-colors" data-icon="account_balance_wallet">account_balance_wallet</span>
          </div>
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#6ee591] to-[#005025] flex items-center justify-center text-xs font-bold text-white shadow-xl shadow-[#6ee591]/20 cursor-pointer">
            AD
          </div>
        </div>
      </header>

      {/* 3. Main Content Area Dinámico */}
      <main className="ml-64 pt-16 w-full min-h-screen">
        {/* Aquí se inyectan los diferentes módulos dependiendo del estado "vistaActual" */}
        {renderizarVista()}
      </main>

    </div>
  );
};

export default AppLayout;
