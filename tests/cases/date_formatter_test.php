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
