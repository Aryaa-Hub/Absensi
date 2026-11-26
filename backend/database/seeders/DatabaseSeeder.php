<?php

namespace Database\Seeders;

use App\Models\Location;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // 1. Akun Admin Default
        User::firstOrCreate(
            ['email' => 'admin@kcic.id'],
            [
                'name' => 'Admin KCIC',
                'password' => Hash::make('password123'),
                'role' => 'admin',
                'department' => 'Human Capital',
                'work_duration_minutes' => 540,
                'status' => 'active',
            ]
        );

        // 2. Akun Demo Karyawan / Magang
        User::firstOrCreate(
            ['email' => 'karyawan@kcic.id'],
            [
                'name' => 'Arya Dwi (Magang KCIC)',
                'password' => Hash::make('password123'),
                'role' => 'magang',
                'department' => 'IT & Systems',
                'work_duration_minutes' => 540,
                'status' => 'active',
            ]
        );

        // 3. Zona Lokasi KCIC (Sesuai PRD)
        $locations = [
            [
                'name' => 'Kantor Pusat KCIC',
                'latitude' => -6.2435000,
                'longitude' => 106.8880000,
                'radius_meters' => 100,
                'valid_for' => 'both',
                'is_active' => true,
            ],
            [
                'name' => 'Stasiun KCIC Halim (Jl. Halim Perdana Kusuma)',
                'latitude' => -6.2443000,
                'longitude' => 106.8885000,
                'radius_meters' => 300,
                'valid_for' => 'both',
                'is_active' => true,
            ],
            [
                'name' => 'Stasiun Karawang',
                'latitude' => -6.3768000,
                'longitude' => 107.2847000,
                'radius_meters' => 300,
                'valid_for' => 'both',
                'is_active' => true,
            ],
            [
                'name' => 'Stasiun Padalarang',
                'latitude' => -6.8398000,
                'longitude' => 107.4812000,
                'radius_meters' => 300,
                'valid_for' => 'both',
                'is_active' => true,
            ],
            [
                'name' => 'Stasiun Tegalluar',
                'latitude' => -6.9667000,
                'longitude' => 107.7167000,
                'radius_meters' => 300,
                'valid_for' => 'both',
                'is_active' => true,
            ],
            [
                'name' => 'Depo KCIC',
                'latitude' => -6.9750000,
                'longitude' => 107.7250000,
                'radius_meters' => 500,
                'valid_for' => 'both',
                'is_active' => true,
            ],
        ];

        foreach ($locations as $loc) {
            Location::firstOrCreate(['name' => $loc['name']], $loc);
        }
    }
}
