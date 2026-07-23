# 가상머니 관리 (bacara_wallet)

최고관리자가 회원을 직접 생성하고, 가상 게임머니(시드)를 지급하는 모듈입니다.

## 기능
- 공개 회원가입 차단
- 회원 생성 (아이디·비밀번호 부여)
- 가상머니 충전 / 차감 / 잔액 설정
- 충전 내역 조회

## 관리자 메뉴
회원관리 → **가상머니 관리**  
회원관리 → **AI API 설정** (ChatGPT / Claude / Gemini 키)

URL: `/plugin/bacara_wallet/admin/index.php`  
AI API: `/plugin/bacara_wallet/admin/ai_keys.php`

설정 파일: `data/bacaraai-ai.config.php` (Git 제외)

## DB
- `g5_bacara_wallet` — 잔액
- `g5_bacara_wallet_log` — 변동 로그

그누보드 포인트(`mb_point`)와 분리되어 있습니다.
