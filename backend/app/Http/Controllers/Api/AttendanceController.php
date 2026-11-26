<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\AuditLog;
use App\Services\GeofenceService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class AttendanceController extends Controller
{
    protected GeofenceService $geofenceService;

    public function __construct(GeofenceService $geofenceService)
    {
        $this->geofenceService = $geofenceService;
    }

    /**
     * Dapatkan status absensi user hari ini + waktu server resmi.
     */
    public function today(Request $request)
    {
        $user = $request->user();
        $now = Carbon::now('Asia/Jakarta');
        $todayDate = $now->toDateString();

        $attendance = Attendance::with(['clockInLocation', 'clockOutLocation'])
            ->where('user_id', $user->id)
            ->where('date', $todayDate)
            ->first();

        $canClockOut = false;
        $remainingSecondsUntilClockOut = 0;

        if ($attendance && $attendance->earliest_clock_out_at && !$attendance->clock_out_at) {
            $earliest = Carbon::parse($attendance->earliest_clock_out_at)->timezone('Asia/Jakarta');
            if ($now->greaterThanOrEqualTo($earliest)) {
                $canClockOut = true;
                $remainingSecondsUntilClockOut = 0;
            } else {
                $canClockOut = false;
                $remainingSecondsUntilClockOut = $now->diffInSeconds($earliest, false);
            }
        }

        return response()->json([
            'server_time' => $now->toIso8601String(),
            'server_time_formatted' => $now->format('d/m/Y H:i:s'),
            'today_date' => $todayDate,
            'attendance' => $attendance,
            'can_clock_in' => is_null($attendance),
            'can_clock_out' => $canClockOut,
            'remaining_seconds_until_clock_out' => max(0, $remainingSecondsUntilClockOut),
        ]);
    }

    /**
     * Absen Masuk (Clock In)
     */
    public function clockIn(Request $request)
    {
        $user = $request->user();
        $now = Carbon::now('Asia/Jakarta');
        $todayDate = $now->toDateString();

        $request->validate([
            'latitude' => 'required|numeric',
            'longitude' => 'required|numeric',
            'accuracy' => 'required|numeric',
            'photo' => 'required', // File upload atau base64 string
        ]);

        // 1. Cek apakah sudah absen hari ini
        $existing = Attendance::where('user_id', $user->id)
            ->where('date', $todayDate)
            ->first();

        if ($existing) {
            return response()->json([
                'message' => 'Anda sudah melakukan absen masuk untuk hari ini.',
            ], 422);
        }

        // 2. Cek akurasi GPS (FR-10: batas toleransi maksimum 50 meter)
        if ($request->accuracy > 50) {
            return response()->json([
                'message' => "Akurasi GPS Anda terlalu rendah ({$request->accuracy} meter). Harap pastikan berada di area terbuka dan coba kembali.",
            ], 422);
        }

        // 3. Validasi Geofence (FR-11: Kantor atau Stasiun KCIC atau Depo)
        $geoCheck = $this->geofenceService->validateUserLocation(
            (float) $request->latitude,
            (float) $request->longitude,
            'clock_in'
        );

        if (!$geoCheck['isValid']) {
            // Catat log audit percobaan di luar zona
            AuditLog::create([
                'user_id' => $user->id,
                'action' => 'CLOCK_IN_OUT_OF_ZONE',
                'description' => "Percobaan absen masuk di luar zona KCIC. Jarak terdekat ke {$geoCheck['nearestLocation']?->name}: {$geoCheck['nearestDistance']} meter.",
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
                'payload' => [
                    'latitude' => $request->latitude,
                    'longitude' => $request->longitude,
                    'accuracy' => $request->accuracy,
                ],
            ]);

            return response()->json([
                'message' => 'Kamu di luar area absen KCIC. Pindah ke zona yang diizinkan lalu coba lagi.',
                'nearest_location' => $geoCheck['nearestLocation']?->name,
                'distance_meters' => $geoCheck['nearestDistance'],
            ], 422);
        }

        // 4. Simpan foto selfie
        $photoPath = $this->saveAttendancePhoto($request->input('photo'), $request->file('photo'));

        // 5. Hitung batas paling awal absen pulang (FR-12: clock_in_time + work_duration)
        $durationMinutes = $user->work_duration_minutes ?? 540; // Default 9 jam = 540 menit
        $earliestClockOut = $now->copy()->addMinutes($durationMinutes);

        // 6. Simpan record absensi
        $attendance = Attendance::create([
            'user_id' => $user->id,
            'date' => $todayDate,
            'clock_in_at' => $now,
            'clock_in_latitude' => $request->latitude,
            'clock_in_longitude' => $request->longitude,
            'clock_in_accuracy' => $request->accuracy,
            'clock_in_photo_path' => $photoPath,
            'clock_in_location_id' => $geoCheck['location']->id,
            'clock_in_flag' => 'normal',
            'earliest_clock_out_at' => $earliestClockOut,
            'status' => 'incomplete',
        ]);

        return response()->json([
            'message' => "Absen masuk berhasil pukul {$now->format('H:i')}. Absen pulang dibuka pukul {$earliestClockOut->format('H:i')}.",
            'attendance' => $attendance->load('clockInLocation'),
            'earliest_clock_out' => $earliestClockOut->format('H:i'),
        ]);
    }

    /**
     * Absen Pulang (Clock Out)
     */
    public function clockOut(Request $request)
    {
        $user = $request->user();
        $now = Carbon::now('Asia/Jakarta');
        $todayDate = $now->toDateString();

        $request->validate([
            'latitude' => 'required|numeric',
            'longitude' => 'required|numeric',
            'accuracy' => 'required|numeric',
            'photo' => 'required',
        ]);

        // 1. Ambil absensi hari ini
        $attendance = Attendance::where('user_id', $user->id)
            ->where('date', $todayDate)
            ->first();

        if (!$attendance) {
            return response()->json([
                'message' => 'Anda belum melakukan absen masuk hari ini.',
            ], 422);
        }

        if ($attendance->clock_out_at) {
            return response()->json([
                'message' => 'Anda sudah melakukan absen pulang hari ini.',
            ], 422);
        }

        // 2. ATURAN KRITIS (FR-13 & FR-16): Server-Side Lockdown Waktu Pulang
        $earliest = Carbon::parse($attendance->earliest_clock_out_at)->timezone('Asia/Jakarta');
        if ($now->lessThan($earliest)) {
            $diffMinutes = $now->diffInMinutes($earliest, false);
            return response()->json([
                'message' => "Durasi kerja belum terpenuhi! Absen pulang baru bisa dilakukan pukul {$earliest->format('H:i')} WIB (kurang {$diffMinutes} menit lagi).",
                'earliest_clock_out' => $earliest->toIso8601String(),
            ], 403);
        }

        // 3. Cek akurasi GPS
        if ($request->accuracy > 50) {
            return response()->json([
                'message' => "Akurasi GPS Anda terlalu rendah ({$request->accuracy} meter). Harap coba kembali.",
            ], 422);
        }

        // 4. Validasi Geofence Pulang
        $geoCheck = $this->geofenceService->validateUserLocation(
            (float) $request->latitude,
            (float) $request->longitude,
            'clock_out'
        );

        if (!$geoCheck['isValid']) {
            AuditLog::create([
                'user_id' => $user->id,
                'action' => 'CLOCK_OUT_OUT_OF_ZONE',
                'description' => "Percobaan absen pulang di luar zona KCIC.",
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
                'payload' => [
                    'latitude' => $request->latitude,
                    'longitude' => $request->longitude,
                ],
            ]);

            return response()->json([
                'message' => 'Kamu di luar area absen KCIC. Pindah ke zona yang diizinkan lalu coba lagi.',
                'nearest_location' => $geoCheck['nearestLocation']?->name,
            ], 422);
        }

        // 5. Simpan foto selfie pulang
        $photoPath = $this->saveAttendancePhoto($request->input('photo'), $request->file('photo'));

        // 6. Hitung total durasi kerja
        $clockInTime = Carbon::parse($attendance->clock_in_at);
        $totalWorkMinutes = $clockInTime->diffInMinutes($now);

        // 7. Update status absensi jadi lengkap
        $attendance->update([
            'clock_out_at' => $now,
            'clock_out_latitude' => $request->latitude,
            'clock_out_longitude' => $request->longitude,
            'clock_out_accuracy' => $request->accuracy,
            'clock_out_photo_path' => $photoPath,
            'clock_out_location_id' => $geoCheck['location']->id,
            'clock_out_flag' => 'normal',
            'total_work_minutes' => $totalWorkMinutes,
            'status' => 'complete',
        ]);

        return response()->json([
            'message' => "Absen pulang berhasil pukul {$now->format('H:i')}. Total durasi kerja: " . floor($totalWorkMinutes / 60) . " jam " . ($totalWorkMinutes % 60) . " menit.",
            'attendance' => $attendance->fresh(['clockInLocation', 'clockOutLocation']),
        ]);
    }

    /**
     * Riwayat absensi user sendiri (kalender / list).
     */
    public function history(Request $request)
    {
        $user = $request->user();

        $attendances = Attendance::with(['clockInLocation', 'clockOutLocation'])
            ->where('user_id', $user->id)
            ->orderBy('date', 'desc')
            ->paginate(15);

        return response()->json($attendances);
    }

    /**
     * Helper untuk menyimpan file foto selfie.
     */
    protected function saveAttendancePhoto($base64Data, $uploadedFile): string
    {
        $filename = 'attendance_' . Str::random(24) . '_' . time() . '.jpg';
        $subFolder = 'attendance_photos/' . date('Y/m');

        if ($uploadedFile) {
            return $uploadedFile->storeAs($subFolder, $filename, 'public');
        }

        if (is_string($base64Data) && str_starts_with($base64Data, 'data:image')) {
            $base64Image = explode(',', $base64Data)[1];
            $imageData = base64_decode($base64Image);
            $fullPath = $subFolder . '/' . $filename;
            Storage::disk('public')->put($fullPath, $imageData);
            return $fullPath;
        }

        throw new \Exception('Format foto tidak valid.');
    }
}
