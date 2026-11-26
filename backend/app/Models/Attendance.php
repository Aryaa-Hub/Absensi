<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Attendance extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'date',
        'clock_in_at',
        'clock_in_latitude',
        'clock_in_longitude',
        'clock_in_accuracy',
        'clock_in_photo_path',
        'clock_in_location_id',
        'clock_in_flag',
        'earliest_clock_out_at',
        'clock_out_at',
        'clock_out_latitude',
        'clock_out_longitude',
        'clock_out_accuracy',
        'clock_out_photo_path',
        'clock_out_location_id',
        'clock_out_flag',
        'total_work_minutes',
        'status',
    ];

    protected $casts = [
        'date' => 'date',
        'clock_in_at' => 'datetime',
        'earliest_clock_out_at' => 'datetime',
        'clock_out_at' => 'datetime',
        'clock_in_latitude' => 'float',
        'clock_in_longitude' => 'float',
        'clock_out_latitude' => 'float',
        'clock_out_longitude' => 'float',
        'clock_in_accuracy' => 'float',
        'clock_out_accuracy' => 'float',
        'total_work_minutes' => 'integer',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function clockInLocation()
    {
        return $this->belongsTo(Location::class, 'clock_in_location_id');
    }

    public function clockOutLocation()
    {
        return $this->belongsTo(Location::class, 'clock_out_location_id');
    }

    public function corrections()
    {
        return $this->hasMany(AttendanceCorrection::class);
    }
}
