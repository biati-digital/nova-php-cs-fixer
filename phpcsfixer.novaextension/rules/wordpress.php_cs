<?php
require_once __DIR__ . '/Fixer.php';
require_once __DIR__ . '/FixerName.php';
require_once __DIR__ . '/SpaceInsideParenthesisFixer.php';
require_once __DIR__ . '/BlankLineAfterClassOpeningFixer.php';

$config = (new PhpCsFixer\Config())
    ->registerCustomFixers([
        new WeDevs\Fixer\SpaceInsideParenthesisFixer(),
        new WeDevs\Fixer\BlankLineAfterClassOpeningFixer()
    ])
    ->setRiskyAllowed(true)
    ->setUsingCache(false)
    ->setRules(WeDevs\Fixer\Fixer::rules());

return $config;