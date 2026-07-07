import { create } from "zustand";

interface TravelStoreState {
  filterSearch: string;
  setFilterSearch: (val: string) => void;
  
  filterCategory: string;
  setFilterCategory: (val: string) => void;
  
  filterPriority: string;
  setFilterPriority: (val: string) => void;
  
  filterPaymentStatus: string;
  setFilterPaymentStatus: (val: string) => void;
  
  filterSlaStatus: string;
  setFilterSlaStatus: (val: string) => void;
  
  filterVendor: string;
  setFilterVendor: (val: string) => void;
  
  showAdvancedFilters: boolean;
  setShowAdvancedFilters: (val: boolean) => void;
  
  showFilterSection: boolean;
  setShowFilterSection: (val: boolean) => void;
  
  isLeftListCollapsed: boolean;
  setIsLeftListCollapsed: (val: boolean) => void;
  
  activeViewSection: string | null;
  setActiveViewSection: (val: string | null) => void;
  
  showPassedQuotes: boolean;
  setShowPassedQuotes: (val: boolean) => void;
  
  selectedCards: string[];
  toggleSelectCard: (id: string) => void;
  setSelectedCards: (ids: string[]) => void;
}

export const useTravelStore = create<TravelStoreState>((set) => ({
  filterSearch: "",
  setFilterSearch: (val) => set({ filterSearch: val }),

  filterCategory: "ALL",
  setFilterCategory: (val) => set({ filterCategory: val }),

  filterPriority: "ALL",
  setFilterPriority: (val) => set({ filterPriority: val }),

  filterPaymentStatus: "ALL",
  setFilterPaymentStatus: (val) => set({ filterPaymentStatus: val }),

  filterSlaStatus: "ALL",
  setFilterSlaStatus: (val) => set({ filterSlaStatus: val }),

  filterVendor: "ALL",
  setFilterVendor: (val) => set({ filterVendor: val }),

  showAdvancedFilters: false,
  setShowAdvancedFilters: (val) => set({ showAdvancedFilters: val }),

  showFilterSection: false,
  setShowFilterSection: (val) => set({ showFilterSection: val }),

  isLeftListCollapsed: false,
  setIsLeftListCollapsed: (val) => set({ isLeftListCollapsed: val }),

  activeViewSection: null,
  setActiveViewSection: (val) => set({ activeViewSection: val }),

  showPassedQuotes: false,
  setShowPassedQuotes: (val) => set({ showPassedQuotes: val }),

  selectedCards: [],
  toggleSelectCard: (id) => set((state) => ({
    selectedCards: state.selectedCards.includes(id)
      ? state.selectedCards.filter((c) => c !== id)
      : [...state.selectedCards, id]
  })),
  setSelectedCards: (ids) => set({ selectedCards: ids })
}));
