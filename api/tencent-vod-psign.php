<?php

define('IS_INDEX', true);
require dirname(__DIR__) . '/core/init.php';

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
            'code' => $code,
            'message' => $message,
            'data' => $data
        ),
        JSON_UNESCAPED_UNICODE
    );
    exit();
}

function base64url_encode($input)
{
    return rtrim(strtr(base64_encode($input), '+/', '-_'), '=');
}

function normalize_play_type($value)
{
    $value = trim((string) $value);
    if (! $value) {
        return '';
    }

    $map = array(
        'original' => 'Original',
        'transcode' => 'Transcode',
        'rawadaptive' => 'RawAdaptive',
        'raw_adaptive' => 'RawAdaptive'
    );
    $key = strtolower(str_replace(array('-', ' '), '_', $value));
    $key = str_replace('__', '_', $key);
    return isset($map[$key]) ? $map[$key] : $value;
}

function resolve_definition_id($playType)
{
    if ($playType === 'Transcode' || $playType === 'RawAdaptive') {
        return (int) Config::get('tencent_vod.definition_id');
    }

    return 0;
}

function create_vod_psign($appId, $fileId, $playType, $expireSeconds, $playKey, $options = array())
{
    $currentTime = time();
    $contentInfo = array(
        'audioVideoType' => (string) $playType
    );

    if ($playType === 'Transcode' && ! empty($options['transcode_definition'])) {
        $contentInfo['transcodeDefinition'] = (int) $options['transcode_definition'];
    }

    if ($playType === 'RawAdaptive' && ! empty($options['raw_adaptive_definition'])) {
        $contentInfo['rawAdaptiveDefinition'] = (int) $options['raw_adaptive_definition'];
    }

    $payload = array(
        'appId' => (int) $appId,
        'fileId' => (string) $fileId,
        'contentInfo' => $contentInfo,
        'currentTimeStamp' => $currentTime,
        'expireTimeStamp' => $currentTime + (int) $expireSeconds
    );

    if (! empty($options['play_domain']) || ! empty($options['url_scheme'])) {
        $payload['urlAccessInfo'] = array();
        if (! empty($options['play_domain'])) {
            $payload['urlAccessInfo']['domain'] = (string) $options['play_domain'];
        }
        if (! empty($options['url_scheme'])) {
            $payload['urlAccessInfo']['scheme'] = strtoupper((string) $options['url_scheme']);
        }
    }

    $header = array(
        'alg' => 'HS256',
        'typ' => 'JWT'
    );

    $headerEncoded = base64url_encode(json_encode($header, JSON_UNESCAPED_UNICODE));
    $payloadEncoded = base64url_encode(json_encode($payload, JSON_UNESCAPED_UNICODE));
    $signature = hash_hmac('sha256', $headerEncoded . '.' . $payloadEncoded, $playKey, true);

    return array(
        'psign' => $headerEncoded . '.' . $payloadEncoded . '.' . base64url_encode($signature),
        'expireTime' => $payload['expireTimeStamp']
    );
}

function create_db_connection()
{
    $db = Config::get('database');
    if (! $db) {
        throw new Exception('database config missing');
    }

    $type = isset($db['type']) ? strtolower($db['type']) : 'mysqli';
    if ($type !== 'mysqli') {
        throw new Exception('unsupported database driver');
    }

    $conn = @new mysqli($db['host'], $db['user'], $db['passwd'], $db['dbname'], (int) $db['port']);
    if ($conn->connect_errno) {
        throw new Exception('database connection failed');
    }

    $conn->set_charset('utf8mb4');
    return $conn;
}

try {
    $origin = isset($_SERVER['HTTP_ORIGIN']) ? trim($_SERVER['HTTP_ORIGIN']) : '';
    if ($origin) {
        $originHost = parse_url($origin, PHP_URL_HOST);
        $currentHost = isset($_SERVER['HTTP_HOST']) ? preg_replace('/:\d+$/', '', $_SERVER['HTTP_HOST']) : '';
        if (! $originHost || strcasecmp($originHost, $currentHost) !== 0) {
            Log::error('[tencent_vod_psign] cross-origin request blocked: ' . $origin);
            respond_json(1, 'forbidden');
        }
    }

    $contentId = isset($_GET['contentId']) ? (int) $_GET['contentId'] : 0;
    $directFileId = isset($_GET['fileId']) ? trim((string) $_GET['fileId']) : '';
    if ($contentId <= 0 && $directFileId === '') {
        respond_json(1, 'invalid contentId');
    }

    $appId = Config::get('tencent_vod.app_id');
    $playKey = Config::get('tencent_vod.play_key');
    $expireSeconds = (int) (Config::get('tencent_vod.sign_expire') ?: 7200);
    $playType = normalize_play_type(Config::get('tencent_vod.play_type') ?: 'Original');
    $playDomain = trim((string) Config::get('tencent_vod.play_domain'));
    $urlScheme = strtoupper(trim((string) Config::get('tencent_vod.url_scheme')));
    $licenseUrl = trim((string) Config::get('tencent_vod.license_url'));
    $licenseKey = trim((string) Config::get('tencent_vod.license_key'));

    if (! $appId || ! $playKey) {
        Log::error('[tencent_vod_psign] missing VOD config');
        respond_json(1, 'service unavailable');
    }

    if (! in_array($playType, array('Original', 'Transcode', 'RawAdaptive'), true)) {
        Log::error('[tencent_vod_psign] unsupported play type config: ' . $playType);
        respond_json(1, 'service unavailable');
    }

    $definitionId = resolve_definition_id($playType);

    if (($playType === 'Transcode' || $playType === 'RawAdaptive') && $definitionId <= 0) {
        Log::error('[tencent_vod_psign] missing definition id for direct or content playback, playType=' . $playType);
        respond_json(1, 'service unavailable');
    }

    if ($directFileId !== '') {
        if (! preg_match('/^[A-Za-z0-9_-]{6,128}$/', $directFileId)) {
            respond_json(1, 'invalid fileId');
        }

        $signOptions = array(
            'play_domain' => $playDomain,
            'url_scheme' => $urlScheme
        );
        if ($playType === 'Transcode') {
            $signOptions['transcode_definition'] = $definitionId;
        } elseif ($playType === 'RawAdaptive') {
            $signOptions['raw_adaptive_definition'] = $definitionId;
        }

        $sign = create_vod_psign($appId, $directFileId, $playType, $expireSeconds, $playKey, $signOptions);

        respond_json(0, 'success', array(
            'appId' => (string) $appId,
            'fileId' => (string) $directFileId,
            'playType' => (string) $playType,
            'definitionId' => $definitionId,
            'psign' => $sign['psign'],
            'expireTime' => $sign['expireTime'],
            'licenseUrl' => $licenseUrl,
            'licenseKey' => $licenseKey
        ));
    }

    $conn = create_db_connection();
    $sql = "SELECT a.id, a.status, a.date, b.mcode, b.status AS sort_status, v.*
            FROM ay_content a
            LEFT JOIN ay_content_sort b ON a.scode = b.scode
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
    $conn->close();

    if (! $row) {
        respond_json(1, 'content not found');
    }

    if ((string) $row['status'] !== '1' || (string) $row['sort_status'] !== '1') {
        respond_json(1, 'content not available');
    }

    if (! empty($row['date']) && strtotime($row['date']) > time()) {
        respond_json(1, 'content not available');
    }

    if ((string) $row['mcode'] !== '4') {
        respond_json(1, 'content not available');
    }

    $fileId = isset($row['ext_tcplayer_file_id']) ? trim($row['ext_tcplayer_file_id']) : '';
    if (! $fileId) {
        Log::error('[tencent_vod_psign] empty fileId for contentId=' . $contentId);
        respond_json(1, 'file unavailable');
    }

    $signOptions = array(
        'play_domain' => $playDomain,
        'url_scheme' => $urlScheme
    );
    if ($playType === 'Transcode') {
        $signOptions['transcode_definition'] = $definitionId;
    } elseif ($playType === 'RawAdaptive') {
        $signOptions['raw_adaptive_definition'] = $definitionId;
    }

    $sign = create_vod_psign($appId, $fileId, $playType, $expireSeconds, $playKey, $signOptions);

    respond_json(0, 'success', array(
        'appId' => (string) $appId,
        'fileId' => (string) $fileId,
        'playType' => (string) $playType,
        'definitionId' => $definitionId,
        'psign' => $sign['psign'],
        'expireTime' => $sign['expireTime'],
        'licenseUrl' => $licenseUrl,
        'licenseKey' => $licenseKey
    ));
} catch (Throwable $e) {
    Log::error('[tencent_vod_psign] ' . $e->getMessage());
    respond_json(1, 'server error');
}
