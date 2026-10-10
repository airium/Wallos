<?php
require_once WALLOS_ROOT . '/includes/date_formatter.php';

wallos_test('displayed dates keep their year and use Gregorian ISO formatting', function () {
    foreach (['en_US', 'en_GB', 'ar_SA', 'th_TH'] as $locale) {
        Locale::setDefault($locale);
        assert_same('2026-01-09', DateFormatter::format('2026-01-09'), 'locale does not alter the calendar or date order');
        assert_same('2027-02-01', DateFormatter::format('2027-02-01'), 'other years use the same full format');
        assert_same('2028-02-29', DateFormatter::format('2028-02-29'), 'leap day is preserved');
    }
    Locale::setDefault('en_US');
});

wallos_test('date formatting does not move a calendar date across time zones', function () {
    foreach (['Pacific/Kiritimati', 'America/Los_Angeles', 'Asia/Singapore'] as $timezone) {
        $date = new DateTimeImmutable('2026-01-01 00:00:00', new DateTimeZone($timezone));
        assert_same('2026-01-01', DateFormatter::format($date), 'the local date is used rather than the UTC date');
    }
    assert_same('', DateFormatter::format(null), 'absent dates remain absent');
    assert_same('', DateFormatter::format(''), 'empty dates remain empty');
});

wallos_test('only current-year subscription renewals omit the year prefix', function () {
    assert_same('11-29', DateFormatter::formatRenewal('2026-11-29', 2026),
        'current-year renewals use month-day');
    assert_same('2027-02-01', DateFormatter::formatRenewal('2027-02-01', 2026),
        'next-year renewals retain their year');
    assert_same('2025-12-31', DateFormatter::formatRenewal('2025-12-31', 2026),
        'past years also retain their year');
    assert_same('02-01', DateFormatter::formatRenewal('2027-02-01', 2027),
        'the compact display follows the current year after rollover');
    assert_same('2026-11-29', DateFormatter::format('2026-11-29'),
        'dates elsewhere still use the full ISO format');
    assert_same('', DateFormatter::formatRenewal(null, 2026), 'absent renewal dates stay absent');
});
