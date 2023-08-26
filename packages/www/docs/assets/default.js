(function () {
  var $=document.querySelectorAll.bind(document);
  $(".sidebar_nav h4").forEach(function(it){it.onclick=function(){this.className=this.className?"":"closed"}})
  window.backToTop=function(){window.scrollTo(0,0);$(".fixed_cell_inner").forEach(function(it){it.scrollTo(0,0)});return false}
  var s=0;var l=$("#breadcrumb_logo").item(0);
  addEventListener("scroll",function(){
    if(!s)s=setTimeout(function(){s=0;l.hidden=window.scrollY<60});
  });
})();
