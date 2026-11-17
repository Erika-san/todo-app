// テーマ切り替え。選んだテーマは localStorage に残し、?theme=pixel でも指定できる
(function(){
  var KEY='todo-theme', THEMES=['blue','pixel','royal'];
  function current(){return document.documentElement.getAttribute('data-theme')||'blue'}
  function apply(t){
    if(THEMES.indexOf(t)<0)t='blue';
    document.documentElement.setAttribute('data-theme',t);
    try{localStorage.setItem(KEY,t)}catch(e){}
    document.querySelectorAll('[data-theme-set]').forEach(function(b){
      b.setAttribute('aria-pressed',String(b.getAttribute('data-theme-set')===t));
    });
  }
  function init(){
    document.querySelectorAll('[data-theme-set]').forEach(function(b){
      b.addEventListener('click',function(){apply(b.getAttribute('data-theme-set'))});
    });
    apply(current());
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
