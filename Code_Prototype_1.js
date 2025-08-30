
  // ------- Program model -------
  let nextId = 1;
  const root = { id: nextId++, type: 'ROOT', body: [] };
  let targetInside = 'then';
  const hist = { past: [], future: [] };
  let selectedId = null;

  function makeNode(type){
    switch(type){
      case 'LET': return { id: nextId++, type, name: 'x', expr: '0' };
      case 'PRINT': return { id: nextId++, type, expr: '"hello"' };
      case 'IF': return { id: nextId++, type, lhs:'x', op:'<', rhs:'10', then: [], elseBody: [] };
      case 'FOR': return { id: nextId++, type, v:'i', start:'0', end:'5', step:'1', body: [] };
    }
  }

  // ------- Find / Parent helpers -------
  function indexOf(arr, node){ return arr.findIndex(n => n.id === node.id); }
  function findNode(container, nodeId){
    if (!nodeId) return null;
    for (const n of container.body){
      if (n.id === nodeId) return n;
      if (n.type === 'IF'){
        const a = findNode({body:n.then}, nodeId); if (a) return a;
        const b = findNode({body:n.elseBody}, nodeId); if (b) return b;
      }
      if (n.type === 'FOR'){
        const c = findNode({body:n.body}, nodeId); if (c) return c;
      }
    }
    return null;
  }
  function findParent(container, nodeId){
    for (const n of container.body){
      if (n.id === nodeId) return container;
      if (n.type === 'IF'){
        const inThen = findParent({body:n.then}, nodeId); if (inThen) return {node:n, slot:'then', body:n.then};
        const inElse = findParent({body:n.elseBody}, nodeId); if (inElse) return {node:n, slot:'else', body:n.elseBody};
      }
      if (n.type === 'FOR'){
        const inBody = findParent({body:n.body}, nodeId); if (inBody) return {node:n, slot:'body', body:n.body};
      }
    }
    return null;
  }

  // ------- UI actions -------

  // ------- History & Autosave -------
  function snapshot(){ return JSON.stringify(root.body); }
  function restore(json){ try{ root.body = JSON.parse(json); } catch(_){} }
  function pushHistory(){ hist.past.push(snapshot()); hist.future = []; saveLocal(); }
  function undo(){ if(!hist.past.length) return; hist.future.push(snapshot()); const prev = hist.past.pop(); restore(prev); render(); pushHistory(); saveLocal(); }
  function redo(){ if(!hist.future.length) return; hist.past.push(snapshot()); const next = hist.future.pop(); restore(next); render(); saveLocal(); }

  function saveLocal(){ try{ localStorage.setItem('touch_proto1_body', JSON.stringify(root.body)); }catch(e){} }
  function loadLocal(){ try{ const s = localStorage.getItem('touch_proto1_body'); if(s){ root.body = JSON.parse(s); } }catch(e){} }

  function addAt(container, node){ container.body.push(node); render(); pushHistory(); }
  function addToSelected(node){
    const found = findNode(root, selectedId);
    if (!found) { addAt(root, node); return; }
    if (found.type === 'IF') { found.then.push(node); }
    else if (found.type === 'FOR') { found.body.push(node); }
    else { // non-container -> insert after in same parent
      const parent = findParent(root, found.id);
      if (parent) parent.body.splice(indexOf(parent.body, found)+1, 0, node);
      else root.body.push(node);
    }
    render(); pushHistory();
  }

  function deleteNode(node){
    const parent = findParent(root, node.id);
    if (!parent){
      const idx = indexOf(root.body, node);
      if (idx>=0) root.body.splice(idx,1);
    } else {
      const idx = parent.body.findIndex(n => n.id === node.id);
      if (idx>=0) parent.body.splice(idx,1);
    }
    if (selectedId === node.id) selectedId = null;
    render(); pushHistory();
  }
  function moveNode(node, dir){
    const parent = findParent(root, node.id) || { body: root.body };
    const arr = parent.body;
    const idx = indexOf(arr, node);
    const j = idx + dir;
    if (idx<0 || j<0 || j>=arr.length) return;
    [arr[idx], arr[j]] = [arr[j], arr[idx]];
    render(); pushHistory();
  }

  // ------- Rendering -------
  const ws = document.getElementById('workspace');
  function render(){
    ws.innerHTML = '';
    renderBody(root.body, 0, ws);
    document.getElementById('status').textContent = selectedId ? ('selected #' + selectedId + (targetInside==='else' ? ' (ELSE)' : ' (THEN)')) : ('ready (inside ' + (targetInside==='else' ? 'ELSE' : 'THEN') + ')');
  }
  function renderBody(body, depth, parentEl){
    body.forEach((node) => {
      const line = document.createElement('div');
      line.className = 'line';
      if (node.id === selectedId) line.style.outline = '2px solid #93c5fd';

      const left = document.createElement('div');
      const code = document.createElement('span');
      code.className = 'code';
      code.append(...codeTokens(node, depth));
      left.append(code);

      const actions = document.createElement('div');
      actions.className = 'actions';
      const up = button('▲', () => moveNode(node, -1));
      const dn = button('▼', () => moveNode(node, +1));
      const del = button('🗑', () => deleteNode(node));
      const sel = button('Select', () => { selectedId = (selectedId === node.id ? null : node.id); render(); });
      actions.append(up, dn, del, sel);

      line.append(left, actions);
      parentEl.append(line);

      if (node.type === 'IF'){
        // THEN body
        const thenHdr = document.createElement('div');
        thenHdr.className = 'code'; thenHdr.textContent = indent(depth) + '{';
        const thenWrap = document.createElement('div');
        thenWrap.className = 'container';
        renderBody(node.then, depth+1, thenWrap);
        parentEl.append(thenHdr, thenWrap);
        // ELSE
        const elseHdr = document.createElement('div');
        elseHdr.className = 'code'; elseHdr.textContent = indent(depth) + '} else {';
        const elseWrap = document.createElement('div');
        elseWrap.className = 'container';
        renderBody(node.elseBody, depth+1, elseWrap);
        const endIf = document.createElement('div');
        endIf.className = 'code'; endIf.textContent = indent(depth) + '}';
        parentEl.append(elseHdr, elseWrap, endIf);
      }
      if (node.type === 'FOR'){
        const bodyWrap = document.createElement('div');
        bodyWrap.className = 'container';
        renderBody(node.body, depth+1, bodyWrap);
        const endFor = document.createElement('div');
        endFor.className = 'code';
        endFor.textContent = indent(depth) + '}';
        parentEl.append(bodyWrap, endFor);
      }
    });
  }

  function codeTokens(node, depth){
    const parts = [];
    const sp = document.createElement('span');
    sp.className = 'code'; sp.textContent = indent(depth);
    parts.push(sp);

    function tok(text, cls, onedit){
      const el = document.createElement('span');
      el.className = 'tok ' + cls;
      el.textContent = text;
      el.onclick = onedit;
      return el;
    }
    function text(txt){ const s = document.createElement('span'); s.className='code'; s.textContent = txt; return s; }

    if (node.type === 'LET'){
      parts.push(tok('let','k'));
      parts.push(tok(node.name,'var', () => openEditor(node,'name','Variable name', 'text')));
      parts.push(text(' = '));
      parts.push(tok(node.expr,'num', () => openEditor(node,'expr','Value (number/expression)', 'num')));
      parts.push(text(';'));
    } else if (node.type === 'PRINT'){
      parts.push(tok('print','k'));
      parts.push(text('('));
      parts.push(tok(node.expr,'str', () => openEditor(node,'expr','What to print (e.g., "hi" or x+1)', 'text')));
      parts.push(text(');'));
    } else if (node.type === 'IF'){
      parts.push(tok('if','k'));
      parts.push(text(' ('));
      parts.push(tok(node.lhs,'var', () => openEditor(node,'lhs','Left side (var or expr)', 'text')));
      parts.push(text(' '));
      parts.push(tok(node.op,'op', () => openEditor(node,'op','Operator', 'op')));
      parts.push(text(' '));
      parts.push(tok(node.rhs,'num', () => openEditor(node,'rhs','Right side (number/expr)', 'num')));
      parts.push(text(' )'));
    } else if (node.type === 'FOR'){
      parts.push(tok('for','k'));
      parts.push(text(' ('));
      parts.push(tok(node.v,'var', () => openEditor(node,'v','Loop variable', 'text')));
      parts.push(text(' = '));
      parts.push(tok(node.start,'num', () => openEditor(node,'start','Start (number)', 'num')));
      parts.push(text('; '));
      parts.push(text(node.v + ' < '));
      parts.push(tok(node.end,'num', () => openEditor(node,'end','End (number)', 'num')));
      parts.push(text('; '));
      parts.push(text(node.v + ' += '));
      parts.push(tok(node.step,'num', () => openEditor(node,'step','Step (number)', 'num')));
      parts.push(text(' )'));
    }
    return parts;
  }

  function indent(n){ return '  '.repeat(n); }
  function button(label, onclick){ const b = document.createElement('button'); b.className = 'btn btn-ghost'; b.textContent = label; b.onclick = onclick; return b; }

  // ------- On-screen Editor Modal -------
  const modal = document.getElementById('modal');
  const modalTitle = document.getElementById('modal-title');
  const modalInput = document.getElementById('modal-input');
  const modalOps = document.getElementById('modal-ops');
  const modalPad = document.getElementById('modal-pad');
  const modalOk = document.getElementById('modal-ok');
  const modalCancel = document.getElementById('modal-cancel');

  let editCtx = null; // { node, field, kind }

  function openEditor(node, field, title, kind){
    editCtx = { node, field, kind };
    modalTitle.textContent = 'Edit: ' + title;
    modalInput.value = String(node[field] ?? '');
    modal.classList.add('show');
    modal.setAttribute('aria-hidden', 'false');
    modalInput.focus();
    if (kind === 'op'){ modalOps.style.display = 'block'; modalPad.style.display = 'none'; }
    else if (kind === 'num'){ modalOps.style.display = 'none'; modalPad.style.display = 'block'; }
    else { modalOps.style.display = 'none'; modalPad.style.display = 'none'; }
  }
  function closeEditor(){ modal.classList.remove('show'); modal.setAttribute('aria-hidden', 'true'); editCtx = null; }

  // operator picker
  modalOps.addEventListener('click', (e) => {
    if (e.target.classList.contains('key')){
      modalInput.value = e.target.textContent.trim();
    }
  });
  // numeric keypad
  modalPad.addEventListener('click', (e) => {
    if (!e.target.classList.contains('key')) return;
    const t = e.target.textContent.trim();
    if (t === 'OK'){ applyEditor(); return; }
    if (t === 'CLR'){ modalInput.value = ''; return; }
    if (t === '←'){ modalInput.value = modalInput.value.slice(0, -1); return; }
    if (t === '±'){
      if (modalInput.value.startsWith('-')) modalInput.value = modalInput.value.slice(1);
      else modalInput.value = '-' + modalInput.value;
      return;
    }
    modalInput.value += t;
  });

  modalOk.onclick = applyEditor;
  modalCancel.onclick = closeEditor;
  modal.addEventListener('click', (e) => { if (e.target === modal) closeEditor(); });

  function applyEditor(){
    if (!editCtx) return closeEditor();
    const { node, field } = editCtx;
    node[field] = modalInput.value;
    closeEditor();
    render();
  }

  // ------- Transpile & Run -------
  const consoleEl = document.getElementById('console');
  function write(line){ consoleEl.textContent += line + "\\n"; consoleEl.scrollTop = consoleEl.scrollHeight; }
  function clearConsole(){ consoleEl.textContent = ''; }

  function transpile(body, depth=0){
    const out = [];
    for (const n of body){
      if (n.type === 'LET'){
        out.push(indent(depth) + `let ${n.name} = (${n.expr});`);
      } else if (n.type === 'PRINT'){
        out.push(indent(depth) + `console.log(${n.expr});`);
      } else if (n.type === 'IF'){
        out.push(indent(depth) + `if ((${n.lhs}) ${n.op} (${n.rhs})) {`);
        out.push(transpile(n.then, depth+1));
        out.push(indent(depth) + `} else {`);
        out.push(transpile(n.elseBody, depth+1));
        out.push(indent(depth) + `}`);
      } else if (n.type === 'FOR'){
        out.push(indent(depth) + `for (let ${n.v} = (${n.start}); ${n.v} < (${n.end}); ${n.v} += (${n.step})) {`);
        out.push(transpile(n.body, depth+1));
        out.push(indent(depth) + `}`);
      }
    }
    return out.flat().join('\\n');
  }

  function runProgram(){
    const start = performance.now();
    clearConsole();
    const code = transpile(root.body);
    const wrapped = `(function(){ try {
      const print = (...args) => console.log(...args);
      ${code}
    } catch (e){ console.log('Runtime error:', e.message); } })()`;
    const backup = console.log;
    console.log = (...args) => { backup(...args); write(args.join(' ')); };
    let errorFlag = false;
    try {
      // eslint-disable-next-line no-eval
      eval(wrapped);
    } catch (e) {
      write('Build/exec error: ' + e.message);
      errorFlag = true;
    } finally {
      console.log = backup;
    }
    const end = performance.now();
    const ms = Math.round(end-start);
    document.getElementById('status').textContent = `ran in ${ms} ms`;
    // Task logging
    if (taskState.active){
      taskState.runs += 1;
      const elapsed = performance.now() - taskState.startedAt;
      taskState.lastRunMs = ms;
      // mark complete if console isn't empty (very naive success signal) or after first run
      const success = consoleEl.textContent.trim().length > 0;
      if (success && !taskState.completedAt){ taskState.completedAt = performance.now(); }
      logEntry({ ts: new Date().toISOString(), taskId: taskState.taskId, elapsedMs: Math.round(elapsed), runMs: ms, success, runs: taskState.runs });
      updateTaskStatus();
    }
  }

  function resetProgram(){
    root.body = [];
    selectedId = null;
    clearConsole();
    render(); pushHistory();
    document.getElementById('status').textContent = 'reset';
  }

  function exportProgramJSON(){
    const payload = { program: root, code: transpile(root.body) };
    downloadJSON('touch-code-program.json', payload);
  }

  function downloadJSON(name, obj){
    const blob = new Blob([JSON.stringify(obj, null, 2)], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  }

  // ------- ELSE toggle -------
  document.getElementById('toggle-else').onclick = () => {
    const node = findNode(root, selectedId);
    if (!node || node.type !== 'IF'){ alert('Select an IF line first'); return; }
    if (node.elseBody && node.elseBody.length >= 0){
      if (node._elseDisabled){
        // re-enable
        node._elseDisabled = false;
      } else {
        node._elseDisabled = true;
        node.elseBody = [];
      }
      render();
    }
  };

  // ------- Save / Load -------
  document.getElementById('save').onclick = exportProgramJSON;
  document.getElementById('load').onclick = () => {
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = '.json,application/json';
    inp.onchange = () => {
      const file = inp.files[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result);
          if (data && data.program && data.program.body){
            root.body = data.program.body;
            render();
            write('// Loaded program from file');
          }
        } catch (err){ alert('Invalid JSON'); }
      };
      reader.readAsText(file);
    };
    inp.click();
  };

  // ------- Task Mode (simple) -------
  const tasks = {
    't1': { id:'t1', name:'Print numbers 1..5', hint:'Goal: Use FOR to print 1 to 5.' },
    't2': { id:'t2', name:'If x < 10 print "hi", else "bye"', hint:'Goal: Use LET x, IF condition, PRINT in both branches.' },
    't3': { id:'t3', name:'For i=0..8 step 2, print i', hint:'Goal: FOR loop with step 2 and PRINT i.' }
  };
  const taskHint = document.getElementById('task-hint');
  const taskStatus = document.getElementById('task-status');
  const taskSel = document.getElementById('task-select');
  const taskStart = document.getElementById('task-start');
  const taskCancel = document.getElementById('task-cancel');

  const logs = []; // { ts, taskId, elapsedMs, runMs, success, runs }
  function logEntry(entry){ logs.push(entry); }

  const taskState = { active:false, taskId:null, startedAt:0, completedAt:null, runs:0, lastRunMs:0 };

  function updateTaskStatus(){
    if (!taskState.active){ taskStatus.textContent = 'No task running.'; return; }
    const elapsed = Math.round((taskState.completedAt ?? performance.now()) - taskState.startedAt);
    const done = taskState.completedAt ? '✓ completed' : '… in progress';
    taskStatus.textContent = `Task ${taskState.taskId} ${done} — time ${elapsed} ms, runs ${taskState.runs}`;
  }

  taskSel.onchange = () => {
    const t = tasks[taskSel.value];
    taskHint.textContent = t ? t.hint : '';
  };
  taskStart.onclick = () => {
    const t = tasks[taskSel.value];
    if (!t){ alert('Choose a task first'); return; }
    taskState.active = true;
    taskState.taskId = t.id;
    taskState.startedAt = performance.now();
    taskState.completedAt = null;
    taskState.runs = 0;
    taskState.lastRunMs = 0;
    updateTaskStatus();
  };
  taskCancel.onclick = () => {
    taskState.active = false; taskState.taskId = null; updateTaskStatus();
  };

  
  // THEN/ELSE targeting
  document.getElementById('inside-then').onclick = ()=>{ targetInside='then'; document.getElementById('status').textContent = 'ready (inside THEN)'; };
  document.getElementById('inside-else').onclick = ()=>{ targetInside='else'; document.getElementById('status').textContent = 'ready (inside ELSE)'; };

  // Undo/Redo
  document.getElementById('undo').onclick = undo;
  document.getElementById('redo').onclick = redo;

  // Show Code modal
  const codeModal = document.getElementById('code-modal');
  const codeOut = document.getElementById('code-output');
  document.getElementById('show-code').onclick = ()=>{ codeOut.value = transpile(root.body); codeModal.classList.add('show'); codeModal.setAttribute('aria-hidden','false'); };
  document.getElementById('code-close').onclick = ()=>{ codeModal.classList.remove('show'); codeModal.setAttribute('aria-hidden','true'); };
  document.getElementById('code-copy').onclick = ()=>{ codeOut.select(); document.execCommand('copy'); };

  document.getElementById('export').onclick = () => {
    const payload = { logs };
    downloadJSON('touch-code-logs.json', payload);
    // Also export CSV
    const header = 'ts,taskId,elapsedMs,runMs,success,runs\\n';
    const rows = logs.map(r => [r.ts,r.taskId,r.elapsedMs,r.runMs,r.success,r.runs].join(','));
    const csv = header + rows.join('\\n');
    const blob = new Blob([csv], {type:'text/csv'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'touch-code-logs.csv';
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  };

  // ------- Add-inside wiring -------
  document.getElementById('add-inside').onclick = () => {
    if (!selectedId){ alert('Select a line first to add inside'); return; }
    const tgt = findNode(root, selectedId);
    if (!tgt){ alert('Invalid selection'); return; }
    const tSel = document.getElementById('insert-type');
    const t = tSel ? tSel.value : 'PRINT';
    const node = makeNode(t);
    if (tgt.type === 'IF') { (targetInside==='else' ? tgt.elseBody : tgt.then).push(node); }
    else if (tgt.type === 'FOR') { tgt.body.push(node); }
    else { alert('Selected line is not a container'); return; }
    render(); pushHistory();
  };

  // ------- Top button wiring -------
  document.getElementById('add-let').onclick = () => addToSelected(makeNode('LET'));
  document.getElementById('add-print').onclick = () => addToSelected(makeNode('PRINT'));
  document.getElementById('add-if').onclick = () => addToSelected(makeNode('IF'));
  document.getElementById('add-for').onclick = () => addToSelected(makeNode('FOR'));
  document.getElementById('run').onclick = runProgram;
  document.getElementById('reset').onclick = resetProgram;

  // ------- Boot sample -------
  loadLocal();
  if(!root.body.length){
  root.body.push(makeNode('LET'));
  root.body.push(makeNode('FOR'));
  root.body[root.body.length-1].body.push(makeNode('PRINT'));
  // Adjust sample values
  root.body[0].name = 'x'; root.body[0].expr = '1';
  const f = root.body[1];
  f.v = 'i'; f.start='1'; f.end='6'; f.step='1';
  f.body[0].expr = 'i';
  render(); pushHistory();
  }
