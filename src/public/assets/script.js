var run = function () {
  var emojiparse = function (body) {
    return globalThis?.twemoji?.parse(body, emojiopts);
  };
  var theme = $("#meta-theme");
  if (theme) {
    theme.style.display = "none";
    const color = theme.innerText;
    document
      .querySelector('meta[name="theme-color"]')
      .setAttribute("content", color);
    document
      .querySelector('meta[name="theme-color"]')
      .setAttribute("msapplication-navbutton-color", color);
    $(".navbar").style.backgroundColor = color;
  }
  
  var frames = document.getElementsByTagName("iframe");
  for (var frame of frames) {
    frame.setAttribute("sandbox", "allow-forms allow-popups");
  }
  var online = true;
  const Toast = Swal.mixin({
    toast: true,
    position: "top-end",
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    didOpen: (toast) => {
      toast.addEventListener("mouseenter", Swal.stopTimer);
      toast.addEventListener("mouseleave", Swal.resumeTimer);
    },
  });
  window.addEventListener("error", function (event) {
    Toast.fire({
      icon: "error",
      title: "Something went wrong!",
      text: event.message,
    });
  });
  setInterval(() => {
    if (navigator.onLine != online) {
      if (navigator.onLine == false) {
        Toast.fire({
          icon: "error",
          title: "No Network!",
        });
      }
      if (navigator.onLine == true) {
        Toast.fire({
          icon: "success",
          title: "Network Connection Back!",
        });
      }
      online = navigator.onLine;
    }
  }, 1000);

  if (typeof Storage !== undefined) {
    if (localStorage.allowcookies != "yes") {
      Swal.fire({
        title: "Hey New Visitor!",
        text: "Allow us to introduce RDL!",
        imageUrl: "/assets/img/bot/logo.svg",
        imageWidth: 100,
        imageHeight: 100,
        showCancelButton: false,
        showDenyButton: true,
        didRender: emojiparse,
        confirmButtonText: "<span>Introduce to me!</span>",
        denyButtonText: "<span>I know this site 😏</span>",
        reverseButtons: true,
      }).then((result) => {
        if (result.isConfirmed) {
          Swal.fire({
            title: "We are all-in-one!",
            text: "Yeah, RDL is a list of everything about Discord, from emojis, users, servers, templates & bots!",
            confirmButtonText: "<span>That's awesome!</span>",
          })
            .then(() => {
              Swal.fire({
                title: "We have currency!",
                text: "Rovel Coins are used throughout the site and they are very important! But don't worry, RDL Discord Bot can provide you coins so you are ready to go!",
                confirmButtonText: "<span>Wow!</span>",
              }).then(() => {
                Swal.fire({
                  title: "Login Fast!",
                  text: "Login if you want to contribute to RDL, or just change your preferences! You will be added to the support server in order to keep a note of your account data (for syncing purposes)",
                  confirmButtonText: "<span>Sure!</span>",
                }).then(() => {
                  Swal.fire({
                    title: "We use cookies! 🍪",
                    text: "Cause they are tasty 😋!",
                    icon: "info",
                    didRender: emojiparse,
                    confirmButtonText: "<span>That's Awesome! 😎</span>",
                  });
                });
              });
            })
            .then(() => {
              localStorage.allowcookies = "yes";
            });
        } else {
          Swal.fire({
            title: "We use cookies! 🍪",
            text: "Cause they are tasty 😋!",
            icon: "info",
            didRender: emojiparse,
            confirmButtonText: "<span>That's Awesome! 😎</span>",
          }).then(() => {
            localStorage.allowcookies = "yes";
          });
        }
      });
    }
  } else {
    Swal.fire({
      title: "Uh Oh!",
      text: "Your browser dosen't supports local storage! Please use another browser or update your browser!",
      icon: "error",
      confirmButtonText: "<span>RIP..</span>",
    }).then(() => {
      window.close();
    });
  }

  var logout = $("#logout-link");
  if (logout) {
    logout.href = `/logout?return=${encodeURI(window.location)}`;
  }
  globalThis?.twemoji?.parse(document.body, emojiopts);
  // Check for click events on the navbar burger icon
  $(".navbar-burger").addEventListener("click", function () {
    // Toggle the "is-active" class on both the "navbar-burger" and the "navbar-menu"
    $(".navbar-burger").classList.toggle("is-active");
    $(".navbar-menu").classList.toggle("is-active");
  });
  $(".navbar-link").addEventListener("click", function () {
    $(".navbar-dropdown").classList.toggle("is-hidden-touch");
  });
};

setTimeout(run, localStorage.allowCookies=="yes"?0:3000);

function onHover() {
  $("rdllogo").src = "/assets/img/bot/pet.gif";
}

function offHover() {
  $("#rdllogo").src = "/assets/img/bot/logo.svg";
}
