export function getDemoSettings(): any | null {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem('deadline_defender_demo_settings');
  return stored ? JSON.parse(stored) : null;
}

export function saveDemoSettings(updates: any): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('deadline_defender_demo_settings', JSON.stringify(updates));
}
