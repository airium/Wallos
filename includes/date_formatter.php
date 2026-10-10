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

    // Only the subscription renewal column omits the current year's prefix.
    // Form values, details, dashboard dates, and stored dates remain full ISO.
    public static function formatRenewal($date, $currentYear = null)
    {
        $formatted = self::format($date);
        $year = (string) ($currentYear ?? date('Y'));
        return str_starts_with($formatted, $year . '-') ? substr($formatted, 5) : $formatted;
    }
}
