<?php

// apps/api/route.php

use app\api\controller\IndexNowController;  // 引入控制器类

return [
    // 配置路由，将路径 'indexnow/submitUpdatedUrls' 映射到 IndexNowController 控制器的 submitUpdatedUrls 方法
    'indexnow/submitUpdatedUrls' => 'api/indexnow/submitUpdatedUrls',  
];
