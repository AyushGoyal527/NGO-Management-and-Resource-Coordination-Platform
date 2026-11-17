import { createContext, useContext, useEffect } from 'react';
import useFetch from '../hooks/useFetch';
import { publicApi } from '../services/websiteApi';

const SiteContext = createContext(null);
const loadSite = () => publicApi.site();

// Loads the public site content once (organisation details and every CMS section that has something in it).
export function SiteProvider({ children }) {
  const { data, loading, error, reload } = useFetch(loadSite);
  return <SiteContext.Provider value={{ site: data, loading, error, reload }}>{children}</SiteContext.Provider>;
}
export const useSite = () => useContext(SiteContext);

// Sets the browser tab title, for example "Programs · <organisation name>".
export function usePageTitle(title) {
  const { site } = useSite();
  const org = site?.organization?.name;
  useEffect(() => {
    document.title = [title, org || 'Our website'].filter(Boolean).join(' · ');
  }, [title, org]);
}
