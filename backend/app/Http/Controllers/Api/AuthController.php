<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required|string',
            'device_id' => 'nullable|string',
        ]);

        $user = User::where('email', $request->email)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['Email atau password yang Anda masukkan salah.'],
            ]);
        }

        if ($user->status !== 'active') {
            return response()->json([
                'message' => 'Akun Anda sedang dinonaktifkan. Silakan hubungi admin.',
            ], 403);
        }

        // Simpan device_id jika dikirim
        if ($request->device_id && empty($user->device_id)) {
            $user->device_id = $request->device_id;
            $user->save();
        }

        // Buat Sanctum token
        $token = $user->createToken('attendance-auth-token')->plainTextToken;

        return response()->json([
            'message' => 'Login berhasil.',
            'token' => $token,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'department' => $user->department,
                'work_duration_minutes' => $user->work_duration_minutes,
            ],
        ]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'message' => 'Logout berhasil.',
        ]);
    }

    public function me(Request $request)
    {
        return response()->json([
            'user' => $request->user(),
            'server_time' => now('Asia/Jakarta')->toIso8601String(),
        ]);
    }
}
