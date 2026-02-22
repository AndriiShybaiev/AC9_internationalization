import React, { createContext, useState, type ReactNode } from 'react';
import esMessages from '../lang/es.json';
import enMessages from '../lang/en.json';

interface LanguageContextProps {
  locale: string;
  messages: Record<string, string>;
  changeLanguage: (lang: string) => void;
}

const messagesMap: { [key: string]: Record<string, string> } = {
  en: enMessages,
  es: esMessages,
};

export const LanguageContext = createContext<LanguageContextProps>({
  locale: 'en',
  messages: enMessages,
  changeLanguage: () => {},
});

interface LanguageProviderProps {
  children: ReactNode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const initialLocale = navigator.language.startsWith('es') ? 'es' : 'en';
  const [locale, setLocale] = useState<string>(initialLocale);

  const changeLanguage = (lang: string) => {
    setLocale(lang);
  };

  return (
    <LanguageContext.Provider
      value={{ locale, messages: messagesMap[locale], changeLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
};
