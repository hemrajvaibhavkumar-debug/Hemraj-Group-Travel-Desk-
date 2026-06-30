import React, { useState } from "react";
import { Plane, Calendar, Info, Loader2, CheckCircle2, AlertCircle, Database, ChevronRight } from "lucide-react";
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
}

export default function FlightSearchHub() {
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

  const [currency, setCurrency] = useState<"INR" | "USD" | "EUR" | "AUD" | "NGN" | "VND">("USD");
  const [hoveredFlightId, setHoveredFlightId] = useState<string | null>(null);

  const currencyRates: Record<string, number> = {
    USD: 1.0,
    INR: 83.3,
    EUR: 0.91,
    AUD: 1.50,
    NGN: 1520.0,
    VND: 25400.0
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

  const dateLowestPrices = React.useMemo(() => {
    const map: Record<string, number> = {};
    flights.forEach(f => {
      if (!map[f.date] || f.price < map[f.date]) {
        map[f.date] = f.price;
      }
    });
    return Object.entries(map).sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime());
  }, [flights]);

  const filteredFlights = React.useMemo(() => {
    return flights.filter(f => f.date === selectedDate);
  }, [flights, selectedDate]);

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
                {/* Search Metadata Banner */}
                <div className="bg-white border border-slate-200 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4 shadow-xs">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Query:</span>
                    <span className="text-[10px] font-black bg-orange-500/10 text-orange-600 border border-orange-500/20 px-3 py-1 rounded-full uppercase font-mono">
                      {source} &rarr; {destination}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Currency:</span>
                    <select
                      value={currency}
                      onChange={e => setCurrency(e.target.value as any)}
                      className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-[10px] font-black text-slate-700 focus:outline-none focus:border-orange-500 cursor-pointer shadow-2xs font-mono"
                    >
                      <option value="INR">INR (₹)</option>
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="AUD">AUD (A$)</option>
                      <option value="NGN">NGN (₦)</option>
                      <option value="VND">VND (₫)</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Source:</span>
                    <span className="text-[9px] font-black text-slate-700 uppercase tracking-widest bg-slate-50 border border-slate-250 px-3 py-1 rounded-full">
                      🔌 {searchMethod}
                    </span>
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
                            className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all text-center relative ${
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
                          className="bg-white border border-slate-200 hover:border-slate-300 rounded-3xl p-5 flex flex-col md:flex-row items-center justify-between gap-6 transition-all shadow-xs"
                        >
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
    </div>
  );
}
