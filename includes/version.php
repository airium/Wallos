<?php
$version = "v5.8.3";

// Keep the upstream version for update checks. Custom frontend changes also
// invalidate HTTP and service-worker caches, without a manual revision bump.
$assetHash = hash_init('sha256');
foreach ([
    'styles/styles.css',
    'scripts/formatting.js',
    'scripts/date-inputs.js',
    'scripts/subscriptions.js',
    'scripts/subscription-details.js',
    'scripts/settings.js',
    'scripts/stats.js',
] as $assetFile) {
    hash_update_file($assetHash, __DIR__ . '/../' . $assetFile);
}
$assetVersion = $version . '-' . substr(hash_final($assetHash), 0, 12);
?>
