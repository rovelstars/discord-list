$(window).load(function() {
 // will first fade out the loading animation
 $("#object").fadeOut();
 $("iframe").delay(1000).fadeOut();
 // will fade out the whole DIV that covers the website.
 $("#loading").delay(100).fadeOut("slow");
});