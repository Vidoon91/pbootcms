<?php
/**
 * @copyright (C)2016-2099 Hnaoyun Inc.
 * @author XingMeng
 * @email hnxsh@foxmail.com
 * @date 2018年3月4日
 *  标签解析引擎模型
 */
namespace app\home\model;

use core\basic\Model;

class ParserModel extends Model
{

    // 存储分类及子编码
    protected $scodes = array();

    protected $tableFieldsCache = array();

    protected $selectFilterValuesCache = array();

    protected $selectFilterSourceCache = array();

    protected $selectValueCache = array();

    protected $selectMcodeCache = array();

    protected $selectRealtimeValueCache = array();

    protected $selectSortRowsCache;

    // 存储分类查询数据
    protected $sorts;

    // 存储栏目位置
    protected $position = array();

    // 上一篇
    protected $pre;

    // 下一篇
    protected $next;

    // 获取模型数据
    public function checkModelUrlname($urlname)
    {
        if ($urlname == 'list' || $urlname == 'about') {
            return true;
        }
        return parent::table('ay_model')->where("urlname='$urlname'")->find();
    }

    // 站点配置信息
    public function getSite()
    {
        return parent::table('ay_site')->where("acode='" . get_lg() . "'")->find();
    }

    // 公司信息
    public function getCompany()
    {
        return parent::table('ay_company')->where("acode='" . get_lg() . "'")->find();
    }

    // 自定义标签，不区分语言，兼容跨语言
    public function getLabel()
    {
        return parent::table('ay_label')->decode()->column('value,type', 'name');
    }

    // 单个分类信息，不区分语言，兼容跨语言
    public function getSort($scode)
    {
        $scode = escape_string($scode);
        $field = array(
            'a.*',
            'c.name AS parentname',
            'b.type',
            'b.urlname',
            'd.gcode'
        );
        $join = array(
            array(
                'ay_model b',
                'a.mcode=b.mcode',
                'LEFT'
            ),
            array(
                'ay_content_sort c',
                'a.pcode=c.scode',
                'LEFT'
            ),
            array(
                'ay_member_group d',
                'a.gid=d.id',
                'LEFT'
            )
        );
        return parent::table('ay_content_sort a')->field($field)
            ->where("a.scode='$scode' OR a.filename='$scode'")
            ->join($join)
            ->find();
    }

    // 多个分类信息，不区分语言，兼容跨语言
    public function getMultSort($scodes)
    {
        $field = array(
            'a.*',
            'c.name AS parentname',
            'b.type',
            'b.urlname'
        );
        $join = array(
            array(
                'ay_model b',
                'a.mcode=b.mcode',
                'LEFT'
            ),
            array(
                'ay_content_sort c',
                'a.pcode=c.scode',
                'LEFT'
            )
        );
        return parent::table('ay_content_sort a')->field($field)
            ->in('a.scode', $scodes)
            ->join($join)
            ->order('a.sorting,a.id')
            ->select();
    }

    // 指定分类数量
    public function getSortRows($scode)
    {
        $this->scodes = array(); // 先清空
        // 获取多分类子类
        $arr = explode(',', $scode);
        foreach ($arr as $value) {
            $scodes = $this->getSubScodes(trim($value));
        }

        // 拼接条件
        $where1 = array(
            "scode in (" . implode_quot(',', $scodes) . ")",
            "subscode='$scode'"
        );
        $where2 = array(
            "acode='" . get_lg() . "'",
            'status=1',
            "date<'" . date('Y-m-d H:i:s') . "'"
        );

        $result = parent::table('ay_content')->where($where1, 'OR')
            ->where($where2)
            ->column('id');
        return count($result);
    }

    // 分类栏目列表关系树
    public function getSortsTree()
    {
        $fields = array(
            'a.*',
            'b.type',
            'b.urlname'
        );
        $join = array(
            'ay_model b',
            'a.mcode=b.mcode',
            'LEFT'
        );
        $result = parent::table('ay_content_sort a')->where("a.acode='" . get_lg() . "'")
            ->where('a.status=1')
            ->join($join)
            ->order('a.pcode,a.sorting,a.id')
            ->column($fields, 'scode');

        foreach ($result as $key => $value) {
            if ($value['pcode']) {
                $result[$value['pcode']]['son'][] = $value; // 记录到关系树
            } else {
                $data['top'][] = $value; // 记录顶级菜单
            }
        }
        $data['tree'] = $result;
        return $data;
    }

    // 获取分类名称
    public function getSortName($scode)
    {
        $result = $this->getSortList();
        return $result[$scode]['name'];
    }

    // 获取分类PIC
    public function getSortPic($scode)
    {
        $result = $this->getSortList();
        return $result[$scode]['pic'];
    }

    // 分类顶级编码
    public function getSortTopScode($scode)
    {
        $result = $this->getSortList();
        return $this->getTopParent($scode, $result);
    }

    // 获取位置
    public function getPosition($scode)
    {
        $result = $this->getSortList();
        $this->position = array(); // 重置
        $this->getTopParent($scode, $result);
        return array_reverse($this->position);
    }

    // 分类顶级编码
    private function getTopParent($scode, $sorts)
    {
        if (! $scode || ! $sorts) {
            return;
        }
        $this->position[] = $sorts[$scode];
        if ($sorts[$scode]['pcode']) {
            return $this->getTopParent($sorts[$scode]['pcode'], $sorts);
        } else {
            return $sorts[$scode]['scode'];
        }
    }

    // 分类子类树
    public function getSubScodes($scode)
    {
        if (! $scode) {
            return;
        }
        $this->scodes[] = $scode;
        $subs = parent::table('ay_content_sort')->where("pcode='$scode'")
            ->where("outlink=''")
            ->column('scode');
        if ($subs) {
            foreach ($subs as $value) {
                $this->getSubScodes($value);
            }
        }
        return $this->scodes;
    }

    // 清除静态缓存时，获取全部栏目编码
    public function getScodes($type)
    {
        $join = array(
            'ay_model b',
            'a.mcode=b.mcode',
            'LEFT'
        );
        // 不包含外链
        return parent::table('ay_content_sort a')->join($join)
            ->in('b.type', $type)
            ->where("outlink=''")
            ->column('scode');
    }

    // 生成静态时，获取栏目全部内容ID
    public function getContentIds($scodes, $where = array())
    {
        return parent::table('ay_content')->in('scode', $scodes)
            ->where("outlink=''")
            ->where($where)
            ->column('id');
    }

    // 获取栏目清单
    private function getSortList()
    {
        if (! isset($this->sorts)) {
            $fields = array(
                'a.id',
                'a.pcode',
                'a.scode',
                'a.name',
                'a.filename',
                'a.outlink',
                'b.type',
                'b.urlname'
            );
            $join = array(
                'ay_model b',
                'a.mcode=b.mcode',
                'LEFT'
            );
            $this->sorts = parent::table('ay_content_sort a')->where("a.acode='" . get_lg() . "'")
                ->join($join)
                ->column($fields, 'scode');
        }
        return $this->sorts;
    }

    // 获取筛选字段数据
    public function getSelect($field, $mcode = '', $scode = '')
    {
        $sort_fields = $this->getCachedTableFields('ay_content_sort');
        if ($scode && in_array('select_filter_values', $sort_fields)) {
            $scode = escape_string($scode);
            if (in_array('select_filter_sync', $sort_fields)) {
                $realtime = $this->getRealtimeSelectFilterValue($scode, $field);
                if ($realtime !== null) {
                    return $realtime;
                }
            }
            $values = $this->getSelectFilterValuesByScode($scode);
            if ($values && ! array_key_exists($field, $values)) {
                return '';
            }
            if (array_key_exists($field, $values)) {
                if (trim((string) $values[$field]) !== '') {
                    return $values[$field];
                }
                return $this->getModelSelectValue($field, $mcode, $scode);
            }
        }

        return $this->getModelSelectValue($field, $mcode, $scode);
    }

    private function getModelSelectValue($field, $mcode = '', $scode = '')
    {
        if (! $mcode && $scode) {
            $mcode = $this->getMcodeByScode($scode);
        }
        $cache_key = (string) $mcode . '|' . (string) $field;
        if (! array_key_exists($cache_key, $this->selectValueCache)) {
            $query = parent::table('ay_extfield')->where("name='$field'");
            if ($mcode) {
                $query->where("mcode='$mcode'");
            }
            $this->selectValueCache[$cache_key] = $query->value('value');
        }
        return $this->selectValueCache[$cache_key];
    }

    // 列表内容,带分页，不区分语言，兼容跨语言
    public function getLists($scode, $num, $order, $filter = array(), $tags = array(), $select = array(), $fuzzy = true, $start = 1, $lfield = null, $lg = null)
    {
        $scode = escape_string($scode);
        $ext_fields = array();
        list($select, $ext_select, $need_ext_join) = $this->splitExtSelectConditions($select, $scode);
        if (! $need_ext_join && strpos($order, 'e.') !== false) {
            $need_ext_join = true;
        }

        if ($lfield) {
            $lfield .= ',id,outlink,type,scode,sortfilename,filename,urlname,tname';
            $fields = explode(',', $lfield);
            $fields = array_unique($fields);

            foreach ($fields as $key => $value) {
                if (strpos($value, 'ext_') === 0) {
                    $ext_fields[] = $value;
                    unset($fields[$key]);
                    continue;
                }
                if ($value == 'sortname') {
                    $fields[$key] = 'b.name as sortname';
                } elseif ($value == 'sortfilename') {
                    $fields[$key] = 'b.filename as sortfilename';
                } elseif ($value == 'subsortname') {
                    $fields[$key] = 'c.name as subsortname';
                } elseif ($value == 'subfilename') {
                    $fields[$key] = 'c.filename as subfilename';
                } elseif ($value == 'type' || $value == 'urlname' || $value == 'tname') {
                    $fields[$key] = 'd.' . $value;
                } elseif ($value == 'modelname') {
                    $fields[$key] = 'd.name as modelname';
                } else {
                    $fields[$key] = 'a.' . $value;
                }
            }
        } else {
            $fields = array(
                'a.*',
                'b.name as sortname',
                'b.filename as sortfilename',
                'c.name as subsortname',
                'c.filename as subfilename',
                'd.type',
                'd.name as modelname',
                'd.urlname',
                'd.tname',
                'f.gcode'
            );
        }

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
            ),
            array(
                'ay_member_group f',
                'a.gid=f.id',
                'LEFT'
            )
        );
        if ($need_ext_join) {
            // 获取模型对应的扩展表名
            $ext_table_name = 'ay_content_ext';
            if ($scode) {
                $model = parent::table('ay_model')->join(array(
                    'ay_content_sort',
                    'ay_model.mcode=ay_content_sort.mcode',
                    'LEFT'
                ))->where("ay_content_sort.scode='{$scode}'")->find();
                if ($model && $model->tname) {
                    $ext_table_name = $model->tname;
                }
            }
            $join[] = array(
                $ext_table_name . ' e',
                'e.contentid=a.id',
                'LEFT'
            );
        }

        $scode_arr = array();
        if ($scode) {
            $this->scodes = array(); // 先清空
            $arr = explode(',', $scode);
            foreach ($arr as $value) {
                $scodes = $this->getSubScodes(trim($value));
            }
            $scode_arr = array(
                "a.scode in (" . implode_quot(',', $scodes) . ")",
                "a.subscode='$scode'"
            );
        }

        $where = array(
            'a.status=1',
            'd.type=2',
            "a.date<'" . date('Y-m-d H:i:s') . "'"
        );

        if ($lg) {
            $where['a.acode'] = $lg;
        }

        $result = parent::table('ay_content a')->field($fields)
            ->where($scode_arr, 'OR')
            ->where($where)
            ->where($select, 'AND', 'AND', $fuzzy)
            ->where($ext_select, 'AND', 'AND', $fuzzy)
            ->where($filter, 'OR')
            ->where($tags, 'OR')
            ->join($join)
            ->order($order)
            ->page(1, $num, $start)
            ->decode()
            ->select();

        return $this->attachExtDataList($result, $ext_fields);
    }

    // 列表内容，不带分页，不区分语言，兼容跨语言
    public function getList($scode, $num, $order, $filter = array(), $tags = array(), $select = array(), $fuzzy = true, $start = 1, $lfield = null, $lg = null)
    {
        $scode = escape_string($scode);
        $ext_fields = array();
        list($select, $ext_select, $need_ext_join) = $this->splitExtSelectConditions($select, $scode);
        if (! $need_ext_join && strpos($order, 'e.') !== false) {
            $need_ext_join = true;
        }

        if ($lfield) {
            $lfield .= ',id,outlink,type,scode,sortfilename,filename,urlname,tname';
            $fields = explode(',', $lfield);
            $fields = array_unique($fields);

            foreach ($fields as $key => $value) {
                if (strpos($value, 'ext_') === 0) {
                    $ext_fields[] = $value;
                    unset($fields[$key]);
                    continue;
                }
                if ($value == 'sortname') {
                    $fields[$key] = 'b.name as sortname';
                } elseif ($value == 'sortfilename') {
                    $fields[$key] = 'b.filename as sortfilename';
                } elseif ($value == 'subsortname') {
                    $fields[$key] = 'c.name as subsortname';
                } elseif ($value == 'subfilename') {
                    $fields[$key] = 'c.filename as subfilename';
                } elseif ($value == 'type' || $value == 'urlname' || $value == 'tname') {
                    $fields[$key] = 'd.' . $value;
                } elseif ($value == 'modelname') {
                    $fields[$key] = 'd.name as modelname';
                } else {
                    $fields[$key] = 'a.' . $value;
                }
            }
        } else {
            $fields = array(
                'a.*',
                'b.name as sortname',
                'b.filename as sortfilename',
                'c.name as subsortname',
                'c.filename as subfilename',
                'd.type',
                'd.name as modelname',
                'd.urlname',
                'd.tname',
                'f.gcode'
            );
        }

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
            ),
            array(
                'ay_member_group f',
                'a.gid=f.id',
                'LEFT'
            )
        );
        if ($need_ext_join) {
            // 获取模型对应的扩展表名
            $ext_table_name = 'ay_content_ext';
            if ($scode) {
                $model = parent::table('ay_model')->join(array(
                    'ay_content_sort',
                    'ay_model.mcode=ay_content_sort.mcode',
                    'LEFT'
                ))->where("ay_content_sort.scode='{$scode}'")->find();
                if ($model && $model->tname) {
                    $ext_table_name = $model->tname;
                }
            }
            $join[] = array(
                $ext_table_name . ' e',
                'e.contentid=a.id',
                'LEFT'
            );
        }

        $scode_arr = array();
        if ($scode) {
            $this->scodes = array(); // 先清空
            $arr = explode(',', $scode);
            foreach ($arr as $value) {
                $scodes = $this->getSubScodes(trim($value));
            }
            $scode_arr = array(
                "a.scode in (" . implode_quot(',', $scodes) . ")",
                "a.subscode='$scode'"
            );
        }

        $where = array(
            'a.status=1',
            'd.type=2',
            "a.date<'" . date('Y-m-d H:i:s') . "'"
        );

        if ($lg) {
            $where['a.acode'] = $lg;
        }

        $result = parent::table('ay_content a')->field($fields)
            ->where($scode_arr, 'OR')
            ->where($where)
            ->where($select, 'AND', 'AND', $fuzzy)
            ->where($ext_select, 'AND', 'AND', $fuzzy)
            ->where($filter, 'OR')
            ->where($tags, 'OR')
            ->join($join)
            ->order($order)
            ->limit($start - 1, $num)
            ->decode()
            ->select();

        return $this->attachExtDataList($result, $ext_fields);
    }

    // 内容详情，不区分语言，兼容跨语言
    public function getContent($id)
    {
        $id = escape_string($id);
        $field = array(
            'a.*',
            'b.name as sortname',
            'b.filename as sortfilename',
            'b.outlink as sortoutlink',
            'c.name as subsortname',
            'c.filename as subfilename',
            'd.type',
            'd.name as modelname',
            'd.urlname',
            'd.tname',
            'f.gcode'
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
            ),
            array(
                'ay_member_group f',
                'a.gid=f.id',
                'LEFT'
            )
        );
        $result = parent::table('ay_content a')->field($field)
            ->where("a.id='$id' OR a.filename='$id'")
            ->where('a.status=1')
            ->where("a.date<'" . date('Y-m-d H:i:s') . "'")
            ->join($join)
            ->decode()
            ->find();

        return $this->attachExtDataRow($result);
    }

    // 单篇详情,不区分语言，兼容跨语言
    public function getAbout($scode)
    {
        $scode = escape_string($scode);
        $field = array(
            'a.*',
            'b.name as sortname',
            'b.filename as sortfilename',
            'c.name as subsortname',
            'c.filename as subfilename',
            'd.type',
            'd.name as modelname',
            'd.urlname',
            'd.tname',
            'f.gcode'
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
            ),
            array(
                'ay_member_group f',
                'a.gid=f.id',
                'LEFT'
            )
        );
        $result = parent::table('ay_content a')->field($field)
            ->where("a.scode='$scode' OR b.filename='$scode'")
            ->where('a.status=1')
            ->join($join)
            ->decode()
            ->order('id DESC')
            ->find();

        return $this->attachExtDataRow($result);
    }

    // 指定内容多图
    public function getContentPics($id, $field)
    {
        $id = escape_string($id);
        $fields = array_map('trim', explode(',', $field));
        $ext_fields = array();
        $base_fields = array();

        foreach ($fields as $f) {
            if (strpos($f, 'ext_') === 0) {
                $ext_fields[] = $f;
            } else {
                $base_fields[] = $f;
            }
        }
        $base_fields[] = 'picstitle';
        $base_fields = array_unique($base_fields);

        $result = parent::table('ay_content a')->field(implode(',', $base_fields))
            ->where("a.id='$id'")
            ->where('a.status=1')
            ->where("a.date<'" . date('Y-m-d H:i:s') . "'")
            ->find();

        if ($result && $ext_fields) {
            $ext = $this->getExtDataByContentId($id, $ext_fields);
            if ($ext) {
                foreach ($ext as $k => $v) {
                    $result->$k = $v;
                }
            }
        }
        return $result;
    }

    // 指定内容多选调用
    public function getContentCheckbox($id, $field)
    {
        $table = $this->getExtTableByContentId($id);
        return parent::table($table)->where("contentid='$id'")->value($field);
    }

    // 指定内容标签调用
    public function getContentTags($id)
    {
        $result = parent::table('ay_content')->field('scode,tags')
            ->where("id='$id'")
            ->where('status=1')
            ->where("date<'" . date('Y-m-d H:i:s') . "'")
            ->find();
        return $result;
    }

    // 指定分类标签调用
    public function getSortTags($scode)
    {
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

        $scode_arr = array();
        if ($scode) {
            $this->scodes = array(); // 先清空
            $scodes = $this->getSubScodes(trim($scode));

            $scode_arr = array(
                "a.scode in (" . implode_quot(',', $scodes) . ")",
                "a.subscode='$scode'"
            );
        }

        $result = parent::table('ay_content a')->where("c.type=2 AND a.tags<>''")
            ->where($scode_arr, 'OR')
            ->join($join)
            ->where('a.status=1')
            ->order('a.visits DESC')
            ->column('a.tags');
        return $result;
    }

    // 上一篇内容
    public function getContentPre($scode, $id)
    {
        if (! $this->pre) {
            $this->scodes = array();
            $scodes = $this->getSubScodes($scode);

            $field = array(
                'a.id',
                'a.title',
                'a.filename',
                'a.ico',
                'a.scode',
                'b.filename as sortfilename',
                'c.type',
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

            $this->pre = parent::table('ay_content a')->field($field)
                ->where("a.id<$id")
                ->join($join)
                ->in('a.scode', $scodes)
                ->where("a.acode='" . get_lg() . "'")
                ->where('a.status=1')
                ->where("a.date<'" . date('Y-m-d H:i:s') . "'")
                ->order('a.id DESC')
                ->find();
        }
        return $this->pre;
    }

    // 下一篇内容
    public function getContentNext($scode, $id)
    {
        if (! $this->next) {
            $this->scodes = array();
            $scodes = $this->getSubScodes($scode);

            $field = array(
                'a.id',
                'a.title',
                'a.filename',
                'a.ico',
                'a.scode',
                'b.filename as sortfilename',
                'c.type',
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

            $this->next = parent::table('ay_content a')->field($field)
                ->where("a.id>$id")
                ->join($join)
                ->in('a.scode', $scodes)
                ->where("a.acode='" . get_lg() . "'")
                ->where('a.status=1')
                ->where("a.date<'" . date('Y-m-d H:i:s') . "'")
                ->order('a.id ASC')
                ->find();
        }
        return $this->next;
    }

    // 幻灯片
    public function getSlides($gid, $num, $start = 1)
    {
        $result = parent::table('ay_slide')->where("gid='$gid'")
            ->order('sorting ASC,id ASC')
            ->limit($start - 1, $num)
            ->select();
        return $result;
    }

    // 友情链接
    public function getLinks($gid, $num, $start = 1)
    {
        $result = parent::table('ay_link')->where("gid='$gid'")
            ->order('sorting ASC,id ASC')
            ->limit($start - 1, $num)
            ->select();
        return $result;
    }

    // 获取留言
    public function getMessage($num, $page = true, $start = 1, $lg = null)
    {
        if ($lg == 'all') {
            $where = array();
        } elseif ($lg) {
            $where = array(
                'a.acode' => $lg
            );
        } else {
            $where = array(
                'a.acode' => get_lg()
            );
        }

        $field = array(
            'a.*',
            'b.username',
            'b.nickname',
            'b.headpic'
        );
        $join = array(
            'ay_member b',
            'a.uid=b.id',
            'LEFT'
        );

        if ($page) {
            return parent::table('ay_message a')->field($field)
                ->join($join)
                ->where("a.status=1")
                ->where($where)
                ->order('a.id DESC')
                ->decode(false)
                ->page(1, $num, $start)
                ->select();
        } else {
            return parent::table('ay_message a')->field($field)
                ->join($join)
                ->where("a.status=1")
                ->where($where)
                ->order('a.id DESC')
                ->decode(false)
                ->limit($start - 1, $num)
                ->select();
        }
    }

    // 新增留言
    public function addMessage($data)
    {
        return parent::table('ay_message')->autoTime()->insert($data);
    }

    // 获取表单字段
    public function getFormField($fcode)
    {
        $field = array(
            'a.table_name',
            'a.form_name',
            'b.name',
            'b.required',
            'b.description'
        );

        $join = array(
            'ay_form_field b',
            'a.fcode=b.fcode',
            'LEFT'
        );

        return parent::table('ay_form a')->field($field)
            ->where("a.fcode='$fcode'")
            ->join($join)
            ->order('b.sorting ASC,b.id ASC')
            ->select();
    }

    // 获取表单表名称
    public function getFormTable($fcode)
    {
        return parent::table('ay_form')->where("fcode='$fcode'")->value('table_name');
    }

    // 获取表单数据
    public function getForm($table, $num, $page = true, $start = 1)
    {
        if ($page) {
            return parent::table($table)->order('id DESC')
                ->decode(false)
                ->page(1, $num, $start)
                ->select();
        } else {
            return parent::table($table)->order('id DESC')
                ->decode(false)
                ->limit($start - 1, $num)
                ->select();
        }
    }

    // 新增表单数据
    public function addForm($table, $data)
    {
        return parent::table($table)->insert($data);
    }

    // 文章内链
    public function getTags()
    {
        return parent::table('ay_tags')->field('name,link')
            ->where("acode='" . get_lg() . "'")
            ->order('length(name) desc')
            ->select();
    }

    // 新增评论
    public function addComment($data)
    {
        return parent::table('ay_member_comment')->insert($data);
    }

    // 文章评论
    public function getComment($contentid, $pid, $num, $order, $page = false, $start = 1)
    {
        $field = array(
            'a.*',
            'b.username',
            'b.nickname',
            'b.headpic',
            'c.username as pusername',
            'c.nickname as pnickname',
            'c.headpic as pheadpic'
        );
        $join = array(
            array(
                'ay_member b',
                'a.uid=b.id',
                'LEFT'
            ),
            array(
                'ay_member c',
                'a.puid=c.id',
                'LEFT'
            )
        );
        if ($page) {
            return parent::table('ay_member_comment a')->field($field)
                ->join($join)
                ->where("a.contentid='$contentid'")
                ->where('a.pid=' . $pid)
                ->where("a.status=1")
                ->order($order)
                ->page(1, $num, $start)
                ->select();
        } else {
            return parent::table('ay_member_comment a')->field($field)
                ->join($join)
                ->where("a.contentid='$contentid'")
                ->where('a.pid=' . $pid)
                ->where("a.status=1")
                ->order($order)
                ->limit($start - 1, $num)
                ->select();
        }
    }

    // 我的评论
    public function getMyComment($num, $order, $page = false, $start = 1)
    {
        $field = array(
            'a.*',
            'b.username',
            'b.nickname',
            'b.headpic',
            'c.username as pusername',
            'c.nickname as pnickname',
            'c.headpic as pheadpic',
            'd.title'
        );
        $join = array(
            array(
                'ay_member b',
                'a.uid=b.id',
                'LEFT'
            ),
            array(
                'ay_member c',
                'a.puid=c.id',
                'LEFT'
            ),
            array(
                'ay_content d',
                'a.contentid=d.id',
                'LEFT'
            )
        );
        if ($page) {
            return parent::table('ay_member_comment a')->field($field)
                ->join($join)
                ->where("uid='" . session('pboot_uid') . "'")
                ->order($order)
                ->page(1, $num, $start)
                ->select();
        } else {
            return parent::table('ay_member_comment a')->field($field)
                ->join($join)
                ->where("uid='" . session('pboot_uid') . "'")
                ->order($order)
                ->limit($start - 1, $num)
                ->select();
        }
    }

    // 删除评论
    public function delComment($id)
    {
        return parent::table('ay_member_comment')->where("uid='" . session('pboot_uid') . "'")
            ->where("id=$id")
            ->delete();
    }

    private function getMcodeByScode($scode)
    {
        if (! $scode) {
            return '';
        }
        if (! array_key_exists($scode, $this->selectMcodeCache)) {
            $this->selectMcodeCache[$scode] = parent::table('ay_content_sort')->where("scode='$scode' OR filename='$scode'")->value('mcode');
        }
        return $this->selectMcodeCache[$scode];
    }

    private function getSelectFilterValuesByScode($scode)
    {
        if (! array_key_exists($scode, $this->selectFilterValuesCache)) {
            $fields = $this->getCachedTableFields('ay_content_sort');
            $row = parent::table('ay_content_sort')->field('select_filter_values' . (in_array('select_filter_manual_values', $fields) ? ',select_filter_manual_values' : ''))
                ->where("scode='$scode'")
                ->find();
            $auto_values = $row && ! empty($row->select_filter_values) ? json_decode($row->select_filter_values, true) : array();
            $manual_values = $row && isset($row->select_filter_manual_values) && trim((string) $row->select_filter_manual_values) !== '' ? json_decode($row->select_filter_manual_values, true) : array();
            $this->selectFilterValuesCache[$scode] = $this->mergeSelectFilterData(is_array($auto_values) ? $auto_values : array(), is_array($manual_values) ? $manual_values : array());
        }
        return $this->selectFilterValuesCache[$scode];
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

    private function getRealtimeSelectFilterValue($scode, $field)
    {
        if (! preg_match('/^ext_[\w\-]+$/', $field)) {
            return null;
        }

        $cache_key = $scode . '|' . $field;
        if (array_key_exists($cache_key, $this->selectRealtimeValueCache)) {
            return $this->selectRealtimeValueCache[$cache_key];
        }

        $source = parent::table('ay_content_sort')->field('scode')
            ->where("scode='$scode' OR filename='$scode'")
            ->where("acode='" . get_lg() . "'")
            ->find();
        if (! $source) {
            $this->selectRealtimeValueCache[$cache_key] = null;
            return null;
        }

        $rows = $this->getSelectSortRows();
        $descendants = $this->getSelectDescendantRows($source->scode, $rows);
        if (! $descendants) {
            $this->selectRealtimeValueCache[$cache_key] = null;
            return null;
        }

        $values = array();
        $has_sync = false;
        foreach ($descendants as $row) {
            $sync = json_decode((string) $row->select_filter_sync, true);
            if (! is_array($sync) || empty($sync[$field])) {
                continue;
            }
            $has_sync = true;
            $config = json_decode(isset($row->select_filter_manual_values) ? (string) $row->select_filter_manual_values : '', true);
            if (! is_array($config)) {
                $config = json_decode((string) $row->select_filter_values, true);
            }
            $text = '';
            if (is_array($config) && array_key_exists($field, $config)) {
                $text = trim((string) $config[$field]);
            }
            if ($text === '') {
                $text = (string) $this->getModelSelectValue($field, $row->mcode, $row->scode);
            }
            foreach ($this->splitSelectFilterItems($text) as $item) {
                if (! in_array($item, $values, true)) {
                    $values[] = $item;
                }
            }
        }

        $manual_values = $this->getSelectFilterValuesByScode($source->scode);
        if (isset($manual_values[$field])) {
            foreach ($this->splitSelectFilterItems($manual_values[$field]) as $item) {
                if (! in_array($item, $values, true)) {
                    $values[] = $item;
                }
            }
        }
        $this->selectRealtimeValueCache[$cache_key] = ($has_sync || isset($manual_values[$field])) ? implode(',', $values) : null;
        return $this->selectRealtimeValueCache[$cache_key];
    }

    private function getSelectSortRows()
    {
        if ($this->selectSortRowsCache === null) {
            $fields = $this->getCachedTableFields('ay_content_sort');
            $field = 'scode,pcode,mcode,select_filter_values,select_filter_sync';
            if (in_array('select_filter_manual_values', $fields)) {
                $field .= ',select_filter_manual_values';
            }
            $this->selectSortRowsCache = parent::table('ay_content_sort')->field($field)
                ->where('status=1')
                ->where("acode='" . get_lg() . "'")
                ->select();
        }
        return $this->selectSortRowsCache;
    }

    private function getSelectDescendantRows($scode, $rows)
    {
        $result = array();
        foreach ($rows as $row) {
            if ((string) $row->pcode !== (string) $scode) {
                continue;
            }
            $result[] = $row;
            $children = $this->getSelectDescendantRows($row->scode, $rows);
            if ($children) {
                $result = array_merge($result, $children);
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

    private function getSelectFilterSourceScode($scode)
    {
        if (! array_key_exists($scode, $this->selectFilterSourceCache)) {
            $current = parent::table('ay_content_sort')->field('scode,pcode')
                ->where("scode='$scode' OR filename='$scode'")
                ->find();
            if (! $current) {
                $this->selectFilterSourceCache[$scode] = $scode;
                return $this->selectFilterSourceCache[$scode];
            }

            while ($current->pcode) {
                $parent = parent::table('ay_content_sort')->field('scode,pcode')
                    ->where("scode='{$current->pcode}'")
                    ->find();
                if (! $parent || ! $parent->pcode) {
                    break;
                }
                $current = $parent;
            }
            $this->selectFilterSourceCache[$scode] = $current->scode;
        }
        return $this->selectFilterSourceCache[$scode];
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
                array('ay_content_sort b', 'a.scode=b.scode', 'LEFT'),
                array('ay_model m', 'b.mcode=m.mcode', 'LEFT')
            ))
            ->where("a.id='$id'")
            ->find();
        return $this->normalizeExtTableName($row ? $row->tname : '');
    }

    private function getExtDataByContentId($id, $fields = array())
    {
        $table = $this->getExtTableByContentId($id);
        $query = parent::table($table)->where("contentid='$id'");
        if ($fields) {
            $fields = array_values(array_unique($fields));
            $query->field(implode(',', $fields));
        }
        return $query->decode()->find();
    }

    private function attachExtDataRow($row, $fields = array())
    {
        if (! $row) {
            return $row;
        }
        $ext = $this->getExtDataByContentId($row->id, $fields);
        if ($ext) {
            foreach ($ext as $k => $v) {
                $row->$k = $v;
            }
        }
        return $row;
    }

    private function attachExtDataList($list, $fields = array())
    {
        if (! $list) {
            return $list;
        }
        foreach ($list as $item) {
            $this->attachExtDataRow($item, $fields);
        }
        return $list;
    }

    private function getCachedTableFields($table)
    {
        if (! isset($this->tableFieldsCache[$table])) {
            $fields = parent::tableFields($table);
            $this->tableFieldsCache[$table] = $fields ? $fields : array();
        }
        return $this->tableFieldsCache[$table];
    }

    private function splitExtSelectConditions($select, $scode = '')
    {
        if (! is_array($select) || ! $select) {
            return array($select, array(), false);
        }

        $base_select = array();
        $ext_select = array();
        $need_ext_join = false;
        $content_fields = $this->getCachedTableFields('ay_content');
        
        // 获取扩展表名
        $ext_table_name = 'ay_content_ext';
        if ($scode) {
            $model = parent::table('ay_model')->join(array(
                'ay_content_sort',
                'ay_model.mcode=ay_content_sort.mcode',
                'LEFT'
            ))->where("ay_content_sort.scode='{$scode}'")->find();
            if ($model && $model->tname) {
                $ext_table_name = $model->tname;
            }
        }
        
        $ext_fields = $this->getCachedTableFields($ext_table_name);

        foreach ($select as $key => $value) {
            if (is_int($key) || strpos($key, 'ext_') !== 0) {
                $base_select[$key] = $value;
                continue;
            }

            if (in_array($key, $content_fields)) {
                $base_select[$key] = $value;
            } elseif (in_array($key, $ext_fields)) {
                $ext_select['e.' . $key] = $value;
                $need_ext_join = true;
            } else {
                $base_select[$key] = $value;
            }
        }

        return array($base_select, $ext_select, $need_ext_join);
    }
}
