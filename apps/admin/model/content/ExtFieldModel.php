<?php
/**
 * @copyright (C)2016-2099 Hnaoyun Inc.
 * @author XingMeng
 * @email hnxsh@foxmail.com
 * @date 2018年3月1日
 *  扩展字段模型类
 */
namespace app\admin\model\content;

use core\basic\Model;

class ExtFieldModel extends Model
{

    // 获取扩展字段列表
    public function getList()
    {
        return parent::table('ay_extfield')->order('mcode asc,sorting asc,id asc')
            ->page()
            ->select();
    }

    // 查找扩展字段
    public function findExtField($field, $keyword)
    {
        return parent::table('ay_extfield')->like($field, $keyword)
            ->order('mcode asc,sorting asc,id asc')
            ->page()
            ->select();
    }

    // 检查扩展字段
    public function checkExtField($name, $mcode = null)
    {
        $query = parent::table('ay_extfield')->where("name='$name'");
        if ($mcode !== null && $mcode !== '') {
            $query->where("mcode='$mcode'");
        }
        return $query->find();
    }

    // 获取模型字段
    public function getModelField($mcode)
    {
        return parent::table('ay_extfield')->where("mcode='$mcode'")
            ->order('sorting asc,id asc')
            ->select();
    }

    // 获取扩展字段详情
    // Get fields that provide selectable option values for category filters.
    public function getSelectFilterFields()
    {
        return parent::table('ay_extfield')->order('mcode asc,sorting asc,id asc')
            ->select();
    }

    public function getExtField($id)
    {
        return parent::table('ay_extfield')->where("id=$id")->find();
    }

    // 获取扩展字段名称
    public function getExtFieldName($id)
    {
        return parent::table('ay_extfield')->where("id=$id")->value('name');
    }

    // 添加扩展字段
    public function addExtField(array $data)
    {
        return parent::table('ay_extfield')->insert($data);
    }

    // 删除扩展字段
    public function delExtField($id)
    {
        return parent::table('ay_extfield')->where("id=$id")->delete();
    }

    // 修改扩展字段
    public function modExtField($id, $data)
    {
        return parent::table('ay_extfield')->where("id=$id")->update($data);
    }

    // 判断字段是否存在
    public function isExistField($field, $table = 'ay_content_ext')
    {
        $fields = parent::tableFields($table);
        if (in_array($field, $fields)) {
            return true;
        } else {
            return false;
        }
    }

    // 查询扩展表索引
    public function checkExtIndex($table = 'ay_content_ext'): array
    {
        return parent::table($table)->checkIndexSql();
    }
}
