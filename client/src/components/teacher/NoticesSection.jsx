import { useMemo } from "react";

export default function NoticesSection({ notices, loading, error, onRefresh, onMarkRead }) {
  const unreadCount = useMemo(() => (notices || []).filter((n) => !n.read).length, [notices]);

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Notices</h2>
          <p className="text-sm text-secondary">Unread: {unreadCount}</p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="px-4 py-2 rounded-full text-sm font-semibold bg-surface-container-high text-secondary"
        >
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      {error ? <p className="text-sm text-error bg-error-container px-4 py-2 rounded-lg">{error}</p> : null}
      {!loading && (!notices || notices.length === 0) ? <p className="text-sm text-secondary">No notices.</p> : null}

      <ul className="space-y-4">
        {(notices || []).map((n) => (
          <li key={n.id} className="p-4 bg-surface-container-high rounded-lg border">
            <div className="flex justify-between items-start">
              <div className="min-w-0">
                <h3 className="font-semibold truncate">{n.title}</h3>
                <p className="text-sm text-secondary mt-1 whitespace-pre-wrap">{n.body}</p>
                <div className="text-xs text-secondary mt-2">
                  From: {n.author?.name || "Admin"} • {new Date(n.createdAt).toLocaleString()}
                </div>
              </div>
              <div className="ml-4">
                {n.read ? (
                  <span className="text-xs text-secondary">Read</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => onMarkRead(n.id)}
                    className="px-3 py-1 rounded bg-primary text-on-primary text-sm"
                  >
                    Mark read
                  </button>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
