"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import CameraAttendance from "@/components/CameraAttendance";

export default function AttendanceDashboard() {
  const router = useRouter();

  // User State
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Status Absensi Hari Ini
  const [attendanceData, setAttendanceData] = useState<any>(null);
  const [canClockIn, setCanClockIn] = useState(false);
  const [canClockOut, setCanClockOut] = useState(false);
  const [countdownSeconds, setCountdownSeconds] = useState<number>(0);
  const [serverTime, setServerTime] = useState<string>("");

  // GPS State
  const [gps, setGps] = useState<{
    latitude: number | null;
    longitude: number | null;
    accuracy: number | null;
    error: string | null;
  }>({
    latitude: null,
    longitude: null,
    accuracy: null,
    error: null,
  });

  // Modal Kamera
  const [activeCameraAction, setActiveCameraAction] = useState<"Absen Masuk" | "Absen Pulang" | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: "success" | "danger"; text: string } | null>(null);

  // 1. Cek Sesi Login User
  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    const storedUser = localStorage.getItem("user_data");

    if (!token || !storedUser) {
      router.push("/login");
      return;
    }

    try {
      setUser(JSON.parse(storedUser));
    } catch {
      router.push("/login");
    }
  }, [router]);

  // 2. Fetch Data Absensi Hari Ini dari Server
  const fetchTodayAttendance = async () => {
    try {
      setLoading(true);
      const res = await api.get("/attendance/today");
      const { attendance, can_clock_in, can_clock_out, remaining_seconds_until_clock_out, server_time_formatted } = res.data;

      setAttendanceData(attendance);
      setCanClockIn(can_clock_in);
      setCanClockOut(can_clock_out);
      setCountdownSeconds(remaining_seconds_until_clock_out || 0);
      setServerTime(server_time_formatted);
    } catch (err) {
      console.error("Gagal memuat absensi hari ini:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchTodayAttendance();
    }
  }, [user]);

  // 3. Hitung Mundur Pengunci 9 Jam (Countdown)
  useEffect(() => {
    if (countdownSeconds <= 0) {
      if (attendanceData && !attendanceData.clock_out_at) {
        setCanClockOut(true);
      }
      return;
    }

    const timer = setInterval(() => {
      setCountdownSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setCanClockOut(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [countdownSeconds, attendanceData]);

  // 4. GPS Geolocation Watcher
  useEffect(() => {
    if (!navigator.geolocation) {
      setGps((prev) => ({ ...prev, error: "Geolocation tidak didukung browser ini." }));
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setGps({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          error: null,
        });
      },
      (err) => {
        console.warn("GPS Warning:", err.message);
        setGps((prev) => ({ ...prev, error: "Izin lokasi diperlukan untuk absensi." }));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000,
      }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // Format Jam dari Detik (Contoh: "03 jam 14 mnt 20 dtk")
  const formatCountdown = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, "0")}j ${minutes.toString().padStart(2, "0")}m ${seconds.toString().padStart(2, "0")}d`;
  };

  // Handler Kirim Foto Absen Masuk / Pulang
  const handlePhotoCaptured = async (photoBase64: string) => {
    if (!gps.latitude || !gps.longitude) {
      alert("Koordinat GPS belum siap. Pastikan izin lokasi aktif.");
      return;
    }

    setSubmitLoading(true);
    setFeedbackMessage(null);

    const endpoint = activeCameraAction === "Absen Masuk" ? "/attendance/clock-in" : "/attendance/clock-out";

    try {
      const res = await api.post(endpoint, {
        photo: photoBase64,
        latitude: gps.latitude,
        longitude: gps.longitude,
        accuracy: gps.accuracy || 20,
      });

      setFeedbackMessage({ type: "success", text: res.data.message });
      setActiveCameraAction(null);
      await fetchTodayAttendance();
    } catch (err: any) {
      console.error("Gagal submit absen:", err);
      const msg = err.response?.data?.message || "Gagal melakukan absensi. Silakan coba kembali.";
      setFeedbackMessage({ type: "danger", text: msg });
      setActiveCameraAction(null);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout");
    } catch {}
    localStorage.removeItem("auth_token");
    localStorage.removeItem("user_data");
    router.push("/login");
  };

  if (!user || loading) {
    return (
      <div className="d-flex align-items-center justify-content-center p-5" style={{ minHeight: "80vh" }}>
        <div className="spinner-border text-danger" role="status">
          <span className="visually-hidden">Memuat data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 pb-5">
      {/* Header Profil User */}
      <div className="card mobile-card p-3 mb-3 bg-white">
        <div className="d-flex align-items-center justify-content-between">
          <div className="d-flex align-items-center">
            <div
              className="bg-danger text-white rounded-circle d-flex align-items-center justify-content-center fw-bold me-3 shadow-sm"
              style={{ width: "48px", height: "48px", fontSize: "18px" }}
            >
              {user.name.charAt(0)}
            </div>
            <div>
              <h6 className="fw-bold mb-0 text-dark">{user.name}</h6>
              <div className="d-flex align-items-center gap-1 mt-1">
                <span className="badge bg-danger bg-opacity-10 text-danger text-uppercase px-2" style={{ fontSize: "10px" }}>
                  {user.role}
                </span>
                <span className="text-muted small" style={{ fontSize: "11px" }}>
                  • {user.department || "KCIC"}
                </span>
              </div>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary rounded-circle"
            title="Keluar"
            onClick={handleLogout}
            style={{ width: "36px", height: "36px" }}
          >
            <i className="bi bi-box-arrow-right"></i>
          </button>
        </div>
      </div>

      {/* Pesan Sukses / Error Notifikasi */}
      {feedbackMessage && (
        <div className={`alert alert-${feedbackMessage.type} alert-dismissible fade show p-3 small mb-3`} role="alert">
          <div className="d-flex align-items-center">
            <i className={`bi ${feedbackMessage.type === "success" ? "bi-check-circle-fill text-success" : "bi-exclamation-triangle-fill text-danger"} me-2 fs-5`}></i>
            <div className="fw-semibold">{feedbackMessage.text}</div>
          </div>
          <button type="button" className="btn-close" onClick={() => setFeedbackMessage(null)}></button>
        </div>
      )}

      {/* GPS & Status Zona KCIC */}
      <div className="card mobile-card p-3 mb-3 bg-white">
        <div className="d-flex align-items-center justify-content-between mb-2">
          <span className="text-muted small fw-semibold">
            <i className="bi bi-geo-alt-fill text-danger me-1"></i> Status GPS & Geofence
          </span>
          <span className="badge bg-success bg-opacity-10 text-success px-2 py-1" style={{ fontSize: "10px" }}>
            Akurasi ±{gps.accuracy ? Math.round(gps.accuracy) : 0}m
          </span>
        </div>
        {gps.error ? (
          <div className="text-danger small">{gps.error}</div>
        ) : (
          <div className="small text-secondary">
            {gps.latitude && gps.longitude ? (
              <div className="d-flex justify-content-between">
                <span>Lat: {gps.latitude.toFixed(5)}</span>
                <span>Lng: {gps.longitude.toFixed(5)}</span>
              </div>
            ) : (
              <span>Mencari koordinat GPS satelit...</span>
            )}
          </div>
        )}
      </div>

      {/* Modal Kamera Selfie Live (Jika Tombol Absen Ditekan) */}
      {activeCameraAction && (
        <div className="mb-3">
          <CameraAttendance
            userName={user.name}
            userEmail={user.email}
            latitude={gps.latitude}
            longitude={gps.longitude}
            accuracy={gps.accuracy}
            actionTitle={activeCameraAction}
            onPhotoCaptured={handlePhotoCaptured}
            onCancel={() => setActiveCameraAction(null)}
          />
        </div>
      )}

      {/* Kartu Status Absensi Hari Ini */}
      {!activeCameraAction && (
        <div className="card mobile-card p-4 mb-3 bg-white text-center">
          <span className="text-muted small fw-semibold text-uppercase">
            Sesi Kehadiran Hari Ini
          </span>

          {/* Kondisi 1: Belum Absen Masuk */}
          {canClockIn && (
            <div className="py-4">
              <div className="display-6 fw-bold text-dark mb-1">
                {serverTime ? serverTime.split(" ")[1] : "08:00:00"}
              </div>
              <p className="text-muted small mb-4">
                Waktu Resmi Server WIB
              </p>
              <button
                type="button"
                className="btn btn-kcic-primary w-100 py-3 shadow"
                onClick={() => setActiveCameraAction("Absen Masuk")}
                disabled={submitLoading || !gps.latitude}
              >
                <i className="bi bi-camera-fill fs-5 me-2"></i>
                Absen Masuk Sekarang
              </button>
              <p className="text-muted mt-2 mb-0" style={{ fontSize: "11px" }}>
                Durasi kerja wajib 9 jam terhitung setelah foto terverifikasi.
              </p>
            </div>
          )}

          {/* Kondisi 2: Sudah Absen Masuk, Sedang Menghitung 9 Jam */}
          {attendanceData && !attendanceData.clock_out_at && (
            <div className="py-3">
              <div className="badge bg-primary bg-opacity-10 text-primary px-3 py-2 rounded-pill mb-3">
                <i className="bi bi-clock-history me-1"></i> Masuk:{" "}
                {new Date(attendanceData.clock_in_at).toLocaleTimeString("id-ID", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}{" "}
                WIB
              </div>

              {/* Hitung Mundur Pengunci 9 Jam */}
              {!canClockOut ? (
                <div className="my-3 p-3 bg-light rounded-4">
                  <div className="text-muted small fw-semibold mb-1">
                    🔒 Absen Pulang Terkunci
                  </div>
                  <div className="display-6 fw-bold text-danger my-1">
                    {formatCountdown(countdownSeconds)}
                  </div>
                  <div className="text-secondary small" style={{ fontSize: "12px" }}>
                    Dapat dibuka pukul{" "}
                    <b>
                      {new Date(attendanceData.earliest_clock_out_at).toLocaleTimeString("id-ID", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}{" "}
                      WIB
                    </b>
                  </div>
                </div>
              ) : (
                <div className="alert alert-success py-2 px-3 small my-3">
                  <i className="bi bi-check-circle-fill me-1"></i> Durasi 9 jam telah terpenuhi! Silakan absen pulang.
                </div>
              )}

              {/* Tombol Absen Pulang */}
              <button
                type="button"
                className={`btn w-100 py-3 fw-bold ${canClockOut ? "btn-kcic-primary shadow" : "btn-secondary"}`}
                disabled={!canClockOut || submitLoading}
                onClick={() => setActiveCameraAction("Absen Pulang")}
              >
                <i className="bi bi-box-arrow-right fs-5 me-2"></i>
                {canClockOut ? "Absen Pulang Sekarang" : "Absen Pulang (Terkunci)"}
              </button>
            </div>
          )}

          {/* Kondisi 3: Sudah Absen Pulang (Lengkap Hari Ini) */}
          {attendanceData && attendanceData.clock_out_at && (
            <div className="py-4">
              <div
                className="d-inline-flex align-items-center justify-content-center bg-success bg-opacity-10 text-success rounded-circle mb-3"
                style={{ width: "64px", height: "64px" }}
              >
                <i className="bi bi-check2-circle fs-1"></i>
              </div>
              <h5 className="fw-bold text-success mb-1">Absensi Lengkap Hari Ini!</h5>
              <p className="text-muted small mb-3">
                Total jam kerja:{" "}
                <b>
                  {Math.floor(attendanceData.total_work_minutes / 60)} jam{" "}
                  {attendanceData.total_work_minutes % 60} menit
                </b>
              </p>
              <div className="p-3 bg-light rounded-3 text-start small">
                <div className="d-flex justify-content-between mb-1">
                  <span className="text-muted">Masuk:</span>
                  <span className="fw-semibold">
                    {new Date(attendanceData.clock_in_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} WIB
                  </span>
                </div>
                <div className="d-flex justify-content-between">
                  <span className="text-muted">Pulang:</span>
                  <span className="fw-semibold">
                    {new Date(attendanceData.clock_out_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} WIB
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tombol Menu Bawah (Riwayat / Dashboard Admin) */}
      <div className="d-flex gap-2">
        <button
          type="button"
          className="btn btn-outline-secondary w-100 py-2 fw-semibold rounded-3"
          onClick={() => router.push("/history")}
        >
          <i className="bi bi-calendar3 me-1"></i> Riwayat Absen
        </button>
        {user.role === "admin" && (
          <button
            type="button"
            className="btn btn-outline-danger w-100 py-2 fw-semibold rounded-3"
            onClick={() => router.push("/admin")}
          >
            <i className="bi bi-speedometer2 me-1"></i> Panel Admin
          </button>
        )}
      </div>
    </div>
  );
}
