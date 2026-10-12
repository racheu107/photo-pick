# 확대 유지 — 0.2.22 d16 / 2026-10-12

사용자 요청에 따라 같은 사진에서 핀치 확대·이동을 손을 뗀 뒤에도 유지한다. 이후 디자인 회의 요청은 제안으로만 정리했으며 카드 디자인·평가 모션은 변경하지 않았다.

- 확대 상태에서 한 손가락은 사진 내부 이동만 수행한다. 좌우 넘김·아래 좋음 평가로 해석하지 않는다.
- 손을 뗀 뒤 평가 버튼과 상단 탐색 버튼을 사용할 수 있다. 평가하면 다음 미평가 사진을 전체 구도로 연다. 이전/다음 사진 이동도 새 사진은 전체보기로 시작한다.
- 더블탭은 전체보기/2배 확대를 전환한다. 확대 중에는 ‘전체 보기’ 버튼도 표시한다.
- 진행 중인 핀치/팬과 정지 확대 상태를 분리해 평가 잠금이 계속 남지 않게 했다. 터치 취소·캡처 종료 시 진행 상태는 정리하면서 같은 사진의 확대를 보존한다.
- 앱/창 이탈과 화면 이동 시 입력 상태를 정리한다. 앱 이탈 시 배율은 초기화하므로 확대 상태를 앱 종료 후 복원하는 기능은 아니다.
- 고해상도 미리보기 로딩은 손을 놓은 뒤에도 확대 상태면 반영한다.
- 읽기 사용 팁과 첫 제스처 안내에 확대 유지·더블탭을 반영했다.

APK: `design-preview/releases/PhotoPick-DesignPreview-0.2.22-d16.apk`. versionCode 25, 패키지 com.photopick.app.designpreview. SHA256 `A837DDED64324E6ADB8366F80397B31DF909EF66F46106194E3342CCDD2B6E70`. d15와 같은 인증서. d15 소스는 `PhotoPick-DesignPreview-d15-source-before-zoom.zip`에 보존했다.

검증: Android assembleDebug/lintDebug 성공. 완성 APK의 자산과 현재 소스 일치. 실제 APK를 추출해 `review-d16.cjs` 실행 통과: 손떼기 유지, 팬 중 평가·탐색 불변, 재핀치 위치, 터치 취소 후 입력 복구, 실제 브라우저 터치 더블탭, 전체보기 버튼, 확대 상태 평가·탐색 및 다음 사진 초기화, 앱 이탈 정리, 320/390/430 너비에서 큰 버튼 유지, d15 평가 흐름·이전 최종 선택 제거·웹 회귀 검사.

Android 에뮬레이터 업데이트 설치 후 네이티브 Bridge가 있는 실제 WebView로 동일 APK의 확대 유지·팬·평가·다음 사진 전체보기·터치 더블탭·전체보기 버튼을 검사했다. 실제 휴대폰·SD리더·갤러리 저장·햅틱 검증은 미실행이다.

검사: `design-preview/tests/review-d16.cjs`, `apk-webview-d16.cjs`. 결과와 화면: `design-preview/verification/d16/checks.json`, `actual-apk-webview.json`, `zoom-retained.png`, `actual-apk-zoom-retained.png`.

별도 디자인 회의: `docs/current/evaluation-design-meeting-2026-10-12.md`. 절제된 카드형은 제안이며 이번 APK에 새 모션으로 적용한 것은 아니다.
