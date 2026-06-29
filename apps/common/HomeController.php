<?php
namespace app\common;

use core\basic\Controller;
use core\basic\Config;

class HomeController extends Controller
{
    public function __construct()
    {
        cache_config();
        $languageContext = LanguageRouter::boot();

        define('CMSNAME', $this->config('cmsname') ?: 'PbootCMS');

        if (! ! $close_site = Config::get('close_site')) {
            $close_site_note = Config::get('close_site_note');
            error($close_site_note ?: '本站维护中，请稍后再访问。');
        }

        if (! is_https() && ! ! $tohttps = Config::get('to_https')) {
            header('Location: https://' . $_SERVER['HTTP_HOST'] . $_SERVER['REQUEST_URI'], true, 301);
            exit();
        }

        if (! ($this->config('wap_domain') && is_mobile()) && (! ! $main_domain = Config::get('main_domain')) && (! ! $to_main_domain = Config::get('to_main_domain'))) {
            $currentHost = get_http_host(true);
            $skipMainDomainRedirect = LanguageRouter::isConfiguredEntryHost($currentHost);
            if (! $skipMainDomainRedirect && ! preg_match('{^' . preg_quote($main_domain, '{') . '$}i', $currentHost)) {
                $pre = is_https() ? 'https://' : 'http://';
                header('Location: ' . $pre . $main_domain . $_SERVER['REQUEST_URI'], true, 301);
                exit();
            }
        }

        $user_ip = get_user_ip();
        if (filter_var($user_ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4)) {
            $ip_deny = Config::get('ip_deny', true);
            foreach ($ip_deny as $value) {
                if (network_match($user_ip, $value)) {
                    error('本站启用了黑名单功能，您的IP(' . $user_ip . ')不允许访问！');
                }
            }

            $ip_allow = Config::get('ip_allow', true);
            foreach ($ip_allow as $value) {
                if (network_match($user_ip, $value)) {
                    $allow = true;
                }
            }

            if ($ip_allow && ! isset($allow)) {
                error('本站启用了白名单功能，您的IP(' . $user_ip . ')不在允许范围！');
            }
        }

        cookie('lg', $languageContext['area_code']);

        if ($this->config('open_wap')) {
            if ($this->config('wap_domain') && $this->config('wap_domain') == get_http_host()) {
                $this->setTheme(get_theme() . '/wap');
            } elseif (is_mobile() && $this->config('wap_domain') && $this->config('wap_domain') != get_http_host()) {
                $pre = is_https() ? 'https://' : 'http://';
                header('Location:' . $pre . $this->config('wap_domain') . URL, true, 302);
                exit();
            } elseif (is_mobile()) {
                $this->setTheme(get_theme() . '/wap');
            } else {
                $this->setTheme(get_theme());
            }
        } else {
            $this->setTheme(get_theme());
        }
    }
}
