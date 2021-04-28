$(window).load(function() {
 $("#object").fadeOut();
 $("#loading").fadeOut();
 var frames = document.getElementsByTagName('iframe');
for (var frame of frames) {
    frame.setAttribute("sandbox", "allow-forms allow-popups");
}
});