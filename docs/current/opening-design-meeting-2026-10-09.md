# Photo Pick 오프닝 디자인 회의 — 2026-10-09

범위: 구현 전 조사·타임라인 시안. 앱 소스·APK를 변경하지 않았습니다. 모션 디렉터, UI/브랜드 디자이너, UX 디자이너 에이전트가 검토했습니다. 실제 사용자 테스트 결과는 아닙니다.

추천 A: 여러 장의 사진 → 가운데 한 장을 아래로 골라냄 → 작은 하트로 선택 표현 → 선택 사진+Photo Pick 워드마크 → 기존 홈으로 연결.

0.00–0.25 사진 세 장 등장 / 0.25–0.65 가운데 카드 아래로 이동 / 0.65–0.95 하트 선택 / 0.95–1.25 작은 사진과 워드마크 / 1.25–1.60 홈.

밝은 중성 배경, 사진만 색, 기존 6px 라운딩, 회전 없음. 사진을 새로운 로고로 억지 변형하지 않고 실제 사진+기존 워드마크 조합으로 연결합니다. 신규 앱 아이콘 확정안은 아닙니다.

B: 빈 프레임→초점선→로고. 빠르지만 카메라 촬영 앱으로 오해할 수 있어 A 추천.

1.6초는 시놉시스 검토 길이. 실제 적용은 로딩 완료에 맞춰 중단 가능해야 하고 불필요한 고정 지연을 만들지 않습니다. 탭 스킵, 모션 감소 정적 대체, hot resume 재생 없음. 반복 시작은 축약 검토. Android 12 시스템 스플래시와 WebView 오프닝이 중복 지연을 만들지 않도록 실제 구현 단계에서 연계합니다. 소리/진동 기본 없음.

참고 자료:
- https://developer.android.com/develop/ui/views/launch/splash-screen — 아이콘 애니메이션 1초 이내 권장, 준비 완료와 종료 연결.
- https://developer.android.com/develop/ui/views/launch/splash-screen/migrate — 별도 스플래시 중복 문제.
- https://m3.material.io/styles/motion — 모션 체계 참고. 구체적 시간/거리 수치는 앱용 디자인 제안.
- https://styles.refero.design/style/5fd3b3b4-02ab-456a-87aa-e4395636b671 — UI 디자이너가 무채색·콘텐츠 중심 구성 참고. Refero 해석이며 Figma 공식 규격 아님.
- https://seed-design.io/components/image-frame — 이미지 프레임·모서리 구조 참고.

시안: design/current/opening-storyboard-2026-10-09/storyboard.png 및 storyboard.html. 현재 앱의 사진 자산과 홈 화면을 배치하여 HTML로 렌더링했습니다. imagegen 스킬은 사용하지 않았습니다. 실제 모션 구현/새 APK는 다음 단계입니다.
