"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

export default function HistoryPage() {
  const router = useRouter();
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadHistory() {
      try {
        const res = await api.get("/attendance/history");
        setHistory(res.data.data || []);
      } catch (err) {
        console.error("Gagal memuat riwayat:", err);
      } finally {
        setLoading(false);
      }
    }
    loadHistory();
  }, []);

  return (
    <div className="p-3 pb-5">
      {/* Header */}
      <div className="d-flex align-items-center mb-3">
        <button
          type="button"
          className="btn btn-light rounded-circle me-2 shadow-sm"
          onClick={() => router.push("/")}
          style={{ width: "38px", height: "38px" }}
        >
          <i className="bi bi-arrow-left"></i>
        </button>
        <h5 className="fw-bold mb-0">Riwayat Kehadiran</h5>
      </div>

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-danger" role="status"></div>
        </div>
      ) : history.length === 0 ? (
        <div className="card mobile-card p-5 text-center bg-white">
          <i className="bi bi-calendar-x fs-1 text-muted mb-2"></i>
          <h6 className="fw-bold text-dark">Belum Ada Riwayat</h6>
          <p className="text-muted small mb-0">Catatan absensi harian Anda akan tampil di sini.</p>
        </div>
      ) : (
        <div className="d-flex flex-column gap-3">
          {history.map((item) => (
            <div key={item.id} className="card mobile-card p-3 bg-white">
              <div className="d-flex justify-content-between align-items-center border-bottom pb-2 mb-2">
                <span className="fw-bold text-dark">
                  {new Date(item.date).toLocaleDateString("id-ID", {
                    weekday: "long",
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
                <span
                  className={`badge px-2 py-1 ${
                    item.status === "complete"
                      ? "bg-success bg-opacity-10 text-success"
                      : "bg-warning bg-opacity-10 text-warning"
                  }`}
                >
                  {item.status === "complete" ? "Lengkap" : "Belum Pulang"}
                </span>
              </div>

              <div className="row g-2 small text-secondary">
                <div className="col-6">
                  <div className="text-muted" style={{ fontSize: "11px" }}>Absen Masuk</div>
                  <div className="fw-semibold text-dark">
                    {item.clock_in_at
                      ? new Date(item.clock_in_at).toLocaleTimeString("id-ID", {
                          hour: "2-digit",
                          minute: "2-digit",
                        }) + " WIB"
                      : "-"}
                  </div>
                  <div className="text-muted" style={{ fontSize: "10px" }}>
                    {item.clock_in_location?.name || "Zona KCIC"}
                  </div>
                </div>

                <div className="col-6">
                  <div className="text-muted" style={{ fontSize: "11px" }}>Absen Pulang</div>
                  <div className="fw-semibold text-dark">
                    {item.clock_out_at
                      ? new Date(item.clock_out_at).toLocaleTimeString("id-ID", {
                          hour: "2-digit",
                          minute: "2-digit",
                        }) + " WIB"
                      : "-"}
                  </div>
                  <div className="text-muted" style={{ fontSize: "10px" }}>
                    {item.clock_out_location?.name || "-"}
                  </div>
                </div>
              </div>

              {item.total_work_minutes && (
                <div className="mt-2 pt-2 border-top d-flex justify-content-between align-items-center small">
                  <span className="text-muted" style={{ fontSize: "11px" }}>Durasi Kerja:</span>
                  <span className="fw-bold text-danger">
                    {Math.floor(item.total_work_minutes / 60)}j {item.total_work_minutes % 60}m
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
