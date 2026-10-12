# 디자인 앱 자동 업데이트 — 2026-10-09

적용 버전: 0.2.18 / versionCode 21 / com.photopick.app.designpreview. 확정된 d11 화면과 오프닝은 유지하고 네이티브 업데이트 기능만 연결했습니다.

## 이용 방법

현재 0.2.17 이하 디자인 앱은 업데이트 확인이 꺼져 있으므로 아래 APK를 한 번 직접 내려받아 설치합니다. 기존 디자인 앱을 삭제하지 않고 업데이트 설치합니다. 이후 앱 실행 시 새 디자인 버전을 자동으로 확인하며, 안내에서 업데이트를 누르면 앱 캐시로 APK를 받습니다. Android 설치 확인은 사용자가 진행합니다. 메인 메뉴의 앱 업데이트 확인으로 수동 확인도 가능합니다.

https://github.com/racheu107/photo-pick/releases/download/design-v0.2.18/PhotoPick-DesignPreview-0.2.18.apk

## 채널과 배포 규칙

- 디자인 앱 태그: design-v<version>, 파일: PhotoPick-DesignPreview-<version>.apk
- 기존 운영 앱 태그: android-v<version>[-preview], 기존 APK 이름 유지
- 디자인 앱은 디자인 태그만 선택하고 운영 앱은 디자인 태그를 무시합니다.
- 이후 디자인 APK는 같은 applicationId와 서명, 증가하는 versionName/versionCode로 빌드합니다.
- 같은 인증서 SHA256: dd444f64830aba19a0f2697b9443f8229300ba06e45b5d8e7572d9ff0b2d2de6
- 서명키는 집 PC의 비공개 Android debug keystore를 사용하며 GitHub나 소스 ZIP에 업로드하지 않았습니다. 다른 PC에서 새 키로 빌드하면 기존 앱 업데이트가 불가능하므로 게시 전에 인증서 일치를 확인해야 합니다.
- 새 버전마다 이 규칙의 GitHub Pre-release에 APK를 첨부하면 앱이 인식합니다. 빌드/릴리스 게시 자체를 자동화한 CI는 이번 작업 범위에 추가하지 않았습니다.

## 검증과 보존

실제 AppUpdater.latest를 실행한 JVM 검사 13개가 통과했습니다. 디자인/운영 혼합 목록, 초안, 같은 버전/다운그레이드, 잘못된 APK 이름/URL/해시/크기/업로드 상태를 검사했습니다. 공개 GitHub 목록에서도 0.2.17→0.2.18 선택, 0.2.18 재안내 없음, 운영 0.2.7에 디자인 업데이트 안내 없음이 통과했습니다.

APK 빌드·lint·Android 테스트 APK 컴파일, APK의 웹 자산21개 소스 일치, 동일 서명과 package/versionCode 확인을 완료했습니다. 공개된 APK를 다시 내려받아 SHA256과 서명을 검증했습니다. 다운받은 SHA256은 F5DEC8F6FA7635BEE7C8960509155F3F591B6E6E4BF09BC4089E2016581D4714입니다.

업데이트 안내는 오프닝/홈 페이드 종료 및 홈 화면의 비어 있는 상태에서만 표시합니다. 평가·저장 중에는 띄우지 않습니다. 다운로드 파일은 캐시에 저장하고 기존 패키지·버전 증가·동일 서명·SHA256 검사를 유지합니다. 사진은 업데이트 서버에 보내지 않습니다.

기존 운영 소스61개·운영 APK·d1~d11 APK와 소스 압축본은 보존했습니다. 실제 휴대폰 설치 완료, 미래 버전의 기기 내 설치 흐름은 아직 실행 검증하지 않았습니다. Android instrumentation은 컴파일했으며 기기에서 실행한 결과로 보고하지 않습니다.

공개 릴리스: https://github.com/racheu107/photo-pick/releases/tag/design-v0.2.18
정확한 디자인 소스는 첨부된 PhotoPick-DesignPreview-0.2.18-source.zip입니다. 자동 생성 Source code ZIP은 기존 main의 기준 커밋이므로 디자인 소스와 구분합니다.
검증 자료: design-preview/verification/d12, 릴리스 기록: design-preview/releases/release-manifest-d12.json.
