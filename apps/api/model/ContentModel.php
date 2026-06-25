<?php
namespace app\api\model;

use core\basic\Model;

class ContentModel extends Model {

    // 获取已更新的 URL 列表
    public function getUpdatedUrls() {
        // 假设你有一个名为 'ay-content' 的内容表，包含 URL 列字段 'outlink'
        $result = $this->db->name('ay_content')
                           ->where('status', 1)  // 假设 'status' 字段标识是否更新
                           ->where('outlink', '<>', '')  // 确保 URL 字段不为空
                           ->column('outlink');  // 获取 'outlink' 列的值

        return $result;  // 返回 URL 列表
    }
}
