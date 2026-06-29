<?php
namespace core\basic {
    class Config
    {
        public static $data = array();

        public static function get($name)
        {
            return isset(self::$data[$name]) ? self::$data[$name] : null;
        }
    }
}

namespace {
    require __DIR__ . '/../../apps/common/LanguageRouter.php';

    use app\common\LanguageRouter;
    use core\basic\Config;

    function assertSameValue($expected, $actual, $message)
    {
        if ($expected !== $actual) {
            fwrite(STDERR, $message . PHP_EOL);
            fwrite(STDERR, 'Expected: ' . var_export($expected, true) . PHP_EOL);
            fwrite(STDERR, 'Actual: ' . var_export($actual, true) . PHP_EOL);
            exit(1);
        }
    }

    Config::$data = array(
        'global_primary_domain' => 'wishpower.net',
        'default_global_area' => 'en',
        'trusted_hosts' => 'wishpower.net,wishpower.com,fr.wishpower.com',
        'lgs' => array(
            array('acode' => 'en', 'name' => 'English', 'domain' => '', 'directory' => '', 'is_default' => '1', 'language_sort' => 1),
            array('acode' => 'es', 'name' => 'Spanish', 'domain' => '', 'directory' => 'es', 'is_default' => '0', 'language_sort' => 2),
            array('acode' => 'fr', 'name' => 'French', 'domain' => 'fr.wishpower.com', 'directory' => '', 'is_default' => '0', 'language_sort' => 3),
        ),
    );

    $_SERVER['HTTPS'] = 'on';
    $_SERVER['HTTP_HOST'] = 'wishpower.net';
    $_SERVER['REQUEST_URI'] = '/es/products/pump.html?x=1';
    LanguageRouter::resetForTesting();
    $context = LanguageRouter::boot();
    assertSameValue('es', $context['area_code'], 'Directory language should resolve to es.');
    assertSameValue('/es', $context['base_path'], 'Spanish base path should be /es.');
    assertSameValue('products/pump.html', LanguageRouter::getRoutePath(), 'Router path should strip language directory.');

    $_SERVER['HTTP_HOST'] = 'fr.wishpower.com';
    $_SERVER['REQUEST_URI'] = '/products/pump.html';
    LanguageRouter::resetForTesting();
    $context = LanguageRouter::boot();
    assertSameValue('fr', $context['area_code'], 'Domain language should resolve to fr.');
    assertSameValue('', $context['base_path'], 'Domain language should not add directory base path.');

    $switchUrl = LanguageRouter::buildLanguageSwitchUrl('es');
    assertSameValue('https://wishpower.net/es/products/pump.html', $switchUrl, 'Switch URL should target Spanish directory on primary host.');

    echo "LanguageRouter smoke tests passed.\n";
}
