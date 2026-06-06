// ========== EVENT LISTENERS & INIT ==========
document.addEventListener("click", (e) => {
  if (typeof connectModeActive !== "undefined" && connectModeActive) return;
  if (typeof repositionMode !== "undefined" && repositionMode) return;
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

  const slider = document.getElementById("zoom-slider");
  if (slider) {
    slider.min = "30";
    slider.max = "300";
    slider.step = "1";
    slider.value = "100";
    slider.addEventListener("input", updateZoomFromSlider);
  }

  loadViewState();

  document.addEventListener("mousedown", startDrag);
  document.addEventListener("mousemove", moveDrag);
  document.addEventListener("mouseup", endDrag);

  document.addEventListener("touchstart", touchStart, { passive: false });
  document.addEventListener("touchmove", touchMove, { passive: false });
  document.addEventListener("touchend", touchEnd);
  document.addEventListener("touchcancel", touchEnd);

  document.getElementById("zoom-reset")?.addEventListener("click", zoomReset);
  document.getElementById("expand-btn")?.addEventListener("click", () => {
    if (typeof resetAllCollapse === "function") resetAllCollapse();
  });
  document.getElementById("search-open-btn")?.addEventListener("click", () => {
    if (typeof openSearch === "function") openSearch();
  });
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

  if (typeof initMultiTree === "function") initMultiTree();
  if (typeof initSearch === "function") initSearch();
  if (typeof initStats === "function") initStats();
  if (typeof initConnections === "function") initConnections();

  window.addEventListener("resize", () => {
    if (typeof drawManualLinks === "function") drawManualLinks();
  });
});

window.addEventListener("click", (e) => {
  if (e.target.id === "login-modal") closeLoginModal();
  if (e.target.id === "info-modal") closeInfoModal();
  if (e.target.id === "custom-popup") closeCustomPopup();
});

// Patch updateUndoRedoButtons
const _origUpdateUndoRedo = updateUndoRedoButtons;
updateUndoRedoButtons = function() {
  _origUpdateUndoRedo();
  if (typeof updateAdminButtons === "function") updateAdminButtons();
};

loadTree();
/*Stable + connect-init*/
