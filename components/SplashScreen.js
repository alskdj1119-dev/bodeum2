'use client';

// 앱 실행 직후, 저장된 패밀리 코드가 있는지 확인하는 짧은 동안 보여주는 스플래시 화면.
// (패밀리 코드 입력화면이 잠깐 번쩍이는 것을 막기 위해 사용)
// fading=true가 되면 opacity를 0으로 내려 아래 깔리는 화면(홈 등)과 크로스페이드된다.
export default function SplashScreen({ fading = false }) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#FDF4D2',
        zIndex: 9999,
        opacity: fading ? 0 : 1,
        transition: 'opacity 400ms ease',
        pointerEvents: fading ? 'none' : 'auto',
      }}
    >
      <img
        src="/splash.jpg"
        alt="보듬"
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
        }}
      />
    </div>
  );
}
