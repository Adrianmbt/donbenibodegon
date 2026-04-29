import React from 'react';
import { useTheme } from '../context/ThemeContext';

const BrandSelector = () => {
  const { selectBrand } = useTheme();

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#05070a] p-6 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/10 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-emerald-500/10 blur-[120px] rounded-full"></div>
      </div>

      <div className="relative z-10 w-full max-w-4xl text-center">
        <h1 className="text-4xl md:text-5xl font-black text-white mb-4 tracking-tighter uppercase">
          Selecciona la <span className="text-primary">Administración</span>
        </h1>
        <p className="text-on-surface-variant font-medium mb-12 tracking-tight">Elige el sistema de gestión para operar hoy.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Opción Bodegón */}
          <div 
            onClick={() => selectBrand('bodegon')}
            className="group relative bg-surface/40 backdrop-blur-xl border border-white/10 rounded-[3rem] p-10 cursor-pointer hover:border-primary/50 transition-all duration-500 hover:scale-[1.02] shadow-2xl overflow-hidden"
          >
            <div className="absolute -right-10 -top-10 opacity-5 group-hover:opacity-10 transition-opacity">
              <span className="material-symbols-outlined text-[15rem] text-primary">liquor</span>
            </div>
            
            <div className="w-24 h-24 bg-background border-2 border-primary/40 rounded-full mx-auto mb-8 flex items-center justify-center overflow-hidden shadow-2xl shadow-primary/20 group-hover:scale-110 transition-transform">
              <img src="/logo.jpg" alt="Bodegón Logo" className="w-full h-full object-cover" />
            </div>
            
            <h2 className="text-2xl font-black text-white mb-2 uppercase tracking-tighter">Don Beni Bodegón</h2>
            <p className="text-[9px] font-black uppercase tracking-[0.4em] text-primary mb-6">Bodegón de Calidad</p>
            <p className="text-xs text-on-surface-variant leading-relaxed mb-8 px-6">Accede a la gestión de licores premium, inventario de importación y ventas especializadas.</p>
            
            <button className="w-full py-4 bg-primary text-on-primary rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-primary/20">
              Entrar al Bodegón
            </button>
          </div>

          {/* Opción Minimarket */}
          <div 
            onClick={() => selectBrand('minimarket')}
            className="group relative bg-[#1B1E1B] border border-[#2D332D] rounded-[3rem] p-10 cursor-pointer hover:border-[#8DA38A]/50 transition-all duration-500 hover:scale-[1.02] shadow-2xl overflow-hidden"
          >
            <div className="absolute -right-10 -top-10 opacity-5 group-hover:opacity-10 transition-opacity">
              <span className="material-symbols-outlined text-[15rem] text-[#8DA38A]">eco</span>
            </div>
            
            <div className="w-24 h-24 bg-black/40 border-2 border-[#8DA38A]/40 rounded-full mx-auto mb-8 flex items-center justify-center overflow-hidden shadow-2xl shadow-[#8DA38A]/20 group-hover:scale-110 transition-transform">
              <img src="/logo_minimarket.png" alt="Minimarket Logo" className="w-full h-full object-cover" />
            </div>
            
            <h2 className="text-2xl font-black text-[#E1E3DF] mb-2 uppercase tracking-tighter">Don Beni Minimarket</h2>
            <p className="text-[9px] font-black uppercase tracking-[0.4em] text-[#8DA38A] mb-6">Equilibrio y Naturaleza</p>
            <p className="text-xs text-[#8E928A] leading-relaxed mb-8 px-6">Gestión profesional de víveres y productos frescos en un entorno visualmente equilibrado y moderno.</p>
            
            <button className="w-full py-4 bg-[#8DA38A] text-[#121412] rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-[#8DA38A]/20">
              Entrar al Minimarket
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BrandSelector;
