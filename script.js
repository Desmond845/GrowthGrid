let isLogging = false; // ← LOOP KILLER

async function logErrorToEmail(errorData) {
  // PREVENT RECURSIVE CALLS
  if (isLogging) {
    console.warn("Error logger already running. Skipping.");
    return;
  }
  isLogging = true;
  console.log(isLogging);
  // Console fallback (always safe)
  try {
    console.error("GrowthGrid ERROR:", {
      time: new Date().toISOString(),
      ...errorData,
      url: location.href,
    });
  } catch (e) {}

  const payload = {
    _subject: "GrowthGrid Error Report",
    _captcha: "false",
    App: "GrowthGrid",
    Version: "1.1",
    User: "daxtech",
    Time: new Date().toISOString(),
    Error: errorData.message || "Unknown",
    Location: errorData.location || "Unknown",
    UserAgent: navigator.userAgent,
    URL: location.href,
    Type: errorData.type || "unknown",
  };

  // Try AJAX
  try {
    const res = await fetch(
      "https://formsubmit.co/ajax/akugbedesmond845@gmail.com",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );
    if (res.ok) {
      isLogging = false;
      return;
    }
  } catch (err) {
    // Silent fail
  }

  // Fallback: sendBeacon (in try/catch)
  try {
    const formData = new FormData();
    Object.entries(payload).forEach(([k, v]) => {
      formData.append(k, String(v));
    });
    formData.append("_template", "table");

    const sent = navigator.sendBeacon(
      "https://formsubmit.co/akugbedesmond845@gmail.com",
      formData
    );
    if (sent) console.log("Beacon sent");
  } catch (err) {
    console.warn("Beacon failed too");
  } finally {
    isLogging = false; // Always reset
  }
}

// === ERROR HANDLERS (ONE EACH) ===
function setupGlobalErrorHandler() {
  // Global JS errors
  window.onerror = function (msg, url, line, col, error) {
    logErrorToEmail({
      message: error?.message || String(msg),
      location: `${url}:${line}:${col}`,
      type: "js_error",
    });
    return true;
  };

  // Promise rejections
  window.addEventListener("unhandledrejection", function (event) {
    logErrorToEmail({
      message: event.reason?.message || String(event.reason),
      location: "promise",
      type: "promise_rejection",
    });
    event.preventDefault();
  });
}

// DOM Ready
document.addEventListener("DOMContentLoaded", setupGlobalErrorHandler());
window.onerror = (msg, url, line) => {
  toast.error("Something broke! Reloading...{countdown}", "4000");
  setTimeout(() => location.reload(), 45000);
};
let lastDeleted = null;
// === BROADCAST CHANNEL SETUP ===
const bc = new BroadcastChannel("growthgrid-sync");

// Send update to all tabs
function broadcastUpdate(type, data) {
  bc.postMessage({ type, data });
}

// Listen for updates from other tabs
bc.onmessage = (event) => {
  const { type, data } = event.data;
  if (
    type === "ASPECT_ADDED" ||
    type === "ASPECT_UPDATED" ||
    type === "ASPECT_DELETED" ||
    (type === "ASPECT_PINED" &&
      document.getElementById("loggingPage").style.display === "none")
  ) {
    showaspects();
    updateAspectCounter();
  }
  if (document.getElementById("loggingPage")) {
    if (
      type === "ENTRY_ADDED" &&
      document.getElementById("loggingPage").style.display === "block"
    ) {
      openAspectlog(data.id, data.name);
    } else if (
      type === "ENTRY_ADDED" &&
      document.getElementById("loggingPage").style.display === "none"
    ) {
      showaspects();
    } else if (
      type === "ASPECT_PINNED" &&
      document.getElementById("loggingPage").style.display === "block"
    ) {
      openAspectlog(data.id, data.name);
    } else if (
      type === "ASPECT_PINNED" &&
      document.getElementById("loggingPage").style.display === "none"
    ) {
      showaspects();
      toast.info("Synced from another tab!");
    }
  }
  if (type === "ASPECT_UPDATED" && document.getElementById("entriesList")) {
    updateAspectNameLog(data.id, data.name);
  }

  if (
    type === "ENTRY_ADDED" ||
    (type === "ASPECT_PINNED" && !document.getElementById("entriesList"))
  ) {
    showaspects();
  }
  if (
    [
      "ASPECT_ADDED",
      "ASPECT_UPDATED",
      "ASPECT_DELETED",
      "ASPECT_PINNED",
    ].includes(type)
  ) {
    if (!document.getElementById("entriesList")) {
      showaspects();
      updateAspectCounter();
    }
  }

  // ENTRY CHANGE → refresh log if open
  if (type === "ENTRY_ADDED" || type === "ENTRY_DELETED") {
    if (document.getElementById("entriesList")) {
      showEntriesForAspect(data.aspectId || currentAspectId);
    } else {
      showaspects(); // update preview
    }
  }
  toast.info("Synced!");
};

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
    document.body.classList.toggle("modal-active");
  }

  createModal() {
    this.modal = document.createElement("div");
    this.modal.className = "modal-overlay";
    this.modal.innerHTML = `
            <div class="modal-content">
                <h3 style="text-align: center;">Create New Aspect</h3>
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
      const aspects =
        JSON.parse(localStorage.getItem("growthGrid-aspects")) || [];
      if (
        aspects.some(
          (a) => a.name.toLowerCase() === formattedname.toLowerCase()
        )
      ) {
        toast.error(`Aspect "${formattedname}" already exists!`);
        input.select();
        input.focus();
        return;
      }
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
      document.body.classList.toggle("modal-active");
    }
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
    document.body.classList.toggle("modal-active");
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
        // toast.success("Deleted Aspect");
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
      document.body.classList.toggle("modal-active");
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
    document.body.classList.toggle("modal-active");
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
    const aspects =
      JSON.parse(localStorage.getItem("growthGrid-aspects")) || [];
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
    if (
      aspects.some((a) => a.name.toLowerCase() === formattedname.toLowerCase())
    ) {
      toast.error(`Aspect "${newName}" already exists!`);
      input.select();
      input.focus();
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
      document.body.classList.toggle("modal-active");
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
    if (typeof message === "string" && message.includes("{countdown}")) {
      return this._showWithCountdown(message, "success", duration);
    }
    return this.show(message, "success", duration);
  }

  error(message, duration = 4000) {
    if (typeof message === "string" && message.includes("{countdown}")) {
      return this._showWithCountdown(message, "success", duration);
    }
    return this.show(message, "error", duration);
  }

  info(message, duration = 3000) {
    if (typeof message === "string" && message.includes("{countdown}")) {
      return this._showWithCountdown(message, "success", duration);
    }
    return this.show(message, "info", duration);
  }

  warning(message, duration = 4000) {
    if (typeof message === "string" && message.includes("{countdown}")) {
      return this._showWithCountdown(message, "success", duration);
    }
    return this.show(message, "warning", duration);
  }
  success(message, duration = 3000) {
    // Check if message contains countdown pattern
    if (typeof message === "string" && message.includes("{countdown}")) {
      return this._showWithCountdown(message, "success", duration);
    }
    return this.show(message, "success", duration);
  }

  // Do the same for other types if you want
  error(message, duration = 4000) {
    if (typeof message === "string" && message.includes("{countdown}")) {
      return this._showWithCountdown(message, "error", duration);
    }
    return this.show(message, "error", duration);
  }

  // PRIVATE METHOD: Handle countdown replacement
  _showWithCountdown(message, type = "info", duration = 3000) {
    const toast = document.createElement("div");
    toast.className = `toast toast-${type} countdown-toast`;
    let time = duration / 1000;
    let count = time; // Default 5-second countdown

    toast.innerHTML = `
            <div class="toast-content">
                <span class="toast-message">${message.replace(
                  "{countdown}",
                  count
                )}</span>
                <button class="toast-close" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
        `;

    this.container.appendChild(toast);
    setTimeout(() => toast.classList.add("show"), 10);

    const messageElement = toast.querySelector(".toast-message");
    let currentCount = count;

    const countdownInterval = setInterval(() => {
      currentCount--;

      if (currentCount > 0) {
        // Update just the countdown number in the message
        messageElement.innerHTML = message.replace("{countdown}", currentCount);
      } else {
        clearInterval(countdownInterval);
        messageElement.innerHTML = message.replace("{countdown}", "0");

        // Remove toast
        setTimeout(() => {
          toast.classList.remove("show");
          setTimeout(() => toast.remove(), 300);
        }, 1000);
      }
    }, 1000);

    return toast;
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
  "The strongest people aren't the ones who get exactly what they want they are the ones who learn to navigate their obstacles without letting their spark die",
  "Setbacks makes us stronger",
  "You're not behind you're right where you need to be",
  "Your consistency is building a legacy of growth",
  "Small steps every day lead to giant leaps over time",
  "The strongest trees grow from consistent watering",
  "You're not just tracking progress - you're creating it",
  "Every entry is a love letter to your future self",
  "Growth isn't about being perfect, it's about being persistent",
  "You're the architect of your own transformation",
  "The compound effect of small wins creates massive results",
  "Your dedication today is tomorrow's success story",
  "Keep going. The world needs what you're becoming",
  "Progress isn't always visible, but it's always happening",
  "You're not stuck - you're just in preparation mode",
  "The only workout you regret is the one you didn't do",
  "Your habits are voting for the person you want to become",
  "Don't stop when you're tired, stop when you're done",
  "The pain of discipline hurts less than the pain of regret",
  "You're one step closer than you were yesterday",
  "Growth is uncomfortable - that's how you know it's working",
  "Your future is created by what you do today, not tomorrow",
  "The hardest part is always the start - and you've already begun",
  "You're not competing with anyone but the person you were yesterday",
  "Small daily improvements lead to stunning long-term results",
  "The only limit to your growth is the one you set yourself",
  "You're building momentum with every single entry ⚡",
  "Progress is progress, no matter how small",
  "Your journey inspires others even when you don't realize it",
  "The best time to plant a tree was 20 years ago. The second best time is now",
  "You're not just going through the motions - you're creating motion",
  "Every entry is proof that you're choosing growth",
  "The distance between your dreams and reality is called action",
  "Every small step is a win in the game of growth.",
  "Consistency turns 'impossible' into 'I did it'.",
  "Your journey starts with today's entry.",
  "Build habits like code — one line at a time.",
  "Progress isn't perfect — it's persistent.",
  "The best version of you is one entry away.",
  "Track it. Own it. Level up.",
  "Growth is silent — but the results roar.",
  "You vs yesterday. You win.",
  "Write your story. One day at a time.",
  "I'm not gonna stop - Lil Peep",
  "We ain't meant to fit in, we are meant to be different - Juice WRLD",
  "All legends fall in the making - Juice WRLD",
  "Life is beautiful, they told me I should use it - Lil Peep",
  "Be 1% beter everyday",
  "Action opens doors",
  "Discipline beats motivation every time",
  "If it costs you your peace, it's too expensive",
  "Results take time. Stay consistent even when no one claps",
  "You're not tired - you're just uninspired",
  "Comfort zones destroy potential",
  "Always remember we're rooting for you",
  `Hey ${localStorage.getItem("ggUserName")} you are becoming`
];
function getRandomQuote() {
  const randomIndex = Math.floor(Math.random() * motivationQuotes.length);
  return motivationQuotes[randomIndex];
}
// ===== ROTATING STATS TICKER SYSTEM =====
class StatsTicker {
  constructor() {
    this.stats = [];
    this.currentIndex = 0;
    this.isPaused = false;
    this.interval = null;
    this.init();
  }
  
  init() {
    this.generateStatsList();
    this.startTicker();
    this.getUsageDays();
  }
  
  generateStatsList() {
    // Generate all possible stats
    const statsData = calculateStats();
    const firstEntry = getFirstEntryDate();
    
    this.stats = [
      `🚀 Pinned Aspects: ${this.getPinnedCount()}`,
      `🔥 Current Streak: ${statsData.streak || "None Yet"}`,
      `⭐ Top Streak: ${statsData.topStreak || "None Yet"}`,
      `📊 Total Aspects: ${statsData.totalAspects || "0"}`,
      `✍️ Total Entries: ${statsData.totalEntries || "0"}`,
      `🏆 Most Active: ${statsData.aspectWithMostEntries.name || "None Yet"}`,
      `📅 Most Consistent: ${statsData.mostVisited.name || "None Yet"}`,
      `🎯 Today's Top: ${statsData.todayChampion.name || "None Yet"}`,
      `📈 Avg Daily: ${statsData.avgPerDay || "0"} entries`,
      `📅 First Entry: ${firstEntry || "No entries yet"}`,
      `📱 Using GrowthGrid: ${this.getUsageDays()} ${this.getUsageDays() > 1 ? "Days" : "Day"}`,
      `🌟 Best Day: ${statsData.bestDay}`,
      `⚡ Entries Today: ${this.getTodaysEntries()}`,
      `💭 Motivation:${getRandomQuote()}`
    ];
  }
  
  getUsageDays() {
    const firstDate = getFirstEntryDate();
    if (firstDate === "No entries yet") return "0";
    
    const first = new Date(firstDate || firstDate);
    const today = new Date();
    const diffTime = Math.abs(today - first);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    console.log(firstDate);
    console.log(first);
    return diffDays;
  }
  
  getTodaysEntries() {
    const today = new Date().toDateString();
    const aspects = JSON.parse(localStorage.getItem('growthGrid-aspects') || '[]');
    let count = 0;
    
    aspects.forEach(aspect => {
      aspect.entries?.forEach(day => {
        if (new Date(day.date).toDateString() === today) {
          count += day.entriesToday.length;
        }
      });
    });
    
    return count;
  }
  
  getPinnedCount() {
    const aspects = JSON.parse(localStorage.getItem('growthGrid-aspects') || '[]');
    return aspects.filter(a => a.starred).length;
  }
  
  startTicker() {
    this.clearTicker();
    this.showNextStat();
    
    // Change stat every 6 seconds (3s middle + 3s animation)
    this.interval = setInterval(() => {
      if (!this.isPaused) {
        this.showNextStat();
      }
    }, 6000);
  }
  
  showNextStat() {
    const track = document.querySelector('.stats-track');
    if (!track || this.stats.length === 0) return;
    
    // Clear current stat
    track.innerHTML = '';
    
    // Create new stat element
    const statElement = document.createElement('div');
    statElement.className = 'ticker-stat-item current';
    statElement.textContent = this.stats[this.currentIndex];
    
    track.appendChild(statElement);
    
    // Move to next stat (loop)
    this.currentIndex = (this.currentIndex + 1) % this.stats.length;
  }
  
  togglePause(e) {
    e.stopPropagation();
    console.log(e);
    this.isPaused = !this.isPaused;
    const pauseBtn = document.querySelector('.ticker-pause');
    
    if (pauseBtn) {
      pauseBtn.textContent = this.isPaused ? '▶️' : '⏸️';
      pauseBtn.title = this.isPaused ? 'Resume' : 'Pause';
    }
    
    if (!this.isPaused && !this.interval) {
      this.startTicker();
    }
  }
  
  clearTicker() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }
  
  // Update stats in real-time
  refreshStats() {
    this.generateStatsList();
    if (!this.isPaused) {
      this.showNextStat();
    }
  }
}
// Search functionality
class SearchEngine {
    constructor() {
        this.init();
    }
    
    init() {
        this.searchToggle = document.getElementById('searchToggle');
        this.searchPanel = document.getElementById('searchPanel');
        this.searchInput = document.getElementById('searchInput');
        this.searchResults = document.getElementById('searchResults');
        this.closeSearchBtn = document.getElementById('closeSearch');
        
        if (!this.searchToggle || !this.searchPanel) {
            console.log('Search elements not found');
            return;
        }
        
        // Toggle search panel
        this.searchToggle.addEventListener('click', () => this.openSearch());
        this.closeSearchBtn.addEventListener('click', () => this.closeSearch());
        
        // Search as you type
        this.searchInput.addEventListener('input', (e) => this.performSearch(e.target.value));
        
        // Close on escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.searchPanel.classList.contains('open')) {
                this.closeSearch();
            }
            // Ctrl/Cmd + F to open search
            if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
                e.preventDefault();
                this.openSearch();
            }
        });
    }
    
    openSearch() {
        this.searchPanel.classList.add('open');
        this.searchInput.focus();
        document.body.classList.add('no-scroll');
                    this.searchResults.innerHTML = '<div class="no-results">Type to search...</div>';

    }
    
    closeSearch() {
        this.searchPanel.classList.remove('open');
        this.searchInput.value = '';
        this.searchResults.innerHTML = '';
        document.body.classList.remove('no-scroll');
    }
    
    performSearch(query) {
        if (!query.trim()) {
            this.searchResults.innerHTML = '<div class="no-results">Type to search...</div>';
            return;
        }
        
        const aspects = JSON.parse(localStorage.getItem('growthGrid-aspects') || '[]');
        const lowerQuery = query.toLowerCase();
        
        const results = [];
        
        // Search through aspects and entries
        aspects.forEach(aspect => {
            const aspectMatches = aspect.name.toLowerCase().includes(lowerQuery);
            let entryMatches = [];
            
            // Search in entries
            if (aspect.entries && aspect.entries.length > 0) {
                aspect.entries.forEach(day => {
                    day.entriesToday.forEach(entry => {
                        if (entry.text.toLowerCase().includes(lowerQuery)) {
                            entryMatches.push({
                                aspectName: aspect.name,
                                aspectId: aspect.id,
                                date: day.date,
                                entryText: entry.text,
                                entryTime: entry.time,
                                fullText: entry.text
                            });
                        }
                    });
                });
            }
            
            if (aspectMatches || entryMatches.length > 0) {
                results.push({
                    aspect,
                    aspectMatches,
                    entryMatches
                });
            }
        });
        
        this.displayResults(results, query);
    }
    
    displayResults(results, query) {
        if (results.length === 0) {
            this.searchResults.innerHTML = `
                <div class="no-results">
                    <p>No results found for "${query}"</p>
                    <small>Try different keywords</small>
                </div>
            `;
            return;
        }
        
        let html = `
            <div class="results-header">
            <h4>Found ${results.length} aspect${results.length > 1 ? "s" : ""} containing "${query}"</h4>
            </div>
        `;
        
        results.forEach(result => {
            const { aspect, aspectMatches, entryMatches } = result;
            const totalMatches = (aspectMatches ? 1 : 0) + entryMatches.length;
            console.log(aspect);
            html += `
                <div class="search-result-item" onclick="openAspectlog('${aspect.id}', '${aspect.name}')">
                    <div class="result-aspect">
                        <h5>${aspect.name}</h5>
                        <span class="match-count">${totalMatches} match${totalMatches !== 1 ? 'es' : ''}</span>
                    </div>
                    
                    ${aspectMatches ? `
                        <div class="match-item">
                            <span class="match-type">Aspect name</span>
                            <p>${this.highlightText(aspect.name, query)}</p>
                        </div>
                     `: ''}
                    
                    ${entryMatches.slice(0, 3).map(entry => `
                        <div class="match-item">
                            <span class="match-type">Entry • ${formatDateHeader(entry.date)} ${entry.entryTime}</span>
                            <p>${this.highlightText(entry.fullText, query)}</p>
                        </div>
                    `).join('')}
                    
                    ${entryMatches.length > 3 ? `
                        <div class="more-matches">
                            +${entryMatches.length - 3} more entries...
                        </div>
                     `: ''}
                </div>
           ` ;
        });
        
        this.searchResults.innerHTML = html;
    }
    
    highlightText(text, query) {
        const lowerText = text.toLowerCase();
        const lowerQuery = query.toLowerCase();
        const index = lowerText.indexOf(lowerQuery);
        
        if (index === -1) return text;
        
        const before = text.substring(0, index);
        const match = text.substring(index, index + query.length);
        const after = text.substring(index + query.length);
        
        return `${before}<mark>${match}</mark>${after}`;
    }
}

// ===== SMART IMPORT SYSTEM - PHASE 1 =====

class SmartImporter {
    constructor() {
        this.init();
        console.log(`object`);
      }
    
    init() {
        // Create file input if it doesn't exist
        if (!document.getElementById('importFileInput')) {
            const input = document.createElement('input');
            input.type = 'file';
            input.id = 'importFileInput';
            input.accept = '.json';
            input.style.display = 'none';
            document.body.appendChild(input);
            
            input.addEventListener('change', (e) => this.handleFileSelect(e));
        } else{
          document.getElementById('importFileInput').addEventListener("change", (e) => {
            this.handleFileSelect(e)
          })
        }
        
        // Add click listener to import button
        const importBtn = document.getElementById('importBtn');
        if (importBtn) {
            importBtn.addEventListener('click', () => this.triggerFileSelect());
        }
    }
    
    triggerFileSelect() {
        const fileInput = document.getElementById('importFileInput');
        fileInput.click();
    }
    
    handleFileSelect(event) {
  console.log("Event:", event);
console.log(event.target.files);
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        
        reader.onload = (e) => {
            try {
                const importedData = JSON.parse(e.target.result);
                this.processImportedData(importedData);
            } catch (error) {
                toast.error('Invalid JSON file! 😢');
                console.error('Import error:', error);
            }
        };
        
        reader.readAsText(file);
        // console.log(reader.readAsText(file));
        // Reset file input for next import
        event.target.value = '';
    }
    
    processImportedData(importedData) {
        // Validate the data
        if (!this.validateImportedData(importedData)) {
            toast.error('This file doesn\'t look like GrowthGrid data 🤔');
            return;
        }
        
        // Show preview before importing
        this.showImportPreview(importedData);
    }
    
    validateImportedData(data) {
        // Basic validation
        if (!data || typeof data !== 'object') return false;
        
        // Check if it has aspects (main requirement)
        if (!Array.isArray(data.aspects)) return false;
        
        // Check if it's from GrowthGrid (but be lenient)
        if (data.app && !data.app.includes('GrowthGrid')) {
            // Still allow import but warn user
            const proceed = confirm('⚠️ This file doesn\'t seem to be from GrowthGrid. Import anyway?');
            return proceed;
        }
        
        return true;
    }
    
    showImportPreview(importedData) {
        const currentAspects = JSON.parse(localStorage.getItem('growthGrid-aspects') || '[]');
        const hasExistingData = currentAspects.length > 0;
        
        // Calculate stats for preview
        const stats = {
            totalAspects: importedData.aspects.length,
            totalEntries: this.countTotalEntries(importedData.aspects),
            userName: importedData.userName || 'Not specified',
            exportDate: importedData.exportDate ? new Date(importedData.exportDate).toLocaleDateString() : 'Unknown'
        };
        
        // Create preview modal
        const modal = document.createElement('div');
        modal.className = 'modal-overlay import-preview';
        modal.innerHTML = `
            <div class="modal-content">
                <h3>📁 Import Preview</h3>
                
                <div class="import-stats">
                    <div class="stat-row">
                        <span>User:</span>
                        <strong>${stats.userName}</strong>
                    </div>
                    <div class="stat-row">
                        <span>Aspects:</span>
                        <strong>${stats.totalAspects}</strong>
                    </div>
                    <div class="stat-row">
                        <span>Entries:</span>
                        <strong>${stats.totalEntries}</strong>
                    </div>
                    <div class="stat-row">
                        <span>Exported:</span>
                        <strong>${stats.exportDate}</strong>
                    </div>
                </div>
                
                <div class="import-method">
                    <h4>How would you like to import?</h4>
                    <div class="method-options">
                        ${hasExistingData ? `
                        <label class="method-option">
                            <input type="radio" name="importMethod" value="merge" checked>
                            <div class="option-content">
                                <strong>🔀 Smart Merge</strong>
                                <small>Combine with existing data (recommended)</small>
                            </div>
                        </label>
                        <label class="method-option">
                            <input type="radio" name="importMethod" value="replace">
                            <div class="option-content">
                                <strong>🔄 Replace All</strong>
                                <small>Delete current data and use imported</small>
                            </div>
                        </label>
                        `: `
                        <label class="method-option">
                            <input type="radio" name="importMethod" value="replace" checked>
                            <div class="option-content">
                                <strong>✨ Fresh Start</strong>
                                <small>No existing data - start fresh</small>
                            </div>
                        </label>
                        `}
                    </div>
                </div>
                
                <div class="modal-actions">
                    <button class="cancel-btn">Cancel</button>
                    <button class="import-btn">Import Data</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        document.body.classList.add('modal-active');
        
        // Add event listeners
        modal.querySelector('.cancel-btn').onclick = () => {
            modal.remove();
            document.body.classList.remove('modal-active');
        };
        
        modal.querySelector('.import-btn').onclick = () => {
            const method = modal.querySelector('input[name="importMethod"]:checked').value;
            this.executeImport(importedData, method);
            modal.remove();
            document.body.classList.remove('modal-active');
        };
        
        modal.onclick = (e) => {
            if (e.target === modal) {
                modal.remove();
                document.body.classList.remove('modal-active');
            }
        };
    }
    
    countTotalEntries(aspects) {
        return aspects.reduce((total, aspect) => {
            return total + (aspect.entries?.reduce((sum, day) => 
                sum + (day.entriesToday?.length || 0), 0) ||  0);
        }, 0);
    }
    
    executeImport(importedData, method) {
        try {
            if (method === 'replace') {
                this.replaceData(importedData);
            } else {
                this.mergeData(importedData);
            }
            toast.success('✅ Data imported successfully!', 3000);
        } catch (error) {
            toast.error('Import failed 😢');
            console.error('Import execution error:', error);
        }
    }
    
    // PHASE 1: Simple replace (i'll build merge in Phase 2)
    replaceData(importedData) {
    // Replace everything
        if (importedData.userName) {
            localStorage.setItem('ggUserName', importedData.userName);
        }
        
        localStorage.setItem('growthGrid-aspects', JSON.stringify(importedData.aspects));
        
        // Update UI
        if (importedData.userName) {
            document.getElementById('welcomeName').textContent =`Welcome ${importedData.userName}`;
        }
        
        showaspects();
        updateAspectCounter();
        
        console.log('Data replaced with imported data');
    }
    
    // PHASE 2 will have the smart merge logic
   mergeData(importedData) {
    console.log("🔀 Starting smart merge...");
    
    const currentAspects = JSON.parse(localStorage.getItem('growthGrid-aspects') || '[]');
    const importedAspects = importedData.aspects || [];
    
    // Step 1: Create a map of current aspects for quick lookup
    const currentAspectMap = new Map();
    currentAspects.forEach(aspect => {
        const normalizedName = TextFormatter.formatAspectName(aspect.name);
        currentAspectMap.set(normalizedName, aspect);
    });
    
    console.log(`📊 Current aspects: ${currentAspects.length}`);
    console.log(`📊 Imported aspects: ${importedAspects.length}`
    );
    
    // Step 2: Process each imported aspect
    const mergedAspects = [...currentAspects]; // Start with current
    
    importedAspects.forEach(importedAspect => {
        const importedName = TextFormatter.formatAspectName(importedAspect.name);
        const existingAspect = currentAspectMap.get(importedName);
        
        if (existingAspect) {
            console.log(`🔄 Merging: ${importedAspect.name}`);
            // MERGE LOGIC GOES HERE
            this.mergeAspectEntries(existingAspect, importedAspect);
        } else {
            console.log(`✨ Adding new: ${importedAspect.name}`);
            // Add new aspect
            mergedAspects.push({
                ...importedAspect,
                id: 'aspect_' + Date.now() + Math.random(), // New ID
                name: importedAspect.name.length > 20 
                    ? importedAspect.name.substring(0, 17) + "..." 
                    : importedAspect.name
            });
        }
    });
    
    // Step 3: Save merged data
    localStorage.setItem('growthGrid-aspects', JSON.stringify(mergedAspects));
    
    // Update UI
    showaspects();
    updateAspectCounter();
    
    toast.success(`✅ Merged ${importedAspects.length} aspect(s)!`);
}

mergeAspectEntries(existingAspect, importedAspect) {
    console.log(`📅 Existing: ${existingAspect.entries?.length || 0} days`);
    console.log(`📅 Imported: ${importedAspect.entries?.length || 0} days`);
    
    // 1. Keep the OLDER creation date
    const existingDate = new Date(existingAspect.created);
    const importedDate = new Date(importedAspect.created);
    
    if (importedDate < existingDate) {
        existingAspect.created = importedAspect.created;
        existingAspect.time = importedAspect.time;
        console.log(`⏰ Updated to older creation date`);
    }
    
    // 2. Merge entries if imported aspect has any
    if (!importedAspect.entries || importedAspect.entries.length === 0) {
        return;
    }
    
    // Create a map of existing days for quick lookup
    const existingDayMap = new Map();
    existingAspect.entries?.forEach(day => {
        existingDayMap.set(day.date, day);
    });
    
    // 3. Process imported days
    importedAspect.entries.forEach(importedDay => {
        const existingDay = existingDayMap.get(importedDay.date);
        
        if (existingDay) {
            // Merge entries for same day
            this.mergeDayEntries(existingDay, importedDay);
        } else {
            // Add entire day
            existingAspect.entries.push(importedDay);
        }
    });
    
    // 4. Sort entries by date (newest first)
    existingAspect.entries.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // 5. Sort entries within each day by time (newest first)
    existingAspect.entries.forEach(day => {
        day.entriesToday.sort((a, b) => {
            const timeA = new Date(`1970-01-01 ${a.time}`).getTime();
            const timeB = new Date(`1970-01-01 ${b.time}`).getTime();
            return timeB - timeA;
        });
    });
}

mergeDayEntries(existingDay, importedDay) {
    console.log(`📝 Merging entries for ${existingDay.date}`);
    
    // Create a set to track unique entries in existing day
    const existingEntriesSet = new Set();
    existingDay.entriesToday.forEach(entry => {
        existingEntriesSet.add(entry.text.toLowerCase().trim() + "|" + entry.time);
    });
    
    // Add only new entries from imported day
    let addedCount = 0;
    importedDay.entriesToday.forEach(importedEntry => {
        const key = importedEntry.text.toLowerCase().trim() + "|" + importedEntry.time;
        
        if (!existingEntriesSet.has(key)) {
            existingDay.entriesToday.push(importedEntry);
            existingEntriesSet.add(key);
            addedCount++;
        }
    });
    
    if (addedCount > 0) {
        console.log(`➕ Added ${addedCount} new entries`);
    }
}

}
// ===== PROGRESS BAR MANAGER =====
class ProgressBar {
  constructor() {
    this.createProgressElement();
  }
  
  createProgressElement() {
    // Create progress container if it doesn't exist
    if (!document.getElementById('globalProgress')) {
      const progressHTML = `
        <div id="globalProgress" class="progress-overlay" style="display: none;">
          <div class="progress-container">
            <div class="progress-header">
              <h4 id="progressTitle">Processing...</h4>
              <span id="progressPercent">0%</span>
            </div>
            <div class="progress-bar">
              <div class="progress-fill" id="progressFill"></div>
            </div>
            <div class="progress-stats">
              <span id="progressDetail">Starting...</span>
              <span id="progressSpeed">-</span>
            </div>
            <button id="cancelProgress" class="cancel-progress-btn">Cancel</button>
          </div>
        </div>
      `;
      document.body.insertAdjacentHTML('beforeend', progressHTML);
      
      // Add cancel button handler
      document.getElementById('cancelProgress').addEventListener('click', () => {
        this.cancel();
      });
    }
    
    this.progressElement = document.getElementById('globalProgress');
    this.progressFill = document.getElementById('progressFill');
    this.progressPercent = document.getElementById('progressPercent');
    this.progressTitle = document.getElementById('progressTitle');
    this.progressDetail = document.getElementById('progressDetail');
    this.progressSpeed = document.getElementById('progressSpeed');
    
    this.cancelled = false;
    this.startTime = null;
  }
  
  show(title = 'Processing...') {
    this.cancelled = false;
    this.startTime = Date.now();
    this.progressTitle.textContent = title;
    this.progressPercent.textContent = '0%';
    this.progressFill.style.width = '0%';
    this.progressDetail.textContent = 'Starting...';
    this.progressSpeed.textContent = '-';
    this.progressElement.style.display = 'flex';
    document.body.classList.add('progress-active');
  }
  
  update(percent, detail = '') {
    if (this.cancelled) return;
    
    percent = Math.min(100, Math.max(0, percent));
    this.progressPercent.textContent = `${Math.round(percent)}%`;
    this.progressFill.style.width = `${percent}%`;
    
    if (detail) {
      this.progressDetail.textContent = detail;
    }
    
    // Calculate speed
    const elapsed = (Date.now() - this.startTime) / 1000;
    if (elapsed > 1) {
      const speed = percent / elapsed;
      this.progressSpeed.textContent = `${speed.toFixed(1)}%/s`;
    }
    
    // Add completion animation at 100%
    if (percent >= 100) {
      this.progressFill.classList.add('complete');
      setTimeout(() => this.hide(), 1000);
    }
  }
  
  hide() {
    this.progressElement.style.display = 'none';
    document.body.classList.remove('progress-active');
    this.progressFill.classList.remove('complete');
  }
  
  cancel() {
    this.cancelled = true;
    this.hide();
    toast.info('Operation cancelled');
  }
}
const initRippleEffect = () => {
        // document.querySelectorAll("button").forEach((button) => {
          document.body.addEventListener("click", function (e) {
            const ripple = document.createElement("span");
            const rect = this.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height)/48;
            const x = e.clientX - rect.left - size / 2;
            const y = e.clientY - rect.top - size / 2;
            
            let back = document.body.getAttribute("data-theme") === "dark" ? "rgba(255, 255, 255, 0.1)" : "rgba(255, 255, 255, 0.4)" ;
            ripple.style.cssText = `
            height: ${size}px;
            width: ${size}px;
            background: ${back};
            position: absolute;
            border-radius: 50%;

            transform: scale(0);
            animation: ripple 0.8s ease;
            transition: all 300ms !important;
            top: ${y}px;
            left: ${x}px;
              backdrop-filter: blur(0.1px);

            pointer-events: none;
            z-index:;
         `;
// this.style.background = back;
console.log(back);
            this.style.position = "relative";
            this.style.overflow = "";
            this.appendChild(ripple);

            setTimeout(() => ripple.remove(), 900);
          });
        // });

        // Add ripple animation
        const rippleStyle = document.createElement("style");
        rippleStyle.textContent = `
        @keyframes ripple {
        to {
                    transform: scale(4);
            opacity: 0;
        }

        }
     `;
        document.head.appendChild(rippleStyle);
      };

class Modal {
  constructor() {
    this.modal = null;
    this.callback = null;
    this.history = []; // Array to store previous values
  }

  show(message, defaultValue = "", callback) {
    this.callback = callback;
    this.createModal(message, defaultValue);
    document.body.classList.toggle("modal-active");
  }

  createModal(message, defaultValue) {
    if (message.includes("new name")) {
      this.modal = document.createElement("div");
      this.modal.className = "modal-overlay";
      this.modal.innerHTML = `
            <div class="modal-content">
                <h3>${message}</h3>
                <input type="text" id="pinEntryInput" placeholder="Enter new name" value="${defaultValue}" maxlength="20">
                 <p class="char-count"><span id="charCount">0</span>/20 characters</p>

                <div class="modal-actions">
                <button class="cancel-btn">Cancel</button>
                <button class="create-btn">OK</button>
                </div>
                ${
                  this.history.length > 0
                    ? `
                    <div class="modal-history">
                        <p>Recent values:</p>
                        <div class="history-list">
                            ${this.history
                              .map(
                                (item) =>
                                  `<span class="history-item" data-value="${item}">${item}</span>`
                              )
                              .join("")}
                        </div>
                    </div>
                 `
                    : ""
                }
            </div>
            `;
    } else if (message.includes("new message pin")) {
      this.modal = document.createElement("div");
      this.modal.className = "modal-overlay";
      this.modal.innerHTML = `
            <div class="modal-content">
                <h3>${message}</h3>
                <input type="text" id="pinEntryInput" placeholder="Enter pin" value="${defaultValue}" maxlength="8">
                 <p class="char-count"><span id="charCount">0</span>/8 characters</p>
                <div class="modal-actions">
                                <button class="cancel-btn">Cancel</button>

                <button class="create-btn">OK</button>
                </div>
                ${
                  this.history.length > 0
                    ? `
                    <div class="modal-history">
                        <p>Recent values:</p>
                        <div class="history-list">
                            ${this.history
                              .map(
                                (item) =>
                                  `<span class="history-item" data-value="${item}">${item}</span>`
                              )
                              .join("")}
                        </div>
                    </div>
                 `
                    : ""
                }
            </div>
            `;
    } else {
      this.modal = document.createElement("div");
      this.modal.className = "modal-overlay";
      this.modal.innerHTML = `
            <div class="modal-content">
                <h3>${message}</h3>
                <input type="text" id="pinEntryInput" placeholder="Enter pin" value="${defaultValue}" maxlength="8">
                 <p class="char-count"><span id="charCount">0</span>/8 characters</p>
                <div class="modal-actions">
                <button class="create-btn">OK</button>
                </div>
                ${
                  this.history.length > 0
                    ? `
                    <div class="modal-history">
                        <p>Recent values:</p>
                        <div class="history-list">
                            ${this.history
                              .map(
                                (item) =>
                                  `<span class="history-item" data-value="${item}">${item}</span>`
                              )
                              .join("")}
                        </div>
                    </div>
                 `
                    : ""
                }
            </div>
            `;
    }

    document.body.appendChild(this.modal);
    this.addEventListeners();
  }

  addEventListeners() {
    const cancelBtn = this.modal.querySelectorAll(".cancel-btn");
    const createBtn = this.modal.querySelector(".create-btn");
    const input = this.modal.querySelector("#pinEntryInput");
    const historyItems = this.modal.querySelectorAll(".history-item");
    const charCount = this.modal.querySelector("#charCount");
    input.addEventListener("input", () => {
      charCount.textContent = input.value.length;
    });
    charCount.textContent = input.value.length;
    cancelBtn.forEach((btn) => {
      btn.onclick = () => this.close();
    });
    cancelBtn.onclick = () => this.close();
    createBtn.onclick = () => this.handleCreate(input);

    // History item clicks
    historyItems.forEach((item) => {
      item.onclick = () => {
        input.value = item.dataset.value;
        this.handleCreate(input);
      };
    });

    // Close on overlay click
    // this.modal.onclick = (e) => {
    //     if (e.target === this.modal) this.close();
    // };

    // Enter key to create
    input.onkeypress = (e) => {
      if (e.key === "Enter") this.handleCreate(input);
    };

    input.focus();
    input.select();
  }

  handleCreate(input) {
    const value = input.value.trim();

    if (value) {
      // Add to history (limit to last 5)
      this.history.unshift(value);
      this.history = this.history.slice(0, 5);
      this.callback(value);
      this.close();
    } else {
      this.history.unshift(value);
      this.history = this.history.slice(0, 5);

      toast.error("Please enter a valid pin");
    }
  }

  close() {
    if (this.modal) {
      document.body.removeChild(this.modal);
      this.modal = null;
      document.body.classList.toggle("modal-active");
    }
  }

  // Method to manually set history (for pin prompts)
  setHistory(newHistory) {
    this.history.unshift(newHistory);
    this.history = this.history.slice(0, 5);
  }
}

// Initialize once
const EditModal = new Modal();

const toast = new Toast();
const confirmModal = new ConfirmModal();
const aspectModal = new AspectModal();
const editAspectModal = new EditAspectModal();
const scrollAnimator = new ScrollAnimator();
  const statsTicker = new StatsTicker();
    const searchEngine = new SearchEngine();
const smartImporter = new SmartImporter();
const progressBar = new ProgressBar();

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
  cycleStats();
  setDailyFocus();
  const savedTheme = localStorage.getItem("theme");
  if (savedTheme) {
    setTheme(savedTheme);
  }
    
  
  // Refresh stats when aspects change
  function refreshTickerStats() {
    if (statsTicker) {
      statsTicker.refreshStats();
    }
  }
  
  // Call this whenever aspects are updated
  window.refreshTickerStats = refreshTickerStats;
  setInterval(() => {
  refreshAllStats()
}, 10000);
      initRippleEffect();
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
function editName() {
  const username = localStorage.getItem("ggUserName");
  EditModal.show("Enter new name", `${username}`, (newname) => {
    const formattedname = TextFormatter.formatAspectName(newname);
    if (newname.length >= 2 && newname.length <= 20) {
      if (formattedname === username) {
        toast.info("No change detected");
        return;
      }

      if (formattedname) {
        localStorage.setItem("ggUserName", formattedname);
        toast.success(`Name set to ${formattedname}`, "1500");
        document.getElementById(
          "welcomeName"
        ).textContent = `Welcome ${localStorage.getItem("ggUserName")}`;
      } else {
        toast.error("Please enter an appropriate name!");
      }
    } else {
      toast.error("Your name should be between 2 and 20 characters long");
    }
  });
}

// Run on load + every new day
function setDailyFocus() {
  const today = new Date().toDateString();
  if (localStorage.getItem("dailyFocusDate") === today) ; // already set

  const aspects = JSON.parse(localStorage.getItem("growthGrid-aspects")) || [];

  // Unstar all first
  aspects.forEach((a) => (a.starred = false));

  // Find aspect with most entries this week
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  let winner = null;
  let maxEntries = -1;

  aspects.forEach((a) => {
    const weekEntries = a.entries
      .filter((day) => new Date(day.date) >= weekAgo)
      .reduce((sum, day) => sum + day.entriesToday.length, 0);

    if (weekEntries > maxEntries) {
      maxEntries = weekEntries;
      winner = a;
    }
  });

  const starred = aspects.filter((a) => a.starred);
  if (starred.length >= 3) {
    // Unpin lowest entries
    let lowest = starred[0];
    let minEntries = getTotalEntries(lowest);

    starred.forEach((a) => {
      const entries = getTotalEntries(a);
      if (entries < minEntries) {
        minEntries = entries;
        lowest = a;
      }
    });

    lowest.starred = false;
  }
  // Star the winner (or random if none)
  if (winner) winner.starred = true;
  else if (aspects.length > 0) aspects[0].starred = true;
  localStorage.setItem("growthGrid-aspects", JSON.stringify(aspects));
  localStorage.setItem("dailyFocusDate", today);
  showaspects();
}
// Ensure proper display of entries and aspects date
function formatDateHeader(dateStr) {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const target = new Date(dateStr);
  const diffTime = today - target;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays === 2) return "2 days ago";
  if (diffDays === 3) return "3 days ago";
  if (diffDays <= 6) return `${diffDays} days ago`;
  if (diffDays === 7) return "Last week";

  // Older than 2 weeks → full date
  return target.toDateString(); // "Sat Nov 09 2025"
}

function formatAspectDate(dateString) {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const target = new Date(dateString);
  const diffTime = today - target;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays === 2) return "2 days ago";
  if (diffDays === 3) return "3 days ago";
  if (diffDays <= 6) return `${diffDays} days ago`;
  // if (diffDays <= 13) return "Last week";

  // Older than 2 weeks → full date
  return target.toDateString(); // "Sat Nov 09 2025"
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
// Create prompt to collect aspect name
function showAddAspectPrompt() {
  aspectModal.show((aspectName) => {
    addAspect(aspectName.trim());
  });
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
    entries: [],
    // time: new Date()/
    created: new Date().toDateString(),
    time: new Date().toLocaleTimeString(),
    starred: false,
  });

  // Save back to localStorage
  localStorage.setItem("growthGrid-aspects", JSON.stringify(aspects));
  updateAspectCounter();
  showaspects();
  let id = aspects[0];
  broadcastUpdate("ASPECT_ADDED", { id: id.id, name });
}

function formatTimeDisplay(timeString) {
  if (!timeString) return "";

  // Handle different time formats
  const time = new Date("1970-01-01 " + timeString);
  if (isNaN(time)) return timeString; // Fallback to original

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
  let aspects = JSON.parse(localStorage.getItem("growthGrid-aspects")) || [];
  const aspectDiv = document.getElementById("aspectDiv");
  const addButton = document.getElementById("addEntry");
  const starred = aspects.filter((a) => a.starred);
  const normal = aspects.filter((a) => !a.starred);

  // 2. COUNT ENTRIES PER ASPECT
  const countEntries = (aspect) => {
    return aspect.entries.reduce((total, day) => {
      return total + day.entriesToday.length;
    }, 0);
  };

  // 3. SORT STARRED BY ENTRY COUNT
  starred.sort((a, b) => countEntries(b) - countEntries(a));

  // 4. COMBINE: STARRED FIRST
  aspects = [...starred, ...normal];

  if (aspects.length === 0) {
    addButton.style.display = "none"; // Hide button
    aspectDiv.innerHTML = `
          <div class="empty-state" onclick="showAddAspectPrompt()" 
                 style="text-decoration: underline; color: blue; cursor: pointer; 
                        text-align: center; padding: 3rem;">
                No aspects yet. Tap to create your first one and track an area of your life!
            </div>
        
            `;
  } else {
    aspectDiv.innerHTML = aspects
      .map((item, index) => {
        const dateHeader = formatAspectDate(item.created);
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
        function plural() {
          if (getTotalEntries(item) > 1) {
            return "Entries";
          } else {
            return "Entry";
          }
        }
        return `
          <div class="aspect-card" onclick="openAspectlog('${item.id}', '${
          item.name
        }')" data-stagger="${(index % 5) + 1}" data-animate="random">
            <div class="aspect-header">
            <p>${displayTime}</p>
            <h3>${item.name}</h3>
              <div class="aspect-menu" 
              onclick="event.stopPropagation(); toggleMenu('${item.id}')"

              >
<svg   
 class="three-dots" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="6" r="1.5" fill="currentColor"/>
            <circle cx="12" cy="12" r="1.5" fill="currentColor"/>
            <circle cx="12" cy="18" r="1.5" fill="currentColor"/>
        </svg>
        <div class="menu-options" id="menu-${item.id}">
        <button class="pin-btn" onclick="togglePin('${item.id}', '${
          item.name
        }')">
        
  <svg ${
    item.starred ? "class='star-btn starred'" : "class='star-btn'"
  } width="20" height="20" viewBox="0 0 24 24" fill="none">
    <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>
  </svg>
        
  <span>${item.starred ? "Unpin" : "Pin"}</span>
</button>
        <button onclick="editAspect('${item.id}')" class="edit-btn">
        <svg width="20" height="20" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M11.3333 2.00004C11.5083 1.82508 11.7162 1.68704 11.9448 1.59338C12.1734 1.49972 12.4184 1.45215 12.6656 1.45326C12.9128 1.45437 13.1574 1.50414 13.3851 1.59967C13.6128 1.69521 13.8192 1.83474 13.9923 2.01076C14.1653 2.18679 14.3016 2.39577 14.3931 2.62537C14.4846 2.85497 14.5295 3.10067 14.5251 3.34787C14.5208 3.59507 14.4673 3.83904 14.3679 4.0655C14.2685 4.29196 14.1251 4.49633 13.946 4.66671L6.47933 12.1334L2.666 13.3334L3.866 9.52004L11.3333 2.00004Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path>
                        </svg>
        
        <span>Edit</span></button>
        ${
          getTotalEntries(item) > 0
            ? `
                      <button onclick="shareAspect('${item.id}')" class="share-btn">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M4 12V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>
            <path d="M16 6L12 2L8 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>
            <path d="M12 2V15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>
        </svg>
        <span>Share</span>
    </button>
    <button onclick="downloadAspect('${item.id}')" class="download-btn">
    <svg class="download-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" class="download-path"></path>
            <polyline points="7,10 12,15 17,10" class="download-arrow"></polyline>
            <line x1="12" y1="15" x2="12" y2="3" class="download-line"></line>
          </svg>
        <span>Download</span>
    </button>
    `
            : ``
        }

                  <button onclick="showDeleteConfirm('${item.id}', '${
          item.name
        }')" class="delete-btn">
        <svg class="del-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 6H5H21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>
            <path d="M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6H19Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>
            <path d="M10 11V17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>
            <path d="M14 11V17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>
        </svg>
        <span>Delete</span></button>
                </div>
              </div>
            </div>
                        <div class="last-entry-preview">
              <p class="last-entry-text">${lastEntry.text}</p>
              <span class="last-entry-time">${lastEntry.time}</span>
            </div>
            <p class="no-entry">${getTotalEntries(item) + " " + plural()} </p> 
            
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
  console.log(aspectName);
  document.getElementById("appDashBoard").style.display = "none";
  document.getElementById("addEntry").style.display = "none";
  document.getElementById('searchResults').innerHTML = "";
  document.getElementById('searchToggle').style.display = "";
        document.getElementById('searchInput').value = "";
         document.getElementById('searchPanel').classList.remove('open');
        searchInput.value = '';
        // this.searchResults.innerHTML = '';
        document.body.classList.remove('no-scroll');
  let loggingPage = document.getElementById("loggingPage");
  if (!loggingPage) {
    loggingPage = document.createElement("div");
    loggingPage.id = "loggingPage";

  }

  loggingPage.innerHTML = `
    <section class="logging-page">
        <header class="log-header">
            <button onclick="closeAspectLog()"><svg class="back-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M19 12H5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M12 19L5 12L12 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg></button>
        <button onclick="togglePin('${aspectId}', '${aspectName}')">
  <svg class="star-btn" width="20" height="20" viewBox="0 0 24 24" fill="none">
    <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" 
          stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>
</button>


        <button onclick="editAspectLog('${aspectId}')">
        <svg  class="edit-icon" width="20" height="20" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
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
                <button onclick="saveEntry('${aspectId}', '${aspectName}')">Save</button>

            </div>
            <div class="entries-list" id="entriesList">
                
            </div>
        </main>
    </section>
    `;
  document.body.appendChild(loggingPage);
// In your openAspectlog function, after creating the logging page:
setTimeout(() => {
  const textarea = document.getElementById('entryText');
  if (textarea) {
    // textarea.placeholder = `What did you do today in ${aspectName}?`;
    textarea.value =""
    // textarea.focus();
  }
}, 100);
  loggingPage.style.display = "block";
  const aspects = JSON.parse(localStorage.getItem("growthGrid-aspects")) || [];

  // 2. Find aspect
  const aspect = aspects.find((a) => a.id === aspectId);
  if (aspect.starred) {
    document.querySelectorAll(".star-btn").forEach((element) => {
      element.classList.add("starred");
    });
  } else {
    document.querySelectorAll(".star-btn").forEach((element) => {
      element.classList.remove("starred");
    });
  }
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
function saveEntry(aspectId, name) {
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
    localStorage.setItem("growthGrid-aspects", JSON.stringify(aspects));
    document.getElementById("entryText").value = "";
    toast.success(`Entry saved`);
    let id = aspectId;
    broadcastUpdate("ENTRY_ADDED", { id: id, name: name });
    showEntriesForAspect(aspectId);

    console.log(`Entry Saved`);
  }
}

// Display entries for respective aspects
function showEntrisForAspect(aspectId) {
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
        <h3 class="day-header">${formatDateHeader(dayEntry.date)}
        <span class="entry-count">(${dayEntry.entriesToday.length})</span>
        </h3>
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
function showEntriesForAspect(aspectId) {
  const aspects = JSON.parse(localStorage.getItem("growthGrid-aspects")) || [];
  const aspect = aspects.find((a) => a.id === aspectId);
  const entriesList = document.getElementById("entriesList");
  aspect.entries.sort((a, b) => new Date(b.date) - new Date(a.date));

  aspect.entries.forEach((day) => {
    day.entriesToday.sort((a, b) => {
      const timeA = new Date(`1970-01-01 ${a.time}`);
      const timeB = new Date(`1970-01-01 ${b.time}`);
      return timeB - timeA;
    });
  });
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
        <h3 class="day-header">${formatDateHeader(dayEntry.date)}
        <span class="entry-count">(${dayEntry.entriesToday.length})</span>
        </h3>

        ${dayEntry.entriesToday
          .map(
            (entry, entryIndex) => ` 
          <div class="entry-item" data-animate="random" data-stagger="${
            (entryIndex % 5) + 1
          }">
          <span class="entry-time">${entry.time}</span>
          <div class="entry-actions">
          <button class="copy-entry-btn" onclick="copyEntryText('${entry.text}', event)">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" stroke-width="2"/>
          <path d="M5 15H4C3.46957 15 2.96086 14.7893 2.58579 14.4142C2.21071 14.0391 2 13.5304 2 13V4C2 3.46957 2.21071 2.96086 2.58579 2.58579C2.96086 2.21071 3.46957 2 4 2H13C13.5304 2 14.0391 2.21071 14.4142 2.58579C14.7893 2.96086 15 3.46957 15 4V5" stroke="currentColor" stroke-width="2"/>
          </svg>
          </button>
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
                             </div>

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

// Get First Entry Date
function getFirstEntryDate() {
  const aspects = JSON.parse(localStorage.getItem("growthGrid-aspects")) || [];
  if (aspects.length === 0) return "No entries yet";

  let oldest = null;

  aspects.forEach((aspect) => {
    aspect.entries.forEach((day) => {
      if (!oldest || day.date < oldest) {
        oldest = day.date;
      }
    });
  });

  if (!oldest) return "No entries yet";

  return new Date(oldest).toLocaleDateString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
// Calcuate Streak
function calculateStreak() {
  const aspects = JSON.parse(localStorage.getItem("growthGrid-aspects")) || [];
  const dateSet = new Set();

  // Collect every log date as YYYY-MM-DD (universal format)
  aspects.forEach((aspect) => {
    aspect.entries.forEach((day) => {
      const d = new Date(day.date);
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
        2,
        "0"
      )}-${String(d.getDate()).padStart(2, "0")}`;
      dateSet.add(iso);
    });
  });

  if (dateSet.size === 0) return 0;

  let streak = 0;
  const sorted = Array.from(dateSet).sort().reverse(); // newest first
  const today = new Date();
  const todayISO = `${today.getFullYear()}-${String(
    today.getMonth() + 1
  ).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  for (let i = 0; i < sorted.length; i++) {
    const expectedDate = new Date(today);
    expectedDate.setDate(today.getDate() - i);
    const expectedISO = `${expectedDate.getFullYear()}-${String(
      expectedDate.getMonth() + 1
    ).padStart(2, "0")}-${String(expectedDate.getDate()).padStart(2, "0")}`;

    if (sorted[i] === expectedISO) {
      streak++;
    } else {
      break;
    }
  }
  if (streak > 1) {
    streak += " " + "days";
  } else {
    streak += " " + "day";
  }
  const currentStreak = streak;
  if (!localStorage.getItem("topStreak")) {
    localStorage.setItem("topStreak", currentStreak);
  }

  let topStreak = localStorage.getItem("topStreak") || currentStreak || 0;
  if (currentStreak > topStreak) {
    localStorage.setItem("topStreak", currentStreak);
    topStreak = currentStreak;
  }

  return {
    streak,
    topStreak,
  };
}
// Pining Aspects
function togglePin(aspectId, aspectName) {
  // 1. Get data
  const aspects = JSON.parse(localStorage.getItem("growthGrid-aspects")) || [];

  // 2. Find aspect
  const aspect = aspects.find((a) => a.id === aspectId);
  if (!aspect) return;
  if (!aspect.starred) {
    const starredCount = aspects.filter((a) => a.starred).length;
    if (starredCount >= 3) {
      toast.error("Max 3 pinned! Unpin one first.");
      return;
    }
  }

  // 3. Toggle starred
  aspect.starred = !aspect.starred;

  // 4. Save
  localStorage.setItem("growthGrid-aspects", JSON.stringify(aspects));
  if (aspect.starred) {
    toast.success(`Pinned ${aspect.name}`);
  } else {
    toast.success(`Unpinned ${aspect.name}`);
  }
  // 5. Refresh UI on condition
  if (
    !document.getElementById("entriesList") ||
    document.getElementById("loggingPage").style.display === "none"
  ) {
    showaspects();
  } else {
    document.querySelectorAll(".star-btn").forEach((element) => {
      element.classList.toggle("starred");
    });
  }

  // 6. Sync to other tabs
  broadcastUpdate("ASPECT_PINNED", { id: aspectId, name: aspectName });
}
// Show confirm before deleting entry
// Show delete confirmation

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

  confirmModal.show(
    `Delete"${entryPreview}"? This action cannot be undone.`,
    () => performEntryDeletion(aspectId, date, entryId),
    `Delete`
  );
}

// Delete entry
function performEntryDeletion(aspectId, date, entryId) {
  const aspects = JSON.parse(localStorage.getItem("growthGrid-aspects")) || [];
  const aspect = aspects.find((a) => a.id === aspectId);
  const day = aspect.entries.find((d) => d.date === date);
  const entryIndex = day.entriesToday.findIndex((e) => e.id === entryId);
  const deletedEntry = day.entriesToday[entryIndex];
  const dayEntry = aspect?.entries.find((day) => day.date === date);

  const entry = dayEntry?.entriesToday.find((e) => e.id === entryId);

  // FULL CONTEXT
  lastDeleted = {
    type: "entry",
    aspectId,
    date,
    entryId,
    entryData: { ...deletedEntry }, // deep copy
  };

  // Delete
  day.entriesToday.splice(entryIndex, 1);
  if (day.entriesToday.length === 0) {
    aspect.entries = aspect.entries.filter((d) => d.date !== date);
  }

  localStorage.setItem("growthGrid-aspects", JSON.stringify(aspects));
  showEntriesForAspect(aspectId);
  showUndoToast(() => restoreEntry());
}
// Restoration  Block
//  First Show Undo Toast

function showUndoToast(undoFunction, name) {
  toast.info(
    `
    <span>Deleted!</span>
    <button onclick="undoLastDelete()" style="margin-left:10px;background:#667eea;color:white;padding:4px 12px;border:none;border-radius:8px;cursor:pointer;">Undo</button>
  {countdown}`,
    6000
  );

  // Auto-clear after 6 sec
  setTimeout(() => {
    lastDeleted = null;
  }, 6500);

  window.undoLastDelete = () => {
    document.querySelectorAll(".toast").forEach((t) => t.remove());
    undoFunction();
    lastDeleted = null;
    toast.success(`Restored ${name}`);
  };
}
// Second Restore Entry
function restoreEntry() {
  if (!lastDeleted || lastDeleted.type !== "entry") return;

  const aspects = JSON.parse(localStorage.getItem("growthGrid-aspects")) || [];
  const aspect = aspects.find((a) => a.id === lastDeleted.aspectId);
  if (!aspect) return;

  // Find or create the day
  let day = aspect.entries.find((d) => d.date === lastDeleted.date);
  if (!day) {
    day = { date: lastDeleted.date, entriesToday: [] };
    aspect.entries.push(day);
  }

  // Restore entry
  day.entriesToday.push(lastDeleted.entryData);

  day.entriesToday.sort((a, b) => {
    const timeA = new Date(1`970-01-01 ${a.time}`);
    const timeB = new Date(`1970-01-01 ${b.time}`);
    return timeB - timeA; // newest first
  });

  // === SORT DAYS BY DATE (NEWEST FIRST) ===
  aspect.entries.sort((a, b) => new Date(b.date) - new Date(a.date));

  localStorage.setItem("growthGrid-aspects", JSON.stringify(aspects));
  showEntriesForAspect(lastDeleted.aspectId);
  toast.success("Entry restored!");
}

// Third Restore Aspect

function restoreAspect() {
  if (!lastDeleted || lastDeleted.type !== "aspect") return;
  const aspects = JSON.parse(localStorage.getItem("growthGrid-aspects")) || [];

  aspects.push(lastDeleted.data);
  aspects.sort((a, b) => new Date(b.created) - new Date(a.created));
  localStorage.setItem("growthGrid-aspects", JSON.stringify(aspects));
  showaspects();
  updateAspectCounter();
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
  document.getElementById("aspectCounter").textContent = "(" + count + ")";

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
  const aspect = aspects.find((a) => a.id === aspectId);
  const index = aspects.findIndex((a) => a.id === aspectId);

  if (index === -1) return;

  console.log(aspect.name);
  let name = aspect.name;
  console.log(aspectId);
  lastDeleted = {
    type: "aspect",
    data: aspects[index],
  };

  aspects.splice(index, 1);
  localStorage.setItem("growthGrid-aspects", JSON.stringify(aspects));
  showaspects();
  updateAspectCounter();
  showUndoToast(() => restoreAspect(), name);
  toast.info(`Aspect ${name} deleted`);

  broadcastUpdate("ASPECT_DELETED", { id: aspectId });
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
  // const aspects = JSON.parse(localStorage.getItem("growthGrid-aspects")) || [];
  // const updatedAspects = aspects.filter((aspect) => aspect.id !== aspectId);

  // localStorage.setItem("growthGrid-aspects", JSON.stringify(updatedAspects));
  const aspects = JSON.parse(localStorage.getItem("growthGrid-aspects")) || [];
  const index = aspects.findIndex((a) => a.id === aspectId);
  const aspect = aspects.find((a) => a.id === aspectId);

  if (index === -1) return;

  console.log(aspect.name);
  let name = aspect.name;
  console.log(aspectId);
  lastDeleted = {
    type: "aspect",
    data: aspects[index],
  };

  aspects.splice(index, 1);
  localStorage.setItem("growthGrid-aspects", JSON.stringify(aspects));
  // updateAspectCounter();
  showUndoToast(() => restoreAspect(), name);
  toast.info(`Aspect ${name} deleted`);

  closeAspectLog(); // Refresh the display
  broadcastUpdate("ASPECT_DELETED", { id: aspectId });
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
    broadcastUpdate("ASPECT_UPDATED", { id: aspectId, name: newName });
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
function editAspectLog(aspectId, name) {
  const aspects = JSON.parse(localStorage.getItem("growthGrid-aspects")) || [];
  const aspect = aspects.find((a) => a.id === aspectId);

  if (!aspect) {
    toast.error("Aspect not found!");
    return;
  }

  editAspectModal.show(aspect, (id, newName) => {
    updateAspectNameLog(id, newName);
    broadcastUpdate("ASPECT_UPDATED", { id: aspectId, name: newName });
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

// To detect copy and paste in page
document.addEventListener("copy", (e) => {
  toast.success("Copied to clipboard");
});

document.addEventListener("paste", (e) => {
  toast.success("Pasted text!");
});
// To promoteCipherX
setInterval(() => {
  if (Math.random() < 0.5) {
    // 50% chance
    toast.info(
      `Try <a href="https://desmond845.github.io/CipherX/" target="_blank">CipherX</a> — encrypt like a pro!`,
      "8000"
    );
  }
}, 3 * 60 * 1000); // 3 min

function setTheme(theme) {
  document.body.setAttribute("data-theme", theme);
  localStorage.setItem("theme", theme);
}
document.getElementById("themeSelector").addEventListener("click", () => {
  const currentTheme = document.body.getAttribute("data-theme") || "light";
  const newTheme = currentTheme === "dark" ? "light" : "dark";
  setTheme(newTheme);
});

// Calculate Stats
function calculateStats() {
  const aspects = JSON.parse(localStorage.getItem("growthGrid-aspects")) || [];
  let totalEntries = 0;

  let totalEntriesToday = 0;
  const allDates = new Set();
  const dayOfWeekCount = [0, 0, 0, 0, 0, 0, 0]; // Sun-Sat
  const todayDay = new Date().toLocaleString("en-US", {
    weekday: "long",
  });

  let totalAspects = aspects.length;
  let aspectWithMostEntries = { name: "", count: 0 };
  let mostVisited = { name: "", consistency: 0 };
  let todayChampion = { name: "None", count: 0 };
  const today = new Date().toDateString();
  aspects.forEach((a) => {
    const entriesCount = getTotalEntries(a);
    totalEntries += entriesCount;
    a.entries.forEach((day) => {
      allDates.add(day.date);
      totalEntriesToday += day.entriesToday.length;

      const d = new Date(day.date);
      dayOfWeekCount[d.getDay()] += day.entriesToday.length;
    });
    // Consistency: number of days with entries
    const daysActive = a.entries.length;
    if (daysActive > mostVisited.consistency) {
      mostVisited = { name: a.name, consistency: daysActive };
    }

    if (entriesCount > aspectWithMostEntries.count) {
      aspectWithMostEntries = { name: a.name, count: entriesCount };
    }
    const todayEntry = a.entries.find((e) => e.date === today);
    const todayCount = todayEntry ? todayEntry.entriesToday.length : 0;
    if (todayCount > todayChampion.count) {
      todayChampion = { name: a.name, count: todayCount };
    }
  });
  const activeAvgDays = allDates.size;

  // Average entries per day
  const avgPerDay =
    totalEntries > 0 ? Math.round(totalEntries / activeAvgDays).toFixed(1) : 0;

  const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  let bestDay = "None";
  let max = 0;
  dayOfWeekCount.forEach((count, i) => {
    if (count > max) {
      max = count;
      bestDay = days[i];
    }
    if (bestDay === todayDay) {
      bestDay = "Today";
    }
  });
  const topStreak = calculateStreak().topStreak;
  const currentStreak = calculateStreak().streak;

  return {
    streak: currentStreak,
    topStreak,
    totalAspects,
    totalEntries,
    aspectWithMostEntries,
    mostVisited,
    todayChampion,
    avgPerDay,
    activeAvgDays,
    bestDay: max > 0 ? bestDay : "—",
  };
}
// Display Stats In A Random order For User
function cycleStats() {
  setInterval(() => {
    let stats = calculateStats();
    const texts = [
      `Current Streak: ${stats.streak || "None Yet"}`,
      `Top Streak: ${stats.topStreak || "None Yet"}`,
      `Total Aspects: ${stats.totalAspects || "0"}`,
      `Total Entries: ${stats.totalEntries || "0"}`,
      `Aspect With Most Entries: ${
        stats.aspectWithMostEntries.name || "None Yet"
      }`,
      `Most Consistent Aspect: ${stats.mostVisited.name || "None Yet"}`,
      `Today's Top Aspect: ${stats.todayChampion.name || "None Yet"}`,
      `Average Daily Entries: ${stats.avgPerDay || "0"}`,
      `First Entry Date: ${getFirstEntryDate() || "None Yet"}`,
      `Most Productive Day: ${stats.bestDay || "Today"}`,
    ];

    let i = 0;
    const randomIndex = Math.floor(Math.random() * texts.length);
    const textNow = texts[randomIndex];
    document.getElementById("statsText").textContent = textNow;
  }, 3000);
}

function showStatsAlert() {
  const stats = calculateStats();

  // Create modal overlay
  const modal = document.createElement("div");
  modal.className = "modal-overlay stats-modal";
  modal.innerHTML = `
    <div class="modal-content stats-content">
      <div class="stats-header">
        <h3>📊 Your Growth Stats</h3>
        <button class="close-btn" onclick="this.closest('.modal-overlay').remove()">×</button>
      </div>
      
      <div class="stats-grid">
       <div class="stat-item">
          <span class="stat-label">Today's Top Aspect</span>
          <span class="stat-value">${
            stats.todayChampion.name || "None Yet"
          } 🏆</span>
        </div>
                <div class="stat-item">
          <span class="stat-label">First Entry Date</span>
          <span class="stat-value">${
            getFirstEntryDate() || "No Entries Yet"
          } 📅</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Current Streak</span>
          <span class="stat-value">${stats.streak || "Start Logging"}🔥</span>
        </div>
        
        <div class="stat-item">
          <span class="stat-label">Best Streak</span>
          <span class="stat-value">${
            stats.topStreak || "Start Logging"
          } ⭐</span>
        </div>
                <div class="stat-item">
          <span class="stat-label">Most Productive Day</span>
          <span class="stat-value">${stats.bestDay} ⭐</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Total Aspects</span>
          <span class="stat-value">${stats.totalAspects} 📝</span>
        </div>
        
        <div class="stat-item">
          <span class="stat-label">Total Entries</span>
          <span class="stat-value">${stats.totalEntries} ✍️</span>
        </div>
               <div class="stat-item">
          <span class="stat-label">Average Daily Entries</span>
          <span class="stat-value">${stats.avgPerDay || "0"} ✍️</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Most Active Aspect</span>
          <span class="stat-value">${
            stats.aspectWithMostEntries.name || "None"
          } 🏆</span>
        </div>

<div class="stat-item">
          <span class="stat-label">Using GrowthGrid</span>
          <span class="stat-value">${
            statsTicker.getUsageDays()} ${statsTicker.getUsageDays() > 1 ? "Days" : "Day"} 📅</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Most Consistent Aspect</span>
          <span class="stat-value">${stats.mostVisited.name || "None"} 📅</span>
        </div>
      </div>
      
      <div class="stats-actions">
        <button class="close-stats-btn" onclick="this.closest('.modal-overlay').remove()">
          Awesome!
        </button>
      </div>
    </div>
 `;

  document.body.appendChild(modal);

  // Close on overlay click
  modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.remove();
  });
}
// === PWA INSTALL MAGIC ===
// 

// Update exportData function:
async function exportData() {
    progressBar.show('Exporting data...');
    
    try {
        const aspects = JSON.parse(localStorage.getItem('growthGrid-aspects') || '[]');
        const totalEntries = aspects.reduce((total, aspect) => {
            return total + (aspect.entries?.reduce((sum, day) => 
                sum + day.entriesToday.length, 0) || 0);
        }, 0);
        
        let processed = 0;
        const totalToProcess = aspects.length + totalEntries;
        
        // Simulate progress (you'd update this in real processing)
        const interval = setInterval(() => {
            processed++;
            const percent = (processed / totalToProcess) * 100;
            progressBar.update(percent, `Processed ${processed} of ${totalToProcess} items`);
            
            if (processed >= totalToProcess) {
                clearInterval(interval);
                
                // Create the actual export
                const data = {
                    userName: localStorage.getItem('ggUserName') || '',
                    aspects: aspects,
                    exportDate: new Date().toISOString(),
                    app: 'GrowthGrid'
                };
                
                const jsonString = JSON.stringify(data, null, 2);
                const blob = new Blob([jsonString], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `growthgrid-${new Date().toLocaleDateString('en-CA')}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                
                toast.success('✅ Data exported successfully!');
            }
        }, 10); // Adjust timing as needed
    } catch (error) {
        console.error('Export error:', error);
        toast.error('Export failed 😢');
        progressBar.hide();
    }
}




document.addEventListener('DOMContentLoaded', function() {

    
    // Add export button listener
    const exportBtn = document.getElementById('exportBtn');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportData);
    }
});




// Check if two entries are duplicates (same text + similar time)

function isDuplicateEntry(entry1, entry2) {
    // Same day and same text = duplicate
    const sameText = entry1.text.trim().toLowerCase() === 
                     entry2.text.trim().toLowerCase();
    
    // If same day, check time difference (within 5 minutes)
    const time1 = new Date(`1970-01-01 ${entry1.time}`).getTime();
    const time2 = new Date(`1970-01-01 ${entry2.time}`).getTime();
    const timeDiff = Math.abs(time1 - time2) / (1000 * 60); // minutes
    
    return sameText && timeDiff < 5;
}

// TEST FUNCTION - Add this to test manually
function testMergeManually() {
    console.log("🧪 Starting manual merge test...");
    
    // Create test data
    const testImportData = {
  "userName": "N",
  "aspects": [
    {
      "id": "aspect_17637985430250.3899615334875971",
      "name": "Love",
      "created": "Sat Nov 22 2025",
      "entries": [
        {
          "date": "Sat Nov 22 2025",
          "entriesToday": [
            {
              "text": "kill",
              "id": "entry_17637985706000.8372806214418722",
              "time": "09:02:50"
            },
            {
              "text": "hate",
              "id": "entry_17637985668180.2525533473486946",
              "time": "09:02:46"
            },
            {
              "text": "die",
              "id": "entry_17637985631280.7164635873986949",
              "time": "09:02:43"
            },
            {
              "text": "butt",
              "id": "entry_17637985605060.5112306244665288",
              "time": "09:02:40"
            },
            {
              "text": "love",
              "id": "entry_17637985566760.16359102121123648",
              "time": "09:02:36"
            },
            {
              "text": "heuy",
              "id": "entry_17637985538010.42217669440534344",
              "time": "09:02:33"
            }
          ]
        }
      ],
      "time": "09:02:23",
      "starred": true
    },
    {
      "id": "aspect_17635883760760.8205571510236355",
      "name": "Khh",
      "created": "Wed Nov 19 2025",
      "entries": [
        {
          "date": "Wed Nov 19 2025",
          "entriesToday": [
            {
              "text": ";klj,jrg",
              "id": "entry_17635884272880.6451549139764735",
              "time": "22:40:27"
            }
          ]
        }
      ],
      "time": "22:39:36",
      "starred": false
    },
    {
      "id": "aspect_17635543546040.5995018978921534",
      "name": "Bk",
      "created": "Wed Nov 19 2025",
      "entries": [
        {
          "date": "Wed Nov 19 2025",
          "entriesToday": [
            {
              "text": "bk",
              "id": "entry_17635544012920.38398517287447287",
              "time": "13:13:21"
            }
          ]
        }
      ],
      "time": "13:12:34",
      "starred": false
    },
    {
      "id": "aspect_17635880003290.5680400235174669",
      "name": "Ftht",
      "created": "Wed Nov 19 2025",
      "entries": [
        {
          "date": "Sat Nov 22 2025",
          "entriesToday": [
            {
              "text": "hey",
              "id": "entry_17637987093710.17952528535558887",
              "time": "09:05:09"
            }
          ]
        },
        {
          "date": "Wed Nov 19 2025",
          "entriesToday": [
            {
              "text": "ffdf",
              "id": "entry_17635881914310.16041684040553172",
              "time": "22:36:31"
            },
            {
              "text": "rgdddd",
              "id": "entry_17635881883640.8009416699152372",
              "time": "22:36:28"
            }
          ]
        }
      ],
      "time": "22:33:20",
      "starred": false
    }
  ],
  "exportDate": "2026-01-03T20:30:08.162Z",
  "app": "GrowthGrid"
}
    const testImportata = {
        userName: "Test User",
        aspects: [
            {
                name: "Coding",
                created: "2024-01-01",
                time: "10:30",
                starred: false,
                entries: [
                    {
                        date: "2024-01-03",
                        entriesToday: [
                            { text: "Learned JavaScript", time: "10:00", id: "test1" },
                            { text: "Built a project", time: "14:00", id: "test2" }
                        ]
                    }
                ]
            },
            {
                name: "Health",
                created: "2024-01-02",
                time: "09:15",
                starred: true,
                entries: [
                    {
                        date: "2024-01-03",
                        entriesToday: [
                            { text: "Ran 5km", time: "07:00", id: "test3" },
                            { text: "Drank water", time: "12:00", id: "test4" }
                        ]
                    }
                ]
            }
        ]
    };
    
    // First, make sure we have some existing data
    const currentAspects = JSON.parse(localStorage.getItem('growthGrid-aspects') || '[]');
    
    if (currentAspects.length === 0) {
        console.log("Creating sample existing data...");
        localStorage.setItem('growthGrid-aspects', JSON.stringify([
            {
                id: 'existing_1',
                name: "Coding",
                created: "2024-01-05", // NEWER date
                time: "15:45",
                starred: true,
                entries: [
                    {
                        date: "2024-01-03",
                        entriesToday: [
                            { text: "Learned JavaScript", time: "10:00", id: "existing1" }, // Same
                            { text: "Reviewed code", time: "16:00", id: "existing2" } // Different
                        ]
                    },
                    {
                        date: "2024-01-04",
                        entriesToday: [
                            { text: "Fixed bugs", time: "11:00", id: "existing3" }
                        ]
                    }
                ]
            }
        ]));
    }
    
    // Now perform the merge
    console.log("📋 BEFORE MERGE:");
    console.log(JSON.parse(localStorage.getItem('growthGrid-aspects')));
    
    // Call merge
    smartImporter.mergeData(testImportData);
    
    // Check result
    setTimeout(() => {
        console.log("📋 AFTER MERGE:");
        console.log(JSON.parse(localStorage.getItem('growthGrid-aspects')));
        
        // Show UI changes
        showaspects();
        updateAspectCounter();
        
        toast.success("🧪 Test complete! Check console for details.");
    }, 1000);
}

// Add test button listener
document.addEventListener('ontentLoaded', function() {
    const testBtn = document.getElementById('testMergeBtn');
    if (testBtn) {
        testBtn.addEventListener('click', testMergeManually);
    }
});
// Copy entry text with cool animation
function copyEntryText(text, event) {
    if (event) event.stopPropagation();
    
    // Copy to clipboard
    navigator.clipboard.writeText(text).then(() => {
        // Visual feedback
        const btn = event?.target.closest('.copy-entry-btn');
        if (btn) {
            const originalHTML = btn.innerHTML;
            btn.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="#10b981">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                </svg>
            `;
            btn.style.color = '#10b981';
            
            // Reset after 1.5 seconds
            setTimeout(() => {
                btn.innerHTML = originalHTML;
                btn.style.color = '';
            }, 1500);
        }
        
        // Show toast
        const preview = text.length > 30 ? text.substring(0, 30) + '...' : text;
        toast.success(`📋 Copied: "${preview}"`);
        
    }).catch(err => {
        console.error('Copy failed:', err);
        toast.error('Failed to copy!');
    });
}












// Toggle function for pause button
function toggleTicker() {
  if (statsTicker) {
    statsTicker.togglePause(event);
  }
}

// Refresh stats when data changes (add to your existing functions)
function refreshAllStats() {
  if (statsTicker) {
    statsTicker.refreshStats();
  }
}



function isPWAInstalled() {
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
  const isIOSStandalone = window.navigator.standalone === true;
  const isInWebApp = window.matchMedia('(display-mode: fullscreen)').matches;
  
  return isStandalone || isIOSStandalone || isInWebApp ;
  // || localStorage.getItem('pwa_installed') === 'true';
}

function registerServiceWorker() {
if ("serviceWorker" in navigator) {
  // Register service worker
   const swPath = window.location.pathname.includes('/GrowthGrid/') 
      ? './sw.js' 
      : './sw.js';
  // navigator.serviceWorker.register("/sw.js");

    navigator.serviceWorker.register('/GrowthGrid/sw.js', { scope: '/GrowthGrid/' })
      .then(registration => {
        console.log('✅ SW registered at:', registration.scope);
        
        // Check for updates
        registration.onupdatefound = () => {
          const newWorker = registration.installing;
          newWorker.onstatechange = () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('🔄 New version available!');
              toast.info('New update available! Refresh the page.', 5000);
            }
          };
        };
        
        // Store for later use
        window.swRegistration = registration;
      })
      .catch(error => {
        console.error('❌ SW registration failed:', error);
      });

  // Check for updates every hour
  setInterval(() => {
    navigator.serviceWorker.ready.then((reg) => reg.update());
  }, 60 * 60 * 1000);

  // Listen for new service worker
  let newSW;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    // Show update toast
    toast.info("🔄 Update available! Refreshing...", 3000);
    setTimeout(() => window.location.reload(), 3000);
  });

  // Optional: Manual update button
  function showUpdateButton() {
    const btn = document.createElement("button");
    btn.innerHTML = "🔄 Update App";
    btn.style.cssText = `
      position: fixed; bottom: 80px; right: 20px;
      background: #00f0ff; color: #000; padding: 10px 20px;
      border: none; border-radius: 20px; cursor: pointer;
      z-index: 9999; font-weight: bold;
    `;
    btn.onclick = () => {
      navigator.serviceWorker.ready.then((reg) => {
        reg.active.postMessage("skipWaiting");
      });
    };
    document.body.appendChild(btn);
  }
} 
}
function initPWA() {
  console.log('🚀 Initializing PWA...');
  console.log('📊 PWA status:', isPWAInstalled() ? 'Installed' : 'Not installed');
  
  // Register service worker
  registerServiceWorker();
  
  // Setup install prompt
  setupInstallPrompt();
  

}

// Call this when page loads
document.addEventListener('DOMContentLoaded', () => {
  initPWA()
/*
  try{

    
    let installlButton;
    installlButton = document.createElement('button');
    // installlButton.id = 'pwaInstallBtn';
  installlButton.innerHTML = '📱 Install App';
  installlButton.style.cssText = `
    position: fixed;
    bottom: 100px;
    right: 0px;
    background: linear-gradient(135deg, #00f0ff, #00ff88);
    color: #0a0a0f;
    border: none;
    padding: 10px 18px;
    border-radius: 25px;
    font-weight: bold;
    cursor: pointer;
    z-index: 9999;
    display: none;
    box-shadow: 0 4px 15px rgba(0, 240, 255, 0.4);
    font-family: inherit;
    `;
    
    document.body.appendChild(installlButton);
    console.log(installlButton);
  } catch(e){
    console.log(e);
  }
    */
// PWA Install Prompt
});
function setupInstallPrompt() {
  let deferredPrompt;
    let installButton;

  // Only show install button if not already PWA
  if (!isPWAInstalled()) {
    installButton = document.createElement('button');
    installButton.id = 'pwaInstallBtn';
    installButton.innerHTML = '📱 Install App';
    installButton.style.cssText = `
      position: fixed;
      bottom: 100px;
      right: 0px;
      background: linear-gradient(135deg, #00f0ff, #00ff88);
      color: #0a0a0f;
      border: none;
      padding: 10px 18px;
      border-radius: 25px;
      font-weight: bold;
      cursor: pointer;
      z-index: 9999;
      display: none;
      box-shadow: 0 4px 15px rgba(0, 240, 255, 0.4);
      font-family: inherit;
    `;
    
    document.body.appendChild(installButton);
    
    // Listen for install prompt
    window.addEventListener('beforeinstallprompt', (e) => {
      console.log('📱 Install prompt available');
      e.preventDefault();
      deferredPrompt = e;
      
      // Show button after 3 seconds
      setTimeout(() => {
        if (installButton && !isPWAInstalled()) {
          installButton.style.display = 'block';
        }
      }, 3000);
      
      // Handle install button click
      installButton.addEventListener('click', async () => {
        if (!deferredPrompt) return;
        
        installButton.textContent = 'Installing...';
        installButton.disabled = true;
        
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        
        if (outcome === 'accepted') {
          console.log('✅ User accepted install');
          installButton.style.display = 'none';
          localStorage.setItem('pwa_installed', 'true');
          toast.success('App installed! 🎉');
        } else {
          console.log('❌ User declined install');
          installButton.textContent = '📱 Install App';
          installButton.disabled = false;
        }
        
        deferredPrompt = null;
      });
    });
  }
  
  // Hide button if installed
  window.addEventListener('appinstalled', () => {
    console.log('🎯 PWA successfully installed');
    localStorage.setItem('pwa_installed', 'true');
    if (installButton) installButton.style.display = 'none';
    
    // Optional: Track install
    toast.success("GrowthGrid installed! 🎉", 3000);
  });
}
