<?php

namespace app\admin\controller\system;

use app\admin\model\content\CompanyModel;
use app\admin\model\content\ContentModel;
use app\admin\model\content\ContentSortModel;
use app\admin\model\content\LabelModel;
use app\admin\model\content\LinkModel;
use app\admin\model\content\SiteModel;
use app\admin\model\content\SlideModel;
use app\home\model\MemberModel;
use core\basic\Controller;

class ImageExtController extends Controller
{
    private $companyModel;
    private $contentSortModel;
    private $contentModel;
    private $linkModel;
    private $memberModel;
    private $siteModel;
    private $slideModel;
    private $LabelModel;

    public function __construct()
    {
        $this->companyModel = new CompanyModel();
        $this->contentSortModel = new ContentSortModel();
        $this->contentModel = new ContentModel();
        $this->linkModel = new LinkModel();
        $this->memberModel = new MemberModel();
        $this->siteModel = new SiteModel();
        $this->slideModel = new SlideModel();
        $this->LabelModel = new LabelModel();
    }

    public function index()
    {
        $this->display('system/extimage.html');
    }

    public function checkDataFile()
    {
        $count = 30;
        $page = get('page') ? get('page') : 1;
        $start = ($page - 1) * $count;

        $usedImages = $this->getUsedImagePaths();
        $uploadFiles = $this->getUploadFiles();
        $unusedFiles = array_values(array_diff($uploadFiles, $usedImages));
        $pageList = array_slice($unusedFiles, $start, $count);

        $http = is_https() ? 'https://' : 'http://';
        foreach ($pageList as &$value) {
            $value = [
                'real_path' => $value,
                'static_path' => $http . $_SERVER['SERVER_NAME'] . str_replace(DOC_PATH, '', $value),
                'update_time' => date('Y-m-d H:i:s', filemtime($value))
            ];
        }
        $jsonData = ['code' => 0, 'msg' => '', 'count' => count($unusedFiles), 'data' => $pageList];
        return json_encode($jsonData);
    }

    public function do_ext()
    {
        $type = post('type');
        $list = post('list');
        $movePath = $this->normalizeRealPath(DOC_PATH . STATIC_DIR . '/backup/ImageExt');
        check_dir($movePath, true);

        switch ($type) {
            case 0:
                if (is_array($list)) {
                    foreach ($list as $value) {
                        if (! empty($value['real_path'])) {
                            $this->moveUnusedImage($this->normalizeRealPath($value['real_path']), $movePath);
                        }
                    }
                }
                break;
            case 1:
                $unusedFiles = array_diff($this->getUploadFiles(), $this->getUsedImagePaths());
                foreach ($unusedFiles as $path) {
                    $this->moveUnusedImage($path, $movePath);
                }
                break;
        }
        json(1, '');
    }

    private function getUploadFiles()
    {
        $filePath = DOC_PATH . STATIC_DIR . '/upload';
        $fileList = get_dir($filePath);
        $fileArr = [];
        array_walk_recursive($fileList, function ($path) use (&$fileArr) {
            $fileArr[] = $this->normalizeRealPath($path);
        });
        return array_unique($fileArr);
    }

    private function getUsedImagePaths()
    {
        $dataArr = [];
        $resArr = array_merge_recursive(
            $this->companyModel->getImage(),
            $this->contentSortModel->getImage(),
            $this->contentModel->getImage(),
            $this->linkModel->getImage(),
            $this->memberModel->getImage(),
            $this->siteModel->getImage(),
            $this->slideModel->getImage(),
            $this->LabelModel->getImage(),
            $this->getThemeImageReferences()
        );

        array_walk_recursive($resArr, function ($value) use (&$dataArr) {
            foreach ($this->extractImagePaths($value) as $path) {
                if ($realPath = $this->normalizeImagePath($path)) {
                    $dataArr[] = $realPath;
                }
            }
        });
        return array_unique($dataArr);
    }

    private function getThemeImageReferences()
    {
        $references = [];
        $scanDirs = [
            ROOT_PATH . '/template',
            ROOT_PATH . '/skin'
        ];
        $allowExts = ['html', 'htm', 'css', 'js', 'json'];

        foreach ($scanDirs as $dir) {
            if (! is_dir($dir)) {
                continue;
            }
            $files = get_dir($dir);
            array_walk_recursive($files, function ($file) use (&$references, $allowExts) {
                if (! is_file($file)) {
                    return;
                }
                $ext = strtolower(pathinfo($file, PATHINFO_EXTENSION));
                if (! in_array($ext, $allowExts)) {
                    return;
                }
                $content = file_get_contents($file);
                if ($content !== false) {
                    $references[] = $content;
                }
            });
        }

        return $references;
    }

    private function extractImagePaths($value)
    {
        $value = html_entity_decode(decode_string((string) $value), ENT_QUOTES, 'UTF-8');
        if ($value === '') {
            return [];
        }

        $images = [];
        $imageExt = 'gif|jpe?g|png|webp|bmp|svg';
        if (preg_match_all('/(?:src|href|data-src|data-original|data-lazy-src)\s*=\s*["\']([^"\']+\.(?:' . $imageExt . ')(?:\?[^"\']*)?)["\']/i', $value, $matches)) {
            $images = array_merge($images, $matches[1]);
        }
        if (preg_match_all('/(?:^|[,;\s"\'])([^,;\s"\']+\.(?:' . $imageExt . ')(?:\?[^,;\s"\']*)?)/i', $value, $matches)) {
            $images = array_merge($images, $matches[1]);
        }
        return array_unique($images);
    }

    private function normalizeImagePath($path)
    {
        $path = trim(str_replace('\\', '/', (string) $path));
        if ($path === '' || stripos($path, 'data:image/') === 0) {
            return false;
        }

        if (preg_match('/^https?:\/\//i', $path)) {
            $host = parse_url($path, PHP_URL_HOST);
            if ($host && isset($_SERVER['SERVER_NAME']) && strcasecmp($host, $_SERVER['SERVER_NAME']) !== 0) {
                return false;
            }
            $path = parse_url($path, PHP_URL_PATH);
        }

        $path = rawurldecode((string) $path);
        $path = preg_replace('/[?#].*$/', '', $path);
        $path = ltrim($path, '/');

        $siteDir = trim(str_replace('\\', '/', SITE_DIR), '/');
        if ($siteDir && strpos($path, $siteDir . '/') === 0) {
            $path = substr($path, strlen($siteDir) + 1);
        }

        $staticDir = trim(str_replace('\\', '/', STATIC_DIR), '/');
        $pos = strpos($path, $staticDir . '/');
        if ($pos === false) {
            return false;
        }

        $path = '/' . substr($path, $pos);
        return $this->normalizeRealPath(DOC_PATH . $path);
    }

    private function moveUnusedImage($path, $movePath)
    {
        $path = $this->normalizeRealPath($path);
        if (! is_file($path)) {
            return;
        }

        $filePath = strstr($path, '/' . trim(STATIC_DIR, '/') . '/');
        if (! $filePath) {
            return;
        }

        $fileName = basename($path);
        $fileDir = str_replace($fileName, '', $filePath);
        check_dir($movePath . $fileDir, true);
        rename($path, $movePath . $filePath);
    }

    private function normalizeRealPath($path)
    {
        return preg_replace('/\/+/', '/', str_replace('\\', '/', $path));
    }
}
