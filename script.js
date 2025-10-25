// Classes for dialogues
// === SCROLL OBSERVER SYSTEM ===
class ScrollAnimator {
  constructor() {
    this.observer = null;
    this.init();
  }

  init() {
    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            this.animateElement(entry.target);
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin: "0px 0px -50px 0px",
      }
    );
  }

  animateElement(element) {
    const animationType = element.getAttribute("data-animate");
    const stagger = element.getAttribute("data-stagger");

    // Random left/right for variety
    const randomAnimations = ["left", "right", "up", "scale"];
    const randomAnim =
      randomAnimations[Math.floor(Math.random() * randomAnimations.length)];

    const finalAnimation =
      animationType === "random" ? randomAnim : animationType;

    element.classList.add(`animate-${finalAnimation}`);
    if (stagger) {
      element.classList.add(`animate-stagger-${stagger}`);
    }

    // Stop observing after animation
    this.observer.unobserve(element);
  }

  observeElement(element, animationType = "up", stagger = null) {
    element.setAttribute("data-animate", animationType);
    if (stagger) {
      element.setAttribute("data-stagger", stagger);
    }
    this.observer.observe(element);
  }

  observeAll(selector, animationType = "up") {
    const elements = document.querySelectorAll(selector);
    elements.forEach((element, index) => {
      this.observeElement(element, animationType, (index % 5) + 1);
    });
  }
}

class AspectModal {
  constructor() {
    this.modal = null;
    this.callback = null;
  }

  show(callback) {
    this.callback = callback;
    this.createModal();
  }

  createModal() {
    this.modal = document.createElement("div");
    this.modal.className = "modal-overlay";
    this.modal.innerHTML = `
            <div class="modal-content">
                <h3>Create New Aspect</h3>
                <input type="text" id="aspectNameInput" placeholder="e.g., Coding, Health, Learning" maxlength="20">
                <p class="char-count"><span id="charCount">0</span>/20 characters</p>
                <div class="modal-actions">
                    <button class="cancel-btn">Cancel</button>
                    <button class="create-btn">Create Aspect</button>
                </div>
            </div>
        `;

    document.body.appendChild(this.modal);
    this.addEventListeners();
  }

  addEventListeners() {
    const cancelBtn = this.modal.querySelector(".cancel-btn");
    const createBtn = this.modal.querySelector(".create-btn");
    const input = this.modal.querySelector("#aspectNameInput");
    const charCount = this.modal.querySelector("#charCount");
    input.addEventListener("input", () => {
      charCount.textContent = input.value.length;
    });
    cancelBtn.onclick = () => this.close();
    createBtn.onclick = () => {
      const name = input.value.trim();
      const formattedname = TextFormatter.formatAspectName(name);
      if (formattedname) {
        this.callback(formattedname);
        this.close();
        toast.success(`Aspect Created Sucessfullly`);
      } else {
        toast.error("Please enter an aspect name!");
      }
    };

    // Close on overlay click
    this.modal.onclick = (e) => {
      if (e.target === this.modal) this.close();
    };

    // Enter key to create
    input.onkeypress = (e) => {
      if (e.key === "Enter") createBtn.click();
    };

    input.focus();
  }

  close() {
    if (this.modal) {
      document.body.removeChild(this.modal);
      this.modal = null;
    }
  }
}
class Toast {
  constructor() {
    this.container = null;
    this.createContainer();
  }

  createContainer() {
    this.container = document.createElement("div");
    this.container.className = "toast-container";
    document.body.appendChild(this.container);
  }

  show(message, type = "info", duration = 3000) {
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    toast.innerHTML = ` 
            <div class="toast-content">
                <span class="toast-message">${message}</span>
                <button class="toast-close" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
       `;

    this.container.appendChild(toast);

    // Animate in
    setTimeout(() => toast.classList.add("show"), 10);

    // Auto remove
    if (duration > 0) {
      setTimeout(() => {
        toast.classList.remove("show");
        setTimeout(() => toast.remove(), 300);
      }, duration);
    }

    return toast;
  }

  // Shortcut methods
  success(message, duration = 3000) {
    return this.show(message, "success", duration);
  }

  error(message, duration = 4000) {
    return this.show(message, "error", duration);
  }

  info(message, duration = 3000) {
    return this.show(message, "info", duration);
  }

  warning(message, duration = 4000) {
    return this.show(message, "warning", duration);
  }
}
// Delete Confirmation Modal Class
class ConfirmModal {
  constructor() {
    this.modal = null;
    this.callback = null;
  }

  show(message, callback, func) {
    this.callback = callback;
    this.createModal(message, func);
  }

  createModal(message, func) {
    this.modal = document.createElement("div");
    this.modal.className = "modal-overlay";
    if (func === "Delete") {
      this.modal.innerHTML = `
            <div class="modal-content">
            <h3>Confirm Delete</h3>
            <p>${message}</p>
            <br>
            <div class="modal-actions">
            <button class="cancel-btn">Cancel</button>
            <button class="confirm-delete-btn">Delete Forever</button>
            </div>
            </div>
            `;
    } else if (func === "Copy") {
      this.modal.innerHTML = `
            <div class="modal-content">
            <h3>Confirm ${func}</h3>
            <p>${message}</p>
            <br>
            <div class="modal-actions">
            <button class="cancel-btn">Cancel</button>
            <button class="confirm-share-btn">Agree</button>
            </div>
            </div>
            `;
    }
    document.body.appendChild(this.modal);
    this.addEventListeners(func);
  }

  addEventListeners(func) {
    const cancelBtn = this.modal.querySelectorAll(".cancel-btn");
    const deleteBtn = this.modal.querySelector(".confirm-delete-btn");
    const shareBtn = this.modal.querySelector(".confirm-share-btn");

    cancelBtn.forEach((btn) => {
      btn.onclick = () => this.close();
    });
    if (func === "Delete") {
      deleteBtn.onclick = () => {
        this.callback();
        toast.success("Deleted Aspect");
        this.close();
      };
    }
    if (func === "Copy") {
      shareBtn.onclick = () => {
        this.callback();
        this.close();
      };
    }
    this.modal.onclick = (e) => {
      if (e.target === this.modal) this.close();
    };
  }

  close() {
    if (this.modal) {
      document.body.removeChild(this.modal);
      this.modal = null;
    }
  }
}
class EditAspectModal {
  constructor() {
    this.modal = null;
    this.callback = null;
    this.currentAspect = null;
  }

  show(aspect, callback) {
    this.callback = callback;
    this.currentAspect = aspect;
    this.createModal(aspect);
  }

  createModal(aspect) {
    this.modal = document.createElement("div");
    this.modal.className = "modal-overlay";
    this.modal.innerHTML = `
            <div class="modal-content">
                <h3>Edit Aspect</h3>
                <input 
                    type="text" 
                    id="editAspectNameInput" 
                    value="${aspect.name}"
                    placeholder="Enter new aspect name"
                    maxlength="20"
                >
                <p class="char-count"><span id="charCount">${aspect.name.length}</span>/20 characters</p>
                <div class="modal-actions">
                    <button class="cancel-btn">Cancel</button>
                    <button class="save-btn">Save Changes</button>
                </div>
            </div>
       `;

    document.body.appendChild(this.modal);
    this.addEventListeners();
  }

  addEventListeners() {
    const cancelBtn = this.modal.querySelector(".cancel-btn");
    const saveBtn = this.modal.querySelector(".save-btn");
    const input = this.modal.querySelector("#editAspectNameInput");
    const charCount = this.modal.querySelector("#charCount");
    cancelBtn.onclick = () => this.close();
    saveBtn.onclick = () => this.saveChanges(input.value.trim());
    input.addEventListener("input", () => {
      charCount.textContent = input.value.length;
    });

    // Close on overlay click
    this.modal.onclick = (e) => {
      if (e.target === this.modal) this.close();
    };

    // Enter key to save
    input.onkeypress = (e) => {
      if (e.key === "Enter") saveBtn.click();
    };

    // Select all text for easy editing
    input.select();
    input.focus();
  }

  saveChanges(newName) {
    // Use your validation functions
    const formattedname = TextFormatter.formatAspectName(newName);
    if (!formattedname || formattedname.length < 2) {
      toast.info("No changes made!");

      this.close();
      return;
    }

    if (formattedname === this.currentAspect.name) {
      toast.info("No changes made!");
      this.close();
      return;
    }

    // All validations passed - save the changes
    this.callback(this.currentAspect.id, formattedname);
    toast.success("Changes saved!");

    this.close();
  }

  close() {
    if (this.modal) {
      document.body.removeChild(this.modal);
      this.modal = null;
      this.currentAspect = null;
    }
  }
}
class TextFormatter {
  static formatAspectName(text) {
    return format(text); // Your proven function
  }

  static formatUserName(text) {
    return format(text); // Same or different function
  }
}

// Format names and aspect function
function format(str) {
  str = str
    .trim() // Remove leading/trailing spaces
    .replace(/ {2,}/g, " ") // First, combine multiple spaces into one
    .split(/\s+/) // Split into words by any whitespace
    .map((word) => {
      // Convert the entire word to lowercase first for consistency
      let cleanWord = word.toLowerCase();
      // Remove any remaining non-name characters (allow letters, numbers, hyphen, apostrophe, period)
      cleanWord = cleanWord.replace(/[^a-z0-9'.-]/g, "");
      // Remove any resulting double hyphens, apostrophes, or periods (e.g., from trying to use them consecutively)
      cleanWord = cleanWord.replace(/([.'-])[.'-]+/g, "$1"); // Replace 2+ consecutive punctuation with one
      // Finally, capitalize the first letter of the cleaned word
      return cleanWord.charAt(0).toUpperCase() + cleanWord.slice(1);
    })
    .join(" ") // Join back with a single space
    // Final cleanup: Remove any leading/trailing punctuation that might have been created
    .replace(/^[.'-]+|[.'-]+$/g, "") // Remove punctuation from start/end of the whole name
    .replace(/(\s[.'-]+|[.'-]+\s)/g, " "); // Remove punctuation that is surrounded by spaces or vice versa
  return str;
}

// Initialize once
const toast = new Toast();
const confirmModal = new ConfirmModal();
const aspectModal = new AspectModal();
const editAspectModal = new EditAspectModal();
const scrollAnimator = new ScrollAnimator();
document.addEventListener("DOMContentLoaded", function () {
  personalization();
  showaspects();
  updateAspectCounter();
  const toast = new Toast();
  window.toast = toast;
  setTimeout(() => {
    if (localStorage.getItem("ggUserName")) {
      toast.success(
        `${getTimeBasedGreeting()} ${localStorage.getItem("ggUserName")}`
      );
    } else {
      toast.success(`${getTimeBasedGreeting()}`);
    }
  }, 1800);
  scrollAnimator.observeAll("[data-animate]");
});

// To decide view page check if username is available
function personalization() {
  let userName = localStorage.getItem("ggUserName");
  if (!userName) {
    document.getElementById("personalPage").style.display = "block";
    document.querySelector(".app-main").style.display = "none";
    document.getElementById("appDashBoard").style.display = "none";
    setInterval(() => {
      document.getElementById(
        "personal-Mq"
      ).textContent = `${getRandomQuote()}`;
    }, 3000);
  } else {
    switchToApp();
    document.getElementById("personalPage").style.display = "none";
    document.querySelector(".app-main").style.display = "block";
    document.getElementById("appDashBoard").style.display = "block";
    document.getElementById("dashboard-Mq").textContent = `${getRandomQuote()}`;
    setInterval(() => {
      document.getElementById(
        "dashboard-Mq"
      ).textContent = `${getRandomQuote()}`;
    }, 6000);
  }
  scrollAnimator.observeAll("[data-animate]");
}

// Run app after filling  form or if form data is present
function startApp() {
  const name = document.getElementById("firstName").value.trim();
  if (name) {
    switchToApp();
    let userName = format(name);
    localStorage.setItem("ggUserName", userName);
    console.log(localStorage.getItem("ggUserName"));
    document.getElementById(
      "welcomeName"
    ).textContent = `Welcome ${localStorage.getItem("ggUserName")}`;
    document.getElementById("dashboard-Mq").textContent = `${getRandomQuote()}`;
    setInterval(() => {
      document.getElementById(
        "dashboard-Mq"
      ).textContent = `${getRandomQuote()}`;
    }, 6000);
  } else {
    toast.error(`Name can not be empty`);
  }
}
function switchToApp() {
  document.body.className = "app";
  document.getElementById("personalPage").style.display = "none";
  document.querySelector(".app-main").style.display = "block";
  document.getElementById("appDashBoard").style.display = "block";
}
// Helper function to get entry count for a specific aspect
function getTotalEntries(aspect) {
  if (!aspect.entries) return 0;
  return aspect.entries.reduce(
    (total, day) => total + day.entriesToday.length,
    0
  );
}
// Ensure proper display of entries and aspects date
function formatDateHeader(dateString) {
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();

  if (dateString === today) return "Today";
  if (dateString === yesterday) return "Yesterday";

  // Format as "Jan 15, 2024"
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
// Greet user
function getTimeBasedGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
}
document.getElementById("greeting").textContent = `${getTimeBasedGreeting()}`;
document.getElementById(
  "welcomeName"
).textContent = `Welcome ${localStorage.getItem("ggUserName")}`;
// Create prompt to collect aspect name(Temporary option)
function showAddAspectPrompt() {
  //   const aspectName = new AspectModal().show(())
  //   prompt(
  //     "What aspect do you want to track? (e.g., Coding, Health, Learning)"
  //   );

  //   if (aspectName && aspectName.trim() !== "") {
  aspectModal.show((aspectName) => {
    addAspect(aspectName.trim());
  });
  //   }
}
// Save to localStorage for persisting data(Remove addAspect(name))
function addAspect(name) {
  saveAspectToStorage(name);
}
function saveAspectToStorage(name) {
  // Get existing aspects or create empty array
  const aspects = JSON.parse(localStorage.getItem("growthGrid-aspects")) || [];

  // Add new aspect
  aspects.unshift({
    id: "aspect_" + Date.now() + Math.random(),
    name: name,
    created: new Date().toDateString(),
    entries: [],
    // time: new Date()/
    time: new Date().toLocaleTimeString(),
  });

  // Save back to localStorage
  localStorage.setItem("growthGrid-aspects", JSON.stringify(aspects));
  updateAspectCounter();
  showaspects();
}

function formatTimeDisplay(timeString) {
  if (!timeString) return "";

  // Handle different time formats
  const time = new Date("1970-01-01 " + timeString);
  //   if (isNaN(time)) return timeString; // Fallback to original

  return time
    .toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: false,
    })
    .replace(/:\d+ /, " "); // Remove seconds
}
function getLastEntryPreview(aspect) {
  if (!aspect.entries || aspect.entries.length === 0) {
    return {
      text: "No entries yet. Click to start logging!",
      time: "",
    };
  }

  const mostRecentDay = aspect.entries[0];
  const mostRecentEntry = mostRecentDay.entriesToday[0];

  const truncatedText =
    mostRecentEntry.text.length > 60
      ? mostRecentEntry.text.substring(0, 60) + "..."
      : mostRecentEntry.text;

  const dateHeader = formatDateHeader(mostRecentDay.date);
  const formattedTime = formatTimeDisplay(mostRecentEntry.time);

  // Combine date and time
  let displayTime;
  if (dateHeader === "Today") {
    displayTime = `${dateHeader} ${formattedTime}`; // "2:30 PM"
  } else if (dateHeader === "Yesterday") {
    displayTime = `${dateHeader} ${formattedTime}`; // Or "Yesterday, 2:30 PM" if you want both
  } else {
    displayTime = `${dateHeader} ${formattedTime}`; // "Jan 15, 2024"
  }

  return {
    text: truncatedText,
    time: displayTime,
  };
}
// Display aspects
function showaspects() {
  const aspects = JSON.parse(localStorage.getItem("growthGrid-aspects")) || [];
  const aspectDiv = document.getElementById("aspectDiv");
  const addButton = document.getElementById("addEntry");

  //    <p onclick="showAddAspectPrompt()" style="text-decoration: underline; color:blue; cursor:pointer;" data-animate="fade">No aspect yet. Tap to create</p>
  if (aspects.length === 0) {
    addButton.style.display = "none"; // Hide button
    aspectDiv.innerHTML = `
          <div class="empty-state" onclick="showAddAspectPrompt()" 
                 style="text-decoration: underline; color: blue; cursor: pointer; 
                        text-align: center; padding: 3rem;">
                No aspects yet. Tap to create your first one!
            </div>
        
            `;
  } else {
    aspectDiv.innerHTML = aspects
      .map((item, index) => {
        const dateHeader = formatDateHeader(item.created);
        const formattedTime = formatTimeDisplay(item.time);

        // Combine date and time
        let displayTime;
        if (dateHeader === "Today") {
          displayTime = `${dateHeader} ${formattedTime}`; // "2:30 PM"
        } else if (dateHeader === "Yesterday") {
          displayTime = `${dateHeader} ${formattedTime}`; // Or "Yesterday, 2:30 PM" if you want both
        } else {
          displayTime = `${dateHeader} ${formattedTime}`; // "Jan 15, 2024"
        }

        const lastEntry = getLastEntryPreview(item);

        return `
          <div class="aspect-card" onclick="openAspectlog('${item.id}', '${
          item.name
        }')" data-stagger="${(index % 5) + 1}" data-animate="random">
            <div class="aspect-header">
            <p>${displayTime}</p>
            <h3>${item.name}</h3>
              <div class="aspect-menu" onclick="event.stopPropagation(); toggleMenu('${
                item.id
              }')">
<svg class="three-dots" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="6" r="1.5" fill="currentColor"/>
            <circle cx="12" cy="12" r="1.5" fill="currentColor"/>
            <circle cx="12" cy="18" r="1.5" fill="currentColor"/>
        </svg>
        <div class="menu-options" id="menu-${item.id}">
        <button onclick="editAspect('${item.id}')">Edit</button>
        ${
          getTotalEntries(item) > 0
            ? `
                      <button onclick="shareAspect('${item.id}')" class="share-btn">
        Share
    </button>
    <button onclick="downloadAspect('${item.id}')" class="download-btn">
        Download
    </button>
    `
            : ``
        }

                  <button onclick="showDeleteConfirm('${item.id}', '${
          item.name
        }')" class="delete-btn">Delete</button>
                </div>
              </div>
            </div>
                        <div class="last-entry-preview">
              <p class="last-entry-text">${lastEntry.text}</p>
              <span class="last-entry-time">${lastEntry.time}</span>
            </div>
            <p class="no-entry">${getTotalEntries(item)} entries</p> 
            
            </div>
            `;
      })
      .join("");
    addButton.style.display = "flex"; // Show button
  }

  scrollAnimator.observeAll(".aspect-card");
}
// Open aspect to create and save entries

function openAspectlog(aspectId, aspectName) {
  document.getElementById("appDashBoard").style.display = "none";
  document.getElementById("addEntry").style.display = "none";
  let loggingPage = document.getElementById("loggingPage");
  if (!loggingPage) {
    loggingPage = document.createElement("div");
    loggingPage.id = "loggingPage";
    document.body.appendChild(loggingPage);
  }

  loggingPage.innerHTML = `
    <section class="logging-page">
        <header class="log-header">
            <button onclick="closeAspectLog()"><svg class="back-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M19 12H5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M12 19L5 12L12 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg></button>
        <button onclick="editAspectLog('${aspectId}')">
        <svg  class="edit-icon" width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M11.3333 2.00004C11.5083 1.82508 11.7162 1.68704 11.9448 1.59338C12.1734 1.49972 12.4184 1.45215 12.6656 1.45326C12.9128 1.45437 13.1574 1.50414 13.3851 1.59967C13.6128 1.69521 13.8192 1.83474 13.9923 2.01076C14.1653 2.18679 14.3016 2.39577 14.3931 2.62537C14.4846 2.85497 14.5295 3.10067 14.5251 3.34787C14.5208 3.59507 14.4673 3.83904 14.3679 4.0655C14.2685 4.29196 14.1251 4.49633 13.946 4.66671L6.47933 12.1334L2.666 13.3334L3.866 9.52004L11.3333 2.00004Z" 
        stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        </button>

        <button onclick="shareAspect('${aspectId}')"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M4 12V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M16 6L12 2L8 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M12 2V15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg></button>
        <button onclick="downloadAspect('${aspectId}')"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M7 10L12 15L17 10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M12 15V3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg></button>

        <button onclick="showDeleteLogConfirm('${aspectId}', '${aspectName}')">
        <svg  class="del-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 6H5H21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6H19Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M10 11V17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M14 11V17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        </button>
        </header>
        <main class="log-main">
        <h2 data-animate="left">${aspectName}</h2>
        <br>
            <div class="entry-input-area" data-animate="up">
                <textarea id="entryText" placeholder="What did you do today in ${aspectName}?" rows="4">

                </textarea>
                <button onclick="saveEntry('${aspectId}')">Save</button>

            </div>
            <div class="entries-list" id="entriesList">
                
            </div>
        </main>
    </section>
    `;
  loggingPage.style.display = "block";

  // Display entries as you save
  showEntriesForAspect(aspectId);
  scrollAnimator.observeAll("[data-animate]");
}
// Close aspect log
function closeAspectLog() {
  // Show dashboard, hide logging page
  document.getElementById("appDashBoard").style.display = "block";

  const loggingPage = document.getElementById("loggingPage");
  if (loggingPage) {
    loggingPage.style.display = "none";
  }

  // Refresh aspects to show any new entries
  showaspects();
  updateAspectCounter();
}
// Save user entries
function saveEntry(aspectId) {
  const entryText = document.getElementById("entryText").value.trim();
  if (!entryText) {
    toast.error("Please write something");
    return;
  }
  const aspects = JSON.parse(localStorage.getItem("growthGrid-aspects")) || [];
  const aspectIndex = aspects.findIndex((a) => a.id === aspectId);
  if (aspectIndex !== -1) {
    const today = new Date().toDateString();
    const todayEntry = aspects[aspectIndex].entries.find(
      (entry) => new Date(entry.date).toDateString() === today
    );
    if (todayEntry) {
      todayEntry.entriesToday.unshift({
        text: entryText,
            id: "entry_" + Date.now() + Math.random(),

        time: new Date().toLocaleTimeString(),
      });
    } else {
      aspects[aspectIndex].entries.unshift({
        date: today,
        entriesToday: [
          {
            text: entryText,
            id: "entry_" + Date.now() + Math.random(),
            time: new Date().toLocaleTimeString(),
          },
        ],
      });
    }
    // console.log(entriesToday.id);
    localStorage.setItem("growthGrid-aspects", JSON.stringify(aspects));
    document.getElementById("entryText").value = "";
    showEntriesForAspect(aspectId);
    toast.success(`Entry saved`)
    console.log(`Entry Saved`);
  }
}
// Display entries for respective aspects
function showEntriesForAspect(aspectId) {
  const aspects = JSON.parse(localStorage.getItem("growthGrid-aspects")) || [];
  const aspect = aspects.find((a) => a.id === aspectId);
  const entriesList = document.getElementById("entriesList");
  if (!aspect || aspect.entries.length === 0) {
    entriesList.innerHTML = `<p data-animate="fade">No entries yet. Start logging above!</p>`;
    return;
  }

  entriesList.innerHTML = aspect.entries
    .map(
      (dayEntry, dayIndex) => `
    <div class="day-group" data-animate="up" data-stagger="${
      (dayIndex % 3) + 1
    }">
        <h3 class="day-header">${formatDateHeader(dayEntry.date)}</h3>
        ${dayEntry.entriesToday
          .map(
            (entry, entryIndex) => ` 
          <div class="entry-item" data-animate="random" data-stagger="${
            (entryIndex % 5) + 1
          }">
            <span class="entry-time">${entry.time}</span>
            <button class="delete-entry-btn" onclick="deleteEntry('${aspectId}', '${
              dayEntry.date
            }', '${entry.id}')">
                                 <svg  class="del-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 6H5H21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6H19Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M10 11V17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M14 11V17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>       
                            </button>
            <p class="entry-text">${entry.text}</p>
          </div>
          `
          )
          .join("")}
          </div>

    `
    )
    .join("");
  scrollAnimator.observeAll(".day-group");
  scrollAnimator.observeAll(".entry-item");
}

// Show confirm before deleting entry
// Show delete confirmation

function performEntryDeletion(aspectId, date, entryId) {
  const aspects = JSON.parse(localStorage.getItem("growthGrid-aspects")) || [];
  const aspectIndex = aspects.findIndex((a) => a.id === aspectId);

  if (aspectIndex !== -1) {
    const dayEntryIndex = aspects[aspectIndex].entries.findIndex(
      (day) => day.date === date
    );

    if (dayEntryIndex !== -1) {
      // Remove the specific entry
      aspects[aspectIndex].entries[dayEntryIndex].entriesToday = aspects[
        aspectIndex
      ].entries[dayEntryIndex].entriesToday.filter(
        (entry) => entry.id !== entryId
      );

      // Remove the entire day if no entries left
      if (
        aspects[aspectIndex].entries[dayEntryIndex].entriesToday.length === 0
      ) {
        aspects[aspectIndex].entries.splice(dayEntryIndex, 1);
      }

      localStorage.setItem("growthGrid-aspects", JSON.stringify(aspects));
      showEntriesForAspect(aspectId); // Refresh
    }
  }
}
// Delete entry

function deleteEntry(aspectId, date, entryId) {
  // Get the entry text for the confirmation message
  const aspects = JSON.parse(localStorage.getItem("growthGrid-aspects")) || [];
  const aspect = aspects.find((a) => a.id === aspectId);
  const dayEntry = aspect?.entries.find((day) => day.date === date);
  const entry = dayEntry?.entriesToday.find((e) => e.id === entryId);

  const entryPreview =
    entry?.text.length > 30
      ? entry.text.substring(0, 7) + "..."
      : entry?.text || "this entry";
//  let entryPreview = "this entry";
    
//     if (entry && entry.text) {
//         // Get first 3-4 words instead of characters
//         const words = entry.text.split(' ').slice(0, 4).join(' ');
//         entryPreview = words + (entry.text.split(' ').length > 4 ? '...' : '');
//     }
  confirmModal.show(
    `Delete"${entryPreview}"? This action cannot be undone.`,
    () => performEntryDeletion(aspectId, date, entryId),
    `Delete`
  );
}
// Toggle menu visibility
function toggleMenu(aspectId) {
  const allMenus = document.querySelectorAll(".menu-options");
  allMenus.forEach((menu) => {
    if (menu.id !== `menu-${aspectId}`) {
      menu.classList.remove("show");
    }
  });

  const menu = document.getElementById(`menu-${aspectId}`);
  menu.classList.toggle("show");
}

// Close menus when clicking elsewhere
document.addEventListener("click", function () {
  const allMenus = document.querySelectorAll(".menu-options");
  allMenus.forEach((menu) => {
    menu.classList.remove("show");
  });
});

// Update aspect count
function updateAspectCounter() {
  const aspects = JSON.parse(localStorage.getItem("growthGrid-aspects")) || [];
  const count = aspects.length;
  document.getElementById("aspectCounter").textContent = count;

  return count;
}
// Show confirm before deleting aspects
function showDeleteConfirm(aspectId, aspectName) {
  // First, get the actual aspect to count entries properly
  const aspects = JSON.parse(localStorage.getItem("growthGrid-aspects")) || [];
  const aspect = aspects.find((a) => a.id === aspectId);
  const entryCount = aspect ? getTotalEntries(aspect) : 0;

  confirmModal.show(
    `Do you want to delete "${aspectName}"? This process is irreversible and will delete all ${entryCount} entries.`,
    () => deleteAspect(aspectId),
    `Delete`
  );
}
// Actually delete aspect
function deleteAspect(aspectId) {
  const aspects = JSON.parse(localStorage.getItem("growthGrid-aspects")) || [];
  const updatedAspects = aspects.filter((aspect) => aspect.id !== aspectId);

  localStorage.setItem("growthGrid-aspects", JSON.stringify(updatedAspects));
  updateAspectCounter();

  showaspects(); // Refresh the display
  console.log(`Aspect ${aspectId} deleted`);
}
// Show confirm before deleting aspects from log page

function showDeleteLogConfirm(aspectId, aspectName) {
  // First, get the actual aspect to count entries properly
  const aspects = JSON.parse(localStorage.getItem("growthGrid-aspects")) || [];
  const aspect = aspects.find((a) => a.id === aspectId);
  const entryCount = aspect ? getTotalEntries(aspect) : 0;

  confirmModal.show(
    `Do you want to delete "${aspectName}"? This process is irreversible and will delete all ${entryCount} entries.`,
    () => deleteAspectLog(aspectId),
    `Delete`
  );
}
// Actually delete the aspect from log page
function deleteAspectLog(aspectId) {
  const aspects = JSON.parse(localStorage.getItem("growthGrid-aspects")) || [];
  const updatedAspects = aspects.filter((aspect) => aspect.id !== aspectId);

  localStorage.setItem("growthGrid-aspects", JSON.stringify(updatedAspects));
  window.location.reload(); // Refresh the display
}

// Edit aspect name
function editAspect(aspectId) {
  const aspects = JSON.parse(localStorage.getItem("growthGrid-aspects")) || [];
  const aspect = aspects.find((a) => a.id === aspectId);

  if (!aspect) {
    toast.error("Aspect not found!");
    return;
  }

  editAspectModal.show(aspect, (id, newName) => {
    updateAspectName(id, newName);
  });
}
// Update aspect name  as you save edit
function updateAspectName(aspectId, newName) {
  const aspects = JSON.parse(localStorage.getItem("growthGrid-aspects")) || [];
  const aspectIndex = aspects.findIndex((a) => a.id === aspectId);

  if (aspectIndex !== -1) {
    aspects[aspectIndex].name = newName;
    localStorage.setItem("growthGrid-aspects", JSON.stringify(aspects));
    showaspects(); // Refresh the display
    console.log(`Aspect renamed to: ${newName}`);
  }
}
// Edit aspect name from entry page
function editAspectLog(aspectId) {
  const aspects = JSON.parse(localStorage.getItem("growthGrid-aspects")) || [];
  const aspect = aspects.find((a) => a.id === aspectId);

  if (!aspect) {
    toast.error("Aspect not found!");
    return;
  }

  editAspectModal.show(aspect, (id, newName) => {
    updateAspectNameLog(id, newName);
  });
}
// Update Name from entry page
function updateAspectNameLog(aspectId, newName) {
  const aspects = JSON.parse(localStorage.getItem("growthGrid-aspects")) || [];
  const aspectIndex = aspects.findIndex((a) => a.id === aspectId);

  if (aspectIndex !== -1) {
    aspects[aspectIndex].name = newName;
    localStorage.setItem("growthGrid-aspects", JSON.stringify(aspects));
    openAspectlog(aspectId, newName);
    // showaspects(); // Refresh the display
    console.log(`Aspect renamed to: ${newName}`);
  }
}
// Format and prepare data for trasfer
function formatAspectForExport(aspect) {
  let output = `GROWTHGRID EXPORT - ${aspect.name}\n`;
  output += `Generated: ${new Date().toLocaleString()}\n`;
  output += `Total Entries: ${getTotalEntries(aspect)}\n`;
  output += "=".repeat(50) + "\n\n";

  aspect.entries.forEach((day) => {
    output += `${formatDateHeader(day.date)}\n`;
    output += "-".repeat(30) + "\n";

    day.entriesToday.forEach((entry) => {
      output += `[${entry.time}] ${entry.text}\n`;
    });

    output += "\n";
  });

  return output;
}
// Copy to clipboard fallback for share and download
function copyToClipboard(text) {
  navigator.clipboard
    .writeText(text)
    .then(() => {
      toast.success("Aspect data copied to clipboard!");
    })
    .catch(() => {
      // Ultimate fallback - prompt
      const textArea = document.createElement("textarea");
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      toast.success("Aspect data copied to clipboard!");
    });
}
// Ask user if they  want to copy to clipboard
function askTocopyToClipboard(data, aspectName, err) {
  confirmModal.show(
    `${err}. Copy your aspect: "${aspectName}" data to clipboard?`,
    () => {
      copyToClipboard(data);
      console.log(`copied`);
    },
    `Copy`
  );
}
// Download entry for an aspect
function downloadAspect(aspectId) {
  const aspects = JSON.parse(localStorage.getItem("growthGrid-aspects")) || [];
  const aspect = aspects.find((a) => a.id === aspectId);

  if (!aspect) return;
  if (getTotalEntries(aspect) === 0) {
    toast.error(`"${aspect.name}" has no entries to Download`);
    return;
  }

  const aspectData = formatAspectForExport(aspect);
  const blob = new Blob([aspectData], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");

  a.href = url;
  a.download = `GrowthGrid-${aspect.name}-${
    new Date().toISOString().split("T")[0]
  }.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  toast.success("Aspect Downloaded successfully!", 5000);
}

// Share entry for aspects
async function shareAspect(aspectId) {
  const aspects = JSON.parse(localStorage.getItem("growthGrid-aspects")) || [];
  const aspect = aspects.find((a) => a.id === aspectId);

  if (!aspect) return;
  if (getTotalEntries(aspect) === 0) {
    toast.error(`"${aspect.name}" has no entries to Share`);
    return;
  }
  const aspectData = formatAspectForExport(aspect);

  // Use Web Share API if available
  if (navigator.share) {
    try {
      await navigator.share({
        title: `My ${aspect.name} Progress - GrowthGrid`,
        text: aspectData,
      });
      toast.success("Aspect Shared successfully!", 5000);
    } catch (error) {
      toast.error(`Share failed`);
      // Fallback to copy to clipboard
      askTocopyToClipboard(aspectData, aspect.name, error);
    }
  } else {
    // Fallback
    askTocopyToClipboard(aspectData, aspect.name);
  }
}
// Function for motivational quotes
const motivationQuotes = [
  "Small progress is still progress. Keep going!",
  "The expert in anything was once a beginner. You're on your way!",
  "Consistency beats intensity every time. One step at a time!",
  "Your future self will thank you for starting today.",
  "Growth happens outside your comfort zone. You're doing great!",
  "Every master was once a disaster. Keep learning!",
  "You don't have to be great to start, but you have to start to be great.",
  "The only bad workout is the one that didn't happen. Same with growth!",
  "Your journey is unique. Don't compare your chapter 1 to someone's chapter 20.",
  "Progress over perfection. Every entry counts!",
  "The hardest part is showing up. You're already here!",
  "One day or day one? You chose day one. Proud of you!",
  "Success is the sum of small efforts repeated daily.",
  "You're building habits that will shape your future. Keep stacking!",
  "The man who moves mountains begins by carrying small stones.",
  "Your potential is endless. Keep unlocking it!",
  "Every entry is a step toward your best self.",
  "Growth is never by mere chance; it's the result of forces working together.",
  "You're not just dreaming - you're doing. That's powerful! ⚡",
  "The only way to do great work is to love what you're doing -Steve Jobs",
  "Inspiration comes from the most unexpected places",
];
function getRandomQuote() {
  const randomIndex = Math.floor(Math.random() * motivationQuotes.length);
  return motivationQuotes[randomIndex];
}
// To detect copy and paste in page
document.addEventListener("copy", (e) => {
  toast.success("Copied to clipboard");
});

document.addEventListener("paste", (e) => {
  toast.success("Pasted text!");
});
