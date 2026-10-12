# 디자인 앱 현재 소스

현재 버전: **0.2.27 d21 / versionCode 30**.

- `source/android-app`: Android 디자인 앱 소스.
- `source/app`, `source/assets`: 로컬 웹 소스와 공유 자산.
- `tests`: 버전별 자동 검사 코드.
- 작업 정리: `../docs/current/work-summary-2026-10-12.md`.
- APK와 이미지·검증 결과·백업은 상위 Photo Picker 작업 폴더의 `design-preview/releases`, `design-preview/verification`에 보존. Git에 포함하지 않음.

기존 운영 소스인 저장소 최상위 `android-app`, `app`, `assets`는 별도로 유지한다. 이 소스 추가는 원격 Push·공개 배포를 뜻하지 않는다.

다른 PC에서는 JDK 17·Android SDK를 준비하고 개인 `local.properties`를 설정한다. 서명키를 Git에 넣지 않는다. 이 디렉터리는 작업 종료 시점의 소스 스냅샷이며 실제 작업 기준은 상위 작업 폴더의 `design-preview/source`다.
