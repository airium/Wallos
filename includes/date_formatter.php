<?php

// Calendar dates are Gregorian ISO dates, independent of the display locale.
final class DateFormatter
{
    public static function format($date)
    {
        if ($date === null || $date === '') {
            return '';
        }
        $value = $date instanceof DateTimeInterface ? $date : new DateTimeImmutable($date);
        return $value->format('Y-m-d');
    }
}
