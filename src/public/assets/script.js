$(window).load(function() {
   var theme = document.getElementById("meta-theme");
    if(theme){
     theme.style.display="none";
     const color = theme.innerText;
     document.querySelector('meta[name="theme-color"]').setAttribute('content',color);
     document.querySelector('meta[name="theme-color"]').setAttribute('msapplication-navbutton-color',color);
    }
 $("#object").fadeOut();
 $("#loading").fadeOut();
 var frames = document.getElementsByTagName('iframe');
for (var frame of frames) {
    frame.setAttribute("sandbox", "allow-forms allow-popups");
}
});