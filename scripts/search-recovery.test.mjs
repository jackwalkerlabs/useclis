import test from 'node:test';
import assert from 'node:assert/strict';
import { searchRecovery } from '../src/lib/search-recovery.mjs';
const tools=[{name:'qpdf',command:'qpdf',repo:'qpdf/qpdf',useCase:'Inspect PDF files',category:'Documents',features:[]},{name:'md',command:'md',repo:'example/md',useCase:'Render Markdown',category:'Documents',features:[]}];
test('Recovery offers only shorter queries with actual catalog matches, never claims task support',()=>{
 assert.deepEqual(searchRecovery(tools,'convert pdf to markdown'),[{query:'markdown',count:1},{query:'pdf',count:1}]);
 for(const query of ['glorbulator zxxwqq','pdf','https://github.com/qpdf/qpdf','']) assert.deepEqual(searchRecovery(tools,query),[]);
 assert.ok(searchRecovery(tools,'pdf markdown pdf').length<=3);
});
