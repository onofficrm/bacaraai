<?php
/**
 * 바카라 AI 도우미 — 가상머니 관리 + 공개 회원가입 차단
 */
if (!defined('_GNUBOARD_')) {
    exit;
}

if (is_file(G5_LIB_PATH . '/bacara-wallet.lib.php')) {
    include_once G5_LIB_PATH . '/bacara-wallet.lib.php';
}
if (is_file(G5_LIB_PATH . '/bacara-ai-config.lib.php')) {
    include_once G5_LIB_PATH . '/bacara-ai-config.lib.php';
}
if (is_file(G5_LIB_PATH . '/bacara-ai-analyze.lib.php')) {
    include_once G5_LIB_PATH . '/bacara-ai-analyze.lib.php';
}
if (is_file(G5_LIB_PATH . '/bacara-ai-usage.lib.php')) {
    include_once G5_LIB_PATH . '/bacara-ai-usage.lib.php';
}

if (!function_exists('bacara_wallet_admin_menu')) {
    function bacara_wallet_admin_menu($admin_menu)
    {
        if (!is_array($admin_menu)) {
            $admin_menu = array();
        }
        if (!isset($admin_menu['menu200']) || !is_array($admin_menu['menu200'])) {
            $admin_menu['menu200'] = array();
        }

        $admin_menu['menu200'][] = array(
            '200950',
            '가상머니 관리',
            G5_PLUGIN_URL . '/bacara_wallet/admin/index.php',
            'bacara_wallet',
        );
        $admin_menu['menu200'][] = array(
            '200960',
            'AI API 설정',
            G5_PLUGIN_URL . '/bacara_wallet/admin/ai_keys.php',
            'bacara_ai_keys',
        );
        $admin_menu['menu200'][] = array(
            '200970',
            'AI API 요금',
            G5_PLUGIN_URL . '/bacara_wallet/admin/ai_usage.php',
            'bacara_ai_usage',
        );

        return $admin_menu;
    }
}

if (function_exists('add_replace')) {
    add_replace('admin_menu', 'bacara_wallet_admin_menu', 25, 1);
}

if (!function_exists('bacara_block_public_register')) {
    /**
     * 공개 회원가입 차단 — 최고관리자 생성만 허용
     * 정보수정(register_form.php?w=u)은 허용
     */
    function bacara_block_public_register()
    {
        if (defined('G5_IS_ADMIN') && G5_IS_ADMIN) {
            return;
        }

        $script = isset($_SERVER['SCRIPT_NAME']) ? basename($_SERVER['SCRIPT_NAME']) : '';
        if ($script === '') {
            return;
        }

        $blocked = array('register.php', 'register_form.php', 'register_form_update.php', 'register_result.php');
        if (!in_array($script, $blocked, true)) {
            return;
        }

        // 회원 정보수정 허용
        $w = '';
        if (isset($_POST['w'])) {
            $w = (string) $_POST['w'];
        } elseif (isset($_GET['w'])) {
            $w = (string) $_GET['w'];
        }

        if (($script === 'register_form.php' || $script === 'register_form_update.php') && $w === 'u') {
            return;
        }

        $login = defined('G5_BBS_URL') ? G5_BBS_URL . '/login.php' : '/bbs/login.php';
        if (function_exists('alert')) {
            alert('회원가입은 관리자를 통해서만 가능합니다. 계정 발급은 문의로 요청해 주세요.', $login);
        }

        header('Location: ' . $login);
        exit;
    }
}

if (function_exists('add_event')) {
    add_event('common_header', 'bacara_block_public_register', 1, 0);
}

if (function_exists('add_event') && function_exists('bacara_wallet_install_tables')) {
    add_event('common_header', 'bacara_wallet_install_tables', 5, 0);
}
if (function_exists('add_event') && function_exists('bacara_ai_install_tables')) {
    add_event('common_header', 'bacara_ai_install_tables', 6, 0);
}
if (function_exists('add_event') && function_exists('bacara_ai_usage_install_tables')) {
    add_event('common_header', 'bacara_ai_usage_install_tables', 7, 0);
}
