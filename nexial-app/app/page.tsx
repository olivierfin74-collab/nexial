"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function Page() {
  const [data, setData] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [performance, setPerformance] = useState<any[]>([]);
  const [status, setStatus] = useState<"READY" | "DONE" | "ERROR">("READY");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchAll = async () => {
    const { data, error } = await supabase
      .from("vw_invest_now_engine_v1")
      .select("*")
      .single();

    if (error) {
      console.error("Invest Now error:", error);
      setStatus("ERROR");
      return;
    }

    setData(data);

    const { data: hist } = await supabase
      .from("vw_invest_now_history_v1")
      .select("*")
      .limit(10);

    setHistory(hist || []);

    const { data: perf } = await supabase
      .from("vw_invest_now_performance_v1")
      .select("*")
      .limit(10);

    setPerformance(perf || []);
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const handleBuy = async () => {
    try {
      if (!data || isSubmitting) return;

      setIsSubmitting(true);

      const quantity = Number(data.quantity);
      const limitPrice = Number(data.execution_price);

      const { data: existing } = await supabase
        .from("execution_queue_v1")
        .select("id")
        .eq("ticker", data.ticker)
        .eq("status", "PENDING")
        .eq("mode", "INVEST_NOW");

      if (existing && existing.length > 0) {
        alert("Ordre déjà en attente");
        setIsSubmitting(false);
        return;
      }

      const { error } = await supabase
        .from("execution_queue_v1")
        .insert({
          account_name: "PEA Boursorama",
          ticker: data.ticker,
          side: "BUY",
          order_type: "LIMIT_BUY",
          quantity,
          limit_price: limitPrice,
          estimated_amount: quantity * limitPrice,
          status: "PENDING",
          mode: "INVEST_NOW",
          note: "Invest Now action",
        })
        .select();

      if (error) {
        if (error.code === "23505") {
          alert("Ordre déjà existant");
          setIsSubmitting(false);
          return;
        }

        console.error("Insert error:", error);
        setStatus("ERROR");
        setIsSubmitting(false);
        return;
      }

      setStatus("DONE");
      await fetchAll();
      setIsSubmitting(false);
    } catch (err) {
      console.error("Unexpected error:", err);
      setStatus("ERROR");
      setIsSubmitting(false);
    }
  };

  if (status === "ERROR") {
    return <p className="p-6 text-red-600">Erreur Nexial</p>;
  }

  if (!data) {
    return <p className="p-6">Chargement...</p>;
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center py-10 gap-6">
      <div className="bg-white p-6 rounded-2xl shadow-lg w-[350px]">
        <h1 className="text-xl font-bold mb-4">Nexial Invest Now</h1>

        <p className="text-sm text-gray-500">Montant</p>
        <p className="text-2xl font-bold mb-4">{data.amount}€</p>

        <p className="text-sm text-gray-500">Actif recommandé</p>
        <p className="font-semibold">{data.asset_name}</p>

        <div className="mt-4">
          <p className="text-sm text-gray-500">Action</p>
          <p>Ordre limite à {Number(data.execution_price).toFixed(2)}€</p>
        </div>

        <div className="mt-4">
          <p className="text-sm text-gray-500">Quantité</p>
          <p>{data.quantity} parts</p>
        </div>

        <div className="mt-6">
          {status === "READY" && (
            <button
              onClick={handleBuy}
              disabled={isSubmitting}
              className="w-full bg-black text-white py-2 rounded-lg disabled:opacity-50"
            >
              {isSubmitting ? "Création..." : "J’ACHÈTE"}
            </button>
          )}

          {status === "DONE" && (
            <p className="text-green-600 font-medium">
              Ordre enregistré ✔
            </p>
          )}
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-lg w-[350px]">
        <h2 className="text-lg font-bold mb-4">Historique Invest Now</h2>

        {history.length === 0 && (
          <p className="text-sm text-gray-500">Aucun ordre Invest Now</p>
        )}

        {history.map((item) => (
          <div key={item.id} className="border-b py-3 text-sm">
            <p className="font-semibold">{item.ticker}</p>
            <p className="text-gray-500">
              {item.quantity} parts à {Number(item.limit_price).toFixed(2)}€
            </p>
            <p className="text-gray-400">{item.status}</p>
          </div>
        ))}
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-lg w-[350px]">
        <h2 className="text-lg font-bold mb-4">Performance Invest Now</h2>

        {performance.length === 0 && (
          <p className="text-sm text-gray-500">Pas encore de données</p>
        )}

        {performance.map((item) => {
          const pnl = Number(item.pnl_amount);
          const pct = Number(item.pnl_pct);

          return (
            <div key={item.id} className="border-b py-3 text-sm">
              <div className="flex justify-between">
                <p className="font-semibold">{item.ticker}</p>
                <p className={pnl >= 0 ? "text-green-600" : "text-red-600"}>
                  {pnl.toFixed(2)}€
                </p>
              </div>

              <p className="text-gray-500">
                Achat {Number(item.buy_price).toFixed(2)}€ →{" "}
                {Number(item.current_price).toFixed(2)}€
              </p>

              <p className={pct >= 0 ? "text-green-600" : "text-red-600"}>
                {pct.toFixed(2)}%
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}