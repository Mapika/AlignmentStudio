import { createContext, useContext } from 'react';

// Research controls (sampling settings, raw prompts, provenance) stay hidden
// until a student switches them on, so the default flow stays short.
export const AdvancedContext = createContext(false);
export const useAdvanced = () => useContext(AdvancedContext);
