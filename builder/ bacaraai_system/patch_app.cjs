const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

if (!code.includes('import Dashboard from')) {
  code = code.replace("import TopNav, { ViewType } from './components/TopNav';", "import TopNav, { ViewType } from './components/TopNav';\nimport Dashboard from './components/Dashboard';");
}

code = code.replace(/<Header onEmergencyStop=\{\(\) => setStopSessionType\('losscut'\)\} \/>/, `{/* Top Navigation */}
      <Header 
        onEmergencyStop={() => setStopSessionType('losscut')} 
        activeViewLabel={activeView === 'dashboard' ? '대시보드' : activeView === 'multitable' ? '멀티테이블' : activeView === 'insight' ? '데이터 인사이트' : activeView === 'history' ? '게임 기록' : activeView === 'lab' ? '규칙 연구실' : '설정'} 
      />`);

code = code.replace(/<main className="flex-1 flex overflow-hidden pb-16 sm:pb-0">\s*\{activeView === 'insight' \? \(/, `<main className="flex-1 flex overflow-hidden pb-16 sm:pb-0">
        {activeView === 'dashboard' ? (
          <Dashboard />
        ) : activeView === 'insight' ? (`);

fs.writeFileSync('src/App.tsx', code);
