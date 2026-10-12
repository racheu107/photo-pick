# UX in Motion 연결 모션 적용 — 0.2.26 d20

검토 기록: ux-in-motion-design-review-d19-2026-10-12.md. 앱 ID com.photopick.app.designpreview / versionCode 29.

## 적용

- 터치 영역·공용 캡슐 형태를 고정하고 누른 아이콘만 3% 수축. 손가락을 밖으로 빼거나 취소하면 복귀하며 평가하지 않음.
- 사진 흡수와 아이콘·버튼 강조를 동일한 190ms 흐름으로 연결. 마지막 구간에 아이콘이 원래 크기로 복귀하고 해당 버튼 내부 테두리가 짧게 밝아짐. 매우좋음은 마지막 구간에 국소 금빛 강조.
- 기존 출발 시 250ms 펄스·별 반짝임을 정리하여 사진이 들어오는 반응과 겹치지 않게 함.
- 첫 뒤 카드의 위치·투명도가 사진 퇴장 진행과 함께 움직임. 뒤 카드 블러 2/3/4px 유지.
- 앞 사진 퇴장 후 기존 90ms 정착 동안 확대된 배경 구도에서 전체 사진 구도로 블러·투명도를 함께 연결. 대기 카드의 블러는 계속 유지.
- 화면 이탈·취소 시 연결 효과와 임시 덮개 정리. 로딩이 길어져도 버튼을 눌린 상태로 유지하지 않음.
- 움직임 감소 설정에서 수축·이동 효과 생략. 확대 유지·다음 미평가 이동·좌우 22.5도 회전·최종 선택 제거 유지.

## 검증

- APK 추출 웹 자산으로 브라우저 검사 통과: 고정 터치 영역, 선택 아이콘만 수축, 취소, 도착 복귀, cover→contain 전환, 임시 효과 정리, 움직임 감소 및 기존 평가·확대·다운로드 회귀.
- Android API 37 에뮬레이터 실제 APK 검사 통과: 선택 아이콘 복귀와 다른 아이콘 고정, 정착 덮개 정리, 유리 버튼, 확대·평가, 양방향 회전.
- d19 위 삭제 없이 업데이트 설치 성공. d19와 동일 서명.
- Android 빌드·lint 통과. 기존 lint 경고 존재, 오류 없음.
- APK 웹 자산 전체 소스 일치. 실제 사용자 휴대폰·SD카드·저사양 기기 성능은 미검증.
- APK: design-preview/releases/PhotoPick-DesignPreview-0.2.26-d20.apk
- SHA256: 6F9FCDAC035D3B27794F540CBC1309B2F432268FF7B206788166128A341E9F44
- 이전 소스: design-preview/releases/PhotoPick-DesignPreview-d19-source-before-linked-motion.zip
- 결과: design-preview/verification/d20/checks.json, actual-apk-webview.json

[UX in Motion Manifesto](https://medium.com/ux-in-motion/creating-usability-with-motion-the-ux-in-motion-manifesto-a87a4584ddc)의 요소 간 관계·연속성·가림 원칙을 현재 화면에 적용한 디자인 해석. 새로운 사용자 연구 결과를 의미하지 않음.
