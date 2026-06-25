<?php
/**
 * @copyright (C)2016-2099 Hnaoyun Inc.
 * @author XingMeng
 * @email hnxsh@foxmail.com
 * @date 2018年7月15日
 *  生成sitemap文件
 */
namespace app\home\controller;

use core\basic\Controller;
use app\home\model\SitemapModel;
use core\basic\Url;

class SitemapController extends Controller
{

    protected $model;

    public function __construct()
    {
        $this->model = new SitemapModel();
    }

   public function index()
{
    header("Content-type:text/xml;charset=utf-8");
    $str = '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
    $str .= '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' . "\n";

    // 1. 添加首页链接（第一位）
    $str .= $this->makeNode('', date('Y-m-d'), '1.00', 'always');

    // 2. 获取并添加栏目链接（第二位）
    $sorts = $this->model->getSorts();
    $Parser = new ParserController();
    foreach ($sorts as $value) {
        if ($value->outlink) {
            continue;
        } elseif ($value->type == 1) {
            // 单页内容（文字链接，暂时跳过）
            continue;
        } else {
            // 栏目链接
            $link = $Parser->parserLink(2, $value->urlname, 'list', $value->scode, $value->filename);
            $str .= $this->makeNode($link, date('Y-m-d'), '0.80', 'daily');
        }
    }

    // 4. 获取所有文章内容，并进行全局排序
    $allContents = [];
    foreach ($sorts as $value) {
        if ($value->outlink || $value->type == 1) {
            continue; // 跳过外链和单页内容
        }
        $contents = $this->model->getSortContent($value->scode);

        // 将当前分类下的文章内容合并到全局数组中
        $allContents = array_merge($allContents, $contents);
    }

    // 对所有文章内容进行全局排序（按日期倒序）
    usort($allContents, function ($a, $b) {
        return strtotime($b->date) - strtotime($a->date);
    });

    // 输出所有文章链接
    foreach ($allContents as $value2) {
        if ($value2->outlink) { // 外链
            continue;
        } else {
            $link = $Parser->parserLink(2, $value2->urlname, 'content', $value2->scode, $value2->sortfilename, $value2->id, $value2->filename);
        }
        $str .= $this->makeNode($link, date('Y-m-d', strtotime($value2->date)), '0.60', 'daily');
    }
    
    // 3. 获取并添加单页内容链接（第三位）
    foreach ($sorts as $value) {
        if ($value->outlink) {
            continue;
        } elseif ($value->type == 1) {
            // 单页内容
            $link = $Parser->parserLink(1, $value->urlname, 'about', $value->scode, $value->filename);
            $str .= $this->makeNode($link, date('Y-m-d'), '0.80', 'daily');
        }
    }

    // 输出完整的 sitemap.xml
    echo $str . "\n</urlset>";
}

    // 生成结点信息
    private function makeNode($link, $date, $priority = 0.60, $changefreq = 'always')
    {
        $loc = $this->encodeSitemapUrl(get_http_url() . $link);
        $node = '
<url>
    <loc>' . htmlspecialchars($loc, ENT_XML1, 'UTF-8') . '</loc>
    <priority>' . $priority . '</priority>
    <lastmod>' . $date . '</lastmod>
    <changefreq>' . $changefreq . '</changefreq>
</url>';
        return $node;
    }

    private function encodeSitemapUrl($url)
    {
        $parts = parse_url($url);
        if (! is_array($parts) || empty($parts['scheme']) || empty($parts['host'])) {
            return $url;
        }

        $result = $parts['scheme'] . '://';
        if (isset($parts['user'])) {
            $result .= rawurlencode(rawurldecode($parts['user']));
            if (isset($parts['pass'])) {
                $result .= ':' . rawurlencode(rawurldecode($parts['pass']));
            }
            $result .= '@';
        }
        $result .= $parts['host'];
        if (isset($parts['port'])) {
            $result .= ':' . $parts['port'];
        }

        $path = isset($parts['path']) ? $parts['path'] : '';
        $segments = explode('/', $path);
        foreach ($segments as $key => $segment) {
            if ($segment !== '') {
                $segments[$key] = rawurlencode(rawurldecode($segment));
            }
        }
        $result .= implode('/', $segments);

        if (isset($parts['query']) && $parts['query'] !== '') {
            $query = array();
            foreach (explode('&', $parts['query']) as $item) {
                $pair = explode('=', $item, 2);
                $name = rawurlencode(rawurldecode($pair[0]));
                if (isset($pair[1])) {
                    $query[] = $name . '=' . rawurlencode(rawurldecode($pair[1]));
                } else {
                    $query[] = $name;
                }
            }
            $result .= '?' . implode('&', $query);
        }

        if (isset($parts['fragment']) && $parts['fragment'] !== '') {
            $result .= '#' . rawurlencode(rawurldecode($parts['fragment']));
        }
        return $result;
    }

    public function filter()
    {
        header("Content-type:text/xml;charset=utf-8");
        if (! $scode = get('scode', 'var')) {
            echo $this->makeEmptyXml();
            return;
        }
        echo $this->buildFilterXml($scode);
    }

    private function makeEmptyXml()
    {
        return '<?xml version="1.0" encoding="UTF-8"?>' . "\n" .
            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' . "\n</urlset>";
    }

    public function buildFilterXml($target_scode = '')
    {
        $str = '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
        $str .= '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' . "\n";

        if ($target_scode) {
            $sort = $this->model->getSort($target_scode);
            $sorts = $sort ? array($sort) : array();
        } else {
            $sorts = $this->model->getSorts();
        }
        $Parser = new ParserController();
        $added = array();
        $max_urls = 50000;
        $count = 0;

        foreach ($sorts as $sort) {
            if ($target_scode && $sort->scode != $target_scode) {
                continue;
            }
            if ($sort->outlink || $sort->type == 1) {
                continue;
            }

            $fields = $this->getFilterFieldsBySort($sort);
            if (! $fields) {
                continue;
            }

            $field_values = array();
            foreach ($fields as $field) {
                $values = $this->splitSelectValues($this->model->getSelectValue($field, $sort->mcode, $sort->scode));
                if ($values) {
                    $field_values[$field] = $values;
                }
            }
            if (! $field_values) {
                continue;
            }

            $base_link = $Parser->parserLink($sort->type, $sort->urlname, 'list', $sort->scode, $sort->filename);
            for ($depth = 1; $depth <= 3; $depth ++) {
                foreach ($this->buildFilterCombinations($field_values, $depth) as $selected) {
                    $link = $this->buildFilterUrl($base_link, $selected, $fields);
                    if (! $link || isset($added[$link])) {
                        continue;
                    }
                    $added[$link] = true;
                    $str .= $this->makeNode($link, date('Y-m-d'), '0.70', 'daily');
                    $count ++;
                    if ($count >= $max_urls) {
                        break 3;
                    }
                }
            }
        }

        return $str . "\n</urlset>";
    }

    public function getFilterDebug($scode)
    {
        $sort = $this->model->getSort($scode);
        if (! $sort || $sort->outlink || $sort->type == 1) {
            return array();
        }

        $fields = $this->getFilterFieldsBySort($sort);
        $field_values = array();
        foreach ($fields as $field) {
            $values = $this->splitSelectValues($this->model->getSelectValue($field, $sort->mcode, $sort->scode));
            if ($values) {
                $field_values[$field] = $values;
            }
        }

        $template = $this->getTemplatePath($sort);
        $debug = array();
        $debug['template'] = $sort->listtpl;
        $debug['template_path'] = $template && file_exists($template) ? $template : '';
        $debug['fields'] = array();
        foreach ($fields as $field) {
            $values = isset($field_values[$field]) ? $field_values[$field] : array();
            $debug['fields'][] = array(
                'name' => $field,
                'count' => count($values),
                'values' => implode(', ', $values)
            );
        }
        return $debug;
    }

    private function getFilterFieldsBySort($sort)
    {
        $template_fields = $this->getTemplateFilterFields($sort);
        if (! $template_fields) {
            return array();
        }

        $seo_fields = $this->getSeoFilterFieldsBySort($sort);
        $fields = array();
        if ($seo_fields) {
            foreach ($seo_fields as $field) {
                if (in_array($field, $template_fields, true) && ! in_array($field, $fields, true)) {
                    $fields[] = $field;
                }
            }
        }
        foreach ($template_fields as $field) {
            if (! in_array($field, $fields, true)) {
                $fields[] = $field;
            }
        }
        return $fields;
    }

    private function getTemplateFilterFields($sort)
    {
        if (empty($sort->listtpl)) {
            return array();
        }

        $template = $this->getTemplatePath($sort);
        if (! $template || ! file_exists($template)) {
            return array();
        }

        $content = file_get_contents($template);
        $fields = array();
        if (preg_match_all('/\{pboot:select(?:group)?\s+[^}]*field\s*=\s*[\'"]?([\w\-]+)[\'"]?/i', $content, $matches)) {
            foreach ($matches[1] as $field) {
                if (! in_array($field, $fields, true)) {
                    $fields[] = $field;
                }
            }
        }
        return $fields;
    }

    private function getTemplatePath($sort)
    {
        $tpl_dir = current($this->config('tpl_dir'));
        $theme = $this->getThemeByAcode(isset($sort->acode) ? $sort->acode : '');
        $htmldir = $this->config('tpl_html_dir') ? '/' . trim($this->config('tpl_html_dir'), '/') : '';
        return ROOT_PATH . $tpl_dir . '/' . $theme . $htmldir . '/' . basename($sort->listtpl);
    }

    private function getThemeByAcode($acode)
    {
        $lgs = $this->config('lgs');
        if ($acode && isset($lgs[$acode]['theme']) && $lgs[$acode]['theme']) {
            return $lgs[$acode]['theme'];
        }
        return get_theme();
    }

    private function getSeoFilterFieldsBySort($sort)
    {
        $rules = json_decode(html_entity_decode((string) $sort->select_filter_seo_rules, ENT_QUOTES, 'UTF-8'), true);
        if (! is_array($rules)) {
            return array();
        }

        $texts = array();
        if (isset($rules['default']) && is_array($rules['default'])) {
            $texts = array_merge($texts, $rules['default']);
        }
        if (isset($rules['rules']) && is_array($rules['rules'])) {
            foreach ($rules['rules'] as $rule) {
                if (is_array($rule)) {
                    $texts = array_merge($texts, $rule);
                }
            }
        }

        $fields = array();
        foreach ($texts as $text) {
            if (is_array($text)) {
                continue;
            }
            if (preg_match_all('/\{filter:([\w\-]+)\}/', (string) $text, $matches)) {
                foreach ($matches[1] as $field) {
                    if (! in_array($field, $fields, true)) {
                        $fields[] = $field;
                    }
                }
            }
        }
        return $fields;
    }

    private function getJsonConfig($key)
    {
        $config = html_entity_decode((string) $this->config($key), ENT_QUOTES, 'UTF-8');
        $data = json_decode($config, true);
        return is_array($data) ? $data : array();
    }

    private function normalizeFields($fields)
    {
        $result = array();
        foreach ($fields as $field) {
            $field = trim((string) $field);
            if ($field !== '' && ! in_array($field, $result, true)) {
                $result[] = $field;
            }
        }
        return $result;
    }

    private function splitSelectValues($data)
    {
        $values = array();
        foreach (explode(',', (string) $data) as $value) {
            $value = trim($value);
            if ($value !== '' && ! in_array($value, $values, true)) {
                $values[] = $value;
            }
        }
        return $values;
    }

    private function buildFilterCombinations($field_values, $depth)
    {
        $fields = array_keys($field_values);
        $field_sets = $this->chooseFields($fields, $depth);
        $result = array();
        foreach ($field_sets as $field_set) {
            $this->appendValueCombinations($field_set, $field_values, 0, array(), $result);
        }
        return $result;
    }

    private function chooseFields($fields, $depth, $start = 0, $prefix = array())
    {
        if (count($prefix) == $depth) {
            return array($prefix);
        }

        $result = array();
        for ($i = $start; $i < count($fields); $i ++) {
            $next = $prefix;
            $next[] = $fields[$i];
            $result = array_merge($result, $this->chooseFields($fields, $depth, $i + 1, $next));
        }
        return $result;
    }

    private function appendValueCombinations($field_set, $field_values, $index, $current, &$result)
    {
        if ($index >= count($field_set)) {
            $result[] = $current;
            return;
        }

        $field = $field_set[$index];
        foreach ($field_values[$field] as $value) {
            $current[$field] = $this->buildFilterSlug($value);
            $this->appendValueCombinations($field_set, $field_values, $index + 1, $current, $result);
        }
    }

    private function buildFilterUrl($base_link, $selected, $fields)
    {
        $link = rtrim($base_link, '/');
        foreach ($fields as $field) {
            if (isset($selected[$field]) && $selected[$field] !== '') {
                $link .= '/' . $selected[$field];
            }
        }
        return $link . '/';
    }

    private function buildFilterSlug($value)
    {
        $value = trim(html_entity_decode((string) $value, ENT_QUOTES, 'UTF-8'));
        if ($value === '') {
            return '';
        }

        $map = $this->getFilterSlugMap();
        if (isset($map[$value])) {
            return $map[$value];
        }

        $value = preg_replace('/(?<=\d)\.(?=\d)/', 'pbootdecimalpoint', $value);
        $slug = preg_replace('/[^\p{L}\p{N}]+/u', '-', $value);
        $slug = trim($slug, '-');
        $slug = function_exists('mb_strtolower') ? mb_strtolower($slug, 'UTF-8') : strtolower($slug);
        $slug = str_replace('pbootdecimalpoint', '.', $slug);
        return $slug ?: $value;
    }

    private function getFilterSlugMap()
    {
        $map = array();
        $rules = $this->getJsonConfig('select_url_path_rules');
        if (isset($rules['options']) && is_array($rules['options'])) {
            foreach ($rules['options'] as $options) {
                if (! is_array($options)) {
                    continue;
                }
                foreach ($options as $text => $slug) {
                    if ($text !== '' && $slug !== '') {
                        $map[$text] = $slug;
                    }
                }
            }
        }
        return $map;
    }

    // 文本格式 重建静态缓存需要
    public function linkTxt()
    {
        header("Content-type:text/plain;charset=utf-8");
        $sorts = $this->model->getSorts();
        $Parser = new ParserController();
        $str = get_http_url() . "\r\n";
        foreach ($sorts as $value) {
            if ($value->outlink) {
                continue;
            } elseif ($value->type == 1) {
                $link = $Parser->parserLink(1, $value->urlname, 'about', $value->scode, $value->filename);
                $str .= get_http_url() . $link . "\r\n";
            } else {
                $link = $Parser->parserLink(2, $value->urlname, 'list', $value->scode, $value->filename);
                $str .= get_http_url() . $link . "\r\n";
                $contents = $this->model->getSortContent($value->scode);
                foreach ($contents as $value2) {
                    if ($value2->outlink) { // 外链
                        continue;
                    } else {
                        $link = $Parser->parserLink(2, $value2->urlname, 'content', $value2->scode, $value2->sortfilename, $value2->id, $value2->filename);
                    }
                    $str .= get_http_url() . $link . "\r\n";
                }
            }
        }
        echo $str;
    }
	// 文本格式每日  重建静态缓存需要
    public function linkTxtday()
    {
        header("Content-type:text/plain;charset=utf-8");
        $sorts = $this->model->getSorts();
        $Parser = new ParserController();
        $str = get_http_url() . "\r\n";
        foreach ($sorts as $value) {
            if ($value->outlink) {
                continue;
            } elseif ($value->type == 1) {
                $link = $Parser->parserLink(1, $value->urlname, 'about', $value->scode, $value->filename);
                $str .= get_http_url() . $link . "\r\n";
            } else {
                $link = $Parser->parserLink(2, $value->urlname, 'list', $value->scode, $value->filename);
                $str .= get_http_url() . $link . "\r\n";
                $contents = $this->model->getSortContent($value->scode);
                foreach ($contents as $value2) {
                    if ($value2->outlink) { // 外链
                        continue;
                    } else {
						if(date('Y-m-d', strtotime($value2->date)) == date('Y-m-d', time())){
                        $link = $Parser->parserLink(2, $value2->urlname, 'content', $value2->scode, $value2->sortfilename, $value2->id, $value2->filename);
						} else {
							continue;
						}
					}
                    $str .= get_http_url() . $link . "\r\n";
                }
            }
        }
        echo $str;
    }
}
