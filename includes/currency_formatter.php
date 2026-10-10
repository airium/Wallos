<?php

final class CurrencyFormatter
{
    private static $instances = [];

    private static function getInstance($locale = null)
    {
        $locale = $locale ?: (Locale::acceptFromHttp($_SERVER['HTTP_ACCEPT_LANGUAGE'] ?? 'en-US') ?: 'en_US');
        if (!isset(self::$instances[$locale])) {
            $formatter = new NumberFormatter($locale, NumberFormatter::CURRENCY);
            $formatter->setSymbol(NumberFormatter::GROUPING_SEPARATOR_SYMBOL, "\u{202F}");
            $formatter->setSymbol(NumberFormatter::MONETARY_GROUPING_SEPARATOR_SYMBOL, "\u{202F}");
            self::$instances[$locale] = $formatter;
        }

        return self::$instances[$locale];
    }

    public static function format($amount, $currency, $locale = null)
    {
        $formatted = self::getInstance($locale)->formatCurrency((float) $amount, $currency);
        // Preserve the locale's currency placement, decimal separator, sign,
        // and currency-specific precision, but always separate unit and value.
        $formatted = preg_replace('/([\p{L}\p{Sc}])[\p{Z}\s]*(?=[+\-\x{2212}]?\p{N})/u', '$1' . "\u{00A0}", $formatted);
        return preg_replace('/(\p{N})[\p{Z}\s]*(?=[\p{L}\p{Sc}])/u', '$1' . "\u{00A0}", $formatted);
    }

    public static function number($amount, $decimals = 2)
    {
        return number_format((float) $amount, $decimals, '.', "\u{202F}");
    }
}
