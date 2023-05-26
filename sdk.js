// Shorthand for selecting a single element
const $ = (selector) => document.querySelector(selector);

// Shorthand for selecting multiple elements
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

// Function to create a new element with optional attributes
const createElement = (tag, attributes = {}) => {
  const element = document.createElement(tag);
  Object.entries(attributes).forEach(([key, value]) => {
    element.setAttribute(key, value);
  });
  return element;
};

// Function to append an array of elements to a parent element
const appendElements = (parent, elements) => {
  elements.forEach((element) => {
    parent.appendChild(element);
  });
};

const showRDLMenu = () => {
  setTimeout(() => {
    const settingsMenu = $(".side-8zPYf6");

    // Create the RDL menu
    const RDLMenu = createElement("div", {
      class: "header-2RyJ0Y",
      tabIndex: "-1",
      role: "button",
      textContent: "Rovel Discord List"
    });
    settingsMenu.insertBefore(RDLMenu, $(".header-2RyJ0Y"));

    // Create the Info tab
    const RDLMenuInfo = createElement("div", {
      class: "item-PXvHYJ themed-OHr7kt",
      role: "tab",
      "aria-controls": "rdl-info",
      tabIndex: "-1",
      "aria-label": "Info",
      textContent: "Info"
    });
    RDLMenu.after(RDLMenuInfo);

    // Create the content window for the Info tab
    const discordSettingsWindow = $(".contentColumn-2hrIYH.contentColumnDefault-1VQkGM");
    const RDLInfoWindow = createElement("div", {
      id: "rdl-info-window",
      innerHTML: '<div class="sectionTitle-2vauyC"><h1 class="colorStandard-2KCXvj size14-e6ZScH h1-1qdNzo title-3sZWYQ defaultColor-1_ajX0 defaultMarginh1-peT3GC">Welcome Back!</h1></div>'
    });
    discordSettingsWindow.innerHTML = "";
    discordSettingsWindow.appendChild(RDLInfoWindow);

    // Set up click event listener for the Info tab
    RDLMenuInfo.addEventListener("click", () => {
      const selectedTab = $(".selected-3s45Ha");
      selectedTab.tabIndex = "-1";
      selectedTab.classList.remove("selected-3s45Ha");

      RDLMenuInfo.classList.add("selected-3s45Ha");
      RDLMenuInfo.setAttribute("aria-selected", "true");
      RDLMenuInfo.tabIndex = "0";
    });
  }, 100);
};

$('[aria-label="User Settings"]').addEventListener("click", showRDLMenu);
