"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage("");

    try {
      const res = await api.post("/auth/login", { email, password });
      const { token, user } = res.data;

      localStorage.setItem("auth_token", token);
      localStorage.setItem("user_data", JSON.stringify(user));

      if (user.role === "admin") {
        router.push("/admin");
      } else {
        router.push("/");
      }
    } catch (err: any) {
      console.error("Login error:", err);
      setErrorMessage(
        err.response?.data?.message || "Email atau password yang Anda masukkan salah."
      );
    } finally {
      setLoading(false);
    }
  };

  const fillDemoAccount = (role: "admin" | "magang") => {
    if (role === "admin") {
      setEmail("admin@kcic.id");
      setPassword("password123");
    } else {
      setEmail("karyawan@kcic.id");
      setPassword("password123");
    }
  };

  return (
    <div className="p-3 d-flex flex-column justify-content-center" style={{ minHeight: "100vh" }}>
      <div className="card mobile-card p-4 shadow-sm bg-white">
        {/* Logo / Header */}
        <div className="text-center mb-4">
          <div
            className="d-inline-flex align-items-center justify-content-center bg-danger bg-opacity-10 text-danger rounded-circle mb-3"
            style={{ width: "68px", height: "68px" }}
          >
            <i className="bi bi-camera-fill fs-2"></i>
          </div>
          <h4 className="fw-bold mb-1 text-danger">Absensi KCIC</h4>
          <p className="text-muted small mb-0">
            Sistem Absensi Karyawan & Magang Berbasis Foto & GPS
          </p>
        </div>

        {errorMessage && (
          <div className="alert alert-danger py-2 px-3 small d-flex align-items-center mb-3">
            <i className="bi bi-exclamation-circle-fill me-2"></i>
            <div>{errorMessage}</div>
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div className="mb-3">
            <label className="form-label small fw-semibold text-secondary">
              Email Perusahaan / ID
            </label>
            <div className="input-group">
              <span className="input-group-text bg-light border-end-0 text-muted">
                <i className="bi bi-envelope"></i>
              </span>
              <input
                type="email"
                required
                className="form-control border-start-0 ps-0 bg-light"
                placeholder="nama@kcic.id"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="form-label small fw-semibold text-secondary">
              Kata Sandi
            </label>
            <div className="input-group">
              <span className="input-group-text bg-light border-end-0 text-muted">
                <i className="bi bi-lock"></i>
              </span>
              <input
                type="password"
                required
                className="form-control border-start-0 ps-0 bg-light"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-kcic-primary w-100 py-3 d-flex align-items-center justify-content-center"
          >
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                Memproses...
              </>
            ) : (
              <>
                <i className="bi bi-box-arrow-in-right me-2 fs-5"></i>
                Masuk ke Aplikasi
              </>
            )}
          </button>
        </form>

        {/* Quick Demo Credentials */}
        <div className="mt-4 pt-3 border-top text-center">
          <p className="text-muted" style={{ fontSize: "11px" }}>
            Akun Cepat untuk Uji Coba:
          </p>
          <div className="d-flex justify-content-center gap-2">
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              onClick={() => fillDemoAccount("magang")}
            >
              <i className="bi bi-person me-1"></i> Magang KCIC
            </button>
            <button
              type="button"
              className="btn btn-sm btn-outline-danger"
              onClick={() => fillDemoAccount("admin")}
            >
              <i className="bi bi-shield-lock me-1"></i> Admin KCIC
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
