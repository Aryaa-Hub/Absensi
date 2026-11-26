<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\Location;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AdminController extends Controller
{
    /**
     * Daftar seluruh absensi dengan filter (tanggal, status, departemen, user).
     */
    public function attendances(Request $request)
    {
        $query = Attendance::with(['user', 'clockInLocation', 'clockOutLocation'])
            ->orderBy('date', 'desc')
            ->orderBy('clock_in_at', 'desc');

        if ($request->date) {
            $query->where('date', $request->date);
        }

        if ($request->status) {
            $query->where('status', $request->status);
        }

        if ($request->search) {
            $search = $request->search;
            $query->whereHas('user', function ($q) use ($search) {
                $q->where('name', 'ilike', "%{$search}%")
                  ->orWhere('email', 'ilike', "%{$search}%");
            });
        }

        return response()->json($query->paginate(20));
    }

    /**
     * Daftar dan kelola lokasi/zona geofence KCIC.
     */
    public function locations()
    {
        return response()->json(Location::orderBy('name')->get());
    }

    /**
     * Update radius / koordinat zona.
     */
    public function updateLocation(Request $request, $id)
    {
        $location = Location::findOrFail($id);

        $request->validate([
            'latitude' => 'required|numeric',
            'longitude' => 'required|numeric',
            'radius_meters' => 'required|integer|min:20',
            'is_active' => 'boolean',
        ]);

        $location->update($request->only(['latitude', 'longitude', 'radius_meters', 'is_active']));

        return response()->json([
            'message' => 'Zona KCIC berhasil diperbarui.',
            'location' => $location,
        ]);
    }

    /**
     * Ekspor laporan absensi bulanan ke format CSV.
     */
    public function exportCsv(Request $request)
    {
        $month = $request->input('month', Carbon::now('Asia/Jakarta')->format('Y-m'));
        $startDate = $month . '-01';
        $endDate = Carbon::parse($startDate)->endOfMonth()->toDateString();

        $attendances = Attendance::with(['user', 'clockInLocation', 'clockOutLocation'])
            ->whereBetween('date', [$startDate, $endDate])
            ->orderBy('date', 'asc')
            ->get();

        $headers = [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => "attachment; filename=laporan-absensi-kcic-{$month}.csv",
        ];

        return new StreamedResponse(function () use ($attendances) {
            $handle = fopen('php://output', 'w');
            
            // BOM UTF-8 agar karakter terbaca rapi di Microsoft Excel
            fprintf($handle, chr(0xEF) . chr(0xBB) . chr(0xBF));

            // Header kolom CSV
            fputcsv($handle, [
                'ID',
                'Nama Karyawan/Magang',
                'Email',
                'Departemen',
                'Tanggal',
                'Jam Masuk (WIB)',
                'Lokasi Masuk',
                'Jam Pulang (WIB)',
                'Lokasi Pulang',
                'Total Jam Kerja',
                'Status',
            ]);

            foreach ($attendances as $row) {
                $hours = $row->total_work_minutes ? floor($row->total_work_minutes / 60) : 0;
                $minutes = $row->total_work_minutes ? ($row->total_work_minutes % 60) : 0;
                $durationFormatted = $row->total_work_minutes ? "{$hours} jam {$minutes} mnt" : '-';

                fputcsv($handle, [
                    $row->id,
                    $row->user?->name,
                    $row->user?->email,
                    $row->user?->department ?? '-',
                    $row->date->format('d/m/Y'),
                    $row->clock_in_at ? $row->clock_in_at->timezone('Asia/Jakarta')->format('H:i:s') : '-',
                    $row->clockInLocation?->name ?? 'GPS Custom',
                    $row->clock_out_at ? $row->clock_out_at->timezone('Asia/Jakarta')->format('H:i:s') : '-',
                    $row->clockOutLocation?->name ?? ($row->clock_out_at ? 'GPS Custom' : '-'),
                    $durationFormatted,
                    $row->status,
                ]);
            }

            fclose($handle);
        }, 200, $headers);
    }
}
