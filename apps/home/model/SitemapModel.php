<?php
/**
 * @copyright (C)2016-2099 Hnaoyun Inc.
 * @author XingMeng
 * @email hnxsh@foxmail.com
 * @date 2018年2月14日
 *  Sitemap模型
 */
namespace app\home\model;

use core\basic\Model;

class SitemapModel extends Model
{

    // 分类栏目列表
    public function getSorts()
    {
        $sort_fields = parent::tableFields('ay_content_sort');
        $fields = array(
            'a.id',
            'a.pcode',
            'a.scode',
            'a.name',
            'a.filename',
            'a.listtpl',
            'a.acode',
            'a.select_filter_values',
            'a.select_filter_seo_rules',
            'a.outlink',
            'b.mcode',
            'b.type',
            'b.urlname'
        );
        if (in_array('select_filter_manual_values', $sort_fields)) {
            $fields[] = 'a.select_filter_manual_values';
        }
        $join = array(
            'ay_model b',
            'a.mcode=b.mcode',
            'LEFT'
        );
        $result = parent::table('ay_content_sort a')->field($fields)
            ->where('a.status=1')
            ->where("a.acode='" . get_lg() . "'")
            ->join($join)
            ->order('a.pcode,a.sorting,a.id')
            ->select();
        return $result;
    }

    public function getSort($scode)
    {
        $sort_fields = parent::tableFields('ay_content_sort');
        $fields = array(
            'a.id',
            'a.pcode',
            'a.scode',
            'a.name',
            'a.filename',
            'a.listtpl',
            'a.acode',
            'a.select_filter_values',
            'a.select_filter_seo_rules',
            'a.outlink',
            'b.mcode',
            'b.type',
            'b.urlname'
        );
        if (in_array('select_filter_manual_values', $sort_fields)) {
            $fields[] = 'a.select_filter_manual_values';
        }
        $join = array(
            'ay_model b',
            'a.mcode=b.mcode',
            'LEFT'
        );
        return parent::table('ay_content_sort a')->field($fields)
            ->where('a.status=1')
            ->where("a.scode='$scode'")
            ->join($join)
            ->find();
    }

    // 指定列表内容
    public function getSortContent($scode)
    {
        $fields = array(
            'a.id',
            'a.filename',
            'a.date',
            'c.type',
            'c.urlname',
            'b.scode',
            'b.filename as sortfilename'
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
        
        $where = array(
            'a.status=1',
            'c.type=2',
            "a.date<'" . date('Y-m-d H:i:s') . "'"
        );
        
        return parent::table('ay_content a')->field($fields)
            ->where("a.scode='$scode'")
            ->where($where)
            ->join($join)
            ->order('a.date DESC') // 按发布时间倒序排列
            ->select();
    }

    public function getSelectValue($field, $mcode, $scode)
    {
        $values = $this->getSelectFilterValuesByScode($scode);
        if ($values && ! array_key_exists($field, $values)) {
            return '';
        }
        if (array_key_exists($field, $values)) {
            if (trim((string) $values[$field]) !== '') {
                return $values[$field];
            }
            return parent::table('ay_extfield')->where("name='$field'")->where("mcode='$mcode'")->value('value');
        }
        return parent::table('ay_extfield')->where("name='$field'")->where("mcode='$mcode'")->value('value');
    }

    private function getSelectFilterValuesByScode($scode)
    {
        $fields = parent::tableFields('ay_content_sort');
        if (! in_array('select_filter_values', $fields)) {
            return array();
        }
        $row = parent::table('ay_content_sort')->field('select_filter_values' . (in_array('select_filter_manual_values', $fields) ? ',select_filter_manual_values' : ''))
            ->where("scode='$scode'")
            ->find();
        $auto_values = $row && ! empty($row->select_filter_values) ? json_decode($row->select_filter_values, true) : array();
        $manual_values = $row && isset($row->select_filter_manual_values) && trim((string) $row->select_filter_manual_values) !== '' ? json_decode($row->select_filter_manual_values, true) : array();
        return $this->mergeSelectFilterData(is_array($auto_values) ? $auto_values : array(), is_array($manual_values) ? $manual_values : array());
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

}
