<?php
return array (
  'open_wap' => '0',
  'message_check_code' => '1',
  'smtp_server' => 'smtp.qq.com',
  'smtp_port' => '465',
  'smtp_ssl' => '1',
  'smtp_username' => '842635534@qq.com',
  'smtp_password' => 'vqkxtndndidgbbcj',
  'admin_check_code' => '1',
  'weixin_appid' => '',
  'weixin_secret' => '',
  'message_send_mail' => '1',
  'message_send_to' => '842635534@qq.com,865253076@qq.com',
  'api_open' => '1',
  'api_auth' => '1',
  'api_appid' => 'w842635534',
  'api_secret' => 'w5213344',
  'baidu_zz_token' => '',
  'baidu_xzh_appid' => '',
  'baidu_xzh_token' => '',
  'wap_domain' => '',
  'gzip' => '1',
  'content_tags_replace_num' => '1',
  'smtp_username_test' => '865253076@qq.com',
  'form_send_mail' => '1',
  'baidu_xzh_type' => '0',
  'watermark_open' => '0',
  'watermark_text' => '',
  'watermark_text_font' => '',
  'watermark_text_size' => '20',
  'watermark_text_color' => '100,100,100',
  'watermark_pic' => '/static/upload/image/20211213/1639398226421644.png',
  'watermark_position' => '4',
  'message_verify' => '1',
  'form_check_code' => '0',
  'lock_count' => '5',
  'lock_time' => '900',
  'url_rule_type' => '2',
  'message_status' => '1',
  'form_status' => '1',
  'tpl_html_dir' => '',
  'ip_deny' => '20.171.207.37',
  'ip_allow' => '',
  'close_site' => '0',
  'close_site_note' => '',
  'lgautosw' => '1',
  'spiderlog' => '1',
  'to_https' => '0',
  'to_main_domain' => '0',
  'main_domain' => 'test.wishpower.net',
  'content_keyword_replace' => '',
  'message_rqlogin' => '0',
  'url_rule_sort_suffix' => '0',
  'tpl_html_cache' => '1',
  'tpl_html_cache_time' => '',
  'licensecode' => 'MDQ2NDJDRTIyRC8=4',
  'url_rule_content_path' => '0',
  'url_index_404' => '1',
  'upgrade_branch' => '3.X',
  'upgrade_force' => '0',
  'comment_send_mail' => '1',
  'select_url_path' => '1',
  'select_url_path_rules' => '{
    "models": {
        "4": [
            "ext_product_type",
            "ext_voltage",
            "ext_application",
            "ext_standard"
        ],
        "7": [
            "ext_citys",
            "ext_voltages",
            "ext_types",
            "ext_applications"
        ]
    }
}',
  'select_url_path_seo_rules' => '{
    "models": {
        "4": {
            "default": {
                "title": "{filter:ext_voltages}{filter:ext_types}{filter:ext_applications}{filter:ext_standard}{sort:subname} - {pboot:sitesubtitle}"
            },
            "rules": []
        },
        "7": {
            "default": {
                "title": "{filter:ext_citys} {filter:ext_voltages} {filter:ext_types} {filter:ext_applications} {sort:subname} manufacturer phone number and price - {pboot:sitesubtitle}",
                "keywords": "{filter:ext_citys} {sort:subname} manufacturer,{filter:ext_voltages} {sort:subname},{filter:ext_types}{sort:subname},{filter:ext_voltages} {filter:ext_types} {sort:subname},{filter:ext_applications} {sort:subname}",
                "description": "{filter:ext_citys} WishPower {filter:ext_voltages} {filter:ext_types} {filter:ext_applications} {sort:subname}, designed for power transmission and distribution systems with reliable insulation performance, high mechanical strength, weather resistance, and long service life."
            },
            "rules": []
        }
    }
}',
);