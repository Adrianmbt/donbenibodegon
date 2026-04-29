import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(localStorage.getItem('donbeni_theme') || 'bodegon');
  const [brandSelected, setBrandSelected] = useState(localStorage.getItem('donbeni_brand_selected') === 'true');

  useEffect(() => {
    localStorage.setItem('donbeni_theme', theme);
    if (theme === 'minimarket') {
      document.body.classList.add('theme-minimarket');
    } else {
      document.body.classList.remove('theme-minimarket');
    }
  }, [theme]);

  const toggleTheme = () => {
    const newTheme = theme === 'bodegon' ? 'minimarket' : 'bodegon';
    setTheme(newTheme);
  };

  const selectBrand = async (newTheme) => {
    const tiendaId = newTheme === 'bodegon' ? 1 : 2;
    const token = localStorage.getItem('token');
    
    try {
      const res = await fetch(`/api/tiendas/switch/${tiendaId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('token', data.access_token);
        setTheme(newTheme);
        setBrandSelected(true);
        localStorage.setItem('donbeni_brand_selected', 'true');
        window.location.reload(); 
      }
    } catch (e) { 
      console.error("Error switching store:", e);
      // Fallback si falla el backend (ej: servidor offline)
      setTheme(newTheme);
      setBrandSelected(true);
      localStorage.setItem('donbeni_brand_selected', 'true');
    }
  };

  const resetBrandSelection = () => {
    setBrandSelected(false);
    localStorage.removeItem('donbeni_brand_selected');
  };

  const getLogo = () => {
    return theme === 'bodegon' ? '/logo.jpg' : '/logo_minimarket.png';
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, brandSelected, selectBrand, resetBrandSelection, getLogo }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
