// ── Toast Notification ───────────────────────────────
let toastTimer;
function showToast(msg, isError) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.style.borderColor = isError ? 'var(--red)' : 'var(--accent)';
  el.style.color        = isError ? 'var(--red)' : 'var(--accent)';
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 3200);
}

// Auto-toast any flash alerts on page load
document.addEventListener('DOMContentLoaded', () => {
  const s = document.querySelector('.alert-success');
  const e = document.querySelector('.alert-error');
  if (s) showToast(s.textContent.trim(), false);
  if (e) showToast(e.textContent.trim(), true);
});
