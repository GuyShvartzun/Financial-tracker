import React, { createContext, useContext } from 'react';

export const PrivacyContext = createContext({
  isPrivacyMode: false,
  setIsPrivacyMode: () => {}
});

export const usePrivacy = () => useContext(PrivacyContext);
