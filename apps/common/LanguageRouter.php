<?php
/**
 * Fixed multilingual entry resolver for host and virtual directory routing.
 */
namespace app\common;

use core\basic\Config;

class LanguageRouter
{
    private static $booted = false;
    private static $context = array();
    private static $areas = array();

    public static function boot()
    {
        if (self::$booted) {
            return self::$context;
        }

        self::$areas = Config::get('lgs') ?: array();
        self::$context = self::resolveRequest();
        self::$booted = true;

        return self::$context;
    }

    public static function resolveRequest()
    {
        $scheme = self::getCurrentScheme();
        $host = self::normalizeHost(isset($_SERVER['HTTP_HOST']) ? $_SERVER['HTTP_HOST'] : '');
        $originalPath = self::normalizePath(parse_url(isset($_SERVER['REQUEST_URI']) ? $_SERVER['REQUEST_URI'] : '/', PHP_URL_PATH));
        $trustedHosts = self::getTrustedHosts();

        if ($trustedHosts && !in_array($host, $trustedHosts, true)) {
            http_response_code(400);
            exit('Bad Request: untrusted host');
        }

        $globalHost = self::normalizeHost(Config::get('global_primary_domain') ?: Config::get('main_domain') ?: $host);
        $defaultArea = Config::get('default_global_area') ?: self::getDefaultAreaCode();
        $area = self::resolveAreaByHost($host);
        $entryType = 'default';
        $basePath = '';
        $routePath = ltrim($originalPath, '/');
        $isDomainEntry = false;
        $isDirectoryEntry = false;

        if ($area) {
            $entryType = 'domain';
            $isDomainEntry = true;
            $routePath = self::stripKnownLanguageDirectory($routePath, true);
        } elseif ($host === $globalHost) {
            $firstSegment = self::firstPathSegment($originalPath);
            $directoryArea = self::resolveAreaByDirectory($firstSegment);

            if ($directoryArea) {
                $area = $directoryArea;
                $entryType = 'directory';
                $basePath = '/' . self::normalizeDirectory($firstSegment);
                $isDirectoryEntry = true;
                $routePath = self::stripLanguageDirectory($originalPath, $firstSegment);
            } else {
                $area = self::findAreaByCode($defaultArea) ?: self::firstArea();
                $routePath = self::stripKnownLanguageDirectory($routePath, false);
            }
        } else {
            $area = self::findAreaByCode($defaultArea) ?: self::firstArea();
        }

        $areaCode = isset($area['acode']) ? $area['acode'] : $defaultArea;

        return array(
            'area_code' => $areaCode,
            'entry_type' => $entryType,
            'entry_host' => $host,
            'scheme' => $scheme,
            'base_path' => $basePath,
            'original_path' => $originalPath,
            'route_path' => trim($routePath, '/'),
            'is_global_host' => $host === $globalHost,
            'is_domain_entry' => $isDomainEntry,
            'is_directory_entry' => $isDirectoryEntry
        );
    }

    public static function resolveAreaByHost($host)
    {
        $host = self::normalizeHost($host);
        foreach (self::$areas as $area) {
            $domain = self::normalizeHost(isset($area['domain']) ? $area['domain'] : '');
            if ($domain && $domain === $host) {
                return $area;
            }
        }
        return null;
    }

    public static function resolveAreaByDirectory($directory)
    {
        $directory = self::normalizeDirectory($directory);
        if (!$directory) {
            return null;
        }
        foreach (self::$areas as $area) {
            $areaDirectory = self::normalizeDirectory(isset($area['directory']) ? $area['directory'] : '');
            if ($areaDirectory && $areaDirectory === $directory) {
                return $area;
            }
        }
        return null;
    }

    public static function getContext()
    {
        return self::$booted ? self::$context : self::boot();
    }

    public static function getCurrentAreaCode()
    {
        $context = self::getContext();
        return $context['area_code'];
    }

    public static function getCurrentEntryType()
    {
        $context = self::getContext();
        return $context['entry_type'];
    }

    public static function getCurrentHost()
    {
        $context = self::getContext();
        return $context['entry_host'];
    }

    public static function getCurrentScheme()
    {
        if (function_exists('is_https') && is_https()) {
            return 'https';
        }
        if (!empty($_SERVER['HTTPS']) && strtolower($_SERVER['HTTPS']) !== 'off') {
            return 'https';
        }
        return 'http';
    }

    public static function getCurrentBasePath()
    {
        $context = self::getContext();
        return $context['base_path'];
    }

    public static function getOriginalPath()
    {
        $context = self::getContext();
        return $context['original_path'];
    }

    public static function getRoutePath()
    {
        $context = self::getContext();
        return $context['route_path'];
    }

    public static function stripLanguageDirectory($path, $directory = null)
    {
        $path = self::normalizePath($path);
        $directory = self::normalizeDirectory($directory ?: self::firstPathSegment($path));
        if (!$directory) {
            return trim($path, '/');
        }
        $pattern = '#^/' . preg_quote($directory, '#') . '(/|$)#i';
        return trim(preg_replace($pattern, '/', $path, 1), '/');
    }

    public static function buildCurrentUrl()
    {
        $context = self::getContext();
        $query = isset($_SERVER['QUERY_STRING']) && $_SERVER['QUERY_STRING'] !== '' ? '?' . $_SERVER['QUERY_STRING'] : '';
        return $context['scheme'] . '://' . $context['entry_host'] . $context['original_path'] . $query;
    }

    public static function buildAreaHomeUrl($areaCode, $entry = null, $absolute = false)
    {
        return self::buildAreaUrl($areaCode, '', $entry, $absolute);
    }

    public static function buildAreaUrl($areaCode, $path = '', $entry = null, $absolute = false)
    {
        $area = self::findAreaByCode($areaCode);
        if (!$area) {
            return '';
        }

        $context = self::getContext();
        $entry = $entry ?: self::selectEntryForArea($area, $context['entry_type']);
        $host = $context['entry_host'];
        $basePath = '';

        if ($entry === 'domain' && !empty($area['domain'])) {
            $host = self::normalizeHost($area['domain']);
        } elseif ($entry === 'directory' && !empty($area['directory'])) {
            $basePath = '/' . self::normalizeDirectory($area['directory']);
            $host = self::normalizeHost(Config::get('global_primary_domain') ?: $host);
        } elseif ($entry === 'global') {
            $host = self::normalizeHost(Config::get('global_primary_domain') ?: $host);
        }

        $path = trim((string) $path, '/');
        $url = $basePath . '/' . $path;
        $url = '/' . trim($url, '/');
        if ($url === '/') {
            $url = $basePath ?: '/';
        }
        $url = $url === '' ? '/' : $url;

        if ($absolute || $host !== $context['entry_host']) {
            return $context['scheme'] . '://' . $host . $url;
        }

        return $url;
    }

    public static function buildLanguageSwitchUrl($areaCode, $entry = null)
    {
        return self::buildAreaUrl($areaCode, self::getRoutePath(), $entry, true);
    }

    public static function getCacheContextKey()
    {
        $context = self::getContext();
        return implode('|', array(
            $context['entry_host'],
            $context['area_code'],
            $context['entry_type'],
            $context['base_path'],
            $context['route_path'],
            self::normalizeQuery(isset($_SERVER['QUERY_STRING']) ? $_SERVER['QUERY_STRING'] : '')
        ));
    }

    public static function isStaticOrSystemPath($path)
    {
        $first = self::firstPathSegment('/' . trim($path, '/'));
        return in_array($first, self::reservedDirectories(), true);
    }

    public static function isKnownLanguageDirectory($directory)
    {
        return self::resolveAreaByDirectory($directory) !== null;
    }

    public static function normalizeHost($host)
    {
        $host = strtolower(trim((string) $host));
        $host = preg_replace('#^https?://#i', '', $host);
        $host = preg_replace('#/.*$#', '', $host);
        $host = preg_replace('#:\d+$#', '', $host);
        return rtrim($host, '.');
    }

    public static function normalizeDirectory($directory)
    {
        $directory = strtolower(trim((string) $directory));
        $directory = trim($directory, "/ \t\n\r\0\x0B");
        return $directory;
    }

    public static function getAreas()
    {
        return self::$booted ? self::$areas : (self::boot() ? self::$areas : array());
    }

    public static function resetForTesting()
    {
        self::$booted = false;
        self::$context = array();
        self::$areas = array();
    }

    private static function getTrustedHosts()
    {
        $trusted = Config::get('trusted_hosts') ?: Config::get('global_primary_domain') ?: Config::get('main_domain');
        $hosts = array();
        foreach (explode(',', (string) $trusted) as $host) {
            $host = self::normalizeHost($host);
            if ($host) {
                $hosts[] = $host;
            }
        }
        foreach (self::$areas as $area) {
            $domain = self::normalizeHost(isset($area['domain']) ? $area['domain'] : '');
            if ($domain) {
                $hosts[] = $domain;
            }
        }
        return array_values(array_unique($hosts));
    }

    private static function getDefaultAreaCode()
    {
        foreach (self::$areas as $area) {
            if (!empty($area['is_default'])) {
                return $area['acode'];
            }
        }
        $area = self::firstArea();
        return $area ? $area['acode'] : '';
    }

    private static function firstArea()
    {
        foreach (self::$areas as $area) {
            return $area;
        }
        return array();
    }

    private static function findAreaByCode($areaCode)
    {
        if (isset(self::$areas[$areaCode]) && is_array(self::$areas[$areaCode])) {
            return self::$areas[$areaCode];
        }
        foreach (self::$areas as $area) {
            if (isset($area['acode']) && $area['acode'] === $areaCode) {
                return $area;
            }
        }
        return null;
    }

    private static function firstPathSegment($path)
    {
        $path = trim((string) $path, '/');
        if ($path === '') {
            return '';
        }
        $parts = explode('/', $path);
        return strtolower($parts[0]);
    }

    private static function normalizePath($path)
    {
        $path = '/' . trim((string) $path, '/');
        return preg_replace('#/+#', '/', $path);
    }

    private static function stripKnownLanguageDirectory($routePath, $domainEntry)
    {
        $first = self::firstPathSegment('/' . $routePath);
        if (!$first || !self::isKnownLanguageDirectory($first)) {
            return trim($routePath, '/');
        }
        if ($domainEntry) {
            self::redirect('/' . trim(self::stripLanguageDirectory('/' . $routePath, $first), '/'), 301);
        }
        return trim(self::stripLanguageDirectory('/' . $routePath, $first), '/');
    }

    private static function selectEntryForArea($area, $currentEntry)
    {
        if ($currentEntry === 'domain' && !empty($area['domain'])) {
            return 'domain';
        }
        if (!empty($area['directory'])) {
            return 'directory';
        }
        return 'global';
    }

    private static function normalizeQuery($query)
    {
        parse_str((string) $query, $params);
        foreach (array_keys($params) as $key) {
            if (preg_match('/^(utm_|gclid$|fbclid$)/i', $key)) {
                unset($params[$key]);
            }
        }
        ksort($params);
        return http_build_query($params);
    }

    private static function reservedDirectories()
    {
        return array(
            'admin', 'api', 'apps', 'config', 'core', 'runtime', 'static', 'uploads',
            'upload', 'template', 'skin', 'style', 'rewrite', 'search', 'tag', 'member',
            'form', 'message', 'comment', 'sitemap', 'robots.txt', 'index.php', 'admin.php'
        );
    }

    private static function redirect($path, $status = 301)
    {
        $scheme = self::getCurrentScheme();
        $host = self::normalizeHost(isset($_SERVER['HTTP_HOST']) ? $_SERVER['HTTP_HOST'] : '');
        $path = '/' . trim((string) $path, '/');
        header('Location: ' . $scheme . '://' . $host . ($path === '/' ? '/' : $path), true, $status);
        exit();
    }
}
