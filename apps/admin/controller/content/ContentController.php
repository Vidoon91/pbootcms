<?php
/**
 * Content controller.
 *
 * @copyright (C)2016-2099 Hnaoyun Inc.
 * @author XingMeng
 * @email hnxsh@foxmail.com
 * @date 2017-02-05
 */
namespace app\admin\controller\content;

use core\basic\Controller;
use app\admin\model\content\ContentModel;

class ContentController extends Controller
{

    private $model;

    private $blank;

    public function __construct()
    {
        $this->model = new ContentModel();
        $fields = $this->model->tableFields('ay_content_sort');
        if (! in_array('select_filter_values', $fields)) {
            $this->model->amd('ALTER TABLE ay_content_sort ADD COLUMN select_filter_values TEXT NULL');
        }
        if (! in_array('select_filter_manual_values', $fields)) {
            $this->model->amd('ALTER TABLE ay_content_sort ADD COLUMN select_filter_manual_values TEXT NULL');
        }
        if (! in_array('select_filter_sync', $fields)) {
            $this->model->amd('ALTER TABLE ay_content_sort ADD COLUMN select_filter_sync TEXT NULL');
        }
    }

    // 文章列表
    public function index()
    {
        if ((! ! $id = get('id', 'int')) && $result = $this->model->getContent($id)) {
            $this->assign('more', true);
            $this->assign('content', $result);
        } else {
            $this->assign('list', true);
            if (! $mcode = get('mcode', 'var')) {
                error('传递的模型编码参数有误，请核对后重试！');
            }
            
            if (isset($_GET['keyword'])) {
                if (! ! $scode = get('scode', 'var')) {
                    $result = $this->model->findContent($mcode, $scode, get('keyword', 'vars'));
                } else {
                    $result = $this->model->findContentAll($mcode, get('keyword', 'vars'));
                }
            } elseif (! ! $scode = get('scode', 'int')) {
                $result = $this->model->findContent($mcode, $scode, '');
            } else {
                $result = $this->model->getList($mcode);
            }
            $this->assign('contents', $result);
            
            // 文章分类下拉列表
            $sort_model = model('admin.content.ContentSort');
            $sort_select = $sort_model->getListSelect($mcode);
            $add_scode = get('scode', 'var') ?: session('addscode') ?: $this->getFirstSortScode($sort_select);
            $this->assign('search_select', $this->makeSortSelect($sort_select, get('scode')));
            $this->assign('sort_select', $this->makeSortSelect($sort_select, $add_scode));
            $this->assign('subsort_select', $this->makeSortSelect($sort_select));
            
            // 模型名称
            $this->assign('model_name', model('admin.content.Model')->getName($mcode));
            
            // 扩展字段
            $this->assign('extfield', model('admin.content.ExtField')->getModelField($mcode));
            $this->assignSelectFilterValueOverrides($sort_model, $sort_select);
            
            $this->assign('baidu_zz_token', $this->config('baidu_zz_token'));
            $this->assign('baidu_ks_token', $this->config('baidu_ks_token'));
            
            // 前端地址连接符判�?
            $url_break_char = $this->config('url_break_char') ?: '_';
            $this->assign('url_break_char', $url_break_char);
            
            // 获取会员分组
            $this->assign('groups', model('admin.member.MemberGroup')->getSelect());
        }
        
        $this->display('content/content.html');
    }

    // 文章增加
    public function add()
    {
        if ($_POST) {
            
            // 获取数据
            $scode = post('scode');
            $subscode = post('subscode');
            $title = post('title');
            $titlecolor = post('titlecolor');
            $subtitle = post('subtitle');
            $filename = trim(post('filename'), '/');
            $author = post('author');
            $source = post('source');
            $outlink = post('outlink');
            $date = post('date');
            $ico = post('ico');
            $pics = post('pics');
            
            // 获取多图标题
            $picstitle = post('picstitle');
            if ($picstitle) {
                $picstitle = implode(',', $picstitle);
            }
            
            $content = post('content');
            $tags = str_replace('，', ',', post('tags'));
            $enclosure = post('enclosure');
            $keywords = post('keywords');
            $description = post('description');
            $status = post('status', 'int');
            $istop = post('istop', 'int', '', '', 0);
            $isrecommend = post('isrecommend', 'int', '', '', 0);
            $isheadline = post('isheadline', 'int', '', '', 0);
            
            $gid = post('gid', 'int') ?: 0;
            $gtype = post('gtype', 'int') ?: 4;
            $gnote = post('gnote');
            
            if (! $scode) {
                alert_back('内容分类不能为空！');
            }
            
            if (! $title) {
                alert_back('文章标题不能为空！');
            }
            
            if ($filename && ! preg_match('/^[a-zA-Z0-9\-_\/]+$/', $filename)) {
                alert_back('内容URL名称只允许字母、数字、横线、下划线组成!');
            }
            
            // 自动提起前一百个字符为描�?
            if (! $description && isset($_POST['content'])) {
                $description = escape_string(clear_html_blank(substr_both(strip_tags($_POST['content']), 0, 150)));
            }
            
            // 无缩略图时，自动提取文章第一张图为缩略图
            if (! $ico && preg_match('/<img\s+.*?src=\s?[\'|\"](.*?(\.gif|\.jpg|\.webp|\.png|\.jpeg))[\'|\"].*?[\/]?>/i', decode_string($content), $srcs) && isset($srcs[1])) {
                $ico = $srcs[1];
            }
            
            // 缩放缩略�?
            if ($ico) {
                resize_img(ROOT_PATH . $ico, '', $this->config('ico.max_width'), $this->config('ico.max_height'));
            }
            
            // 检查自定义URL名称
            if ($filename) {
                while ($this->model->checkFilename($filename)) {
                    $filename = $filename . '-' . mt_rand(1, 20);
                }
            }
            
            // 记住新增栏目
            session('addscode', $scode);
            
            // 构建数据
            $data = array(
                'acode' => session('acode'),
                'scode' => $scode,
                'subscode' => $subscode,
                'title' => $title,
                'titlecolor' => $titlecolor,
                'subtitle' => $subtitle,
                'filename' => $filename,
                'author' => $author,
                'source' => $source,
                'outlink' => $outlink,
                'date' => $date,
                'ico' => $ico,
                'pics' => $pics,
                'picstitle' => $picstitle,
                'content' => $content,
                'tags' => $tags,
                'enclosure' => $enclosure,
                'keywords' => $keywords,
                'description' => clear_html_blank($description),
                'sorting' => 255,
                'status' => $status,
                'istop' => $istop,
                'isrecommend' => $isrecommend,
                'isheadline' => $isheadline,
                'gid' => $gid,
                'gtype' => $gtype,
                'gnote' => $gnote,
                'visits' => 0,
                'likes' => 0,
                'oppose' => 0,
                'create_user' => session('username'),
                'update_user' => session('username')
            );
            
            // 执行添加
            if (! ! $id = $this->model->addContent($data)) {
                // 扩展内容添加
                foreach ($_POST as $key => $value) {
                    if (preg_match('/^ext_[\w\-]+$/', $key)) {
                        if (! isset($data2['contentid'])) {
                            $data2['contentid'] = $id;
                        }
                        $temp = post($key);
                        if (is_array($temp)) {
                            $data2[$key] = $this->normalizeExtPostValue($temp);
                        } else {
                            $data2[$key] = $this->normalizeExtPostValue($temp);
                        }
                    }
                }
                if (isset($data2)) {
                    $this->model->ensureContentExtFieldCapacity($id, $data2);
                    if (! $this->model->addContentExt($data2)) {
                        $this->model->delContent($id);
                        $this->log('新增文章失败！');
                        error('新增失败！', - 1);
                    }
                }
                $this->syncContentSelectFiltersToParents($scode);
                
                $this->log('新增文章成功！');
                if (! ! $backurl = get('backurl')) {
                    success('新增成功！', base64_decode($backurl));
                } else {
                    success('新增成功！', url('/admin/Content/index/mcode/' . get('mcode')));
                }
            } else {
                $this->log('新增文章失败！');
                error('新增失败！', - 1);
            }
        }
    }

    // 生成分类选择
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
            $list_html .= "<option value='{$value->scode}' $select>{$this->blank}{$value->name}";
            // 子菜单处�?
            if ($value->son) {
                $this->blank .= '　　';
                $list_html .= $this->makeSortSelect($value->son, $selectid);
            }
        }
        // 循环完后回归位置
        $this->blank = substr($this->blank, 0, - 6);
        return $list_html;
    }

    private function getFirstSortScode($tree)
    {
        if (! $tree) {
            return '';
        }
        foreach ($tree as $value) {
            if (! empty($value->scode)) {
                return $value->scode;
            }
            if (! empty($value->son)) {
                $scode = $this->getFirstSortScode($value->son);
                if ($scode) {
                    return $scode;
                }
            }
        }
        return '';
    }

    // 文章删除
    public function del()
    {
        // 执行批量删除
        if ($_POST) {
            if (! ! $list = post('list')) {
                $sync_scodes = $this->model->getContentScodes($list);
                if ($this->model->delContentList($list)) {
                    $this->model->delContentExtList($list);
                    $this->syncContentSelectFiltersForScodes($sync_scodes);
                    $this->log('批量删除文章成功！');
                    success('批量删除成功！', - 1);
                } else {
                    $this->log('批量删除文章失败！');
                    error('批量删除失败！', - 1);
                }
            } else {
                alert_back('请选择要删除的内容！');
            }
        }
        
        if (! $id = get('id', 'int')) {
            error('传递的参数值错误！', - 1);
        }
        
        $sync_scodes = $this->model->getContentScodes($id);
        if ($this->model->delContent($id)) {
            $this->model->delContentExt($id);
            $this->syncContentSelectFiltersForScodes($sync_scodes);
            $this->log('删除文章' . $id . '成功！');
            success('删除成功！', - 1);
        } else {
            $this->log('删除文章' . $id . '失败！');
            error('删除失败！', - 1);
        }
    }

    // 批量刷新文章发布时间
    public function batchUpdateTime()
    {
        if ($_POST) {
            if (! ! $list = post('list')) {
                $date = date('Y-m-d H:i:s');
                if ($this->model->batchUpdateContentDate($list, $date)) {
                    $this->log('批量刷新文章发布时间成功！');
                    success('批量更新时间成功！', - 1);
                } else {
                    $this->log('批量刷新文章发布时间失败！');
                    error('批量更新时间失败！', - 1);
                }
            } else {
                alert_back('请选择要更新时间的内容！');
            }
        } else {
            alert_back('请选择要更新时间的内容！');
        }
    }

    // 文章修改
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
                            $this->model->modContent($value, "sorting=" . $sorting[$key]);
                        }
                        $this->log('修改内容排序成功！');
                        success('修改成功！', - 1);
                    } else {
                        alert_back('排序失败，无任何内容！');
                    }
                    break;
                case 'copy':
                    $list = post('list');
                    $scode = post('scode');
                    if (! $list) {
                        alert_back('请选择要复制的内容！');
                    }
                    if (! $scode) {
                        alert_back('请选择目标栏目！');
                    }
                    if ($this->model->copyContent($list, $scode)) {
                        $this->syncContentSelectFiltersForScodes($scode);
                        $this->log('复制内容成功！');
                        success('复制内容成功！', - 1);
                    } else {
                        alert_back('复制内容失败！');
                    }
                    break;
                case 'move':
                    $list = post('list');
                    $scode = post('scode');
                    if (! $list) {
                        alert_back('请选择要移动的内容！');
                    }
                    if (! $scode) {
                        alert_back('请选择目标栏目！');
                    }
                    
                    $sync_scodes = $this->model->getContentScodes($list);
                    if ($this->model->modContent($list, "scode='" . $scode . "'")) {
                        $sync_scodes[] = $scode;
                        $this->syncContentSelectFiltersForScodes($sync_scodes);
                        $this->log('移动内容成功！');
                        success('移动内容成功！', - 1);
                    } else {
                        alert_back('移动内容失败！');
                    }
                    break;
                case 'baiduzz':
                    $list = post('list');
                    $urls = post('urls');
                    if (! $list) {
                        alert_back('请选择要推送的内容！');
                    }
                    // 依次推�?
                    $domain = get_http_url();
                    if (! $token = $this->config('baidu_zz_token')) {
                        alert_back('请先到系统配置中填写百度普通收录推送token值！');
                    }
                    $api = "http://data.zz.baidu.com/urls?site=$domain&token=$token";
                    foreach ($list as $key => $value) {
                        $url = $domain . $urls[$value];
                        $this->log('百度普通收录推送：' . $url);
                        $post_urls[] = $url;
                    }
                    $result = post_baidu($api, $post_urls);
                    if (isset($result->error)) {
                        alert_back('百度普通收录推送发生错误：' . $result->message);
                    } elseif (isset($result->success)) {
                        alert_back('成功推送' . $result->success . '条，当天剩余可推送' . $result->remain . '条！');
                    } else {
                        alert_back('发生未知错误！');
                    }
                case 'baiduks':
                    $list = post('list');
                    $urls = post('urls');
                    if (! $list) {
                        alert_back('请选择要推送的内容！');
                    }
                    // 依次推�?
                    $domain = get_http_url();
                    if (! $token = $this->config('baidu_ks_token')) {
                        alert_back('请先到系统配置中填写百度快速收录推送token值！');
                    }
                    $api = "http://data.zz.baidu.com/urls?site=$domain&token=$token&type=daily";
                    foreach ($list as $key => $value) {
                        $url = $domain . $urls[$value];
                        $this->log('百度快速收录推送：' . $url);
                        $post_urls[] = $url;
                    }
                    $result = post_baidu($api, $post_urls);
                    if (isset($result->error)) {
                        alert_back('百度快速收录推送发生错误：' . $result->message);
                    } elseif (isset($result->success_daily)) {
                        alert_back('成功推送' . $result->success_daily . '条，当天剩余可推送' . $result->remain_daily . '条！');
                    } else {
                        alert_back('发生未知错误！');
                    }
            }
        }
        
        if (! $id = get('id', 'int')) {
            error('传递的参数值错误！', - 1);
        }
        
        // 单独修改状�?
        if (($field = get('field', 'var')) && ! is_null($value = get('value', 'var'))) {
            if ($this->model->modContent($id, "$field='$value',update_user='" . session('username') . "'")) {
                location(- 1);
            } else {
                alert_back('修改失败！');
            }
        }
        
        // 修改操作
        if ($_POST) {
            $old_content = $this->model->getContent($id);
            $old_scode = $old_content ? $old_content->scode : '';
            
            // 获取数据
            $scode = post('scode');
            $subscode = post('subscode');
            $title = post('title');
            $titlecolor = post('titlecolor');
            $subtitle = post('subtitle');
            $filename = trim(post('filename'), '/');
            $author = post('author');
            $source = post('source');
            $outlink = post('outlink');
            $date = post('date');
            $ico = post('ico');
            $pics = post('pics');
            
            // 获取多图标题
            $picstitle = post('picstitle');
            if ($picstitle) {
                $picstitle = implode(',', $picstitle);
            }
            
            $content = post('content');
            $tags = str_replace('，', ',', post('tags'));
            $enclosure = post('enclosure');
            $keywords = post('keywords');
            $description = post('description');
            $status = post('status', 'int');
            $istop = post('istop', 'int', '', '', 0);
            $isrecommend = post('isrecommend', 'int', '', '', 0);
            $isheadline = post('isheadline', 'int', '', '', 0);
            
            $gid = post('gid', 'int') ?: 0;
            $gtype = post('gtype', 'int') ?: 4;
            $gnote = post('gnote');
            
            if (! $scode) {
                alert_back('内容分类不能为空！');
            }
            
            if (! $title) {
                alert_back('文章标题不能为空！');
            }
            
            if ($filename && ! preg_match('/^[a-zA-Z0-9\-_\/]+$/', $filename)) {
                alert_back('内容URL名称只允许字母、数字、横线、下划线组成!');
            }
            
            // 自动提起前一百个字符为描�?
            if (! $description && isset($_POST['content'])) {
                $description = escape_string(clear_html_blank(substr_both(strip_tags($_POST['content']), 0, 150)));
            }
            
            // 无缩略图时，自动提取文章第一张图为缩略图
            if (! $ico && preg_match('/<img\s+.*?src=\s?[\'|\"](.*?(\.gif|\.jpg|\.webp|\.png|\.jpeg))[\'|\"].*?[\/]?>/i', decode_string($content), $srcs) && isset($srcs[1])) {
                $ico = $srcs[1];
            }
            
            // 缩放缩略�?
            if ($ico) {
                resize_img(ROOT_PATH . $ico, '', $this->config('ico.max_width'), $this->config('ico.max_height'));
            }
            
            if ($filename) {
                while ($this->model->checkFilename($filename, "id<>$id")) {
                    $filename = $filename . '-' . mt_rand(1, 20);
                }
            }
            
            // 构建数据
            $data = array(
                'scode' => $scode,
                'subscode' => $subscode,
                'title' => $title,
                'titlecolor' => $titlecolor,
                'subtitle' => $subtitle,
                'filename' => $filename,
                'author' => $author,
                'source' => $source,
                'outlink' => $outlink,
                'date' => $date,
                'ico' => $ico,
                'pics' => $pics,
                'picstitle' => $picstitle,
                'content' => $content,
                'tags' => $tags,
                'enclosure' => $enclosure,
                'keywords' => $keywords,
                'description' => clear_html_blank($description),
                'status' => $status,
                'istop' => $istop,
                'isrecommend' => $isrecommend,
                'isheadline' => $isheadline,
                'gid' => $gid,
                'gtype' => $gtype,
                'gnote' => $gnote,
                'update_user' => session('username')
            );
            
            // 执行添加
            if ($this->model->modContent($id, $data)) {
                // 扩展内容修改
                foreach ($_POST as $key => $value) {
                    if (preg_match('/^ext_[\w\-]+$/', $key)) {
                        $temp = post($key);
                        if (is_array($temp)) {
                            $data2[$key] = $this->normalizeExtPostValue($temp);
                        } else {
                            $data2[$key] = $this->normalizeExtPostValue($temp);
                        }
                    }
                }
                if (isset($data2)) {
                    $this->model->ensureContentExtFieldCapacity($id, $data2);
                    if ($this->model->findContentExt($id)) {
                        $this->model->modContentExt($id, $data2);
                    } else {
                        $data2['contentid'] = $id;
                        $this->model->addContentExt($data2);
                    }
                }
                $this->syncContentSelectFiltersToParents($scode);
                if ($old_scode && $old_scode != $scode) {
                    $this->syncContentSelectFiltersToParents($old_scode);
                }
                
                $this->log('修改文章' . $id . '成功！');
                if (! ! $backurl = get('backurl')) {
                    success('修改成功！', base64_decode($backurl));
                } else {
                    success('修改成功！', url('/admin/Content/index/mcode/2'));
                }
            } else {
                location(- 1);
            }
        } else {
            // 调取修改内容
            $this->assign('mod', true);
            if (! $result = $this->model->getContent($id)) {
                error('编辑的内容已经不存在！', - 1);
            }
            $this->assign('content', $result);
            
            if (! $mcode = get('mcode', 'var')) {
                error('传递的模型编码参数有误，请核对后重试！');
            }
            
            // 文章分类
            $sort_model = model('admin.content.ContentSort');
            $sort_select = $sort_model->getListSelect($mcode);
            $this->assign('sort_select', $this->makeSortSelect($sort_select, $result->scode));
            $this->assign('subsort_select', $this->makeSortSelect($sort_select, $result->subscode));
            
            // 模型名称
            $this->assign('model_name', model('admin.content.Model')->getName($mcode));
            
            // 扩展字段
            $this->assign('extfield', model('admin.content.ExtField')->getModelField($mcode));
            $this->assignSelectFilterValueOverrides($sort_model, $sort_select);
            
            // 获取会员分组
            $this->assign('groups', model('admin.member.MemberGroup')->getSelect());
            
            $this->display('content/content.html');
        }
    }

    private function normalizeExtPostValue($value)
    {
        if (is_array($value)) {
            $items = array();
            foreach ($value as $item) {
                $item = trim(str_replace('，', ',', (string) $item));
                if ($item !== '') {
                    $items[] = $item;
                }
            }
            return implode(',', $items);
        }
        return str_replace("\r\n", '<br>', trim(str_replace('，', ',', (string) $value)));
    }

    private function syncContentSelectFiltersForScodes($scodes)
    {
        if (! $scodes) {
            return;
        }
        $scodes = is_array($scodes) ? $scodes : array($scodes);
        $done = array();
        foreach ($scodes as $scode) {
            $scode = (string) $scode;
            if ($scode === '' || isset($done[$scode])) {
                continue;
            }
            $done[$scode] = true;
            $this->syncContentSelectFiltersToParents($scode);
        }
    }

    private function syncContentSelectFiltersToParents($scode)
    {
        $sort_model = model('admin.content.ContentSort');
        $sort = $sort_model->getSort($scode);
        if (! $sort || ! $sort->pcode) {
            return;
        }

        $fields = $this->getSortSyncFields($sort);
        if (! $fields) {
            return;
        }

        foreach ($fields as $field) {
            $this->rebuildParentSelectFilterField($sort_model, $scode, $field);
        }
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

    private function rebuildParentSelectFilterField($sort_model, $scode, $field)
    {
        $current = $sort_model->getSort($scode);
        while ($current && $current->pcode) {
            $parent = $sort_model->getSort($current->pcode);
            if (! $parent) {
                break;
            }

            $values = $this->collectSyncedContentFilterValues($sort_model, $parent->scode, $field);
            $parent_values = json_decode((string) $parent->select_filter_values, true);
            if (! is_array($parent_values)) {
                $parent_values = array();
            }

            if ($values) {
                $parent_values[$field] = implode(',', $values);
            } else {
                unset($parent_values[$field]);
            }

            $sort_model->modSort($parent->scode, array(
                'select_filter_values' => $parent_values ? json_encode($parent_values, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT) : ''
            ));
            $current = $parent;
        }
    }

    private function collectSyncedContentFilterValues($sort_model, $ancestor_scode, $field)
    {
        $rows = $sort_model->getSubSortRows($ancestor_scode);
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
                $source = (string) $sort_model->getExtFieldValue($row->mcode, $field);
            }

            foreach ($this->splitSelectFilterItems($source) as $item) {
                if (! in_array($item, $values, true)) {
                    $values[] = $item;
                }
            }
        }
        return $values;
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

    private function assignSelectFilterValueOverrides($sort_model, $sort_tree)
    {
        $data = array();
        $fields = $sort_model->tableFields('ay_content_sort');
        if (in_array('select_filter_values', $fields)) {
            $this->appendSelectFilterValueOverrides($sort_model, $sort_tree, $data);
        }
        $json = json_encode($data, JSON_UNESCAPED_UNICODE);
        $this->assign('content_select_filter_values_json', htmlspecialchars($json, ENT_QUOTES, 'UTF-8'));
    }

    private function appendSelectFilterValueOverrides($sort_model, $sort_tree, &$data)
    {
        if (! $sort_tree) {
            return;
        }
        foreach ($sort_tree as $sort) {
            $current_values = array();
            $row = $sort_model->getSort($sort->scode);
            if ($row) {
                $auto_values = json_decode((string) $row->select_filter_values, true);
                $manual_values = json_decode(isset($row->select_filter_manual_values) ? (string) $row->select_filter_manual_values : '', true);
                $current_values = $this->mergeSelectFilterData(is_array($auto_values) ? $auto_values : array(), is_array($manual_values) ? $manual_values : array());
            }
            if ($current_values) {
                $data[(string) $sort->scode] = $current_values;
            }
            if (! empty($sort->son)) {
                $this->appendSelectFilterValueOverrides($sort_model, $sort->son, $data);
            }
        }
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
}
