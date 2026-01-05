# 같이보기 타이머 (Watch Together Timer) Extension

**동영상 송출이 제한된 환경에서 같이보기를 위한 재생 시간 동기화 도구(Chrome Extension)입니다.**

> [!NOTE]
> 이 저장소는 **같이보기 타이머 Chrome 확장프로그램의 TypeScript 소스 코드만** 포함합니다.  
> Chrome Web Store에는 **빌드(최소화)된 산출물(dist)** 을 업로드하며, 이 저장소는 소스 중심으로 유지됩니다.

📄 **Other languages**
- [🇺🇸 English README](../README.md)

---

## 개요 (Overview)

같이보기 타이머는 **Manifest V3** 기반의 가벼운 Chrome 확장프로그램으로,  
화면에 재생 시간이 노출되지 않거나 송출이 제한된 상황에서 **같이보기 시간 동기화**를 돕기 위해 설계되었습니다.

- **Content Script**가 **모든 프레임(all frames)** 에서 `<video>` 요소의 재생 정보를 추출합니다.
- **Background Service Worker**가 각 프레임의 상태를 수집한 뒤, 가장 그럴듯한 “메인” 미디어 소스를 선택하고  
  **마지막 정상 값(last-known-good)** 을 캐시합니다.
- **Timer Popup**은 1초마다 폴링하며, 감지가 일시적으로 실패하더라도 캐시된 값(stale)을 보여줘  
  UI가 깜빡이지 않도록 동작합니다.

---

## 기능 (Features)

- 팝업에서 **현재 시간 / 전체 시간** 표시
- **iframe 환경 지원** (`all_frames: true`)
- 여러 후보 중 가장 그럴듯한 “메인” 미디어를 휴리스틱으로 선택
- 감지 실패 시에도 표시를 유지하는 **stale 캐시 fallback**
- 클라이언트 단독 동작 (백엔드 불필요)

---

## 저장소 범위 (Scope of This Repository)

이 저장소에 포함된 항목:

- Chrome Extension (Manifest V3) TypeScript 소스 코드
- Background service worker (`src/background.ts`)
- Content script (`src/content.ts`)
- Timer popup UI (`src/timer.html`, `src/timer.ts`, `src/timer.css`)
- 단위 테스트 (Vitest + `chrome` mock)

이 저장소에 포함되지 않은 항목:

- 서버 구성 요소(백엔드 API, DB, 웹 서비스 등)
- Chrome Web Store 패키징 산출물(스토어 업로드는 빌드/최소화된 결과물 기반)

---

## 권한 (Permissions)

확장프로그램은 다음 권한을 사용합니다:

- `tabs` — 대상 탭 식별 및 조회
- `storage` — 세션 범위 상태 저장(팝업 window id, target tab id, 마지막 정상 시간)
- `webNavigation` — 대상 탭의 프레임 목록 조회
- `scripting` — 이미 열린 탭/프레임에도 content script를 강제 주입

---

## 프로젝트 구조 (Project Structure)

```text
.
├─ src/
│  ├─ background.ts
│  ├─ content.ts
│  ├─ timer.html
│  ├─ timer.ts
│  ├─ timer.css
│  └─ types/
│     ├─ messages.ts
│     └─ playback.ts
├─ public/                         # Icons
├─ scripts/
│  └─ copy-extension-assets.mjs    # Copies manifest/icons/html/css into dist
├─ tests/
│  ├─ chromeMock.ts
│  ├─ vitest.setup.ts
│  └─ *.test.ts
├─ manifest.json
├─ tsup.config.ts
└─ vitest.config.ts
```

---

## 빌드 (Build)

이 저장소는 **tsup**으로 번들링합니다.

```bash
npm install
npm run build
```

빌드 결과는 다음 경로에 생성됩니다:

```text
dist/extension/
```

---

## 테스트 (Testing)

테스트는 **Vitest**와 경량 `chrome` mock으로 실행됩니다.

```bash
npm run test
npm run coverage
```

CI는 GitHub Actions로 push/PR마다 실행됩니다. (`.github/workflows/ci.yml`)

---

## 설치 (Unpacked)

1. 확장프로그램을 빌드합니다.

   ```bash
   npm run build
   ```

2. `chrome://extensions` 접속
3. **Developer mode** 활성화
4. **Load unpacked** 클릭
5. 다음 폴더 선택:

   ```text
   dist/extension/
   ```

---

## Chrome Web Store

Chrome Web Store에는 **빌드/최소화된 산출물(dist)** 을 업로드합니다.  
이 저장소는 리뷰/개발을 위한 **소스 중심**으로 유지됩니다.

> https://chromewebstore.google.com/detail/fdpkgdifpopbchlcdjomlbpdoilkkpbn

---

## 라이선스 (License)

MIT License  
© selentia
