<?php
namespace app\home\controller;

use app\common\HomeController;
use app\common\LanguageRouter;

class LanguageController extends HomeController
{
    public function index()
    {
        $code = get('code', 'var');
        $entry = get('entry', 'var');
        $target = LanguageRouter::buildAreaHomeUrl($code, $entry ?: null, true);

        if (! $target) {
            _404('The requested language does not exist.');
        }

        cookie('lg', $code);
        cookie('preferred_language', $code);
        cookie('language_selected_manually', '1');
        header('Location: ' . $target, true, 302);
        exit();
    }
}
