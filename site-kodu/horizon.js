(function(){
var S="https://www.horizonendustri.com/",OID=S+"#organization",
L="https://static.ticimax.cloud/66926/Uploads/HeaderTasarim/Header3/a5b6ae78-9716-4c91-b21c-1f62c0d5d455.jpg",
G="https://static.ticimax.cloud/66926/uploads/bankalogo/hidrolik-ve-pnomatik-malzemeleri.jpg",
TEL="+90-506-640-47-42",FX="+90-332-239-20-89",
AD="Horizon Endüstri",YZ="Horizon Endüstri Teknik Ekibi";
function B(){return document.querySelectorAll('script[type="application/ld+json"]');}
function R(e){try{return JSON.parse(e.textContent);}catch(x){return null;}}
function W(e,o){e.textContent=JSON.stringify(o);}
function k(){var b=B(),f=0,w=0;for(var i=0;i<b.length;i++){var o=R(b[i]);if(!o)continue;if(o["@type"]=="WebSite")w=1;if(o["@type"]!="Organization")continue;f=1;
o["@context"]="https://schema.org";o["@id"]=OID;o.name=AD;o.url=S;o.logo=L;
var c=[].concat(o.contactPoint||[{}]);for(var j=0;j<c.length;j++){c[j]["@type"]="ContactPoint";c[j].telephone=TEL;c[j].faxNumber=FX;c[j].contactType="customer service";c[j].areaServed="TR";c[j].availableLanguage="tr";delete c[j].contactOption;}
o.contactPoint=c;o.telephone=TEL;o.foundingDate="2022";o.sameAs=["https://www.facebook.com/profile.php?id=61596057406317","https://www.tiktok.com/@horizonendustri11","https://www.linkedin.com/company/horizon-end%C3%BCstri/"];if(o.founders&&!o.founder){o.founder=o.founders;delete o.founders;}W(b[i],o);}
if(f&&!w&&location.pathname=="/"){var s=document.createElement("script");s.type="application/ld+json";s.textContent=JSON.stringify({"@context":"https://schema.org","@type":"WebSite","@id":S+"#website","url":S,"name":AD,"inLanguage":"tr-TR","publisher":{"@id":OID}});document.head.appendChild(s);}}
function T(v){var d=new Date(v);if(isNaN(d))return"";var a=["Ocak","Şubat","Mart","Nisan","Mayıs","Haziran","Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık"];return d.getDate()+" "+a[d.getMonth()]+" "+d.getFullYear();}
function g(){if(location.pathname.indexOf("/blog/")!==0)return;var b=B(),y=null;for(var i=0;i<b.length;i++){var o=R(b[i]);if(!o)continue;
if(o["@type"]=="BreadcrumbList"&&o.itemListElement){o.itemListElement.forEach(function(x){if(typeof x.item=="string"&&x.item.indexOf("http:")===0)x.item="https:"+x.item.substring(5);});W(b[i],o);}
if(o["@type"]=="BlogPosting"||o["@type"]=="Article"){if(!o.author||!o.author.name)o.author={"@type":"Organization","name":YZ,"url":S+"HAKKIMIZDA"};
o.publisher={"@type":"Organization","@id":OID,"name":AD,"logo":{"@type":"ImageObject","url":L}};
if(!o.image||String(o.image).indexOf("resim-hazirlaniyor")>-1)o.image=G;o.inLanguage="tr-TR";W(b[i],o);y=o;}}
var h=document.querySelector("h1.blog-h1");if(y&&h&&!document.getElementById("hzBlogImza")){var p1=T(y.datePublished),p2=T(y.dateModified),t=YZ+(p1?" · Yayın: "+p1:"");if(p2&&p2!=p1)t+=" · Güncelleme: "+p2;
var p=document.createElement("p");p.id="hzBlogImza";p.textContent=t;p.style.cssText="color:#5a6772;font-size:14px;margin:6px 0 16px;";h.parentNode.insertBefore(p,h.nextSibling);}}
function r(){try{k();}catch(x){}try{g();}catch(x){}}
if(document.readyState=="loading")document.addEventListener("DOMContentLoaded",r);else r();
})();
/* Urun sayfasi: Offer'a kargo ve iade bilgisi ekler (urunSemasi() sonrasinda calisir) */
(function(){
if(!/-\d+(\/|$)/.test(location.pathname))return;
var deneme=0;
function iade(){return{"@type":"MerchantReturnPolicy","applicableCountry":"TR","returnPolicyCategory":"https://schema.org/MerchantReturnFiniteReturnWindow","merchantReturnDays":14,"returnMethod":"https://schema.org/ReturnByMail","returnFees":"https://schema.org/ReturnFeesCustomerResponsibility","merchantReturnLink":"https://www.horizonendustri.com/iade"};}
function kargo(){return{"@type":"OfferShippingDetails","shippingRate":{"@type":"MonetaryAmount","value":0,"currency":"TRY"},"shippingDestination":{"@type":"DefinedRegion","addressCountry":"TR"},"deliveryTime":{"@type":"ShippingDeliveryTime","handlingTime":{"@type":"QuantitativeValue","minValue":0,"maxValue":2,"unitCode":"DAY"},"transitTime":{"@type":"QuantitativeValue","minValue":1,"maxValue":3,"unitCode":"DAY"}}};}
function isle(){
  var b=document.querySelectorAll('script[type="application/ld+json"]');
  for(var i=0;i<b.length;i++){var o;try{o=JSON.parse(b[i].textContent);}catch(x){continue;}
    if(!o||o["@type"]!="Product"||!o.offers)continue;
    var of=[].concat(o.offers);
    for(var j=0;j<of.length;j++){var f=of[j];if(!f)continue;
      f.hasMerchantReturnPolicy=iade();
      var p=parseFloat(f.price);
      if((f.priceCurrency||"TRY")=="TRY"&&p>=3500)f.shippingDetails=kargo();else delete f.shippingDetails;}
    o.offers=Array.isArray(o.offers)?of:of[0];
    b[i].textContent=JSON.stringify(o);return true;}
  return false;}
function dongu(){if(isle()||++deneme>20)return;setTimeout(dongu,500);}
if(document.readyState=="complete")dongu();else window.addEventListener("load",dongu);
})();
