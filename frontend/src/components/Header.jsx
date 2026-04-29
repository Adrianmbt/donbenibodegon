import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSearch } from '../context/SearchContext';
import { useTheme } from '../context/ThemeContext';

const Header = () => {
  const { user, logout } = useAuth();
  const { searchQuery, updateSearch } = useSearch();
  const { theme, resetBrandSelection } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [tasa, setTasa] = useState(457.07);
  const [showMenu, setShowMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  
  // Estado para notificaciones
  const [notifications, setNotifications] = useState([]);
  
  const notificationsRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    fetch("/api/bcv/tasa")
      .then(res => res.json())
      .then(data => {
        if (data?.rate) setTasa(data.rate);
      })
      .catch(err => console.error("Error al obtener tasa:", err));
  }, []);

  // --- Helpers de notificaciones descartadas (localStorage con TTL de 24h) ---
  const DISMISSED_KEY = 'donbeni_dismissed_notifs';

  const getDismissed = () => {
    try {
      const raw = localStorage.getItem(DISMISSED_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
  };

  const saveDismissed = (dismissed) => {
    localStorage.setItem(DISMISSED_KEY, JSON.stringify(dismissed));
  };

  const cleanupExpired = (dismissed) => {
    const now = Date.now();
    const DAY = 24 * 60 * 60 * 1000;
    const cleaned = Object.fromEntries(
      Object.entries(dismissed).filter(([, ts]) => now - ts < DAY)
    );
    saveDismissed(cleaned);
    return cleaned;
  };

  const isDismissed = (id) => {
    const dismissed = cleanupExpired(getDismissed());
    return !!dismissed[id];
  };

  const dismissNotification = (id) => {
    const dismissed = getDismissed();
    dismissed[id] = Date.now();
    saveDismissed(dismissed);
  };
  // --------------------------------------------------------------------------

  const [tienda, setTienda] = useState(null);

  useEffect(() => {
    if (user?.tienda_id) {
      fetch(`/api/tiendas/${user.tienda_id}`, {
        headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
      })
        .then(res => res.json())
        .then(data => {
          if (!data.detail) setTienda(data);
        })
        .catch(err => console.error("Error al obtener tienda:", err));
    }
  }, [user]);

  // Polling para obtener notificaciones de stock crítico (cada 30s)
  useEffect(() => {
    const checkNotifications = async () => {
      try {
        const res = await fetch("/api/inventario/productos", {
          headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
        });
        const items = await res.json();
        
        if (!Array.isArray(items)) {
           console.error("Notificaciones: La respuesta no es un array", items);
           return;
        }

        // Filtrar productos con stock crítico y no descartados
        const criticalItems = items
          .filter(p => p.stock <= p.stock_minimo && !isDismissed(`stock-${p.id}`))
          .map(p => ({
            id: `stock-${p.id}`,
            type: 'critical',
            title: 'Stock Crítico',
            message: `El producto "${p.producto?.nombre}" tiene solo ${p.stock} unidades.`,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            link: '/inventario?filter=critical'
          }));

        setNotifications(prev => {
          const validPrev = prev.filter(n => !isDismissed(n.id));
          const existingIds = new Set(validPrev.map(n => n.id));
          const newOnes = criticalItems.filter(n => !existingIds.has(n.id));
          return [...newOnes, ...validPrev];
        });
      } catch (e) { console.error(e); }
    };

    if (user) {
      checkNotifications();
      const interval = setInterval(checkNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const handleSearchChange = (e) => {
    const query = e.target.value;
    updateSearch(query);
    if (query.trim() !== "" && location.pathname !== '/inventario' && location.pathname !== '/ventas') {
      navigate('/inventario');
    }
  };

  // Marcar como leída: elimina del estado Y guarda en localStorage por 24h
  const markAsRead = (id) => {
    dismissNotification(id);
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  // Limpiar todo: descarta todas las notificaciones actuales por 24h
  const clearAllNotifications = () => {
    notifications.forEach(n => dismissNotification(n.id));
    setNotifications([]);
  };

  const unreadCount = notifications.length;

  return (
    <header className="fixed top-0 right-0 w-[calc(100%-16rem)] h-16 bg-surface/80 backdrop-blur-xl dark:bg-surface/80 flex justify-between items-center px-10 border-b border-outline-variant/15 z-40">
      <div className="flex items-center gap-8">
        {tienda && (
          <div className="flex flex-col border-r border-outline-variant/20 pr-6">
            <span className="text-[10px] text-primary tracking-widest font-black uppercase">{tienda.nombre}</span>
            <span className="text-[8px] text-on-surface-variant/40 uppercase tracking-tighter">Sede Activa</span>
          </div>
        )}
        <div className="relative flex items-center bg-surface-container-low rounded-full px-5 py-2.5 border border-outline-variant/30 transition-all focus-within:border-primary/50 focus-within:ring-4 focus-within:ring-primary/10 group shadow-sm">
          <span className="material-symbols-outlined text-on-surface-variant/40 text-sm group-focus-within:text-primary transition-colors">search</span>
          <input 
            className="bg-transparent border-none focus:ring-0 focus:outline-none text-[10px] uppercase tracking-widest text-on-surface w-72 pl-3 placeholder:text-on-surface-variant/30 font-bold" 
            placeholder="BUSCAR PRODUCTOS, VENTAS..." 
            type="text" 
            value={searchQuery}
            onChange={handleSearchChange}
          />
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="flex flex-col items-end border-r border-outline-variant/20 pr-6">
          <span className="text-[10px] text-primary tracking-widest font-black uppercase">Tasa BCV: {tasa.toFixed(2)} Bs</span>
          <span className="text-[8px] text-on-surface-variant/40 uppercase tracking-tighter">Sincronizado</span>
        </div>

        <div className="flex gap-4 border-outline-variant/20 pr-6 text-on-surface-variant/70 relative">
          <div className="relative cursor-pointer group" onClick={() => setShowNotifications(!showNotifications)} ref={notificationsRef}>
            <span className={`material-symbols-outlined transition-all hover:scale-110 active:scale-90 ${showNotifications ? 'text-primary' : 'hover:text-secondary'}`} style={{ fontVariationSettings: "'FILL' 0" }}>notifications</span>
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-error text-on-error text-[8px] font-black rounded-full flex items-center justify-center animate-bounce shadow-lg shadow-error/20 border-2 border-surface">
                {unreadCount}
              </span>
            )}
            
            {/* NOTIFICATIONS DROPDOWN */}
            {showNotifications && (
              <div className="absolute top-full right-0 mt-4 w-80 bg-surface/95 backdrop-blur-3xl border border-white/10 rounded-[2rem] p-6 shadow-3xl z-10 animate-dropdown-in origin-top-right overflow-hidden" onClick={e => e.stopPropagation()}>
                    <div className="flex justify-between items-center mb-6">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">Notificaciones</p>
                      {unreadCount > 0 && (
                        <button onClick={clearAllNotifications} className="text-[8px] font-black uppercase text-primary hover:underline">Limpiar Todo</button>
                      )}
                    </div>
                    
                    <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar pr-2">
                      {notifications.length === 0 ? (
                        <div className="py-10 text-center opacity-20">
                          <span className="material-symbols-outlined text-4xl mb-2">notifications_off</span>
                          <p className="text-[10px] font-bold uppercase tracking-widest">Sin novedades</p>
                        </div>
                      ) : (
                        notifications.map(n => (
                          <div key={n.id} className="bg-white/5 border border-white/5 p-4 rounded-2xl group/notif hover:border-primary/20 transition-all">
                             <div className="flex justify-between items-start mb-1">
                                <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${n.type === 'critical' ? 'bg-error/10 text-error' : 'bg-primary/10 text-primary'}`}>
                                  {n.title}
                                </span>
                                <span className="text-[8px] font-bold text-on-surface-variant/30">{n.time}</span>
                             </div>
                             <p className="text-[11px] font-bold text-on-surface leading-tight mb-3">
                               {n.message}
                             </p>
                             <div className="flex gap-2">
                               <button 
                                 onClick={() => { navigate(n.link); setShowNotifications(false); }}
                                 className="flex-1 bg-primary/10 hover:bg-primary text-primary hover:text-on-primary text-[8px] font-black uppercase py-2 rounded-lg transition-all"
                               >
                                 Ver Detalle
                               </button>
                               <button 
                                 onClick={() => markAsRead(n.id)}
                                 className="px-3 bg-white/5 hover:bg-error/10 text-on-surface-variant hover:text-error text-[8px] font-black uppercase py-2 rounded-lg transition-all"
                               >
                                 Marcar como leído
                               </button>
                             </div>
                          </div>
                        ))
                      )}
                    </div>
                </div>
            )}
          </div>
        </div>
        
        <div className="relative" ref={menuRef}>
           <div 
             onClick={() => setShowMenu(!showMenu)}
             className={`flex items-center gap-3 bg-white/5 pl-4 pr-1.5 py-1.5 rounded-2xl group border cursor-pointer transition-all duration-300 ${showMenu ? 'border-primary/40 bg-primary/10 shadow-lg shadow-primary/5' : 'border-white/5 hover:border-primary/20 hover:bg-white/10'}`}
           >
             <div className="text-right">
                <p className="text-[10px] font-black uppercase tracking-tighter text-on-surface">{user?.username || 'Invitado'}</p>
                <p className="text-[8px] font-bold text-primary opacity-60 uppercase tracking-widest">{user?.rol}</p>
             </div>
             <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary to-primary-container flex items-center justify-center text-xs font-black text-on-primary shadow-xl shadow-primary/20 transition-all group-hover:scale-105 active:scale-95">
               {user?.username?.substring(0, 2).toUpperCase() || 'DB'}
             </div>
           </div>

           {/* DROPDOWN MENU */}
           {showMenu && (
             <div className="absolute top-full right-0 mt-4 w-52 bg-surface/95 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-5 shadow-3xl z-10 animate-dropdown-in origin-top-right">
                  <div className="mb-5 pb-5 border-b border-white/5">
                     <p className="text-[9px] font-black uppercase tracking-[0.3em] opacity-30 mb-2">Sesión activa</p>
                     <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
                        <p className="text-xs font-black text-on-surface truncate">{user?.username || 'Usuario'}</p>
                     </div>
                  </div>
                  
                  <div className="space-y-1">
                    <button className="w-full flex items-center justify-between p-3.5 rounded-2xl hover:bg-white/5 text-on-surface-variant hover:text-on-surface transition-all group/item">
                       <span className="text-[10px] font-black uppercase tracking-widest text-left">Mi Perfil</span>
                       <span className="material-symbols-outlined text-sm group-hover/item:rotate-12 transition-transform">person</span>
                    </button>
                    {(user?.rol === 'dev' || user?.rol === 'propietario') && (
                      <button 
                        onClick={resetBrandSelection}
                        className="w-full flex items-center justify-between p-3.5 rounded-2xl hover:bg-primary/10 text-primary transition-all group/item"
                      >
                         <span className="text-[10px] font-black uppercase tracking-widest">Cambiar Sede</span>
                         <span className="material-symbols-outlined text-sm group-hover/item:rotate-180 transition-transform">sync</span>
                      </button>
                    )}
                    <button 
                      onClick={() => { resetBrandSelection(); logout(); }}
                      className="w-full flex items-center justify-between p-3.5 rounded-2xl hover:bg-error/10 text-error transition-all group/item"
                    >
                       <span className="text-[10px] font-black uppercase tracking-widest">Cerrar Sesión</span>
                       <span className="material-symbols-outlined text-sm group-hover/item:translate-x-1 transition-transform">logout</span>
                    </button>
                  </div>
               </div>
           )}
        </div>
      </div>
    </header>
  );
};

export default Header;
