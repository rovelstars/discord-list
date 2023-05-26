// Function to select a single element using a CSS selector
var $ = function (selector) {
  return document.querySelector(selector);
};

// Function to select multiple elements using a CSS selector
var $$ = function (selector) {
  return Array.from(document.querySelectorAll(selector));
};

// Event listener for User Settings button click
$('[aria-label="User Settings"]').addEventListener("click", showRDLmenu);

function showRDLmenu() {
  setTimeout(() => {
    // Create RDLmenu element
    var RDLmenu = document.createElement("div");
    RDLmenu.classList.add("header-2RyJ0Y");
    RDLmenu.tabIndex = "-1";
    RDLmenu.role = "button";
    RDLmenu.innerText = "Rovel Discord List";

    // Find the settings menu container
    var settingsmenu = $(".side-8zPYf6");
    // Insert RDLmenu before the first header in the settings menu
    settingsmenu.insertBefore(RDLmenu, $(".header-2RyJ0Y"));

    // Create RDLmenu_info element
    var RDLmenu_info = document.createElement("div");
    RDLmenu_info.classList.add("item-PXvHYJ", "themed-OHr7kt");
    RDLmenu_info.setAttribute("role", "tab");
    RDLmenu_info.setAttribute("aria-controls", "rdl-info");
    RDLmenu_info.tabIndex = "-1";
    RDLmenu_info.ariaLabel = "Info";
    RDLmenu_info.innerText = "Info";

    // Insert RDLmenu_info after RDLmenu
    RDLmenu.after(RDLmenu_info);

    var discordsettingswindow = $(".contentColumn-2hrIYH.contentColumnDefault-1VQkGM");

    RDLmenu_info.addEventListener("click", () => {
      // Remove selected class from the current selected tab
      $(".selected-3s45Ha").tabIndex = "-1";
      $(".selected-3s45Ha").classList.remove("selected-3s45Ha");
      
      // Add selected class to RDLmenu_info
      RDLmenu_info.classList.add("selected-3s45Ha");
      RDLmenu_info.setAttribute("aria-selected", "true");
      RDLmenu_info.tabIndex = "0";
      
      // Update the content of discordsettingswindow
      discordsettingswindow.innerHTML = '<div><div id="rdl-info-window"><div class="sectionTitle-2vauyC"><h1 class="colorStandard-2KCXvj size14-e6ZScH h1-1qdNzo title-3sZWYQ defaultColor-1_ajX0 defaultMarginh1-peT3GC">Welcome Back!</h1></div></div></div>';
    });
  }, 100);
}
