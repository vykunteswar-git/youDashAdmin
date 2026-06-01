import { useEffect, useState } from "react";
import api from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import { toast } from "sonner";
import { Link } from "react-router-dom";

export default function WalletAdmin() {
  const [orderId, setOrderId] = useState("");
  const [amount, setAmount] = useState("");
  async function submit() {
    if (!orderId || !amount) return;
    await api.post("/wallet/cod-settlement", { order_id: orderId, amount: parseFloat(amount) });
    toast.success("Settlement recorded");
    setOrderId(""); setAmount("");
  }
  return (
    <div data-testid="wallet-page">
      <PageHeader title="Wallet & Settlements" subtitle="Quick COD settlement and withdrawal access" />
      <div className="grid grid-cols-2 gap-4 max-w-4xl">
        <div className="surface p-5">
          <h3 className="text-sm font-semibold mb-3" style={{ fontFamily: "Outfit" }}>Record COD settlement</h3>
          <input value={orderId} onChange={e => setOrderId(e.target.value)} placeholder="Order ID" className="h-9 text-sm w-full mb-2 border border-[var(--border-default)] rounded-sm px-2 mono" data-testid="settle-order-id" />
          <input value={amount} onChange={e => setAmount(e.target.value)} placeholder="Amount (₹)" className="h-9 text-sm w-full mb-3 border border-[var(--border-default)] rounded-sm px-2 mono" data-testid="settle-amount" />
          <button onClick={submit} className="bg-zinc-900 text-white text-[13px] px-4 py-2 rounded-sm" data-testid="settle-submit">Submit</button>
        </div>
        <Link to="/withdrawals" className="surface p-5 hover:bg-zinc-50 transition-colors" data-testid="goto-withdrawals">
          <h3 className="text-sm font-semibold" style={{ fontFamily: "Outfit" }}>Withdrawal Requests →</h3>
          <p className="text-[12px] text-zinc-500 mt-2">Approve or reject rider payouts.</p>
        </Link>
      </div>
    </div>
  );
}
