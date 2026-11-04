/** Paints a saved personal theme before the store frame is parsed. No network and no reload. */
export function themeBootScript(chips: unknown) {
  const json = JSON.stringify(chips).replace(/</g, '\\u003c');
  return `(function(){try{var id=localStorage.getItem('aurelle_theme');if(!id)return;var all=${json};var chip=null;for(var i=0;i<all.length;i++)if(all[i].id===id)chip=all[i];if(!chip)return;var root=document.documentElement;var vars=window.innerWidth<768?Object.assign({},chip.desktop,chip.mobile):chip.desktop;for(var k in vars)root.style.setProperty(k,vars[k]);root.dataset.theme=id;root.dataset.themePaint=id;}catch(e){}})();`;
}
