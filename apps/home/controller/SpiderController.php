<?php
/**
 * @copyright (C)2016-2099 Hnaoyun Inc.
 * @license This is not a freeware, use is subject to license terms
 * @author XingMeng
 * @email hnxsh@foxmail.com
 * @date 2021年10月27日
 *
 */
namespace app\home\controller;

use core\basic\Controller;

class SpiderController extends Controller
{

    private $url;

    public function __construct($url = null)
    {
        $this->url = $url ? escape_string($url) : get('url');
    }

    public function index()
    {
        forbWords(URL);
		$rs = $this->getSpider();
        if ($rs !== false) {
            $this->log($rs . '爬行' . $this->url);
        }
    }

    private function getSpider()
    {
        if (empty($_SERVER['HTTP_USER_AGENT'])) {
            return false;
        }

        $useragent = strtolower($_SERVER['HTTP_USER_AGENT']);
        $spiders = array(
            'googlebot-image' => 'Googlebot-Image',
            'googlebot-video' => 'Googlebot-Video',
            'googlebot' => 'Googlebot',
            'oai-searchbot' => 'OpenAI OAI-SearchBot',
            'chatgpt-user' => 'OpenAI ChatGPT-User',
            'oai-adsbot' => 'OpenAI OAI-AdsBot',
            'gptbot' => 'OpenAI GPTBot',
            'claude-searchbot' => 'Anthropic Claude-SearchBot',
            'claude-user' => 'Anthropic Claude-User',
            'claudebot' => 'Anthropic ClaudeBot',
            'perplexity-user' => 'Perplexity-User',
            'perplexitybot' => 'PerplexityBot',
            'yuanbaobot' => 'Tencent YuanbaoBot',
            'hunyuanbot' => 'Tencent HunyuanBot',
            'tencentbot' => 'TencentBot',
            'bingbot' => 'Bingbot',
            'applebot' => 'Applebot',
            'amazonbot' => 'Amazonbot',
            'bytespider' => 'ByteDance Bytespider',
            'ccbot' => 'Common Crawl CCBot',
            'facebookexternalhit' => 'Facebook External Hit',
            'meta-externalagent' => 'Meta External Agent',
            'linkedinbot' => 'LinkedInBot',
            'twitterbot' => 'TwitterBot',
            'baiduspider' => 'Baiduspider',
            '360spider' => '360Spider',
            'sogou' => 'Sogou Spider',
            'yisouspider' => 'Yisou Spider',
            'petalbot' => 'PetalBot',
            'webscan' => '360WebScan',
            'adsbot' => 'Google AdsBot',
            'slurp' => 'Yahoo Slurp',
            'sosospider' => 'Soso Spider',
            'yodaobot' => 'YodaoBot',
            'speedy' => 'Speedy Spider',
            'yandexbot' => 'YandexBot',
            'easouspider' => 'Easou Spider',
            'symantecspider' => 'Symantec Spider',
            'qiniu' => 'Qiniu',
            'jiankongbao' => 'JianKongBao',
            'dnspod' => 'DNSPod',
            'linkpadbot' => 'LinkpadBot',
            'mj12bot' => 'MJ12Bot',
            'dingtalkbot' => 'DingTalkBot',
            'zoominfobot' => 'ZoomInfoBot'
        );

        foreach ($spiders as $keyword => $name) {
            if (strpos($useragent, $keyword) !== false) {
                return $name;
            }
        }

        if (strpos($useragent, 'spider') !== false) {
            return 'other-spider';
        } elseif (strpos($useragent, 'bot') !== false) {
            return 'other-bot';
        }
        return false;
    }
}
