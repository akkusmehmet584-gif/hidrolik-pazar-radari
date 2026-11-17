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
