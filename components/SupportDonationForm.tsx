'use client';

import { useState } from 'react';

const QUICK_AMOUNTS = [100, 300, 500, 1000];

export default function SupportDonationForm() {
  const [amount, setAmount] = useState<number | null>(300);
  const [customAmount, setCustomAmount] = useState('');
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [message, setMessage] = useState('');
  const [showName, setShowName] = useState(true);
  const [subscribeUpdates, setSubscribeUpdates] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const effectiveAmount = customAmount ? Number(customAmount) : amount;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!effectiveAmount || effectiveAmount < 50) {
      setError('Please enter at least ₱50.');
      return;
    }
    if (!email.trim()) {
      setError('An email is required — it\'s where your receipt goes.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/create-donation-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amountPhp: effectiveAmount,
          email: email.trim(),
          displayName: displayName.trim(),
          message: message.trim(),
          showName,
          subscribeUpdates,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error || 'Something went wrong. Please try again.');
        setSubmitting(false);
        return;
      }
      window.location.href = data.checkoutUrl;
    } catch {
      setError('Could not reach the server. Please check your connection and try again.');
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-[#eee3ce] rounded-2xl p-6 sm:p-8 shadow-sm">
      <p className="text-[10px] tracking-[0.2em] font-bold text-[#a3610c] uppercase mb-2">Choose an amount</p>
      <div className="grid grid-cols-4 gap-2 mb-3">
        {QUICK_AMOUNTS.map((amt) => (
          <button
            key={amt}
            type="button"
            onClick={() => { setAmount(amt); setCustomAmount(''); }}
            className={`py-2.5 rounded-lg text-sm font-bold border transition-colors ${
              amount === amt && !customAmount
                ? 'bg-[#c9781a] border-[#c9781a] text-white'
                : 'bg-[#faf7f1] border-[#eee3ce] text-[#2b2417] hover:border-[#c9781a]'
            }`}
          >
            ₱{amt}
          </button>
        ))}
      </div>
      <div className="relative mb-6">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#948975] text-sm font-medium">₱</span>
        <input
          type="number"
          min={50}
          max={50000}
          placeholder="Or enter your own amount"
          value={customAmount}
          onChange={(e) => setCustomAmount(e.target.value)}
          className="w-full pl-7 pr-3 py-2.5 rounded-lg border border-[#eee3ce] text-sm focus:outline-none focus:border-[#c9781a]"
        />
      </div>

      <div className="space-y-3 mb-4">
        <input
          type="email"
          required
          placeholder="Your email (for your receipt)"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-3 py-2.5 rounded-lg border border-[#eee3ce] text-sm focus:outline-none focus:border-[#c9781a]"
        />
        <input
          type="text"
          placeholder="Your name (optional)"
          maxLength={60}
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className="w-full px-3 py-2.5 rounded-lg border border-[#eee3ce] text-sm focus:outline-none focus:border-[#c9781a]"
        />
        <textarea
          placeholder="A short message of support (optional)"
          maxLength={240}
          rows={2}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full px-3 py-2.5 rounded-lg border border-[#eee3ce] text-sm focus:outline-none focus:border-[#c9781a] resize-none"
        />
      </div>

      <div className="space-y-2 mb-6">
        <label className="flex items-start gap-2 text-sm text-[#5c5245] cursor-pointer">
          <input
            type="checkbox"
            checked={showName}
            onChange={(e) => setShowName(e.target.checked)}
            className="mt-0.5"
          />
          Show my name and message on the supporter wall
        </label>
        <label className="flex items-start gap-2 text-sm text-[#5c5245] cursor-pointer">
          <input
            type="checkbox"
            checked={subscribeUpdates}
            onChange={(e) => setSubscribeUpdates(e.target.checked)}
            className="mt-0.5"
          />
          Send me occasional emails on app development and progress
        </label>
      </div>

      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="w-full py-3 rounded-full text-sm font-bold uppercase tracking-wide bg-[#c9781a] hover:bg-[#b3690f] disabled:opacity-60 text-white transition-colors"
      >
        {submitting ? 'Redirecting…' : `Support with ₱${effectiveAmount || 0}`}
      </button>
      <p className="text-[11px] text-[#948975] text-center mt-3">
        Secure checkout via PayMongo. GCash, Maya, and cards accepted.
      </p>
    </form>
  );
}
