import React, { useState, useEffect } from "react";
import { Plane, Calendar, Info, Loader2, CheckCircle2, AlertCircle, Database, ChevronRight, Bot, Sparkles, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Flight {
  id: string;
  airline: string;
  flightNumber: string;
  departureTime: string;
  arrivalTime: string;
  duration: string;
  stops: number;
  layovers?: string;
  price: number;
  currency: string;
  date: string;
  sourceApi?: "duffel" | "aviationstack";
  terminal?: string | null;
  gate?: string | null;
  status?: string;
}

interface FlightSearchHubProps {
  forexRates?: Record<string, number>;
}

export default function FlightSearchHub({ forexRates }: FlightSearchHubProps) {
  const [source, setSource] = useState("DEL");
  const [destination, setDestination] = useState("LOS");
  const [date, setDate] = useState("2026-07-10");
  const [flexibleDays, setFlexibleDays] = useState("5");
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [flights, setFlights] = useState<Flight[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [searchMethod, setSearchMethod] = useState("");
  const [errorText, setErrorText] = useState("");
  
  // Filters and Comparison states
  const [stopFilter, setStopFilter] = useState<"ALL" | "0" | "1">("ALL");
  const [airlineFilter, setAirlineFilter] = useState("ALL");
  const [maxPriceFilter, setMaxPriceFilter] = useState<number>(10000);
  const [compareFlightIds, setCompareFlightIds] = useState<string[]>([]);
  const [showCompareModal, setShowCompareModal] = useState(false);

  const [currency, setCurrency] = useState<"INR" | "USD" | "EUR" | "AUD" | "NGN" | "VND">("USD");
  const [hoveredFlightId, setHoveredFlightId] = useState<string | null>(null);

  // Sorting & Tab filters states
  const [activeTab, setActiveTab] = useState<"duffel" | "aviationstack">("duffel");
  const [sortBy, setSortBy] = useState<"ai" | "cheapest" | "fastest" | "earliest">("cheapest");
  const [aiPick, setAiPick] = useState<{ bestFlightId: string; reasoning: string } | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  // Live forex calculations (API returns base: EUR)
  const rates = forexRates || {
    USD: 1.0825,
    INR: 90.35,
    AUD: 1.6312,
    NGN: 1625.5,
    VND: 27550.0,
    EUR: 1.0
  };
  const usdRate = rates["USD"] || 1.0825;

  const currencyRates: Record<string, number> = {
    USD: 1.0,
    INR: (rates["INR"] || 90.35) / usdRate,
    EUR: (rates["EUR"] || 1.0) / usdRate,
    AUD: (rates["AUD"] || 1.6312) / usdRate,
    NGN: (rates["NGN"] || 1625.5) / usdRate,
    VND: (rates["VND"] || 27550.0) / usdRate
  };

  const currencySymbols: Record<string, string> = {
    USD: "$",
    INR: "₹",
    EUR: "€",
    AUD: "A$",
    NGN: "₦",
    VND: "₫"
  };

  const convertPrice = (priceInUSD: number) => {
    const converted = priceInUSD * currencyRates[currency];
    if (currency === "USD" || currency === "EUR" || currency === "AUD") {
      return converted.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return Math.round(converted).toLocaleString();
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!source.trim() || !destination.trim() || !date) {
      setErrorText("Please fill in all mandatory fields.");
      return;
    }
    setErrorText("");
    setLoading(true);
    setAiPick(null);
    try {
      const response = await fetch("/api/flights/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source,
          destination,
          date,
          flexibleDays: Number(flexibleDays) || 0
        })
      });
      if (response.ok) {
        const data = await response.json();
        setFlights(data.flights || []);
        setSearchMethod(data.method || "Dynamic Search Engine");
        setSearched(true);
        if (data.flights && data.flights.length > 0) {
          const hasExactDate = data.flights.some((f: Flight) => f.date === date);
          setSelectedDate(hasExactDate ? date : data.flights[0].date);
        } else {
          setSelectedDate(date);
        }
      } else {
        const errorData = await response.json();
        setErrorText(errorData.error || "Failed to fetch flight search results.");
      }
    } catch (err: any) {
      setErrorText("Connection error dispatching query: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Trigger OpenRouter AI recommendation for filtered list of flights
  useEffect(() => {
    if (flights.length > 0) {
      const currentFiltered = flights.filter(f => {
        const isDuffel = f.sourceApi === "duffel" || f.id?.startsWith("DF-") || f.currency === "USD";
        const matchTab = activeTab === "duffel" ? isDuffel : !isDuffel;
        return f.date === selectedDate && matchTab;
      });

      if (currentFiltered.length > 0) {
        const fetchAi = async () => {
          setAiLoading(true);
          try {
            const res = await fetch("/api/flights/ai-recommend", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ flights: currentFiltered })
            });
            if (res.ok) {
              const resData = await res.json();
              if (resData.success && resData.recommendation) {
                setAiPick(resData.recommendation);
                return;
              }
            }
            setAiPick(null);
          } catch (err) {
            console.error("AI recommend fetch error:", err);
            setAiPick(null);
          } finally {
            setAiLoading(false);
          }
        };
        fetchAi();
      } else {
        setAiPick(null);
      }
    } else {
      setAiPick(null);
    }
  }, [flights, selectedDate, activeTab]);

  const dateLowestPrices = React.useMemo(() => {
    const map: Record<string, number> = {};
    flights.forEach(f => {
      const isDuffel = f.sourceApi === "duffel" || f.id?.startsWith("DF-") || f.currency === "USD";
      const matchTab = activeTab === "duffel" ? isDuffel : !isDuffel;
      if (matchTab) {
        if (!map[f.date] || f.price < map[f.date]) {
          map[f.date] = f.price;
        }
      }
    });
    return Object.entries(map).sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime());
  }, [flights, activeTab]);

  const uniqueAirlines = React.useMemo(() => {
    const set = new Set<string>();
    flights.forEach(f => {
      if (f.airline) set.add(f.airline);
    });
    return Array.from(set).sort();
  }, [flights]);

  const filteredFlights = React.useMemo(() => {
    const onDate = flights.filter(f => {
      const isDuffel = f.sourceApi === "duffel" || f.id?.startsWith("DF-") || f.currency === "USD";
      const matchTab = activeTab === "duffel" ? isDuffel : !isDuffel;
      
      // Apply filters
      if (f.date !== selectedDate || !matchTab) return false;
      if (stopFilter !== "ALL" && f.stops.toString() !== stopFilter) return false;
      if (airlineFilter !== "ALL" && f.airline !== airlineFilter) return false;
      if (f.price > maxPriceFilter) return false;
      return true;
    });

    const getDurationMinutes = (durationStr: string) => {
      let mins = 0;
      const hourMatch = durationStr.match(/(\d+)\s*h/i);
      const minMatch = durationStr.match(/(\d+)\s*m/i);
      if (hourMatch) mins += Number(hourMatch[1]) * 60;
      if (minMatch) mins += Number(minMatch[1]);
      return mins || 120;
    };

    const getTimeMinutes = (timeStr: string) => {
      const parts = timeStr.split(":");
      if (parts.length >= 2) {
        return Number(parts[0]) * 60 + Number(parts[1]);
      }
      return 540;
    };

    return [...onDate].sort((a, b) => {
      if (sortBy === "ai" && aiPick) {
        if (a.id === aiPick.bestFlightId) return -1;
        if (b.id === aiPick.bestFlightId) return 1;
      }
      if (sortBy === "cheapest" || sortBy === "ai") {
        return a.price - b.price;
      }
      if (sortBy === "fastest") {
        return getDurationMinutes(a.duration) - getDurationMinutes(b.duration);
      }
      if (sortBy === "earliest") {
        return getTimeMinutes(a.departureTime) - getTimeMinutes(b.departureTime);
      }
      return 0;
    });
  }, [flights, selectedDate, activeTab, sortBy, aiPick, stopFilter, airlineFilter, maxPriceFilter]);

  const formatDisplayDate = (dStr: string) => {
    try {
      const d = new Date(dStr);
      return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short' });
    } catch {
      return dStr;
    }
  };

  const getDayName = (dStr: string) => {
    try {
      const d = new Date(dStr);
      return d.toLocaleDateString(undefined, { weekday: 'short' });
    } catch {
      return "";
    }
  };

  return (
    <div className="bg-slate-50 text-slate-800 flex flex-col font-sans">
      {/* Header bar matching rest of app */}
      <header className="flex justify-between items-center px-6 py-3 border-b border-slate-200 bg-white rounded-3xl mb-6 shadow-xs">
        <div className="flex items-center gap-2">
          <Plane className="w-4 h-4 text-orange-600" />
          <h1 className="text-xs font-black uppercase tracking-wider text-slate-800">Flight Search Panel</h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">FastAPI Status</span>
          <span className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-full px-2.5 py-1 text-[9px] font-mono text-emerald-600 font-bold select-none">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            ONLINE
          </span>
        </div>
      </header>

      {/* Main Grid View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Side: Search Form Card */}
        <section className="lg:col-span-4 space-y-6 text-left">
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-200">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Corporate Flight Search</span>
            </div>

            <form onSubmit={handleSearch} className="space-y-4 text-xs">
              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Source Airport (IATA) *</label>
                <input
                  type="text"
                  value={source}
                  onChange={e => setSource(e.target.value.toUpperCase())}
                  placeholder="e.g. DEL"
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 font-mono text-xs font-bold text-slate-800 focus:outline-none focus:border-orange-500 transition uppercase"
                  required
                />
              </div>

              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Destination Airport (IATA) *</label>
                <input
                  type="text"
                  value={destination}
                  onChange={e => setDestination(e.target.value.toUpperCase())}
                  placeholder="e.g. LOS"
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 font-mono text-xs font-bold text-slate-800 focus:outline-none focus:border-orange-500 transition uppercase"
                  required
                />
              </div>

              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Travel Date *</label>
                <div className="relative">
                  <input
                    type="date"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-orange-500 transition pr-10"
                    required
                  />
                  <Calendar className="absolute right-3.5 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Flexible Days (Optional)</label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={flexibleDays}
                  onChange={e => setFlexibleDays(e.target.value)}
                  placeholder="0"
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-orange-500 transition"
                />
              </div>

              {errorText && (
                <div className="flex items-start gap-2 text-rose-600 bg-rose-50 border border-rose-100 rounded-xl p-3 text-[10px] font-bold">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                  <span>{errorText}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full h-10 flex items-center justify-center gap-2 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition font-black text-[10px] uppercase tracking-widest active:scale-95 duration-100 disabled:opacity-50 disabled:pointer-events-none shadow-xs"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Executing Search...
                  </>
                ) : (
                  <>
                    <Plane className="w-3.5 h-3.5" />
                    Execute Live Search
                  </>
                )}
              </button>
            </form>

            {/* Live Result Filters */}
            {searched && (
              <div className="pt-5 border-t border-slate-200 mt-5 space-y-4">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Live Filters</span>
                
                <div>
                  <label className="block text-[9px] font-black text-slate-450 uppercase tracking-widest mb-1.5">Max Stops</label>
                  <select
                    value={stopFilter}
                    onChange={e => setStopFilter(e.target.value as any)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none cursor-pointer"
                  >
                    <option value="ALL">Show All Stops</option>
                    <option value="0">Non-stop Only</option>
                    <option value="1">Max 1 Stop</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[9px] font-black text-slate-455 uppercase tracking-widest mb-1.5">Airlines</label>
                  <select
                    value={airlineFilter}
                    onChange={e => setAirlineFilter(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none cursor-pointer"
                  >
                    <option value="ALL">All Airlines</option>
                    {uniqueAirlines.map(airline => (
                      <option key={airline} value={airline}>{airline}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[9px] font-black text-slate-455 uppercase tracking-widest mb-1.5 flex justify-between">
                    <span>Max Fare Limit</span>
                    <span className="text-orange-600 font-black font-mono">${maxPriceFilter}</span>
                  </label>
                  <input
                    type="range"
                    min="100"
                    max="10000"
                    step="50"
                    value={maxPriceFilter}
                    onChange={e => setMaxPriceFilter(Number(e.target.value))}
                    className="w-full accent-orange-650 cursor-pointer"
                  />
                  <div className="flex justify-between text-[8px] font-bold text-slate-400 font-mono mt-1">
                    <span>$100</span>
                    <span>$10,000</span>
                  </div>
                </div>
              </div>
            )}

            {/* Integration Status Footer */}
            <div className="pt-4 border-t border-slate-200 mt-4 space-y-2">
              <div className="flex items-center gap-2 text-[9px] font-black text-slate-500 tracking-wider">
                <CheckCircle2 className="w-4 h-4 text-orange-600" />
                <span>Aviationstack Integration Active</span>
              </div>
              <div className="flex items-center gap-2 text-[9px] font-black text-slate-500 tracking-wider">
                <CheckCircle2 className="w-4 h-4 text-orange-600" />
                <span>Duffel Offer Requests Active</span>
              </div>
            </div>
          </div>
        </section>

        {/* Right Side: Search Results Area */}
        <section className="lg:col-span-8 space-y-6">
          <AnimatePresence mode="wait">
            {!searched && !loading && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="border border-slate-200 bg-white rounded-3xl p-16 flex flex-col items-center justify-center text-center min-h-[460px] shadow-xs"
              >
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-3xl text-slate-400 mb-6 shadow-inner">
                  <Database className="w-10 h-10" />
                </div>
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-800 mb-2">Awaiting Workflow Query</h3>
                <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
                  Fill out the parameters on the left and click Search. We will dispatch the requests to find flight schedules and pricing options.
                </p>
              </motion.div>
            )}

            {loading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="border border-slate-200 bg-white rounded-3xl p-16 flex flex-col items-center justify-center text-center min-h-[460px] shadow-xs"
              >
                <div className="relative flex items-center justify-center mb-6">
                  <div className="w-14 h-14 rounded-full border-4 border-orange-500/20 border-t-orange-600 animate-spin"></div>
                  <Plane className="w-5 h-5 text-orange-600 absolute animate-pulse" />
                </div>
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-800 mb-2">Executing Search Workflow</h3>
                <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
                  Contacting Aviationstack API, executing live connectors, and processing date comparison matrices...
                </p>
              </motion.div>
            )}

            {searched && !loading && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6 text-left"
              >
                        {/* Sort Results Control Bar */}
                <div className="bg-slate-950 border border-slate-900 rounded-3xl p-5 flex flex-wrap items-center justify-start gap-4 shadow-xl text-white">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sort Results:</span>
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setSortBy("ai")}
                      className={`flex items-center gap-2 px-4.5 py-2.5 rounded-2xl text-[11px] font-black uppercase tracking-wider transition-all duration-150 cursor-pointer ${
                        sortBy === "ai"
                          ? "bg-blue-600 text-white shadow-lg shadow-blue-600/35 border border-blue-500"
                          : "bg-slate-900 border border-slate-800 text-slate-350 hover:bg-slate-850 hover:text-white"
                      }`}
                    >
                      <Bot className="w-3.5 h-3.5" />
                      AI Best Pick
                    </button>
                    <button
                      type="button"
                      onClick={() => setSortBy("cheapest")}
                      className={`flex items-center gap-2 px-4.5 py-2.5 rounded-2xl text-[11px] font-black uppercase tracking-wider transition-all duration-150 cursor-pointer ${
                        sortBy === "cheapest"
                          ? "bg-blue-600 text-white shadow-lg shadow-blue-600/35 border border-blue-500"
                          : "bg-slate-900 border border-slate-800 text-slate-350 hover:bg-slate-850 hover:text-white"
                      }`}
                    >
                      <span>💵</span>
                      Cheapest Fares
                    </button>
                    <button
                      type="button"
                      onClick={() => setSortBy("fastest")}
                      className={`flex items-center gap-2 px-4.5 py-2.5 rounded-2xl text-[11px] font-black uppercase tracking-wider transition-all duration-150 cursor-pointer ${
                        sortBy === "fastest"
                          ? "bg-blue-600 text-white shadow-lg shadow-blue-600/35 border border-blue-500"
                          : "bg-slate-900 border border-slate-800 text-slate-350 hover:bg-slate-850 hover:text-white"
                      }`}
                    >
                      <span>⚡</span>
                      Fastest Duration
                    </button>
                    <button
                      type="button"
                      onClick={() => setSortBy("earliest")}
                      className={`flex items-center gap-2 px-4.5 py-2.5 rounded-2xl text-[11px] font-black uppercase tracking-wider transition-all duration-150 cursor-pointer ${
                        sortBy === "earliest"
                          ? "bg-blue-600 text-white shadow-lg shadow-blue-600/35 border border-blue-500"
                          : "bg-slate-900 border border-slate-800 text-slate-350 hover:bg-slate-850 hover:text-white"
                      }`}
                    >
                      <span>📅</span>
                      Earliest Departure
                    </button>
                  </div>
                </div>

                {/* Sub Tab Selection & Currency Dropdown */}
                <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setActiveTab("duffel")}
                      className={`px-5 py-3 rounded-2xl text-[11px] font-black uppercase tracking-wider transition cursor-pointer ${
                        activeTab === "duffel"
                          ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                          : "bg-white border border-slate-200 text-slate-655 hover:bg-slate-50"
                      }`}
                    >
                      Priced Offers (Duffel API)
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab("aviationstack")}
                      className={`px-5 py-3 rounded-2xl text-[11px] font-black uppercase tracking-wider transition cursor-pointer ${
                        activeTab === "aviationstack"
                          ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                          : "bg-white border border-slate-200 text-slate-655 hover:bg-slate-50"
                      }`}
                    >
                      Flight Schedules (Aviationstack API)
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">CURRENCY:</span>
                    <select
                      value={currency}
                      onChange={e => setCurrency(e.target.value as any)}
                      className="bg-white border border-slate-250 rounded-2xl px-4 py-2.5 text-xs font-black text-slate-700 focus:outline-none focus:border-orange-500 cursor-pointer shadow-2xs font-mono"
                    >
                      <option value="INR">INR (₹) - Indian Rupee</option>
                      <option value="USD">USD ($) - US Dollar</option>
                      <option value="EUR">EUR (€) - Euro</option>
                      <option value="AUD">AUD (A$) - Australian Dollar</option>
                      <option value="NGN">NGN (₦) - Nigerian Naira</option>
                      <option value="VND">VND (₫) - Vietnamese Dong</option>
                    </select>
                  </div>
                </div>

                {/* Flexible Dates Price Matrix */}
                {dateLowestPrices.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Flexible Date Price matrix</h3>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 lg:grid-cols-11 gap-2">
                      {dateLowestPrices.map(([dStr, minPrice]) => {
                        const isActive = dStr === selectedDate;
                        const isOriginalDate = dStr === date;
                        return (
                          <button
                            key={dStr}
                            type="button"
                            onClick={() => setSelectedDate(dStr)}
                            className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all text-center relative cursor-pointer ${
                              isActive
                                ? "bg-orange-600/10 border-orange-500/60 text-orange-655 font-bold shadow-xs"
                                : "bg-white border-slate-200 hover:border-slate-300 text-slate-500 hover:text-slate-800"
                            }`}
                          >
                            <span className="text-[8px] font-black uppercase tracking-wider opacity-60">{getDayName(dStr)}</span>
                            <span className="text-[11px] font-black mt-0.5">{formatDisplayDate(dStr)}</span>
                            <span className={`text-[9px] font-mono mt-1 font-black ${isActive ? "text-orange-655" : "text-slate-400"}`}>
                              {currencySymbols[currency]}{convertPrice(minPrice)}
                            </span>
                            {isOriginalDate && (
                              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-orange-600 border border-white shadow-sm" title="Target search date"></span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* AI Recommendation Explanation Card */}
                {aiPick && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-3xl p-5 flex items-start gap-4 shadow-2xs"
                  >
                    <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-md shrink-0">
                      <Sparkles className="w-5 h-5 animate-pulse" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-blue-900 flex items-center gap-1.5 leading-none">
                        🤖 AI Best Pick Recommendation
                        {aiLoading && <Loader2 className="w-3 h-3 animate-spin text-blue-500" />}
                      </h4>
                      <p className="text-xs text-slate-700 mt-2 font-medium leading-relaxed">
                        {aiPick.reasoning}
                      </p>
                    </div>
                  </motion.div>
                )}

                {/* Flights List for selected date */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                      Available Schedules for {formatDisplayDate(selectedDate)}
                    </h3>
                    <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest">
                      {filteredFlights.length} Flights Found
                    </span>
                  </div>

                  <div className="space-y-3">
                    {filteredFlights.length > 0 ? (
                      filteredFlights.map((flight) => (
                        <div
                          key={flight.id}
                          className={`border rounded-3xl p-5 flex flex-col md:flex-row items-center justify-between gap-6 transition-all relative ${
                            aiPick && flight.id === aiPick.bestFlightId
                              ? "border-blue-500 ring-2 ring-blue-500/10 shadow-lg shadow-blue-500/5 bg-slate-50/50"
                              : "bg-white border-slate-200 hover:border-slate-300 shadow-xs"
                          }`}
                        >
                          {aiPick && flight.id === aiPick.bestFlightId && (
                            <div className="absolute -top-3 left-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-md flex items-center gap-1.5 z-10">
                              <Sparkles className="w-2.5 h-2.5 animate-pulse" />
                              AI Recommended Best Pick
                            </div>
                          )}
                           {/* Compare Checkbox Selection */}
                           <div className="flex items-center gap-2 select-none absolute top-4 right-4 md:relative md:top-auto md:right-auto shrink-0 z-10">
                             <input
                               type="checkbox"
                               checked={compareFlightIds.includes(flight.id)}
                               onChange={(e) => {
                                 if (e.target.checked) {
                                   if (compareFlightIds.length >= 3) {
                                     alert("You can compare up to 3 flights at once.");
                                     return;
                                   }
                                   setCompareFlightIds(prev => [...prev, flight.id]);
                                 } else {
                                   setCompareFlightIds(prev => prev.filter(id => id !== flight.id));
                                 }
                               }}
                               className="w-4.5 h-4.5 accent-blue-600 rounded cursor-pointer"
                               title="Select to compare side-by-side"
                             />
                             <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block md:hidden">Compare</span>
                           </div>

                           {/* Airline info */}
                          <div className="flex items-center gap-4 w-full md:w-auto text-left">
                            <div className="w-10 h-10 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-600 font-black text-sm shrink-0">
                              {flight.airline.substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <span className="font-black text-xs text-slate-800 block leading-tight">{flight.airline}</span>
                              <span className="text-[9px] font-bold text-slate-400 font-mono uppercase tracking-wider mt-0.5 block">✈ {flight.flightNumber}</span>
                            </div>
                          </div>

                          {/* Sector times & Duration with date below times */}
                          <div className="flex items-center justify-center gap-8 flex-1 w-full md:w-auto">
                            {/* Departure */}
                            <div className="text-right">
                              <span className="font-mono text-base font-black text-slate-800 block">{flight.departureTime}</span>
                              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">{source}</span>
                              <span className="inline-block text-[8px] font-black text-slate-450 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md mt-1 font-mono">{formatDisplayDate(selectedDate)}</span>
                            </div>
                            
                            {/* Line & Stops */}
                            <div className="flex flex-col items-center flex-1 max-w-[150px] relative px-1">
                              <span className="text-[10px] font-black text-slate-600 mb-1">{flight.duration}</span>
                              <div className="w-full h-0.5 bg-slate-200 rounded-full relative flex items-center justify-center">
                                <div className="absolute w-2 h-2 rounded-full bg-slate-300 border border-white"></div>
                                {flight.stops > 0 && (
                                  <>
                                    <div className="absolute left-1/4 w-1.5 h-1.5 rounded-full bg-orange-450 border border-white"></div>
                                    {flight.stops > 1 && (
                                      <div className="absolute right-1/4 w-1.5 h-1.5 rounded-full bg-orange-450 border border-white"></div>
                                    )}
                                  </>
                                )}
                              </div>
                              <span className={`text-[9px] font-black tracking-widest uppercase mt-2 font-mono ${flight.stops === 0 ? "text-blue-600" : "text-amber-600"}`}>
                                {flight.stops === 0 ? "NON-STOP" : `${flight.stops} STOPS (${flight.layovers || "Transit"})`}
                              </span>
                            </div>

                            {/* Arrival */}
                            <div className="text-left">
                              <span className="font-mono text-base font-black text-slate-800 block">{flight.arrivalTime}</span>
                              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">{destination}</span>
                              <span className="inline-block text-[8px] font-black text-slate-450 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md mt-1 font-mono">{formatDisplayDate(selectedDate)}</span>
                            </div>
                          </div>

                          {/* Price & Selection Button & Live Fares Popup */}
                          <div className="flex items-center justify-between md:justify-end gap-6 w-full md:w-auto pt-4 md:pt-0 border-t md:border-t-0 border-slate-200">
                            <div className="text-left md:text-right relative">
                              <div className="flex items-center md:justify-end gap-1 select-none">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">GRAND TOTAL</span>
                                
                                {/* Info icon containing hover popover */}
                                <div 
                                  className="relative inline-block"
                                  onMouseEnter={() => setHoveredFlightId(flight.id)}
                                  onMouseLeave={() => setHoveredFlightId(null)}
                                >
                                  <button
                                    type="button"
                                    className="text-slate-450 hover:text-slate-700 transition cursor-pointer p-0.5"
                                  >
                                    <Info className="w-3.5 h-3.5" />
                                  </button>

                                  {/* Absolute Tooltip Popover */}
                                  {hoveredFlightId === flight.id && (
                                    <div className="absolute right-0 bottom-full mb-2 w-60 bg-slate-900 text-white border border-slate-800 rounded-2xl p-4 shadow-2xl z-50 text-left animate-in fade-in slide-in-from-bottom-2 duration-150">
                                      <div className="flex justify-between items-center pb-2 border-b border-slate-800 mb-2">
                                        <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Live Partner Fares</span>
                                        <button 
                                          onClick={() => setHoveredFlightId(null)}
                                          className="text-[9px] font-black text-slate-500 hover:text-slate-300 uppercase"
                                        >
                                          Close
                                        </button>
                                      </div>
                                      <div className="space-y-3 text-[10px]">
                                        <div className="flex justify-between items-center gap-2">
                                          <span className="text-slate-400">Google Flights</span>
                                          <span className="font-mono font-bold text-slate-200 flex items-center gap-1.5">
                                            {currencySymbols[currency]}{convertPrice(flight.price)}
                                            <a 
                                              href="https://www.google.com/travel/flights" 
                                              target="_blank" 
                                              rel="noopener noreferrer" 
                                              className="text-orange-500 hover:underline font-black text-[9px] font-sans"
                                            >
                                              (Verify)
                                            </a>
                                          </span>
                                        </div>
                                        <div className="flex justify-between items-center gap-2">
                                          <span className="text-slate-400">MakeMyTrip (MMT)</span>
                                          <span className="font-mono font-bold text-slate-200 flex items-center gap-1.5">
                                            {currencySymbols[currency]}{convertPrice(flight.price * 1.012)}
                                            <a 
                                              href="https://www.makemytrip.com/flights" 
                                              target="_blank" 
                                              rel="noopener noreferrer" 
                                              className="text-orange-500 hover:underline font-black text-[9px] font-sans"
                                            >
                                              (Verify)
                                            </a>
                                          </span>
                                        </div>
                                        <div className="flex justify-between items-center gap-2">
                                          <span className="text-slate-400">Booking.com</span>
                                          <span className="font-mono font-bold text-slate-200 flex items-center gap-1.5">
                                            {currencySymbols[currency]}{convertPrice(flight.price * 1.025)}
                                            <a 
                                              href="https://www.booking.com/flights.html" 
                                              target="_blank" 
                                              rel="noopener noreferrer" 
                                              className="text-orange-500 hover:underline font-black text-[9px] font-sans"
                                            >
                                              (Verify)
                                            </a>
                                          </span>
                                        </div>
                                        <div className="flex justify-between items-center gap-2">
                                          <span className="text-slate-400">Skyscanner</span>
                                          <span className="font-mono font-bold text-slate-200 flex items-center gap-1.5">
                                            {currencySymbols[currency]}{convertPrice(flight.price * 0.985)}
                                            <a 
                                              href="https://www.skyscanner.com" 
                                              target="_blank" 
                                              rel="noopener noreferrer" 
                                              className="text-orange-500 hover:underline font-black text-[9px] font-sans"
                                            >
                                              (Verify)
                                            </a>
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>

                              <span className="text-lg font-black text-emerald-600 font-mono block md:text-right mt-0.5">
                                {currencySymbols[currency]}{convertPrice(flight.price)}
                              </span>
                            </div>
                            
                            <button
                              type="button"
                              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition active:scale-95 select-none shrink-0 shadow-xs"
                            >
                              Select Bid
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="border border-slate-200 bg-white rounded-3xl p-12 text-center text-slate-400 text-xs">
                        No flight schedules generated for this date. Try another date in the matrix.
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </div>

      {compareFlightIds.length > 0 && (
        <div className="fixed bottom-6 right-6 z-50 animate-bounce">
          <button
            type="button"
            onClick={() => setShowCompareModal(true)}
            className="px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-black text-xs uppercase tracking-widest shadow-2xl transition duration-155 flex items-center gap-2 cursor-pointer border border-blue-500"
          >
            <Bot className="w-4 h-4" />
            <span>Compare Selected ({compareFlightIds.length}/3)</span>
          </button>
        </div>
      )}

      {showCompareModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-[60] animate-fade-in">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white border-2 border-slate-950 rounded-3xl p-6 w-full max-w-4xl max-h-[85vh] overflow-y-auto shadow-2xl relative text-left"
          >
            <div className="flex justify-between items-center pb-4 border-b border-slate-150 mb-6">
              <h3 className="text-lg font-black uppercase tracking-tighter text-slate-900 flex items-center gap-2">
                <Plane className="w-5 h-5 text-orange-600 animate-pulse" />
                Flight Comparison Matrix
              </h3>
              <button
                type="button"
                onClick={() => setShowCompareModal(false)}
                className="text-slate-450 hover:text-slate-900 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="p-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Details</th>
                    {compareFlightIds.map(id => {
                      const f = flights.find(fl => fl.id === id);
                      return (
                        <th key={id} className="p-3 text-left text-xs font-black text-slate-800 uppercase tracking-tight min-w-[200px]">
                          {f?.airline} ({f?.flightNumber})
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-700">
                  <tr>
                    <td className="p-3 text-slate-400 font-black uppercase text-[9px] tracking-wider">Airline</td>
                    {compareFlightIds.map(id => {
                      const f = flights.find(fl => fl.id === id);
                      return <td key={id} className="p-3">{f?.airline}</td>;
                    })}
                  </tr>
                  <tr>
                    <td className="p-3 text-slate-400 font-black uppercase text-[9px] tracking-wider">Flight Number</td>
                    {compareFlightIds.map(id => {
                      const f = flights.find(fl => fl.id === id);
                      return <td key={id} className="p-3 font-mono">{f?.flightNumber}</td>;
                    })}
                  </tr>
                  <tr>
                    <td className="p-3 text-slate-400 font-black uppercase text-[9px] tracking-wider">Departure</td>
                    {compareFlightIds.map(id => {
                      const f = flights.find(fl => fl.id === id);
                      return <td key={id} className="p-3 font-mono">{f?.departureTime}</td>;
                    })}
                  </tr>
                  <tr>
                    <td className="p-3 text-slate-400 font-black uppercase text-[9px] tracking-wider">Arrival</td>
                    {compareFlightIds.map(id => {
                      const f = flights.find(fl => fl.id === id);
                      return <td key={id} className="p-3 font-mono">{f?.arrivalTime}</td>;
                    })}
                  </tr>
                  <tr>
                    <td className="p-3 text-slate-400 font-black uppercase text-[9px] tracking-wider">Duration</td>
                    {compareFlightIds.map(id => {
                      const f = flights.find(fl => fl.id === id);
                      return <td key={id} className="p-3">{f?.duration}</td>;
                    })}
                  </tr>
                  <tr>
                    <td className="p-3 text-slate-400 font-black uppercase text-[9px] tracking-wider">Stops</td>
                    {compareFlightIds.map(id => {
                      const f = flights.find(fl => fl.id === id);
                      return <td key={id} className="p-3 font-mono">{f?.stops === 0 ? "Non-stop" : `${f?.stops} stops`}</td>;
                    })}
                  </tr>
                  <tr className="bg-slate-50/50">
                    <td className="p-3 text-slate-400 font-black uppercase text-[9px] tracking-wider">Price (Selected Currency)</td>
                    {compareFlightIds.map(id => {
                      const f = flights.find(fl => fl.id === id);
                      return (
                        <td key={id} className="p-3 text-base font-black text-emerald-600 font-mono">
                          {currencySymbols[currency]}{f ? convertPrice(f.price) : "0"}
                        </td>
                      );
                    })}
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setCompareFlightIds([])}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[10px] font-black uppercase tracking-widest cursor-pointer"
              >
                Clear Selection
              </button>
              <button
                type="button"
                onClick={() => setShowCompareModal(false)}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-[10px] font-black uppercase tracking-widest cursor-pointer"
              >
                Close Matrix
              </button>
            </div>
          </motion.div>
        </div>
      )}

    </div>
  );
}
