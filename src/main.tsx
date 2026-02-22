import React, { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import {Provider} from "react-redux";
import {store} from "./store/store.ts";
import {LanguageProvider, LanguageContext} from "./contexts/LanguageContext";
import {IntlProvider} from "react-intl";

const Root = () => {
  const { locale, messages } = React.useContext(LanguageContext);
  return (
    <IntlProvider locale={locale} messages={messages}>
      <App />
    </IntlProvider>
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
      <Provider store={store}>
          <LanguageProvider>
              <Root />
          </LanguageProvider>
      </Provider>
  </StrictMode>,
)
