import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";

const Login = () => {
  const { login } = useAuth();
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new URLSearchParams();
    formData.append("username", form.username);
    formData.append("password", form.password);

    try {
      const response = await fetch("/api/usuarios/login", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: formData,
      });

      if (!response.ok) throw new Error("Credenciales inválidas");

      const data = await response.json();
      localStorage.setItem("token", data.access_token);
      const parts = data.access_token.split('.');
      const payload = JSON.parse(atob(parts[1]));
      login({ username: payload.sub, rol: payload.rol });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full relative flex items-center justify-center p-4 overflow-hidden bg-[#05070a]">
      {/* Background Animado Interactivo (CSS-based) */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/20 blur-[120px] rounded-full animate-pulse pointer-events-none"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-secondary/10 blur-[120px] rounded-full animate-pulse pointer-events-none delay-1000"></div>
        <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] bg-primary/10 blur-[100px] rounded-full animate-bounce duration-[10s] pointer-events-none"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.8)_100%)]"></div>
      </div>

      <div className="relative z-10 w-full max-w-[420px] animate-in zoom-in-95 duration-700 ease-out">
        <div className="bg-surface/40 backdrop-blur-2xl rounded-[3rem] p-10 md:p-14 border border-white/10 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)]">
          
          <div className="text-center mb-10">
            <div className="w-20 h-20 bg-background border-2 border-primary/40 rounded-full mx-auto mb-6 flex items-center justify-center overflow-hidden shadow-2xl shadow-primary/20">
              <img src="/logo.jpg" alt="Logo" className="w-full h-full object-cover" />
            </div>
            <h1 className="text-3xl font-black tracking-tighter text-white mb-1">DON BENI</h1>
            <p className="text-[9px] font-black uppercase tracking-[0.4em] text-primary">Bodegón de Calidad</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-error/20 text-error p-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-error/30 text-center animate-shake">
                {error}
              </div>
            )}
            
            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase tracking-[0.2em] text-white/50 ml-4">Nombre de Usuario</label>
              <input 
                required
                className="w-full bg-black/40 border border-white/10 p-5 rounded-2xl outline-none focus:border-primary/60 text-white font-bold text-sm transition-all focus:bg-black/60 placeholder:text-white/20" 
                placeholder="Ingresa tu usuario"
                value={form.username}
                onChange={e => setForm({...form, username: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase tracking-[0.2em] text-white/50 ml-4">Contraseña Segura</label>
              <input 
                type="password"
                required
                className="w-full bg-black/40 border border-white/10 p-5 rounded-2xl outline-none focus:border-primary/60 text-white font-mono text-sm transition-all focus:bg-black/60 placeholder:text-white/20" 
                placeholder="••••••••"
                value={form.password}
                onChange={e => setForm({...form, password: e.target.value})}
              />
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-primary text-on-primary py-6 rounded-2xl font-black text-[11px] uppercase tracking-[0.3em] shadow-xl shadow-primary/30 hover:shadow-primary/50 hover:scale-[1.02] active:scale-[0.98] transition-all mt-6"
            >
              {loading ? "Verificando..." : "Entrar al Sistema"}
            </button>
          </form>

          <div className="mt-12 pt-8 border-t border-white/5 text-center">
            <p className="text-[8px] font-black text-white/20 uppercase tracking-[0.3em]">
              Gestión Integral v1.0 &bull; 2026
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
