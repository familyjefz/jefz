// ========== EVENT LISTENERS & INIT ==========
document.addEventListener("click", (e) => {
  if (!e.target.closest(".node-box") && !e.target.closest("button") && e.target.tagName !== "TEXTAREA") {
    activePath = null;
    activeMode = null;
    renderTree();
  }
});

document.addEventListener("DOMContentLoaded", () => {
  loadInvertSetting();
  
  if (isLoggedIn()) {
    isAdmin = true;
    updateLoginButton();
    updateUndoRedoButtons();
  }
  
  // Zoom slider
  const slider = document.getElementById("zoom-slider");
  if (slider) {
    slider.min = "30";
    slider.max = "300";
    slider.step = "1";
    slider.value = "100";
    slider.addEventListener("input", updateZoomFromSlider);
  }
  
  zoomReset();
  
  // Mouse drag pan - pasang di wrapper dan document untuk memastikan
  const wrapper = document.getElementById("tree-wrapper");
  
  wrapper.addEventListener("mousedown", startDrag);
  window.addEventListener("mousemove", moveDrag);
  window.addEventListener("mouseup", endDrag);
  
  // Touch events
  wrapper.addEventListener("touchstart", touchStart, { passive: false });
  wrapper.addEventListener("touchmove", touchMove, { passive: false });
  wrapper.addEventListener("touchend", touchEnd);
  wrapper.addEventListener("touchcancel", touchEnd);
  
  // Buttons
  document.getElementById("zoom-reset")?.addEventListener("click", zoomReset);
  document.getElementById("invert-btn")?.addEventListener("click", toggleInvert);
  document.getElementById("login-btn")?.addEventListener("click", onLoginLogoutClick);
  document.getElementById("undo-btn")?.addEventListener("click", undoAction);
  document.getElementById("redo-btn")?.addEventListener("click", redoAction);
  document.querySelector(".close")?.addEventListener("click", closeLoginModal);
  document.querySelector(".close-info")?.addEventListener("click", closeInfoModal);
  document.getElementById("submit-pin")?.addEventListener("click", checkPin);
  document.getElementById("pin-input")?.addEventListener("keypress", (e) => {
    if (e.key === "Enter") checkPin();
  });
});

window.addEventListener("click", (e) => {
  if (e.target.id === "login-modal") closeLoginModal();
  if (e.target.id === "info-modal") closeInfoModal();
  if (e.target.id === "custom-popup") closeCustomPopup();
});

loadTree();
/*Stable*/
