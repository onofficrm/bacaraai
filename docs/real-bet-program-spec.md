# 3차 프로그램(실베팅) 개발 요청서 (개정본)

> 대상: 가상PC에서 카지노 화면에 실제 베팅을 수행하는 프로그램 개발자  
> 작성 기준: 2차 프로그램(bacaraai_system) · `plugin/bacara_wallet` · 감지 DB 코드 구조 대조 후 개정  
> 상태: 개발 착수 전 합의용 명세

---

## 0. 핵심 원칙 (반드시 숙지)

### 0.1 레이어 분리 — 내부 지갑 ≠ 카지노 실베팅

| 레이어 | 역할 | 현재 테이블/경로 | 본 요청서 범위 |
|--------|------|------------------|----------------|
| **감지(1차)** | 결과·상태 수집 | `bacaraai`, `game_status` | 참조만 |
| **2차 UI/분석** | AI·패턴·자동판단, 주문 생성 | React + G5 API | 주문 생성 주체 |
| **내부 지갑** | 플랫폼 가상머니 place/settle | `g5_bacara_wallet*` | **실베팅 주문이 아님. 오용 금지** |
| **실베팅(3차)** | 카지노 UI에 칩 올리기 | **신규** `bet_orders` 등 | **본 문서의 전부** |

- `g5_bacara_wallet_bet` 의 `pending → settled/cancelled` 는 **가상잔액 원장**입니다.
- 3차의 `SUCCESS` 는 **“카지노 화면에 베팅이 접수된 것이 확인됨”** 이지, 게임 승패(W/L)나 내부 지갑 정산 완료가 아닙니다.
- 승패 정산은 이후 감지 결과(`bacaraai`)로 **별도** 처리합니다. (2차/내부 원장 정책에 따름)

### 0.2 전체 흐름

```
2차: 조건 통과 → bet_orders(PENDING) 생성a
  → 3차: claim(lease) → PROCESSING
  → 사전점검 통과 시 카지노 UI 베팅
  → SUBMITTED → (내역/잔액/성공메시지 확인) → SUCCESS | FAILED
  → 2차: 주문 상태 폴링/조회 반영
  → (별도) 라운드 결과 확정 후 승패 기록
```

### 0.3 2차 선행 작업 (3차 착수 전제)

아래가 **서버 DB에 존재·갱신**되기 전에는, 3차가 “사용자 설정 조건”을 신뢰할 수 없습니다.

1. `auto_betting_settings` / `betting_limits` 서버 저장 (현재는 브라우저 localStorage)
2. `bet_orders` 등 실베팅 테이블 생성
3. (권장) `casino_account_links` — `mb_id` ↔ 카지노 세션/계정 메타
4. 주문 claim·결과 API 또는 공유 DB 접근 권한

---

## 1. 베팅 실행 방식

두 모드를 **모두** 지원합니다. 주문에 모드·출처를 반드시 기록합니다.

### 1.1 자동베팅 (AUTO)

* 사용자가 2차에서 **자동베팅 ON** 인 경우에만 주문 생성
* AI 또는 패턴 전략이 허용한 대상·금액으로 주문
* 서버에 저장된 최소·최대 베팅, 윈컷, 로스컷, 자금관리 조건을 만족할 때만 생성
* 불만족 시 **주문을 만들지 않거나** `CANCELLED`/`FAILED` + 사유 기록 (2차 책임 우선)
* **AI 자동 대상은 PLAYER / BANKER 만** (TIE 자동 금지). TIE는 직접 베팅만 허용

### 1.2 직접 베팅 (MANUAL)

* 사용자가 PLAYER / BANKER / TIE 직접 선택
* AI 추천금액을 기본값으로 표시, 금액 수정 가능
* 베팅 버튼 클릭 시 `bet_orders` 생성 → 3차 실행

### 1.3 주문 구분 필드

| 필드 | 값 | 비고 |
|------|-----|------|
| `execution_mode` | `AUTO` / `MANUAL` | 기존 내부 원장 `source=auto\|manual` 과 매핑 |
| `bet_source` | `AI_RECOMMENDATION` / `PATTERN` / `USER_DIRECT` | |
| `auto_bet_enabled_snapshot` | `0`/`1` | 주문 생성 시점의 자동 ON 여부 스냅샷 |
| `user_modified` | `0`/`1` | 추천 대상·금액 중 하나라도 사용자가 바꿨으면 1 |

---

## 2. 2차 → 3차로 전달할 주문 정보

| 항목 | 컬럼 예시 | 비고 |
|------|-----------|------|
| 주문 고유번호 | `order_uuid` | UUID, **UNIQUE** |
| 사용자 ID | `mb_id` | G5 회원 ID |
| 카지노/업체 코드 | `casino_code` | 사이트 구분 |
| 테이블 코드 | `table_code` | **항상 `MD2729` 형태로 정규화** (`TABLE1(MD2729)` 금지) |
| 게임 회차 | `game_no` | 슈 내 회차(참고용). **단독 중복키 금지** |
| 슈 식별 | `shoe_token` | 가능하면 포함 |
| 결과 기준점 | `baseline_result_id` | 주문 시점 마지막 `bacaraai.id`. **중복 방지·라운드 매칭 핵심** |
| 베팅 대상 | `side` | `PLAYER` / `BANKER` / `TIE` |
| 베팅금액 | `amount` | 정수. 최소 단위는 합의값(현 UI 관례 1000) |
| 화폐 | `currency` | 기본 `KRW` (칩/원 동일 스케일이면 명시) |
| 전략/규칙 | `strategy_id` / `prediction_id` | 패턴 ID 또는 `g5_bacara_ai_prediction.id` |
| AI 추천 여부·값 | `ai_side`, `ai_amount` | 스냅샷 |
| 최종 선택 | `side`, `amount` | 실제 주문 값 |
| 요청시간 | `created_at` | |
| 만료시간 | `expires_at` | 라이브 베팅 윈도우와 동기화 (마감 N초 전) |
| 선호 실행 기기 | `preferred_device_id` | 라우팅용. 없으면 세션 바인딩 규칙 따름 |

---

## 3. 베팅 처리 상태

| 상태 | 의미 |
|------|------|
| `PENDING` | 실행 대기 (claim 가능) |
| `PROCESSING` | 3차가 lease 점유 후 처리 중 |
| `SUBMITTED` | 게임 화면에 베팅 입력 완료 (아직 성공 미확인) |
| `SUCCESS` | **베팅내역·잔액변경·성공메시지 등으로 접수 확인** |
| `FAILED` | 실패 (재시도 정책은 별도) |
| `CANCELLED` | 사용자/시스템 취소 |
| `EXPIRED` | `expires_at` 초과 또는 베팅창 마감 |
| `DUPLICATE` | 중복으로 실행하지 않음 |

### 3.1 SUCCESS 판정 (필수)

버튼을 클릭했다고 `SUCCESS`로 올리지 **않습니다**.  
다음 중 **1개 이상**을 확인한 뒤에만 `SUCCESS`로 전이합니다.

* 카지노 화면의 베팅내역에 해당 라운드·사이드·금액 반영
* 잔액이 요청 금액만큼 감소
* 공식 성공 메시지/토스트

확인 방식은 `confirm_method` 에 기록: `BET_HISTORY` / `BALANCE_DELTA` / `SUCCESS_TOAST` / `COMBINED`

### 3.2 SUCCESS ≠ 승패

* `SUCCESS` = 칩 접수 성공
* 승패(`outcome`: `W`/`L`/`P` 등)는 **별도 필드·별도 시점** (감지 결과 확정 후)
* 요청서·DB에서 두 개념을 섞지 말 것

### 3.3 중복 방지

**A. 주문 단위**

* `order_uuid` UNIQUE  
* 동일 UUID를 여러 번 받아도 **실베팅은 1회만** (이미 `SUBMITTED`/`SUCCESS`면 스킵)

**B. 라운드 단위 (권장 UNIQUE / 부분 유니크)**

```
(mb_id, casino_code, table_code, baseline_result_id)
```

* `game_no` 단독은 슈 리셋으로 재사용되므로 **중복키로 쓰지 않음**
* 같은 기준점에서 이미 유효 주문(`PENDING`~`SUCCESS`)이 있으면 신규는 `DUPLICATE` 또는 INSERT 거부

**C. Claim lease (다중 가상PC 필수)**

```
UPDATE bet_orders
   SET status='PROCESSING',
       claimed_by_device_id=?,
       lease_until=NOW()+INTERVAL N SECOND,
       claimed_at=NOW()
 WHERE order_uuid=? AND status='PENDING'
   AND (lease_until IS NULL OR lease_until < NOW())
```

* lease 만료 시 `PENDING` 복귀 허용 (또는 워커가 회수)
* 한 주문을 두 기기가 동시에 가져가지 못하도록 **원자적 claim**

---

## 4. 실제 베팅 전 확인 조건

조건을 하나라도 만족하지 않으면 **베팅하지 않고** `FAILED`(또는 `EXPIRED`) + `fail_code` / `fail_message` 를 기록·반환합니다.

### 4.1 점검 목록

| 점검 | 실패코드 예시 |
|------|----------------|
| 카지노 로그인 유지 | `SESSION_EXPIRED` |
| 실행 기기·브라우저 연결 | `DEVICE_OFFLINE` |
| 테이블 오픈 여부 | `TABLE_CLOSED` |
| 화면 테이블 코드 = 주문 | `TABLE_MISMATCH` |
| 화면 라운드 = 주문(`baseline`/`game_no`) | `ROUND_MISMATCH` |
| 베팅 가능 시간·마감 여유 | `BETTING_CLOSED` |
| 카지노 보유금액 부족 | `INSUFFICIENT_BALANCE` |
| 테이블 min/max | `LIMIT_EXCEEDED` |
| 사용자 윈컷/로스컷/maxBet (서버 설정) | `LIMIT_EXCEEDED` / `RISK_BLOCKED` |
| 동일 baseline 기처리 주문 | `DUPLICATE_ORDER` |
| 접수 확인 실패 | `BET_CONFIRMATION_FAILED` |
| **감지 상태 stop** | `DETECTOR_STOPPED` |
| **감지 상태 shuffle** | `SHUFFLE_ACTIVE` |
| **관리자 수동 피드 모드** | `MANUAL_FEED` |
| 자동인데 TIE | `SIDE_NOT_ALLOWED` |

### 4.2 `game_status` 조회 (2차와 동일 기준)

```sql
SELECT status FROM game_status
 WHERE account = '{계정}' AND table_name = '{테이블코드}'
```

* 허용: `game`
* 거부: `stop`, `shuffle`, 그 외/`unknown`

---

## 5. 베팅 결과 기록

시도·성공·실패 **모두** `bet_executions` (+ 필요 시 `bet_errors`)에 남깁니다.

필수 기록 항목:

* `order_uuid`, `mb_id`, `table_code`, `baseline_result_id`, `game_no`
* `execution_mode`, `bet_source`
* AI 추천 대상·금액 / 사용자 최종 대상·금액
* 요청 금액 / **실제 베팅된 금액**
* 실행 시작 · 입력 시각 · 완료 시각
* `status`, `fail_code`, `fail_message`
* 베팅 전·후 **카지노** 잔액
* 게임사 베팅번호(있으면)
* `confirm_method`
* `device_id`
* 스크린샷 경로 (성공 직후 · 실패 시점만. 전 과정 영상 저장 금지)
* 보존기간·잔액 등 PII 마스킹 정책은 운영과 합의

---

## 6. DB 구조

### 6.1 현재 사용 중 (코드 기준, 참고)

**감지 DB**

| 테이블 | 역할 |
|--------|------|
| `bacaraai` | 결과 누적: `id`, `account`, `table_name`, `game_no`, `result`, `detected_at` |
| `game_status` | `stop` / `game` / `shuffle` |

**G5 앱 DB**

| 테이블 | 역할 |
|--------|------|
| `g5_bacara_wallet` | 가상 잔액 |
| `g5_bacara_wallet_bet` | **내부** 베팅 원장 (`place_key`, `source`, `baseline_result_id`…) |
| `g5_bacara_wallet_log` | 잔액 변동 로그 |
| `g5_bacara_ai_prediction` | AI 분석·추천 |
| `g5_bacara_ai_usage` | AI 토큰/비용 |
| `g5_bacara_live_table` / `_result` / `_audit` | 관리자 수동 모드 |

**클라이언트만 (서버 테이블 없음 → 이전 필요)**

* 윈컷, 로스컷, maxBet, 전략, 패턴, 자동 세션 ON 등 → `localStorage`

**없음 → 본 요청으로 신설**

* 실베팅 주문/실행/기기/세션/서버 자동설정

### 6.2 식별자 규칙

| 개념 | 저장 방식 |
|------|-----------|
| 테이블 | `MD2729` 등 정규화 코드 |
| 회차 | `game_no` (슈 내). 유니크키에는 `baseline_result_id` 사용 |
| 사용자 | `mb_id` |
| 카지노 계정 | **현재 미연결** → `casino_account_links` 신설 |

### 6.3 신설 테이블 (기존 테이블 직접 개조 지양)

#### `bet_orders` — 2차가 넣는 실베팅 명령

* `order_uuid` VARCHAR(36) **UNIQUE**
* `mb_id`, `casino_code`, `table_code`
* `baseline_result_id`, `game_no`, `shoe_token`
* `side`, `amount`, `currency`
* `execution_mode`, `bet_source`, `auto_bet_enabled_snapshot`, `user_modified`
* `ai_side`, `ai_amount`, `strategy_id`, `prediction_id`
* `status`, `fail_code`, `fail_message`
* `preferred_device_id`, `claimed_by_device_id`, `lease_until`, `claimed_at`
* `expires_at`, `created_at`, `updated_at`
* UNIQUE 권장: `(mb_id, casino_code, table_code, baseline_result_id)`  
  (취소·만료만 재주문 허용 시 부분 유니크 또는 상태 조건으로 구현)

#### `bet_executions` — 3차 실행 시도(1주문 N시도 가능)

* `id`, `order_uuid`, `attempt_no`
* 실행 시각, 실베팅 금액, 전후 잔액, confirm 정보, screenshot_path, device_id, status

#### `bet_errors` — 실패·오류 상세

* `order_uuid`, `execution_id`, `fail_code`, `fail_message`, `detail_json`, `created_at`

#### `betting_devices` — 가상PC·브라우저·프로그램

* `device_id`, `name`, `api_key_hash`, `last_seen_at`, `status`

#### `betting_sessions` — 카지노 로그인·테이블 접속

* `session_id`, `device_id`, `mb_id`, `casino_code`, `table_code`
* 세션 유효 여부, **비밀번호 평문 저장 금지** (브라우저 프로필/암호화 토큰만)
* `heartbeat_at`

#### `casino_account_links` — 회원↔카지노 매핑

* `mb_id`, `casino_code`, `external_label`, `encrypted_meta` (필요 시), `preferred_device_id`

#### `auto_betting_settings` — 사용자별 자동베팅 (2차가 기록)

* `mb_id`, `enabled`, `strategy`, 패턴/AI 범위 등

#### `betting_limits` — 자금·컷

* `mb_id`, `min_bet`, `max_bet`, `win_cut`, `loss_cut`, `max_consecutive_auto_losses` 등

> 내부 지갑 `g5_bacara_wallet_bet` 는 **유지**. 필요 시 `bet_orders.order_uuid` 를 선택적 FK/참조로만 연결.

---

## 7. 세션 및 계정 보안

* 카지노 ID/PW **평문 DB 저장 금지**
* 가능하면 **로그인된 브라우저 프로필/세션** 재사용
* 저장이 불가피하면 암호화 + 키는 DB 밖
* 세션 만료·로그아웃 시 베팅 금지 → `SESSION_EXPIRED`, 2차에 **재연결 필요** 상태 전달
* 3차 API 인증: **기기 API 키** (회원 웹 세션과 분리)

---

## 8. API · 전달 · 반환 계약

가상PC 환경을 고려해 **1순위: 공유 DB + claim**, **2순위: HTTP API** (동일 의미).

### 8.1 권장 HTTP (예시 경로, 구현 시 `/plugin/bacara_wallet/api/…` 하위로 확정)

| 주체 | 메서드 | 용도 |
|------|--------|------|
| 2차 | `POST /real-bet/orders` | 주문 생성 → `order_uuid` |
| 3차 | `POST /real-bet/orders/claim` | PENDING 1건 원자적 점유 |
| 3차 | `PATCH /real-bet/orders/{uuid}` | 상태 전이 (`PROCESSING`→`SUBMITTED`→…) |
| 3차 | `POST /real-bet/orders/{uuid}/result` | 최종 결과·잔액·confirm·스크린샷 메타 |
| 2차 | `GET /real-bet/orders/{uuid}` | 상태 폴링 |
| 3차 | `POST /real-bet/devices/heartbeat` | 기기·세션 생존 |

### 8.2 주문 전달 방식

1. 2차가 조건 통과 후 `bet_orders` INSERT (`PENDING`, `expires_at` 설정)
2. 3차 루프: claim → 점검 → 실행 → result 기록
3. 만료·lease 회수는 2차 ops 워커 또는 3차 공통 워커

### 8.3 결과 반환 방식

* 3차가 `status` + `fail_code` + 잔액·confirm·execution row 갱신
* 2차는 폴링(또는 짧은 주기 refresh)으로 UI 반영
* 웹훅은 선택

### 8.4 중복 베팅 방지 요약

1. `order_uuid` UNIQUE + 상태 머신 재진입 가드  
2. `(mb_id, casino_code, table_code, baseline_result_id)` 유니크  
3. atomic claim + lease  
4. 동일 UUID 재처리 시 no-op

### 8.5 성공 확인 방식

§3.1 참고. 스크린샷은 성공 직후·실패 시점만.

### 8.6 다중 사용자·다중 테이블

* `betting_sessions`: 권장 **device ↔ (mb_id, table_code) 1:1 바인딩**
* claim 시 `preferred_device_id` 또는 세션에 바인딩된 테이블 주문만 가져감
* 기기당 동시에 처리 중인 주문 수 상한(기본 1) 권장

---

## 9. 개발 착수 전 체크리스트

- [ ] 2차가 `auto_betting_settings` / `betting_limits` 서버 기록
- [ ] `bet_orders` 등 DDL 합의·생성
- [ ] `casino_account_links` + 세션 보안 방식 합의
- [ ] claim/lease 초(N) · expires 와 베팅 윈도우 동기화 합의
- [ ] 내부 지갑과 실베팅 연동 여부(완전 분리 vs 성공 후 내부 place) 결정
- [ ] 실패코드 목록 고정
- [ ] 테스트: 중복 claim, lease 만료, shuffle/stop, 잔액 부족, 성공확인 실패

---

## 10. 용어 매핑

| 본 문서 | 기존 2차(내부) |
|---------|----------------|
| `execution_mode=AUTO` | `source=auto` |
| `execution_mode=MANUAL` | `source=manual` |
| `baseline_result_id` | 동일 개념 (내부 원장과 공유 가능) |
| `table_code` | `table_name` / `gameCode` 정규화값 |
| `mb_id` | 로그인 회원 |

---

## 변경 요약 (초안 대비 개정 포인트)

1. 내부 지갑과 실베팅 레이어 분리  
2. 중복키: `game_no` → `baseline_result_id` 중심  
3. 설정 서버화 = 2차 선행 작업  
4. PROCESSING lease/claim 명세  
5. `game_status`·수동모드 실패코드  
6. 카지노 계정 링크 테이블  
7. SUCCESS와 승패 분리  
8. API/공유DB 계약·멀티기기 라우팅 명시  
9. AI 자동 TIE 금지  
10. 화폐·만료·스크린샷 보존 정책 명시  
|
