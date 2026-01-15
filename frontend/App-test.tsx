import React from 'react';

const App = () => {
  return (
    <div style={{ 
      padding: '20px', 
      color: 'white', 
      background: '#0a0a0b',
      minHeight: '100vh',
      fontSize: '18px'
    }}>
      <h1>골든타임 LLM - 테스트 모드</h1>
      <p>✅ React 앱이 정상적으로 실행되고 있습니다.</p>
      <p>🚀 백엔드 연결 상태를 확인 중...</p>
      
      <div style={{ marginTop: '20px' }}>
        <h2>시스템 상태</h2>
        <ul>
          <li>프론트엔드: ✅ 실행 중</li>
          <li>백엔드: 확인 중...</li>
          <li>MongoDB: 확인 중...</li>
          <li>Ollama: 확인 중...</li>
        </ul>
      </div>
      
      <div style={{ 
        marginTop: '20px', 
        padding: '15px', 
        border: '1px solid #333',
        borderRadius: '8px',
        background: '#111'
      }}>
        <h3>다음 단계</h3>
        <p>이 화면이 보인다면 React는 정상 작동하고 있습니다.</p>
        <p>원래 앱을 복원하려면 개발자에게 알려주세요.</p>
      </div>
    </div>
  );
};

export default App;