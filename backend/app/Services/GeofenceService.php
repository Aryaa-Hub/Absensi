<?php

namespace App\Services;

use App\Models\Location;

class GeofenceService
{
    /**
     * Radius rata-rata bumi dalam meter
     */
    private const EARTH_RADIUS_METERS = 6371000;

    /**
     * Hitung jarak antara dua koordinat GPS menggunakan Rumus Haversine (dalam meter).
     */
    public function calculateDistance(float $lat1, float $lon1, float $lat2, float $lon2): float
    {
        $lat1Rad = deg2rad($lat1);
        $lon1Rad = deg2rad($lon1);
        $lat2Rad = deg2rad($lat2);
        $lon2Rad = deg2rad($lon2);

        $deltaLat = $lat2Rad - $lat1Rad;
        $deltaLon = $lon2Rad - $lon1Rad;

        $a = sin($deltaLat / 2) ** 2 +
            cos($lat1Rad) * cos($lat2Rad) * (sin($deltaLon / 2) ** 2);

        $c = 2 * atan2(sqrt($a), sqrt(1 - $a));

        return self::EARTH_RADIUS_METERS * $c;
    }

    /**
     * Cari zona KCIC yang mencakup posisi user saat ini.
     * Mengembalikan objek Location jika berada di dalam zona, atau null jika di luar semua zona.
     *
     * @param float $userLat
     * @param float $userLon
     * @param string $action 'clock_in' | 'clock_out'
     * @return array{isValid: bool, location: Location|null, distanceMeters: float|null, nearestDistance: float|null, nearestLocation: Location|null}
     */
    public function validateUserLocation(float $userLat, float $userLon, string $action = 'clock_in'): array
    {
        $locations = Location::where('is_active', true)->get();

        $nearestDistance = null;
        $nearestLocation = null;

        foreach ($locations as $loc) {
            // Cek apakah zona berlaku untuk aksi ini
            if ($loc->valid_for !== 'both' && $loc->valid_for !== $action) {
                continue;
            }

            $distance = $this->calculateDistance($userLat, $userLon, $loc->latitude, $loc->longitude);

            if ($nearestDistance === null || $distance < $nearestDistance) {
                $nearestDistance = $distance;
                $nearestLocation = $loc;
            }

            // Jika dalam batas radius zona yang ditentukan
            if ($distance <= $loc->radius_meters) {
                return [
                    'isValid' => true,
                    'location' => $loc,
                    'distanceMeters' => round($distance, 1),
                    'nearestDistance' => round($distance, 1),
                    'nearestLocation' => $loc,
                ];
            }
        }

        return [
            'isValid' => false,
            'location' => null,
            'distanceMeters' => null,
            'nearestDistance' => $nearestDistance ? round($nearestDistance, 1) : null,
            'nearestLocation' => $nearestLocation,
        ];
    }
}
