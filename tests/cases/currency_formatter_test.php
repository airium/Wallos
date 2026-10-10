<?php
require_once WALLOS_ROOT . '/includes/currency_formatter.php';

wallos_test('currency units have a space and thousands use a narrow non-breaking space', function () {
    assert_same('$' . "\u{00A0}" . '1' . "\u{202F}" . '234.56', CurrencyFormatter::format(1234.56, 'USD', 'en_US'),
        'prefix currencies have a non-breaking unit space and narrow grouping');
    assert_same('-$' . "\u{00A0}" . '1' . "\u{202F}" . '234.56', CurrencyFormatter::format(-1234.56, 'USD', 'en_US'),
        'negative amounts keep their sign');
    assert_same('1' . "\u{202F}" . '234,56' . "\u{00A0}" . '€', CurrencyFormatter::format(1234.56, 'EUR', 'fr_FR'),
        'suffix currencies keep their position and decimal separator');
    assert_same('1' . "\u{202F}" . '234' . "\u{202F}" . '567.89', CurrencyFormatter::number(1234567.89),
        'plain displayed numbers use the same narrow grouping');
});

wallos_test('currency precision and rounding survive reused formatters', function () {
    assert_same('¥' . "\u{00A0}" . '1' . "\u{202F}" . '235', CurrencyFormatter::format(1234.56, 'JPY', 'en_US'),
        'zero-decimal currencies retain their precision');
    assert_same('$' . "\u{00A0}" . '0.50', CurrencyFormatter::format(0.5, 'USD', 'en_US'),
        'switching back to USD restores two decimals');
    assert_contains('1.234', CurrencyFormatter::format(1.234, 'BHD', 'en_US'),
        'three-decimal currencies retain their precision');
    assert_same('$' . "\u{00A0}" . '0.00', CurrencyFormatter::format(0, 'USD', 'en_US'),
        'zero values remain visible');
});
