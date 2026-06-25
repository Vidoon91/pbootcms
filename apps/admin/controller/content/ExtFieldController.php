<?php
/**
 * 扩展字段控制器- 改造版，解决第一次新增404问题
 * 保留字段长度优化和索引逻辑，不影响其他模块
 */
namespace app\admin\controller\content;

use core\basic\Controller;
use app\admin\model\content\ExtFieldModel;

class ExtFieldController extends Controller
{
    private $model;

    public function __construct()
    {
        $this->model = new ExtFieldModel();
    }

    // 扩展字段列表
    public function index()
    {
        if ((! ! $id = get('id', 'int')) && $result = $this->model->getExtField($id)) {
            $this->assign('more', true);
            $this->assign('extfield', $result);
        } else {
            $this->assign('list', true);
            if ((! ! ($field = get('field', 'var'))) && (! ! ($keyword = get('keyword', 'vars')))) {
                $result = $this->model->findExtField($field, $keyword);
            } else {
                $result = $this->model->getList();
            }

            $models = model('admin.content.Model');
            $this->assign('models', $models->getSelect());
            $this->assign('extfields', $result);
        }
        $this->display('content/extfield.html');
    }

    // 扩展字段增加
    public function add()
    {
        if ($_POST) {
            $mcode = post('mcode');
            $name = post('name', 'var');
            $type = post('type', 'int');
            $value = post('value');
            if (! ! $value) {
                $value = str_replace(["\r\n","，"], ",", $value);
            }
            $description = post('description');
            $sorting = post('sorting', 'int');

            if (!$mcode) alert_back('内容模型不能为空！');
            if (!$name) alert_back('字段名称不能为空！');
            $name = "ext_" . $name;
            if (!$type) alert_back('字段类型不能为空！');
            if (!$description) alert_back('字段描述不能为空！');

            $model = model('admin.content.Model');
            $tname = $model->getExtTableName($mcode);
            $model->ensureExtTable($tname);

            // 构建数据
            $data = [
                'mcode' => $mcode,
                'name' => $name,
                'type' => $type,
                'value' => $value,
                'description' => $description,
                'sorting' => $sorting
            ];

            // 字段类型及长度安全处理
            switch ($type) {
                case '2':  // 多行文本
                case '4':
                case '8':  // 编辑器
                case '10': // 多图/上传
                    $mysql = 'LONGTEXT';
                    $sqlite = 'TEXT';
                    break;
                case '7':  // 时间/日期
                    $mysql = 'DATETIME';
                    $sqlite = 'TEXT';
                    break;
                default:   // 普通短文本
                    $mysql = 'VARCHAR(255)'; // 短字段改50
                    $sqlite = 'TEXT';
            }

            // 字段不存在时创建
            if (!$this->model->isExistField($name, $tname)) {
                if (get_db_type() == 'sqlite') {
                    $this->model->amd("ALTER TABLE $tname ADD COLUMN $name $sqlite NULL");
                } else {
                    $this->model->amd("ALTER TABLE $tname ADD $name $mysql NULL COMMENT '$description'");
                    // 仅短字段创建索引
                    if (strpos($mysql, 'VARCHAR') !== false) {
                        $this->model->amd("CREATE INDEX ay_content_{$name}_index ON $tname ($name)");
                    }
                }
            } elseif ($this->model->checkExtField($name, $mcode)) {
                alert_back('字段已经存在，不能重复添加！');
            }

            // 执行扩展字段记录添加
            if ($this->model->addExtField($data)) {
                $this->log('新增扩展字段成功！');

                // 清理后台缓存，避免列表拿不到新字段
                if (function_exists('del_cache')) {
                    del_cache('admin.content.ExtField');
                }

                // 延迟跳转 + 安全 backurl
                $backurl = get('backurl');
                sleep(1); // 确保 ALTER TABLE 执行完毕
                if (!empty($backurl) && base64_decode($backurl) !== false) {
                    success('新增成功！', base64_decode($backurl));
                } else {
                    success('新增成功！', url('/admin/ExtField/index'));
                }
            } else {
                $this->log('新增扩展字段失败！');
                error('新增失败！', -1);
            }
        }
    }

    // 扩展字段删除
    public function del()
    {
        if (!$id = get('id', 'int')) {
            error('传递的参数值错误！', -1);
        }

        $ext = $this->model->getExtField($id);
        $name = $ext ? $ext->name : '';
        if ($this->model->delExtField($id)) {
            if (!empty($name) && get_db_type() == 'mysql') {
                $model = model('admin.content.Model');
                $tname = $model->getExtTableName($ext->mcode);

                // 优先删除当前模型对应扩展表字段
                if ($this->model->isExistField($name, $tname)) {
                    $this->model->amd("ALTER TABLE $tname DROP COLUMN $name");
                    $contentExt = $this->model->checkExtIndex($tname);
                    foreach ($contentExt as $items) {
                        if ($items[2] == "ay_content_{$name}_index") {
                            $this->model->amd("ALTER TABLE $tname DROP KEY ay_content_{$name}_index");
                        }
                    }
                }

                // 仅删除当前模型对应的扩展表字段，不联动清理其它表
            }
            $this->log('删除扩展字段' . $id . '成功！');
            success('删除成功！', -1);
        } else {
            $this->log('删除扩展字段' . $id . '失败！');
            error('删除失败！', -1);
        }
    }

    // 扩展字段修改
    public function mod()
    {
        if (!$id = get('id', 'int')) {
            error('传递的参数值错误！', -1);
        }

        if (($field = get('field', 'var')) && !is_null($value = get('value', 'var'))) {
            if ($this->model->modExtField($id, "$field='$value',update_user='" . session('username') . "'")) {
                location(-1);
            } else {
                alert_back('修改失败！');
            }
        }

        if ($_POST) {
            $mcode = post('mcode');
            $type = post('type', 'int');
            $value = post('value');
            if (! ! $value) {
                $value = str_replace(["\r\n","，"], ",", $value);
            }
            $description = post('description');
            $sorting = post('sorting', 'int');

            if (!$mcode) alert_back('内容模型不能为空！');
            if (!$description) alert_back('字段描述不能为空！');

            $data = [
                'mcode' => $mcode,
                'type' => $type,
                'value' => $value,
                'description' => $description,
                'sorting' => $sorting
            ];

            if ($this->model->modExtField($id, $data)) {
                $this->log('修改扩展字段' . $id . '成功！');

                // 清理缓存
                if (function_exists('del_cache')) {
                    del_cache('admin.content.ExtField');
                }

                // 延迟跳转 + 安全 backurl
                $backurl = get('backurl');
                sleep(1);
                if (!empty($backurl) && base64_decode($backurl) !== false) {
                    success('修改成功！', base64_decode($backurl));
                } else {
                    success('修改成功！', url('/admin/ExtField/index'));
                }
            } else {
                location(-1);
            }
        } else {
            $this->assign('mod', true);
            if (! $result = $this->model->getExtField($id)) {
                error('编辑的内容已经不存在！', -1);
            }

            $models = model('admin.content.Model');
            $this->assign('models', $models->getSelect());
            $this->assign('extfield', $result);
            $this->display('content/extfield.html');
        }
    }
}
