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

## AI 분석 · 자동 베팅
- API: `/plugin/bacara_wallet/api/ai_analyze.php?table_name=MD2729`
- GPT·Claude·Gemini **병렬** 분석 후 예측 저장 (`g5_bacara_ai_prediction`)
- 화면 추천: 2/3 · 신뢰도 55%+ · 표본 20+ · 격차 8%+
- **자동 베팅**: 관리자 「AI 자동 베팅」ON + 3키 정상 + 2/3 · 65% · 표본 30+ · 격차 10%+
- 세션이 **라이브**이고 전략이 **AI 추천대로**일 때만 실제 베팅

## DB
- `g5_bacara_wallet` — 잔액
- `g5_bacara_wallet_log` — 변동 로그

그누보드 포인트(`mb_point`)와 분리되어 있습니다.
