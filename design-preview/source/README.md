# Photo Pick

[모바일 웹앱](https://racheu107.github.io/photo-pick/) · [Android 릴리스](https://github.com/racheu107/photo-pick/releases)

촬영일자별로 사진을 모아 보고, 앨범에서 사진을 눌러 별로·좋음·아주 좋음으로 평가한 뒤 고른 사진을 원본으로 다운로드합니다. 모바일은 웹앱이 전체 화면, 데스크톱은 좌측 소개/사용법/APK 버튼과 우측 모바일 크기 웹앱입니다.

## 웹 사용
사진 폴더 또는 JPEG 파일을 선택합니다. EXIF DateTimeOriginal 촬영일로 그룹을 만들며, 날짜가 없으면 촬영일 없음으로 분류합니다. 사진 및 메타데이터는 브라우저에서만 처리하며 서버에 업로드하지 않습니다. 한 장은 원본 파일, 여러 장은 ZIP STORE로 원본 바이트를 그대로 다운로드합니다. 파일 준비 후 다운로드 버튼을 직접 눌러 받습니다. 웹에서는 갤러리의 Photo Pick 폴더를 자동 생성하지 않으며 저장 위치/파일 선택 화면은 브라우저를 따릅니다.

평가 기록은 이 브라우저의 localStorage에 보존합니다. 새로고침 후 같은 사진을 다시 선택하면 이어서 평가할 수 있습니다. 웹과 Android 평가 기록은 별도이며 동기화하지 않습니다. 장소 이름은 웹에서 조회하지 않고 촬영일 그룹만 제공합니다. 예시 사진은 PNG로 다운로드합니다.

## 구조
- index.html: 데스크톱 소개와 모바일 앱 iframe.
- app/index.html: Android 0.2.7 기반 모바일 화면과 기존 평가 상태/흐름.
- assets/review-ui.js, ui-motion.js, quiet-glass.css: 앱과 동일한 평가·모션·스타일 레이어.
- assets/web-device.js, web-exif.js, web-download.js, web-ui.js: 브라우저 파일 선택/EXIF 읽기/원본 ZIP/다운로드 안내.
- assets/web-shell.css/js: 외부 레이아웃, 모바일 safe area와 브라우저 뒤로가기 연결.
- android-app/: 네이티브 SD·MediaStore 어댑터가 있는 Android 프로젝트.

웹은 빌드나 외부 라이브러리 없이 정적 파일로 동작합니다. GitHub Actions pages.yml이 index.html, app/, assets/를 배포합니다. Android UI 변경을 웹에 동기화할 때 브라우저 어댑터와 웹 저장 안내는 유지해야 합니다.

## 예시 사진
기존 9개에 제공된 카페/골목/한강 사진 3개를 추가해 12개로 구성합니다. 추가 3개를 첫 예시 그룹과 로딩 애니메이션에 우선 사용합니다. 원본 PNG는 변경하지 않았습니다. 촬영일은 체험용 예시이며 실제 EXIF로 오해하지 않도록 안내합니다. 예시 세션 구성이 바뀌어 예전 예시 평가만 초기화되며 실제 사진 평가 기록은 유지합니다.
