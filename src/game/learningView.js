export function createLearningView(doc = document) {
  const root = doc.createElement('aside'); root.className = 'learning-guide is-hidden'; root.setAttribute('aria-label', 'Current action guide');
  const label = doc.createElement('small'); label.textContent = 'DO THIS NEXT';
  const title = doc.createElement('h3'), text = doc.createElement('p'), keys = doc.createElement('kbd'), goal = doc.createElement('div');
  goal.className = 'learning-goal'; root.append(label, title, text, keys, goal); doc.body.append(root);
  let current = null, typed = 0;
  function update(dt, lesson, hidden = false) {
    root.classList.toggle('is-hidden', hidden || !lesson);
    doc.body.classList.toggle('guided-learning', !hidden && Boolean(lesson));
    if (hidden || !lesson) return;
    if (current !== lesson.id) {
      current = lesson.id; typed = 0; title.textContent = lesson.title;
      keys.textContent = lesson.keys;
    }
    typed = Math.min(lesson.text.length, typed + dt * 65);
    text.textContent = lesson.text.slice(0, Math.ceil(typed));
    goal.textContent = lesson.goal;
  }
  return { update, reset() { current = null; typed = 0; }, dispose() { root.remove(); } };
}
