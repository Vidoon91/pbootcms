<?php
/**
 * @copyright (C)2016-2099 Hnaoyun Inc.
 * @author XingMeng
 * @email hnxsh@foxmail.com
 * @date 2017年12月15日
 *  列表文章模型类
 */
namespace app\admin\model\content;

use core\basic\Db;
use core\basic\Model;

class ContentModel extends Model
{

    protected $scodes = array();

    // 获取文章列表
    public function getList($mcode, $where = array())
    {
        $field = array(
            'a.id',
            'b.name as sortname',
            'a.scode',
            'c.name as subsortname',
            'a.subscode',
            'a.title',
            'a.subtitle',
            'a.date',
            'a.sorting',
            'a.status',
            'a.istop',
            'a.isrecommend',
            'a.isheadline',
            'a.visits',
            'a.ico',
            'a.pics',
            'a.filename',
            'a.outlink',
            'd.urlname',
            'b.filename as sortfilename'
        );
        $join = array(
            array(
                'ay_content_sort b',
                'a.scode=b.scode',
                'LEFT'
            ),
            array(
                'ay_content_sort c',
                'a.subscode=c.scode',
                'LEFT'
            ),
            array(
                'ay_model d',
                'b.mcode=d.mcode',
                'LEFT'
            )
        );
        return parent::table('ay_content a')->field($field)
            ->where("b.mcode='$mcode'")
            ->where('d.type=2 OR d.type is null ')
            ->where("a.acode='" . session('acode') . "'")
            ->where($where)
            ->join($join)
            ->order('a.sorting ASC,a.id DESC')
            ->page()
            ->select();
    }

    // 查找指定分类及子类文章
    public function findContent($mcode, $scode, $keyword)
    {
        $fields = array(
            'a.id',
            'b.name as sortname',
            'a.scode',
            'c.name as subsortname',
            'a.subscode',
            'a.title',
            'a.subtitle',
            'a.date',
            'a.sorting',
            'a.status',
            'a.istop',
            'a.isrecommend',
            'a.isheadline',
            'a.visits',
            'a.ico',
            'a.pics',
            'a.filename',
            'a.outlink',
            'd.urlname',
            'b.filename as sortfilename'
        );
        $join = array(
            array(
                'ay_content_sort b',
                'a.scode=b.scode',
                'LEFT'
            ),
            array(
                'ay_content_sort c',
                'a.subscode=c.scode',
                'LEFT'
            ),
            array(
                'ay_model d',
                'b.mcode=d.mcode',
                'LEFT'
            )
        );
        $this->scodes = array(); // 先清空
        $scodes = $this->getSubScodes($scode);
        return parent::table('ay_content a')->field($fields)
            ->where("b.mcode='$mcode'")
            ->where('d.type=2 OR d.type is null ')
            ->where("a.acode='" . session('acode') . "'")
            ->in('a.scode', $scodes)
            ->like('a.title', $keyword)
            ->join($join)
            ->order('a.sorting ASC,a.id DESC')
            ->page()
            ->select();
    }

    // 在全部栏目查找文章
    public function findContentAll($mcode, $keyword)
    {
        $fields = array(
            'a.id',
            'b.name as sortname',
            'a.scode',
            'c.name as subsortname',
            'a.subscode',
            'a.title',
            'a.subtitle',
            'a.date',
            'a.sorting',
            'a.status',
            'a.istop',
            'a.isrecommend',
            'a.isheadline',
            'a.visits',
            'a.ico',
            'a.pics',
            'a.filename',
            'a.outlink',
            'd.urlname',
            'b.filename as sortfilename'
        );
        $join = array(
            array(
                'ay_content_sort b',
                'a.scode=b.scode',
                'LEFT'
            ),
            array(
                'ay_content_sort c',
                'a.subscode=c.scode',
                'LEFT'
            ),
            array(
                'ay_model d',
                'b.mcode=d.mcode',
                'LEFT'
            )
        );
        return parent::table('ay_content a')->field($fields)
            ->where("b.mcode='$mcode'")
            ->where('d.type=2 OR d.type is null ')
            ->where("a.acode='" . session('acode') . "'")
            ->like('a.title', $keyword)
            ->join($join)
            ->order('a.sorting ASC,a.id DESC')
            ->page()
            ->select();
    }

    // 获取子栏目
    public function getSubScodes($scode)
    {
        if (! $scode) {
            return;
        }
        $this->scodes[] = $scode;
        $subs = parent::table('ay_content_sort')->where("pcode='$scode'")->column('scode');
        if ($subs) {
            foreach ($subs as $value) {
                $this->getSubScodes($value);
            }
        }
        return $this->scodes;
    }

    // 检查文章
    public function checkContent($where)
    {
        return parent::table('ay_content')->field('id')
            ->where($where)
            ->find();
    }

    // 获取文章详情
    public function getContent($id)
    {
        $field = array(
            'a.*',
            'b.name as sortname',
            'c.name as subsortname',
            'd.tname'
        );
        $join = array(
            array(
                'ay_content_sort b',
                'a.scode=b.scode',
                'LEFT'
            ),
            array(
                'ay_content_sort c',
                'a.subscode=c.scode',
                'LEFT'
            ),
            array(
                'ay_model d',
                'b.mcode=d.mcode',
                'LEFT'
            )
        );
        $content = parent::table('ay_content a')->field($field)
            ->where("a.id=$id")
            ->where("a.acode='" . session('acode') . "'")
            ->join($join)
            ->find();

        if ($content) {
            $extTable = $this->normalizeExtTableName($content->tname);
            $ext = parent::table($extTable)->where("contentid=$id")->decode()->find();
            if ($ext) {
                foreach ($ext as $k => $v) {
                    $content->$k = $v;
                }
            }
        }
        return $content;
    }

    public function getContentScodes($ids)
    {
        if (! $ids) {
            return array();
        }
        $ids = is_array($ids) ? $ids : explode(',', $ids);
        return parent::table('ay_content')->where("acode='" . session('acode') . "'")
            ->in('id', $ids)
            ->column('scode');
    }

    // 添加文章
    public function addContent(array $data)
    {
        return parent::table('ay_content')->autoTime()->insertGetId($data);
    }

    // 删除文章
    public function delContent($id)
    {
        return parent::table('ay_content')->where("id=$id")
            ->where("acode='" . session('acode') . "'")
            ->delete();
    }

    // 删除文章
    public function delContentList($ids)
    {
        return parent::table('ay_content')->where("acode='" . session('acode') . "'")->delete($ids);
    }

    // 修改文章
    public function modContent($id, $data)
    {
        return parent::table('ay_content')->autoTime()
            ->in('id', $id)
            ->where("acode='" . session('acode') . "'")
            ->update($data);
    }

    // 批量刷新文章发布时间
    public function batchUpdateContentDate($ids, $date)
    {
        $data = array(
            'date' => $date,
            'update_user' => session('username')
        );
        return parent::table('ay_content')->autoTime()
            ->in('id', $ids)
            ->where("acode='" . session('acode') . "'")
            ->update($data);
    }

    // 复制内容到指定栏目
    public function copyContent($ids, $scode)
    {
        // 查找出要复制的主内容
        $data = parent::table('ay_content')->in('id', $ids)->select(1);

        foreach ($data as $key => $value) {
            // 查找扩展内容
            $srcTable = $this->getExtTableByContentId($value['id']);
            $extdata = parent::table($srcTable)->where('contentid=' . $value['id'])->find(1);

            // 去除主键并修改栏目
            unset($value['id']);
            // 设置URL名称为空
            $value['filename'] = '';
            $value['scode'] = $scode;

            // 插入主内容
            $id = parent::table('ay_content')->insertGetId($value);

            // 插入扩展内容到目标模型扩展表
            if ($id && $extdata) {
                unset($extdata['extid']);
                $extdata['contentid'] = $id;
                $destTable = $this->getExtTableByScode($scode);
                $result = parent::table($destTable)->insert($extdata);
            } else {
                $result = $id;
            }
        }
        return $result;
    }

    // 查找文章扩展内容
    public function findContentExt($id)
    {
        $table = $this->getExtTableByContentId($id);
        return parent::table($table)->where("contentid=$id")->find();
    }

    // 添加文章扩展内容
    public function addContentExt(array $data)
    {
        if (! isset($data['contentid'])) {
            return false;
        }
        $table = $this->getExtTableByContentId($data['contentid']);
        return parent::table($table)->insert($data);
    }

    // 修改文章扩展内容
    public function modContentExt($id, $data)
    {
        $table = $this->getExtTableByContentId($id);
        return parent::table($table)->where("contentid=$id")->update($data);
    }

    public function ensureContentExtFieldCapacity($id, array $data)
    {
        if (get_db_type() != 'mysql') {
            return;
        }
        $table = $this->getExtTableByContentId($id);
        foreach ($data as $field => $value) {
            if ($field === 'contentid' || ! preg_match('/^ext_[\w\-]+$/', $field)) {
                continue;
            }
            if (strlen((string) $value) <= 45) {
                continue;
            }
            $this->dropExtFieldIndex($table, $field);
            $this->amd("ALTER TABLE `$table` MODIFY `$field` TEXT NULL");
        }
    }

    private function dropExtFieldIndex($table, $field)
    {
        $index = 'ay_content_' . $field . '_index';
        $indexes = parent::table($table)->checkIndexSql();
        foreach ($indexes as $item) {
            $key = is_array($item) ? (isset($item['Key_name']) ? $item['Key_name'] : (isset($item[2]) ? $item[2] : '')) : (isset($item->Key_name) ? $item->Key_name : '');
            if ($key === $index) {
                $this->amd("ALTER TABLE `$table` DROP INDEX `$index`");
                return;
            }
        }
    }

    public function getContentExtFieldValues($scode, $field)
    {
        if (! preg_match('/^ext_[\w\-]+$/', $field)) {
            return array();
        }
        $table = $this->getExtTableByScode($scode);
        if (! in_array($field, parent::tableFields($table))) {
            return array();
        }
        $rows = parent::table($table . ' e')->field('e.' . $field)
            ->join(array('ay_content c', 'e.contentid=c.id', 'LEFT'))
            ->where("c.scode='$scode'")
            ->where("c.status=1")
            ->where("c.acode='" . session('acode') . "'")
            ->select();
        $values = array();
        foreach ($rows as $row) {
            if (is_array($row) && isset($row[$field])) {
                $values[] = $row[$field];
            } elseif (is_object($row) && isset($row->$field)) {
                $values[] = $row->$field;
            }
        }
        return $values;
    }

    // 删除文章扩展内容
    public function delContentExt($id)
    {
        $table = $this->getExtTableByContentId($id);
        return parent::table($table)->where("contentid=$id")->delete();
    }

    // 删除文章扩展内容
    public function delContentExtList($ids)
    {
        if (! $ids) {
            return false;
        }
        $ids = is_array($ids) ? $ids : explode(',', $ids);
        $group = array();
        foreach ($ids as $id) {
            $table = $this->getExtTableByContentId($id);
            $group[$table][] = $id;
        }
        $result = true;
        foreach ($group as $table => $list) {
            if (! parent::table($table)->delete($list, 'contentid')) {
                $result = false;
            }
        }
        return $result;
    }

    // 检查自定义URL名称
    public function checkFilename($filename, $where = array())
    {
        return parent::table('ay_content')->field('id')
            ->where("filename='$filename'")
            ->where($where)
            ->find();
    }

    public function getImage()
    {
        $list = parent::table('ay_content')->column('ico,pics,content');
        foreach ($list as &$value){
            $content = html_entity_decode(decode_string($value['content']), ENT_QUOTES, 'UTF-8');
            preg_match_all('/(?:src|href|data-src|data-original|data-lazy-src)\s*=\s*["\']([^"\']+\.(?:gif|jpe?g|png|webp|bmp|svg)(?:\?[^"\']*)?)["\']/i', $content, $match);
            $value['content_img'] = $match[1];
            $value['pics'] = explode(',',$value['pics']);
        }
        return array_merge($list, $this->getExtImageContent());
    }

    private function getExtImageContent()
    {
        $tables = array('ay_content_ext');
        $modelTables = parent::table('ay_model')->column('tname');
        foreach ($modelTables as $table) {
            $tables[] = $this->normalizeExtTableName($table);
        }

        $data = array();
        foreach (array_unique($tables) as $table) {
            if (! preg_match('/^ay_content_[a-zA-Z0-9_]+$/', $table)) {
                continue;
            }
            $rows = parent::table($table)->select(1);
            if ($rows) {
                $data = array_merge($data, $rows);
            }
        }
        return $data;
    }

    private function normalizeExtTableName($tname)
    {
        $tname = trim((string)$tname);
        if ($tname === '') {
            return 'ay_content_ext';
        }
        if (! preg_match('/^[a-zA-Z0-9_]+$/', $tname)) {
            return 'ay_content_ext';
        }
        if (strpos($tname, 'ay_content_') !== 0) {
            $tname = 'ay_content_' . $tname;
        }
        return $tname;
    }

    private function getExtTableByScode($scode)
    {
        if (! $scode) {
            return 'ay_content_ext';
        }
        $row = parent::table('ay_content_sort a')->field('m.tname')
            ->join(array(
                array('ay_model m','a.mcode=m.mcode','LEFT')
            ))
            ->where("a.scode='$scode'")
            ->find();
        return $this->normalizeExtTableName($row ? $row->tname : '');
    }

    private function getExtTableByContentId($id)
    {
        $row = parent::table('ay_content a')->field('m.tname')
            ->join(array(
                array('ay_content_sort b','a.scode=b.scode','LEFT'),
                array('ay_model m','b.mcode=m.mcode','LEFT')
            ))
            ->where("a.id=$id")
            ->find();
        return $this->normalizeExtTableName($row ? $row->tname : '');
    }
}
