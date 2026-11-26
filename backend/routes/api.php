<?php

use App\Http\Controllers\Api\AdminController;
use App\Http\Controllers\Api\AttendanceController;
use App\Http\Controllers\Api\AuthController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

// Public routes
Route::post('/auth/login', [AuthController::class, 'login']);

// Health check endpoint
Route::get('/health', function () {
    return response()->json([
        'status' => 'ok',
        'server_time' => now('Asia/Jakarta')->toIso8601String(),
        'app' => config('app.name'),
    ]);
});

// Protected routes (Sanctum Token)
Route::middleware('auth:sanctum')->group(function () {
    // Auth info & logout
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/auth/me', [AuthController::class, 'me']);

    // Attendance core flow
    Route::get('/attendance/today', [AttendanceController::class, 'today']);
    Route::post('/attendance/clock-in', [AttendanceController::class, 'clockIn']);
    Route::post('/attendance/clock-out', [AttendanceController::class, 'clockOut']);
    Route::get('/attendance/history', [AttendanceController::class, 'history']);

    // Admin routes
    Route::prefix('admin')->group(function () {
        Route::get('/attendances', [AdminController::class, 'attendances']);
        Route::get('/locations', [AdminController::class, 'locations']);
        Route::put('/locations/{id}', [AdminController::class, 'updateLocation']);
        Route::get('/export-csv', [AdminController::class, 'exportCsv']);
    });
});
