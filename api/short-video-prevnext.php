<?php

define('IS_INDEX', true);
require dirname(__DIR__) . '/core/init.php';

use app\home\controller\ParserController;
use app\home\model\ParserModel;
use core\basic\Config;
use core\basic\Log;

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate');
header('Pragma: no-cache');
header('X-Content-Type-Options: nosniff');

function respond_json($code, $message, $data = array())
{
    echo json_encode(
        array(
            'code' => (int) $code,
            'message' => (string) $message,
            'data' => $data
        ),
        JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
    );
    exit();
}

function block_cross_origin_request()
{
    $origin = isset($_SERVER['HTTP_ORIGIN']) ? trim((string) $_SERVER['HTTP_ORIGIN']) : '';
    if (! $origin) {
        return;
    }

    $originHost = parse_url($origin, PHP_URL_HOST);
    $currentHost = isset($_SERVER['HTTP_HOST']) ? preg_replace('/:\d+$/', '', $_SERVER['HTTP_HOST']) : '';
    if (! $originHost || ! $currentHost || strcasecmp($originHost, $currentHost) !== 0) {
        Log::error('[short_video_prevnext] cross-origin request blocked: ' . $origin);
        respond_json(1, 'forbidden');
    }
}

function create_db_connection()
{
    $database = config('database');
    if (! is_array($database)) {
        throw new Exception('database config missing');
    }

    $conn = @new mysqli(
        $database['host'],
        $database['user'],
        $database['passwd'],
        $database['dbname'],
        (int) $database['port']
    );

    if ($conn->connect_errno) {
        throw new Exception('database connection failed');
    }

    $conn->set_charset('utf8mb4');
    return $conn;
}

function fetch_video_content($conn, $contentId)
{
    $sql = "SELECT
                a.id,
                a.title,
                a.filename,
                a.ico,
                a.description,
                a.tags,
                a.keywords,
                a.visits,
                a.date,
                a.scode,
                a.status,
                a.acode,
                b.filename AS sortfilename,
                b.name AS sortname,
                b.mcode,
                b.status AS sort_status,
                c.type,
                c.urlname,
                v.ext_tcplayer_file_id
            FROM ay_content a
            LEFT JOIN ay_content_sort b ON a.scode = b.scode
            LEFT JOIN ay_model c ON b.mcode = c.mcode
            LEFT JOIN ay_content_video v ON v.contentid = a.id
            WHERE a.id = ?
            LIMIT 1";

    $stmt = $conn->prepare($sql);
    if (! $stmt) {
        throw new Exception('prepare failed');
    }

    $stmt->bind_param('i', $contentId);
    $stmt->execute();
    $result = $stmt->get_result();
    $row = $result ? $result->fetch_assoc() : null;
    $stmt->close();

    return $row ?: null;
}

function build_video_payload($row, $parser)
{
    if (! $row) {
        return null;
    }

    $link = $parser->parserLink(
        $row['type'],
        $row['urlname'],
        'content',
        $row['scode'],
        $row['sortfilename'],
        $row['id'],
        $row['filename']
    );

    $visits = (int) $row['visits'];
    $poster = trim((string) $row['ico']);
    if ($poster && ! preg_match('/^https?:\/\//i', $poster) && strpos($poster, '/') === 0) {
        $poster = SITE_DIR . $poster;
    }

    $licenseUrl = trim((string) Config::get('tencent_vod.license_url'));
    $licenseKey = trim((string) Config::get('tencent_vod.license_key'));

    return array(
        'id' => (int) $row['id'],
        'title' => (string) $row['title'],
        'url' => (string) $link,
        'poster' => (string) $poster,
        'description' => (string) $row['description'],
        'tags' => array_values(array_filter(array_map('trim', explode(',', (string) $row['tags'])))),
        'keywords' => (string) $row['keywords'],
        'fileId' => (string) $row['ext_tcplayer_file_id'],
        'licenseUrl' => $licenseUrl,
        'licenseKey' => $licenseKey,
        'sortName' => (string) $row['sortname'],
        'date' => (string) $row['date'],
        'views' => $visits,
        'likes' => $visits,
        'shares' => max(0, (int) floor($visits / 10)),
        'comments' => 0
    );
}

try {
    block_cross_origin_request();

    $contentId = isset($_GET['contentId']) ? (int) $_GET['contentId'] : 0;
    if ($contentId <= 0) {
        respond_json(1, 'invalid contentId');
    }

    $conn = create_db_connection();
    $current = fetch_video_content($conn, $contentId);
    if (! $current) {
        $conn->close();
        respond_json(1, 'content not found');
    }

    if ((string) $current['status'] !== '1' || (string) $current['sort_status'] !== '1') {
        $conn->close();
        respond_json(1, 'content not available');
    }

    if (! empty($current['date']) && strtotime($current['date']) > time()) {
        $conn->close();
        respond_json(1, 'content not available');
    }

    if ((string) $current['mcode'] !== '4') {
        $conn->close();
        respond_json(1, 'content not available');
    }

    $parserModel = new ParserModel();
    $parser = new ParserController();

    $preSummary = $parserModel->getContentPre($current['scode'], $current['id']);
    $nextSummary = $parserModel->getContentNext($current['scode'], $current['id']);

    $prev = null;
    $next = null;

    if ($preSummary && ! empty($preSummary->id)) {
        $prevRow = fetch_video_content($conn, (int) $preSummary->id);
        if ($prevRow && trim((string) $prevRow['ext_tcplayer_file_id']) !== '') {
            $prev = build_video_payload($prevRow, $parser);
        }
    }

    if ($nextSummary && ! empty($nextSummary->id)) {
        $nextRow = fetch_video_content($conn, (int) $nextSummary->id);
        if ($nextRow && trim((string) $nextRow['ext_tcplayer_file_id']) !== '') {
            $next = build_video_payload($nextRow, $parser);
        }
    }

    $payload = array(
        'current' => build_video_payload($current, $parser),
        'prev' => $prev,
        'next' => $next
    );

    $conn->close();
    respond_json(0, 'success', $payload);
} catch (Throwable $e) {
    Log::error('[short_video_prevnext] ' . $e->getMessage());
    respond_json(1, 'server error');
}
