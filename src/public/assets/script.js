//makes sure the whole site is loaded
  $(window).load(function() {
    // will first fade out the loading animation
    $("#object").fadeOut();
    $("#arc-broker").fadeOut();
    // will fade out the whole DIV that covers the website.
    $("#loading").delay(100).fadeOut("slow");
    
    if (typeof(Storage) !== "undefined") {
     if(localStorage.allowcookies!="yes"){
  swal({
   title: "Hey New Visitor!",
   text: "Allow us to introduce RDL!",
   icon: "https://cdn.discordapp.com/attachments/775220204699385886/811836708734631946/robot.svg",
   buttons: ["I know this site 😏", "Introduce to me!"]
  }).then((value)=>{
 if(value==true){
  swal({
   title: "We are all-in-one!",
   text: "Yeah, RDL is meant to be a list having everything from discord, from emojis, users, servers, bots (shortform E-USB)",
   button: "That's cool!"
  }).then(()=>{swal({
    title: "We have currency!",
    text: "Rovel Coins are used throughout the site and they are very important! But don't worry, RDL Discord Bot can provide you coins so you are ready to go!",
    button: "Wow!"
   }).then(()=>{
    swal({
     title: "Login Fast!",
     text: "Login if you want to add your own E-USB or want to vote any bot or server! If you're going to comment to any bot, user or any server, you will be going to login to third party service \"Discus™\" at that place.",
     button: "Sure!"
    }).then(()=>{swal({
 title: "We use cookies! 🍪",
 text: "Cause they are tasty 😋!",
 icon: "info",
 button: "That's Awesome! 😎"
})})})}).then(()=>{
 localStorage.allowcookies = "yes";
})
  }
   if(value!=true){
    swal({
 title: "We use cookies! 🍪",
 text: "Cause they are tasty 😋!",
 icon: "info",
 button: "That's Awesome! 😎"
}).then(()=>{localStorage.allowcookies = "yes"})
   }
  })
}} else {
  swal({
   title: "Uh Oh!",
   text: "Your browser dosen't supports local storage! Please use another browser or update your browser!",
   icon: "error",
   button: "RIP.."
  }).then(()=>{
   window.close();
  })
}
  })
  