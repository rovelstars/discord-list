$(window).load(function() {
 $("#object").fadeOut();
 $("#loadingtext").fadeOut();
 $("#loadingimage").delay(100).fadeOut("slow");
 var frames = document.getElementsByTagName('iframe');
for (var frame of frames) {
    frame.setAttribute("sandbox", "allow-forms allow-popups");
}
});