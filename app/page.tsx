"use client";

import { useState, useEffect, useCallback } from "react";

interface Part {
  _id: string;
  partNumber: string;
  description: string;
  category: string;
  manufacturerPartNumber: string;
  price: number | null;
  supplier: string;
}

interface PartsResponse {
  parts: Part[];
  total: number;
  page: number;
  pages: number;
}

const CATEGORIES = [
  "All Categories",
  "Contactors & Circuit Breakers",
  "Control Transformers",
  "Disconnects",
  "Enclosures",
  "Fuses & Fuse Blocks",
  "General & Miscellaneous",
  "General Hardware",
  "Heaters & Thermostats",
  "Indicating & Pilot Lights",
  "Legend Plates & Lamacoids",
  "Nordock Parts",
  "Overload Relays",
  "PLC & PLR Components",
  "Plugs, Sockets & Connectors",
  "Power Supplies",
  "Push Buttons, Pilot Lights & Pendants",
  "Push Buttons, Selector Switches & E-Stops",
  "Relays, Timers & Flashers",
  "Soft Starters & Drives",
  "Terminals, Lugs, Wire Duct & DIN Rail",
  "Variable Frequency Drives",
  "Wires, Cables, Conduit & Strain Relief",
];

export default function Home() {
  const [searchQuery, setSearchQuery] = useState("");
  const [category, setCategory] = useState("");
  const [parts, setParts] = useState<Part[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchParts = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (debouncedQuery) params.set("q", debouncedQuery);
      if (category) params.set("category", category);
      params.set("page", String(page));
      const res = await fetch(`/api/parts?${params}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data: PartsResponse = await res.json();
      setParts(data.parts);
      setTotal(data.total);
      setPages(data.pages);
    } catch {
      setError("Could not load parts. Check that MongoDB is connected.");
    } finally {
      setLoading(false);
    }
  }, [debouncedQuery, category, page]);

  useEffect(() => {
    fetchParts();
  }, [fetchParts]);

  useEffect(() => {
    setPage(1);
  }, [debouncedQuery, category]);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-blue-900 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Flodraulic Parts Manager</h1>
            <p className="text-blue-300 text-sm mt-0.5">
              {total > 0 ? `${total.toLocaleString()} parts found` : "Parts database"}
            </p>
          </div>
          <div className="text-blue-300 text-sm text-right">
            <div className="font-semibold text-white">FLODRAULIC</div>
            <div>Electrical Components</div>
          </div>
        </div>
      </header>

      <div className="bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex gap-3 flex-wrap">
          <input
            type="text"
            placeholder="Search by part number, description, supplier..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 min-w-64 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value === "All Categories" ? "" : e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat === "All Categories" ? "" : cat}>{cat}</option>
            ))}
          </select>
          {(searchQuery || category) && (
            <button
              onClick={() => { setSearchQuery(""); setCategory(""); }}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-100"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 mb-4 text-sm">{error}</div>
        )}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-gray-400 text-lg">Loading parts...</div>
          </div>
        ) : parts.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <div className="text-5xl mb-4">🔍</div>
            <p className="text-lg font-medium">No parts found</p>
            <p className="text-sm mt-1">Try a different search or category</p>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">Part Number</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">Description</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">Category</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">Mfr Part #</th>
                      <th className="text-right px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">Price (CAD)</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">Supplier</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {parts.map((part) => (
                      <tr key={part._id} className="hover:bg-blue-50 transition-colors">
                        <td className="px-4 py-3 font-mono font-medium text-blue-700 whitespace-nowrap">{part.partNumber}</td>
                        <td className="px-4 py-3 text-gray-800 max-w-xs">{part.description}</td>
                        <td className="px-4 py-3">
                          <span className="inline-block bg-blue-50 text-blue-700 rounded px-2 py-0.5 text-xs font-medium whitespace-nowrap">{part.category}</span>
                        </td>
                        <td className="px-4 py-3 text-gray-500 font-mono text-xs">{part.manufacturerPartNumber || "—"}</td>
                        <td className="px-4 py-3 text-right text-gray-800 whitespace-nowrap">
                          {part.price != null ? `$${part.price.toFixed(2)}` : "—"}
                        </td>
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{part.supplier || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            {pages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-gray-500">Page {page} of {pages}</p>
                <div className="flex gap-2">
                  <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                    className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">
                    Previous
                  </button>
                  <button onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page === pages}
                    className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
