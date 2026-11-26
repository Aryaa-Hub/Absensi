"use client";

import React, { useEffect, useRef, useState } from "react";

interface CameraAttendanceProps {
  userName: string;
  userEmail: string;
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  locationName?: string;
  onPhotoCaptured: (photoBase64: string) => void;
  onCancel: () => void;
  actionTitle: "Absen Masuk" | "Absen Pulang";
}

export default function CameraAttendance({
  userName,
  userEmail,
  latitude,
  longitude,
  accuracy,
  locationName = "Mendeteksi Zona KCIC...",
  onPhotoCaptured,
  onCancel,
  actionTitle,
}: CameraAttendanceProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<string>("");

  // Update jam real-time setiap detik
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleDateString("id-ID", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }) + " " + now.toLocaleTimeString("id-ID", { hour12: false }) + " WIB"
      );
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Nyalakan kamera depan (getUserMedia)
  useEffect(() => {
    async function startCamera() {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (err: any) {
        console.error("Gagal akses kamera:", err);
        setCameraError(
          "Izin kamera ditolak atau tidak ditemukan. Mohon izinkan akses kamera di browser Anda."
        );
      }
    }

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Fungsi Jepret Foto & Bakar (Burn-in) Watermark Teks ke Canvas
  const capturePhoto = () => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 720;
    canvas.height = video.videoHeight || 960;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // 1. Gambar frame video webcam ke canvas (cermin/mirror agar selfie natural)
    ctx.save();
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    ctx.restore();

    // 2. Gambar background gradient transparan di bagian bawah untuk watermark
    const overlayHeight = 160;
    const gradient = ctx.createLinearGradient(
      0,
      canvas.height - overlayHeight,
      0,
      canvas.height
    );
    gradient.addColorStop(0, "rgba(0, 0, 0, 0)");
    gradient.addColorStop(0.3, "rgba(0, 0, 0, 0.7)");
    gradient.addColorStop(1, "rgba(0, 0, 0, 0.95)");

    ctx.fillStyle = gradient;
    ctx.fillRect(0, canvas.height - overlayHeight, canvas.width, overlayHeight);

    // 3. Bakar (Burn-in) Informasi Resmi Absensi ke Pixel Foto
    const padX = 24;
    let textY = canvas.height - overlayHeight + 45;

    ctx.fillStyle = "#F59E0B"; // Warna Emas KCIC
    ctx.font = "bold 20px system-ui, sans-serif";
    ctx.fillText("PT KERETA CEPAT INDONESIA CHINA (KCIC)", padX, textY);

    textY += 28;
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 22px system-ui, sans-serif";
    ctx.fillText(`${userName} (${userEmail})`, padX, textY);

    textY += 25;
    ctx.fillStyle = "#E2E8F0";
    ctx.font = "16px system-ui, sans-serif";
    ctx.fillText(`🕒 Waktu: ${currentTime}`, padX, textY);

    textY += 24;
    const coordText = latitude && longitude
      ? `📍 GPS: ${latitude.toFixed(6)}, ${longitude.toFixed(6)} (Akurasi: ±${Math.round(accuracy || 0)}m)`
      : "📍 GPS: Mendeteksi...";
    ctx.fillText(coordText, padX, textY);

    textY += 22;
    ctx.fillStyle = "#34D399"; // Hijau indikator
    ctx.font = "bold 15px system-ui, sans-serif";
    ctx.fillText(`🏢 Zona: ${locationName}`, padX, textY);

    // 4. Kompresi gambar ke JPEG (kualitas 0.85 = ~300-500 KB)
    const photoDataUrl = canvas.toDataURL("image/jpeg", 0.85);
    setCapturedPhoto(photoDataUrl);
  };

  const handleRetake = () => {
    setCapturedPhoto(null);
  };

  const handleConfirm = () => {
    if (capturedPhoto) {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      onPhotoCaptured(capturedPhoto);
    }
  };

  return (
    <div className="card mobile-card p-3 shadow-lg bg-white">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h6 className="fw-bold m-0 text-danger">
          <i className="bi bi-camera-fill me-2"></i>
          {actionTitle} — Selfie & GPS
        </h6>
        <button
          type="button"
          className="btn-close"
          aria-label="Close"
          onClick={onCancel}
        ></button>
      </div>

      {cameraError ? (
        <div className="alert alert-danger p-3 small mb-0">
          <i className="bi bi-exclamation-triangle-fill me-2"></i>
          {cameraError}
        </div>
      ) : (
        <div>
          {/* Layar Pratinjau Kamera / Foto Terjepret */}
          <div className="camera-preview-container position-relative mb-3">
            {!capturedPhoto ? (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-100 h-100"
                  style={{ objectFit: "cover", transform: "scaleX(-1)" }}
                />
                <div className="face-guide-box"></div>
                <div className="camera-overlay-watermark">
                  <div className="fw-bold text-warning small">
                    PT KERETA CEPAT INDONESIA CHINA
                  </div>
                  <div className="fw-semibold text-white">{userName}</div>
                  <div className="text-light">{currentTime}</div>
                  <div className="text-light">
                    📍 {latitude ? `${latitude.toFixed(5)}, ${longitude?.toFixed(5)}` : "Mencari GPS..."}
                  </div>
                </div>
              </>
            ) : (
              <img
                src={capturedPhoto}
                alt="Captured Selfie"
                className="w-100 h-100"
                style={{ objectFit: "cover" }}
              />
            )}
          </div>

          {/* Tombol Aksi */}
          {!capturedPhoto ? (
            <button
              type="button"
              className="btn btn-kcic-primary w-100 py-3 d-flex align-items-center justify-content-center"
              onClick={capturePhoto}
            >
              <i className="bi bi-camera-fill fs-5 me-2"></i>
              Ambil Foto Selfie
            </button>
          ) : (
            <div className="d-flex gap-2">
              <button
                type="button"
                className="btn btn-outline-secondary w-50 py-2 fw-semibold"
                onClick={handleRetake}
              >
                <i className="bi bi-arrow-repeat me-1"></i> Ulangi
              </button>
              <button
                type="button"
                className="btn btn-kcic-primary w-50 py-2 fw-semibold"
                onClick={handleConfirm}
              >
                <i className="bi bi-send-check-fill me-1"></i> Kirim Absen
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
