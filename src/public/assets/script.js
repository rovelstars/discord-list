$(window).load(function() {
 var theme = document.getElementById("meta-theme");
 if (theme) {
  theme.style.display = "none";
  const color = theme.innerText;
  document.querySelector('meta[name="theme-color"]').setAttribute('content', color);
  document.querySelector('meta[name="theme-color"]').setAttribute('msapplication-navbutton-color', color);
  var nav = document.getElementsByClassName("navbar is-fixed-top");
  nav[0].style.backgroundColor = color;
 }
 $("#object").fadeOut();
 $("#loading").fadeOut();
 var frames = document.getElementsByTagName('iframe');
 for (var frame of frames) {
  frame.setAttribute("sandbox", "allow-forms allow-popups");
  frame.height="100%";
  frame.width="100%";
 }
 var online = true;
 const Toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
  didOpen: (toast) => {
   toast.addEventListener('mouseenter', Swal.stopTimer)
   toast.addEventListener('mouseleave', Swal.resumeTimer)
  }
 });
 setInterval(() => {
  if (navigator.onLine != online) {
   if (navigator.onLine == false) {
    Toast.fire({
     icon: 'error',
     title: 'No Network!'
    });
   }
   if (navigator.onLine == true) {
    Toast.fire({
     icon: 'success',
     title: 'Network Connection Back!'
    });
   }
   online = navigator.onLine;
  }
 }, 1000);

 if (typeof(Storage) !== undefined) {
  if (localStorage.allowcookies != "yes") {
   Swal.fire({
    title: "Hey New Visitor!",
    text: "Allow us to introduce RDL!",
    imageUrl: "https://discord.rovelstars.com/assets/img/bot/logo.svg",
    imageWidth: 300,
    imageHeight: 300,
    showCancelButton: false,
    showDenyButton: true,
    didRender: twemoji.parse,
    confirmButtonText: 'Introduce to me!',
    denyButtonText: 'I know this site 😏',
    reverseButtons: true
   }).then((result) => {
    if (result.isConfirmed) {
     Swal.fire({
      title: "We are all-in-one!",
      text: "Yeah, RDL is meant to be a list having everything from discord, from emojis, users, servers, bots (shortform E-USB)",
      confirmButtonText: "That's cool!"
     }).then(() => {
      Swal.fire({
       title: "We have currency!",
       text: "Rovel Coins are used throughout the site and they are very important! But don't worry, RDL Discord Bot can provide you coins so you are ready to go!",
       confirmButtonText: "Wow!"
      }).then(() => {
       Swal.fire({
        title: "Login Fast!",
        text: "Login if you want to add your own E-USB or want to vote any bot or server! If you're going to comment to any bot, user or any server, you will be going to login to third party service \"Discus™\" at that place.",
        confirmButtonText: "Sure!"
       }).then(() => {
        Swal.fire({
         title: "We use cookies! 🍪",
         text: "Cause they are tasty 😋!",
         icon: "info",
         didRender: twemoji.parse,
         confirmButtonText: "That's Awesome! 😎"
        })
       })
      })
     }).then(() => {
      localStorage.allowcookies = "yes";
     })
    }
    else {
     Swal.fire({
      title: "We use cookies! 🍪",
      text: "Cause they are tasty 😋!",
      icon: "info",
      didRender: twemoji.parse,
      confirmButtonText: "That's Awesome! 😎"
     }).then(() => { localStorage.allowcookies = "yes" })
    }
   })
  }
 } else {
  Swal.fire({
   title: "Uh Oh!",
   text: "Your browser dosen't supports local storage! Please use another browser or update your browser!",
   icon: "error",
   button: "RIP.."
  }).then(() => {
   window.close();
  })
 }
});

function onHover()
{
    $("#menuImg").attr('src', 'https://discord.rovelstars.com/assets/img/bot/pet.gif');
}

function offHover()
{
    $("#menuImg").attr('src', 'https://discord.rovelstars.com/assets/img/bot/logo.svg');
}