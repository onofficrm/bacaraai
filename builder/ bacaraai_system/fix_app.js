const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(/        \) : activeView === 'settings' \? \([\s\S]*?        \) : \(/,
`        ) : activeView === 'settings' ? (
          <SettingsView 
            onReplayOnboarding={() => setShowOnboarding(true)}
            onStartRealSession={() => setIsModalOpen(true)}
          />
        ) : activeView === 'lab' ? (
          <RuleLabView />
        ) : (`);

fs.writeFileSync('src/App.tsx', code);
