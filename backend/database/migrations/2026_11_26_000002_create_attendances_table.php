<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('attendances', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->date('date')->index(); // Tanggal absensi (WIB)
            
            // Absen Masuk
            $table->timestamp('clock_in_at');
            $table->decimal('clock_in_latitude', 10, 7);
            $table->decimal('clock_in_longitude', 10, 7);
            $table->float('clock_in_accuracy');
            $table->string('clock_in_photo_path');
            $table->foreignId('clock_in_location_id')->nullable()->constrained('locations')->nullOnDelete();
            $table->string('clock_in_flag')->default('normal'); // normal, suspicious
            
            // Aturan 9 Jam (Server-Side Lockdown)
            $table->timestamp('earliest_clock_out_at');
            
            // Absen Pulang
            $table->timestamp('clock_out_at')->nullable();
            $table->decimal('clock_out_latitude', 10, 7)->nullable();
            $table->decimal('clock_out_longitude', 10, 7)->nullable();
            $table->float('clock_out_accuracy')->nullable();
            $table->string('clock_out_photo_path')->nullable();
            $table->foreignId('clock_out_location_id')->nullable()->constrained('locations')->nullOnDelete();
            $table->string('clock_out_flag')->nullable(); // normal, suspicious
            
            // Durasi & Status
            $table->integer('total_work_minutes')->nullable();
            $table->string('status')->default('incomplete'); // incomplete (belum pulang), complete, corrected
            
            $table->timestamps();
            
            // Satu user hanya boleh 1 sesi absensi per tanggal
            $table->unique(['user_id', 'date']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('attendances');
    }
};
