(function () {
    const elements = {
        statusBadge: document.getElementById('status-badge'),
        timerText: document.getElementById('timer-display'),
        subMessage: document.getElementById('sub-message'),
        circle: document.querySelector('.progress-ring__circle'),
        toggleBtn: document.getElementById('toggle-btn'),
        testBtn: document.getElementById('test-btn'),
        optionsBtn: document.getElementById('options-btn')
    };

    const radius = elements.circle.r.baseVal.value;
    const circumference = radius * 2 * Math.PI;

    elements.circle.style.strokeDasharray = `${circumference} ${circumference}`;
    elements.circle.style.strokeDashoffset = circumference;

    function setProgress(percent) {
        // Percent from 0 to 100. 100 = Full (offset 0). 0 = Empty (offset C).
        const offset = circumference - (percent / 100) * circumference;
        elements.circle.style.strokeDashoffset = offset;
    }

    function updateUI(state) {
        if (!state) return;
        const now = Date.now();
        const { running, nextTriggerAt, breakActiveUntil, settings } = state;

        // Badge
        elements.statusBadge.textContent = running ? "Active" : "Paused";
        elements.statusBadge.className = `badge ${running ? 'running' : 'paused'}`;

        // Button
        elements.toggleBtn.textContent = running ? "Pause" : "Start";
        if (running) {
            elements.toggleBtn.classList.remove('primary');
            elements.toggleBtn.classList.add('secondary');
        } else {
            elements.toggleBtn.classList.remove('secondary');
            elements.toggleBtn.classList.add('primary');
        }

        // Timer / Ring
        if (breakActiveUntil && breakActiveUntil > now) {
            // Break Mode
            const remainingMs = breakActiveUntil - now;
            const totalMs = settings.breakSeconds * 1000;
            const percent = Math.min(100, Math.max(0, (remainingMs / totalMs) * 100));
            const secondsLeft = Math.ceil(remainingMs / 1000);

            elements.timerText.textContent = `${secondsLeft}s`;
            elements.subMessage.textContent = "Look away!";
            elements.circle.style.stroke = "#6366f1";
            setProgress(percent);
        } else {
            // Waiting Mode
            elements.timerText.textContent = "20-20-20";
            setProgress(0); // Empty ring

            if (running && nextTriggerAt) {
                const diff = nextTriggerAt - now;
                if (diff > 0) {
                    const mins = Math.ceil(diff / 60000);
                    elements.subMessage.textContent = `Next reminder in ${mins}m`;
                } else {
                    elements.subMessage.textContent = "Due soon...";
                }
            } else {
                elements.subMessage.textContent = "Timer paused";
                elements.subMessage.style.color = "#9ca3af";
            }
        }
    }

    async function fetchStatus() {
        try {
            const state = await chrome.runtime.sendMessage({ action: 'getStatus' });
            updateUI(state);
        } catch (e) {
            console.log("Error fetching status", e);
        }
    }

    // Event Listeners
    elements.toggleBtn.addEventListener('click', async () => {
        try {
            const newState = await chrome.runtime.sendMessage({ action: 'toggleRunning' });
            updateUI(newState);
        } catch (e) { console.error(e); }
    });

    elements.testBtn.addEventListener('click', async () => {
        try {
            await chrome.runtime.sendMessage({ action: 'testReminder' });
            // Immediate feedback not guaranteed via message return, fetch status soon
            setTimeout(fetchStatus, 500);
        } catch (e) { console.error(e); }
    });

    elements.optionsBtn.addEventListener('click', () => {
        if (chrome.runtime.openOptionsPage) {
            chrome.runtime.openOptionsPage();
        } else {
            window.open(chrome.runtime.getURL('options.html'));
        }
    });

    // Init Loop
    fetchStatus();
    setInterval(fetchStatus, 1000);

})();
