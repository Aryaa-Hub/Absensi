"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

export default function AdminDashboardPage() {
  const router = useRouter();
  const [attendances, setAttendances] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"attendances" | "locations">("attendances");

  const [search, setSearch] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);

  useEffect(() => {
    loadData();
  }, [selectedDate]);

  async function loadData() {
    setLoading(true);
    try {
      const [attRes, locRes] = await Promise.all([
        api.get(`/admin/attendances?date=${selectedDate}&search=${search}`),
        api.get("/admin/locations"),
      ]);
      setAttendances(attRes.data.data || []);
      setLocations(locRes.data || []);
    } catch (err) {
      console.error("Gagal memuat data admin:", err);
    } finally {
      setLoading(false);
    }
  }

  const handleExportCsv = () => {
    const token = localStorage.getItem("auth_token");
    const exportUrl = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api"}/admin/export-csv?token=${token}`;
    window.open(exportUrl, "_blank");
  };

  return (
    <div className="p-3 pb-5">
      {/* Header Admin */}
      <div className="d-flex align-items-center justify-content-between mb-3">
        <div className="d-flex align-items-center">
          <button
            type="button"
            className="btn btn-light rounded-circle me-2 shadow-sm"
            onClick={() => router.push("/")}
            style={{ width: "38px", height: "38px" }}
          >
            <i className="bi bi-arrow-left"></i>
          </button>
          <div>
            <h5 className="fw-bold mb-0 text-danger">Panel Admin KCIC</h5>
            <div className="text-muted" style={{ fontSize: "11px" }}>
              Pemantauan Kehadiran & Lokasi Geofence
            </div>
          </div>
        </div>
        <button
          type="button"
          className="btn btn-sm btn-outline-success fw-semibold"
          onClick={handleExportCsv}
        >
          <i className="bi bi-file-earmark-spreadsheet-fill me-1"></i> Unduh CSV
        </button>
      </div>

      {/* Nav Tabs */}
      <div className="d-flex bg-white p-1 rounded-3 shadow-sm mb-3">
        <button
          type="button"
          className={`btn btn-sm w-50 fw-semibold rounded-2 ${
            activeTab === "attendances" ? "btn-danger" : "btn-light text-secondary"
          }`}
          onClick={() => setActiveTab("attendances")}
        >
          <i className="bi bi-people-fill me-1"></i> Data Absensi
        </button>
        <button
          type="button"
          className={`btn btn-sm w-50 fw-semibold rounded-2 ${
            activeTab === "locations" ? "btn-danger" : "btn-light text-secondary"
          }`}
          onClick={() => setActiveTab("locations")}
        >
          <i className="bi bi-geo-alt-fill me-1"></i> Zona KCIC ({locations.length})
        </button>
      </div>

      {activeTab === "attendances" ? (
        <div>
          {/* Filter Tanggal & Pencarian */}
          <div className="card mobile-card p-3 mb-3 bg-white">
            <div className="row g-2">
              <div className="col-6">
                <input
                  type="date"
                  className="form-control form-control-sm bg-light"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
              </div>
              <div className="col-6">
                <input
                  type="text"
                  placeholder="Cari nama karyawan..."
                  className="form-control form-control-sm bg-light"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && loadData()}
                />
              </div>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-danger" role="status"></div>
            </div>
          ) : attendances.length === 0 ? (
            <div className="card mobile-card p-5 text-center bg-white">
              <i className="bi bi-inbox fs-1 text-muted mb-2"></i>
              <h6 className="fw-bold">Tidak Ada Data</h6>
              <p className="text-muted small mb-0">Belum ada absensi pada tanggal ini.</p>
            </div>
          ) : (
            <div className="d-flex flex-column gap-3">
              {attendances.map((att) => (
                <div key={att.id} className="card mobile-card p-3 bg-white">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <div>
                      <div className="fw-bold text-dark">{att.user?.name}</div>
                      <div className="text-muted" style={{ fontSize: "11px" }}>
                        {att.user?.department || "KCIC"} • {att.user?.email}
                      </div>
                    </div>
                    <span
                      className={`badge px-2 py-1 ${
                        att.status === "complete"
                          ? "bg-success bg-opacity-10 text-success"
                          : "bg-warning bg-opacity-10 text-warning"
                      }`}
                    >
                      {att.status === "complete" ? "Lengkap" : "Belum Pulang"}
                    </span>
                  </div>

                  <div className="row g-2 small text-secondary bg-light p-2 rounded-2">
                    <div className="col-6">
                      <span className="text-muted" style={{ fontSize: "10px" }}>Masuk:</span>{" "}
                      <span className="fw-semibold text-dark">
                        {att.clock_in_at
                          ? new Date(att.clock_in_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
                          : "-"}
                      </span>
                      <div className="text-muted" style={{ fontSize: "10px" }}>
                        {att.clock_in_location?.name || "-"}
                      </div>
                    </div>
                    <div className="col-6">
                      <span className="text-muted" style={{ fontSize: "10px" }}>Pulang:</span>{" "}
                      <span className="fw-semibold text-dark">
                        {att.clock_out_at
                          ? new Date(att.clock_out_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
                          : "-"}
                      </span>
                      <div className="text-muted" style={{ fontSize: "10px" }}>
                        {att.clock_out_location?.name || "-"}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Tab Daftar Zona KCIC */
        <div className="d-flex flex-column gap-3">
          {locations.map((loc) => (
            <div key={loc.id} className="card mobile-card p-3 bg-white">
              <div className="d-flex justify-content-between align-items-center mb-1">
                <span className="fw-bold text-dark">{loc.name}</span>
                <span className="badge bg-danger bg-opacity-10 text-danger">
                  Radius {loc.radius_meters}m
                </span>
              </div>
              <div className="text-muted small" style={{ fontSize: "11px" }}>
                Koordinat: {loc.latitude}, {loc.longitude}
              </div>
              <div className="text-muted small" style={{ fontSize: "10px" }}>
                Status: <span className="text-success fw-semibold">Aktif (Masuk & Pulang)</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
