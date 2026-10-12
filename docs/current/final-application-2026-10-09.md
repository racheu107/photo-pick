# Photo Pick 디자인 최종 적용 — 2026-10-09

사용자의 ‘최종 적용’ 승인으로 0.2.17 d11 / versionCode 20을 최종본으로 확정했습니다. 오프닝 B의 합의 속도, 직접 사진 드래그·6px 모서리·현재 평가 표시·평가 초기화 동작이 현재 앱 소스와 APK에 반영되어 있습니다.

최종 앱은 기존 결정대로 별도 설치되는 com.photopick.app.designpreview입니다. 기존 운영 앱 0.2.7은 유지합니다. 휴대폰에 직접 설치하거나 외부 서비스에 공개 배포한 것은 아닙니다.

확인: APK SHA256과 소스 압축본 SHA256 일치, 현재 소스 전체와 d11 압축본 일치, APK 웹 자산21개 현재 소스 일치. 운영 소스61개·운영 APK·d1~d11 APK 불변 확인. 이미 통과한 빌드·lint·브라우저 검증을 유지하며 같은 바이너리이므로 재빌드는 하지 않았습니다. 실제 기기 검증은 남아 있습니다.

최종 APK: design-preview/releases/PhotoPick-DesignPreview-0.2.17-d11.apk
최종 소스: design-preview/releases/PhotoPick-DesignPreview-d11-source.zip
최종 승인·무결성 기록: design-preview/releases/final-release-manifest.json
다운로드: http://127.0.0.1:8767/downloads/PhotoPick-DesignPreview-Final-0.2.17.apk
미리보기: http://127.0.0.1:8767/opening-b-balanced/

오프닝 합의: 카메라100ms 지연+650ms 등장, 빛350ms 지연+400ms, 로고750ms 지연+250ms, 카피800ms 지연+200ms, 완성상태350ms, 종료220ms, 홈280ms. 전체1850ms. 가상 사용자 평가는 실제 소비자 실험과 구분합니다.
