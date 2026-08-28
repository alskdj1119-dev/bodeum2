'use client';

// 앱 실행 직후, 저장된 패밀리 코드가 있는지 확인하는 짧은 동안 보여주는 스플래시 화면.
// (패밀리 코드 입력화면이 잠깐 번쩍이는 것을 막기 위해 사용)
// fading=true가 되면 opacity를 0으로 내려 아래 깔리는 화면(홈 등)과 크로스페이드된다.
// 라이트/다크 이미지 중 어떤 걸 보여줄지는 globals.css의 .splash-img-light/.splash-img-dark
// 규칙(앱의 다른 테마 변수들과 동일한 방식)이 CSS만으로 결정한다 — JS의 테마 상태 로드를
// 기다릴 필요 없이 기기 설정(prefers-color-scheme)에 따라 첫 페인트부터 바로 맞는 이미지가 보인다.
export default function SplashScreen({ fading = false }) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg)',
        zIndex: 9999,
        opacity: fading ? 0 : 1,
        transition: 'opacity 400ms ease',
        pointerEvents: fading ? 'none' : 'auto',
      }}
    >
      <img
        src="/splash.jpg"
        alt="보듬"
        className="splash-img splash-img-light"
        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
      />
      <img
        src="/splash-dark.jpg"
        alt="보듬"
        className="splash-img splash-img-dark"
        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
      />
    </div>
  );
}
