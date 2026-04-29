import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";

const Usuarios = () => {
  const { user: currentUser } = useAuth();
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({ username: "", nombre: "", password: "", rol: "vendedor" });
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const fetchUsuarios = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await fetch("/api/usuarios/", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!response.ok) throw new Error("Acceso denegado");
      const data = await response.json();
      setUsuarios(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsuarios();
  }, []);

  const handleOpenModal = (user = null) => {
    if (user) {
      setEditando(user.id);
      setForm({ username: user.username, nombre: user.nombre || "", password: "", rol: user.rol });
    } else {
      setEditando(null);
      setForm({ username: "", nombre: "", password: "", rol: "vendedor" });
    }
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    const url = editando ? `/api/usuarios/${editando}` : "/api/usuarios/";
    const method = editando ? "PATCH" : "POST";

    const payload = { ...form };
    if (editando && !form.password) delete payload.password;

    try {
      const res = await fetch(url, {
        method,
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setModalOpen(false);
        fetchUsuarios();
      } else {
        const d = await res.json();
        alert(d.detail || "Error al procesar");
      }
    } catch (e) { alert("Error de conexión"); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("¿Deseas eliminar este usuario?")) return;
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`/api/usuarios/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) fetchUsuarios();
      else {
        const d = await res.json();
        alert(d.detail || "Error al eliminar");
      }
    } catch (e) { console.error(e); }
  };

  if (currentUser?.rol === "vendedor") return <div className="p-20 text-center font-black opacity-20 text-4xl">ACCESO RESTRINGIDO</div>;

  const totalPages = Math.ceil(usuarios.length / itemsPerPage) || 1;
  const currentItems = usuarios.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  return (
    <div className="p-10 space-y-12 animate-in fade-in duration-500 min-h-screen">
      
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-6xl font-black tracking-tighter mb-2 font-headline">
            Gestión de <span className="text-primary">Usuarios</span>
          </h1>
          <p className="text-on-surface-variant font-medium tracking-tight mb-4">Administración de credenciales y niveles de acceso.</p>
          {error && (
            <div className="bg-error/10 text-error px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 border border-error/20 inline-flex">
               <span className="material-symbols-outlined text-sm">error</span>
               {error}
            </div>
          )}
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="bg-primary text-on-primary px-8 py-5 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-3 hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-primary/30"
        >
          <span className="material-symbols-outlined text-sm">person_add</span>
          Nuevo Usuario
        </button>
      </div>

      {/* Tabla */}
      <div className="bg-surface rounded-[2.5rem] border border-white/5 shadow-2xl overflow-hidden p-10">
        <table className="w-full text-left">
          <thead>
            <tr className="text-[10px] uppercase font-black tracking-widest text-on-surface-variant/40 border-b border-white/5">
              <th className="pb-6">Nombre Real</th>
              <th className="pb-6">Usuario</th>
              <th className="pb-6">Rol / Nivel</th>
              <th className="pb-6 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {usuarios.length === 0 && !loading && !error && (
               <tr>
                 <td colSpan="3" className="py-20 text-center text-on-surface-variant/50">
                   No hay usuarios disponibles (o no tienes permiso para verlos).
                 </td>
               </tr>
            )}
            {currentItems.map(u => (
              <tr key={u.id} className="hover:bg-white/2 transition-colors">
                <td className="py-6">
                  <p className="font-bold text-on-surface">{u.nombre || <span className="italic text-on-surface-variant/40">Sin nombre</span>}</p>
                </td>
                <td className="py-6 font-mono text-xs text-on-surface-variant">{u.username}</td>
                <td className="py-6">
                  <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-tighter border ${
                    u.rol === 'admin' || u.rol === 'Admin' ? 'bg-primary/10 text-primary border-primary/20' : 
                    u.rol === 'dev' ? 'bg-secondary/10 text-secondary border-secondary/20' : 
                    'bg-white/5 text-on-surface-variant/60 border-white/10'
                  }`}>
                    {u.rol}
                  </span>
                </td>
                <td className="py-6 text-center">
                   <div className="flex justify-center gap-2">
                     <button onClick={() => handleOpenModal(u)} className="p-2 hover:bg-primary/20 hover:text-primary rounded-lg transition-all">
                       <span className="material-symbols-outlined text-sm">edit</span>
                     </button>
                     <button onClick={() => handleDelete(u.id)} className="p-2 hover:bg-error/20 hover:text-error rounded-lg transition-all">
                       <span className="material-symbols-outlined text-sm">delete</span>
                     </button>
                   </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Controles de Paginación */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center px-4">
          <p className="text-[10px] uppercase font-bold text-on-surface-variant/50 tracking-widest">
             Mostrando {((currentPage - 1) * itemsPerPage) + 1} a {Math.min(currentPage * itemsPerPage, usuarios.length)} de {usuarios.length} usuarios
          </p>
          <div className="flex items-center gap-2">
             <button disabled={currentPage === 1} onClick={() => goToPage(currentPage - 1)} className="p-2 rounded-lg bg-surface border border-white/5 disabled:opacity-30 hover:bg-white/5 transition-colors text-on-surface"><span className="material-symbols-outlined text-sm">chevron_left</span></button>
             <span className="text-xs font-bold font-mono px-4 text-on-surface">Página {currentPage} de {totalPages}</span>
             <button disabled={currentPage === totalPages} onClick={() => goToPage(currentPage + 1)} className="p-2 rounded-lg bg-surface border border-white/5 disabled:opacity-30 hover:bg-white/5 transition-colors text-on-surface"><span className="material-symbols-outlined text-sm">chevron_right</span></button>
          </div>
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-background/90 backdrop-blur-2xl z-[300] flex items-center justify-center p-6 animate-in zoom-in-95 duration-300">
          <div className="bg-surface w-full max-w-lg rounded-[3rem] p-12 border border-white/10 shadow-3xl">
            <h2 className="text-4xl font-black tracking-tighter mb-8">
              {editando ? "Editar" : "Nuevo"} <span className="text-primary">Usuario</span>
            </h2>
            <form onSubmit={handleSave} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Nombre Real del Empleado</label>
                <input required placeholder="Ej: Juan Pérez" className="w-full bg-background border border-white/5 p-5 rounded-2xl outline-none focus:border-primary/40 font-bold" value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Username (Acceso)</label>
                <input required className="w-full bg-background border border-white/5 p-5 rounded-2xl outline-none focus:border-primary/40 font-mono" value={form.username} onChange={e => setForm({...form, username: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Password {editando && "(vacío para no cambiar)"}</label>
                <input type="password" required={!editando} className="w-full bg-background border border-white/5 p-5 rounded-2xl outline-none focus:border-primary/40 font-mono" value={form.password} onChange={e => setForm({...form, password: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Rol del Sistema</label>
                <select className="w-full bg-background border border-white/5 p-5 rounded-2xl outline-none focus:border-primary/40 font-black uppercase text-xs tracking-widest" value={form.rol} onChange={e => setForm({...form, rol: e.target.value})}>
                   <option value="vendedor">Vendedor / Cajero</option>
                   <option value="admin">Administrador</option>
                   {currentUser?.rol === 'dev' && <option value="dev">Developer</option>}
                </select>
              </div>
              <div className="pt-8 flex gap-4">
                <button type="submit" className="flex-1 bg-primary text-on-primary py-5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl shadow-primary/20 hover:scale-105 transition-all">
                  Guardar Usuario
                </button>
                <button type="button" onClick={()=>setModalOpen(false)} className="px-8 font-black text-[10px] uppercase tracking-widest opacity-40 hover:opacity-100 transition-opacity">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Usuarios;
