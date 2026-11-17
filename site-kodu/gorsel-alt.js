/* Gorsel alt metinleri: bos logo alt'i ve urun adinda inc isareti (") olan urunlerde kesilen galeri alt'larini duzeltir */
(function(){
function isle(){
  var lg=document.querySelectorAll("img.header_logo, img.header-logo");
  for(var i=0;i<lg.length;i++){if(!(lg[i].getAttribute("alt")||"").trim())lg[i].setAttribute("alt","Horizon Endüstri");}
  var m=window.productDetailModel;if(!m)return;
  var ad=(m.productName||(m.product&&m.product.urunAdi)||"").replace(/\s+/g," ").trim();if(!ad)return;
  var im=document.querySelectorAll('img[src*="/urunresimleri/"], img[data-src*="/urunresimleri/"], img[data-original*="/urunresimleri/"]');
  for(var j=0;j<im.length;j++){var a=(im[j].getAttribute("alt")||"").trim();
    if(!a||a.length<ad.length*0.6||/["”]$/.test(a))im[j].setAttribute("alt",ad);}
}
function dongu(n){try{isle();}catch(x){}if(n>0)setTimeout(function(){dongu(n-1);},1500);}
if(document.readyState=="loading")document.addEventListener("DOMContentLoaded",function(){dongu(3);});else dongu(3);
})();
