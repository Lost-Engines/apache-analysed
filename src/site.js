const toggle=document.querySelector('.nav-toggle'),nav=document.querySelector('#navigation');
toggle?.addEventListener('click',()=>{const open=toggle.getAttribute('aria-expanded')!=='true';toggle.setAttribute('aria-expanded',String(open));nav.classList.toggle('open',open);});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&nav?.classList.contains('open')){nav.classList.remove('open');toggle.setAttribute('aria-expanded','false');toggle.focus();}});
for(const button of document.querySelectorAll('[data-palette]'))button.addEventListener('click',()=>{
 for(const item of document.querySelectorAll('[data-palette]'))item.setAttribute('aria-pressed',String(item===button));
 const early=button.dataset.palette==='1995',image=document.querySelector('#palette-picture');image.src=`../images/palette-${early?'1995':'1997'}.png`;image.alt=early?'A map on a magenta background, in the earlier palette source':'An F-16 cockpit screenshot with a stick figure holding an Abu Dabi sign';
 document.querySelector('#palette-caption').textContent=early?'The earlier image, dated 2 March 1995, survives on the 1996 discs.':'The replacement image is dated 22 May 1997 and appears on the later discs.';
});
