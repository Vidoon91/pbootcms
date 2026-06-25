<?php
/**
 * @copyright (C)2016-2099 Hnaoyun Inc.
 * @author XingMeng
 * @email hnxsh@foxmail.com
 * @date 2017年12月15日
 *  单页文章模型类
 */
namespace app\admin\model\content;

use core\basic\Model;

class SingleModel extends Model
{

    // 获取文章列表
    public function getList($mcode)
    {
        $field = array(
            'a.id',
            'a.scode',
            'b.name as sortname',
            'a.title',
            'a.date',
            'a.status',
            'a.visits',
            'b.mcode',
            'a.ico',
            'a.pics',
            'a.outlink',
            'b.filename',
            'c.urlname'
        );
        $join = array(
            array(
                'ay_content_sort b',
                'a.scode=b.scode',
                'LEFT'
            ),
            array(
                'ay_model c',
                'b.mcode=c.mcode',
                'LEFT'
            )
        );
        return parent::table('ay_content a')->distinct()
            ->field($field)
            ->where("b.mcode='$mcode'")
            ->where("a.acode='" . session('acode') . "'")
            ->where('c.type=1')
            ->join($join)
            ->where('a.id IN(SELECT MAX(d.id) FROM ay_content d WHERE d.scode=a.scode)')
            ->order('a.id DESC')
            ->select();
    }

    // 查找文章
    public function findSingle($mcode, $field, $keyword)
    {
        $fields = array(
            'a.id',
            'a.scode',
            'b.name as sortname',
            'a.title',
            'a.date',
            'a.status',
            'a.visits',
            'b.mcode',
            'a.ico',
            'a.pics',
            'a.outlink',
            'b.filename',
            'c.urlname'
        );
        $join = array(
            array(
                'ay_content_sort b',
                'a.scode=b.scode',
                'LEFT'
            ),
            array(
                'ay_model c',
                'b.mcode=c.mcode',
                'LEFT'
            )
        );
        return parent::table('ay_content a')->distinct()
            ->field($fields)
            ->where("b.mcode='$mcode'")
            ->where("a.acode='" . session('acode') . "'")
            ->where('c.type=1')
            ->like($field, $keyword)
            ->join($join)
            ->group('b.name')
            ->order('a.id DESC')
            ->select();
    }

    // 检查文章
    public function checkSingle($where)
    {
        return parent::table('ay_content')->field('id')
            ->where($where)
            ->find();
    }

    // 获取文章详情
    public function getSingle($id)
    {
        $field = array(
            'a.*',
            'b.name as sortname',
            'b.filename',
            'd.urlname',
            'd.tname'
        );
        $join = array(
            array(
                'ay_content_sort b',
                'a.scode=b.scode',
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

    // 添加文章
    public function addSingle(array $data)
    {
        return parent::table('ay_content')->autoTime()->insert($data);
    }

    // 删除文章
    public function delSingle($id)
    {
        return parent::table('ay_content')->where("id=$id")
            ->where("acode='" . session('acode') . "'")
            ->delete();
    }

    // 修改文章
    public function modSingle($id, $data)
    {
        return parent::table('ay_content')->autoTime()
            ->where("id=$id")
            ->where("acode='" . session('acode') . "'")
            ->update($data);
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

    // 删除文章扩展内容
    public function delContentExt($id)
    {
        $table = $this->getExtTableByContentId($id);
        return parent::table($table)->where("contentid=$id")->delete();
    }

    // 检查自定义URL名称
    public function checkFilename($where)
    {
        return parent::table('ay_content')->field('id')
            ->where($where)
            ->find();
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
