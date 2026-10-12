# d6 오프닝 B 구현 — 2026-10-09

Photo Pick 디자인 테스트 0.2.12 / versionCode 15 / com.photopick.app.designpreview.

사용자가 선택한 B 렌즈 시그니처 구현: 무광 graphite 카메라 렌즈 접사 → 은은한 빛의 이동 → 카메라 전체와 Photo Pick·사진은 많이 선택은 가볍게 → 기존 화면. 정상 준비 후 약1.2초(1050ms+150ms 종료). 신규 3D 카메라 렌더 PNG와 CSS transform/opacity로 만든 2.5D 모션이며 실시간3D 모델 렌더링은 아닙니다.

앱 문서 시작 때1회, 앱 내 이동·파일 선택 복귀에는 반복 없음. 탭 또는 Esc 건너뛰기. reduced motion은 정적 카메라·로고로 빠르게 종료. 화면 숨김 시 즉시 정리. 이미지 오류/600ms 로드 지연은 정적 로고 fallback으로 종료하고 늦은 로드가 오프닝을 복구하지 않도록 보호. 종료 후 main aria-hidden/inert 원상복귀.

브라우저 오프닝 테스트와 d6 평가 상태 행렬 통과. 렌즈/빛/로고 장면 캡처, 자동종료, 스킵, reduced, 이미지실패/지연, main입력복구, 평가/초기화 상태와 작은화면 버튼배치 확인. 프리뷰 영상 opening-b-preview.webm. APK build/lint 및 서명검증, 웹 자산21개 소스 일치. 기존 lint 경고3개 유지. 운영소스61개·운영APK·d1~d5 APK 불변해시 확인.

실제 Android 기기 설치·GPU성능·시스템 splash와의 연결·햅틱·SD카드·갤러리저장 검증은 남아 있습니다. 브라우저 프리뷰는 Android 에뮬레이터가 아닙니다. 운영앱과 분리된 테스트앱이며 이전버전 APK/소스 압축본을 보존합니다.
