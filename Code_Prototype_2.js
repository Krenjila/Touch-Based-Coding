
  (function(){
    const $ = (id)=>document.getElementById(id);
    const app = $("app");
    const code = $("code");
    const gutter = $("gutter");
    const consoleEl = $("console");
    const runner = $("runner");
    const filebar = $("filebar");

    // --- Project / Files ---
    let project = loadProject() || {
      files: [
        { id: uid(), name: "main.js", content: defaultStarter() },
      ],
      activeId: null
    };
    project.activeId = project.activeId || project.files[0].id;

    function uid(){ return Math.random().toString(36).slice(2,9); }

    function defaultHtmlStarter(){ return `<!doctype html>\n<html><head><meta charset=\"utf-8\"><title>TouchDev App</title></head><body>\n<h1>Hello, TouchDev</h1>\n<div id=\"app\">Edit index.html, styles.css, and JS files.</div>\n<canvas id=\"cnv\" width=\"400\" height=\"200\" style=\"border:1px solid #ccc\"></canvas>\n</body></html>`; }
    function defaultCssStarter(){ return `body{ font-family: system-ui; } h1{ font-size: 20px; }`; }
    function defaultStarter(){
      return `// Welcome to TouchDev Prototype 2\n// Try editing and tap Run ▶\n\nfunction greet(name){\n  return 'Hello, ' + name + '!';\n}\n\n// Loop example\nfor (let i=1; i<=5; i++){\n  console.log('i =', i);\n}\n\nconsole.log(greet('TouchDev'));\n`;
    }

    function loadProject(){
      try { return JSON.parse(localStorage.getItem('touchdev_project')); } catch(e){ return null; }
    }
    function saveProject(){
      localStorage.setItem('touchdev_project', JSON.stringify(project));
      toast('Saved');
    }

    // --- File Tabs UI ---
    function renderTabs(){
      filebar.innerHTML = '';
      project.files.forEach(f=>{
        const t = document.createElement('div');
        t.className = 'tab' + (f.id===project.activeId?' active':'');
        const input = document.createElement('input');
        input.value = f.name; input.title = 'Tap to rename';
        input.onchange = ()=>{ f.name = sanitizeFilename(input.value)||f.name; renderTabs(); persist(); };
        const close = document.createElement('span');
        close.className = 'x'; close.textContent = '✕';
        close.onclick = (ev)=>{ ev.stopPropagation(); removeFile(f.id); };
        t.appendChild(input); t.appendChild(close);
        t.onclick = ()=>{ setActive(f.id); };
        filebar.appendChild(t);
      });
      // quick add buttons
      const addJs = document.createElement('button'); addJs.className='btn'; addJs.textContent='+ JS'; addJs.onclick=()=>{ const nf={id:uid(), name:suggestName('js'), content:''}; project.files.push(nf); setActive(nf.id); persist(); };
      const addHtml = document.createElement('button'); addHtml.className='btn'; addHtml.textContent='+ HTML'; addHtml.onclick=()=>{ const nf={id:uid(), name:suggestName('html'), content:defaultHtmlStarter()}; project.files.push(nf); setActive(nf.id); persist(); };
      const addCss = document.createElement('button'); addCss.className='btn'; addCss.textContent='+ CSS'; addCss.onclick=()=>{ const nf={id:uid(), name:suggestName('css'), content:defaultCssStarter()}; project.files.push(nf); setActive(nf.id); persist(); };
      filebar.append(addJs, addHtml, addCss);
    }

    function suggestName(ext){
      ext = ext||'js';
      if(ext==='html'){
        if(!project.files.some(f=>/\.html$/i.test(f.name))){ return 'index.html'; }
        let i=1; while(project.files.some(f=>f.name===`page${i}.html`)) i++; return `page${i}.html`;
      }
      if(ext==='css'){
        if(!project.files.some(f=>/\.css$/i.test(f.name))){ return 'styles.css'; }
        let i=1; while(project.files.some(f=>f.name===`styles${i}.css`)) i++; return `styles${i}.css`;
      }
      let i=1; while(project.files.some(f=>f.name===`file${i}.js`)) i++; return `file${i}.js`;
    }
    function sanitizeFilename(s){ return (s||'').replace(/[^\w\.-]/g,'_'); }

    function removeFile(id){
      if(project.files.length===1){ toast('At least one file required'); return; }
      const idx = project.files.findIndex(x=>x.id===id);
      if(idx>=0){ project.files.splice(idx,1); if(project.activeId===id){ project.activeId = project.files[0].id; } renderTabs(); loadActiveToEditor(); persist(); }
    }

    function setActive(id){ project.activeId = id; renderTabs(); loadActiveToEditor(); }

    function getActive(){ return project.files.find(f=>f.id===project.activeId); }

    function loadActiveToEditor(){ const f = getActive(); code.value = f.content; refreshGutter(); updateCursor(); }

    function persist(){ saveProject(); }

    // --- Editor behaviors ---
    function refreshGutter(){
      const lines = code.value.split('\n').length;
      let html='';
      for(let i=1;i<=lines;i++) html += i + '\n';
      gutter.textContent = html;
      gutter.scrollTop = code.scrollTop;
    }

    function updateCursor(){
      const pos = code.selectionStart;
      const before = code.value.slice(0,pos);
      const line = before.split('\n').length;
      const col = before.length - before.lastIndexOf('\n');
      $("cursor").textContent = `Ln ${line}, Col ${col}`;
    }

    code.addEventListener('scroll', ()=>{ gutter.scrollTop = code.scrollTop; });
    code.addEventListener('input', ()=>{ refreshGutter(); getActive().content = code.value; persist(); });
    code.addEventListener('keyup', updateCursor);
    code.addEventListener('click', updateCursor);

    // Tab inserts spaces
    code.addEventListener('keydown', (e)=>{
      if(e.key==='Tab'){
        e.preventDefault();
        const start = code.selectionStart, end = code.selectionEnd;
        const v = code.value; const insert = '  ';
        code.value = v.slice(0,start) + insert + v.slice(end);
        code.selectionStart = code.selectionEnd = start + insert.length;
        getActive().content = code.value; refreshGutter(); persist();
      }
      // Ctrl/Cmd + / toggle comment for line
      if((e.ctrlKey||e.metaKey) && e.key === '/'){
        e.preventDefault(); toggleComment();
      }
    });

    function indent(delta){
      const start = code.selectionStart, end = code.selectionEnd;
      const v = code.value;
      const pre = v.slice(0,start), sel = v.slice(start,end), post = v.slice(end);
      const lines = sel.split('\n');
      const mod = lines.map(l => delta>0 ? ('  '+l) : (l.startsWith('  ')? l.slice(2): l)).join('\n');
      code.value = pre + mod + post;
      code.selectionStart = start + (delta>0?2: -2*lines.filter(l=>l.startsWith('  ')).length);
      code.selectionEnd = code.selectionStart + mod.length;
      getActive().content = code.value; refreshGutter(); persist();
    }

    function toggleComment(){
      const start = code.selectionStart, end = code.selectionEnd; const v = code.value;
      const pre = v.slice(0,start), sel = v.slice(start,end), post = v.slice(end);
      const lines = (sel || v.slice(v.lastIndexOf('\n', start-1)+1, v.indexOf('\n', start)>=0? v.indexOf('\n', start): v.length)).split('\n');
      const allCommented = lines.every(l=>l.trim().startsWith('//'));
      const mod = lines.map(l=> allCommented ? l.replace(/^(\s*)\/\//,'$1') : (l.replace(/^(\s*)/,'$1// '))).join('\n');
      let newValue;
      if(sel){ newValue = pre + mod + post; code.selectionStart = start; code.selectionEnd = start + mod.length; }
      else {
        const lineStart = v.lastIndexOf('\n', start-1)+1; const lineEnd = v.indexOf('\n', start); const le = lineEnd<0? v.length: lineEnd;
        newValue = v.slice(0,lineStart) + mod + v.slice(le);
        code.selectionStart = code.selectionEnd = lineStart + mod.length;
      }
      code.value = newValue; getActive().content = code.value; refreshGutter(); persist();
    }

    $("btn-indent").onclick = ()=> indent(1);
    $("btn-outdent").onclick = ()=> indent(-1);
    $("btn-comment").onclick = toggleComment;

    // --- Snippets ---
    const SNIPPETS = [
      { cap:'for loop (index)', body:`for (let i = 0; i < 10; i++) {\n  console.log(i);\n}` },
      { cap:'for..of loop', body:`const arr = [1,2,3];\nfor (const v of arr) {\n  console.log(v);\n}` },
      { cap:'while loop', body:`let n = 5;\nwhile (n > 0) {\n  console.log('n=', n);\n  n--;\n}` },
      { cap:'if / else', body:`if (true) {\n  console.log('yes');\n} else {\n  console.log('no');\n}` },
      { cap:'function', body:`function add(a,b){\n  return a + b;\n}` },
      { cap:'array + map', body:`const doubled = [1,2,3].map(x=>x*2);\nconsole.log(doubled);` },
      { cap:'reduce sum', body:`const sum = [1,2,3,4].reduce((a,b)=>a+b,0);\nconsole.log(sum);` },
      { cap:'class', body:`class Counter{\n  constructor(){ this.n=0; }\n  inc(){ this.n++; }\n}\nconst c=new Counter(); c.inc(); console.log(c.n);` },
      { cap:'async/await', body:`async function main(){\n  const v = await Promise.resolve(42);\n  console.log(v);\n}\nmain();` },
      { cap:'try / catch', body:`try {\n  // risky\n} catch (e) {\n  console.error('Error:', e.message);\n}` },
      { cap:'setInterval', body:`let i=0; const id=setInterval(()=>{\n  console.log('tick', ++i); if(i===5) clearInterval(id);\n}, 500);` },
      { cap:'DOM create', body:`const el = document.createElement('div');\nel.textContent = 'Hello DOM';\ndocument.body.appendChild(el);` },
      { cap:'Canvas starter', body:`const canvas = document.getElementById('cnv') || Object.assign(document.body.appendChild(document.createElement('canvas')), {id:'cnv', width:400, height:200});\nconst ctx = canvas.getContext('2d');\nctx.fillRect(10,10,80,40);` },
      { cap:'fetch (mock)', body:`async function fakeFetch(){ return { json: async ()=>({ ok:true, items:[1,2,3] }) }; }\n(async()=>{ const res = await fakeFetch(); const data = await res.json(); console.log(data); })();` },
      { cap:'print()', body:`function print(...args){ console.log(...args); }` },
    ];

    function renderSnips(){
      const box = $("snips"); box.innerHTML='';
      SNIPPETS.forEach(s=>{
        const d = document.createElement('div'); d.className='snip';
        d.innerHTML = `<div class="cap">${s.cap}</div><pre>${escapeHtml(s.body)}</pre>`;
        d.onclick = ()=> insertSnippet(s.body);
        box.appendChild(d);
      });
    }

    function escapeHtml(s){ return s.replace(/[&<>]/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;"}[c])); }

    function insertSnippet(text){
      const start = code.selectionStart, end = code.selectionEnd; const v = code.value;
      code.value = v.slice(0,start) + text + '\n' + v.slice(end);
      code.selectionStart = code.selectionEnd = start + text.length + 1;
      getActive().content = code.value; refreshGutter(); persist();
      code.focus();
    }

    // --- Runner / Console ---

    function hasHtml(){ return project.files.some(f=>/\.html$/i.test(f.name)); }
    function pickHtmlFile(){ const idx = project.files.findIndex(f=>/^index\.html$/i.test(f.name)); return idx>=0? project.files[idx] : project.files.find(f=>/\.html$/i.test(f.name)); }
    function gatherCss(){ return project.files.filter(f=>/\.css$/i.test(f.name)).map(f=>`/* ${f.name} */\n`+f.content).join('\n\n'); }
    function gatherJs(){ return project.files.filter(f=>/\.js$/i.test(f.name)).map(f=>`// ${f.name}\n`+f.content).join('\n\n'); }
    function buildHtmlPage(){
      const htmlFile = pickHtmlFile(); if(!htmlFile) return null;
      const css = gatherCss(); const js = gatherJs();
      const headInject = `<style>\n${css.replace(/<\//g,'<\\/')}\n</style>`;
      const bodyInject = `<script>\n${js.replace(/<\//g,'<\\/')}\n<\/script>`;
      let doc = htmlFile.content || '<!doctype html><html><head><meta charset="utf-8"></head><body></body></html>';
      // naive inject: add style before </head> and script before </body>
      if(/<\/head>/i.test(doc)) doc = doc.replace(/<\/head>/i, headInject + '\n</head>');
      else doc = doc.replace(/<html[^>]*>/i, '$&\n<head>\n'+headInject+'\n</head>');
      if(/<\/body>/i.test(doc)) doc = doc.replace(/<\/body>/i, bodyInject + '\n</body>');
      else doc = doc.replace(/<\/html>/i, '<body>\n'+bodyInject+'\n</body></html>');
      return doc;
    }

    function buildBundle(){
      return project.files.map(f => `// ==== ${f.name} ====\n` + f.content).join('\n\n');
    }

    function run(){
      consoleEl.innerHTML = '';
      if(hasHtml()){
        const page = buildHtmlPage();
        const instr = `<!DOCTYPE html><html><head><meta charset=\"utf-8\"><script>\n(function(){\n  const send=(type,...args)=>parent.postMessage({type, args: args.map(a=>{try{return JSON.stringify(a);}catch(e){return String(a)}})}, '*');\n  const oldLog=console.log, oldErr=console.error, oldWarn=console.warn;\n  console.log = function(){ send('log', ...arguments); oldLog.apply(console, arguments); };\n  console.warn = function(){ send('warn', ...arguments); oldWarn.apply(console, arguments); };\n  console.error = function(){ send('error', ...arguments); oldErr.apply(console, arguments); };\n  window.onerror = function(msg, src, line, col){ send('error', msg + ' @' + line + ':' + col); };\n  window.print = function(){ console.log.apply(console, arguments); };\n})();\n<\/script></head><body></body></html>`;
        // Merge logging shim into page head
        let doc = page;
        // ensure our shim exists (inject at top of <head>)
        const shim = instr.match(/<script>[\s\S]*?<\/script>/i)[0];
        if(/<head>/i.test(doc)) doc = doc.replace(/<head>/i, '<head>'+shim);
        else doc = '<head>'+shim+'</head>'+doc;
        runner.srcdoc = doc; runner.style.display='none';
        toast('Running (HTML)…');
      } else {
        const userCode = buildBundle();
        const src = `<!DOCTYPE html><html><head><meta charset=\"utf-8\"><script>\n(function(){\n  const send=(type,...args)=>parent.postMessage({type, args: args.map(a=>{try{return JSON.stringify(a);}catch(e){return String(a)}})}, '*');\n  const oldLog=console.log, oldErr=console.error, oldWarn=console.warn;\n  console.log = function(){ send('log', ...arguments); oldLog.apply(console, arguments); };\n  console.warn = function(){ send('warn', ...arguments); oldWarn.apply(console, arguments); };\n  console.error = function(){ send('error', ...arguments); oldErr.apply(console, arguments); };\n  window.onerror = function(msg, src, line, col){ send('error', msg + ' @' + line + ':' + col); };\n  window.print = function(){ console.log.apply(console, arguments); };\n})();\n<\/script></head><body><script>\n${userCode.replace(/<\//g,'<\\/')}\n<\/script></body></html>`;
        runner.srcdoc = src; runner.style.display = 'none';
        toast('Running…');
      }
    }

    function stop(){ runner.srcdoc = '<html></html>'; toast('Stopped'); }

    window.addEventListener('message', (ev)=>{
      const {type, args} = ev.data || {}; if(!type) return;
      logToConsole(type, args);
    });

    function logToConsole(type, args){
      const p = document.createElement('pre'); p.className = 'log ' + (type==='error'?'error': type==='warn'?'warn':'log');
      const tag = document.createElement('span'); tag.className = 'tag'; tag.textContent = type.toUpperCase(); p.appendChild(tag);
      const text = (args||[]).map(a=>{
        try { return JSON.parse(a); } catch(_) { return a; }
      }).map(v=> typeof v === 'string' ? v : JSON.stringify(v)).join(' ');
      p.appendChild(document.createTextNode(text));
      consoleEl.appendChild(p); consoleEl.scrollTop = consoleEl.scrollHeight;
    }

    
    // Console filters & copy
    function matchesFilter(cls){
      if($('cf-log').checked) return cls.includes('log') && !cls.includes('warn') && !cls.includes('error');
      if($('cf-warn').checked) return cls.includes('warn');
      if($('cf-error').checked) return cls.includes('error');
      return true;
    }
    ['cf-all','cf-log','cf-warn','cf-error'].forEach(id=>$(id).addEventListener('change', ()=>{
      [...consoleEl.querySelectorAll('pre.log, pre.warn, pre.error')].forEach(el=>{ el.style.display = matchesFilter(el.className)? '' : 'none'; });
    }));
    $('btn-copy-log').onclick = ()=>{
      const visible = [...consoleEl.querySelectorAll('pre')].filter(el=>el.style.display!=='none').map(el=>el.innerText).join('\n');
      navigator.clipboard.writeText(visible);
      toast('Console copied');
    };

    // REPL
    $("repl").addEventListener('keydown', (e)=>{ if(e.key==='Enter'){ e.preventDefault(); evalInRunner($("repl").value); $("repl").value=''; }});
    $("btn-repl").onclick = ()=>{ evalInRunner($("repl").value); $("repl").value=''; };

    function evalInRunner(code){
      // Inject into the iframe by recreating with an eval payload that runs after existing code
      const original = buildBundle();
      const payload = `${original}\n;try{ console.log((()=>{ ${code}\n})()); }catch(e){ console.error(String(e)); }`;
      const src = `<!DOCTYPE html><html><head><meta charset=\"utf-8\"><script>\n(function(){\n  const send=(type,...args)=>parent.postMessage({type, args: args.map(a=>{try{return JSON.stringify(a);}catch(e){return String(a)}})}, '*');\n  const oldLog=console.log, oldErr=console.error, oldWarn=console.warn;\n  console.log = function(){ send('log', ...arguments); oldLog.apply(console, arguments); };\n  console.warn = function(){ send('warn', ...arguments); oldWarn.apply(console, arguments); };\n  console.error = function(){ send('error', ...arguments); oldErr.apply(console, arguments); };\n  window.onerror = function(msg, src, line, col){ send('error', msg + ' @' + line + ':' + col); };\n  window.print = function(){ console.log.apply(console, arguments); };\n})();\n<\/script></head><body><script>\n${payload.replace(/<\//g,'<\\/')}\n<\/script></body></html>`;
      runner.srcdoc = src;
    }

    // --- Theming & Zoom ---
    $("btn-dark").onclick = ()=>{ app.dataset.theme='dark'; };
    $("btn-light").onclick = ()=>{ app.dataset.theme='light'; };
    let zoom = 1; function applyZoom(){ code.style.fontSize = (14*zoom)+ 'px'; gutter.style.fontSize = (12*zoom)+'px'; }
    $("btn-zoom-in").onclick = ()=>{ zoom = Math.min(1.8, zoom + 0.1); applyZoom(); };
    $("btn-zoom-out").onclick = ()=>{ zoom = Math.max(0.7, zoom - 0.1); applyZoom(); };

    // --- Save/Load/Import/Export ---
    $("btn-save").onclick = saveProject;
    $("btn-download").onclick = ()=>{
      const blob = new Blob([JSON.stringify(project, null, 2)], {type:'application/json'});
      const a = document.createElement('a'); a.download = 'touchdev_project.json'; a.href = URL.createObjectURL(blob); a.click(); URL.revokeObjectURL(a.href);
    };
    $("btn-import").onclick = ()=> $("file-import").click();
    // Preview in new tab (data URL) and Download built HTML (when in HTML mode)
    $("btn-preview").onclick = ()=>{
      if(hasHtml()){
        const page = buildHtmlPage();
        const blob = new Blob([page], {type:'text/html'});
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        setTimeout(()=>URL.revokeObjectURL(url), 15000);
      } else {
        // JS only: open a runner page
        const userCode = buildBundle();
        const src = `<!DOCTYPE html><html><head><meta charset=\"utf-8\"></head><body><script>\n${userCode.replace(/<\\\//g,'<\\\\/')}\n<\\/script></body></html>`;
        const blob = new Blob([src], {type:'text/html'});
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        setTimeout(()=>URL.revokeObjectURL(url), 15000);
      }
    };
    $("btn-build-html").onclick = ()=>{
      const page = hasHtml()? buildHtmlPage() : (`<!doctype html><html><head><meta charset=\"utf-8\"></head><body><script>\n${buildBundle().replace(/<\\\//g,'<\\\\/')}\n<\\/script></body></html>`);
      const blob = new Blob([page], {type:'text/html'});
      const a = document.createElement('a'); a.download = hasHtml()? 'build.html' : 'bundle.html'; a.href = URL.createObjectURL(blob); a.click(); URL.revokeObjectURL(a.href);
    };

    $("file-import").addEventListener('change', async (e)=>{
      const file = e.target.files[0]; if(!file) return;
      const text = await file.text();
      try { const data = JSON.parse(text); if(!data.files) throw new Error('Invalid project'); project = data; project.activeId = project.activeId || project.files[0].id; renderTabs(); loadActiveToEditor(); persist(); toast('Imported'); }
      catch(err){ toast('Import failed'); }
      e.target.value = '';
    });

    // --- Buttons ---
    $("btn-run").onclick = run;
    $("btn-stop").onclick = stop;
    $("btn-clear").onclick = ()=>{ consoleEl.innerHTML=''; };

    // --- Tiny toast ---
    let toastTimer=null; function toast(msg){
      let t = document.getElementById('toast'); if(!t){ t=document.createElement('div'); t.id='toast'; document.body.appendChild(t); t.style.position='fixed'; t.style.bottom='18px'; t.style.left='50%'; t.style.transform='translateX(-50%)'; t.style.background='rgba(0,0,0,.75)'; t.style.color='white'; t.style.padding='10px 14px'; t.style.borderRadius='12px'; t.style.boxShadow='var(--shadow)'; t.style.zIndex=99; t.style.fontWeight='700';}
      t.textContent = msg; t.style.opacity='1'; clearTimeout(toastTimer); toastTimer=setTimeout(()=>{ t.style.opacity='0'; }, 900);
    }

    // --- Init ---
    renderTabs(); renderSnips(); loadActiveToEditor(); refreshGutter(); applyZoom();

  })();
  