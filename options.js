
document.addEventListener('DOMContentLoaded', async () => {
    const form = document.getElementById('settings-form');
    const intervalInput = document.getElementById('interval');
    const breakInput = document.getElementById('break');
    const soundInput = document.getElementById('sound');
    const notificationsInput = document.getElementById('notifications');
    const toast = document.getElementById('toast');

    const DEFAULT_SETTINGS = {
        intervalMinutes: 10,
        breakSeconds: 20,
        soundEnabled: true,
        notificationsEnabled: true
    };

    // Load Settings
    const data = await chrome.storage.sync.get('settings');
    const settings = data.settings || DEFAULT_SETTINGS;

    intervalInput.value = settings.intervalMinutes;
    breakInput.value = settings.breakSeconds;
    soundInput.checked = settings.soundEnabled !== false; // Default true if undefined
    notificationsInput.checked = settings.notificationsEnabled !== false;

    // Save
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Validate
        const interval = parseInt(intervalInput.value, 10);
        const breakVal = parseInt(breakInput.value, 10);

        let isValid = true;
        let errorMessage = "";

        if (isNaN(interval) || interval < 1 || interval > 120) {
            isValid = false;
            errorMessage = "Interval must be between 1 and 120 minutes.";
        } else if (isNaN(breakVal) || breakVal < 5 || breakVal > 120) {
            isValid = false;
            errorMessage = "Break must be between 5 and 120 seconds.";
        }

        if (!isValid) {
            alert(errorMessage);
            return;
        }

        const newSettings = {
            intervalMinutes: interval,
            breakSeconds: breakVal,
            soundEnabled: soundInput.checked,
            notificationsEnabled: notificationsInput.checked
        };

        try {
            // Update via background to handle alarm rescheduling immediately
            await chrome.runtime.sendMessage({
                action: 'updateSettings',
                settings: newSettings
            });

            // Success Feedback
            toast.classList.add('visible');
            setTimeout(() => toast.classList.remove('visible'), 3000);

        } catch (err) {
            console.error(err);
            alert("Failed to save settings.");
        }
    });
});
