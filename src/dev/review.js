// Explicit opt-in development review UI. Vite removes its import in production.
export function installReviewTools(actions, snapshot) {
  const panel = document.createElement('details'); panel.open = true;
  panel.id = 'review-tools';
  panel.style.cssText = 'position:fixed;z-index:100;left:50%;top:8px;transform:translateX(-50%);max-width:410px;background:#121712ee;color:#eee5cd;padding:10px;font:11px monospace;pointer-events:auto;';
  const summary = document.createElement('summary'); summary.textContent = 'Development review tools'; panel.append(summary);
  const report = document.createElement('pre'); report.id = 'review-report'; report.style.cssText = 'white-space:pre-wrap;max-height:190px;overflow:auto;';
  for (const [label, run] of Object.entries(actions)) {
    const button = document.createElement('button'); button.textContent = label;
    button.style.cssText = 'margin:3px;padding:5px;font:11px monospace;cursor:pointer;';
    button.onclick = async () => {
      button.disabled = true;
      try { const result = await run(); report.textContent = `${label}: ${result ?? 'view ready'}\n${JSON.stringify(snapshot(), null, 2)}`; }
      catch (error) { report.textContent = `FAIL: ${error.message}\n${JSON.stringify(snapshot(), null, 2)}`; }
      finally { button.disabled = false; }
    };
    panel.append(button);
  }
  panel.append(report); document.body.append(panel);
}
