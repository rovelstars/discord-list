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
   if(navigator.onLine==true){
    Toast.fire({
     icon:'success',
     title: 'Network Connection Back!'
    });
   }
   online=navigator.onLine;
  }
 }, 1000);
});