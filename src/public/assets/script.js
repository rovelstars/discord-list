$(window).load(function() {
 $("#object").fadeOut();
 $("#loading").fadeOut();
 var frames = document.getElementsByTagName('iframe');
for (var frame of frames) {
    frame.setAttribute("sandbox", "allow-forms allow-popups");
}
});
navigator.registerProtocolHandler(
    'web+rdl', 'https://discord.rovelstars.com', 'Rovel Discord List');