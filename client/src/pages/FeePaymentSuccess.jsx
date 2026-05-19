import { useNavigate } from "react-router-dom";

export default function FeePaymentSuccess() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-on-surface flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border bg-surface-container-high p-6 md:p-8 text-center space-y-4">
        <div className="text-3xl">Payment Successful</div>
        <p className="text-sm text-secondary">
          Your fee has been recorded. You can return to the dashboard to view the updated status.
        </p>
        <button
          type="button"
          onClick={() => navigate("/student")}
          className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary"
        >
          Back to Dashboard
        </button>
      </div>
    </div>
  );
}
