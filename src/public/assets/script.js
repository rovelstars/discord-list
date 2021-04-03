$(window).load(function() {
 // will first fade out the loading animation
 $("#object").fadeOut();
 // will fade out the whole DIV that covers the website.
 $("#loading").delay(100).fadeOut("slow");
 var frames = document.getElementsByTagName('iframe');
for (var frame of frames) {
    frame.setAttribute("sandbox", "allow-forms allow-popups");
}
});