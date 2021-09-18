// a tweaker (wip) to add RDL to discord website and app
var $ = function (r) {
  return document.querySelector(r);
};
var $$ = function (r) {
  return Array.from(document.querySelectorAll(r));
};

$('[aria-label="User Settings"]').addEventListener("click", showRDLmenu);
function showRDLmenu() {
  setTimeout(() => {
    var RDLmenu = document.createElement("div");
    RDLmenu.classList.add("header-2RyJ0Y");
    RDLmenu.tabIndex = "-1";
    RDLmenu.role = "button";
    RDLmenu.innerText = "Rovel Discord List";
    var settingsmenu = $(".side-8zPYf6");
    settingsmenu.insertBefore(RDLmenu, $(".header-2RyJ0Y"));
    var RDLmenu_info = document.createElement("div");
    RDLmenu_info.classList.add("item-PXvHYJ", "themed-OHr7kt");
    RDLmenu_info.setAttribute("role", "tab");
    RDLmenu_info.setAttribute("aria-controls", "rdl-info");
    RDLmenu_info.tabIndex = "-1";
    RDLmenu_info.ariaLabel = "Info";
    RDLmenu_info.innerText = "Info";
    RDLmenu.after(RDLmenu_info);

    var discordsettingswindow = $(
      ".contentColumn-2hrIYH.contentColumnDefault-1VQkGM"
    );

    RDLmenu_info.addEventListener("click", () => {
      $(".selected-3s45Ha").tabIndex = "-1";
      $(".selected-3s45Ha").classList.remove("selected-3s45Ha");
      RDLmenu_info.classList.add("selected-3s45Ha");
      RDLmenu_info.setAttribute("aria-selected", "true");
      RDLmenu_info.tabIndex = "0";
      discordsettingswindow.innerHTML =
        '<div><div id="rdl-info-window"><div class="sectionTitle-2vauyC"><h1 class="colorStandard-2KCXvj size14-e6ZScH h1-1qdNzo title-3sZWYQ defaultColor-1_ajX0 defaultMarginh1-peT3GC">Welcome Back!</h1></div></div></div>';
        $("div.item-PXvHYJ.themed-OHr7kt")
      });
  }, 100);
}
