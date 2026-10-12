# 분리형 평가 버튼 최종 적용 — 0.2.24 d18

2026-10-12. 사용자 첨부를 기준으로 초기화 원형 / 별로·좋음 묶음 / 매우 좋음 원형의 세 덩어리 구성으로 되돌렸다. 전체를 감싸던 d17의 큰 바는 제거하고 가운데 묶음의 구분선을 추가했다. 기존 48px 초기화·56px 평가 버튼·144×64 묶음 크기는 유지한다.

색과 블러만 각 표면에 반영한다. 유리 스타일은 어두운 그래파이트 반투명 바탕과 약한 테두리, 16px 뒤쪽 블러·채도를 사용한다. 사진 흡수 레이어보다 버튼이 앞에 있어 사진이 버튼 뒤로 들어가며 해당 원형/캡슐 안에서 흐려 보인다. 그룹 바깥의 간격에는 큰 바나 블러를 만들지 않는다. 무광/유리 선택과 투명도 감소 대안은 유지한다.

승인된 전체 기능은 포함되어 있다: 위쪽 계단 스택, 뒤 사진 블러 유지, 앞 사진 퇴장 후 다음 카드 정착, 평가 버튼 흡수·약한 회전, 현재 사진 확대 유지·더블탭/전체보기, 평가 후 다음 미평가 이동. 최종 N장/A·B 기능은 제거 상태다. 사진 읽기·날짜 그룹·평가·원본 저장 방식은 그대로다.

APK: `design-preview/releases/PhotoPick-DesignPreview-0.2.24-d18.apk`. 버전 0.2.24 / versionCode 27 / com.photopick.app.designpreview. SHA256 `EF45F0987FFCD1756F7FFD19C4BC454AD556EAB3D440AF911029DBDEEE282802`. 현재 PC의 d17과 동일 인증서다. 이전 APK와 `PhotoPick-DesignPreview-d17-source-before-button-shape.zip` 보존.

검증: Android assembleDebug/lintDebug 성공, APK 웹 자산 소스 일치, APK 추출본에서 분리 형태·투명한 외곽·가운데 구분선·버튼 사이 간격·각 표면 16px 블러 확인. d17의 스택/흡수/사진보다 앞인 버튼/로딩 실패·취소·평가·확대·320/390/430 배치·저장 대상 회귀 검사 통과.

Android API 37 에뮬레이터에 설치한 실제 APK의 WebView에서도 스택·뒤 사진 블러·버튼 뒤 흡수·각 버튼 표면 블러·확대·평가 후 이동·더블탭·전체보기를 확인했다. 실제 휴대폰·SD리더·갤러리 저장·햅틱 검증은 미실행이다. 공개 릴리스·사이트 배포는 하지 않았다.

검사: `design-preview/tests/review-d18.cjs`, `apk-webview-d18.cjs`. 결과·화면: `design-preview/verification/d18/checks.json`, `actual-apk-webview.json`, `drawer-stack.png`, `absorb-behind-glass.png`, `actual-apk-absorb-glass.png`.
