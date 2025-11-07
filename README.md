# Gantry PLC Monitor

PLC 데이터 모니터링 및 제어 시스템 - Mitsubishi MC Protocol 3E Binary 통신 지원

## 프로젝트 구조

```
.
├── backend/          # NestJS 백엔드 API
├── frontend/         # React TypeScript 프론트엔드
└── .git/            # Git 저장소
```

## 기능

### Backend (NestJS)
- Mitsubishi PLC MC Protocol 3E Binary 통신
- 데이터 포인트 관리 (등록, 조회, 삭제)
- 자동 폴링 시스템
- SQLite 데이터베이스 저장
- Swagger API 문서
- 데이터 타입 지원:
  - **Number**: 워드 배열
  - **String**: ASCII 문자열
  - **Bool**: 비트 값 (0-15)

### Frontend (React)
- 데이터 포인트 등록 인터페이스
- 실시간 데이터 모니터링
- PLC 데이터 쓰기 기능
- 폴링 제어 (시작/중지/간격 조정)
- 반응형 UI

## 시작하기

### Prerequisites
- Node.js (v14 이상)
- Mitsubishi PLC (MC Protocol 3E Binary 지원)

### Backend 설정 및 실행

```bash
cd backend
npm install

# .env 파일 설정
# PLC_HOST=10.33.62.207
# PLC_PORT=5001

npm run build
npm start
```

백엔드는 http://localhost:3000 에서 실행됩니다.
Swagger UI: http://localhost:3000/api

### Frontend 설정 및 실행

```bash
cd frontend
npm install

# .env 파일은 이미 생성되어 있습니다
# REACT_APP_API_URL=http://localhost:3000

npm start
```

프론트엔드는 http://localhost:3001 에서 실행됩니다.

## API 엔드포인트

### Data Points
- `GET /plc/data-points` - 등록된 데이터 포인트 목록 조회
- `POST /plc/data-points` - 새 데이터 포인트 등록
- `DELETE /plc/data-points/:key` - 데이터 포인트 삭제

### Polling
- `GET /plc/polling/status` - 폴링 상태 조회
- `POST /plc/polling/start` - 폴링 시작
- `POST /plc/polling/stop` - 폴링 중지
- `POST /plc/polling/interval` - 폴링 간격 설정

### Data
- `GET /plc/data/:key` - 캐시된 데이터 읽기
- `POST /plc/data/:key` - PLC에 데이터 쓰기

자세한 API 문서는 Swagger UI (http://localhost:3000/api)에서 확인하세요.

Swagger UI에서 다음 작업이 가능합니다:
- 모든 API 엔드포인트 확인
- 각 API의 요청/응답 스키마 확인
- 브라우저에서 직접 API 테스트
- Request Body 예시 자동 생성

## API 사용법

### 주요 개선 사항

**사전 정의된 데이터 포인트 시스템**:
- 모든 PLC 주소는 `src/plc/config/data-points.config.ts`에 사전 정의됨
- Swagger UI에서 드롭다운으로 선택 가능
- 주소, 타입, 인코딩 등을 잘못 입력할 위험 제거

**통합 Write API**:
- 단일 엔드포인트 `/plc/write/:key`로 숫자/문자열 모두 처리
- PLC 쓰기 성공 시 자동으로 캐시도 업데이트

### 1. 데이터 포인트 목록 조회

```bash
# 사전 정의된 전체 목록 (등록 가능한 모든 항목)
curl http://localhost:3000/plc/data-points/available

# 현재 등록된 항목만 (실제 폴링 중인 데이터)
curl http://localhost:3000/plc/data-points/registered
```

**사전 정의된 데이터 포인트 (available):**
- `sensor_values`: D1000-D1009 (10개 워드, 숫자)
- `device_name`: D1010 (ASCII 문자열)
- `device_status`: D1030 (1개 워드, 숫자)
- `temperature`: D1040-D1043 (4개 워드, 숫자)
- `production_count`: D1050 (1개 워드, 숫자)
- `error_code`: D1060 (1개 워드, 숫자)
- `operator_name`: D1070 (UTF-16LE 문자열)
- `conveyor_speed`: D1100 (1개 워드, 숫자)

### 2. 데이터 포인트 등록

```bash
# 사전 정의된 키로 간단하게 등록
curl -X POST http://localhost:3000/plc/data-points/register \
  -H "Content-Type: application/json" \
  -d '{"key": "temperature"}'
```

Swagger UI에서는 `key` 드롭다운에서 선택하면 됩니다!

### 3. 폴링 시작

```bash
curl -X POST http://localhost:3000/plc/polling/start
```

### 4. 폴링 간격 설정 (기본 1000ms)

```bash
curl -X POST http://localhost:3000/plc/polling/interval \
  -H "Content-Type: application/json" \
  -d '{"intervalMs": 500}'
```

### 5. 캐시 데이터 조회

```bash
# 전체 캐시 조회
curl http://localhost:3000/plc/cache

# 특정 키 조회
curl http://localhost:3000/plc/cache/sensor_values
```

응답 예시:
```json
{
  "sensor_values": {
    "value": [41, 42, 43, 0, 0, 0, 0, 0, 0, 0],
    "timestamp": "2025-11-07T10:30:45.123Z"
  },
  "device_name": {
    "value": "GANTRY_01",
    "timestamp": "2025-11-07T10:30:45.124Z"
  }
}
```

### 6. PLC에 데이터 쓰기 (자동 캐시 업데이트)

```bash
# 숫자 배열 쓰기
curl -X POST http://localhost:3000/plc/write/temperature \
  -H "Content-Type: application/json" \
  -d '{"values": [25, 30, 35, 40]}'

# 문자열 쓰기
curl -X POST http://localhost:3000/plc/write/device_name \
  -H "Content-Type: application/json" \
  -d '{"value": "NEW_NAME"}'
```

**응답 예시** (PLC 쓰기 + 캐시 업데이트 완료):
```json
{
  "message": "Data written to temperature and cache updated",
  "cached": {
    "value": [25, 30, 35, 40],
    "timestamp": "2025-11-07T10:45:30.123Z"
  }
}
```

### 7. 실시간 읽기 (캐시 우회)

```bash
curl http://localhost:3000/plc/read/temperature
```

### 8. 상태 확인

```bash
curl http://localhost:3000/plc/status
```

응답:
```json
{
  "isPolling": true,
  "intervalMs": 1000,
  "registeredDataPoints": ["sensor_values", "device_name"]
}
```

### 9. 폴링 중지

```bash
curl -X POST http://localhost:3000/plc/polling/stop
```

### 10. 데이터 포인트 제거

```bash
curl -X DELETE http://localhost:3000/plc/data-points/temperature
```

### 11. 캐시 초기화

```bash
curl -X DELETE http://localhost:3000/plc/cache
```

## 프론트엔드 연동 예시

```javascript
// 주기적으로 캐시 데이터 조회
setInterval(async () => {
  const response = await fetch('http://localhost:3000/plc/cache');
  const data = await response.json();
  console.log('PLC Data:', data);
}, 1000);

// PLC에 값 쓰기
async function writeValue() {
  await fetch('http://localhost:3000/plc/write/sensor_values/numbers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ values: [123, 456, 789] })
  });
}
```

## 아키텍처

```
┌─────────────┐
│  Frontend   │
│  (Browser)  │
└──────┬──────┘
       │ REST API
       │ (GET /plc/cache)
       ▼
┌─────────────────────────────┐
│   NestJS Backend            │
│  ┌─────────────────────┐    │
│  │ PlcController       │    │
│  └──────────┬──────────┘    │
│             │                │
│  ┌──────────▼──────────┐    │
│  │ PlcPollingService   │    │
│  │ (Memory Cache)      │    │
│  └──────────┬──────────┘    │
│             │                │
│  ┌──────────▼──────────┐    │
│  │ McProtocolService   │    │
│  └──────────┬──────────┘    │
└─────────────┼───────────────┘
              │ MC Protocol
              │ (Binary)
              ▼
       ┌─────────────┐
       │ Mitsubishi  │
       │    PLC      │
       └─────────────┘
```

## 주요 파일

- `src/plc/mc-protocol.service.ts` - MC Protocol 통신 로직
- `src/plc/plc-polling.service.ts` - 폴링 및 캐시 관리
- `src/plc/plc.controller.ts` - REST API 엔드포인트
- `src/plc/plc.module.ts` - NestJS 모듈 설정
