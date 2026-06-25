<?php

<?php

namespace app\api\controller;

use core\basic\Controller;

class IndexNowController extends Controller
{
    // 提交 URL 到 IndexNow
    public function submitToIndexNow()
    {
        // 获取配置项
        $api_url = $this->config('indexnow.api_url');
        $api_key = $this->config('indexnow.api_key');

        // 获取 POST 请求中的 URL 参数
        $urls = input('post.urls/a');  // 假设你通过 POST 请求传递 URL 列表

        if (empty($urls)) {
            return json(['status' => 'error', 'message' => 'No URLs provided']);
        }

        // 调用提交到 IndexNow 的函数
        $result = $this->submitUrls($api_url, $api_key, $urls);
        return json($result);
    }

    // 提交 URL 到 IndexNow 的逻辑
    private function submitUrls($api_url, $api_key, $urls)
    {
        // 用户名和密码，用于 Basic Authentication
        $username = 'w842635534';  // 替换为你的认证用户名
        $password = 'w5213344';  // 替换为你的认证密码

        // 编码用户名和密码
        $auth = base64_encode("$username:$password");

        $data = [
            'key' => $api_key,
            'urlList' => json_encode($urls),
            'action' => 'publish'
        ];

        $options = [
            'http' => [
                'header' => [
                    "Content-type: application/x-www-form-urlencoded\r\n",
                    "Authorization: Basic $auth\r\n"  // 传递认证信息
                ],
                'method' => 'POST',
                'content' => http_build_query($data)
            ]
        ];

        // 发送请求到 IndexNow API
        $context = stream_context_create($options);
        $response = file_get_contents($api_url, false, $context);

        if ($response) {
            return ['status' => 'success', 'message' => 'URLs submitted successfully'];
        } else {
            return ['status' => 'error', 'message' => 'Failed to submit URLs'];
        }
    }
}
