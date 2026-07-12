const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');
code = code.replace(
  /<RightPanel[\s\S]*?<\/main>/,
  `<RightPanel \n          table={selectedTable} \n          isOpen={isRightPanelOpen}\n          onClose={() => setIsRightPanelOpen(false)}\n        />\n          </>\n        ) : (\n          <div className="flex-1 flex items-center justify-center text-zinc-500 bg-zinc-950">\n            <div className="flex flex-col items-center gap-2">\n              <Activity size={32} className="opacity-50 mb-2" />\n              <p className="font-medium text-zinc-400">해당 화면은 준비 중입니다.</p>\n            </div>\n          </div>\n        )}\n      </main>`
);
fs.writeFileSync('src/App.tsx', code);
