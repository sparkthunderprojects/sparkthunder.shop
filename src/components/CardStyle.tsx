"use client";

import { createContext, useContext } from "react";

/** True when the store uses the "Catalogue" product card style (edge-to-edge 3:4 tiles, toolbar with Filter & Sort). */
const Ctx = createContext(false);
export const CatalogueProvider = ({ on, children }: { on: boolean; children: React.ReactNode }) => <Ctx.Provider value={on}>{children}</Ctx.Provider>;
export const useCatalogue = () => useContext(Ctx);
