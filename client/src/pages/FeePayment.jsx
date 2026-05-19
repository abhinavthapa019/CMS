import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../state/useAuth.jsx";

export default function FeePayment() {
  const { feeId } = useParams();
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const [fee, setFee] = useState(null);
  const [student, setStudent] = useState(null);
  const [amount, setAmount] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const parsedFeeId = useMemo(() => Number(feeId), [feeId]);

  useEffect(() => {
    if (!token || !Number.isInteger(parsedFeeId)) return;
    setLoading(true);
    api(`/api/fees/${parsedFeeId}`, { token })
      .then((res) => {
        setFee(res.fee);
        setStudent(res.student);
        setAmount(String(res.fee?.amount ?? ""));
      })
      .catch((e) => setError(e.message || "Failed to load fee"))
      .finally(() => setLoading(false));
  }, [token, parsedFeeId]);

  const canSubmit = !submitting && fee && amount && password;

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError("Enter a valid amount.");
      return;
    }

    if (!password) {
      setError("Enter the payment password.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await api(`/api/fees/${parsedFeeId}/direct-pay`, {
        token,
        method: "POST",
        body: { amount: numericAmount, password },
      });
      setFee(res.fee);
      setSuccess(true);
      navigate("/student/fees/success");
    } catch (e) {
      setError(e.message || "Payment failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-on-surface flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-xl rounded-2xl border bg-surface-container-high p-6 md:p-8 shadow-sm">
        <div className="flex flex-col gap-2 mb-6">
          <h1 className="text-2xl font-bold">Fee Payment</h1>
          <p className="text-sm text-secondary">Complete your fee payment in one step.</p>
        </div>

        {loading ? <p className="text-secondary">Loading payment details...</p> : null}
        {error ? <div className="mb-4 rounded-lg border border-error bg-error/10 px-4 py-2 text-sm text-error">{error}</div> : null}
        {success ? (
          <div className="mb-4 rounded-lg border border-primary/40 bg-primary/10 px-4 py-3 text-sm text-on-surface">
            Payment completed successfully.
          </div>
        ) : null}

        {!loading && fee ? (
          <div className="space-y-6">
            <div className="rounded-xl border bg-white/5 p-4">
              <div className="text-xs uppercase text-secondary">Student Summary</div>
              <div className="mt-2 text-sm">
                <div className="font-semibold">{student ? `${student.firstName} ${student.lastName}` : user?.name}</div>
                <div className="text-secondary">Fee: {fee.title}</div>
                <div className="text-secondary">Current Status: {fee.status}</div>
              </div>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <label className="text-sm font-semibold">Amount</label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  className="w-full rounded-lg border bg-transparent px-3 py-2"
                  placeholder="Enter amount"
                />
                {fee?.amount ? (
                  <p className="text-xs text-secondary">Expected amount: {fee.amount}</p>
                ) : null}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full rounded-lg border bg-transparent px-3 py-2"
                  placeholder="Enter password"
                />
              </div>

              <button
                type="submit"
                disabled={!canSubmit}
                className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary disabled:opacity-60"
              >
                {submitting ? "Processing..." : "Confirm Payment"}
              </button>
            </form>

            <button
              type="button"
              onClick={() => navigate("/student")}
              className="w-full rounded-lg border px-4 py-2 text-sm font-semibold"
            >
              Back to Dashboard
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
