# Context Architect 실제 유즈케이스 테스트 시나리오

## 목적
프로젝트의 실제 사용 흐름(플러그인 모드 및 CLI 도구) 기준으로 핵심 기능과 실패 케이스를 검증한다.

## 프로젝트 요약
- Claude Code 플러그인으로 프로젝트 컨텍스트 파일을 설계/감사/갱신한다.
- 모드는 CREATE, AUDIT, UPDATE 3가지이며, CLAUDE.md를 최소 인덱스로 유지하고 참조 문서로 분리한다.
- CLI 도구 3종을 제공한다: `ccs-score.mjs`, `detect-antipatterns.mjs`, `knowledge-probe.mjs`.

## 커버리지 요약

| 구분 | 시나리오 수 | 자동화 테스트 | 비고 |
|------|------------|--------------|------|
| 스킬 모드 (수동) | 3 | - | TC-01~03, Claude Code 세션에서 수동 검증 |
| CCS 계산 | 5 | 9 tests | TC-04~06, TC-15~16 |
| 안티패턴 탐지 | 7 | 14 tests | TC-07~10, TC-17~19 |
| 지식 프로브 | 2 | 7 tests | TC-11, TC-22 |
| CLI 통합 | 3 | 8 tests | TC-12~14 |
| 엣지 케이스 | 2 | 2 tests | TC-20~21 |
| **합계** | **22** | **38 tests** | |

---

## 스킬 모드 테스트 (수동 검증)

### TC-01 신규 프로젝트 설계 (CREATE 모드)
**검증 방법:** 수동 — Claude Code 세션에서 `/context-architect` 실행
**전제:** 프로젝트 루트에 `CLAUDE.md` 또는 `.claude/`가 없다.
**단계:**
1. README와 주요 설정 파일을 읽는다.
2. 2-레이어 구조(인덱스 + 레퍼런스 문서)를 설계한다.
3. 포함/제외 항목을 3가지 테스트(공개 지식/기본값/코드로 발견 가능)로 분류한다.
**기대 결과:**
- `CLAUDE.md`는 링크 중심의 최소 인덱스만 포함한다.
- 레퍼런스 문서 위치와 헤더-퍼스트 템플릿이 제안된다.
- 제외 항목과 이유가 함께 제시된다.
- 사용자 승인 전 파일을 생성하지 않는다.

### TC-02 기존 프로젝트 감사 (AUDIT 모드)
**검증 방법:** 수동 — Claude Code 세션에서 `/context-architect` 실행
**전제:** 프로젝트 루트에 `CLAUDE.md`가 존재한다.
**단계:**
1. 링크 기반으로 스코프를 확정한다.
2. 구조/문서/링크/지식 차이 4단계 분석을 수행한다.
3. CCS 점수와 위험 등급을 계산한다.
**기대 결과:**
- 구조적 과잉 스펙 및 링크 문제의 구체적 목록이 생성된다.
- CCS 점수와 등급이 보고된다.
- 수정 제안은 승인 전 적용하지 않는다.

### TC-03 변경 이후 동기화 (UPDATE 모드)
**검증 방법:** 수동 — Claude Code 세션에서 `/context-architect` 실행
**전제:** 프로젝트에 변경이 있었고 `CLAUDE.md`가 존재한다.
**단계:**
1. 변경 유형을 분류한다(기능 추가, 리팩터링, 의존성 변경 등).
2. 정적/동적 변경을 분리한다.
3. 링크 무결성 체크와 CCS 경량 점검을 실행한다.
**기대 결과:**
- 정적 변경만 컨텍스트에 반영된다.
- 링크 깨짐/고아 문서가 있으면 경고한다.
- CCS 악화 시 경고와 대응 권고가 제공된다.

---

## CCS 계산 테스트

### TC-04 CCS 계산 - 정상 프로젝트
**자동화:** `ccs-score.test.mjs` → "returns 0 for clean project"
**전제:** `tests/fixtures/clean-project` 사용.
**단계:**
1. `node tools/ccs-score.mjs tests/fixtures/clean-project` 실행.
**기대 결과:**
- `total`은 0.
- `rating`은 `Safe`.

### TC-05 CCS 계산 - 과잉 스펙 프로젝트
**자동화:** `ccs-score.test.mjs` → "detects monolith", "calculates High Over-Specification"
**전제:** `tests/fixtures/over-specified` 사용.
**단계:**
1. `node tools/ccs-score.mjs tests/fixtures/over-specified` 실행.
**기대 결과:**
- `total`이 6 이상.
- `rating`은 `High Over-Specification`.
- `factors`에 `monolith`, `role_mixing`, `index_content_leak` 등이 포함된다.

### TC-06 CCS 계산 - 링크 깨짐
**자동화:** `ccs-score.test.mjs` → "detects broken links"
**전제:** `tests/fixtures/broken-links` 사용.
**단계:**
1. `node tools/ccs-score.mjs tests/fixtures/broken-links` 실행.
**기대 결과:**
- `factors`에 `broken_link`가 2건 포함된다.

### TC-15 CCS 계산 - Risk 등급 (3-5)
**자동화:** `ccs-score.test.mjs` → "calculates Risk rating for moderate issues"
**전제:** `tests/fixtures/risk-project` 사용 (role_mixing +2, tool_forcing +2 = total 4).
**단계:**
1. `node tools/ccs-score.mjs tests/fixtures/risk-project` 실행.
**기대 결과:**
- `total`이 3~5 범위.
- `rating`은 `Risk`.

### TC-16 CCS 계산 - 고아 문서
**자동화:** `ccs-score.test.mjs` → "detects orphan docs"
**전제:** `tests/fixtures/over-specified` 사용.
**단계:**
1. `node tools/ccs-score.mjs tests/fixtures/over-specified` 실행.
**기대 결과:**
- `factors`에 `orphan_doc`가 최소 1건 포함된다.

---

## 안티패턴 탐지 테스트

### TC-07 구조 안티패턴 탐지 (structure) - 과잉 스펙
**자동화:** `detect-antipatterns.test.mjs` → phase: structure (5 tests)
**전제:** `tests/fixtures/over-specified` 사용.
**단계:**
1. `node tools/detect-antipatterns.mjs --phase structure --root tests/fixtures/over-specified` 실행.
**기대 결과:**
- `findings`에 `monolith`, `role_mixing`, `tool_forcing`, `index_content_leak`이 포함된다.

### TC-08 문서 안티패턴 탐지 (docs) - 정상
**자동화:** `detect-antipatterns.test.mjs` → phase: docs, clean project
**전제:** `tests/fixtures/clean-project` 사용.
**단계:**
1. `node tools/detect-antipatterns.mjs --phase docs --root tests/fixtures/clean-project` 실행.
**기대 결과:**
- `findings`가 빈 배열이다.

### TC-09 링크 안티패턴 탐지 (links) - 깨진 링크
**자동화:** `detect-antipatterns.test.mjs` → phase: links, broken links
**전제:** `tests/fixtures/broken-links` 사용.
**단계:**
1. `node tools/detect-antipatterns.mjs --phase links --root tests/fixtures/broken-links` 실행.
**기대 결과:**
- `findings`에 `broken_link`가 2건 포함된다.

### TC-10 고아 문서 탐지
**자동화:** `detect-antipatterns.test.mjs` → phase: links, orphan doc
**전제:** `tests/fixtures/over-specified` 사용.
**단계:**
1. `node tools/detect-antipatterns.mjs --phase links --root tests/fixtures/over-specified` 실행.
**기대 결과:**
- `findings`에 `orphan_doc`가 최소 1건 포함된다.

### TC-17 헤더 없는 문서 탐지
**자동화:** `detect-antipatterns.test.mjs` → "detects headerless doc"
**전제:** `tests/fixtures/headerless-doc` 사용 (docs/guide.md가 `#` 없이 시작).
**단계:**
1. `node tools/detect-antipatterns.mjs --phase docs --root tests/fixtures/headerless-doc` 실행.
**기대 결과:**
- `findings`에 `headerless_doc`가 포함된다.

### TC-18 비대 문서 탐지 (200줄+)
**자동화:** `detect-antipatterns.test.mjs` → "detects fat doc (200+ lines)"
**전제:** `tests/fixtures/fat-doc` 사용 (docs/api-reference.md가 220줄+).
**단계:**
1. `node tools/detect-antipatterns.mjs --phase docs --root tests/fixtures/fat-doc` 실행.
**기대 결과:**
- `findings`에 `fat_doc`가 포함된다.

### TC-19 디렉토리 덤프 탐지
**자동화:** `detect-antipatterns.test.mjs` → "detects directory dump"
**전제:** `tests/fixtures/over-specified` 사용 (CLAUDE.md에 트리 출력 포함).
**단계:**
1. `node tools/detect-antipatterns.mjs --phase structure --root tests/fixtures/over-specified` 실행.
**기대 결과:**
- `findings`에 `directory_dump`가 포함된다.

---

## 지식 프로브 테스트

### TC-11 지식 프로브 추출 (함수 단위)
**자동화:** `knowledge-probe.test.mjs` → extractStatements (4 tests), toProbeQuestions (3 tests)
**전제:** 마크다운 텍스트에 지시문(규칙, 관례)이 포함되어 있다.
**단계:**
1. `extractStatements(content)` 호출.
2. `toProbeQuestions(statements, context)` 호출.
**기대 결과:**
- 지시문이 추출된다 (헤딩, 코드 블록, 링크, 짧은 줄 제외).
- 각 지시문이 중립적 질문으로 변환된다 (`?`로 끝남).
- 원본 텍스트가 보존된다.

### TC-22 지식 프로브 CLI 통합
**자동화:** `cli.test.mjs` → "outputs valid JSON array with --extract"
**전제:** `tests/fixtures/over-specified` 사용.
**단계:**
1. `node tools/knowledge-probe.mjs --root tests/fixtures/over-specified --extract` 실행.
**기대 결과:**
- JSON 배열 형태의 `{ original, question }` 목록이 출력된다.
- 배열이 비어있지 않다.

---

## CLI 통합 테스트

### TC-12 지식 프로브 옵션 오류
**자동화:** `cli.test.mjs` → "requires --extract flag"
**전제:** 없음.
**단계:**
1. `node tools/knowledge-probe.mjs --root .` 실행 (`--extract` 누락).
**기대 결과:**
- exit code 2.
- stderr에 `--extract` 사용법이 포함된다.

### TC-13 안티패턴 탐지 옵션 오류
**자동화:** `cli.test.mjs` → "rejects invalid phase"
**전제:** 없음.
**단계:**
1. `node tools/detect-antipatterns.mjs --phase invalid --root .` 실행.
**기대 결과:**
- exit code 2.
- stderr에 유효한 phase 목록(`structure`, `docs`, `links`)이 포함된다.

### TC-14 CLAUDE.md 없는 디렉토리
**자동화:** `ccs-score.test.mjs` → "handles missing CLAUDE.md gracefully", `detect-antipatterns.test.mjs` → "handles missing CLAUDE.md gracefully", `cli.test.mjs` → "handles missing CLAUDE.md directory", "errors when CLAUDE.md not found"
**전제:** `CLAUDE.md`가 없는 임의 디렉터리 사용.
**단계:**
1. `node tools/ccs-score.mjs <no-claude-dir>` 실행.
2. `node tools/detect-antipatterns.mjs --phase structure --root <no-claude-dir>` 실행.
3. `node tools/knowledge-probe.mjs --root <no-claude-dir> --extract` 실행.
**기대 결과:**
- CCS는 `total: 0`, `rating: Safe`를 반환한다.
- 안티패턴 탐지는 빈 결과를 반환한다.
- knowledge-probe는 exit code 2로 종료한다.

---

## 엣지 케이스 테스트

### TC-20 빈 CLAUDE.md
**자동화:** `ccs-score.test.mjs` → "handles empty CLAUDE.md gracefully", `detect-antipatterns.test.mjs` → "handles empty CLAUDE.md"
**전제:** `tests/fixtures/empty-claude` 사용 (0바이트 CLAUDE.md).
**단계:**
1. `node tools/ccs-score.mjs tests/fixtures/empty-claude` 실행.
2. `node tools/detect-antipatterns.mjs --phase structure --root tests/fixtures/empty-claude` 실행.
**기대 결과:**
- CCS는 `total: 0`, `rating: Safe`.
- 안티패턴 탐지는 crash 없이 빈 결과를 반환한다.

### TC-21 CCS exit code
**자동화:** `cli.test.mjs` → "exits 1 for over-specified project"
**전제:** `tests/fixtures/over-specified` 사용.
**단계:**
1. `node tools/ccs-score.mjs tests/fixtures/over-specified` 실행.
**기대 결과:**
- exit code 1 (이슈 존재 시).
- stdout에 유효한 JSON이 출력된다.

---

## 픽스처 목록

| 픽스처 | CCS | 용도 |
|--------|-----|------|
| `tests/fixtures/clean-project` | 0 (Safe) | 정상 프로젝트 기준선 |
| `tests/fixtures/over-specified` | 10+ (High) | 다중 안티패턴 탐지 |
| `tests/fixtures/broken-links` | 4 (Risk) | 깨진 링크 탐지 |
| `tests/fixtures/risk-project` | 4 (Risk) | Risk 등급 경계값 |
| `tests/fixtures/headerless-doc` | - | 헤더 없는 문서 탐지 |
| `tests/fixtures/fat-doc` | - | 비대 문서(200줄+) 탐지 |
| `tests/fixtures/empty-claude` | 0 (Safe) | 빈 파일 엣지 케이스 |

## 실행 메모
- 테스트 실행: `npm test` 또는 `node --test 'tests/tools/*.test.mjs'`
- 전체 38 tests, 12 suites.
- TC-01~03 (스킬 모드)은 자동화 테스트 불가 — Claude Code 세션에서 수동 검증.
- 실제 플러그인 모드는 사용자 승인 전 파일 변경을 하지 않는 것이 핵심 검증 포인트다.
