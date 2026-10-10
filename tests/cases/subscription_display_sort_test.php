<?php

// Exercise the rendered list, including the price re-sort and lifetime grouping.
function subscription_display_sort_render($entries, $disabledToBottom = 'false')
{
    // Other suite cases stub global pricing helpers; render with the real helpers
    // in a separate PHP process so neither test changes the other's environment.
    $script = 'require $argv[1] . "/tests/bootstrap.php"; '
        . 'require $argv[1] . "/tests/cases/subscription_display_sort_test.php"; '
        . 'echo json_encode(subscription_display_sort_render_in_process('
        . 'json_decode(stream_get_contents(STDIN), true), $argv[2]));';
    $process = proc_open([PHP_BINARY, '-r', $script, WALLOS_ROOT, $disabledToBottom],
        [0 => ['pipe', 'r'], 1 => ['pipe', 'w'], 2 => ['pipe', 'w']], $pipes);
    if ($process === false) {
        throw new RuntimeException('Could not start the subscription renderer');
    }
    fwrite($pipes[0], json_encode($entries));
    fclose($pipes[0]);
    $output = stream_get_contents($pipes[1]);
    $errors = stream_get_contents($pipes[2]);
    fclose($pipes[1]);
    fclose($pipes[2]);
    if (proc_close($process) !== 0) {
        throw new RuntimeException('Subscription rendering failed: ' . $errors . $output);
    }
    return json_decode($output, true, 512, JSON_THROW_ON_ERROR);
}

function subscription_display_sort_render_in_process($entries, $disabledToBottom)
{
    $db = wallos_test_open_database();
    wallos_test_create_user($db, 1, 'display-sort');
    $userId = 1;
    $currencies = [1 => ['id' => 1, 'code' => 'EUR', 'symbol' => "\u{20AC}"]];
    $lang = 'en';

    require_once WALLOS_ROOT . '/includes/currency_formatter.php';
    require_once WALLOS_ROOT . '/includes/logo_theme_variant.php';
    require_once WALLOS_ROOT . '/includes/list_subscriptions.php';
    require WALLOS_ROOT . '/includes/i18n/en.php';

    $subscriptions = [];
    foreach ($entries as $index => $entry) {
        $subscriptions[] = array_replace([
            'id' => $index + 1,
            'logo' => 'images/uploads/logos/wallos.png',
            'name' => 'Subscription',
            'price' => 10,
            'inactive' => 0,
            'one_time' => false,
            'auto_renew' => 1,
            'billing_cycle' => 'Monthly',
            'next_payment' => date('Y') . '-12-09',
            'currency_code' => 'EUR',
            'payment_method_icon' => 'images/uploads/logos/wallos.png',
            'payment_method_name' => 'Credit Card',
        ], $entry);
    }

    ob_start();
    try {
        printSubscriptions($subscriptions, 'price', [], [], $i18n, 'blue', WALLOS_ROOT . '/',
            $disabledToBottom, 'false', 'false', $currencies, $lang);
        $html = ob_get_contents();
    } finally {
        ob_end_clean();
        $db->close();
    }

    preg_match_all('/data-name="([^"]+)"/', $html, $matches);
    return $matches[1];
}

wallos_test('equal displayed prices are ordered by name, not payment date or insertion', function () {
    $names = subscription_display_sort_render([
        ['name' => 'Zebra', 'next_payment' => date('Y') . '-11-01'],
        ['name' => 'Beta', 'next_payment' => date('Y') . '-12-01'],
        ['name' => 'Expensive', 'price' => 20],
        ['name' => 'Alpha', 'next_payment' => date('Y') . '-12-20'],
    ]);

    assert_same(['Expensive', 'Alpha', 'Beta', 'Zebra'], $names,
        'descending price remains primary and name breaks equal-price ties');
});

wallos_test('alphabetical price ties preserve disabled subscription grouping', function () {
    $entries = [
        ['name' => 'A disabled', 'inactive' => 1],
        ['name' => 'Z active'],
        ['name' => 'A active'],
        ['name' => 'Expensive disabled', 'inactive' => 1, 'price' => 20],
    ];

    assert_same(['Expensive disabled', 'A active', 'Z active', 'A disabled'],
        subscription_display_sort_render($entries),
        'without disabled-to-bottom, price is primary and status breaks ties before name');
    assert_same(['A active', 'Z active', 'Expensive disabled', 'A disabled'],
        subscription_display_sort_render($entries, 'true'),
        'with disabled-to-bottom, all active subscriptions precede disabled ones');
});

wallos_test('alphabetical price ties keep lifetime purchases at the bottom', function () {
    assert_same(['Alpha recurring', 'Zebra recurring', 'Alpha lifetime', 'Zebra lifetime'],
        subscription_display_sort_render([
            ['name' => 'Zebra lifetime', 'price' => 100, 'one_time' => true],
            ['name' => 'Zebra recurring'],
            ['name' => 'Alpha lifetime', 'price' => 100, 'one_time' => true],
            ['name' => 'Alpha recurring'],
        ]),
        'lifetime grouping remains stronger than descending price, with names ordered in each group');
});
