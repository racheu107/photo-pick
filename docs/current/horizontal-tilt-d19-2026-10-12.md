# 좌우 회전·뒤 사진 채우기 — 0.2.25 d19

- 좌우 드래그: 하단 중앙(50% 100%)을 축으로 거리와 회전을 연결. 카드 너비의 90% 이동에서 최대 ±22.5°.
- 손을 놓은 뒤: 현재 자세에서 해당 방향의 최종 ±22.5°로 퇴장. 같은 방향의 속도에 따라 150~220ms로 마무리. 회전한 모서리까지 화면 밖으로 이동하도록 거리 계산.
- 복제본 위치를 회전축에 맞게 보정하여 해제 순간 자세를 유지. 취소는 같은 축에서 180ms로 원위치.
- 뒤 블러 사진은 cover로 원본 비율을 유지하며 프레임을 채움. 배경 일부 구도는 잘릴 수 있고 앞 사진은 기존 전체 보기 유지. 스택 크기·투명도·블러 유지.
- 확대 유지, 다음 미평가 이동, 분리형 유리 버튼, 평가 버튼 흡수, 최종 선택 기능 제거 유지.

## 에이전트·참고 자료

모션 디자인 에이전트가 기존 ±1.5° 제한을 확인하고 하단 축·최종 ±22.5°·해제 자세 보존·짧은 퇴장·취소 복귀를 제안. 수치는 제품 설계 선택이며 사용자 연구로 검증된 정답을 뜻하지 않음.

[Good to great UI animation tips](https://uxdesign.cc/good-to-great-ui-animation-tips-7850805c12e5)의 상태 연결과 [Proper use of animation in UX](https://uxdesign.cc/the-ultimate-guide-to-proper-use-of-animation-in-ux-10bd98614fa9)의 가감속·집중 원칙 참고.

[UX in Motion Manifesto](https://medium.com/ux-in-motion/creating-usability-with-motion-the-ux-in-motion-manifesto-a87a4584ddc)의 직접 조작과 입력 후 전환 구분·연속성·가림에 따른 공간 관계를 참고하여 손가락 추종과 퇴장을 연결하고 뒤 카드 블러 유지.

[Material Understanding motion](https://m2.material.io/design/motion/understanding-motion.html#user-education)는 모션으로 요소 관계·행동 결과를 설명하고 집중을 유지하도록 권장. 평가 카드가 해당 버튼으로 들어가는 기존 동작과 다음 카드의 순차 진입 유지. Material 2는 유지보수 종료 상태인 참고 자료임.

## 검증

- APK 빌드·Android lint 통과(기존 경고 존재, 오류 없음).
- APK 내부 웹 자산 전부 소스 일치. 앱 ID com.photopick.app.designpreview, versionCode 28 / versionName 0.2.25.
- 추출 APK 브라우저 검사: 좌우 각도·하단 축·해제 위치 연속성·완전 퇴장·취소 복귀·cover/블러 및 기존 평가·확대·다운로드 회귀 통과.
- Android API 37 에뮬레이터 실제 APK: d18 위 삭제 없이 업데이트 설치, 좌우 터치·±22.5° 퇴장·하단 축·해제 위치 연결·cover 배경·유리 버튼·확대/평가 통과.
- 실제 사용자 휴대폰 성능과 사진/SD카드 검증은 수행하지 않음.
- APK SHA256: D83B1CA3FCEDB425904A610912BAD3636A98B80ADCDD9E87591B0D2C622A4797
- 인증서 SHA256: 1d2b4523d601265d95c93690680cef2698410795b6f81bf018f793352f67fb31 (d18 동일).
- 이전 소스: design-preview/releases/PhotoPick-DesignPreview-d18-source-before-tilt.zip
- 검사 결과: design-preview/verification/d19/checks.json, actual-apk-webview.json
