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

## AI 섀도 분석
- API: `/plugin/bacara_wallet/api/ai_analyze.php?table_name=MD2729`
- 새 게임 결과마다 GPT·Claude·Gemini 분석 후 예측 저장
- 테이블: `g5_bacara_ai_prediction` (적중 여부 자동 정산)
- 현재는 **섀도 모드** — 화면 표시·기록만, 자동 베팅 미연결

## DB
- `g5_bacara_wallet` — 잔액
- `g5_bacara_wallet_log` — 변동 로그

그누보드 포인트(`mb_point`)와 분리되어 있습니다.
