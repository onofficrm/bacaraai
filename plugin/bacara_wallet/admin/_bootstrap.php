<?php
$sub_menu = '200950';
if (!defined('G5_IS_ADMIN')) {
    define('G5_IS_ADMIN', true);
}

require_once dirname(__FILE__) . '/../../../common.php';

if ($is_admin !== 'super') {
    alert('최고관리자만 접근할 수 있습니다.', G5_URL);
}

include_once G5_LIB_PATH . '/bacara-wallet.lib.php';
bacara_wallet_install_tables();

if (!function_exists('bacara_wallet_admin_url')) {
    function bacara_wallet_admin_url($file = 'index.php', $query = array())
    {
        $url = G5_PLUGIN_URL . '/bacara_wallet/admin/' . ltrim($file, '/');
        if (!empty($query)) {
            $url .= '?' . http_build_query($query);
        }
        return $url;
    }
}

if (!function_exists('bacara_wallet_admin_nav')) {
    function bacara_wallet_admin_nav($active = 'list')
    {
        $items = array(
            'list'   => array('index.php', '회원·머니 목록'),
            'create' => array('form.php', '회원 생성'),
            'charge' => array('charge.php', '머니 충전'),
            'log'    => array('log.php', '충전 내역'),
        );

        echo '<nav class="bw-tabs" aria-label="가상머니 관리 메뉴">';
        foreach ($items as $key => $item) {
            $cls = $active === $key ? ' is-active' : '';
            echo '<a class="' . trim($cls) . '" href="' . htmlspecialchars(bacara_wallet_admin_url($item[0]), ENT_QUOTES, 'UTF-8') . '">';
            echo htmlspecialchars($item[1], ENT_QUOTES, 'UTF-8');
            echo '</a>';
        }
        echo '</nav>';
    }
}

add_stylesheet('<link rel="stylesheet" href="' . G5_PLUGIN_URL . '/bacara_wallet/admin/style.css">', 10);
