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

    function formatTime(ms) {
        if (ms < 0) ms = 0;
        const totalSeconds = Math.ceil(ms / 1000);
        const m = Math.floor(totalSeconds / 60);
        const s = totalSeconds % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }

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

        // Toggle Button
        const btnText = elements.toggleBtn.querySelector('.btn-text');
        // We can also have an icon span if we want, currently just text in the span
        if (running) {
            if (btnText) btnText.textContent = "Pause Reminder";
            elements.toggleBtn.classList.remove('btn-primary');
            elements.toggleBtn.classList.add('btn-secondary');
            elements.toggleBtn.innerHTML = `<span class="icon-pause">⏸</span> <span class="btn-text">Pause</span>`;
        } else {
            if (btnText) btnText.textContent = "Start Reminder";
            elements.toggleBtn.classList.remove('btn-secondary');
            elements.toggleBtn.classList.add('btn-primary');
            elements.toggleBtn.innerHTML = `<span class="icon-play">▶</span> <span class="btn-text">Start</span>`;

        }

        // Timer Logic
        if (breakActiveUntil && breakActiveUntil > now) {
            // --- BREAK MODE ---
            const remainingMs = breakActiveUntil - now;
            const totalMs = settings.breakSeconds * 1000;
            const percent = Math.min(100, Math.max(0, (remainingMs / totalMs) * 100));

            elements.timerText.textContent = formatTime(remainingMs);
            elements.subMessage.textContent = "Look away now!";
            elements.subMessage.style.color = "#ef4444"; // Red alarm color
            elements.circle.style.stroke = "#ef4444";
            setProgress(percent);

        } else {
            // --- WAITING MODE ---
            elements.subMessage.style.color = ""; // Reset color
            elements.circle.style.stroke = "#6366f1"; // Primary Color

            if (running && nextTriggerAt) {
                const diff = nextTriggerAt - now;

                // Calculate percentage of interval elapsed for ring (optional, makes it look alive)
                // Or just keep ring full? Let's make ring empty -> full as time passes? 
                // Or Full -> Empty? Usually timers go Full -> Empty.
                // Let's assume Interval is total. 
                // We don't strictly track start time of interval in STATE, but we can approximate or just show countdown.
                // Let's just show text countdown. Ring can be static full or pulsing?
                // Let's make the ring Full -> Empty based on Interval length.
                // We know 'nextTriggerAt', we can estimate start time = nextTriggerAt - interval*60*1000

                const intervalMs = settings.intervalMinutes * 60 * 1000;
                // const startTime = nextTriggerAt - intervalMs;
                // const elapsed = now - startTime;
                // const percent = Math.min(100, Math.max(0, (elapsed / intervalMs) * 100)); // Fills up
                // Let's do Countdown style: Empty -> Full ? 
                // Let's do Full -> Empty as time reduces.
                const remaining = Math.max(0, diff);
                const percent = (remaining / intervalMs) * 100;

                elements.timerText.textContent = formatTime(remaining);
                elements.subMessage.textContent = "until next break";
                setProgress(percent);

            } else {
                // Paused
                elements.timerText.textContent = "--:--";
                elements.subMessage.textContent = "Timer is paused";
                setProgress(0);
            }
        }
    }

    async function fetchStatus() {
        try {
            const state = await chrome.runtime.sendMessage({ action: 'getStatus' });
            updateUI(state);
        } catch (e) {
            // console.log("Error fetching status", e);
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
            // Force quick update
            setTimeout(fetchStatus, 100);
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
    // Update frequently for smooth timer
    setInterval(fetchStatus, 1000);

})();
