<?php
/**
 * Content sort controller.
 *
 * @copyright (C)2016-2099 Hnaoyun Inc.
 * @author XingMeng
 * @email hnxsh@foxmail.com
 * @date 2017-02-06
 */
namespace app\admin\controller\content;

use core\basic\Controller;
use app\admin\model\content\ContentSortModel;
use app\home\controller\SitemapController;

class ContentSortController extends Controller
{

    private $count;

    private $blank;

    private $outData = array();

    private $model;

    public function __construct()
    {
        $this->model = new ContentSortModel();
        $fields = $this->model->tableFields('ay_content_sort');
        if (! in_array('select_filter_values', $fields)) {
            $this->model->amd('ALTER TABLE ay_content_sort ADD COLUMN select_filter_values TEXT NULL');
        }
        if (! in_array('select_filter_manual_values', $fields)) {
            $this->model->amd('ALTER TABLE ay_content_sort ADD COLUMN select_filter_manual_values TEXT NULL');
        }
        if (! in_array('select_filter_seo_rules', $fields)) {
            $this->model->amd('ALTER TABLE ay_content_sort ADD COLUMN select_filter_seo_rules TEXT NULL');
        }
        if (! in_array('select_filter_sync', $fields)) {
            $this->model->amd('ALTER TABLE ay_content_sort ADD COLUMN select_filter_sync TEXT NULL');
        }
    }

    // 内容栏目列表
    public function index()
    {
        $this->assign('list', true);
        $tree = $this->model->getList();
        $sorts = $this->makeSortList($tree);
        $this->assign('sorts', $sorts);
        
        // 内容模型
        $models = model('admin.content.Model');
        $this->assign('allmodels', $models->getSelectAll());
        $this->assign('models', $models->getSelect());
        // Content sort dropdown
        $sort_tree = $this->model->getSelect();
        $sort_select = $this->makeSortSelect($sort_tree);
        $this->assign('sort_select', $sort_select);
        
        // 模板文件
        $htmldir = $this->config('tpl_html_dir') ? '/' . $this->config('tpl_html_dir') : '';
        $this->assign('tpls', file_list(ROOT_PATH . current($this->config('tpl_dir')) . '/' . $this->model->getTheme() . $htmldir));
        // Frontend URL separator
        $url_break_char = $this->config('url_break_char') ?: '_';
        $this->assign('url_break_char', $url_break_char);
        
        // 获取会员分组
        $this->assign('groups', model('admin.member.MemberGroup')->getSelect());
        $this->assignSelectFilterFields();
        if (isset($sort) && $sort) {
            $this->assignMergeFilterFields($sort->scode);
        }
        
        $this->display('content/contentsort.html');
    }

    public function filterSitemap()
    {
        if (! $scode = get('scode', 'var')) {
            error('传递的栏目编码参数有误，请核对后重试！', - 1);
        }

        $sort = $this->model->getSort($scode);
        if (! $sort) {
            error('栏目不存在，无法生成筛选地图！', - 1);
        }
        if ($sort->outlink || $sort->type == 1) {
            error('外链栏目或单页栏目不生成多条件筛选地图！', - 1);
        }

        $sitemap = new SitemapController();
        $xml = $sitemap->buildFilterXml($scode);
        $count = substr_count($xml, '<url>');
        if (! $count) {
            error('当前栏目没有可生成的多条件筛选URL！', - 1);
        }

        $filename = 'sitemap-filter-' . preg_replace('/[^\w\-]/', '', $scode) . '.xml';
        $file = ROOT_PATH . '/' . $filename;
        if (! file_put_contents($file, $xml)) {
            error('筛选地图文件写入失败，请检查网站根目录写入权限！', - 1);
        }

        $this->log('生成栏目筛选地图成功：' . $filename);
        success('生成成功：' . get_http_url() . SITE_DIR . '/' . $filename . '，共 ' . $count . ' 条URL', - 1);
    }

    public function sitemap()
    {
        $sorts = $this->getSitemapSorts();
        $this->assign('models', model('admin.content.Model')->getSelect());
        $this->assign('sorts', $sorts);
        $this->assign('select_url_path_seo_rules_value', htmlspecialchars($this->getTextConfig('select_url_path_seo_rules'), ENT_QUOTES, 'UTF-8'));
        $this->assign('sort_select_filter_seo_rules_json', htmlspecialchars($this->getSortSelectFilterSeoRulesJson($sorts), ENT_QUOTES, 'UTF-8'));
        $this->assign('sort_select_filter_values_json', htmlspecialchars($this->getSortSelectFilterValuesJson($sorts), ENT_QUOTES, 'UTF-8'));
        $this->assign('selected_sort_tdk_mcode', get('sort_tdk_mcode', 'var'));
        $this->assign('selected_sort_tdk_scode', get('sort_tdk_scode', 'var'));
        $this->assignSelectFilterFields();

        if ($_POST) {
            $mcode = post('mcode', 'var');
            $scode = post('scode', 'var');
            if (! $mcode) {
                alert_back('请选择模型！');
            }
            if (! $scode) {
                alert_back('请选择栏目！');
            }

            $sort = $this->model->getSort($scode);
            if (! $sort || $sort->mcode != $mcode) {
                alert_back('模型和栏目不匹配，请重新选择！');
            }
            if ($sort->outlink || $sort->type == 1) {
                alert_back('外链栏目或单页栏目不生成多条件筛选地图！');
            }

            $result = $this->makeFilterSitemap($scode);
            $this->assign('result', $result);
            $this->assign('selected_mcode', $mcode);
            $this->assign('selected_scode', $scode);
        }

        $this->display('content/sitemap.html');
    }

    public function saveSelectFilterSortTdk()
    {
        if ($_POST) {
            $mcode = post('mcode', 'var');
            $scode = post('scode', 'var');
            if (! $mcode) {
                alert_back('请选择模型！');
            }
            if (! $scode) {
                alert_back('请选择栏目！');
            }

            $sort = $this->model->getSort($scode);
            if (! $sort || (string) $sort->mcode !== (string) $mcode) {
                alert_back('模型和栏目不匹配，请重新选择！');
            }

            $value = $this->normalizeSelectFilterSeoRules($this->getRawPostValue('select_filter_seo_rules'));
            $saved = $this->model->modSort($scode, array(
                'select_filter_seo_rules' => $value,
                'update_user' => session('username')
            ));
            $new_sort = $this->model->getSort($scode);
            if ($saved || ($new_sort && (string) $new_sort->select_filter_seo_rules === (string) $value)) {
                $this->log('保存栏目级筛选TDK配置成功：' . $scode);
                success('保存成功！', url('/admin/ContentSort/sitemap/sort_tdk_mcode/' . $mcode . '/sort_tdk_scode/' . $scode, false));
            } else {
                error('保存失败，请重试！', -1);
            }
        }
        error('提交数据错误！', -1);
    }

    public function saveSelectFilterSortValues()
    {
        if ($_POST) {
            $mcode = post('mcode', 'var');
            $scode = post('scode', 'var');
            if (! $mcode) {
                alert_back('请选择模型！');
            }
            if (! $scode) {
                alert_back('请选择栏目！');
            }

            $sort = $this->model->getSort($scode);
            if (! $sort || (string) $sort->mcode !== (string) $mcode) {
                alert_back('模型和栏目不匹配，请重新选择！');
            }

            $old_sync_fields = $this->getSortSyncFields($sort);
            $values = $this->getSelectFilterValuesFromPost();
            $sync = $this->getSelectFilterSyncFromPost();
            $auto_values = $this->rebuildOwnAutoSelectFilterValues($scode, $sort, $values);
            $saved = $this->model->modSort($scode, array(
                'select_filter_values' => $auto_values,
                'select_filter_manual_values' => $values,
                'select_filter_sync' => $sync,
                'update_user' => session('username')
            ));
            $new_sort = $this->model->getSort($scode);
            if ($saved || ($new_sort && (string) $new_sort->select_filter_manual_values === (string) $values && (string) $new_sort->select_filter_sync === (string) $sync)) {
                $this->rebuildSelectFilterParents($scode, $old_sync_fields);
                $this->log('保存栏目筛选值配置成功：' . $scode);
                success('保存成功！', url('/admin/ContentSort/sitemap', false));
            } else {
                error('保存失败，请重试！', -1);
            }
        }
        error('提交数据错误！', -1);
    }

    public function saveSelectFilterModelTdk()
    {
        if ($_POST) {
            $value = isset($_POST['select_url_path_seo_rules']) ? trim((string) $_POST['select_url_path_seo_rules']) : '';
            $value = $this->normalizeModelSelectFilterSeoRules($value);
            $this->saveTextConfig('select_url_path_seo_rules', $value);
            $this->log('保存模型级筛选TDK默认配置成功！');
            if (function_exists('path_delete')) {
                path_delete(RUN_PATH . '/config');
            }
            success('保存成功！', url('/admin/ContentSort/sitemap', false));
        }
        error('提交数据错误！', -1);
    }

    public function syncSelectFilter()
    {
        if (! $scode = get('scode', 'var')) {
            error('传递的栏目编码参数有误，请核对后重试！', -1);
        }

        if (! $sort = $this->model->getSort($scode)) {
            error('栏目不存在，无法合并筛选值！', -1);
        }

        $merge_fields = isset($_POST['merge_fields']) && is_array($_POST['merge_fields']) ? $_POST['merge_fields'] : array();
        $merge_field_map = array();
        foreach ($merge_fields as $field) {
            $field = trim((string) $field);
            if (preg_match('/^ext_[\w\-]+$/', $field)) {
                $merge_field_map[$field] = true;
            }
        }
        if (! $merge_field_map) {
            error('请先选择要合并的筛选字段！', -1);
        }

        $rows = $this->model->getSubSortRows($scode);
        if (! $rows) {
            error('当前栏目没有下级栏目，无法合并筛选值！', -1);
        }

        $merged = array();
        foreach ($rows as $row) {
            $config = json_decode((string) $row->select_filter_values, true);
            if (! is_array($config)) {
                continue;
            }

            foreach ($config as $field => $value) {
                if (! preg_match('/^ext_[\w\-]+$/', $field)) {
                    continue;
                }
                if (! isset($merge_field_map[$field])) {
                    continue;
                }

                $source = trim((string) $value);
                if ($source === '') {
                    $source = (string) $this->model->getExtFieldValue($row->mcode, $field);
                }

                if (! isset($merged[$field])) {
                    $merged[$field] = array();
                }

                foreach ($this->splitSelectFilterItems($source) as $item) {
                    if (! in_array($item, $merged[$field], true)) {
                        $merged[$field][] = $item;
                    }
                }
            }
        }

        if (! $merged) {
            error('下级栏目没有可合并的筛选值！', -1);
        }

        $data = json_decode((string) $sort->select_filter_values, true);
        if (! is_array($data)) {
            $data = array();
        }
        foreach ($merged as $field => $values) {
            $data[$field] = implode(',', $values);
        }

        $json = $data ? json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT) : '';
        if ($this->model->modSort($scode, array('select_filter_values' => $json))) {
            $this->log('合并下级栏目筛选值到栏目' . $scode . '成功！');
            success('合并成功，请检查当前栏目的筛选设置！', -1);
        } else {
            error('合并失败，请重试！', -1);
        }
    }

    public function syncSelectFilterToParents()
    {
        if (! $scode = get('scode', 'var')) {
            error('传递的栏目编码参数有误，请核对后重试！', -1);
        }
        $field = isset($_POST['field']) ? trim((string) $_POST['field']) : '';
        if (! preg_match('/^ext_[\w\-]+$/', $field)) {
            error('传递的筛选字段有误，请核对后重试！', -1);
        }

        if (! $sort = $this->model->getSort($scode)) {
            error('栏目不存在，无法同步筛选值！', -1);
        }

        $field_value = isset($_POST['field_value']) ? trim((string) $_POST['field_value']) : '';
        $field_value = trim(str_replace(array("\r\n", "\r", "\n", "\xEF\xBC\x8C"), ',', $field_value));

        $current_data = json_decode((string) $sort->select_filter_values, true);
        if (! is_array($current_data)) {
            $current_data = array();
        }
        $current_data[$field] = $field_value;
        $this->model->modSort($scode, array(
            'select_filter_values' => json_encode($current_data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT)
        ));

        $source = $field_value;
        if ($source === '') {
            $source = (string) $this->model->getExtFieldValue($sort->mcode, $field);
        }
        $items = $this->splitSelectFilterItems($source);
        if (! $items) {
            error('当前字段没有可同步的筛选值！', -1);
        }

        $sync_count = 0;
        $current = $sort;
        while ($current && $current->pcode) {
            $parent = $this->model->getSort($current->pcode);
            if (! $parent) {
                break;
            }

            $parent_data = json_decode((string) $parent->select_filter_values, true);
            if (! is_array($parent_data)) {
                $parent_data = array();
            }

            $merged = array();
            if (isset($parent_data[$field]) && trim((string) $parent_data[$field]) !== '') {
                $merged = $this->splitSelectFilterItems($parent_data[$field]);
            }
            foreach ($items as $item) {
                if (! in_array($item, $merged, true)) {
                    $merged[] = $item;
                }
            }
            $parent_data[$field] = implode(',', $merged);
            if ($this->model->modSort($parent->scode, array(
                'select_filter_values' => json_encode($parent_data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT)
            ))) {
                $sync_count ++;
            }
            $current = $parent;
        }

        if (! $sync_count) {
            error('当前栏目没有可同步的上级栏目！', -1);
        }
        $this->log('同步栏目' . $scode . '筛选字段' . $field . '到上级栏目成功！');
        success('同步成功，已将当前字段合并到上级栏目！', -1);
    }

    private function splitSelectFilterItems($text)
    {
        $items = array();
        $text = str_replace(array("\r\n", "\r", "\n", "\xEF\xBC\x8C"), ',', (string) $text);
        foreach (explode(',', $text) as $item) {
            $item = trim($item);
            if ($item !== '' && ! in_array($item, $items, true)) {
                $items[] = $item;
            }
        }
        return $items;
    }

    private function makeFilterSitemap($scode)
    {
        $sitemap = new SitemapController();
        $xml = $sitemap->buildFilterXml($scode);
        $count = substr_count($xml, '<url>');
        if (! $count) {
            alert_back('当前栏目没有可生成的多条件筛选URL！');
        }

        $filename = 'sitemap-filter-' . preg_replace('/[^\w\-]/', '', $scode) . '.xml';
        $file = ROOT_PATH . '/' . $filename;
        if (! file_put_contents($file, $xml)) {
            alert_back('筛选地图文件写入失败，请检查网站根目录写入权限！');
        }

        $this->log('生成栏目筛选地图成功：' . $filename);
        $result = new \stdClass();
        $result->filename = $filename;
        $result->url = get_http_url() . SITE_DIR . '/' . $filename;
        $result->count = $count;
        $result->debug = $this->normalizeSitemapDebug($sitemap->getFilterDebug($scode));
        $result->debug_fields = $result->debug->fields;
        return $result;
    }

    private function normalizeSitemapDebug($debug)
    {
        $result = new \stdClass();
        $result->template = isset($debug['template']) ? $debug['template'] : '';
        $result->template_path = isset($debug['template_path']) ? $debug['template_path'] : '';
        $result->fields = array();
        if (! empty($debug['fields']) && is_array($debug['fields'])) {
            foreach ($debug['fields'] as $field) {
                $item = new \stdClass();
                $item->name = isset($field['name']) ? $field['name'] : '';
                $item->count = isset($field['count']) ? $field['count'] : 0;
                $item->values = isset($field['values']) ? $field['values'] : '';
                $result->fields[] = $item;
            }
        }
        return $result;
    }

    private function getSitemapSorts()
    {
        $tree = $this->model->getList();
        $data = array();
        $this->appendSitemapSorts($tree, $data);
        return $data;
    }

    private function appendSitemapSorts($tree, &$data, $level = 0)
    {
        if (! $tree) {
            return;
        }
        foreach ($tree as $sort) {
            if (! $sort->outlink && $sort->type != 1) {
                $item = new \stdClass();
                $item->scode = $sort->scode;
                $item->pcode = $sort->pcode;
                $item->mcode = $sort->mcode;
                $item->name = str_repeat('　　', $level) . $sort->name;
                $item->select_filter_seo_rules = isset($sort->select_filter_seo_rules) ? $sort->select_filter_seo_rules : '';
                $item->select_filter_values = isset($sort->select_filter_values) ? $sort->select_filter_values : '';
                $item->select_filter_manual_values = isset($sort->select_filter_manual_values) ? $sort->select_filter_manual_values : '';
                $item->select_filter_sync = isset($sort->select_filter_sync) ? $sort->select_filter_sync : '';
                $data[] = $item;
            }
            if (! empty($sort->son)) {
                $this->appendSitemapSorts($sort->son, $data, $level + 1);
            }
        }
    }

    private function getSortSelectFilterSeoRulesJson($sorts)
    {
        $data = array();
        foreach ($sorts as $sort) {
            $scode = (string) $sort->scode;
            $rules = isset($sort->select_filter_seo_rules) ? trim((string) $sort->select_filter_seo_rules) : '';
            $data[$scode] = array(
                'mcode' => (string) $sort->mcode,
                'rules' => $rules
            );
        }
        return json_encode($data, JSON_UNESCAPED_UNICODE);
    }

    private function mergeSelectFilterValuesJson($auto_json, $manual_json)
    {
        $merged = $this->mergeSelectFilterData($this->readSelectFilterValueJson($auto_json), $this->readSelectFilterValueJson($manual_json));
        return $merged ? json_encode($merged, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT) : '';
    }

    private function readSelectFilterValueJson($json)
    {
        $data = json_decode((string) $json, true);
        return is_array($data) ? $data : array();
    }

    private function mergeSelectFilterData($auto, $manual)
    {
        $result = array();
        foreach (array($auto, $manual) as $group) {
            foreach ($group as $field => $value) {
                if (! preg_match('/^ext_[\w\-]+$/', $field)) {
                    continue;
                }
                if (! isset($result[$field])) {
                    $result[$field] = array();
                }
                foreach ($this->splitSelectFilterItems($value) as $item) {
                    if (! in_array($item, $result[$field], true)) {
                        $result[$field][] = $item;
                    }
                }
            }
        }
        foreach ($result as $field => $items) {
            if ($items) {
                $result[$field] = implode(',', $items);
            } else {
                unset($result[$field]);
            }
        }
        return $result;
    }

    private function getSortSelectFilterValuesJson($sorts)
    {
        $data = array();
        foreach ($sorts as $sort) {
            $scode = (string) $sort->scode;
            $auto = isset($sort->select_filter_values) ? trim((string) $sort->select_filter_values) : '';
            $manual = isset($sort->select_filter_manual_values) ? trim((string) $sort->select_filter_manual_values) : '';
            $data[$scode] = array(
                'mcode' => (string) $sort->mcode,
                'values' => $this->mergeSelectFilterValuesJson($auto, $manual),
                'manual' => $manual,
                'sync' => isset($sort->select_filter_sync) ? trim((string) $sort->select_filter_sync) : ''
            );
        }
        return json_encode($data, JSON_UNESCAPED_UNICODE);
    }

    // 生成无限级内容栏目列表
    private function makeSortList($tree)
    {
        // 循环生成
        foreach ($tree as $value) {
            $this->count ++;
            $this->outData[$this->count] = new \stdClass();
            foreach ($value as $k => $v) {
                $this->outData[$this->count]->$k = $v;
            }
            
            if ($value->son) {
                $this->outData[$this->count]->son = true;
            } else {
                $this->outData[$this->count]->son = false;
            }
            
            // 子菜单处理
            if ($value->son) {
                $this->blank .= '　　';
                $this->makeSortList($value->son);
            }
        }
        
        // 循环完后回归缩进位置
        $this->blank = substr($this->blank, 6);
        return $this->outData;
    }

    // 内容栏目增加
    public function add()
    {
        if ($_POST) {
            if (! ! $multiplename = post('multiplename')) {
                $multiplename = str_replace('，', ',', $multiplename);
                $pcode = post('pcode', 'var');
                $type = post('type');
                $mcode = post('mcode');
                $listtpl = basename(post('listtpl'));
                $contenttpl = basename(post('contenttpl'));
                $status = post('status');
                
                if (! $pcode) { // 父编码默认为0
                    $pcode = 0;
                }
                
                if (! $mcode) {
                    alert_back('栏目模型必须选择！');
                }
                $type = $this->getModelType($mcode) ?: $type;
                
                if (! $type) {
                    alert_back('栏目类型不能为空！');
                }
                
                $names = explode(',', $multiplename);
                $lastcode = $this->model->getLastCode();
                $scode = get_auto_code($lastcode);
                foreach ($names as $key => $value) {
                    $data[] = array(
                        'acode' => session('acode'),
                        'pcode' => $pcode,
                        'scode' => $scode,
                        'name' => $value,
                        'mcode' => $mcode,
                        'listtpl' => $listtpl,
                        'contenttpl' => $contenttpl,
                        'status' => $status,
                        'gid' => 0,
                        'gtype' => 4,
                        'subname' => '',
                        'filename' => '',
                        'outlink' => '',
                        'ico' => '',
                        'pic' => '',
                        'title' => '',
                        'keywords' => '',
                        'description' => '',
                        'sorting' => 255,
                        'create_user' => session('username'),
                        'update_user' => session('username')
                    );
                    $scode = get_auto_code($scode);
                }
            } else {
                // 获取数据
                $scode = get_auto_code($this->model->getLastCode()); // 自动编码;
                $pcode = post('pcode', 'var');
                $name = post('name');
                $type = post('type');
                $mcode = post('mcode');
                $listtpl = basename(post('listtpl'));
                $contenttpl = basename(post('contenttpl'));
                $status = post('status');
                $subname = post('subname');
                $filename = trim(post('filename'), '/');
                $outlink = post('outlink');
                $ico = post('ico');
                $pic = post('pic');
                $title = post('title');
                $keywords = post('keywords');
                $description = post('description');
                $gid = post('gid', 'int') ?: 0;
                $gtype = post('gtype', 'int') ?: 4;
                $gnote = post('gnote');
                
                $def1 = post('def1');
                $def2 = post('def2');
                $def3 = post('def3');
                
                if (! $scode) {
                    alert_back('编码不能为空！');
                }
                
                if (! $pcode) { // 父编码默认为0
                    $pcode = 0;
                }
                
                if (! $name) {
                    alert_back('栏目名不能为空！');
                }
                
                if (! $mcode) {
                    alert_back('栏目模型必须选择！');
                }
                $type = $this->getModelType($mcode) ?: $type;
                
                if (! $type) {
                    alert_back('栏目类型不能为空！');
                }
                
                if ($filename && ! preg_match('/^[a-zA-Z0-9\-\/]+$/', $filename)) {
                    alert_back('URL名称只允许字母、数字、横线、斜线组成！');
                }
                
                if ($filename && $this->model->checkUrlname($filename)) {
                    alert_back('URL名称与模型URL名称冲突，请换一个名称！');
                }
                
                // 缩放缩略�?
                if ($ico) {
                    resize_img(ROOT_PATH . $ico, '', $this->config('ico.max_width'), $this->config('ico.max_height'));
                }
                
                // 检查编�?
                if ($this->model->checkSort("scode='$scode'")) {
                    alert_back('该内容栏目编号已经存在，不能再使用！');
                }
                
                // 检查自定义URL名称
                if ($filename) {
                    while ($this->model->checkFilename($filename)) {
                        $filename = $filename . '_' . mt_rand(1, 20);
                    }
                }
                
                // 构建数据
                $data = array(
                    'acode' => session('acode'),
                    'pcode' => $pcode,
                    'scode' => $scode,
                    'name' => $name,
                    'mcode' => $mcode,
                    'listtpl' => $listtpl,
                    'contenttpl' => $contenttpl,
                    'status' => $status,
                    'gid' => $gid,
                    'gtype' => $gtype,
                    'gnote' => $gnote,
                    'subname' => $subname,
                    'def1' => $def1,
                    'def2' => $def2,
                    'def3' => $def3,
                    'filename' => $filename,
                    'outlink' => $outlink,
                    'ico' => $ico,
                    'pic' => $pic,
                    'title' => $title,
                    'keywords' => $keywords,
                    'description' => $description,
                    'sorting' => 255,
                    'create_user' => session('username'),
                    'update_user' => session('username')
                );
            }
            
            // 执行添加
            if ($this->model->addSort($data)) {
                if ($type == 1 && ! $outlink) { // 在填写了外链时不生成单页
                    if ($multiplename) {
                        foreach ($data as $key => $value) {
                            $this->addSingle($value['scode'], $value['name']);
                        }
                    } else {
                        $this->addSingle($scode, $name);
                    }
                }
                $this->log('新增数据内容栏目' . $scode . '成功！');
                success('新增成功！', url('/admin/ContentSort/index'));
            } else {
                $this->log('新增数据内容栏目' . $scode . '失败！');
                error('新增失败！', - 1);
            }
        }
    }

    // 生成内容栏目下拉选择
    private function makeSortSelect($tree, $selectid = null)
    {
        $list_html = '';
        foreach ($tree as $value) {
            // 默认选择�?
            if ($selectid == $value->scode) {
                $select = "selected='selected'";
            } else {
                $select = '';
            }
            if (get('scode') != $value->scode) {
                // Do not allow selecting itself as parent.
                $list_html .= "<option value='{$value->scode}' $select>{$this->blank}{$value->name}</option>";
            }
            // 子菜单处理
            if ($value->son) {
                $this->blank .= '　　';
                $list_html .= $this->makeSortSelect($value->son, $selectid);
            }
        }
        // 循环完后回归位置
        $this->blank = substr($this->blank, 0, - 6);
        return $list_html;
    }

    // 内容栏目删除
    public function del()
    {
        // 执行批量删除
        if ($_POST) {
            if (! ! $list = post('list')) {
                if ($this->model->delSortList($list)) {
                    $this->log('批量删除栏目成功！');
                    success('批量删除成功！', - 1);
                } else {
                    $this->log('批量删除栏目失败！');
                    error('批量删除失败！', - 1);
                }
            } else {
                alert_back('请选择要删除的栏目！');
            }
        }
        
        if (! $scode = get('scode', 'var')) {
            error('传递的参数值错误！', - 1);
        }
        if ($this->model->delSort($scode)) {
            $this->log('删除数据内容栏目' . $scode . '成功！');
            success('删除成功！', - 1);
        } else {
            $this->log('删除数据内容栏目' . $scode . '失败！');
            error('删除失败！', - 1);
        }
    }

        // 批量更新文章时间
    public function batchUpdateTime()
    {
        // 获取 POST 数据中的文章 ID 列表
        if ($_POST) {
            if (!$list = post('list')) {
                alert_back('请选择要更新的文章！');
            }
    
            // 获取新的更新时间
            $new_time = post('update_time', 'var', date('Y-m-d H:i:s'));
    
            // 执行批量更新操作
            if ($this->model->batchUpdateTime($list, $new_time)) {
                $this->log('批量更新时间成功！');
                success('批量更新时间成功！', -1);
            } else {
                $this->log('批量更新时间失败！');
                error('批量更新时间失败！', -1);
            }
        }
    }


    // 内容栏目修改
    public function mod()
    {
        if (! ! $submit = post('submit')) {
            switch ($submit) {
                case 'sorting': // 修改列表排序
                    $listall = post('listall');
                    if ($listall) {
                        $sorting = post('sorting');
                        foreach ($listall as $key => $value) {
                            if ($sorting[$key] === '' || ! is_numeric($sorting[$key]))
                                $sorting[$key] = 255;
                            $this->model->modSortSorting($value, "sorting=" . $sorting[$key]);
                        }
                        $this->log('批量修改栏目排序成功！');
                        success('修改成功！', - 1);
                    } else {
                        alert_back('排序失败，无任何内容！');
                    }
                    break;
            }
        }
        
        if (! $scode = get('scode', 'var')) {
            error('传递的参数值错误！', - 1);
        }
        
        // 单独修改状态
        if (($field = get('field', 'var')) && ! is_null($value = get('value', 'var'))) {
            if ($this->model->modSort($scode, "$field='$value',update_user='" . session('username') . "'")) {
                $this->log('修改数据内容栏目' . $scode . '状态' . $value . '成功！');
                location(- 1);
            } else {
                $this->log('修改数据内容栏目' . $scode . '状态' . $value . '失败！');
                alert_back('修改失败！');
            }
        }
        
        // 修改操作
        if ($_POST) {
            
            // 获取数据
            $pcode = post('pcode', 'var');
            $name = post('name');
            $mcode = post('mcode');
            $type = post('type');
            $listtpl = basename(post('listtpl'));
            $contenttpl = basename(post('contenttpl'));
            $status = post('status');
            $subname = post('subname');
            $filename = trim(post('filename'), '/');
            $outlink = post('outlink');
            $ico = post('ico');
            $pic = post('pic');
            $title = post('title');
            $keywords = post('keywords');
            $description = post('description');
            $select_filter_seo_raw = $this->getRawPostValue('select_filter_seo_rules');
            $old_sort = $this->model->getSort($scode);
            $old_sync_fields = $old_sort ? $this->getSortSyncFields($old_sort) : array();
            if (isset($_POST['select_filter_override']) || isset($_POST['select_filter_values'])) {
                $select_filter_manual_values = $this->getSelectFilterValuesFromPost();
                $select_filter_values = $old_sort ? $this->rebuildOwnAutoSelectFilterValues($scode, $old_sort, $select_filter_manual_values) : '';
                $select_filter_sync = $this->getSelectFilterSyncFromPost();
            } else {
                $select_filter_values = $old_sort ? $old_sort->select_filter_values : '';
                $select_filter_manual_values = $old_sort && isset($old_sort->select_filter_manual_values) ? $old_sort->select_filter_manual_values : '';
                $select_filter_sync = $old_sort ? $old_sort->select_filter_sync : '';
            }
            $select_filter_seo_rules = $select_filter_seo_raw === '' && $old_sort ? $old_sort->select_filter_seo_rules : $this->normalizeSelectFilterSeoRules($select_filter_seo_raw);
            $modsub = post('modsub', 'int');
            
            $gid = post('gid', 'int') ?: 0;
            $gtype = post('gtype', 'int') ?: 4;
            $gnote = post('gnote');
            
            $def1 = post('def1');
            $def2 = post('def2');
            $def3 = post('def3');
            
            if (! $pcode) { // 父编码默认为0
                $pcode = 0;
            }
            
            if (! $name) {
                alert_back('栏目名不能为空！');
            }
            
            if (! $mcode) {
                alert_back('栏目模型必须选择！');
            }
                $type = $this->getModelType($mcode) ?: $type;
            
            if (! $type) {
                alert_back('栏目类型不能为空！');
            }
            
            if ($filename && ! preg_match('/^[a-zA-Z0-9\-\/]+$/', $filename)) {
                alert_back('URL名称只允许字母、数字、横线、斜线组成！');
            }
            
            if ($filename && $this->model->checkUrlname($filename)) {
                alert_back('URL名称与模型URL名称冲突，请换一个名称！');
            }
            
            // 缩放缩略�?
            if ($ico) {
                resize_img(ROOT_PATH . $ico, '', $this->config('ico.max_width'), $this->config('ico.max_height'));
            }
            
            if ($filename) {
                while ($this->model->checkFilename($filename, "scode<>'$scode'")) {
                    $filename = $filename . '-' . mt_rand(1, 20);
                }
            }
            
            // 构建数据
            $data = array(
                'pcode' => $pcode,
                'name' => $name,
                'mcode' => $mcode,
                'listtpl' => $listtpl,
                'contenttpl' => $contenttpl,
                'status' => $status,
                'gid' => $gid,
                'gtype' => $gtype,
                'gnote' => $gnote,
                'subname' => $subname,
                'def1' => $def1,
                'def2' => $def2,
                'def3' => $def3,
                'filename' => $filename,
                'outlink' => $outlink,
                'ico' => $ico,
                'pic' => $pic,
                'title' => $title,
                'keywords' => $keywords,
                'description' => $description,
                'select_filter_values' => $select_filter_values,
                'select_filter_manual_values' => $select_filter_manual_values,
                'select_filter_sync' => $select_filter_sync,
                'select_filter_seo_rules' => $select_filter_seo_rules,
                'update_user' => session('username')
            );
            
            // 执行添加
            if ($this->model->modSort($scode, $data, $modsub)) {
                // 如果修改为单页并且跳转，则删除单页内容，否则判断是否存在内容，不存在则添加
                if ($type == 1 && $outlink) {
                    $this->model->delContent($scode);
                } elseif ($type == 1 && ! $this->model->findContent($scode)) {
                    $this->addSingle($scode, $name);
                }
                $this->rebuildSelectFilterParents($scode, $old_sync_fields);
                
                $this->log('修改数据内容栏目' . $scode . '成功！');
                success('修改成功！', url('/admin/ContentSort/index'));
            } else {
                location(- 1);
            }
        } else { // 调取修改内容
            $this->assign('mod', true);
            
            $sort = $this->model->getSort($scode);
            if (! $sort) {
                error('编辑的内容已经不存在！', - 1);
            }
            $this->assign('sort', $sort);
            
            // 父编码下拉选择
            $sort_tree = $this->model->getSelect();
            $sort_select = $this->makeSortSelect($sort_tree, $sort->pcode);
            $this->assign('sort_select', $sort_select);
            
            // 模板文件
            $htmldir = $this->config('tpl_html_dir') ? '/' . $this->config('tpl_html_dir') : '';
            $this->assign('tpls', file_list(ROOT_PATH . current($this->config('tpl_dir')) . '/' . $this->model->getTheme() . $htmldir));
            
            // 内容模型
            $models = model('admin.content.Model');
            $this->assign('models', $models->getSelect());
            
            // 获取会员分组
            $this->assign('groups', model('admin.member.MemberGroup')->getSelect());
            $this->assignSelectFilterFields();
            if (isset($sort) && $sort) {
                $this->assignMergeFilterFields($sort->scode);
            }
            
            $this->display('content/contentsort.html');
        }
    }

    // 分配栏目筛选字段
    private function assignSelectFilterFields()
    {
        $fields = model('admin.content.ExtField')->getSelectFilterFields();
        $data = array();
        foreach ($fields as $field) {
            $data[] = array(
                'mcode' => (string) $field->mcode,
                'name' => (string) $field->name,
                'type' => (int) $field->type,
                'description' => (string) $field->description,
                'value' => (string) $field->value
            );
        }
        $json = json_encode($data, JSON_UNESCAPED_UNICODE);
        $this->assign('select_filter_fields_json', htmlspecialchars($json, ENT_QUOTES, 'UTF-8'));
    }

    private function assignMergeFilterFields($scode)
    {
        $sort = $this->model->getSort($scode);
        $field_rows = model('admin.content.ExtField')->getSelectFilterFields();

        $data = array();
        foreach ($field_rows as $field) {
            if ($sort && (string) $field->mcode !== (string) $sort->mcode) {
                continue;
            }
            $item = new \stdClass();
            $item->name = (string) $field->name;
            $item->description = (string) ($field->description ?: $field->name);
            $data[] = $item;
        }
        $this->assign('merge_filter_fields', $data);
    }

    private function rebuildSelectFilterParents($scode, $extra_fields = array())
    {
        $sort = $this->model->getSort($scode);
        if (! $sort || ! $sort->pcode) {
            return;
        }

        $fields = array_merge($this->getSortSyncFields($sort), is_array($extra_fields) ? $extra_fields : array());
        $fields = array_values(array_unique($fields));
        if (! $fields) {
            return;
        }

        $current = $sort;
        while ($current && $current->pcode) {
            $parent = $this->model->getSort($current->pcode);
            if (! $parent) {
                break;
            }

            $parent_values = json_decode((string) $parent->select_filter_values, true);
            if (! is_array($parent_values)) {
                $parent_values = array();
            }
            foreach ($fields as $field) {
                $values = $this->collectSyncedSortFilterValues($parent->scode, $field);
                if ($values) {
                    $parent_values[$field] = implode(',', $values);
                } else {
                    unset($parent_values[$field]);
                }
            }
            $this->model->modSort($parent->scode, array(
                'select_filter_values' => $parent_values ? json_encode($parent_values, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT) : ''
            ));
            $current = $parent;
        }
    }

    private function rebuildOwnAutoSelectFilterValues($scode, $sort, $manual_json)
    {
        $fields = array();
        foreach (array($sort->select_filter_values, isset($sort->select_filter_manual_values) ? $sort->select_filter_manual_values : '', $manual_json) as $json) {
            $data = json_decode((string) $json, true);
            if (! is_array($data)) {
                continue;
            }
            foreach ($data as $field => $value) {
                if (preg_match('/^ext_[\w\-]+$/', $field)) {
                    $fields[$field] = true;
                }
            }
        }

        $auto = array();
        foreach (array_keys($fields) as $field) {
            $values = $this->collectSyncedSortFilterValues($scode, $field);
            if ($values) {
                $auto[$field] = implode(',', $values);
            }
        }
        return $auto ? json_encode($auto, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT) : '';
    }

    private function getSortSyncFields($sort)
    {
        $config = json_decode((string) $sort->select_filter_sync, true);
        if (! is_array($config)) {
            return array();
        }

        $fields = array();
        foreach ($config as $field => $enabled) {
            if ($enabled && preg_match('/^ext_[\w\-]+$/', $field)) {
                $fields[] = $field;
            }
        }
        return $fields;
    }

    private function collectSyncedSortFilterValues($ancestor_scode, $field)
    {
        $rows = $this->model->getSubSortRows($ancestor_scode);
        $values = array();
        foreach ($rows as $row) {
            $sync = json_decode((string) $row->select_filter_sync, true);
            if (! is_array($sync) || empty($sync[$field])) {
                continue;
            }

            $config = json_decode((string) $row->select_filter_manual_values, true);
            if (! is_array($config)) {
                $config = json_decode((string) $row->select_filter_values, true);
            }
            $source = '';
            if (is_array($config) && array_key_exists($field, $config)) {
                $source = trim((string) $config[$field]);
            }
            if ($source === '') {
                $source = (string) $this->model->getExtFieldValue($row->mcode, $field);
            }

            foreach ($this->splitSelectFilterItems($source) as $item) {
                if (! in_array($item, $values, true)) {
                    $values[] = $item;
                }
            }
        }
        return $values;
    }

    private function normalizeSelectFilterValues($text)
    {
        $text = trim((string) $text);
        if ($text === '') {
            return '';
        }

        $values = json_decode($text, true);
        if (! is_array($values)) {
            alert_back('栏目筛选值覆盖配置必须为有效 JSON！');
        }

        $result = array();
        foreach ($values as $field => $options) {
            if (! preg_match('/^ext_[\w\-]+$/', $field) || ($options !== false && ! is_string($options) && ! is_array($options))) {
                alert_back('栏目筛选值覆盖配置包含无效字段或筛选值！');
            }
            if ($options === false) {
                continue;
            }
            if (is_array($options)) {
                $options = implode(',', $options);
            }
            $options = trim(str_replace(array("\r\n", "\r", "\n", "\xEF\xBC\x8C"), ',', $options));
            $result[$field] = $options;
        }
        return $result ? json_encode($result, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT) : '';
    }

    private function getSelectFilterValuesFromPost()
    {
		$overrides = isset($_POST['select_filter_override']) && is_array($_POST['select_filter_override']) ? $_POST['select_filter_override'] : null;
		if ($overrides === null) {
			return $this->normalizeSelectFilterValues($this->getRawPostValue('select_filter_values'));
		}

        $overrides = $overrides ?: array();
        $fields = array_keys($overrides);
        $result = array();
        foreach ($fields as $field) {
            if (! preg_match('/^ext_[\w\-]+$/', $field)) {
                alert_back('栏目筛选设置包含无效字段！');
            }
            $value = isset($overrides[$field]) ? trim((string) $overrides[$field]) : '';
            $value = trim(str_replace(array("\r\n", "\r", "\n", "\xEF\xBC\x8C"), ',', $value));
            $result[$field] = $value;
        }
        return $result ? json_encode($result, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT) : '';
    }

    private function getSelectFilterSyncFromPost()
    {
        $syncs = isset($_POST['select_filter_sync']) && is_array($_POST['select_filter_sync']) ? $_POST['select_filter_sync'] : array();
        $result = array();
        foreach ($syncs as $field => $value) {
            if (preg_match('/^ext_[\w\-]+$/', $field) && $value) {
                $result[$field] = 1;
            }
        }
        return $result ? json_encode($result, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT) : '';
    }

    private function normalizeSelectFilterSeoRules($text)
    {
        $text = trim((string) $text);
        if ($text === '') {
            return '';
        }

        $rules = json_decode($text, true);
        if (! is_array($rules)) {
            alert_back('栏目筛选TDK配置必须为有效 JSON！');
        }

        $result = array(
            'default' => array(),
            'rules' => array()
        );
        $keys = array('title', 'keywords', 'description');
        if (! empty($rules['default']) && is_array($rules['default'])) {
            foreach ($keys as $key) {
                if (isset($rules['default'][$key]) && trim((string) $rules['default'][$key]) !== '') {
                    $result['default'][$key] = trim((string) $rules['default'][$key]);
                }
            }
        }

        if (! empty($rules['rules']) && is_array($rules['rules'])) {
            foreach ($rules['rules'] as $rule) {
                if (! is_array($rule) || empty($rule['match']) || ! is_array($rule['match'])) {
                    continue;
                }
                $one = array('match' => array());
                foreach ($rule['match'] as $field => $value) {
                    $value = trim((string) $value);
                    if (! preg_match('/^ext_[\w\-]+$/', $field) || $value === '') {
                        continue;
                    }
                    $one['match'][$field] = $value;
                }
                if (! $one['match']) {
                    continue;
                }
                foreach ($keys as $key) {
                    if (isset($rule[$key]) && trim((string) $rule[$key]) !== '') {
                        $one[$key] = trim((string) $rule[$key]);
                    }
                }
                $result['rules'][] = $one;
            }
        }

        if (! $result['default'] && ! $result['rules']) {
            return '';
        }
        return json_encode($result, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    }

    private function normalizeModelSelectFilterSeoRules($text)
    {
        $text = trim((string) $text);
        $text = html_entity_decode(stripcslashes($text), ENT_QUOTES, 'UTF-8');
        if ($text === '') {
            return '';
        }

        $rules = json_decode($text, true);
        if (! is_array($rules) || ! isset($rules['models']) || ! is_array($rules['models'])) {
            alert_back('模型级筛选TDK配置 JSON 格式错误，请使用 {"models":{}} 格式！');
        }

        $result = array('models' => array());
        foreach ($rules['models'] as $mcode => $model_rule) {
            $mcode = trim((string) $mcode);
            if ($mcode === '') {
                continue;
            }

            if (is_array($model_rule) && array_keys($model_rule) === range(0, count($model_rule) - 1)) {
                $model_rule = array('default' => array(), 'rules' => $model_rule);
            }
            if (! is_array($model_rule)) {
                continue;
            }

            $one = array('default' => array(), 'rules' => array());
            foreach (array('title', 'keywords', 'description') as $key) {
                if (isset($model_rule['default'][$key]) && trim((string) $model_rule['default'][$key]) !== '') {
                    $one['default'][$key] = trim((string) $model_rule['default'][$key]);
                }
            }

            if (! empty($model_rule['rules']) && is_array($model_rule['rules'])) {
                foreach ($model_rule['rules'] as $rule) {
                    if (! is_array($rule) || empty($rule['match']) || ! is_array($rule['match'])) {
                        continue;
                    }
                    $item = array('match' => array());
                    foreach ($rule['match'] as $field => $value) {
                        $field = trim((string) $field);
                        $value = trim((string) $value);
                        if ($field !== '' && $value !== '') {
                            $item['match'][$field] = $value;
                        }
                    }
                    if (! $item['match']) {
                        continue;
                    }
                    foreach (array('title', 'keywords', 'description') as $key) {
                        if (isset($rule[$key]) && trim((string) $rule[$key]) !== '') {
                            $item[$key] = trim((string) $rule[$key]);
                        }
                    }
                    $one['rules'][] = $item;
                }
            }

            if ($one['default'] || $one['rules']) {
                $result['models'][$mcode] = $one;
            }
        }

        return json_encode($result, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    }

    private function getTextConfig($key)
    {
        return (string) $this->config($key);
    }

    private function saveTextConfig($key, $value)
    {
        $config_model = model('admin.system.Config');
        $config_model->ensureValueText();
        if ($config_model->checkConfig("name='$key'")) {
            return $config_model->modTextValue($key, $value);
        }
        $data = array(
            'name' => $key,
            'value' => addslashes($value),
            'type' => 2,
            'sorting' => 255,
            'description' => ''
        );
        return $config_model->addConfig($data);
    }


    private function getModelType($mcode)
    {
        $models = model('admin.content.Model')->getSelectAll();
        foreach ($models as $model) {
            if ((string) $model->mcode === (string) $mcode) {
                return $model->type;
            }
        }
        return null;
    }
    private function getRawPostValue($name)
    {
        return isset($_POST[$name]) && is_string($_POST[$name]) ? trim($_POST[$name]) : '';
    }

    public function addSingle($scode, $title)
    {
        // 构建数据
        $data = array(
            'acode' => session('acode'),
            'scode' => $scode,
            'subscode' => '',
            'title' => $title,
            'titlecolor' => '#333333',
            'subtitle' => '',
            'filename' => '',
            'author' => session('realname'),
            'source' => '本站',
            'outlink' => '',
            'date' => date('Y-m-d H:i:s'),
            'ico' => '',
            'pics' => '',
            'content' => '',
            'tags' => '',
            'enclosure' => '',
            'keywords' => '',
            'description' => '',
            'sorting' => 255,
            'status' => 1,
            'istop' => 0,
            'isrecommend' => 0,
            'isheadline' => 0,
            'gid' => 0,
            'gtype' => 4,
            'gnote' => '',
            'visits' => 0,
            'likes' => 0,
            'oppose' => 0,
            'create_user' => session('username'),
            'update_user' => session('username')
        );
        
        // 执行添加
        if ($this->model->addSingle($data)) {
            return true;
        } else {
            return false;
        }
    }
}
