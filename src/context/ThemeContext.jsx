import React, { createContext, useContext } from 'react';

export const ThemeContext = createContext({
  isDarkMode: false,
  setIsDarkMode: () => {},
  toggleDarkMode: () => {}
});

export const useTheme = () => useContext(ThemeContext);
